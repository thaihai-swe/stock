import { useCallback, useEffect, useState } from 'react';
import BuyForm from './components/BuyForm.jsx';
import Dashboard from './components/Dashboard.jsx';
import DcaPlannerView from './components/DcaPlannerView.jsx';
import DividendManager from './components/DividendManager.jsx';
import SellForm from './components/SellForm.jsx';
import Settings from './components/Settings.jsx';
import StrategyAnalytics from './components/StrategyAnalytics.jsx';
import TransactionHistory from './components/TransactionHistory.jsx';
import Watchlist from './components/Watchlist.jsx';
import ValuationDashboard from './components/ValuationDashboard.jsx';
import UserNav from './components/UserNav.jsx';
import LoginModal from './components/LoginModal.jsx';
import {
  fetchData,
  fetchCurrentUser,
  loginGoogle,
  cloneDemoData,
  setAuthToken,
  clearAuthToken,
} from './utils/api.js';

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard', shortLabel: 'Tổng quan', icon: '📊' },
  { id: 'valuation', label: '🏢 Định Giá & Vĩ Mô', shortLabel: 'Định Giá', icon: '🏢' },
  { id: 'dca', label: '🪜 Kế Hoạch DCA', shortLabel: 'DCA', icon: '🪜' },
  { id: 'buy', label: '🛒 Mua vào', shortLabel: 'Mua vào', icon: '🛒' },
  { id: 'sell', label: '💸 Bán ra', shortLabel: 'Bán ra', icon: '💸' },
  { id: 'history', label: '📋 Lịch sử', shortLabel: 'Lịch sử', icon: '📋' },
  { id: 'dividend', label: '🎁 Cổ tức', shortLabel: 'Cổ tức', icon: '🎁' },
  { id: 'strategy', label: '🎯 Chiến lược', shortLabel: 'Chiến lược', icon: '🎯' },
  { id: 'watchlist', label: '👁️ Theo dõi', shortLabel: 'Theo dõi', icon: '👁️' },
  { id: 'settings', label: '⚙️ Cài đặt & Báo cáo', shortLabel: 'Cài đặt', icon: '⚙️' },
];

const TAB_GROUPS = [
  {
    groupTitle: 'Quản Trị Danh Mục & Phân Tích',
    items: [
      { id: 'dashboard', label: 'Tổng Quan (Dashboard)', icon: '📊', desc: 'Nắm giữ, lãi/lỗ & phân bổ vốn' },
      { id: 'valuation', label: 'Định Giá & Vĩ Mô', icon: '🏢', desc: 'Mô hình Graham, DDM, BCTC & VN-Index' },
      { id: 'dca', label: 'Kế Hoạch DCA', icon: '🪜', desc: 'Mô phỏng & lộ trình mua gom đa tầng' },
      { id: 'strategy', label: 'Chiến Lược Đầu Tư', icon: '🎯', desc: 'Hiệu suất Win Rate theo phong cách' },
    ]
  },
  {
    groupTitle: 'Lệnh & Giao Dịch',
    items: [
      { id: 'buy', label: 'Mua Vào', icon: '🛒', desc: 'Đặt lệnh mua & tự động tính giá vốn' },
      { id: 'sell', label: 'Bán Ra', icon: '💸', desc: 'Chốt lời/cắt lỗ theo nguyên tắc FIFO' },
      { id: 'history', label: 'Lịch Sử Giao Dịch', icon: '📋', desc: 'Nhật ký mua/bán, tìm kiếm & lọc' },
    ]
  },
  {
    groupTitle: 'Mở Rộng & Cấu Hình',
    items: [
      { id: 'dividend', label: 'Cổ Tức & Quyền', icon: '🎁', desc: 'Cổ tức tiền mặt & cổ phiếu thưởng' },
      { id: 'watchlist', label: 'Danh Sách Theo Dõi', icon: '👁️', desc: 'Cảnh báo mốc giá mua/bán mục tiêu' },
      { id: 'settings', label: 'Cài Đặt & Sao Lưu', icon: '⚙️', desc: 'Báo cáo thuế, backup JSON & database' },
    ]
  }
];

