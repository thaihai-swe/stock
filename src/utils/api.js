const BASE = '/api';
const TOKEN_KEY = 'stock_auth_token';

export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY) || 'demo';
};

export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
  invalidateApiCache(); // Xóa sạch RAM cache ngay khi chuyển đổi tài khoản
};

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  invalidateApiCache(); // Xóa sạch RAM cache ngay khi đăng xuất
};

const MAX_CACHE_ENTRIES = 100;
const apiCache = new Map();
const inFlightRequests = new Map();

/**
 * Xóa cache API theo mẫu hoặc toàn bộ
 * @param {string} [pattern] - Chuỗi tìm kiếm key cần xóa. Nếu rỗng, xóa toàn bộ.
 */
export const invalidateApiCache = (pattern = '') => {
  if (!pattern) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.includes(pattern)) {
      apiCache.delete(key);
    }
  }
};

/**
 * Xác định thời gian sống (TTL - ms) cho từng endpoint
 */
function getEndpointTTL(path) {
  if (path.startsWith('/prices')) return 15000;              // 15s thị giá sàn
  if (path.startsWith('/data')) return 10000;                // 10s sổ lệnh & danh mục
  if (path.startsWith('/cash-balance')) return 15000;        // 15s số dư tiền mặt
  if (path.startsWith('/fundamentals')) return 60000;        // 60s chỉ số cơ bản
  if (path.startsWith('/valuation/macro')) return 60000;     // 60s vĩ mô & chu kỳ
  if (path.startsWith('/valuation/macro-indicators')) return 120000; // 2 phút 95 chỉ số TE
  if (path.startsWith('/valuation/financials')) return 120000; // 2 phút BCTC chi tiết
  if (path.startsWith('/valuation/stocks')) return 60000;    // 60s danh sách mã định giá
  if (path.startsWith('/valuation/raw-json')) return 60000;  // 60s raw json
  if (path.startsWith('/market-index')) return 30000;        // 30s chỉ số VN-Index
  if (path.startsWith('/watchlist')) return 30000;           // 30s danh mục theo dõi
  if (path.startsWith('/auth/me')) return 60000;             // 60s phiên đăng nhập
  return 15000;                                              // Mặc định 15s cho GET
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';
  const isForce = path.includes('force=true');
  const cacheKey = `${token}:${path}`;

  // 1. Kiểm tra Cache trong bộ nhớ cho lời gọi GET (trừ khi có cờ force=true)
  if (isGet && !isForce) {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
  }

  // 2. Chống gọi trùng lặp (In-Flight Request Deduplication)
  if (isGet && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`${BASE}${path}`, {
        ...options,
        headers,
      });
      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok) throw new Error(data.error || `Lỗi máy chủ (${res.status} ${res.statusText})`);

      // 3. Lưu vào Cache nếu là GET thành công
      if (isGet) {
        // Tự động thu hồi bộ nhớ (Memory Hygiene): Dọn key hết hạn hoặc key cũ nhất nếu đạt ngưỡng 100 entries
        if (apiCache.size >= MAX_CACHE_ENTRIES) {
          const now = Date.now();
          for (const [k, v] of apiCache.entries()) {
            if (now >= v.expiresAt) apiCache.delete(k);
          }
          if (apiCache.size >= MAX_CACHE_ENTRIES) {
            const oldestKey = apiCache.keys().next().value;
            if (oldestKey) apiCache.delete(oldestKey);
          }
        }

        const ttl = getEndpointTTL(path);
        apiCache.set(cacheKey, {
          data,
          expiresAt: Date.now() + ttl,
        });
      } else {
        // 4. Nếu là thao tác GHI (POST/DELETE/PUT), tự động dọn dẹp cache liên quan
        if (path.startsWith('/buy') || path.startsWith('/sell')) {
          invalidateApiCache('/data');
          invalidateApiCache('/prices');
          invalidateApiCache('/cash-balance');
        } else if (path.startsWith('/dividends')) {
          invalidateApiCache('/data');
          invalidateApiCache('/dividends');
        } else if (path.startsWith('/cash-balance')) {
          invalidateApiCache('/data');
          invalidateApiCache('/cash-balance');
        } else if (path.startsWith('/watchlist')) {
          invalidateApiCache('/watchlist');
          invalidateApiCache('/data');
        } else if (path.startsWith('/restore') || path.startsWith('/user-data')) {
          apiCache.clear();
        } else if (path.includes('sync')) {
          invalidateApiCache('/fundamentals');
          invalidateApiCache('/valuation');
          invalidateApiCache('/prices');
        }
      }

      return data;
    } finally {
      if (isGet) {
        inFlightRequests.delete(cacheKey);
      }
    }
  })();

  if (isGet) {
    inFlightRequests.set(cacheKey, fetchPromise);
  }

  return fetchPromise;
}

export const fetchData       = ()        => request('/data');
export const addBuyOrder     = (body)    => request('/buy',      { method: 'POST', body: JSON.stringify(body) });
export const addSellOrder    = (body)    => request('/sell',     { method: 'POST', body: JSON.stringify(body) });
export const deleteBuy       = (id)      => request(`/buy/${id}`,  { method: 'DELETE' });
export const deleteSell      = (id)      => request(`/sell/${id}`, { method: 'DELETE' });

export const fetchWatchlist  = ()        => request('/watchlist');
export const addWatchlist    = (body)    => request('/watchlist', { method: 'POST', body: JSON.stringify(body) });
export const deleteWatchlist = (id)      => request(`/watchlist/${id}`, { method: 'DELETE' });

export const fetchPrices     = (symbols = [], force = false) =>
  request(`/prices?symbols=${encodeURIComponent(symbols.join(','))}&force=${force ? 'true' : 'false'}`);

