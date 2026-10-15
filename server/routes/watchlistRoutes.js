import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getWatchlist,
  addWatchlistItem,
  deleteWatchlistItem,
} from '../storage/sqliteStore.js';
import {
  sanitizeSymbol,
  validatePositiveNumber,
} from '../middleware/validate.js';
import { getTodayString } from '../services/matchingService.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

router.get('/watchlist', asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'demo';
  const watchlist = await getWatchlist(userId);
  return res.json(watchlist);
}));

router.post('/watchlist', asyncHandler(async (req, res) => {
  const { symbol, targetPrice, targetBuyPrice, targetSellPrice, note } = req.body;
  const sym = sanitizeSymbol(symbol);
  const userId = req.user?.id || 'demo';

  let buyPrice = null;
  const rawBuy = targetBuyPrice !== undefined && targetBuyPrice !== '' ? targetBuyPrice : targetPrice;
  if (rawBuy !== undefined && rawBuy !== null && rawBuy !== '') {
    buyPrice = validatePositiveNumber(rawBuy, 'giá mua mục tiêu', { min: 0, max: 2_000_000 });
  }

  let sellPrice = null;
  if (targetSellPrice !== undefined && targetSellPrice !== null && targetSellPrice !== '') {
    sellPrice = validatePositiveNumber(targetSellPrice, 'giá bán mục tiêu', { min: 0, max: 2_000_000 });
  }

  const item = {
    id: uuidv4(),
    symbol: sym,
    targetPrice: buyPrice, // backward compatibility
    targetBuyPrice: buyPrice,
    targetSellPrice: sellPrice,
    note: note ? String(note).slice(0, 500) : '',
    createdAt: getTodayString(),
    userId,
  };

  await addWatchlistItem(item, userId);
  return res.json(item);
}));

router.delete('/watchlist/:id', asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'demo';
  await deleteWatchlistItem(req.params.id, userId);
  return res.json({ success: true });
}));

export default router;
