import { Fragment, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import UserNav from './components/UserNav.jsx';
import { DashboardSkeleton, TabSkeleton } from './components/common/SkeletonLoader.jsx';
import { useTheme } from './context/ThemeContext.jsx';
import {
  clearAuthToken,
  cloneDemoData,
  fetchCurrentUser,
  fetchData,
  loginGoogle,
  setAuthToken,
} from './utils/api.js';
import { parseUrlRoute, syncUrlRoute } from './utils/navigation.js';

// Nạp lười (Code Splitting) các Tab nặng để tối ưu dung lượng Bundle ban đầu
const ValuationDashboard = lazy(() => import('./components/ValuationDashboard.jsx'));
const MacroDashboard = lazy(() => import('./components/MacroDashboard.jsx'));
const TransactionHistory = lazy(() => import('./components/TransactionHistory.jsx'));
const TradeOrderView = lazy(() => import('./components/TradeOrderView.jsx'));
const DcaPlannerView = lazy(() => import('./components/DcaPlannerView.jsx'));
const StrategyAnalytics = lazy(() => import('./components/StrategyAnalytics.jsx'));
const Watchlist = lazy(() => import('./components/Watchlist.jsx'));
const Settings = lazy(() => import('./components/Settings.jsx'));
const LoginModal = lazy(() => import('./components/LoginModal.jsx'));

// Hover Prefetching: Nạp trước chunk trong RAM/Cache khi người dùng di chuột qua tab
const prefetchTab = (tabId) => {
  switch (tabId) {
    case 'valuation': import('./components/ValuationDashboard.jsx'); break;
    case 'macro': import('./components/MacroDashboard.jsx'); break;
    case 'history': import('./components/TransactionHistory.jsx'); break;
    case 'trade': import('./components/TradeOrderView.jsx'); break;
    case 'dca': import('./components/DcaPlannerView.jsx'); break;
    case 'strategy': import('./components/StrategyAnalytics.jsx'); break;
    case 'watchlist': import('./components/Watchlist.jsx'); break;
    case 'settings': import('./components/Settings.jsx'); break;
    default: break;
  }
};

const TABS = [
  // Cụm 1: Quản Trị Danh Mục & Giao Dịch
  { id: 'dashboard', label: '📊 Dashboard', shortLabel: 'Tổng quan', icon: '📊', group: 'portfolio' },
  { id: 'trade', label: '⚡ Đặt Lệnh', shortLabel: 'Đặt Lệnh', icon: '⚡', group: 'portfolio' },
  { id: 'history', label: '📋 Lịch sử', shortLabel: 'Lịch sử', icon: '📋', group: 'portfolio' },

  // Cụm 2: Định Giá & Phân Tích Chuyên Sâu
  { id: 'valuation', label: '🏢 Định Giá Cổ Phiếu', shortLabel: 'Định Giá', icon: '🏢', group: 'research' },
  { id: 'macro', label: '🌐 Vĩ Mô & VN-Index', shortLabel: 'Vĩ Mô', icon: '🌐', group: 'research' },
  { id: 'dca', label: '🪜 Kế Hoạch DCA', shortLabel: 'DCA', icon: '🪜', group: 'research' },
  { id: 'strategy', label: '🎯 Chiến lược', shortLabel: 'Chiến lược', icon: '🎯', group: 'research' },

  // Cụm 3: Tiện Ích & Cấu Hình Hệ Thống
  { id: 'watchlist', label: '👁️ Theo dõi', shortLabel: 'Theo dõi', icon: '👁️', group: 'tools' },
  { id: 'settings', label: '⚙️ Cài đặt & Báo cáo', shortLabel: 'Cài đặt', icon: '⚙️', group: 'tools' },
];

const TAB_GROUPS = [
  {
    groupTitle: 'Quản Trị Danh Mục & Giao Dịch',
    items: [
      { id: 'dashboard', label: 'Tổng Quan (Dashboard)', icon: '📊', desc: 'Nắm giữ, lãi/lỗ & phân bổ vốn' },
      { id: 'trade', label: 'Sổ Lệnh & Cổ Tức', icon: '⚡', desc: 'Đặt lệnh mua/bán & ghi nhận cổ tức tiền mặt/cổ phiếu' },
      { id: 'history', label: 'Lịch Sử Giao Dịch', icon: '📋', desc: 'Nhật ký mua/bán & sổ hiệu suất theo mã' },
    ]
  },
  {
    groupTitle: 'Định Giá & Phân Tích Chuyên Sâu',
    items: [
      { id: 'valuation', label: 'Định Giá Cổ Phiếu', icon: '🏢', desc: '10 mô hình định lượng (Graham, DCF, RIM, NAV...), 7 Vùng giá & BCTC 122+ chỉ tiêu' },
      { id: 'macro', label: 'Vĩ Mô & VN-Index', icon: '🌐', desc: 'Regime chu kỳ, nhiệt kế định giá & 10 nhóm ngành' },
      { id: 'dca', label: 'Kế Hoạch DCA', icon: '🪜', desc: 'Mô phỏng & lộ trình mua gom đa tầng' },
      { id: 'strategy', label: 'Chiến Lược Đầu Tư', icon: '🎯', desc: 'Hiệu suất Win Rate theo phong cách & kỷ luật' },
    ]
  },
  {
    groupTitle: 'Tiện Ích & Cấu Hình Hệ Thống',
    items: [
      { id: 'watchlist', label: 'Danh Sách Theo Dõi', icon: '👁️', desc: 'Cảnh báo mốc giá mua/bán mục tiêu' },
      { id: 'settings', label: 'Cài Đặt & Báo Cáo', icon: '⚙️', desc: 'Báo cáo thuế, backup JSON & database' },
    ]
  }
];

export default function App({ hasGoogleClientId = false }) {
  // Khởi tạo trạng thái ban đầu từ URL (bảo lưu khi refresh F5 hoặc truy cập qua link)
  const initialRoute = parseUrlRoute();
  const [tab, setTab] = useState(initialRoute.tab);
  const [tradeType, setTradeType] = useState(initialRoute.tradeType || 'buy');
  const [buyInitial, setBuyInitial] = useState({
    symbol: initialRoute.tab === 'trade' && initialRoute.tradeType === 'buy' ? initialRoute.symbol : '',
    quantity: '',
    price: '',
  });
  const [sellInitialSymbol, setSellInitialSymbol] = useState(
    initialRoute.tab === 'trade' && initialRoute.tradeType === 'sell' ? initialRoute.symbol : ''
  );
  const [dcaInitialStock, setDcaInitialStock] = useState(
    initialRoute.tab === 'dca' && initialRoute.symbol ? { symbol: initialRoute.symbol } : null
  );
  const [valuationInitialSymbol, setValuationInitialSymbol] = useState(
    initialRoute.tab === 'valuation' ? initialRoute.symbol : ''
  );
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isTradeSheetOpen, setIsTradeSheetOpen] = useState(false);

  // Quản lý người dùng & Đăng nhập
  const [currentUser, setCurrentUser] = useState({
    id: 'demo',
    email: 'demo@stockmanager.app',
    name: 'Tài khoản Demo',
    isDemo: true,
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [toast, setToast] = useState(null);

  // Quản lý Dark Mode / Light Mode từ ThemeContext
  const { themeMode, effectiveTheme, isDark, setThemeMode, toggleTheme } = useTheme();

  // Lắng nghe phím ESC để đóng Drawer trên Desktop
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Đảm bảo URL canonical chuẩn hóa khi tải trang lần đầu
  useEffect(() => {
    const route = parseUrlRoute();
    syncUrlRoute(route.tab, {
      symbol: route.symbol,
      tradeType: route.tradeType,
    }, true);
  }, []);

  // Lắng nghe sự kiện Back / Forward của trình duyệt để đổi tab tức thì (0ms)
  useEffect(() => {
    function handlePopState() {
      const route = parseUrlRoute();
      setTab(route.tab);
      if (route.tab === 'valuation') {
        if (route.symbol) setValuationInitialSymbol(route.symbol);
      } else if (route.tab === 'trade') {
        setTradeType(route.tradeType);
        if (route.symbol) {
          if (route.tradeType === 'buy') {
            setBuyInitial({ symbol: route.symbol, quantity: '', price: '' });
          } else if (route.tradeType === 'sell') {
            setSellInitialSymbol(route.symbol);
          }
        }
      } else if (route.tab === 'dca') {
        if (route.symbol) {
          setDcaInitialStock({ symbol: route.symbol });
        }
      }
      setIsDrawerOpen(false);
      setIsTradeSheetOpen(false);
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const toastTimerRef = useRef(null);
  const showToast = useCallback((message, type = 'info') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4000);
  }, []);

  const [data, setData] = useState({
    buyOrders: [],
    sellOrders: [],
    portfolio: [],
    dividends: [],
    watchlist: [],
    goal: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const d = await fetchData();
      setData(d);
      setRefreshKey(k => k + 1);
      setError('');
    } catch (err) {
      setError(err.message || 'Không thể kết nối server. Hãy đảm bảo server đang chạy.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Kiểm tra phiên đăng nhập hiện tại khi khởi động
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetchCurrentUser();
      if (res?.user) {
        setCurrentUser(res.user);
      }
    } catch (err) {
      console.warn('Không thể kiểm tra phiên đăng nhập:', err);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Xử lý Đăng nhập Google hoặc Test User
  async function handleLoginSuccess(token) {
    setAuthToken(token);
    try {
      let userObj;
      if (token.startsWith('test-')) {
        userObj = {
          id: token,
          email: `${token}@test.local`,
          name: `Tài khoản Test (${token})`,
          isDemo: false,
        };
        setCurrentUser(userObj);
      } else {
        const res = await loginGoogle(token);
        userObj = res.user;
        setCurrentUser(userObj);
      }
      showToast(`Đăng nhập thành công! Chào mừng ${userObj.name}`, 'success');
      setLoading(true);
      await loadData();
    } catch (err) {
      showToast('Đăng nhập thất bại: ' + err.message, 'error');
    }
  }

  // Chuyển sang chế độ Demo
  async function handleSwitchToDemo() {
    setAuthToken('demo');
    const demoUser = {
      id: 'demo',
      email: 'demo@stockmanager.app',
      name: 'Tài khoản Demo',
      isDemo: true,
    };
    setCurrentUser(demoUser);
    showToast('Đã chuyển sang Chế độ Demo', 'info');
    setLoading(true);
    await loadData();
  }

  // Đăng xuất
  async function handleLogout() {
    clearAuthToken();
    const demoUser = {
      id: 'demo',
      email: 'demo@stockmanager.app',
      name: 'Tài khoản Demo',
      isDemo: true,
    };
    setCurrentUser(demoUser);
    showToast('Đã đăng xuất. Bạn đang ở Tài khoản Demo.', 'info');
    setLoading(true);
    await loadData();
  }

  // Sao chép danh mục mẫu sang tài khoản cá nhân
  async function handleCloneDemo() {
    if (currentUser?.isDemo) return;
    const confirmed = window.confirm(
      'Bạn có muốn sao chép toàn bộ danh mục mẫu từ tài khoản Demo vào tài khoản của bạn không? Các lệnh mẫu sẽ được thêm vào danh mục cá nhân của bạn.'
    );
    if (!confirmed) return;

    setIsCloning(true);
    try {
      await cloneDemoData();
      showToast('Đã sao chép 4 lệnh mẫu sang tài khoản của bạn thành công!', 'success');
      setLoading(true);
      await loadData();
    } catch (err) {
      showToast('Sao chép thất bại: ' + err.message, 'error');
    } finally {
      setIsCloning(false);
    }
  }

  // Đóng Drawer khi đổi tab hoặc bấm phím Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsDrawerOpen(false);
        setIsTradeSheetOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const totalRealizedPL = (data.sellOrders || []).reduce((s, o) => s + (o.profitLoss || 0), 0);

  function handleSelectBuy(symbolOrObj, quantity = '', price = '') {
    const sym = typeof symbolOrObj === 'object' && symbolOrObj !== null
      ? (symbolOrObj.symbol || '')
      : (symbolOrObj || '');
    if (typeof symbolOrObj === 'object' && symbolOrObj !== null) {
      setBuyInitial({
        symbol: symbolOrObj.symbol || '',
        quantity: symbolOrObj.quantity || '',
        price: symbolOrObj.price || '',
      });
    } else {
      setBuyInitial({ symbol: symbolOrObj || '', quantity, price });
    }
    setTradeType('buy');
    setTab('trade');
    syncUrlRoute('trade', { tradeType: 'buy', symbol: sym });
    setIsDrawerOpen(false);
    setIsTradeSheetOpen(false);
  }

  function handleSelectSell(symbol) {
    const sym = symbol || '';
    setSellInitialSymbol(sym);
    setTradeType('sell');
    setTab('trade');
    syncUrlRoute('trade', { tradeType: 'sell', symbol: sym });
    setIsDrawerOpen(false);
    setIsTradeSheetOpen(false);
  }

  function handleSelectDca(stock) {
    const sym = (typeof stock === 'string' ? stock : stock?.symbol) || '';
    setDcaInitialStock(stock);
    setTab('dca');
    syncUrlRoute('dca', { symbol: sym });
    setIsDrawerOpen(false);
    setIsTradeSheetOpen(false);
  }

  function switchTab(targetTab, param) {
    let finalTab = targetTab;
    let currentTradeType = tradeType;
    if (targetTab === 'buy') {
      currentTradeType = 'buy';
      setTradeType('buy');
      finalTab = 'trade';
    } else if (targetTab === 'sell') {
      currentTradeType = 'sell';
      setTradeType('sell');
      finalTab = 'trade';
    } else if (targetTab === 'dividend') {
      currentTradeType = 'dividend';
      setTradeType('dividend');
      finalTab = 'trade';
    }
    setTab(finalTab);

    const routeParams = {};
    if (finalTab === 'valuation' && param) {
      setValuationInitialSymbol(param);
      routeParams.symbol = param;
    } else if (finalTab === 'trade') {
      routeParams.tradeType = currentTradeType;
      if (param) routeParams.symbol = param;
    } else if (finalTab === 'dca' && param) {
      const sym = typeof param === 'string' ? param : param?.symbol;
      if (sym) routeParams.symbol = sym;
    }

    syncUrlRoute(finalTab, routeParams);

    if (finalTab !== 'trade') {
      setBuyInitial({ symbol: '', quantity: '', price: '' });
      setSellInitialSymbol('');
    }
    if (finalTab !== 'dca') setDcaInitialStock(null);
    setIsDrawerOpen(false);
    setIsTradeSheetOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Định dạng ngắn gọn cho P&L badge trên mobile
  function formatCompactMoney(amount) {
    const abs = Math.abs(amount);
    if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}tỷ`;
    if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}tr`;
    if (abs >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
    return `${amount}đ`;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-800 transition-colors">
      {/* 0. DEMO NOTICE BANNER (Khi đang ở tài khoản Demo) */}
      {currentUser?.isDemo && !bannerDismissed && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 text-white text-xs py-1.5 px-3 border-b border-amber-600/30">
          <div className="w-[94%] sm:w-[95%] max-w-[2400px] mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-base shrink-0">👀</span>
              <span className="truncate text-[11px] sm:text-xs">
                Bạn đang ở <strong>Chế độ Demo</strong> (dữ liệu mẫu). Đăng nhập để quản lý danh mục đầu tư bảo mật riêng.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="px-2.5 py-0.5 bg-white text-amber-900 hover:bg-amber-50 rounded-full font-bold text-[11px] transition-colors cursor-pointer shadow-2xs"
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                className="text-white/80 hover:text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full cursor-pointer"
                title="Đóng thông báo"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. TOP HEADER (Sticky, tối ưu cho cả Desktop & Mobile) */}
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs">
        <div className="w-[94%] sm:w-[95%] max-w-[2400px] mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between h-14 gap-2">
            {/* Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer active:scale-98 transition-transform select-none"
              onClick={() => switchTab('dashboard')}
            >
              <span className="text-2xl drop-shadow-2xs">📈</span>
              <div className="leading-tight">
                <span className="font-extrabold text-slate-800 dark:text-white text-base sm:text-lg tracking-tight block">
                  Nhật Ký Giao Dịch
                </span>
              </div>
            </div>

            {/* Khối Thông Tin & Nút Thao Tác Phía Phải */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* P&L badge: Dạng đầy đủ trên Desktop, Dạng cô đọng trên Mobile */}
              {(data.sellOrders || []).length > 0 && (
                <div
                  className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full transition-all border ${
                    totalRealizedPL >= 0 ? 'badge-gain' : 'badge-loss'
                  }`}
                  title={`Tổng lãi/lỗ đã chốt: ${new Intl.NumberFormat('vi-VN').format(Math.round(totalRealizedPL))}đ`}
                >
                  <span>{totalRealizedPL >= 0 ? '▲' : '▼'}</span>
                  {/* Trên Desktop */}
                  <span className="hidden sm:inline">
                    Lãi/Lỗ: {totalRealizedPL >= 0 ? '+' : ''}
                    {new Intl.NumberFormat('vi-VN').format(Math.round(totalRealizedPL))}đ
                  </span>
                  {/* Trên Mobile */}
                  <span className="sm:hidden font-extrabold">
                    {totalRealizedPL >= 0 ? '+' : ''}{formatCompactMoney(Math.round(totalRealizedPL))}
                  </span>
                </div>
              )}

              {/* Thông tin tài khoản & Đăng nhập */}
              <UserNav
                user={currentUser}
                onOpenLogin={() => setIsLoginModalOpen(true)}
                onSwitchToDemo={handleSwitchToDemo}
                onLogout={handleLogout}
                onCloneDemo={handleCloneDemo}
                isCloning={isCloning}
              />

              {/* Nút Chuyển Đổi Dark Mode / Light Mode */}
              <button
                type="button"
                onClick={toggleTheme}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-amber-500 dark:text-gray-300 dark:hover:text-amber-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-base"
                title={`Chuyển giao diện: Hiện tại ${isDark ? 'Tối' : 'Sáng'} (${themeMode === 'system' ? 'Theo hệ thống' : 'Cố định'}) — Phím tắt: Ctrl/Cmd + J`}
                aria-label="Chuyển chế độ giao diện"
              >
                {isDark ? '☀️' : '🌙'}
              </button>

              {/* Nút Làm Mới Sổ Cái Database (Reload Local Ledger) */}
              <button
                onClick={loadData}
                disabled={loading}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-800 active:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
                title="Tải lại sổ lệnh cá nhân từ Database (Lệnh mua/bán, Cổ tức, Tiền mặt)"
                aria-label="Tải lại sổ lệnh cá nhân từ Database"
              >
                <span className={`text-base ${loading ? 'animate-spin' : ''}`}>🔄</span>
              </button>

              {/* Nút Mở Menu Drawer Đa Nền Tảng (Mobile & Desktop) */}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 active:scale-95 transition-all cursor-pointer font-bold text-xs border border-gray-200/60 dark:border-slate-700/60 shadow-2xs"
                title="Mở toàn bộ danh mục tính năng (Phím tắt: ESC để đóng)"
                aria-label="Menu chức năng"
              >
                <span className="text-base leading-none">☰</span>
                <span className="hidden sm:inline font-semibold">Menu</span>
              </button>
            </div>
          </div>

          {/* 2. DESKTOP TAB BAR (hidden md:flex) - Hiển thị ngang cao cấp trên màn hình lớn */}
          <nav className="hidden md:flex items-center gap-1 -mb-px overflow-x-auto no-scrollbar pt-1">
            {TABS.map((t, idx) => {
              const prevTab = TABS[idx - 1];
              const showDivider = prevTab && prevTab.group !== t.group;
              return (
                <Fragment key={t.id}>
                  {showDivider && (
                    <div className="h-4 w-px bg-gray-200 dark:bg-slate-700 mx-1 shrink-0 select-none self-center" />
                  )}
                  <button
                    onClick={() => switchTab(t.id)}
                    onMouseEnter={() => prefetchTab(t.id)}
                    onTouchStart={() => prefetchTab(t.id)}
                    className={`px-3 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${tab === t.id
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-t-lg'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50/80 dark:hover:bg-slate-800/60 rounded-t-lg'
                      }`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label.replace(/^.*? /, '')}</span>
                  </button>
                </Fragment>
              );
            })}

            {/* Vách ngăn trước nút Tất Cả */}
            <div className="h-4 w-px bg-gray-200 dark:bg-slate-700 mx-1 shrink-0 select-none self-center" />
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 rounded-t-lg transition flex items-center gap-1.5 shrink-0 border-b-2 border-transparent cursor-pointer ml-0.5"
              title="Xem toàn bộ 10 chức năng được phân nhóm"
            >
              <span className="text-sm">📑</span>
              <span>Tất Cả</span>
            </button>
          </nav>
        </div>
      </header>

      {/* 3. MAIN CONTENT (Có đệm đáy pb-24 trên mobile để không bị Bottom Bar che) */}
      <main className="w-[94%] sm:w-[95%] max-w-[2400px] mx-auto px-1.5 sm:px-4 py-4 sm:py-6 flex-1 pb-24 md:pb-8">
        {loading ? (
          <DashboardSkeleton />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-6 text-center max-w-lg mx-auto my-8 shadow-xs">
            <p className="text-4xl mb-2">⚠️</p>
            <p className="font-bold text-base mb-1">Không thể kết nối máy chủ</p>
            <p className="text-xs text-red-600 bg-white/70 p-2.5 rounded-xl border border-red-100 font-mono text-left break-all">
              {error}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={loadData}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                🔄 Thử lại
              </button>
            </div>
          </div>
        ) : (
          <>
            {tab === 'dashboard' && (
              <Dashboard
                data={data}
                refreshKey={refreshKey}
                onSuccess={loadData}
                onNavigateBuy={handleSelectBuy}
                onNavigateDca={handleSelectDca}
                onNavigateSell={handleSelectSell}
                onSwitchTab={switchTab}
                showToast={showToast}
              />
            )}
            <Suspense fallback={<TabSkeleton />}>
              {tab === 'macro' && (
                <MacroDashboard
                  refreshKey={refreshKey}
                  onSwitchTab={switchTab}
                  showToast={showToast}
                />
              )}
              {tab === 'valuation' && (
                <ValuationDashboard
                  data={data}
                  refreshKey={refreshKey}
                  onSwitchTab={switchTab}
                  initialSymbol={valuationInitialSymbol}
                />
              )}
              {tab === 'dca' && (
                <DcaPlannerView
                  portfolio={data.portfolio || []}
                  initialStock={dcaInitialStock}
                  onNavigateBuy={handleSelectBuy}
                />
              )}
              {tab === 'trade' && (
                <TradeOrderView
                  initialType={tradeType}
                  onTypeChange={setTradeType}
                  portfolio={data.portfolio || []}
                  dividends={data.dividends || []}
                  watchlist={data.watchlist || []}
                  buyInitial={buyInitial}
                  sellInitialSymbol={sellInitialSymbol}
                  showToast={showToast}
                  onSuccess={() => {
                    setBuyInitial({ symbol: '', quantity: '', price: '' });
                    setSellInitialSymbol('');
                    loadData();
                  }}
                />
              )}
              {tab === 'history' && (
                <TransactionHistory
                  data={data}
                  onSuccess={loadData}
                  onNavigateBuy={handleSelectBuy}
                  onNavigateSell={handleSelectSell}
                  onSwitchTab={switchTab}
                  showToast={showToast}
                />
              )}
              {tab === 'strategy' && (
                <StrategyAnalytics data={data} />
              )}
              {tab === 'watchlist' && (
                <Watchlist
                  watchlist={data.watchlist || []}
                  portfolio={data.portfolio || []}
                  refreshKey={refreshKey}
                  onSuccess={loadData}
                  onSelectBuy={handleSelectBuy}
                  onSelectSell={handleSelectSell}
                  showToast={showToast}
                />
              )}
              {tab === 'settings' && (
                <Settings
                  data={data}
                  currentUser={currentUser}
                  onSuccess={loadData}
                  showToast={showToast}
                />
              )}
            </Suspense>
          </>
        )}
      </main>

      {/* 4. FOOTER (Desktop & Tablet) */}
      <footer className="hidden md:block text-center text-xs text-slate-400 dark:text-slate-500 py-6 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
        Hệ thống lưu trữ SQLite (Turso Cloud) · Khớp lệnh đa chiến lược (Min Cost / Max Cost / FIFO) · Phí & Thuế chuẩn TTCK Việt Nam
      </footer>

      {/* 5. MOBILE BOTTOM NAVIGATION BAR (md:hidden - Cố định ở đáy màn hình) */}
      <nav
        aria-label="Thanh điều hướng dưới đáy màn hình"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom,8px)] transition-colors"
      >
        <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-1">
          {/* Nút 1: Tổng quan */}
          <button
            type="button"
            onClick={() => switchTab('dashboard')}
            className={`flex flex-col items-center justify-center h-full transition-all cursor-pointer ${tab === 'dashboard'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
              }`}
          >
            <span className="text-xl leading-none">📊</span>
            <span className="text-[10px] mt-1 tracking-tight">Tổng quan</span>
            {tab === 'dashboard' && (
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-0.5" />
            )}
          </button>

          {/* Nút 2: Định giá */}
          <button
            type="button"
            onClick={() => switchTab('valuation')}
            onMouseEnter={() => prefetchTab('valuation')}
            onTouchStart={() => prefetchTab('valuation')}
            className={`flex flex-col items-center justify-center h-full transition-all cursor-pointer ${tab === 'valuation'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
              }`}
          >
            <span className="text-xl leading-none">🏢</span>
            <span className="text-[10px] mt-1 tracking-tight">Định giá</span>
            {tab === 'valuation' && (
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-0.5" />
            )}
          </button>

          {/* Nút 3: GIAO DỊCH (Nổi bật ở giữa, mở Quick Action Sheet) */}
          <div className="flex flex-col items-center justify-center -mt-4">
            <button
              type="button"
              onClick={() => setIsTradeSheetOpen(true)}
              onMouseEnter={() => prefetchTab('trade')}
              onTouchStart={() => prefetchTab('trade')}
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-300/50 flex items-center justify-center active:scale-92 transition-all cursor-pointer border-2 border-white"
              title="Mở menu giao dịch Mua / Bán"
              aria-label="Giao dịch"
            >
              <span className="text-xl leading-none">⚡</span>
            </button>
            <span className="text-[10px] mt-1 font-bold text-indigo-700 dark:text-indigo-400 tracking-tight">Giao dịch</span>
          </div>

          {/* Nút 4: Lịch sử */}
          <button
            type="button"
            onClick={() => switchTab('history')}
            onMouseEnter={() => prefetchTab('history')}
            onTouchStart={() => prefetchTab('history')}
            className={`flex flex-col items-center justify-center h-full transition-all cursor-pointer ${tab === 'history'
              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
              }`}
          >
            <span className="text-xl leading-none">📋</span>
            <span className="text-[10px] mt-1 tracking-tight">Lịch sử</span>
            {tab === 'history' && (
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-0.5" />
            )}
          </button>

          {/* Nút 5: Menu Tính Năng (Mở Full Drawer) */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className={`flex flex-col items-center justify-center h-full transition-all cursor-pointer ${['trade', 'macro', 'dca', 'strategy', 'watchlist', 'settings'].includes(tab)
              ? 'text-indigo-600 font-bold'
              : 'text-gray-400 hover:text-gray-600 font-medium'
              }`}
          >
            <span className="text-xl leading-none">☰</span>
            <span className="text-[10px] mt-1 tracking-tight">Menu</span>
            {['trade', 'macro', 'dca', 'strategy', 'watchlist', 'settings'].includes(tab) && (
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-0.5" />
            )}
          </button>
        </div>
      </nav>

      {/* 6. QUICK TRADE ACTION SHEET (Mobile Popup khi bấm nút Giao Dịch ở giữa) */}
      {isTradeSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsTradeSheetOpen(false)}
          />

          {/* Sheet Box */}
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 z-10 shadow-2xl animate-in slide-in-from-bottom-6 duration-200 border border-gray-100 dark:border-slate-800">
            <div className="w-12 h-1 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
            <h3 className="font-extrabold text-gray-800 dark:text-white text-lg mb-1 flex items-center gap-2">
              <span>⚡</span> Chọn Loại Giao Dịch
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-400 mb-5">
              Khớp lệnh thông minh hoặc ghi nhận cổ tức tiền mặt / thưởng
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => switchTab('buy')}
                onMouseEnter={() => prefetchTab('trade')}
                onTouchStart={() => prefetchTab('trade')}
                className="p-3 rounded-2xl border-2 border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-300 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-2xs text-center"
              >
                <span className="text-2xl">🛒</span>
                <span className="font-extrabold text-xs sm:text-sm">Mua Vào</span>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400">Thêm vị thế</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab('sell')}
                onMouseEnter={() => prefetchTab('trade')}
                onTouchStart={() => prefetchTab('trade')}
                className="p-3 rounded-2xl border-2 border-rose-100 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-50 text-rose-700 dark:text-rose-300 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-2xs text-center"
              >
                <span className="text-2xl">💸</span>
                <span className="font-extrabold text-xs sm:text-sm">Bán Ra</span>
                <span className="text-[9px] text-rose-500 dark:text-rose-400">Chốt lời / Lỗ</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab('dividend')}
                onMouseEnter={() => prefetchTab('trade')}
                onTouchStart={() => prefetchTab('trade')}
                className="p-3 rounded-2xl border-2 border-amber-100 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-50 text-amber-800 dark:text-amber-300 flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-2xs text-center"
              >
                <span className="text-2xl">🎁</span>
                <span className="font-extrabold text-xs sm:text-sm">Cổ Tức</span>
                <span className="text-[9px] text-amber-600 dark:text-amber-400">Tiền & Thưởng</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsTradeSheetOpen(false)}
              className="w-full mt-4 py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* 7. SLIDE-OVER FEATURE DRAWER (Toàn bộ 9 tính năng phân nhóm khoa học) */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-800 h-full shadow-2xl z-10 flex flex-col animate-in slide-in-from-right duration-250">
            {/* Header Drawer */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white dark:from-slate-850 dark:to-slate-900">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📈</span>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white text-sm">Menu Tính Năng</h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">{data.portfolio.length} mã trong danh mục · ESC để đóng</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-300 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors"
                title="Đóng menu (ESC)"
              >
                ✕
              </button>
            </div>

            {/* Body Drawer: Thông tin tài khoản & Danh sách tính năng */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Account Quick Status inside Mobile/Desktop Drawer */}
              <div className="p-3 bg-gray-50 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/80 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                    {(currentUser.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-gray-800 dark:text-white truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-400 truncate">
                      {currentUser.isDemo ? 'Chế độ Demo' : (currentUser.email || 'Tài khoản cá nhân')}
                    </div>
                  </div>
                </div>
                {currentUser.isDemo ? (
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      setIsLoginModalOpen(true);
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg shrink-0 cursor-pointer shadow-xs"
                  >
                    Đăng nhập
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      handleLogout();
                    }}
                    className="px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-[11px] font-bold rounded-lg shrink-0 cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                )}
              </div>

              {TAB_GROUPS.map((group) => (
                <div key={group.groupTitle} className="space-y-2">
                  <h4 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2">
                    {group.groupTitle}
                  </h4>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = tab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => switchTab(item.id)}
                          onMouseEnter={() => prefetchTab(item.id)}
                          onTouchStart={() => prefetchTab(item.id)}
                          className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer ${isActive
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200 shadow-2xs'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-800/60 text-gray-700 dark:text-gray-300'
                            }`}
                        >
                          <span className="text-2xl w-8 text-center shrink-0">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${isActive ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                {item.label}
                              </span>
                              {isActive && (
                                <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.2 rounded-md">
                                  Đang mở
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                              {item.desc}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Drawer: Trạng thái & Nút đóng */}
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/70 dark:bg-slate-900/90 text-xs text-gray-500 dark:text-gray-400 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400 dark:text-gray-500">Database Engine:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/40 dark:border-indigo-800/40 px-2 py-0.5 rounded-md">
                  SQLite Cloud (Turso)
                </span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400 dark:text-gray-500">Giao diện (Theme):</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    {themeMode === 'system' ? '💻 Hệ thống' : isDark ? '🌙 Tối' : '☀️ Sáng'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-[11px]">
                  <button
                    type="button"
                    onClick={() => setThemeMode('light')}
                    className={`py-1 rounded-lg font-semibold transition-all ${
                      themeMode === 'light'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    ☀️ Sáng
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeMode('dark')}
                    className={`py-1 rounded-lg font-semibold transition-all ${
                      themeMode === 'dark'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    🌙 Tối
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeMode('system')}
                    className={`py-1 rounded-lg font-semibold transition-all ${
                      themeMode === 'system'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    💻 Tự động
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-full py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
              >
                Đóng Menu (ESC)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL ĐĂNG NHẬP */}
      {isLoginModalOpen && (
        <Suspense fallback={null}>
          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            currentUser={currentUser}
            onLoginSuccess={handleLoginSuccess}
            onSwitchToDemo={handleSwitchToDemo}
            hasGoogleClientId={hasGoogleClientId}
          />
        </Suspense>
      )}

      {/* 9. TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed bottom-20 md:bottom-6 right-4 z-50 max-w-sm sm:max-w-md px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200 ${toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-950/20'
              : toast.type === 'error'
                ? 'bg-rose-600 text-white border-rose-500 shadow-rose-950/20'
                : 'bg-slate-900 text-white border-slate-800 shadow-slate-950/20'
            }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm shrink-0">{toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️'}</span>
            <span className="truncate">{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer shrink-0 text-xs font-bold leading-none"
            title="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
