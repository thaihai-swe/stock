import 'dotenv/config';
import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { DATA_DIR, DATA_FILE } from '../config/constants.js';

const dbMode = (process.env.DB_MODE || '').trim().toLowerCase();
const tursoUrl = (process.env.TURSO_DATABASE_URL || '').trim();
const tursoToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

const isVercel = Boolean(process.env.VERCEL);

// Quyết định chế độ kết nối:
// 1. Trên Vercel (Production Cloud) -> Bắt buộc dùng Turso Cloud SQLite
// 2. Chạy Local (Local Development) -> Mặc định dùng file SQLite cục bộ (data/stock.db).
//    Chỉ dùng Turso trên local nếu DB_MODE=turso được chỉ định rõ ràng trong .env.
const shouldUseTurso = isVercel
  ? Boolean(tursoUrl)
  : (dbMode === 'turso' && Boolean(tursoUrl));

let clientConfig;
let dbInfo;

if (shouldUseTurso) {
  clientConfig = {
    url: tursoUrl,
    authToken: tursoToken || undefined,
  };
  dbInfo = {
    mode: 'turso',
    label: 'Turso Cloud SQLite',
    url: tursoUrl,
    isTurso: true,
  };
} else {
  if (isVercel) {
    console.error('❌ Chưa cấu hình biến môi trường TURSO_DATABASE_URL trên Vercel!');
    throw new Error('Chưa cấu hình TURSO_DATABASE_URL và TURSO_AUTH_TOKEN trên Vercel! Vui lòng vào Vercel Dashboard -> Settings -> Environment Variables để thêm.');
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const localDbPath = path.resolve(DATA_DIR, 'stock.db');
  clientConfig = {
    url: `file:${localDbPath}`,
  };
  dbInfo = {
    mode: 'local',
    label: 'Local SQLite File (data/stock.db)',
    url: `file:${localDbPath}`,
    isTurso: false,
  };
}

export const db = createClient(clientConfig);

export function getDbInfo() {
  return dbInfo;
}

let isInitialized = false;

export async function initDatabase() {
  if (isInitialized) return;

  if (dbInfo.isTurso) {
    console.log(`🌐 [Database] Đang kết nối tới Turso Cloud: ${dbInfo.url}`);
  } else {
    console.log(`📁 [Database] Đang sử dụng Local SQLite: ${dbInfo.url}`);
  }

  // 1. Tạo bảng buy_orders
  await db.execute(`
    CREATE TABLE IF NOT EXISTS buy_orders (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      fee_pct REAL DEFAULT 0,
      fee REAL DEFAULT 0,
      total_cost REAL NOT NULL,
      cost_per_share REAL NOT NULL,
      remaining_qty INTEGER NOT NULL,
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      user_id TEXT DEFAULT 'demo'
    );
  `);

  // 2. Tạo bảng sell_orders
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sell_orders (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      fee_pct REAL DEFAULT 0,
      fee REAL DEFAULT 0,
      tax_pct REAL DEFAULT 0.1,
      tax REAL DEFAULT 0,
      gross_revenue REAL NOT NULL,
      net_revenue REAL NOT NULL,
      total_cost REAL NOT NULL,
      profit_loss REAL NOT NULL,
      profit_loss_pct REAL NOT NULL,
      matched_lots TEXT DEFAULT '[]',
      match_method TEXT DEFAULT 'lowest',
      date TEXT NOT NULL,
      note TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      user_id TEXT DEFAULT 'demo'
    );
  `);

  // 3. Tạo bảng dividends
  await db.execute(`
    CREATE TABLE IF NOT EXISTS dividends (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      symbol TEXT NOT NULL,
      date TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      amount_per_share REAL DEFAULT 0,
      tax_pct REAL DEFAULT 5,
      gross_amount REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      note TEXT DEFAULT '',
      created_at TEXT,
      user_id TEXT DEFAULT 'demo'
    );
  `);

  // 4. Tạo bảng watchlist
  await db.execute(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      target_buy_price REAL,
      target_sell_price REAL,
      target_price REAL,
      note TEXT DEFAULT '',
      created_at TEXT,
      user_id TEXT DEFAULT 'demo'
    );
  `);

  // 5. Tạo bảng app_settings
  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      user_id TEXT DEFAULT 'demo',
      PRIMARY KEY (key, user_id)
    );
  `);

  // 6. Tạo bảng users
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT,
      name TEXT,
      created_at TEXT,
      last_login TEXT
    );
  `);

  // 7. Migration an toàn: Bổ sung cột user_id vào các database đã có sẵn dữ liệu
  await addColumnSafe('buy_orders', 'user_id TEXT DEFAULT "demo"');
  await addColumnSafe('sell_orders', 'user_id TEXT DEFAULT "demo"');
  await addColumnSafe('sell_orders', 'match_method TEXT DEFAULT "lowest"');
  await addColumnSafe('dividends', 'user_id TEXT DEFAULT "demo"');
  await addColumnSafe('watchlist', 'user_id TEXT DEFAULT "demo"');
  await addColumnSafe('app_settings', 'user_id TEXT DEFAULT "demo"');

  // Đảm bảo có tài khoản demo mặc định
  try {
    await db.execute(`
      INSERT OR IGNORE INTO users (id, email, name, created_at, last_login)
      VALUES ('demo', 'demo@stockmanager.app', 'Tài khoản Demo', datetime('now'), datetime('now'));
    `);
    await db.execute(`UPDATE buy_orders SET user_id = 'demo' WHERE user_id IS NULL;`);
    await db.execute(`UPDATE sell_orders SET user_id = 'demo' WHERE user_id IS NULL;`);
    await db.execute(`UPDATE dividends SET user_id = 'demo' WHERE user_id IS NULL;`);
    await db.execute(`UPDATE watchlist SET user_id = 'demo' WHERE user_id IS NULL;`);
    await db.execute(`UPDATE app_settings SET user_id = 'demo' WHERE user_id IS NULL;`);
  } catch (e) {
    // Bỏ qua lỗi cập nhật nếu không có dòng nào
  }

  // 8. Tự động chuyển đổi dữ liệu từ transactions.json nếu database đang trống
  await autoMigrateFromJson();

  isInitialized = true;
}

