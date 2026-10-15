import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllData,
  addBuyOrder,
  deleteBuyOrder,
  executeSellOrder,
  deleteSellOrder,
} from '../storage/sqliteStore.js';
import { matchSellOrder, getTodayString } from '../services/matchingService.js';

const router = express.Router();

// GET tất cả dữ liệu + portfolio tính sẵn
router.get('/data', async (req, res) => {
  try {
    const data = await getAllData(req.user?.id || 'demo');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST lệnh mua
router.post('/buy', async (req, res) => {
  const { symbol, quantity, price, note, date, feePct, tags } = req.body;
  if (!symbol || !quantity || !price) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (mã CP, số lượng, giá).' });
  }
  if (parseFloat(price) <= 0 || parseInt(quantity) <= 0) {
    return res.status(400).json({ error: 'Số lượng và giá phải lớn hơn 0.' });
  }

  try {
    const qty = parseInt(quantity);
    const prc = parseFloat(price);
    const feePercent = feePct !== undefined && feePct !== '' ? parseFloat(feePct) : 0;
    const gross = qty * prc;
    const fee = gross * (feePercent / 100);
    const totalCost = gross + fee;
    const costPerShare = totalCost / qty;
    const userId = req.user?.id || 'demo';

    const order = {
      id: uuidv4(),
      symbol: symbol.trim().toUpperCase(),
      quantity: qty,
      price: prc,
      feePct: feePercent,
      fee: Math.round(fee),
      totalCost: Math.round(totalCost),
      costPerShare: Math.round(costPerShare * 100) / 100,
      remainingQty: qty,
      date: date ? String(date).slice(0, 10) : getTodayString(),
      note: note || '',
      tags: Array.isArray(tags) ? tags : [],
      userId,
    };

    await addBuyOrder(order, userId);
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST lệnh bán (có tính lãi/lỗ tự động và trừ các lô mua theo matchMethod)
router.post('/sell', async (req, res) => {
  const { symbol, quantity, price, note, date, feePct, tags, matchMethod = 'lowest' } = req.body;
  if (!symbol || !quantity || !price) {
    return res.status(400).json({ error: 'Thiếu thông tin bắt buộc (mã CP, số lượng, giá).' });
  }
  if (parseFloat(price) <= 0 || parseInt(quantity) <= 0) {
    return res.status(400).json({ error: 'Số lượng và giá phải lớn hơn 0.' });
  }

  try {
    const userId = req.user?.id || 'demo';
    const data = await getAllData(userId);
    const sym = symbol.trim().toUpperCase();
    const qty = parseInt(quantity);
    const prc = parseFloat(price);
    const feePercent = feePct !== undefined && feePct !== '' ? parseFloat(feePct) : 0.1;

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
    } = matchSellOrder(sym, qty, prc, data.buyOrders, feePercent, matchMethod);

    const sellOrder = {
      id: uuidv4(),
      symbol: sym,
      quantity: qty,
      price: prc,
      netPrice: netPrice || prc,
      feePct: feePercent,
      fee,
      grossRevenue,
      netRevenue: netRevenue || totalRevenue,
      totalRevenue: netRevenue || totalRevenue,
      date: date ? String(date).slice(0, 10) : getTodayString(),
      matchedLots,
      totalCost,
      profitLoss,
      profitLossPct,
      matchMethod,
      note: note || '',
      tags: Array.isArray(tags) ? tags : [],
      userId,
    };

    await executeSellOrder(sellOrder, matchedLots, userId);
    res.json(sellOrder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE lệnh mua (chỉ xóa nếu chưa dùng trong giao dịch bán)
router.delete('/buy/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'demo';
    await deleteBuyOrder(req.params.id, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE lệnh bán (hoàn lại số lượng cho các lô mua tương ứng)
router.delete('/sell/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'demo';
    await deleteSellOrder(req.params.id, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
