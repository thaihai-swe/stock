import express from 'express';
import { verifyGoogleToken } from '../middleware/auth.js';
import { cloneDemoDataForUser } from '../storage/sqliteStore.js';
import { db } from '../storage/db.js';

const router = express.Router();

// 1. Lấy thông tin người dùng hiện tại
router.get('/auth/me', (req, res) => {
  res.json({
    user: req.user || { id: 'demo', isDemo: true, name: 'Tài khoản Demo' },
  });
});

// 2. Xác thực đăng nhập Google
router.post('/auth/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'Thiếu Google token.' });
    }

    const payload = await verifyGoogleToken(token);
    const userId = payload.sub;
    const email = payload.email || '';
    const name = payload.name || email.split('@')[0] || 'Người dùng Google';

    // Lưu / Cập nhật vào DB
    await db.execute({
      sql: `INSERT INTO users (id, email, name, created_at, last_login)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(id) DO UPDATE SET last_login = datetime('now'), name = excluded.name, email = excluded.email;`,
      args: [userId, email, name],
    });

    const user = {
      id: userId,
      email,
      name,
      isDemo: false,
    };

    res.json({
      user,
      token,
    });
  } catch (err) {
    res.status(400).json({ error: 'Đăng nhập Google thất bại: ' + err.message });
  }
});

// 3. Sao chép dữ liệu mẫu (Demo) sang tài khoản cá nhân
router.post('/auth/clone-demo', async (req, res) => {
  try {
    if (!req.user || req.user.isDemo) {
      return res.status(400).json({ error: 'Bạn đang ở tài khoản Demo. Hãy đăng nhập Google trước khi sao chép.' });
    }

    await cloneDemoDataForUser(req.user.id);
    res.json({
      success: true,
      message: 'Đã sao chép thành công danh mục mẫu sang tài khoản của bạn!',
    });
  } catch (err) {
    res.status(500).json({ error: 'Không thể sao chép dữ liệu: ' + err.message });
  }
});

export default router;
