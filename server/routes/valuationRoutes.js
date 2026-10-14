import express from 'express';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import {
  ROOT_DIR,
  DATA_DIR,
  REQUESTED_STOCKS_FILE,
  MACRO_CONFIG,
  MACRO_THRESHOLDS,
  MACRO_NARRATIVES,
  AI_MACRO_CONFIG,
  AI_INSIGHTS_CACHE_FILE,
} from '../config/constants.js';
import { db } from '../storage/db.js';
import { getPortfolioAiInsight } from '../storage/sqliteStore.js';

const router = express.Router();

const FUNDAMENTALS_FILE = path.join(DATA_DIR, 'fundamentals_cache.json');
const MACRO_FILE = path.join(DATA_DIR, 'macro_valuation.json');
const MACRO_INDICATORS_FILE = path.join(DATA_DIR, 'macro_indicators.json');
const MARKET_HISTORY_FILE = path.join(DATA_DIR, 'market_valuation_history.json');
const FINANCIALS_DIR = path.join(DATA_DIR, 'financials');
const PORTFOLIO_AI_FILE = path.join(DATA_DIR, 'portfolio_ai_insights.json');

// In-memory cache cho DNSE OHLC proxy (TTL 1 giờ)
const dnseCache = new Map();
const CACHE_TTL_INTRADAY = 60 * 60 * 1000; // 1 giờ (60 phút)
const CACHE_TTL_DAILY = 60 * 60 * 1000; // 1 giờ (60 phút)

