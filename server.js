import app from './server/app.js';
import { PORT } from './server/config/constants.js';
import { initDatabase, getDbInfo } from './server/storage/db.js';

// Khởi tạo Database SQLite trước khi khởi chạy server
await initDatabase();

app.listen(PORT, () => {
  const db = getDbInfo();
  console.log(`\n🚀 Backend API đang chạy tại: http://localhost:${PORT}`);
  console.log(`🗄️ Database (DB_MODE=${process.env.DB_MODE || 'local'}):`);
  console.log(`   ├─ Loại:  ${db.label}`);
  console.log(`   └─ Nguồn: ${db.url}\n`);
});

