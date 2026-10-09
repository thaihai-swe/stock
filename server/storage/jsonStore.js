import fs from 'fs';
import { DATA_DIR, DATA_FILE, PRICES_CACHE_FILE, FUNDAMENTALS_CACHE_FILE } from '../config/constants.js';

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