export const fetchDividends  = ()        => request('/dividends');
export const addDividend    = (body)    => request('/dividends', { method: 'POST', body: JSON.stringify(body) });
export const deleteDividend = (id)      => request(`/dividends/${id}`, { method: 'DELETE' });

export const fetchBackup     = ()        => request('/backup');
export const restoreData     = (body)    => request('/restore',  { method: 'POST', body: JSON.stringify(body) });
export const clearUserData   = ()        => request('/user-data', { method: 'DELETE' });

// Auth APIs
export const fetchCurrentUser = ()       => request('/auth/me');
export const loginGoogle      = (token)   => request('/auth/google', { method: 'POST', body: JSON.stringify({ token }) });
export const cloneDemoData    = ()       => request('/auth/clone-demo', { method: 'POST' });
export const fetchHealth      = ()       => request('/health');
export const fetchFundamentals = (symbols = [], force = false) =>
  request(`/fundamentals?symbols=${encodeURIComponent(symbols.join(','))}&force=${force ? 'true' : 'false'}`);
export const fetchSupportedStocks = () => request('/fundamentals/supported-stocks');
export const updateSupportedStocks = (body) => request('/fundamentals/supported-stocks', { method: 'POST', body: JSON.stringify(body) });
export const triggerFundamentalsSync = () => request('/fundamentals/sync', { method: 'POST' });

// Quản lý số dư tiền mặt & thị trường
export const fetchCashBalance  = ()       => request('/cash-balance');
export const updateCashBalance = (cashBalance) =>
  request('/cash-balance', { method: 'POST', body: JSON.stringify({ cashBalance }) });
export const fetchMarketIndex = (force = false) =>
  request(`/market-index?force=${force ? 'true' : 'false'}`);

// Valuation & Local JSON APIs
export const fetchValuationStocks = () => request('/valuation/stocks');
export const fetchValuationMacro  = () => request('/valuation/macro');
export const fetchMacroConfig     = () => request('/valuation/macro/config');
export const fetchMacroIndicators = () => request('/valuation/macro-indicators');
export const fetchStockFinancials = (symbol) => request(`/valuation/financials/${encodeURIComponent(symbol)}`);
export const fetchRawJson         = (type, symbol = '') => request(`/valuation/raw-json/${type}?symbol=${encodeURIComponent(symbol)}`);
export const triggerValuationSync = () => request('/valuation/sync', { method: 'POST' });
export const triggerSingleFinancialSync = (symbol) => request(`/valuation/sync-single/${encodeURIComponent(symbol)}`, { method: 'POST' });

// DNSE OHLC Realtime & Historical Market Index (với fallback trực tiếp tới DNSE API)
export const fetchDnseOhlc = async ({ symbol = 'VNINDEX', resolution = '1D', from = '', to = '' } = {}) => {
  const q = new URLSearchParams();
  if (symbol) q.set('symbol', symbol);
  if (resolution) q.set('resolution', resolution);
  if (from) q.set('from', from);
  if (to) q.set('to', to);

  try {
    const res = await request(`/valuation/dnse-ohlc?${q.toString()}`);
    if (res && res.data && res.data.t && res.data.t.length > 0) {
      return res;
    }
  } catch {
    // Dự phòng gọi trực tiếp DNSE API
  }

  // Fallback: Gọi trực tiếp tới máy chủ DNSE (hỗ trợ CORS mở)
  const INDEX_SYMBOLS = ['VNINDEX', 'VN30', 'VN100', 'VNXALLSHARE', 'VNDIVIDEND', 'VNMITECH', 'VN50GROWTH'];
  let type = 'stock';
  if (INDEX_SYMBOLS.includes(symbol)) {
    type = 'index';
  } else if (symbol.startsWith('VN30F')) {
    type = 'derivative';
  }

  const directUrl = new URL(`https://api.dnse.com.vn/chart-api/v2/ohlcs/${type}`);
  directUrl.searchParams.set('symbol', symbol);
  directUrl.searchParams.set('resolution', resolution);
  if (from) directUrl.searchParams.set('from', from);
  if (to) directUrl.searchParams.set('to', to);

  const directRes = await fetch(directUrl.toString(), {
    headers: { 'Accept': 'application/json' }
  });
  const json = await directRes.json();
  const c = json.c || [];
  const n = c.length;
  const currentPrice = n > 0 ? c[n - 1] : null;
  const prevPrice = n > 1 ? c[n - 2] : currentPrice;
  const change = (currentPrice != null && prevPrice != null) ? +(currentPrice - prevPrice).toFixed(2) : 0;
  const changePercent = (prevPrice && prevPrice > 0) ? +((change / prevPrice) * 100).toFixed(2) : 0;

  return {
    symbol,
    type,
    resolution,
    count: n,
    summary: {
      current: currentPrice,
      prevClose: prevPrice,
      change,
      changePercent,
    },
    data: json,
  };
};

// Chuỗi Lịch Sử Định Giá Thị Trường (Google Sheets Simply Wall St với fallback sang macro)
export const fetchMarketValuationHistory = async () => {
  try {
    const res = await request('/valuation/market-history');
    if (res && res.periods && Object.keys(res.periods).length > 0) {
      return res;
    }
  } catch {
    // Dự phòng fallback sang cache nhúng trong macro_valuation.json
  }

  const macro = await fetchValuationMacro().catch(() => null);
  if (macro?.marketValuationHistory && Object.keys(macro.marketValuationHistory.periods || {}).length > 0) {
    return macro.marketValuationHistory;
  }
  return { _meta: {}, metrics: [], periods: {} };
};