export default function App({ hasGoogleClientId = false }) {
  const [tab, setTab] = useState('dashboard');
  const [buyInitial, setBuyInitial] = useState({ symbol: '', quantity: '', price: '' });
  const [sellInitialSymbol, setSellInitialSymbol] = useState('');
  const [dcaInitialStock, setDcaInitialStock] = useState(null);
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

  // Quản lý Dark Mode / Light Mode
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('stock_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('stock_theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
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

  function handleSelectBuy(symbol, quantity = '', price = '') {
    setBuyInitial({ symbol, quantity, price });
    setTab('buy');
    setIsDrawerOpen(false);
    setIsTradeSheetOpen(false);
  }

  function handleSelectSell(symbol) {
    setSellInitialSymbol(symbol);
    setTab('sell');
    setIsDrawerOpen(false);
    setIsTradeSheetOpen(false);
  }

  function handleSelectDca(stock) {
    setDcaInitialStock(stock);
    setTab('dca');
    setIsDrawerOpen(false);
    setIsTradeSheetOpen(false);
  }

  function switchTab(targetTab) {
    setTab(targetTab);
    if (targetTab !== 'buy') setBuyInitial({ symbol: '', quantity: '', price: '' });
    if (targetTab !== 'sell') setSellInitialSymbol('');
    if (targetTab !== 'dca') setDcaInitialStock(null);
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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col font-sans text-gray-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-800 transition-colors">
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
      <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs">
        <div className="w-[94%] sm:w-[95%] max-w-[2400px] mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between h-14 gap-2">
            {/* Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer active:scale-98 transition-transform select-none"
              onClick={() => switchTab('dashboard')}
            >
              <span className="text-2xl drop-shadow-2xs">📈</span>
              <div className="leading-tight">
                <span className="font-extrabold text-gray-800 dark:text-white text-base sm:text-lg tracking-tight block">
                  Nhật Ký Giao Dịch
                </span>
              </div>
            </div>

            {/* Khối Thông Tin & Nút Thao Tác Phía Phải */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* P&L badge: Dạng đầy đủ trên Desktop, Dạng cô đọng trên Mobile */}
              {(data.sellOrders || []).length > 0 && (
                <div
                  className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full transition-all border ${totalRealizedPL >= 0
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-600 border-red-200'
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
                title={theme === 'dark' ? 'Chuyển sang Giao diện Sáng (Light)' : 'Chuyển sang Giao diện Tối (Dark Mode)'}
                aria-label="Chuyển chế độ giao diện"
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>

              {/* Nút Làm Mới (Reload) */}
              <button
                onClick={loadData}
                disabled={loading}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-slate-800 active:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
                title="Tải lại dữ liệu"
                aria-label="Tải lại dữ liệu"
              >
                <span className={`text-base ${loading ? 'animate-spin' : ''}`}>🔄</span>
              </button>

              {/* Nút Mở Menu Drawer Trên Mobile (md:hidden) */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 active:scale-95 transition-all cursor-pointer font-bold"
                title="Mở toàn bộ danh mục tính năng"
                aria-label="Menu"
              >
                <span className="text-lg leading-none">☰</span>
              </button>
            </div>
          </div>

          {/* 2. DESKTOP TAB BAR (hidden md:flex) - Hiển thị ngang cao cấp trên màn hình lớn */}
          <nav className="hidden md:flex gap-1 -mb-px overflow-x-auto no-scrollbar pt-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${tab === t.id
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/40 rounded-t-lg'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50/80 dark:hover:bg-slate-800/60 rounded-t-lg'
                  }`}
              >
                <span>{t.icon}</span>
                <span>{t.label.replace(/^.*? /, '')}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* 3. MAIN CONTENT (Có đệm đáy pb-24 trên mobile để không bị Bottom Bar che) */}
      <main className="w-[94%] sm:w-[95%] max-w-[2400px] mx-auto px-1.5 sm:px-4 py-4 sm:py-6 flex-1 pb-24 md:pb-8">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-3 animate-spin inline-block">⏳</div>
              <p className="font-semibold text-gray-600 text-sm">Đang tải dữ liệu danh mục...</p>
              <p className="text-xs text-gray-400 mt-1">Đang đồng bộ từ SQLite Database</p>
            </div>
          </div>
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
                onNavigateSell={(symbol) => {
                  setSellInitialSymbol(symbol || '');
                  setTab('sell');
                }}
              />
            )}
            {tab === 'valuation' && (
              <ValuationDashboard
                data={data}
                refreshKey={refreshKey}
                onSwitchTab={switchTab}
              />
            )}
            {tab === 'dca' && (
              <DcaPlannerView
                portfolio={data.portfolio || []}
                initialStock={dcaInitialStock}
                onNavigateBuy={handleSelectBuy}
              />
            )}
            {tab === 'buy' && (
              <BuyForm
                onSuccess={() => {
                  setBuyInitial({ symbol: '', quantity: '', price: '' });
                  loadData();
                }}
                initialSymbol={buyInitial.symbol}
                initialQuantity={buyInitial.quantity}
                initialPrice={buyInitial.price}
              />
            )}
            {tab === 'sell' && (
              <SellForm
                onSuccess={() => {
                  setSellInitialSymbol('');
                  loadData();
                }}
                portfolio={data.portfolio || []}
                initialSymbol={sellInitialSymbol}
              />
            )}
            {tab === 'history' && (
              <TransactionHistory
                data={data}
                onSuccess={loadData}
                onNavigateBuy={(init) => {
                  setBuyInitial(init || { symbol: '', quantity: '', price: '' });
                  setTab('buy');
                }}
                onNavigateSell={(symbol) => {
                  setSellInitialSymbol(symbol || '');
                  setTab('sell');
                }}
              />
            )}
            {tab === 'dividend' && (
              <DividendManager
                dividends={data.dividends || []}
                portfolio={data.portfolio || []}
                onSuccess={loadData}
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
          </>
        )}
      </main>

      {/* 4. FOOTER (Desktop & Tablet) */}
      <footer className="hidden md:block text-center text-xs text-gray-400 py-6 border-t border-gray-100 bg-white">
        Hệ thống lưu trữ SQLite (Turso Cloud) · Khớp lệnh FIFO · Phí & Thuế chuẩn TTCK Việt Nam
      </footer>

      {/* 5. MOBILE BOTTOM NAVIGATION BAR (md:hidden - Cố định ở đáy màn hình) */}
      <nav
        aria-label="Thanh điều hướng dưới đáy màn hình"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom,8px)]"
      >
        <div className="grid grid-cols-5 items-center h-16 max-w-lg mx-auto px-1">
          {/* Nút 1: Tổng quan */}
          <button
            type="button"
            onClick={() => switchTab('dashboard')}
            className={`flex flex-col items-center justify-center h-full transition-all cursor-pointer ${tab === 'dashboard'
                ? 'text-indigo-600 font-bold'
                : 'text-gray-400 hover:text-gray-600 font-medium'
              }`}
          >
            <span className="text-xl leading-none">📊</span>
            <span className="text-[10px] mt-1 tracking-tight">Tổng quan</span>
            {tab === 'dashboard' && (
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-0.5" />
            )}
          </button>

          {/* Nút 2: Kế hoạch DCA */}
          <button
            type="button"
            onClick={() => switchTab('dca')}
            className={`flex flex-col items-center justify-center h-full transition-all cursor-pointer ${tab === 'dca'
                ? 'text-indigo-600 font-bold'
                : 'text-gray-400 hover:text-gray-600 font-medium'
              }`}
          >
            <span className="text-xl leading-none">🪜</span>
            <span className="text-[10px] mt-1 tracking-tight">DCA</span>
            {tab === 'dca' && (
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-0.5" />
            )}
          </button>

          {/* Nút 3: GIAO DỊCH (Nổi bật ở giữa, mở Quick Action Sheet) */}
          <div className="flex flex-col items-center justify-center -mt-4">
            <button
              type="button"
              onClick={() => setIsTradeSheetOpen(true)}
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-300/50 flex items-center justify-center active:scale-92 transition-all cursor-pointer border-2 border-white"
              title="Mở menu giao dịch Mua / Bán"
              aria-label="Giao dịch"
            >
              <span className="text-xl leading-none">⚡</span>
            </button>
            <span className="text-[10px] mt-1 font-bold text-indigo-700 tracking-tight">Giao dịch</span>
          </div>

          {/* Nút 4: Lịch sử */}
          <button
            type="button"
            onClick={() => switchTab('history')}
            className={`flex flex-col items-center justify-center h-full transition-all cursor-pointer ${tab === 'history'
                ? 'text-indigo-600 font-bold'
                : 'text-gray-400 hover:text-gray-600 font-medium'
              }`}
          >
            <span className="text-xl leading-none">📋</span>
            <span className="text-[10px] mt-1 tracking-tight">Lịch sử</span>
            {tab === 'history' && (
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-0.5" />
            )}
          </button>

          {/* Nút 5: Thêm (Mở Full Drawer) */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className={`flex flex-col items-center justify-center h-full transition-all cursor-pointer ${['dividend', 'strategy', 'watchlist', 'settings', 'buy', 'sell'].includes(tab)
                ? 'text-indigo-600 font-bold'
                : 'text-gray-400 hover:text-gray-600 font-medium'
              }`}
          >
            <span className="text-xl leading-none">☰</span>
            <span className="text-[10px] mt-1 tracking-tight">Thêm</span>
            {['dividend', 'strategy', 'watchlist', 'settings', 'buy', 'sell'].includes(tab) && (
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
          <div className="relative bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 z-10 shadow-2xl animate-in slide-in-from-bottom-6 duration-200">
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
            <h3 className="font-extrabold text-gray-800 text-lg mb-1 flex items-center gap-2">
              <span>⚡</span> Chọn Loại Giao Dịch
            </h3>
            <p className="text-xs text-gray-400 mb-5">
              Khớp lệnh thông minh và tự động tính toán giá vốn
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => switchTab('buy')}
                className="p-4 rounded-2xl border-2 border-emerald-100 bg-emerald-50/60 hover:bg-emerald-50 text-emerald-800 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                <span className="text-3xl">🛒</span>
                <span className="font-extrabold text-sm">Mua Vào</span>
                <span className="text-[10px] text-emerald-600">Thêm vị thế mới</span>
              </button>

              <button
                type="button"
                onClick={() => switchTab('sell')}
                className="p-4 rounded-2xl border-2 border-red-100 bg-red-50/60 hover:bg-red-50 text-red-700 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                <span className="text-3xl">💸</span>
                <span className="font-extrabold text-sm">Bán Ra</span>
                <span className="text-[10px] text-red-500">Chốt lời / Cắt lỗ</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsTradeSheetOpen(false)}
              className="w-full mt-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
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
          <div className="relative w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl z-10 flex flex-col animate-in slide-in-from-right duration-250">
            {/* Header Drawer */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📈</span>
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">Menu Tính Năng</h3>
                  <p className="text-[11px] text-gray-400">{data.portfolio.length} mã trong danh mục</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body Drawer: Thông tin tài khoản & Danh sách tính năng */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Account Quick Status inside Mobile Drawer */}
              <div className="p-3 bg-gray-50 border border-gray-200/80 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                    {(currentUser.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-gray-800 truncate">
                      {currentUser.name}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">
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
                    className="px-2 py-1 text-red-600 hover:bg-red-50 text-[11px] font-bold rounded-lg shrink-0 cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                )}
              </div>

              {TAB_GROUPS.map((group) => (
                <div key={group.groupTitle} className="space-y-2">
                  <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">
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
                          className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-left transition-all cursor-pointer ${isActive
                              ? 'bg-indigo-50 border border-indigo-200/60 text-indigo-900 shadow-2xs'
                              : 'hover:bg-gray-50 text-gray-700'
                            }`}
                        >
                          <span className="text-2xl w-8 text-center shrink-0">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${isActive ? 'text-indigo-700' : 'text-gray-800'}`}>
                                {item.label}
                              </span>
                              {isActive && (
                                <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.2 rounded-md">
                                  Đang mở
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 truncate mt-0.5">
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
            <div className="p-4 border-t border-gray-100 bg-gray-50/70 text-xs text-gray-500 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400">Database Engine:</span>
                <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  SQLite Cloud (Turso)
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-gray-400">Giao diện (Theme):</span>
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg font-semibold text-gray-700 flex items-center gap-1.5"
                >
                  {theme === 'dark' ? '☀️ Chế độ Sáng' : '🌙 Chế độ Tối'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
              >
                Đóng Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL ĐĂNG NHẬP */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onSwitchToDemo={handleSwitchToDemo}
        hasGoogleClientId={hasGoogleClientId}
      />

      {/* 9. TOAST NOTIFICATION */}
      {toast && (
        <div
          className={`fixed bottom-20 md:bottom-6 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : toast.type === 'error'
              ? 'bg-red-600 text-white border-red-500'
              : 'bg-gray-900 text-white border-gray-800'
          }`}
        >
          <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : 'ℹ️'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
