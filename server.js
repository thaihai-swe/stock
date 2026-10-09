import app from './server/app.js';
import { PORT } from './server/config/constants.js';
import { initDatabase } from './server/storage/db.js';

// Khởi tạo Database SQLite trước khi khởi chạy server
await initDatabase();

app.listen(PORT, () => {
  console.log(`\n🚀 Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`🗄️ Database SQLite đã khởi tạo và sẵn sàng!\n`);
});
