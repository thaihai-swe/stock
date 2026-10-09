import express from 'express';
import { getMultipleStockPrices } from '../services/priceService.js';

const router = express.Router();

router.get('/prices', async (req, res) => {
  const symbols = (req.query.symbols || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
  const force = req.query.force === 'true';

  try {
    const result = await getMultipleStockPrices(symbols, force);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
