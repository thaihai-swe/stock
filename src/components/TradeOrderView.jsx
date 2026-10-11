import { useEffect, useState } from 'react';
import BuyForm from './BuyForm.jsx';
import SellForm from './SellForm.jsx';
import DividendManager from './DividendManager.jsx';

export default function TradeOrderView({
  initialType = 'buy',
  onTypeChange,
  portfolio = [],
  dividends = [],
  buyInitial = { symbol: '', quantity: '', price: '' },
  sellInitialSymbol = '',
  onSuccess,
  onBuySuccess,
  onSellSuccess,
  onDividendSuccess,
}) {
  const [activeType, setActiveType] = useState(initialType || 'buy');

  useEffect(() => {
    if (initialType) {
      setActiveType(initialType);
    }
  }, [initialType]);

  const handleSwitch = (type) => {
    setActiveType(type);
    if (onTypeChange) {
      onTypeChange(type);
    }
  };

  const handleBuySuccess = onBuySuccess || onSuccess;
  const handleSellSuccess = onSellSuccess || onSuccess;
  const handleDividendSuccess = onDividendSuccess || onSuccess;

  return (
    <div className={`mx-auto space-y-4 transition-all duration-300 ${
      activeType === 'dividend' ? 'max-w-5xl' : 'max-w-xl'
    }`}>
      {/* 1. THANH ĐIỀU HƯỚNG GỘP (SEGMENTED CONTROL MUA / BÁN / CỔ TỨC) */}
      <div className="bg-white dark:bg-gray-800 p-1.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleSwitch('buy')}
          className={`flex-1 py-3 px-2 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
            activeType === 'buy'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <span className="text-base sm:text-lg">🛒</span>
          <span>Mua Vào</span>
          <span
            className={`hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              activeType === 'buy'
                ? 'bg-emerald-500/50 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            Tích lũy
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitch('sell')}
          className={`flex-1 py-3 px-2 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
            activeType === 'sell'
              ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-rose-500'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <span className="text-base sm:text-lg">💸</span>
          <span>Bán Ra</span>
          <span
            className={`hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              activeType === 'sell'
                ? 'bg-rose-500/50 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            Chốt lời/Lỗ
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitch('dividend')}
          className={`flex-1 py-3 px-2 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
            activeType === 'dividend'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 ring-1 ring-amber-400'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          }`}
        >
          <span className="text-base sm:text-lg">🎁</span>
          <span>Cổ Tức</span>
          <span
            className={`hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${
              activeType === 'dividend'
                ? 'bg-amber-400/50 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            Tiền & CP
          </span>
        </button>
      </div>

      {/* 2. NỘI DUNG FORM TƯƠNG ỨNG */}
      <div className="transition-all duration-200">
        {activeType === 'buy' && (
          <BuyForm
            onSuccess={handleBuySuccess}
            initialSymbol={buyInitial?.symbol}
            initialQuantity={buyInitial?.quantity}
            initialPrice={buyInitial?.price}
          />
        )}
        {activeType === 'sell' && (
          <SellForm
            onSuccess={handleSellSuccess}
            portfolio={portfolio}
            initialSymbol={sellInitialSymbol}
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
  );
}
