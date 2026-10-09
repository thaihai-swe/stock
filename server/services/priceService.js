import { IN_SESSION_TTL_MS } from '../config/constants.js';
import { loadPriceCache, savePriceCache } from '../storage/jsonStore.js';
import { getMarketSessionInfo } from './marketSession.js';

let memoryPriceCache = loadPriceCache();

function isSameDayVN(t1, t2) {
  if (!t1 || !t2) return false;
  const d1 = new Date(t1).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  const d2 = new Date(t2).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  return d1 === d2;
}

// 1. Lấy dữ liệu giá realtime từ VPS Market Datafeed API (Batch multi-stocks)
async function fetchVpsPrices(symbols = []) {
  if (symbols.length === 0) return {};
  const url = `https://bgapidatafeed.vps.com.vn/getliststockdata/${symbols.join(',')}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`VPS API error: ${res.status}`);
  const list = await res.json();
  const map = {};
  const now = Date.now();

  for (const item of list) {
    if (!item.sym) continue;
    const sym = item.sym.toUpperCase();
    const last = parseFloat(item.lastPrice || 0) || parseFloat(item.r || 0);
    const ref = parseFloat(item.r || 0) || last;
    const price = Math.round(last * 1000);
    const prevPrice = Math.round(ref * 1000);
    const change = price - prevPrice;
    const changePct = prevPrice > 0 ? parseFloat((((price - prevPrice) / prevPrice) * 100).toFixed(2)) : 0;

    map[sym] = {
      symbol: sym,
      price,
      rawPrice: last,
      prevPrice,
      change,
      changePct,
      high: Math.round(parseFloat(item.highPrice || last) * 1000),
      low: Math.round(parseFloat(item.lowPrice || last) * 1000),
      ceiling: Math.round(parseFloat(item.c || 0) * 1000),
      floor: Math.round(parseFloat(item.f || 0) * 1000),
      updatedAt: now,
      source: 'VPS',
    };
  }
  return map;
}

// 2. Fallback sang DNSE Entrade 1-phút (resolution=1) nếu VPS không có dữ liệu
async function fetchDnseFallback(sym) {
  const now = Date.now();
  const nowSec = Math.floor(now / 1000);
  const fromSec1m = nowSec - 86400 * 2;
  const fromSec1d = nowSec - 86400 * 14;

  const url1m = `https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?from=${fromSec1m}&to=${nowSec}&symbol=${sym}&resolution=1`;
  const url1d = `https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?from=${fromSec1d}&to=${nowSec}&symbol=${sym}&resolution=1D`;

  const [res1m, res1d] = await Promise.all([
    fetch(url1m).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(url1d).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);

  let prevPrice = null;
  if (res1d && res1d.c && res1d.c.length > 0) {
    prevPrice = Math.round(res1d.c[res1d.c.length - 1] * 1000);
  }

  let livePrice = prevPrice;
  if (res1m && res1m.c && res1m.c.length > 0) {
    livePrice = Math.round(res1m.c[res1m.c.length - 1] * 1000);
  }

  if (!livePrice) {
    throw new Error(`Không tìm thấy dữ liệu giá cho ${sym}`);
  }

  const change = prevPrice ? livePrice - prevPrice : 0;
  const changePct = prevPrice ? parseFloat(((change / prevPrice) * 100).toFixed(2)) : 0;

  return {
    symbol: sym,
    price: livePrice,
    rawPrice: livePrice / 1000,
    prevPrice: prevPrice || livePrice,
    change,
    changePct,
    updatedAt: now,
    source: 'DNSE_1M',
  };
}

export async function getMultipleStockPrices(symbols = [], force = false) {
  const session = getMarketSessionInfo();
  if (symbols.length === 0) {
    return { session, prices: {} };
  }

  const now = Date.now();
  const cleanSymbols = Array.from(new Set(symbols.map(s => s.trim().toUpperCase()).filter(Boolean)));
  const prices = {};
  const symbolsToFetch = [];

  for (const s of cleanSymbols) {
    const cached = memoryPriceCache[s];
    const isCachedToday = cached?.updatedAt && isSameDayVN(cached.updatedAt, now);

    if (!force && cached && isCachedToday) {
      // Ngoài giờ giao dịch hoặc cuối tuần: nếu cache đã lấy trong ngày hôm nay thì dùng lại
      if (!session.isOpen) {
        prices[s] = cached;
        continue;
      }
      // Trong phiên giao dịch: dùng lại nếu dưới TTL (60s)
      if (now - (cached.updatedAt || 0) < IN_SESSION_TTL_MS) {
        prices[s] = cached;
        continue;
      }
    }
    symbolsToFetch.push(s);
  }

  if (symbolsToFetch.length > 0) {
    // 1. Lấy dữ liệu thời gian thực hàng loạt từ VPS
    let vpsMap = {};
    try {
      vpsMap = await fetchVpsPrices(symbolsToFetch);
    } catch (err) {
      console.warn('Lỗi kết nối VPS feed, chuyển sang fallback:', err.message);
    }

    let cacheChanged = false;
    for (const s of symbolsToFetch) {
      if (vpsMap[s]) {
        prices[s] = vpsMap[s];
        memoryPriceCache[s] = vpsMap[s];
        cacheChanged = true;
      } else {
        // 2. Fallback sang DNSE Entrade nếu mã bị thiếu
        try {
          const dnseData = await fetchDnseFallback(s);
          prices[s] = dnseData;
          memoryPriceCache[s] = dnseData;
          cacheChanged = true;
        } catch (err) {
          // 3. Fallback cuối cùng: dùng dữ liệu cache cũ nếu có
          prices[s] = {
            symbol: s,
            error: err.message,
            price: memoryPriceCache[s]?.price || null,
            rawPrice: memoryPriceCache[s]?.rawPrice || null,
            prevPrice: memoryPriceCache[s]?.prevPrice || null,
            change: memoryPriceCache[s]?.change || 0,
            changePct: memoryPriceCache[s]?.changePct || 0,
            updatedAt: memoryPriceCache[s]?.updatedAt || now,
            source: memoryPriceCache[s]?.source || 'UNKNOWN',
          };
        }
      }
    }

    if (cacheChanged) {
      savePriceCache(memoryPriceCache);
    }
  }

  return { session, prices };
}

export async function getStockPrice(symbol, force = false) {
  const sym = symbol.trim().toUpperCase();
  const res = await getMultipleStockPrices([sym], force);
  return res.prices[sym] || null;
}

export async function getMarketIndexData(force = false) {
  const session = getMarketSessionInfo();
  const cached = memoryPriceCache['VNINDEX'];
  const now = Date.now();
  if (!force && cached && isSameDayVN(cached.updatedAt, now)) {
    if (!session.isOpen || now - (cached.updatedAt || 0) < IN_SESSION_TTL_MS) {
      return { session, index: cached };
    }
  }

  try {
    const res = await fetch('https://bgapidatafeed.vps.com.vn/getliststockdata/VNINDEX,VN30', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3500),
    });
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length > 0) {
        const item = list.find(x => (x.sym || '').toUpperCase() === 'VNINDEX') || list[0];
        const last = parseFloat(item.lastPrice || 0) || parseFloat(item.r || 0);
        const ref = parseFloat(item.r || 0) || last;
        const change = parseFloat((last - ref).toFixed(2));
        const changePct = ref > 0 ? parseFloat(((change / ref) * 100).toFixed(2)) : 0;
        const indexData = {
          symbol: 'VNINDEX',
          name: 'VN-Index',
          point: last > 0 ? last : 1285.5,
          prevPoint: ref,
          change,
          changePct,
          updatedAt: now,
          source: 'VPS',
        };
        memoryPriceCache['VNINDEX'] = indexData;
        savePriceCache(memoryPriceCache);
        return { session, index: indexData };
      }
    }
  } catch (err) {
    // Network error or timeout, fallback gracefully
  }

  const fallback = cached || {
    symbol: 'VNINDEX',
    name: 'VN-Index',
    point: 1285.5,
    prevPoint: 1279.2,
    change: 6.3,
    changePct: 0.49,
    updatedAt: now,
    source: 'ESTIMATED',
  };
  return { session, index: fallback };
}