// Ghi nhận mã cổ phiếu vào hàng đợi requested_stocks (đúng 5 trường)
export async function queueRequestedStock(symbol) {
  if (!symbol || typeof symbol !== 'string') return null;
  const sym = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!sym || sym.length < 2 || sym.length > 8) return null;

  const now = new Date().toISOString();

  // 1. Ghi nhận vào SQLite / Turso DB
  try {
    await db.execute({
      sql: `INSERT OR IGNORE INTO requested_stocks (symbol, requested_at, status, synced_at, error_message)
            VALUES (?, ?, 'PENDING', NULL, NULL);`,
      args: [sym, now]
    });
  } catch (err) {
    console.warn(`Lỗi ghi nhận requested_stocks vào DB cho ${sym}:`, err.message);
  }

  // 2. Đồng bộ file snapshot data/requested_stocks.json
  try {
    let requestsMap = {};
    if (fs.existsSync(REQUESTED_STOCKS_FILE)) {
      try {
        requestsMap = JSON.parse(fs.readFileSync(REQUESTED_STOCKS_FILE, 'utf-8'));
      } catch {
        requestsMap = {};
      }
    }
    if (!requestsMap[sym]) {
      requestsMap[sym] = {
        symbol: sym,
        requested_at: now,
        status: 'PENDING',
        synced_at: null,
        error_message: null
      };
      fs.writeFileSync(REQUESTED_STOCKS_FILE, JSON.stringify(requestsMap, null, 2), 'utf-8');
    }
  } catch (err) {
    // bỏ qua lỗi file nếu đang trên môi trường read-only
  }

  return {
    symbol: sym,
    requested_at: now,
    status: 'PENDING',
    synced_at: null,
    error_message: null
  };
}

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
      const macroData = JSON.parse(raw);

      // Tầng phòng thủ Zero-Downtime AI Cache: Nạp weeklyPulse & sectorTransmission từ ai_insights_cache.json nếu macro_valuation.json chưa có
      if (fs.existsSync(AI_INSIGHTS_CACHE_FILE)) {
        try {
          const aiRaw = fs.readFileSync(AI_INSIGHTS_CACHE_FILE, 'utf-8');
          const aiCache = JSON.parse(aiRaw);
          if (!macroData.weeklyPulse && aiCache.weeklyPulse) {
            macroData.weeklyPulse = aiCache.weeklyPulse;
          }
          if (!macroData.sectorTransmission && aiCache.sectorTransmission) {
            macroData.sectorTransmission = aiCache.sectorTransmission;
          }
          if (!macroData.aiInsight && aiCache.aiInsight) {
            macroData.aiInsight = aiCache.aiInsight;
          }
        } catch (e) {
          console.warn('⚠️ Lỗi nạp fallback AI cache:', e.message);
        }
      }

      return res.json(macroData);
    }
    return res.json({
      marketIndex: null,
      macro: null,
      assetAllocation: null
    });
  } catch (error) {
    console.error('Lỗi đọc macro_valuation.json:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 2a. GET /api/valuation/macro/config
 * Lấy toàn bộ ngưỡng số liệu (thresholds), mô tả chu kỳ & narrative từ file cấu hình & macro JSON
 */
router.get('/valuation/macro/config', (req, res) => {
  try {
    let macroData = {};
    if (fs.existsSync(MACRO_FILE)) {
      try {
        macroData = JSON.parse(fs.readFileSync(MACRO_FILE, 'utf-8'));
      } catch {}
    }
    const aiInsight = macroData.aiInsight || {};
    return res.json({
      thresholds: MACRO_THRESHOLDS,
      narratives: MACRO_NARRATIVES,
      aiConfig: {
        enabled: AI_MACRO_CONFIG?.enabled ?? true,
        mode: 'background_pipeline',
        provider: aiInsight.provider || 'python_pipeline',
        model: aiInsight.model || 'Gemini 2.5 Flash / CIO Heuristic',
        hasApiKey: true,
        updatedAt: aiInsight.updatedAt || macroData.updatedAt || null,
      },
    });
  } catch (error) {
    console.error('Lỗi lấy macro config:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 2a-2. POST /api/valuation/macro/ai-analysis
 * Trả về báo cáo chiến lược CIO sinh bởi Python Background Pipeline (0ms, 0 API cost).
 */
router.post('/valuation/macro/ai-analysis', async (req, res) => {
  try {
    let macroData = {};
    if (fs.existsSync(MACRO_FILE)) {
      try {
        macroData = JSON.parse(fs.readFileSync(MACRO_FILE, 'utf-8'));
      } catch {}
    }
    return res.json(macroData.aiInsight || {
      headline: 'Chiến Lược Phân Bổ CIO Toàn Diện',
      summary: 'Dữ liệu phân tích vĩ mô được đồng bộ tự động từ Python Background Pipeline.',
      bullets: [],
    });
  } catch (error) {
    console.error('Lỗi thực thi AI Macro Analysis:', error);
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
  const rawSymbol = (req.query.symbol || 'VNINDEX').trim().toUpperCase();
  const resolution = (req.query.resolution || '1D').trim();
  const from = req.query.from ? String(req.query.from).trim() : '';
  const to = req.query.to ? String(req.query.to).trim() : '';

  // Ánh xạ symbol nếu là chỉ số chuyên đề dùng ETF mô phỏng
  let symbol = rawSymbol;
  let isProxy = false;
  let proxyLabel = '';

  if (rawSymbol === 'VNDIAMOND') {
    symbol = 'FUEVFVND';
    isProxy = true;
    proxyLabel = 'DCVFMVN Diamond ETF';
  } else if (rawSymbol === 'VNMIDCAP' || rawSymbol === 'VNMID') {
    symbol = 'FUEDCMID';
    isProxy = true;
    proxyLabel = 'DCVFMVN Midcap ETF';
  }

  // Phân định loại symbol: index, derivative, hay stock
  const INDEX_SYMBOLS = ['VNINDEX', 'VN30', 'VN100', 'VNXALLSHARE', 'VNDIVIDEND', 'VNMITECH', 'VN50GROWTH'];
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
      symbol: rawSymbol,
      underlyingSymbol: symbol,
      isProxy,
      proxyLabel,
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
router.get('/valuation/financials/:symbol', async (req, res) => {
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

    // Tự động đưa mã vào hàng đợi requested_stocks nếu chưa có trong kho
    await queueRequestedStock(sym);

    return res.status(404).json({
      error: `Dữ liệu phân tích và BCTC cho mã ${sym} hiện chưa có sẵn trong kho lưu trữ của hệ thống.`,
      queueMessage: `Hệ thống đã tự động ghi nhận mã ${sym} vào hàng đợi yêu cầu dữ liệu. Dữ liệu sẽ tự động được thu thập trong phiên đồng bộ EOD lúc 18:00 tiếp theo!`,
      symbol: sym,
      isQueued: true
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
    } else if (type === 'market-history' || type === 'market_valuation_history') {
      targetPath = MARKET_HISTORY_FILE;
      fileName = 'market_valuation_history.json';
    } else if (type === 'indicators' || type === 'macro_indicators') {
      targetPath = MACRO_INDICATORS_FILE;
      fileName = 'macro_indicators.json';
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

    if (type === 'financials') {
      return res.status(404).json({
        error: `Dữ liệu phân tích và BCTC cho mã ${symbol} hiện chưa có sẵn trong kho lưu trữ của hệ thống. Vui lòng thông báo cho người quản lý để bổ sung mã này vào danh sách theo dõi.`,
        path: targetPath
      });
    }

    return res.status(404).json({
      error: `File ${fileName} không tồn tại trong kho lưu trữ`,
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
  const getLatestFundamentals = () => {
    let latestData = {};
    if (fs.existsSync(FUNDAMENTALS_FILE)) {
      try {
        latestData = JSON.parse(fs.readFileSync(FUNDAMENTALS_FILE, 'utf-8'));
      } catch (e) {
        // ignore
      }
    }
    return latestData;
  };

  const isServerlessOrNoPython = Boolean(
    process.env.VERCEL ||
    process.env.NOW_REGION ||
    !fs.existsSync(VENV_PYTHON)
  );

  if (isServerlessOrNoPython) {
    const latestData = getLatestFundamentals();
    return res.json({
      success: true,
      message: 'Hệ thống đang hoạt động trên dữ liệu đồng bộ định kỳ mới nhất. Để cập nhật dữ liệu thị trường mới, vui lòng thông báo cho người quản lý.',
      data: latestData,
      note: 'Dữ liệu kho lưu trữ định kỳ'
    });
  }

  const scriptPath = path.join(ROOT_DIR, 'scripts', 'run_full_pipeline.py');

  execFile(PYTHON_CMD, [scriptPath], (error, stdout, stderr) => {
    const latestData = getLatestFundamentals();

    if (error) {
      console.warn('Python sync execution note:', stderr || error.message);
      return res.json({
        success: true,
        message: 'Hệ thống đang hoạt động trên dữ liệu đồng bộ định kỳ mới nhất. Để cập nhật dữ liệu thị trường mới, vui lòng thông báo cho người quản lý.',
        data: latestData,
        note: 'Đã nạp bộ nhớ cache cục bộ'
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

  const filePath = path.join(FINANCIALS_DIR, `${sym}.json`);

  const readLocalData = () => {
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
    return { finData, fundData };
  };

  const isServerlessOrNoPython = Boolean(
    process.env.VERCEL ||
    process.env.NOW_REGION ||
    !fs.existsSync(VENV_PYTHON)
  );

  // Nếu môi trường không thể chạy Python hoặc là môi trường read-only
  if (isServerlessOrNoPython) {
    const { finData, fundData } = readLocalData();
    if (finData) {
      return res.json({
        success: true,
        message: `Đã nạp dữ liệu phân tích và BCTC cho mã ${sym} từ kho lưu trữ của hệ thống!`,
        symbol: sym,
        fundamentals: fundData,
        data: finData
      });
    }

    queueRequestedStock(sym).catch(() => {});

    return res.status(202).json({
      success: false,
      isQueued: true,
      message: `Mã ${sym} đã được ghi nhận vào hàng đợi yêu cầu dữ liệu. Hệ thống sẽ tự động thu thập BCTC và định giá trong phiên đồng bộ EOD lúc 18:00 tiếp theo!`,
      symbol: sym
    });
  }

  const syncScript = path.join(ROOT_DIR, 'scripts', 'sync_fundamentals.py');
  const reportScript = path.join(ROOT_DIR, 'scripts', 'fetch_financial_reports.py');

  // Bước 1: Đồng bộ chỉ số cơ bản & định giá từ TradingView cho mã này
  execFile(PYTHON_CMD, [syncScript, '--symbols', sym], (err1, out1, errOut1) => {
    // Bước 2: Đồng bộ BCTC toàn diện (8Q, 5Y, 54 Ratios, Cổ tức, Cổ đông)
    execFile(PYTHON_CMD, [reportScript, '--symbols', sym], (err2, out2, errOut2) => {
      const { finData, fundData } = readLocalData();

      if (!finData) {
        queueRequestedStock(sym).catch(() => {});
        return res.status(202).json({
          success: false,
          isQueued: true,
          message: `Mã ${sym} đã được ghi nhận vào hàng đợi yêu cầu dữ liệu. Hệ thống sẽ tự động thu thập BCTC và định giá trong phiên đồng bộ EOD tiếp theo!`,
          symbol: sym
        });
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

/**
 * 7. GET /api/valuation/requested-stocks
 * Lấy danh sách các mã cổ phiếu trong hàng đợi yêu cầu (chuẩn 5 trường)
 */
router.get('/valuation/requested-stocks', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT symbol, requested_at, status, synced_at, error_message
      FROM requested_stocks
      ORDER BY requested_at DESC;
    `);
    const rows = result.rows || [];
    return res.json({
      total: rows.length,
      requested_stocks: rows
    });
  } catch (err) {
    // Fallback đọc từ file JSON nếu DB tạm thời chưa sẵn sàng
    if (fs.existsSync(REQUESTED_STOCKS_FILE)) {
      try {
        const raw = JSON.parse(fs.readFileSync(REQUESTED_STOCKS_FILE, 'utf-8'));
        const list = Object.values(raw);
        return res.json({ total: list.length, requested_stocks: list });
      } catch {
        // ignore
      }
    }
    return res.json({ total: 0, requested_stocks: [] });
  }
});

/**
 * 8. POST /api/valuation/ai-refresh/:symbol
 * Kích hoạt cập nhật AI tích hợp riêng cho 1 mã cổ phiếu cụ thể (On-Demand Single Stock Refresh)
 */
router.post('/valuation/ai-refresh/:symbol', (req, res) => {
  const sym = (req.params.symbol || '').trim().toUpperCase();
  if (!sym) {
    return res.status(400).json({ error: 'Thiếu mã cổ phiếu' });
  }

  const filePath = path.join(FINANCIALS_DIR, `${sym}.json`);
  const isServerlessOrNoPython = Boolean(
    process.env.VERCEL ||
    process.env.NOW_REGION ||
    !fs.existsSync(VENV_PYTHON)
  );

  if (isServerlessOrNoPython) {
    if (fs.existsSync(filePath)) {
      try {
        const finData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return res.json({
          success: true,
          message: `Dữ liệu phân tích AI cho mã ${sym} đã sẵn sàng từ kho lưu trữ.`,
          symbol: sym,
          data: finData
        });
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    }
    return res.status(404).json({ error: `Chưa có dữ liệu cho mã ${sym}` });
  }

  const aiScript = path.join(ROOT_DIR, 'scripts', 'generate_ai_insights.py');
  execFile(PYTHON_CMD, [aiScript, '--scope', 'stocks', '--symbols', sym, '--force'], (err, stdout, stderr) => {
    if (err) {
      console.warn(`Lỗi chạy AI refresh cho ${sym}:`, stderr || err.message);
    }
    if (fs.existsSync(filePath)) {
      try {
        const finData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return res.json({
          success: true,
          message: `Đã làm mới phân tích AI tích hợp cho mã ${sym}!`,
          symbol: sym,
          data: finData
        });
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    }
    return res.status(404).json({ error: `Không tìm thấy file BCTC sau khi chạy AI cho ${sym}` });
  });
});

/**
 * 9. GET /api/portfolio/ai-stress-test
 * Đọc báo cáo sức khỏe danh mục & mô phỏng chịu tải vĩ mô theo người dùng (0ms)
 */
router.get('/portfolio/ai-stress-test', async (req, res) => {
  try {
    const userId = req.user?.id || req.query?.userId || 'demo';

    // 1. Đọc từ Tầng 1: ACID Database portfolio_ai_insights theo user_id
    const dbInsight = await getPortfolioAiInsight(userId);
    if (dbInsight) {
      return res.json(dbInsight);
    }

    // 2. Fallback nếu là tài khoản demo và có file local
    if (userId === 'demo' && fs.existsSync(PORTFOLIO_AI_FILE)) {
      const raw = fs.readFileSync(PORTFOLIO_AI_FILE, 'utf-8');
      return res.json(JSON.parse(raw));
    }

    // 3. Fallback mặc định
    return res.json({
      healthScore: 'Chưa có dữ liệu',
      healthVerdict: 'Chưa có báo cáo sức khỏe danh mục. Vui lòng bấm Làm Mới để phân tích.',
      summary: '',
      portfolioBeta: 1.0,
      cashWeightPct: 0.0,
      macroSensitivity: {
        interestRateRisk: 'Chưa phân tích',
        fxRisk: 'Chưa phân tích',
        cyclicalRisk: 'Chưa phân tích'
      },
      stressTestScenarios: [],
      rebalancingRecommendations: [],
      updatedAt: null
    });
  } catch (err) {
    console.error('Lỗi đọc portfolio AI stress-test:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 10. POST /api/portfolio/ai-stress-test/refresh
 * Kích hoạt sinh lại báo cáo sức khỏe danh mục on-demand theo người dùng
 */
router.post('/portfolio/ai-stress-test/refresh', (req, res) => {
  const userId = req.user?.id || req.body?.userId || req.query?.userId || 'demo';
  const isServerlessOrNoPython = Boolean(
    process.env.VERCEL ||
    process.env.NOW_REGION ||
    !fs.existsSync(VENV_PYTHON)
  );

  if (isServerlessOrNoPython) {
    getPortfolioAiInsight(userId).then((insight) => {
      if (insight) {
        return res.json({
          success: true,
          message: 'Dữ liệu phân tích danh mục định kỳ sẵn sàng từ database.',
          data: insight
        });
      }
      if (userId === 'demo' && fs.existsSync(PORTFOLIO_AI_FILE)) {
        try {
          const raw = fs.readFileSync(PORTFOLIO_AI_FILE, 'utf-8');
          return res.json({
            success: true,
            message: 'Dữ liệu phân tích danh mục định kỳ sẵn sàng từ kho lưu trữ.',
            data: JSON.parse(raw)
          });
        } catch (e) {
          return res.status(500).json({ error: e.message });
        }
      }
      return res.json({ success: true, message: 'Dữ liệu đang được đồng bộ định kỳ.' });
    }).catch((err) => res.status(500).json({ error: err.message }));
    return;
  }

  const aiScript = path.join(ROOT_DIR, 'scripts', 'generate_ai_insights.py');
  execFile(PYTHON_CMD, [aiScript, '--scope', 'portfolio', '--user-id', userId, '--force'], async (err, stdout, stderr) => {
    if (err) {
      console.warn('Lỗi chạy portfolio AI refresh:', stderr || err.message);
    }
    try {
      const updated = await getPortfolioAiInsight(userId);
      if (updated) {
        return res.json({
          success: true,
          message: 'Đã hoàn tất đánh giá sức khỏe danh mục & mô phỏng chịu tải!',
          data: updated
        });
      }
      if (userId === 'demo' && fs.existsSync(PORTFOLIO_AI_FILE)) {
        const raw = fs.readFileSync(PORTFOLIO_AI_FILE, 'utf-8');
        return res.json({
          success: true,
          message: 'Đã hoàn tất đánh giá sức khỏe danh mục & mô phỏng chịu tải!',
          data: JSON.parse(raw)
        });
      }
      return res.status(500).json({ error: 'Không thể tạo báo cáo danh mục' });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  });
});

export default router;

