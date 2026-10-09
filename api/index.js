import app from '../server/app.js';
import { initDatabase } from '../server/storage/db.js';

// Vercel Serverless Function entrypoint
export default async function handler(req, res) {
  try {
    await initDatabase();
  } catch (err) {
    console.error('Lỗi khởi tạo SQLite trên Vercel:', err);
  }
  return app(req, res);
}
