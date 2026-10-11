/**
 * Tiện ích điều hướng & Đồng bộ trạng thái URL (Two-Way URL Routing)
 * Quản lý lịch sử trình duyệt (HTML5 History API) không cần phụ thuộc thư viện bên ngoài.
 */

export const VALID_TABS = [
  'dashboard',
  'trade',
  'history',
  'valuation',
  'macro',
  'dca',
  'strategy',
  'watchlist',
  'settings',
];

const ALIAS_TABS = {
  buy: { tab: 'trade', tradeType: 'buy' },
  sell: { tab: 'trade', tradeType: 'sell' },
  dividend: { tab: 'trade', tradeType: 'dividend' },
};

/**
 * Phân tích URL hiện tại (Pathname, Query Params, Hash) để lấy thông tin Tab và Tham số
 * @returns {{ tab: string, symbol: string, tradeType: string }}
 */
export function parseUrlRoute() {
  if (typeof window === 'undefined') {
    return { tab: 'dashboard', symbol: '', tradeType: 'buy' };
  }

  const { pathname, search, hash } = window.location;
  const searchParams = new URLSearchParams(search);

  let tab = 'dashboard';
  let symbol = searchParams.get('symbol') || searchParams.get('stock') || searchParams.get('s') || '';
  let tradeType = searchParams.get('type') || 'buy';

  // 1. Kiểm tra Query Param ?tab=...
  const tabParam = (searchParams.get('tab') || '').toLowerCase();
  if (tabParam) {
    if (ALIAS_TABS[tabParam]) {
      tab = ALIAS_TABS[tabParam].tab;
      tradeType = ALIAS_TABS[tabParam].tradeType;
    } else if (VALID_TABS.includes(tabParam)) {
      tab = tabParam;
    }
  }

  // 2. Nếu chưa có tab từ query param, kiểm tra Pathname (vd: /valuation, /macro, /valuation/HPG)
  if (tab === 'dashboard' && pathname && pathname !== '/') {
    const segments = pathname.replace(/^\/+|\/+$/g, '').split('/');
    const firstSegment = (segments[0] || '').toLowerCase();

    if (ALIAS_TABS[firstSegment]) {
      tab = ALIAS_TABS[firstSegment].tab;
      tradeType = ALIAS_TABS[firstSegment].tradeType;
      if (segments[1] && !symbol) {
        symbol = segments[1].toUpperCase();
      }
    } else if (VALID_TABS.includes(firstSegment)) {
      tab = firstSegment;
      if (segments[1] && !symbol) {
        symbol = segments[1].toUpperCase();
      }
    }
  }

  // 3. Nếu vẫn là dashboard, kiểm tra Hash (vd: #valuation hoặc #/valuation?symbol=HPG)
  if (tab === 'dashboard' && hash && hash.length > 1) {
    const rawHash = hash.replace(/^#\/?/, '');
    const [hashPath, hashQuery] = rawHash.split('?');
    const hashFirst = (hashPath || '').split('/')[0].toLowerCase();

    if (ALIAS_TABS[hashFirst]) {
      tab = ALIAS_TABS[hashFirst].tab;
      tradeType = ALIAS_TABS[hashFirst].tradeType;
    } else if (VALID_TABS.includes(hashFirst)) {
      tab = hashFirst;
    }

    if (hashQuery) {
      const hashParams = new URLSearchParams(hashQuery);
      if (!symbol) symbol = hashParams.get('symbol') || hashParams.get('s') || '';
      if (hashParams.get('type')) tradeType = hashParams.get('type');
    }
  }

  return {
    tab,
    symbol: symbol.toUpperCase(),
    tradeType: ['buy', 'sell', 'dividend'].includes(tradeType) ? tradeType : 'buy',
  };
}

/**
 * Tạo URL chuẩn hóa (Canonical URL) từ Tab và tham số
 * @param {string} tab - Tên tab
 * @param {object} [params] - Các tham số bổ sung (symbol, type...)
 * @returns {string} URL string
 */
export function formatRouteUrl(tab, params = {}) {
  const query = new URLSearchParams();

  if (params.symbol) {
    query.set('symbol', params.symbol.toUpperCase());
  }

  if (tab === 'trade' && params.tradeType && params.tradeType !== 'buy') {
    query.set('type', params.tradeType);
  }

  const queryString = query.toString();
  const queryPart = queryString ? `?${queryString}` : '';

  if (tab === 'dashboard') {
    return `/${queryPart}`;
  }

  return `/${tab}${queryPart}`;
}

/**
 * Đồng bộ hóa trạng thái tab hiện tại vào thanh địa chỉ URL của trình duyệt
 * Sử dụng HTML5 History API để không làm tải lại trang
 * @param {string} tab - Tab cần chuyển tới
 * @param {object} [params] - Tham số kèm theo
 * @param {boolean} [replace=false] - Dùng replaceState thay vì pushState
 */
export function syncUrlRoute(tab, params = {}, replace = false) {
  if (typeof window === 'undefined' || !window.history) return;

  const targetUrl = formatRouteUrl(tab, params);
  const currentUrl = `${window.location.pathname}${window.location.search}`;

  // Tránh ghi lặp lại URL giống hệt nhau vào lịch sử trình duyệt
  if (currentUrl === targetUrl) return;

  const state = { tab, ...params };
  try {
    if (replace) {
      window.history.replaceState(state, '', targetUrl);
    } else {
      window.history.pushState(state, '', targetUrl);
    }
  } catch (err) {
    console.warn('Không thể đồng bộ URL qua History API:', err);
  }
}
