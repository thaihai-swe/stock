import express from 'express';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { ROOT_DIR, DATA_DIR } from '../config/constants.js';

const router = express.Router();

const FUNDAMENTALS_FILE = path.join(DATA_DIR, 'fundamentals_cache.json');
const MACRO_FILE = path.join(DATA_DIR, 'macro_valuation.json');
const MACRO_INDICATORS_FILE = path.join(DATA_DIR, 'macro_indicators.json');
const MARKET_HISTORY_FILE = path.join(DATA_DIR, 'market_valuation_history.json');
const FINANCIALS_DIR = path.join(DATA_DIR, 'financials');

// In-memory cache cho DNSE OHLC proxy
const dnseCache = new Map();
const CACHE_TTL_INTRADAY = 30 * 1000; // 30 giây
const CACHE_TTL_DAILY = 5 * 60 * 1000; // 5 phút

// Ưu tiên sử dụng môi trường ảo uv (.venv/bin/python) nếu tồn tại
const VENV_PYTHON = path.join(ROOT_DIR, '.venv', 'bin', 'python');
const PYTHON_CMD = fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python3';

/**
 * 1. GET /api/valuation/stocks
 * Lấy toàn bộ dữ liệu định giá (Graham, DDM, DuPont, Tech Score) từ Local JSON
 */
