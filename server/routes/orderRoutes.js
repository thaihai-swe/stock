import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllData,
  getBuyOrders,
  addBuyOrder,
  deleteBuyOrder,
  executeSellOrder,
  deleteSellOrder,
} from '../storage/sqliteStore.js';
import { matchSellOrder, getTodayString } from '../services/matchingService.js';
import {
  sanitizeSymbol,
  validatePositiveNumber,
  validatePercentage,
  sanitizeDate,
} from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

// GET tất cả dữ liệu + portfolio tính sẵn
router.get('/data', asyncHandler(async (req, res) => {
  const data = await getAllData(req.user?.id || 'demo');
  return res.json(data);
}));

// POST lệnh mua
router.post('/buy', asyncHandler(async (req, res) => {
  const { symbol, quantity, price, note, date, feePct, tags } = req.body;
  const sym = sanitizeSymbol(symbol);
  const qty = validatePositiveNumber(quantity, 'số lượng', { min: 0, max: 10_000_000, integer: true });
  const prc = validatePositiveNumber(price, 'giá', { min: 0, max: 2_000_000 });
  const feePercent = validatePercentage(feePct, 'tỷ lệ phí', { min: 0, max: 10, defaultVal: 0 });
  const orderDate = sanitizeDate(date, getTodayString());

  const gross = qty * prc;
  const fee = gross * (feePercent / 100);
  const totalCost = gross + fee;
  const costPerShare = totalCost / qty;
  const userId = req.user?.id || 'demo';

  const order = {
    id: uuidv4(),
    symbol: sym,
    quantity: qty,
    price: prc,
    feePct: feePercent,
    fee: Math.round(fee),
    totalCost: Math.round(totalCost),
    costPerShare: Math.round(costPerShare * 100) / 100,
    remainingQty: qty,
    date: orderDate,
    note: note ? String(note).slice(0, 500) : '',
    tags: Array.isArray(tags) ? tags.map(t => String(t).slice(0, 50)) : [],
    userId,
  };

  await addBuyOrder(order, userId);
  return res.json(order);
}));

// POST lệnh bán (có tính lãi/lỗ tự động và trừ các lô mua theo matchMethod)
router.post('/sell', asyncHandler(async (req, res) => {
  const { symbol, quantity, price, note, date, feePct, tags, matchMethod = 'lowest' } = req.body;
  const sym = sanitizeSymbol(symbol);
  const qty = validatePositiveNumber(quantity, 'số lượng', { min: 0, max: 10_000_000, integer: true });
  const prc = validatePositiveNumber(price, 'giá', { min: 0, max: 2_000_000 });
  const feePercent = validatePercentage(feePct, 'tỷ lệ phí', { min: 0, max: 10, defaultVal: 0.1 });
  const sellDate = sanitizeDate(date, getTodayString());

  const userId = req.user?.id || 'demo';
  // Tối ưu hóa: Chỉ lấy các lô mua của người dùng thay vì tải toàn bộ database 5 bảng
  const buyOrders = await getBuyOrders(userId);

  const {
    matchedLots,
    totalCost,
    grossRevenue,
    netPrice,
    fee,
    totalRevenue,
    netRevenue,
    profitLoss,
    profitLossPct,
  } = matchSellOrder(sym, qty, prc, buyOrders, feePercent, matchMethod);

  const sellOrder = {
    id: uuidv4(),
    symbol: sym,
    quantity: qty,
    price: prc,
    feePct: feePercent,
    fee,
    taxPct: 0.1, // Thuế bán CK quy định 0.1% ở VN
    tax: Math.round(grossRevenue * 0.001),
    grossRevenue,
    netRevenue,
    totalRevenue,
    netPrice,
    totalCost,
    profitLoss,
    profitLossPct,
    matchedLots,
    matchMethod,
    date: sellDate,
    note: note ? String(note).slice(0, 500) : '',
    tags: Array.isArray(tags) ? tags.map(t => String(t).slice(0, 50)) : [],
    userId,
  };

  await executeSellOrder(sellOrder, matchedLots, userId);
  return res.json(sellOrder);
}));

// DELETE lệnh mua (chỉ xóa nếu chưa dùng trong giao dịch bán)
router.delete('/buy/:id', asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'demo';
  await deleteBuyOrder(req.params.id, userId);
  return res.json({ success: true });
}));

// DELETE lệnh bán (hoàn lại số lượng cho các lô mua tương ứng)
router.delete('/sell/:id', asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'demo';
  await deleteSellOrder(req.params.id, userId);
  return res.json({ success: true });
}));

export default router;
