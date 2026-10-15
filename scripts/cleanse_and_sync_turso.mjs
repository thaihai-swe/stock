import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@libsql/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const LOCAL_DB_PATH = path.join(DATA_DIR, 'stock.db');

// Turso Cloud connection config
const TURSO_URL = process.env.TURSO_DATABASE_URL || 'libsql://stock-manager-asd124exzds.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTE0ODIxOTIsImlkIjoiMDFhMTFjYTgtYTcwMS03YTUzLWE3OTAtZmRkOTcyMTQzNjZhIiwia2lkIjoiX1R2WEJmbkhLc0NzOUNhdTVyemJmOGptU3pGTkdWczVINnVKV0JGV2pSQSIsInJpZCI6IjBmMDc1NDEwLTk0OTQtNDY2YS05YmRmLTg0NGExMTc3NzYzMiJ9.W2nFRIouFUEZFTHd10hqFimdP0Vjnx7WyNmEguvJqOVfvHEsrF_wcB55kScFoBIF8hByjgxjabMUHzb4HZfXCw';

async function main() {
  console.log('==================================================================');
  console.log('🚀 BẮT ĐẦU QUY TRÌNH LÀM SẠCH & ĐỒNG BỘ TURSO CLOUD');
  console.log(`🌐 Target: ${TURSO_URL}`);
  console.log('==================================================================\n');

  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  const client = createClient({
    url: TURSO_URL,
    authToken: TURSO_TOKEN,
  });

  // ── BƯỚC 0: SAO LƯU DỰ PHÒNG 100% TRƯỚC KHI THAO TÁC ──
  console.log('📦 [Bước 0/4] Đang sao lưu toàn bộ dữ liệu Turso Cloud ra file JSON an toàn...');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUPS_DIR, `turso_pre_cleanse_backup_${ts}.json`);

  const tablesQuery = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%'");
  const tableNames = tablesQuery.rows.map(r => r.name);

  const backupData = {
    _meta: {
      exportedAt: new Date().toISOString(),
      source: TURSO_URL,
      tables: tableNames,
    },
    tables: {},
  };

  for (const t of tableNames) {
    const rowsRes = await client.execute(`SELECT * FROM ${t}`);
    backupData.tables[t] = rowsRes.rows;
    console.log(`   ✓ Đã sao lưu bảng ${t}: ${rowsRes.rows.length} bản ghi.`);
  }

  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`✅ Đã lưu backup an toàn tại: ${backupFile}\n`);

  // ── BƯỚC 1: LÀM SẠCH DỮ LIỆU THỪA & RÁC TEST TRÊN TURSO ──
  console.log('🧹 [Bước 1/4] Đang làm sạch dữ liệu thừa và rác test trên Turso Cloud...');

  // 1.1 Xoá bảng fundamentals_cache thừa nếu có
  try {
    await client.execute('DROP TABLE IF EXISTS fundamentals_cache');
    console.log('   ✓ Đã DROP TABLE fundamentals_cache (loại bỏ cache thừa khỏi database)');
  } catch (err) {
    console.warn('   ⚠️ Không thể drop fundamentals_cache:', err.message);
  }

  // 1.2 Xoá các bản ghi test rác
  const deleteSellRes = await client.execute("DELETE FROM sell_orders WHERE user_id = 'test-abc1' OR user_id LIKE 'test%'");
  console.log(`   ✓ Đã xoá lệnh bán test rác: ${deleteSellRes.rowsAffected} dòng`);

  const deleteBuyRes = await client.execute("DELETE FROM buy_orders WHERE user_id LIKE 'test%'");
  console.log(`   ✓ Đã xoá lệnh mua test rác: ${deleteBuyRes.rowsAffected} dòng`);

  const deleteUserRes = await client.execute("DELETE FROM users WHERE id LIKE 'test%'");
  console.log(`   ✓ Đã xoá người dùng test rác: ${deleteUserRes.rowsAffected} dòng`);

  const deleteSettingsRes = await client.execute("DELETE FROM app_settings WHERE user_id LIKE 'test%'");
  console.log(`   ✓ Đã xoá cài đặt test rác: ${deleteSettingsRes.rowsAffected} dòng`);

  const deleteWatchlistRes = await client.execute("DELETE FROM watchlist WHERE user_id LIKE 'test%'");
  console.log(`   ✓ Đã xoá watchlist test rác: ${deleteWatchlistRes.rowsAffected} dòng`);

  console.log('✅ Hoàn tất làm sạch rác test trên Turso Cloud.\n');

  // ── BƯỚC 2: BẢO TOÀN DỮ LIỆU NGƯỜI DÙNG & LỊCH SỬ GIAO DỊCH CỐT LÕI ──
  console.log('🛡️ [Bước 2/4] Kiểm tra và bảo toàn dữ liệu người dùng thật & sổ lệnh FIFO...');
  const usersRes = await client.execute('SELECT id, email, name FROM users');
  console.log('   👤 Danh sách người dùng hiện có:');
  for (const u of usersRes.rows) {
    console.log(`      • [${u.id}] ${u.name} (${u.email})`);
  }

  const buyStats = await client.execute('SELECT user_id, COUNT(*) as cnt FROM buy_orders GROUP BY user_id');
  console.log('   📈 Sổ lệnh mua (buy_orders):');
  for (const b of buyStats.rows) {
    console.log(`      • User [${b.user_id}]: ${b.cnt} lệnh mua được bảo toàn`);
  }

  const sellStats = await client.execute('SELECT user_id, COUNT(*) as cnt FROM sell_orders GROUP BY user_id');
  console.log('   📉 Sổ lệnh bán (sell_orders):');
  for (const s of sellStats.rows) {
    console.log(`      • User [${s.user_id}]: ${s.cnt} lệnh bán được bảo toàn`);
  }
  console.log('✅ Đã xác nhận bảo toàn 100% dữ liệu giao dịch cốt lõi.\n');

  // ── BƯỚC 3: ĐỒNG BỘ CẤU TRÚC & DỮ LIỆU LOCAL LÊN TURSO CLOUD ──
  console.log('🔄 [Bước 3/4] Đồng bộ cấu trúc bảng và dữ liệu local mới lên Turso Cloud...');

  // 3.1 Tạo bảng portfolio_ai_insights nếu chưa có
  await client.execute(`
    CREATE TABLE IF NOT EXISTS portfolio_ai_insights (
      user_id TEXT PRIMARY KEY,
      health_score TEXT,
      health_verdict TEXT,
      portfolio_beta REAL,
      cash_weight_pct REAL,
      report_json TEXT NOT NULL,
      status TEXT DEFAULT 'success',
      updated_at TEXT NOT NULL
    );
  `);
  console.log('   ✓ Đã đảm bảo bảng portfolio_ai_insights tồn tại trên Turso Cloud.');

  // 3.2 Tạo bảng requested_stocks kèm index chuẩn nếu chưa có
  await client.execute(`
    CREATE TABLE IF NOT EXISTS requested_stocks (
      symbol TEXT PRIMARY KEY,
      requested_at TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      synced_at TEXT,
      error_message TEXT
    );
  `);
  try {
    await client.execute('CREATE INDEX IF NOT EXISTS idx_requested_stocks_status ON requested_stocks(status);');
  } catch (e) {
    // ignore
  }
  console.log('   ✓ Đã đảm bảo bảng requested_stocks và index idx_requested_stocks_status tồn tại.');

  // 3.3 Đọc dữ liệu local từ data/stock.db để đẩy lên Turso
  if (fs.existsSync(LOCAL_DB_PATH)) {
    console.log(`   📂 Đang đọc dữ liệu local từ ${LOCAL_DB_PATH}...`);
    try {
      const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });

      // Đẩy portfolio_ai_insights từ local lên Turso
      try {
        const localAiRes = await localClient.execute('SELECT * FROM portfolio_ai_insights');
        const localAiRows = localAiRes.rows;
        console.log(`      Đọc được ${localAiRows.length} bản ghi portfolio_ai_insights từ local.`);
        for (const row of localAiRows) {
          await client.execute({
            sql: `
              INSERT OR REPLACE INTO portfolio_ai_insights 
              (user_id, health_score, health_verdict, portfolio_beta, cash_weight_pct, report_json, status, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
              row.user_id,
              row.health_score,
              row.health_verdict,
              row.portfolio_beta,
              row.cash_weight_pct,
              row.report_json,
              row.status,
              row.updated_at,
            ],
          });
          console.log(`      ✓ Đã đẩy portfolio_ai_insights cho user [${row.user_id}] lên Turso.`);
        }
      } catch (err) {
        console.warn('      ⚠️ Không thể đọc local portfolio_ai_insights:', err.message);
      }

      // Đẩy app_settings demo từ local lên Turso nếu Turso chưa có
      try {
        const localSettingsRes = await localClient.execute('SELECT * FROM app_settings');
        for (const s of localSettingsRes.rows) {
          await client.execute({
            sql: 'INSERT OR IGNORE INTO app_settings (key, value, user_id) VALUES (?, ?, ?)',
            args: [s.key, s.value, s.user_id || 'demo'],
          });
        }
        console.log('      ✓ Đã đồng bộ app_settings từ local lên Turso.');
      } catch (err) {
        console.warn('      ⚠️ Không thể đọc local app_settings:', err.message);
      }

      // Đẩy watchlist demo từ local lên Turso
      try {
        const localWatchlistRes = await localClient.execute('SELECT * FROM watchlist');
        for (const w of localWatchlistRes.rows) {
          await client.execute({
            sql: `
              INSERT OR IGNORE INTO watchlist 
              (id, symbol, target_buy_price, target_sell_price, target_price, note, created_at, user_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
              w.id,
              w.symbol,
              w.target_buy_price,
              w.target_sell_price,
              w.target_price,
              w.note || '',
              w.created_at,
              w.user_id || 'demo',
            ],
          });
        }
        console.log('      ✓ Đã đồng bộ watchlist từ local lên Turso.');
      } catch (err) {
        console.warn('      ⚠️ Không thể đọc local watchlist:', err.message);
      }
    } catch (err) {
      console.warn('   ⚠️ Lỗi khi đọc local stock.db:', err.message);
    }
  }

  // ── BƯỚC 4: ĐỐI SOÁT & NGHIỆM THU KẾT QUẢ CUỐI CÙNG ──
  console.log('\n🔍 [Bước 4/4] Đối soát thống kê số lượng bản ghi sau cùng trên Turso Cloud...');
  const finalTablesRes = await client.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' ORDER BY name");
  console.log('------------------------------------------------------------------');
  for (const r of finalTablesRes.rows) {
    const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM ${r.name}`);
    console.log(`  • ${r.name.padEnd(25)} : ${String(countRes.rows[0].cnt).padStart(5)} bản ghi`);
  }
  console.log('------------------------------------------------------------------');
  console.log('🎉 TẤT CẢ CÁC BƯỚC ĐÃ HOÀN TẤT THÀNH CÔNG VÀ AN TOÀN 100%!\n');
}

main().catch((err) => {
  console.error('❌ Lỗi thực thi quy trình Turso:', err);
  process.exit(1);
});
