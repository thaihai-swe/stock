import { OAuth2Client } from 'google-auth-library';
import { db } from '../storage/db.js';

const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const oauthClient = new OAuth2Client(googleClientId);

export async function verifyGoogleToken(idToken) {
  try {
    if (googleClientId) {
      const ticket = await oauthClient.verifyIdToken({
        idToken,
        audience: googleClientId,
      });
      return ticket.getPayload();
    }
  } catch (err) {
    console.warn('Lỗi verifyIdToken cục bộ, thử qua tokeninfo:', err.message);
  }

  // Fallback: Gọi Google API tokeninfo endpoint để xác thực
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!res.ok) {
    throw new Error('Google ID Token không hợp lệ hoặc đã hết hạn.');
  }
  return await res.json();
}

export async function authMiddleware(req, res, next) {
  // Bỏ qua cho các route tĩnh hoặc health check
  if (req.path === '/api/health' || req.path === '/api/prices') {
    return next();
  }

  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // Mặc định: Tài khoản Demo nếu không có token hoặc token là 'demo'
  if (!token || token === 'demo') {
    req.user = {
      id: 'demo',
      email: 'demo@stockmanager.app',
      name: 'Tài khoản Demo',
      isDemo: true,
    };
    return next();
  }

  // Hỗ trợ chế độ test trên local: token dạng 'test-user1'
  if (token.startsWith('test-')) {
    const testId = token;
    req.user = {
      id: testId,
      email: `${testId}@test.local`,
      name: `Tài khoản Test (${testId})`,
      isDemo: false,
    };
    try {
      await db.execute({
        sql: `INSERT INTO users (id, email, name, created_at, last_login)
              VALUES (?, ?, ?, datetime('now'), datetime('now'))
              ON CONFLICT(id) DO UPDATE SET last_login = datetime('now');`,
        args: [req.user.id, req.user.email, req.user.name],
      });
    } catch (e) {
      // Bỏ qua lỗi ghi log
    }
    return next();
  }

  // Xác thực Google ID Token
  try {
    const payload = await verifyGoogleToken(token);
    const userId = payload.sub;
    const email = payload.email || '';
    const name = payload.name || email.split('@')[0] || 'Người dùng Google';

    // Lưu hoặc cập nhật user vào database
    try {
      await db.execute({
        sql: `INSERT INTO users (id, email, name, created_at, last_login)
              VALUES (?, ?, ?, datetime('now'), datetime('now'))
              ON CONFLICT(id) DO UPDATE SET last_login = datetime('now'), name = excluded.name, email = excluded.email;`,
        args: [userId, email, name],
      });
    } catch (dbErr) {
      console.error('Không thể lưu thông tin user vào database:', dbErr);
    }

    req.user = {
      id: userId,
      email,
      name,
      isDemo: false,
    };
    return next();
  } catch (err) {
    console.error('Lỗi xác thực Google token:', err.message);
    return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.' });
  }
}
