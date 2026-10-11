import fs from 'fs';
import { DATA_DIR, DATA_FILE, PRICES_CACHE_FILE, FUNDAMENTALS_CACHE_FILE, SUPPORTED_STOCKS_FILE } from '../config/constants.js';

/**
 * NOTE: Nghiệp vụ sổ lệnh mua/bán, danh mục và cổ tức của người dùng đã được chuyển 100%
 * sang Relational Database (data/stock.db / Turso Cloud) thông qua sqliteStore.js.
 * File jsonStore.js hiện chỉ chịu trách nhiệm quản lý Ephemeral Cache (prices) và cấu hình mã.
 */


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
