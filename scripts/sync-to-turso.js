import 'dotenv/config';
import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { DATA_DIR, DATA_FILE } from '../server/config/constants.js';

async function syncToTurso() {
  const tursoUrl = (process.env.TURSO_DATABASE_URL || '').trim();
  const tursoToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

  console.log('\n======================================================');
  console.log('🔄 ĐỒNG BỘ DỮ LIỆU TỪ MÁY LOCAL LÊN TURSO CLOUD');
  console.log('======================================================');

  if (!tursoUrl) {
    console.error('❌ Lỗi: Chưa cấu hình TURSO_DATABASE_URL trong file .env!');
    process.exit(1);
  }

  // 1. Đọc dữ liệu nguồn từ Local (Ưu tiên stock.db, nếu không thì transactions.json)
  const localDbPath = path.resolve(DATA_DIR, 'stock.db');
  let dataToSync = null;

  if (fs.existsSync(localDbPath)) {
    console.log('📁 Đang đọc dữ liệu từ local SQLite (data/stock.db)...');
    const localClient = createClient({ url: `file:${localDbPath}` });
    const [b, s, d, w, set] = await Promise.all([
      localClient.execute('SELECT * FROM buy_orders;'),
      localClient.execute('SELECT * FROM sell_orders;'),
      localClient.execute('SELECT * FROM dividends;'),
      localClient.execute('SELECT * FROM watchlist;'),
      localClient.execute('SELECT * FROM app_settings;'),
    ]);
    dataToSync = {
      buyRows: b.rows,
      sellRows: s.rows,
      divRows: d.rows,
      watchRows: w.rows,
      setRows: set.rows,
    };
  } else if (fs.existsSync(DATA_FILE)) {
    console.log('📁 Đang đọc dữ liệu từ transactions.json...');
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const j = JSON.parse(raw);
    dataToSync = {
      fromJson: true,
      data: j,
    };
  } else {
    console.error('❌ Không tìm thấy dữ liệu nguồn cục bộ để đồng bộ.');
    process.exit(1);
  }

  // 2. Kết nối tới Turso Cloud
  console.log(`🌐 Đang kết nối tới Turso Cloud: ${tursoUrl}...`);
  const tursoClient = createClient({ url: tursoUrl, authToken: tursoToken });

  // 3. Khởi tạo bảng trên Turso
  await tursoClient.batch([
    `CREATE TABLE IF NOT EXISTS buy_orders (
      id TEXT PRIMARY KEY, symbol TEXT NOT NULL, quantity INTEGER NOT NULL, price REAL NOT NULL,
      fee_pct REAL DEFAULT 0, fee REAL DEFAULT 0, total_cost REAL NOT NULL, cost_per_share REAL NOT NULL,
      remaining_qty INTEGER NOT NULL, date TEXT NOT NULL, note TEXT DEFAULT '', tags TEXT DEFAULT '[]'
    );`,
    `CREATE TABLE IF NOT EXISTS sell_orders (
      id TEXT PRIMARY KEY, symbol TEXT NOT NULL, quantity INTEGER NOT NULL, price REAL NOT NULL,
      fee_pct REAL DEFAULT 0, fee REAL DEFAULT 0, tax_pct REAL DEFAULT 0.1, tax REAL DEFAULT 0,
      gross_revenue REAL NOT NULL, net_revenue REAL NOT NULL, total_cost REAL NOT NULL,
      profit_loss REAL NOT NULL, profit_loss_pct REAL NOT NULL, matched_lots TEXT DEFAULT '[]',
      date TEXT NOT NULL, note TEXT DEFAULT '', tags TEXT DEFAULT '[]'
    );`,
    `CREATE TABLE IF NOT EXISTS dividends (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, symbol TEXT NOT NULL, date TEXT NOT NULL,
      quantity INTEGER NOT NULL, amount_per_share REAL DEFAULT 0, tax_pct REAL DEFAULT 5,
      gross_amount REAL DEFAULT 0, tax_amount REAL DEFAULT 0, net_amount REAL DEFAULT 0,
      note TEXT DEFAULT '', created_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS watchlist (
      id TEXT PRIMARY KEY, symbol TEXT NOT NULL, target_buy_price REAL, target_sell_price REAL,
      target_price REAL, note TEXT DEFAULT '', created_at TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY, value TEXT NOT NULL
    );`,
  ], 'write');

  // 4. Đẩy dữ liệu
  const statements = [];
  if (dataToSync.buyRows) {
    for (const r of dataToSync.buyRows) {
      statements.push({
        sql: `INSERT OR REPLACE INTO buy_orders (id, symbol, quantity, price, fee_pct, fee, total_cost, cost_per_share, remaining_qty, date, note, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [r.id, r.symbol, r.quantity, r.price, r.fee_pct, r.fee, r.total_cost, r.cost_per_share, r.remaining_qty, r.date, r.note, r.tags],
      });
    }
    for (const r of dataToSync.sellRows) {
      statements.push({
        sql: `INSERT OR REPLACE INTO sell_orders (id, symbol, quantity, price, fee_pct, fee, tax_pct, tax, gross_revenue, net_revenue, total_cost, profit_loss, profit_loss_pct, matched_lots, date, note, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [r.id, r.symbol, r.quantity, r.price, r.fee_pct, r.fee, r.tax_pct, r.tax, r.gross_revenue, r.net_revenue, r.total_cost, r.profit_loss, r.profit_loss_pct, r.matched_lots, r.date, r.note, r.tags],
      });
    }
    for (const r of dataToSync.divRows) {
      statements.push({
        sql: `INSERT OR REPLACE INTO dividends (id, type, symbol, date, quantity, amount_per_share, tax_pct, gross_amount, tax_amount, net_amount, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [r.id, r.type, r.symbol, r.date, r.quantity, r.amount_per_share, r.tax_pct, r.gross_amount, r.tax_amount, r.net_amount, r.note, r.created_at],
      });
    }
    for (const r of dataToSync.watchRows) {
      statements.push({
        sql: `INSERT OR REPLACE INTO watchlist (id, symbol, target_buy_price, target_sell_price, target_price, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);`,
        args: [r.id, r.symbol, r.target_buy_price, r.target_sell_price, r.target_price, r.note, r.created_at],
      });
    }
    for (const r of dataToSync.setRows) {
      statements.push({
        sql: `INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);`,
        args: [r.key, r.value],
      });
    }
  }

  if (statements.length > 0) {
    console.log(`📤 Đang đẩy ${statements.length} bản ghi lên Turso Cloud...`);
    await tursoClient.batch(statements, 'write');
    console.log('✅ ĐỒNG BỘ THÀNH CÔNG LÊN TURSO CLOUD!');
  } else {
    console.log('ℹ️ Không có dữ liệu mới để đồng bộ.');
  }

  console.log('======================================================\n');
}

syncToTurso().catch(err => {
  console.error('❌ Lỗi khi đồng bộ lên Turso:', err.message);
  process.exit(1);
});
