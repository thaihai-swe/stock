import fs from 'fs';
import { DATA_DIR, DATA_FILE, PRICES_CACHE_FILE, FUNDAMENTALS_CACHE_FILE, SUPPORTED_STOCKS_FILE } from '../config/constants.js';

export function readData() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initial = {
      buyOrders: [],
      sellOrders: [],
      watchlist: [],
      dividends: [],
      goal: null,
      settings: {},
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.buyOrders)) data.buyOrders = [];
    if (!Array.isArray(data.sellOrders)) data.sellOrders = [];
    if (!Array.isArray(data.watchlist)) data.watchlist = [];
    if (!Array.isArray(data.dividends)) data.dividends = [];
    if (data.goal === undefined) data.goal = null;
    if (!data.settings) data.settings = {};
    return data;
  } catch {
    return {
      buyOrders: [],
      sellOrders: [],
      watchlist: [],
      dividends: [],
      goal: null,
      settings: {},
    };
  }
}

export function writeData(data) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function loadPriceCache() {
  if (fs.existsSync(PRICES_CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PRICES_CACHE_FILE, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

export function savePriceCache(cache) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(PRICES_CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (e) {
    // Không làm gián đoạn server nếu ở môi trường Read-only
  }
}

export function loadFundamentalsCache() {
  if (fs.existsSync(FUNDAMENTALS_CACHE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(FUNDAMENTALS_CACHE_FILE, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

export function saveFundamentalsCache(cache) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(FUNDAMENTALS_CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (e) {
    // Không làm gián đoạn server nếu ở môi trường Read-only
  }
}

export function loadSupportedStocks() {
  let symbols = [];
  if (fs.existsSync(SUPPORTED_STOCKS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(SUPPORTED_STOCKS_FILE, 'utf-8'));
      symbols = Array.isArray(data) ? data : (data.symbols || []);
    } catch {
      symbols = [];
    }
  }

  // Lấy thông tin đồng bộ mới nhất từ cache
  const cache = loadFundamentalsCache();
  const validKeys = Object.keys(cache).filter(k => !k.startsWith('_'));
  let lastSyncedAt = cache._meta?.lastSyncedAt || null;
  if (!lastSyncedAt && validKeys.length > 0) {
    const latest = Math.max(...validKeys.map(k => cache[k]?.updatedAt || 0).filter(Boolean));
    if (latest > 0) lastSyncedAt = new Date(latest).toISOString();
  }

  return {
    symbols: [...new Set(symbols.map(s => (s || '').trim().toUpperCase()).filter(Boolean))],
    syncedCount: validKeys.length,
    lastSyncedAt,
    isReadOnly: true
  };
}

export function saveSupportedStocks(config) {
  // Khoá không cho ghi đè - file supported_stocks.json do Developer quản lý trong source code
  console.warn('⚠️ supported_stocks.json được quản lý trong source code, bỏ qua yêu cầu ghi đè.');
}
