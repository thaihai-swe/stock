import express from 'express';
import {
  getAllData,
  updateGoal,
  updateCashBalance,
  getCashBalance,
  restoreAllData,
  clearUserData,
} from '../storage/sqliteStore.js';
import { getTodayString } from '../services/matchingService.js';

const router = express.Router();

// Lấy số dư tiền mặt
router.get(['/cash-balance', '/settings/cash-balance'], async (req, res) => {
  try {
    const userId = req.user?.id || 'demo';
    const cashBalance = await getCashBalance(userId);
    res.json({ cashBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cập nhật số dư tiền mặt
router.post(['/cash-balance', '/settings/cash-balance'], async (req, res) => {
  const { cashBalance } = req.body;
  const val = Math.max(0, parseFloat(cashBalance) || 0);
  try {
    const userId = req.user?.id || 'demo';
    await updateCashBalance(val, userId);
    res.json({ cashBalance: val });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cập nhật mục tiêu
router.post('/goal', async (req, res) => {
  const { targetAmount, year, description } = req.body;
  try {
    const userId = req.user?.id || 'demo';
    const goal = {
      targetAmount: parseFloat(targetAmount) || 0,
      year: parseInt(year) || new Date().getFullYear(),
      description: description || '',
      updatedAt: getTodayString(),
    };
    await updateGoal(goal, userId);
    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sao lưu toàn bộ dữ liệu giao dịch
router.get('/backup', async (req, res) => {
  try {
    const userId = req.user?.id || 'demo';
    const data = await getAllData(userId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Phục hồi dữ liệu từ file backup JSON
router.post('/restore', async (req, res) => {
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

  try {
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
    res.json({ success: true, message: 'Khôi phục dữ liệu thành công.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xoá toàn bộ dữ liệu người dùng (Bảo vệ tài khoản Demo mặc định)
router.delete('/user-data', async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.id === 'demo' || user.isDemo) {
      return res.status(403).json({
        error: 'Không được phép xoá dữ liệu của tài khoản Demo mặc định.',
      });
    }

    await clearUserData(user.id);
    res.json({
      success: true,
      message: 'Đã xoá toàn bộ dữ liệu giao dịch thành công.',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