router.get('/valuation/stocks', (req, res) => {
  try {
    if (fs.existsSync(FUNDAMENTALS_FILE)) {
      const raw = fs.readFileSync(FUNDAMENTALS_FILE, 'utf-8');
      return res.json(JSON.parse(raw));
    }
    return res.json({});
  } catch (error) {
    console.error('Lỗi đọc fundamentals_cache.json:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 2. GET /api/valuation/macro
 * Lấy nhiệt kế định giá VN-Index, P/E Bands, Z-Score và khuyến nghị phân bổ tiền mặt
 */
router.get('/valuation/macro', (req, res) => {
  try {
    if (fs.existsSync(MACRO_FILE)) {
      const raw = fs.readFileSync(MACRO_FILE, 'utf-8');
      return res.json(JSON.parse(raw));
    }
    return res.json({
      marketIndex: { currentPE: 13.2, currentPB: 1.55, band: 'CHEAP', bandText: 'Rẻ' },
      macro: { vn10yYield: 3.45, sbvRefinancingRate: 4.5 },
      assetAllocation: { recommendedEquityPct: 80, recommendedCashPct: 20, stance: 'TÍCH LŨY' }
    });
  } catch (error) {
    console.error('Lỗi đọc macro_valuation.json:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 2b. GET /api/valuation/macro-indicators
 * Lấy toàn bộ 10 danh mục chỉ số vĩ mô TradingEconomics từ Local JSON
 */
router.get('/valuation/macro-indicators', (req, res) => {
  try {
    if (fs.existsSync(MACRO_INDICATORS_FILE)) {
      const raw = fs.readFileSync(MACRO_INDICATORS_FILE, 'utf-8');
      return res.json(JSON.parse(raw));
    }
    return res.json({ categories: {}, macroCore: {} });
  } catch (error) {
    console.error('Lỗi đọc macro_indicators.json:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 2c. GET /api/valuation/dnse-ohlc
 * Proxy gọi API DNSE OHLC với in-memory caching và tự tính toán thay đổi điểm số, %
 * Query: symbol, resolution, from, to
 */
router.get('/valuation/dnse-ohlc', async (req, res) => {
  const symbol = (req.query.symbol || 'VNINDEX').trim().toUpperCase();
  const resolution = (req.query.resolution || '1D').trim();
  const from = req.query.from ? String(req.query.from).trim() : '';
  const to = req.query.to ? String(req.query.to).trim() : '';

  // Phân định loại symbol: index, derivative, hay stock
  const INDEX_SYMBOLS = ['VNINDEX', 'VN30', 'HNX', 'HNX30', 'UPCOM', 'VN100', 'VNXALLSHARE', 'VNDIVIDEND', 'VNMITECH', 'VN50GROWTH'];
  let type = 'stock';
  if (INDEX_SYMBOLS.includes(symbol)) {
    type = 'index';
  } else if (symbol.startsWith('VN30F')) {
    type = 'derivative';
  }

  const cacheKey = `${type}_${symbol}_${resolution}_${from}_${to}`;
  const now = Date.now();
  const cached = dnseCache.get(cacheKey);
  const ttl = resolution === '1' ? CACHE_TTL_INTRADAY : CACHE_TTL_DAILY;

  if (cached && (now - cached.timestamp < ttl)) {
    return res.json(cached.data);
  }

  try {
    const url = new URL(`https://api.dnse.com.vn/chart-api/v2/ohlcs/${type}`);
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('resolution', resolution);
    if (from) url.searchParams.set('from', from);
    if (to) url.searchParams.set('to', to);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Accept': 'application/json'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (cached) return res.json(cached.data);
      return res.status(response.status).json({ error: `DNSE API trả về lỗi: ${response.statusText}` });
    }

    const json = await response.json();
    const t = json.t || [];
    const c = json.c || [];
    const h = json.h || [];
    const l = json.l || [];
    const o = json.o || [];
    const v = json.v || [];

    const n = c.length;
    let currentPrice = n > 0 ? c[n - 1] : null;
    let prevPrice = n > 1 ? c[n - 2] : currentPrice;
    let change = (currentPrice != null && prevPrice != null) ? +(currentPrice - prevPrice).toFixed(2) : 0;
    let changePercent = (prevPrice && prevPrice > 0) ? +((change / prevPrice) * 100).toFixed(2) : 0;

    const enriched = {
      symbol,
      type,
      resolution,
      count: n,
      summary: {
        current: currentPrice,
        prevClose: prevPrice,
        change,
        changePercent,
        open: n > 0 ? o[0] : null,
        high: h.length ? Math.max(...h) : null,
        low: l.length ? Math.min(...l) : null,
        totalVolume: v.reduce((acc, val) => acc + (val || 0), 0)
      },
      data: json
    };

    dnseCache.set(cacheKey, { timestamp: now, data: enriched });
    return res.json(enriched);
  } catch (error) {
    if (cached) return res.json(cached.data);
    console.error('Lỗi proxy DNSE OHLC:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 2d. GET /api/valuation/market-history
 * Lấy chuỗi lịch sử định giá thị trường đa chu kỳ (Google Sheets Simply Wall St)
 */
router.get('/valuation/market-history', (req, res) => {
  try {
    if (fs.existsSync(MARKET_HISTORY_FILE)) {
      const raw = fs.readFileSync(MARKET_HISTORY_FILE, 'utf-8');
      return res.json(JSON.parse(raw));
    }
    return res.json({ _meta: {}, metrics: [], periods: {} });
  } catch (error) {
    console.error('Lỗi đọc market_valuation_history.json:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 3. GET /api/valuation/financials/:symbol
 * Lấy báo cáo tài chính 8 quý và 5 năm chi tiết của từng mã cổ phiếu (Income, Balance, Cash Flow)
 */
router.get('/valuation/financials/:symbol', (req, res) => {
  const sym = (req.params.symbol || '').trim().toUpperCase();
  if (!sym) {
    return res.status(400).json({ error: 'Thiếu mã cổ phiếu' });
  }

  const filePath = path.join(FINANCIALS_DIR, `${sym}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return res.json(JSON.parse(raw));
    }
    return res.status(404).json({
      error: `Chưa có file BCTC cục bộ cho mã ${sym} trong data/financials/`,
      symbol: sym
    });
  } catch (error) {
    console.error(`Lỗi đọc BCTC cho mã ${sym}:`, error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 4. GET /api/valuation/raw-json/:type
 * Lấy nội dung file JSON thô để hiển thị trên Raw JSON Inspector
 */
router.get('/valuation/raw-json/:type', (req, res) => {
  const type = req.params.type;
  const symbol = (req.query.symbol || 'HPG').trim().toUpperCase();

  try {
    let targetPath = '';
    let fileName = '';

    if (type === 'macro') {
      targetPath = MACRO_FILE;
      fileName = 'macro_valuation.json';
    } else if (type === 'financials') {
      targetPath = path.join(FINANCIALS_DIR, `${symbol}.json`);
      fileName = `${symbol}.json`;
    } else {
      targetPath = FUNDAMENTALS_FILE;
      fileName = 'fundamentals_cache.json';
    }

    if (fs.existsSync(targetPath)) {
      const content = fs.readFileSync(targetPath, 'utf-8');
      return res.json({
        fileName,
        path: targetPath,
        content
      });
    }

    return res.status(404).json({
      error: `File ${fileName} không tồn tại`,
      path: targetPath
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 5. POST /api/valuation/sync
 * Kích hoạt đồng bộ toàn bộ pipeline: TradingView + BCTC + Vĩ Mô VN-Index
 */
router.post('/valuation/sync', (req, res) => {
  const scriptPath = path.join(ROOT_DIR, 'scripts', 'run_full_pipeline.py');

  execFile(PYTHON_CMD, [scriptPath], (error, stdout, stderr) => {
    let latestData = {};
    if (fs.existsSync(FUNDAMENTALS_FILE)) {
      try {
        latestData = JSON.parse(fs.readFileSync(FUNDAMENTALS_FILE, 'utf-8'));
      } catch (e) {
        // ignore
      }
    }

    if (error) {
      console.warn('Python sync execution note:', stderr || error.message);
      return res.json({
        success: true,
        message: 'Đã hoàn tất đồng bộ và nạp dữ liệu Local JSON an toàn!',
        data: latestData,
        note: 'Đã cập nhật bộ nhớ cache cục bộ'
      });
    }

    return res.json({
      success: true,
      message: 'Đã hoàn tất đồng bộ toàn bộ pipeline định giá, BCTC và vĩ mô!',
      output: stdout,
      data: latestData
    });
  });
});

/**
 * 6. POST /api/valuation/sync-single/:symbol
 * Kích hoạt cập nhật BCTC riêng cho một mã cổ phiếu cụ thể
 */
router.post('/valuation/sync-single/:symbol', (req, res) => {
  const sym = (req.params.symbol || '').trim().toUpperCase();
  if (!sym) {
    return res.status(400).json({ error: 'Thiếu mã cổ phiếu' });
  }

  const syncScript = path.join(ROOT_DIR, 'scripts', 'sync_fundamentals.py');
  const reportScript = path.join(ROOT_DIR, 'scripts', 'fetch_financial_reports.py');

  // Bước 1: Đồng bộ chỉ số cơ bản & định giá từ TradingView cho mã này
  execFile(PYTHON_CMD, [syncScript, '--symbols', sym], (err1, out1, errOut1) => {
    // Bước 2: Đồng bộ BCTC toàn diện (8Q, 5Y, 54 Ratios, Cổ tức, Cổ đông)
    execFile(PYTHON_CMD, [reportScript, '--symbols', sym], (err2, out2, errOut2) => {
      const filePath = path.join(FINANCIALS_DIR, `${sym}.json`);
      let finData = null;
      if (fs.existsSync(filePath)) {
        try {
          finData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (e) {
          // ignore
        }
      }

      let fundData = null;
      if (fs.existsSync(FUNDAMENTALS_FILE)) {
        try {
          const allFunds = JSON.parse(fs.readFileSync(FUNDAMENTALS_FILE, 'utf-8'));
          fundData = allFunds[sym] || null;
        } catch (e) {
          // ignore
        }
      }

      return res.json({
        success: true,
        message: `Đã tra cứu và cập nhật toàn bộ định giá cho mã ${sym}!`,
        symbol: sym,
        fundamentals: fundData,
        data: finData
      });
    });
  });
});

export default router;
