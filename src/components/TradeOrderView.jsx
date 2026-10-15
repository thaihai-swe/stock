import { useEffect, useMemo, useState } from 'react';
import BuyForm from './BuyForm.jsx';
import DividendManager from './DividendManager.jsx';
import SellForm from './SellForm.jsx';
import TradeSidebarContext from './trade/TradeSidebarContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { fetchPrices } from '../utils/api.js';

export default function TradeOrderView({
  initialType = 'buy',
  onTypeChange,
  portfolio = [],
  dividends = [],
  watchlist = [],
  buyInitial = { symbol: '', quantity: '', price: '' },
  sellInitial = { symbol: '', quantity: '', price: '' },
  sellInitialSymbol = '',
  onSuccess,
  onBuySuccess,
  onSellSuccess,
  onDividendSuccess,
}) {
  const { showToast } = useToast();
  const [activeType, setActiveType] = useState(initialType || 'buy');

  // Trạng thái tự động điền (Quick-fill state)
  const [currentBuySymbol, setCurrentBuySymbol] = useState(buyInitial?.symbol || '');
  const [currentBuyQuantity, setCurrentBuyQuantity] = useState(buyInitial?.quantity || '');
  const [currentBuyPrice, setCurrentBuyPrice] = useState(buyInitial?.price || '');

  const [currentSellSymbol, setCurrentSellSymbol] = useState(sellInitial?.symbol || sellInitialSymbol || '');
  const [currentSellQuantity, setCurrentSellQuantity] = useState(sellInitial?.quantity || null);
  const [currentSellPrice, setCurrentSellPrice] = useState(sellInitial?.price || '');

  // Live market prices cache
  const [marketPrices, setMarketPrices] = useState({});

  useEffect(() => {
    const symbols = Array.from(new Set([
      ...(portfolio || []).map(p => p.symbol),
      ...(watchlist || []).map(w => w.symbol),
      currentBuySymbol,
      currentSellSymbol,
    ].filter(Boolean)));

    if (symbols.length > 0) {
      fetchPrices(symbols, false)
        .then(res => {
          if (res?.prices) {
            setMarketPrices(prev => ({ ...prev, ...res.prices }));
          }
        })
        .catch(() => {});
    }
  }, [portfolio, watchlist, currentBuySymbol, currentSellSymbol]);

  // Mở/đóng panel danh mục trên màn hình mobile
  const [showMobileContext, setShowMobileContext] = useState(false);

  useEffect(() => {
    if (initialType) {
      setActiveType(initialType);
    }
  }, [initialType]);

  useEffect(() => {
    if (buyInitial?.symbol) setCurrentBuySymbol(buyInitial.symbol);
    if (buyInitial?.quantity) setCurrentBuyQuantity(buyInitial.quantity);
    if (buyInitial?.price) setCurrentBuyPrice(buyInitial.price);
  }, [buyInitial]);

  useEffect(() => {
    if (sellInitial?.symbol) setCurrentSellSymbol(sellInitial.symbol);
    else if (sellInitialSymbol) setCurrentSellSymbol(sellInitialSymbol);

    if (sellInitial?.quantity) setCurrentSellQuantity(sellInitial.quantity);
    if (sellInitial?.price) setCurrentSellPrice(sellInitial.price);
  }, [sellInitial, sellInitialSymbol]);

  const handleSwitch = (type) => {
    setActiveType(type);
    if (onTypeChange) {
      onTypeChange(type);
    }
  };

  // Callback khi chọn mã mua từ sidebar hoặc chip
  const handleSelectBuyFromSidebar = (symbol, price) => {
    setCurrentBuySymbol(symbol);
    const resolvedPrice = price !== undefined
      ? String(price)
      : (marketPrices[symbol]?.price ? String(marketPrices[symbol].price / 1000) : '');
    if (resolvedPrice) {
      setCurrentBuyPrice(resolvedPrice);
    }
    if (activeType !== 'buy') {
      handleSwitch('buy');
    }
    // Đóng drawer trên mobile nếu đang mở
    setShowMobileContext(false);
  };

  // Callback khi chọn mã bán từ sidebar hoặc chip
  const handleSelectSellFromSidebar = (symbol, qty, price) => {
    setCurrentSellSymbol(symbol);
    if (qty) {
      setCurrentSellQuantity(qty);
    }
    const resolvedPrice = price !== undefined
      ? String(price)
      : (marketPrices[symbol]?.price ? String(marketPrices[symbol].price / 1000) : '');
    if (resolvedPrice) {
      setCurrentSellPrice(resolvedPrice);
    }
    if (activeType !== 'sell') {
      handleSwitch('sell');
    }
    setShowMobileContext(false);
  };

  const handleBuySuccess = () => {
    showToast('✅ Khớp lệnh mua thành công!', 'success');
    if (onBuySuccess) onBuySuccess();
    else if (onSuccess) onSuccess();
  };

  const handleSellSuccess = () => {
    showToast('✅ Khớp lệnh bán thành công!', 'success');
    if (onSellSuccess) onSellSuccess();
    else if (onSuccess) onSuccess();
  };

  const handleDividendSuccess = () => {
    showToast('✅ Cập nhật cổ tức thành công!', 'success');
    if (onDividendSuccess) onDividendSuccess();
    else if (onSuccess) onSuccess();
  };

  // Số lượng mã khả dụng để bán
  const availableToSellCount = useMemo(() => {
    return portfolio.filter(p => p.totalQty > 0).length;
  }, [portfolio]);

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 space-y-5 sm:space-y-6">
      {/* 1. THANH ĐIỀU HƯỚNG GỘP (SEGMENTED CONTROL MUA / BÁN / CỔ TỨC) */}
      <div className="bg-white dark:bg-slate-900 p-1.5 sm:p-2 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-1.5 sm:gap-2">
        {/* Nút Mua Vào */}
        <button
          type="button"
          onClick={() => handleSwitch('buy')}
          className={`flex-1 py-3 px-2 sm:px-4 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${activeType === 'buy'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/20'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800/60'
            }`}
        >
          <span className="text-base sm:text-lg">🛒</span>
          <span>Mua Vào</span>
          <span
            className={`hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-bold ${activeType === 'buy'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
              }`}
          >
            {portfolio.length} mã
          </span>
        </button>

        {/* Nút Bán Ra */}
        <button
          type="button"
          onClick={() => handleSwitch('sell')}
          className={`flex-1 py-3 px-2 sm:px-4 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${activeType === 'sell'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-500/20'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800/60'
            }`}
        >
          <span className="text-base sm:text-lg">💸</span>
          <span>Bán Ra</span>
          <span
            className={`hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-bold ${activeType === 'sell'
                ? 'bg-white/20 text-white'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
              }`}
          >
            {availableToSellCount} khả dụng
          </span>
        </button>

        {/* Nút Cổ Tức */}
        <button
          type="button"
          onClick={() => handleSwitch('dividend')}
          className={`flex-1 py-3 px-2 sm:px-4 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${activeType === 'dividend'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-2 ring-amber-400/20'
              : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-800/60'
            }`}
        >
          <span className="text-base sm:text-lg">🎁</span>
          <span>Cổ Tức</span>
          <span
            className={`hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-bold ${activeType === 'dividend'
                ? 'bg-white/20 text-white'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
              }`}
          >
            {dividends.length} đợt
          </span>
        </button>
      </div>

      {/* 2. THANH TOGGLE DANH MỤC TRÊN MOBILE (<1024px) */}
      <div className="block lg:hidden">
        <button
          type="button"
          onClick={() => setShowMobileContext(prev => !prev)}
          className="w-full py-2.5 px-4 rounded-2xl bg-gray-50 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-between text-xs font-bold text-gray-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs"
        >
          <span className="flex items-center gap-2">
            <span>📋</span>
            <span>
              {activeType === 'buy' && `Danh Mục Nắm Giữ & Gợi Ý (${portfolio.length} mã)`}
              {activeType === 'sell' && `Cổ Phiếu Có Thể Bán (${availableToSellCount} mã)`}
              {activeType === 'dividend' && `Cẩm Nang & Quy Tắc Cổ Tức`}
            </span>
          </span>
          <span className="text-xs">{showMobileContext ? '▲ Thu gọn' : '▼ Xem chi tiết'}</span>
        </button>

        {showMobileContext && (
          <div className="mt-3 animate-fadeIn">
            <TradeSidebarContext
              activeType={activeType}
              portfolio={portfolio}
              watchlist={watchlist}
              dividends={dividends}
              marketPrices={marketPrices}
              onSelectBuy={handleSelectBuyFromSidebar}
              onSelectSell={handleSelectSellFromSidebar}
            />
          </div>
        )}
      </div>

      {/* 3. BỐ CỤC 2 CỘT CHUYÊN NGHIỆP TRÊN DESKTOP (≥ 1024px) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cột Trái (Sidebar Context): Ẩn trên mobile/tablet, hiện trên desktop */}
        <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-4">
          <TradeSidebarContext
            activeType={activeType}
            portfolio={portfolio}
            watchlist={watchlist}
            dividends={dividends}
            marketPrices={marketPrices}
            onSelectBuy={handleSelectBuyFromSidebar}
            onSelectSell={handleSelectSellFromSidebar}
          />
        </div>

        {/* Cột Phải: Form Nhật Ký Tương Ứng */}
        <div className="lg:col-span-7 xl:col-span-8">
          {activeType === 'buy' && (
            <BuyForm
              onSuccess={handleBuySuccess}
              initialSymbol={currentBuySymbol}
              initialQuantity={currentBuyQuantity}
              initialPrice={currentBuyPrice}
              portfolio={portfolio}
              watchlist={watchlist}
              marketPrices={marketPrices}
            />
          )}

          {activeType === 'sell' && (
            <SellForm
              onSuccess={handleSellSuccess}
              portfolio={portfolio}
              initialSymbol={currentSellSymbol}
              initialQuantity={currentSellQuantity}
              initialPrice={currentSellPrice}
              marketPrices={marketPrices}
            />
          )}

          {activeType === 'dividend' && (
            <DividendManager
              dividends={dividends}
              portfolio={portfolio}
              onSuccess={handleDividendSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}
