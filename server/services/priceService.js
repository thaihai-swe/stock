import { IN_SESSION_TTL_MS } from '../config/constants.js';
import { loadPriceCache, savePriceCache } from '../storage/jsonStore.js';
import { getMarketSessionInfo } from './marketSession.js';

let memoryPriceCache = loadPriceCache();

export async function getStockPrice(symbol, force = false) {
  const sym = symbol.trim().toUpperCase();
  const now = Date.now();
  const session = getMarketSessionInfo();
  const cached = memoryPriceCache[sym];

  // Nếu không ép buộc làm mới (force = false):
  if (!force && cached) {
    // Ngoài giờ giao dịch hoặc cuối tuần: giá không đổi, trả ngay giá chốt phiên
    if (!session.isOpen) {
      return cached;
    }
    // Trong phiên: nếu cache còn dưới 60s, dùng lại cache
    if (now - (cached.updatedAt || 0) < IN_SESSION_TTL_MS) {
      return cached;
    }
  }

  // Fetch từ DNSE Entrade API
  const nowSec = Math.floor(now / 1000);
  const fromSec = nowSec - 86400 * 14;
  const url = `https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?from=${fromSec}&to=${nowSec}&symbol=${sym}&resolution=1D`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Lỗi kết nối API giá (${res.status})`);
  const data = await res.json();

  if (data && data.c && data.c.length > 0) {
    const last = data.c[data.c.length - 1]; // x1.000đ
    const prev = data.c[data.c.length - 2] || last;
    const price = Math.round(last * 1000);
    const change = Math.round((last - prev) * 1000);
    const changePct = prev ? parseFloat((((last - prev) / prev) * 100).toFixed(2)) : 0;

    const record = {
      symbol: sym,
      price,
      rawPrice: last,
      prevPrice: Math.round(prev * 1000),
      change,
      changePct,
      updatedAt: now,
      source: 'DNSE',
    };

    memoryPriceCache[sym] = record;
    savePriceCache(memoryPriceCache);
    return record;
  }

  throw new Error(`Không tìm thấy dữ liệu giá cho mã ${sym}`);
}

export async function getMultipleStockPrices(symbols = [], force = false) {
  const session = getMarketSessionInfo();
  if (symbols.length === 0) {
    return { session, prices: {} };
  }

  const prices = {};
  await Promise.all(
    symbols.map(async (s) => {
      try {
        prices[s] = await getStockPrice(s, force);
      } catch (err) {
        prices[s] = {
          symbol: s,
          error: err.message,
          price: memoryPriceCache[s]?.price || null,
          rawPrice: memoryPriceCache[s]?.rawPrice || null,
          change: memoryPriceCache[s]?.change || 0,
          changePct: memoryPriceCache[s]?.changePct || 0,
        };
      }
    })
  );

  return { session, prices };
}
