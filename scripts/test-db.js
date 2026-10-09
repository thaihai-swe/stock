import 'dotenv/config';
import { db, initDatabase, getDbInfo } from '../server/storage/db.js';

async function runTest() {
  const info = getDbInfo();

  console.log('\n======================================================');
  console.log('🧪 KIỂM TRA KẾT NỐI DATABASE (DIAGNOSTIC TEST)');
  console.log('======================================================');
  console.log(`📌 Chế độ cấu hình: [${info.mode.toUpperCase()}]`);
  console.log(`🏷️  Loại database:   ${info.label}`);
  console.log(`🔗 Đường dẫn / URL: ${info.url}`);
  console.log('------------------------------------------------------');

  if (info.isTurso && !process.env.TURSO_DATABASE_URL) {
    console.error('❌ Lỗi: Bạn chưa điền biến TURSO_DATABASE_URL trong file .env!');
    process.exit(1);
  }

  const startTime = Date.now();
  console.log('⏳ Đang gửi truy vấn kiểm tra kết nối...');

  try {
    // 1. Khởi tạo và tạo bảng nếu chưa có
    await initDatabase();

    // 2. Kiểm tra truy vấn
    const pingRes = await db.execute('SELECT 1 as ping;');
    const latency = Date.now() - startTime;

    console.log(`✅ Kết nối thành công! (Thời gian phản hồi: ${latency}ms)`);
    console.log('------------------------------------------------------');

    // 3. Thống kê số lượng bản ghi
    const [buyRes, sellRes, divRes, watchRes] = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM buy_orders;'),
      db.execute('SELECT COUNT(*) as count FROM sell_orders;'),
      db.execute('SELECT COUNT(*) as count FROM dividends;'),
      db.execute('SELECT COUNT(*) as count FROM watchlist;'),
    ]);

    const buyCount = Number(buyRes.rows[0]?.count || 0);
    const sellCount = Number(sellRes.rows[0]?.count || 0);
    const divCount = Number(divRes.rows[0]?.count || 0);
    const watchCount = Number(watchRes.rows[0]?.count || 0);

    console.log('📊 THỐNG KÊ DỮ LIỆU HIỆN CÓ TRONG DATABASE:');
    console.log(`  • Lệnh mua (Buy Orders):     ${buyCount}`);
    console.log(`  • Lệnh bán (Sell Orders):    ${sellCount}`);
    console.log(`  • Bản ghi cổ tức (Dividends): ${divCount}`);
    console.log(`  • Danh sách theo dõi (Watchlist): ${watchCount}`);
    console.log('======================================================');

    if (info.isTurso) {
      console.log('🎉 Database Turso Cloud đã sẵn sàng hoạt động cả ở Local lẫn trên Vercel!');
    } else {
      console.log('💡 Đang chạy SQLite Local. Để chuyển sang test Turso Cloud, hãy mở file .env:');
      console.log('   - Điền TURSO_DATABASE_URL và TURSO_AUTH_TOKEN');
      console.log('   - Đổi DB_MODE=turso');
    }
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ KẾT NỐI THẤT BẠI!');
    console.error('Chi tiết lỗi:', err.message);
    if (info.isTurso) {
      console.error('\n👉 Gợi ý khắc phục cho Turso Cloud:');
      console.error('1. Kiểm tra lại TURSO_DATABASE_URL có đúng định dạng: libsql://ten-db.turso.io');
      console.error('2. Kiểm tra lại TURSO_AUTH_TOKEN đã copy đầy đủ chuỗi token chưa.');
      console.error('3. Kiểm tra kết nối mạng Internet.');
    }
    console.log('======================================================\n');
    process.exit(1);
  }
}

runTest();
