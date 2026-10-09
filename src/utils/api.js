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
};

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

async function request(path, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

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
  return data;
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

// Tiền mặt & Chỉ số thị trường
export const updateCashBalance = (cashBalance) =>
  request('/cash-balance', { method: 'POST', body: JSON.stringify({ cashBalance }) });
export const fetchMarketIndex = (force = false) =>
  request(`/market-index?force=${force ? 'true' : 'false'}`);





