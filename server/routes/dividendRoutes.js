import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllData,
  addCashDividend,
  addStockDividend,
  deleteDividend,
} from '../storage/sqliteStore.js';
import { getTodayString } from '../services/matchingService.js';

const router = express.Router();

// GET danh sách toàn bộ cổ tức
router.get('/dividends', async (req, res) => {
  try {
    const userId = req.user?.id || 'demo';
    const data = await getAllData(userId);
    res.json(data.dividends || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST ghi nhận cổ tức mới (Tiền mặt hoặc Cổ phiếu thưởng)
router.post('/dividends', async (req, res) => {
  const { type, symbol, date, quantity, amountPerShare, taxPct, note } = req.body;

  if (!symbol) {
    return res.status(400).json({ error: 'Mã cổ phiếu là bắt buộc.' });
  }
  if (!type || !['CASH', 'STOCK'].includes(type)) {
    return res.status(400).json({ error: 'Loại cổ tức không hợp lệ (CASH hoặc STOCK).' });
  }

  const sym = symbol.trim().toUpperCase();
  const divDate = date ? String(date).slice(0, 10) : getTodayString();
  const qty = parseInt(quantity) || 0;
  const userId = req.user?.id || 'demo';

  try {
    if (type === 'CASH') {
      const amtPerShare = parseFloat(amountPerShare) || 0;
      const tax = taxPct !== undefined && taxPct !== '' ? parseFloat(taxPct) : 5; // Mặc định thuế TNCN 5% ở VN
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
        note: note || '',
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
        note: note || '',
        createdAt: getTodayString(),
        userId,
      };

      await addStockDividend(record, bonusBuyOrder, userId);
      return res.json(record);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE xóa bản ghi cổ tức
router.delete('/dividends/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'demo';
    await deleteDividend(req.params.id, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
