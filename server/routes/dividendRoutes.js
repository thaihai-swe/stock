import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getDividends,
  addCashDividend,
  addStockDividend,
  deleteDividend,
} from '../storage/sqliteStore.js';
import { getTodayString } from '../services/matchingService.js';
import {
  sanitizeSymbol,
  validatePositiveNumber,
  validatePercentage,
  sanitizeDate,
} from '../middleware/validate.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

// GET danh sách toàn bộ cổ tức
router.get('/dividends', asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'demo';
  const dividends = await getDividends(userId);
  return res.json(dividends);
}));

// POST ghi nhận cổ tức mới (Tiền mặt hoặc Cổ phiếu thưởng)
router.post('/dividends', asyncHandler(async (req, res) => {
  const { type, symbol, date, quantity, amountPerShare, taxPct, note } = req.body;

  if (!type || !['CASH', 'STOCK'].includes(type)) {
    return res.status(400).json({ error: 'Loại cổ tức không hợp lệ (CASH hoặc STOCK).' });
  }

  const sym = sanitizeSymbol(symbol);
  const divDate = sanitizeDate(date, getTodayString());
  const qty = validatePositiveNumber(quantity, 'số lượng', { min: 0, max: 10_000_000, integer: true });
  const userId = req.user?.id || 'demo';

  if (type === 'CASH') {
    const amtPerShare = validatePositiveNumber(amountPerShare, 'số tiền trên mỗi CP', { min: 0, max: 1_000_000 });
    const tax = validatePercentage(taxPct, 'thuế cổ tức', { min: 0, max: 50, defaultVal: 5 }); // Mặc định thuế TNCN 5% ở VN
    const grossAmount = Math.round(qty * amtPerShare);
    const taxAmount = Math.round(grossAmount * (tax / 100));
    const netAmount = grossAmount - taxAmount;

    const record = {
      id: uuidv4(),
      type: 'CASH',
      symbol: sym,
      date: divDate,
      quantity: qty,
      amountPerShare: amtPerShare,
      taxPct: tax,
      grossAmount,
      taxAmount,
      netAmount,
      note: note ? String(note).slice(0, 500) : '',
      createdAt: getTodayString(),
      userId,
    };

    await addCashDividend(record, userId);
    return res.json(record);
  }

  if (type === 'STOCK') {
    if (qty <= 0) {
      return res.status(400).json({ error: 'Số lượng cổ phiếu thưởng phải lớn hơn 0.' });
    }

    const dividendId = uuidv4();
    const buyOrderId = uuidv4();

    // Tạo lô mua 0đ trong buyOrders để tự động hạ giá vốn trung bình và tăng số lượng nắm giữ
    const bonusBuyOrder = {
      id: buyOrderId,
      symbol: sym,
      quantity: qty,
      price: 0,
      feePct: 0,
      fee: 0,
      totalCost: 0,
      costPerShare: 0,
      remainingQty: qty,
      date: divDate,
      note: `Cổ tức CP (GDKHQ: ${divDate}${note ? ' - ' + note : ''})`,
      tags: ['Cổ tức CP'],
      dividendId: dividendId,
      userId,
    };

    const record = {
      id: dividendId,
      type: 'STOCK',
      symbol: sym,
      date: divDate,
      quantity: qty,
      buyOrderId: buyOrderId,
      note: note ? String(note).slice(0, 500) : '',
      createdAt: getTodayString(),
      userId,
    };

    await addStockDividend(record, bonusBuyOrder, userId);
    return res.json(record);
  }
}));

// DELETE xóa bản ghi cổ tức
router.delete('/dividends/:id', asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'demo';
  await deleteDividend(req.params.id, userId);
  return res.json({ success: true });
}));

export default router;
