import express from 'express';
import { getMultipleStockPrices, getMarketIndexData } from '../services/priceService.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

router.get('/prices', asyncHandler(async (req, res) => {
  const symbols = (req.query.symbols || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
  const force = req.query.force === 'true';

  const result = await getMultipleStockPrices(symbols, force);
  return res.json(result);
}));

router.get('/market-index', asyncHandler(async (req, res) => {
  const force = req.query.force === 'true';
  const result = await getMarketIndexData(force);
  return res.json(result);
}));

export default router;