async function addColumnSafe(table, columnDef) {
  try {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${columnDef};`);
  } catch (err) {
    // Cột đã tồn tại, an toàn bỏ qua
  }
}

async function autoMigrateFromJson() {
  try {
    const buyCountRes = await db.execute('SELECT COUNT(*) as count FROM buy_orders;');
    const count = Number(buyCountRes.rows[0]?.count || 0);

    if (count === 0 && fs.existsSync(DATA_FILE)) {
      console.log(`🔄 [Database] Đang nạp dữ liệu từ transactions.json vào ${dbInfo.label}...`);
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);

      // Import buyOrders
      if (Array.isArray(data.buyOrders) && data.buyOrders.length > 0) {
        for (const o of data.buyOrders) {
          await db.execute({
            sql: `INSERT OR REPLACE INTO buy_orders 
                  (id, symbol, quantity, price, fee_pct, fee, total_cost, cost_per_share, remaining_qty, date, note, tags)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            args: [
              o.id,
              o.symbol,
              o.quantity,
              o.price,
              o.feePct || 0,
              o.fee || 0,
              o.totalCost,
              o.costPerShare,
              o.remainingQty,
              o.date,
              o.note || '',
              JSON.stringify(o.tags || []),
            ],
          });
        }
      }

      // Import sellOrders
      if (Array.isArray(data.sellOrders) && data.sellOrders.length > 0) {
        for (const s of data.sellOrders) {
          await db.execute({
            sql: `INSERT OR REPLACE INTO sell_orders
                  (id, symbol, quantity, price, fee_pct, fee, tax_pct, tax, gross_revenue, net_revenue, total_cost, profit_loss, profit_loss_pct, matched_lots, match_method, date, note, tags)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            args: [
              s.id,
              s.symbol,
              s.quantity,
              s.price,
              s.feePct || 0,
              s.fee || 0,
              s.taxPct || 0.1,
              s.tax || 0,
              s.grossRevenue,
              s.netRevenue,
              s.totalCost,
              s.profitLoss,
              s.profitLossPct,
              JSON.stringify(s.matchedLots || []),
              s.matchMethod || 'lowest',
              s.date,
              s.note || '',
              JSON.stringify(s.tags || []),
            ],
          });
        }
      }

      // Import dividends
      if (Array.isArray(data.dividends) && data.dividends.length > 0) {
        for (const d of data.dividends) {
          await db.execute({
            sql: `INSERT OR REPLACE INTO dividends
                  (id, type, symbol, date, quantity, amount_per_share, tax_pct, gross_amount, tax_amount, net_amount, note, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            args: [
              d.id,
              d.type,
              d.symbol,
              d.date,
              d.quantity,
              d.amountPerShare || 0,
              d.taxPct || 5,
              d.grossAmount || 0,
              d.taxAmount || 0,
              d.netAmount || 0,
              d.note || '',
              d.createdAt || d.date,
            ],
          });
        }
      }

      // Import watchlist
      if (Array.isArray(data.watchlist) && data.watchlist.length > 0) {
        for (const w of data.watchlist) {
          await db.execute({
            sql: `INSERT OR REPLACE INTO watchlist
                  (id, symbol, target_buy_price, target_sell_price, target_price, note, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?);`,
            args: [
              w.id,
              w.symbol,
              w.targetBuyPrice || null,
              w.targetSellPrice || null,
              w.targetPrice || null,
              w.note || '',
              w.createdAt || new Date().toISOString().slice(0, 10),
            ],
          });
        }
      }

      // Import settings & goal
      if (data.settings) {
        await db.execute({
          sql: `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('settings', ?);`,
          args: [JSON.stringify(data.settings)],
        });
      }
      if (data.goal) {
        await db.execute({
          sql: `INSERT OR REPLACE INTO app_settings (key, value) VALUES ('goal', ?);`,
          args: [JSON.stringify(data.goal)],
        });
      }

      console.log(`✅ [Database] Đã import toàn bộ dữ liệu vào ${dbInfo.label} thành công!`);
    }
  } catch (err) {
    console.error('⚠️ [Database] Lỗi khi tự động import dữ liệu:', err.message);
  }
}
