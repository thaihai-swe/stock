import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllData,
  addWatchlistItem,
  deleteWatchlistItem,
} from '../storage/sqliteStore.js';
import { getTodayString } from '../services/matchingService.js';

const router = express.Router();

router.get('/watchlist', async (req, res) => {
  try {
    const userId = req.user?.id || 'demo';
    const data = await getAllData(userId);
    res.json(data.watchlist || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/watchlist', async (req, res) => {
  const { symbol, targetPrice, targetBuyPrice, targetSellPrice, note } = req.body;
  if (!symbol) return res.status(400).json({ error: 'Mã cổ phiếu là bắt buộc.' });

  try {
    const userId = req.user?.id || 'demo';
    const buyPrice = targetBuyPrice !== undefined && targetBuyPrice !== ''
      ? parseFloat(targetBuyPrice)
      : (targetPrice !== undefined && targetPrice !== '' ? parseFloat(targetPrice) : null);
    const sellPrice = targetSellPrice !== undefined && targetSellPrice !== ''
      ? parseFloat(targetSellPrice)
      : null;

    const item = {
      id: uuidv4(),
      symbol: symbol.trim().toUpperCase(),
      targetPrice: buyPrice, // backward compatibility
      targetBuyPrice: buyPrice,
      targetSellPrice: sellPrice,
      note: note || '',
      createdAt: getTodayString(),
      userId,
    };

    await addWatchlistItem(item, userId);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/watchlist/:id', async (req, res) => {
  try {
    const userId = req.user?.id || 'demo';
    await deleteWatchlistItem(req.params.id, userId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
