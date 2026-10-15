import express from 'express';
import {
  getAllData,
  updateCashBalance,
  getCashBalance,
  restoreAllData,
  clearUserData,
} from '../storage/sqliteStore.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

// Lấy số dư tiền mặt
router.get(['/cash-balance', '/settings/cash-balance'], asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'demo';
  const cashBalance = await getCashBalance(userId);
  return res.json({ cashBalance });
}));

// Cập nhật số dư tiền mặt (hỗ trợ cả /cash-balance và /settings/cash-balance)
router.post(['/cash-balance', '/settings/cash-balance'], asyncHandler(async (req, res) => {
  const { cashBalance } = req.body;
  const val = parseFloat(cashBalance) || 0;
  const userId = req.user?.id || 'demo';
  await updateCashBalance(val, userId);
  return res.json({ cashBalance: val });
}));

// Sao lưu toàn bộ dữ liệu giao dịch
router.get('/backup', asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'demo';
  const data = await getAllData(userId);
  return res.json(data);
}));

// Phục hồi dữ liệu từ file backup JSON
router.post('/restore', asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user || user.id === 'demo' || user.isDemo) {
    return res.status(403).json({
      error: 'Không được phép khôi phục dữ liệu ghi đè lên tài khoản Demo. Vui lòng đăng nhập tài khoản cá nhân.',
    });
  }

  const incoming = req.body;
  if (!incoming || !Array.isArray(incoming.buyOrders) || !Array.isArray(incoming.sellOrders)) {
    return res.status(400).json({ error: 'Dữ liệu không hợp lệ. Cần có danh sách buyOrders và sellOrders.' });
  }

  const userId = user.id;
  const cleanData = {
    buyOrders: incoming.buyOrders,
    sellOrders: incoming.sellOrders,
    dividends: Array.isArray(incoming.dividends) ? incoming.dividends : [],
    watchlist: Array.isArray(incoming.watchlist) ? incoming.watchlist : [],
    goal: incoming.goal || null,
    settings: incoming.settings || {},
  };
  await restoreAllData(cleanData, userId);
  return res.json({ success: true, message: 'Khôi phục dữ liệu thành công.' });
}));

// Xoá toàn bộ dữ liệu người dùng (Bảo vệ tài khoản Demo mặc định)
router.delete('/user-data', asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user || user.id === 'demo' || user.isDemo) {
    return res.status(403).json({
      error: 'Không được phép xoá dữ liệu của tài khoản Demo mặc định.',
    });
  }

  await clearUserData(user.id);
  return res.json({
    success: true,
    message: 'Đã xoá toàn bộ dữ liệu giao dịch thành công.',
  });
}));

export default router;
