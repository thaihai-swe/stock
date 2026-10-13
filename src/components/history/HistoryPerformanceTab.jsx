import { useState, useMemo } from 'react';
import { fmtMoney, plColor, plBg, getStockColor } from '../../utils/format.js';
import { computeStockPerformance } from '../../utils/stockAnalytics.js';

export default function HistoryPerformanceTab({
  data = {},
  marketPrices = {},
  onSelectSymbol,
  timePreset = 'all',
  handleSelectTimePreset,
  startDate = '',
  endDate = '',
}) {
  const { buyOrders = [], sellOrders = [], dividends = [] } = data;

  const [textSearch, setTextSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'holding' | 'closed'
  const [pnlFilter, setPnlFilter] = useState('all'); // 'all' | 'profit' | 'loss'
  const [sortField, setSortField] = useState('cumulativePL');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const [mobileViewMode, setMobileViewMode] = useState('card'); // 'card' | 'table'

  // Tính toán toàn bộ chỉ số từ engine theo chu kỳ thời gian
  const performanceData = useMemo(() => {
    return computeStockPerformance(buyOrders, sellOrders, dividends, marketPrices, { startDate, endDate });
  }, [buyOrders, sellOrders, dividends, marketPrices, startDate, endDate]);

  const {
    stockList,
    topProfitStock,
    topLossStock,
    topDividendStock,
    totalAllCumulativePL,
    overallWinRate,
    holdingSymbolsCount,
    closedSymbolsCount,
  } = performanceData;

  // Lọc dữ liệu
  const filtered = useMemo(() => {
    return stockList.filter(s => {
      // Tìm kiếm theo mã cổ phiếu
      const sym = s.symbol.toUpperCase();
      const matchSearch = !textSearch || sym.includes(textSearch.trim().toUpperCase());

      if (!matchSearch) return false;

      // Lọc theo trạng thái
      if (statusFilter === 'holding' && !s.isHolding) return false;
      if (statusFilter === 'closed' && s.isHolding) return false;

      // Lọc theo Lãi / Lỗ tích luỹ
      if (pnlFilter === 'profit' && s.cumulativePL <= 0) return false;
      if (pnlFilter === 'loss' && s.cumulativePL >= 0) return false;

      return true;
    });
  }, [stockList, textSearch, statusFilter, pnlFilter]);

  // Sắp xếp
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA, valB;

      switch (sortField) {
        case 'symbol':
          valA = a.symbol;
          valB = b.symbol;
          break;
        case 'status':
          valA = a.isHolding ? 1 : 0;
          valB = b.isHolding ? 1 : 0;
          break;
        case 'totalInvested':
          valA = a.totalInvested;
          valB = b.totalInvested;
          break;
        case 'realizedPL':
          valA = a.realizedPL;
          valB = b.realizedPL;
          break;
        case 'unrealizedPL':
          valA = a.unrealizedPL;
          valB = b.unrealizedPL;
          break;
        case 'cashDividends':
          valA = a.cashDividends;
          valB = b.cashDividends;
          break;
        case 'roiPct':
          valA = a.roiPct;
          valB = b.roiPct;
          break;
        case 'winRate':
          valA = a.winRate;
          valB = b.winRate;
          break;
        case 'cumulativePL':
        default:
          valA = a.cumulativePL;
          valB = b.cumulativePL;
          break;
      }

      if (typeof valA === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [filtered, sortField, sortDirection]);

  function handleSort(field) {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  }

  function renderSortIcon(field) {
    if (sortField !== field) {
      return <span className="text-gray-300 dark:text-slate-600 text-xs ml-1 font-mono">⇅</span>;
    }
    return (
      <span className="text-indigo-600 dark:text-indigo-400 text-xs ml-1 font-bold">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  }

  if (buyOrders.length === 0 && sellOrders.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
        <span className="text-5xl block mb-3">📊</span>
        <p className="text-base font-extrabold text-gray-700 dark:text-slate-200">Chưa có dữ liệu giao dịch</p>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
          Nhập các lệnh mua hoặc bán để hệ thống tự động sinh Sổ hiệu suất FIFO tổng hợp lãi/lỗ theo từng mã cổ phiếu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. THẺ BENTO TÓM TẮT NỔI BẬT (HIGHLIGHTS) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Top Profit */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
              <span>🏆</span> Lời Nhất
            </span>
            <span className="text-base">📈</span>
          </div>
          {topProfitStock ? (
            <div
              onClick={() => onSelectSymbol && onSelectSymbol(topProfitStock.symbol)}
              className="cursor-pointer group"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-base text-gray-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {topProfitStock.symbol}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                  +{topProfitStock.roiPct}% ROI
                </span>
              </div>
              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                +{fmtMoney(topProfitStock.cumulativePL)}đ
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-1">—</p>
          )}
        </div>

        {/* Top Loss */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-rose-200 dark:hover:border-rose-900/50 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-400 flex items-center gap-1.5">
              <span>⚠️</span> Lỗ Nhất
            </span>
            <span className="text-base">📉</span>
          </div>
          {topLossStock ? (
            <div
              onClick={() => onSelectSymbol && onSelectSymbol(topLossStock.symbol)}
              className="cursor-pointer group"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-base text-gray-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {topLossStock.symbol}
                </span>
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/40">
                  {topLossStock.roiPct}% ROI
                </span>
              </div>
              <p className="text-sm font-black text-rose-600 dark:text-rose-400 mt-1 truncate">
                {fmtMoney(topLossStock.cumulativePL)}đ
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Không có mã lỗ 🎉</p>
          )}
        </div>

        {/* Top Dividend */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-amber-200 dark:hover:border-amber-900/50 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
              <span>🎁</span> Vua Cổ Tức
            </span>
            <span className="text-base">💰</span>
          </div>
          {topDividendStock ? (
            <div
              onClick={() => onSelectSymbol && onSelectSymbol(topDividendStock.symbol)}
              className="cursor-pointer group"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-base text-gray-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {topDividendStock.symbol}
                </span>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
                  {topDividendStock.divCount} đợt nhận
                </span>
              </div>
              <p className="text-sm font-black text-amber-600 dark:text-amber-400 mt-1 truncate">
                +{fmtMoney(topDividendStock.cashDividends)}đ
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Chưa có cổ tức</p>
          )}
        </div>

        {/* Overall Cumulative PL */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-400 flex items-center gap-1.5">
              <span>🎯</span> Tổng Lãi Tích Luỹ
            </span>
            <span className="text-base">⚖️</span>
          </div>
          <div>
            <span className={`text-base sm:text-lg font-black block truncate ${plColor(totalAllCumulativePL)}`}>
              {totalAllCumulativePL >= 0 ? '+' : ''}{fmtMoney(totalAllCumulativePL)}đ
            </span>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
              Win Rate: <b className="text-indigo-600 dark:text-indigo-400">{overallWinRate}%</b> ({holdingSymbolsCount} đang giữ)
            </p>
          </div>
        </div>
      </div>

      {/* 2. THANH BỘ LỌC DỮ LIỆU HIỆU SUẤT */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-gray-100 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-gray-800 dark:text-slate-100 text-sm sm:text-base flex items-center gap-2">
              <span>🎯</span> Sổ Hiệu Suất Theo Mã Cổ Phiếu
            </h3>
            <span className="text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-bold border border-indigo-100 dark:border-indigo-900/40">
              {stockList.length} mã
            </span>
            {(startDate || endDate) && (
              <span className="text-[11px] bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-bold border border-amber-200 dark:border-amber-800/40 flex items-center gap-1">
                <span>⏱️</span>
                <span>
                  {timePreset === 'ytd' ? 'Năm nay (YTD)' : timePreset === '1y' ? '1 Năm gần nhất' : timePreset === 'mtd' ? 'Tháng này (MTD)' : `${startDate} → ${endDate}`}
                </span>
              </span>
            )}
          </div>

          {/* Ô Tìm Kiếm */}
          <div className="relative">
            <input
              type="text"
              value={textSearch}
              onChange={e => setTextSearch(e.target.value)}
              placeholder="🔍 Tìm mã cổ phiếu..."
              className="w-full sm:w-56 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs uppercase font-bold text-gray-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 pr-7"
            />
            {textSearch && (
              <button
                type="button"
                onClick={() => setTextSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Bộ lọc chu kỳ thời gian, trạng thái & P&L */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Presets Chu Kỳ Thời Gian (Toàn thời gian / YTD / 1Y / MTD) */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => handleSelectTimePreset && handleSelectTimePreset('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  timePreset === 'all' || (!startDate && !endDate && timePreset !== 'custom')
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'
                }`}
              >
                <span className="sm:hidden">Tất cả</span>
                <span className="hidden sm:inline">Toàn thời gian</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectTimePreset && handleSelectTimePreset('ytd')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  timePreset === 'ytd'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'
                }`}
              >
                YTD
              </button>
              <button
                type="button"
                onClick={() => handleSelectTimePreset && handleSelectTimePreset('1y')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  timePreset === '1y'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'
                }`}
              >
                1Y
              </button>
              <button
                type="button"
                onClick={() => handleSelectTimePreset && handleSelectTimePreset('mtd')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  timePreset === 'mtd'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'
                }`}
              >
                MTD
              </button>
            </div>

            {/* Lọc Trạng Thái */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 shadow-2xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'
                }`}
              >
                Tất cả ({stockList.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('holding')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  statusFilter === 'holding' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'
                }`}
              >
                🟢 Đang giữ ({holdingSymbolsCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('closed')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  statusFilter === 'closed' ? 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 shadow-2xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-800'
                }`}
              >
                ⚪ Đã tất toán ({closedSymbolsCount})
              </button>
            </div>

            {/* Lọc P&L */}
            <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setPnlFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  pnlFilter === 'all' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 shadow-2xs' : 'text-gray-500 dark:text-slate-400'
                }`}
              >
                Tất cả P&L
              </button>
              <button
                type="button"
                onClick={() => setPnlFilter('profit')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  pnlFilter === 'profit' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 dark:text-emerald-400'
                }`}
              >
                Có lời (+)
              </button>
              <button
                type="button"
                onClick={() => setPnlFilter('loss')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  pnlFilter === 'loss' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                Thua lỗ (-)
              </button>
            </div>
          </div>

          {/* Toggle Thẻ / Bảng */}
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl">
            <button
              type="button"
              onClick={() => setMobileViewMode('card')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                mobileViewMode === 'card'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              📱 Thẻ
            </button>
            <button
              type="button"
              onClick={() => setMobileViewMode('table')}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                mobileViewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              📊 Bảng
            </button>
          </div>
        </div>
      </div>

      {/* 3. NỘI DUNG HIỂN THỊ */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        {/* CHẾ ĐỘ THẺ DI ĐỘNG (MOBILE CARD VIEW) */}
        <div className={`p-4 space-y-3 ${mobileViewMode === 'card' ? 'block sm:hidden' : 'hidden'}`}>
          {sorted.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-slate-500">
              <span className="text-3xl block mb-2">🔍</span>
              <p className="text-xs font-bold text-gray-700 dark:text-slate-300">Không tìm thấy mã cổ phiếu phù hợp</p>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">Thử thay đổi bộ lọc chu kỳ thời gian hoặc từ khóa tìm kiếm.</p>
            </div>
          ) : (
            sorted.map((s) => {
            const stockColor = getStockColor(s.symbol);

            return (
              <div
                key={s.symbol}
                onClick={() => onSelectSymbol && onSelectSymbol(s.symbol)}
                className="bg-gray-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/60 rounded-2xl p-4 transition-all shadow-xs cursor-pointer space-y-3"
              >
                {/* Header Thẻ: Mã CP, Trạng thái & P&L Tích Luỹ */}
                <div className="flex items-center justify-between pb-2.5 border-b border-gray-200/60 dark:border-slate-700/60 gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs border shrink-0"
                      style={{
                        backgroundColor: `${stockColor}15`,
                        borderColor: `${stockColor}40`,
                        color: stockColor,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0" style={{ backgroundColor: stockColor }} />
                      {s.symbol}
                    </span>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        s.isHolding
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600'
                      }`}
                    >
                      {s.isHolding ? '🟢 Đang giữ' : '⚪ Đã tất toán'}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-sm font-black ${plColor(s.cumulativePL)}`}>
                      {s.cumulativePL >= 0 ? '+' : ''}{fmtMoney(s.cumulativePL)}đ
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full inline-block ${plBg(s.cumulativePL)}`}>
                      {s.roiPct >= 0 ? '▲ +' : '▼ '}{s.roiPct}% ROI
                    </span>
                  </div>
                </div>

                {/* Lưới 2x2 Thông Số Chi Tiết */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                  <div>
                    <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Tổng vốn mua</span>
                    <span className="font-bold text-gray-800 dark:text-slate-200 text-sm mt-0.5 block">
                      {fmtMoney(s.totalInvested)}đ
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Lãi đã chốt</span>
                    <span className={`font-bold text-sm mt-0.5 block ${plColor(s.realizedPL)}`}>
                      {s.realizedPL >= 0 ? '+' : ''}{fmtMoney(s.realizedPL)}đ
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Lãi tạm tính</span>
                    <span className={`font-bold text-xs mt-0.5 block ${s.isHolding ? plColor(s.unrealizedPL) : 'text-gray-400'}`}>
                      {s.isHolding ? `${s.unrealizedPL >= 0 ? '+' : ''}${fmtMoney(s.unrealizedPL)}đ` : '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Cổ tức tiền mặt</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-xs mt-0.5 block">
                      +{fmtMoney(s.cashDividends)}đ
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-gray-400 dark:text-slate-500">Tỷ lệ thắng lệnh chốt:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{s.winRate}%</span>
                </div>
              </div>
            );
          }))}
        </div>

        {/* CHẾ ĐỘ BẢNG MÁY TÍNH (DESKTOP TABLE VIEW) */}
        <div className={`overflow-x-auto ${mobileViewMode === 'card' ? 'hidden sm:block' : 'block'}`}>
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50/90 dark:bg-slate-950 text-gray-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-gray-100 dark:border-slate-800 select-none">
              <tr>
                {/* Mã CP - Sticky Left */}
                <th
                  onClick={() => handleSort('symbol')}
                  className="px-5 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group sticky left-0 bg-gray-50 dark:bg-slate-950 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]"
                >
                  <div className="inline-flex items-center">
                    <span className={sortField === 'symbol' ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''}>Mã CP</span>
                    {renderSortIcon('symbol')}
                  </div>
                </th>

                {/* Trạng Thái */}
                <th onClick={() => handleSort('status')} className="px-4 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group">
                  <div className="inline-flex items-center">
                    <span>Trạng Thái {renderSortIcon('status')}</span>
                  </div>
                </th>

                {/* Tổng Vốn Mua */}
                <th onClick={() => handleSort('totalInvested')} className="text-right px-4 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group">
                  <div className="inline-flex items-center justify-end w-full">
                    <span>Tổng Vốn Mua {renderSortIcon('totalInvested')}</span>
                  </div>
                </th>

                {/* Lãi Chốt */}
                <th onClick={() => handleSort('realizedPL')} className="text-right px-4 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group">
                  <div className="inline-flex items-center justify-end w-full">
                    <span>Lãi Đã Chốt {renderSortIcon('realizedPL')}</span>
                  </div>
                </th>

                {/* Lãi Tạm Tính */}
                <th onClick={() => handleSort('unrealizedPL')} className="text-right px-4 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group">
                  <div className="inline-flex items-center justify-end w-full">
                    <span>Lãi Tạm Tính {renderSortIcon('unrealizedPL')}</span>
                  </div>
                </th>

                {/* Cổ Tức */}
                <th onClick={() => handleSort('cashDividends')} className="text-right px-4 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group">
                  <div className="inline-flex items-center justify-end w-full">
                    <span>Cổ Tức {renderSortIcon('cashDividends')}</span>
                  </div>
                </th>

                {/* P&L Tích Luỹ */}
                <th onClick={() => handleSort('cumulativePL')} className="text-right px-5 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group bg-indigo-50/40 dark:bg-slate-800/40">
                  <div className="inline-flex items-center justify-end w-full font-black text-indigo-900 dark:text-indigo-300">
                    <span>🎯 P&L Tích Luỹ {renderSortIcon('cumulativePL')}</span>
                  </div>
                </th>

                {/* ROI % */}
                <th onClick={() => handleSort('roiPct')} className="text-right px-4 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group">
                  <div className="inline-flex items-center justify-end w-full">
                    <span>ROI % {renderSortIcon('roiPct')}</span>
                  </div>
                </th>

                {/* Win Rate */}
                <th onClick={() => handleSort('winRate')} className="text-right px-4 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group">
                  <div className="inline-flex items-center justify-end w-full">
                    <span>Win Rate {renderSortIcon('winRate')}</span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400 dark:text-slate-500 text-xs">
                    <span className="text-3xl block mb-2">🔍</span>
                    <p className="font-bold text-gray-700 dark:text-slate-300">Không tìm thấy mã cổ phiếu phù hợp bộ lọc</p>
                    <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">Thử thay đổi bộ lọc chu kỳ thời gian hoặc từ khóa tìm kiếm.</p>
                  </td>
                </tr>
              ) : (
                sorted.map((s) => {
                const stockColor = getStockColor(s.symbol);

                return (
                  <tr
                    key={s.symbol}
                    className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Mã CP - Sticky Left */}
                    <td className="px-5 py-3.5 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-indigo-50/50 dark:group-hover:bg-slate-800/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                      <button
                        type="button"
                        onClick={() => onSelectSymbol && onSelectSymbol(s.symbol)}
                        className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs border transition-transform group-hover:scale-105 cursor-pointer"
                        style={{
                          backgroundColor: `${stockColor}15`,
                          borderColor: `${stockColor}40`,
                          color: stockColor,
                        }}
                        title={`Xem sổ cái tích luỹ ${s.symbol}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0" style={{ backgroundColor: stockColor }} />
                        {s.symbol}
                      </button>
                    </td>

                    {/* Trạng Thái */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          s.isHolding
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600'
                        }`}
                      >
                        {s.isHolding ? '🟢 Đang giữ' : '⚪ Đã tất toán'}
                      </span>
                    </td>

                    {/* Tổng Vốn Mua */}
                    <td className="px-4 py-3.5 text-right font-bold text-gray-800 dark:text-slate-200">
                      {fmtMoney(s.totalInvested)}đ
                    </td>

                    {/* Lãi Đã Chốt */}
                    <td className={`px-4 py-3.5 text-right font-bold ${plColor(s.realizedPL)}`}>
                      {s.realizedPL !== 0 ? `${s.realizedPL >= 0 ? '+' : ''}${fmtMoney(s.realizedPL)}đ` : '—'}
                    </td>

                    {/* Lãi Tạm Tính */}
                    <td className="px-4 py-3.5 text-right font-bold">
                      {s.isHolding ? (
                        <span className={plColor(s.unrealizedPL)}>
                          {s.unrealizedPL >= 0 ? '+' : ''}{fmtMoney(s.unrealizedPL)}đ
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-slate-600">—</span>
                      )}
                    </td>

                    {/* Cổ Tức */}
                    <td className="px-4 py-3.5 text-right font-bold text-amber-600 dark:text-amber-400">
                      {s.cashDividends > 0 ? `+${fmtMoney(s.cashDividends)}đ` : '—'}
                    </td>

                    {/* P&L Tích Luỹ */}
                    <td className="px-5 py-3.5 text-right bg-indigo-50/20 dark:bg-slate-800/20">
                      <span className={`font-black text-xs ${plColor(s.cumulativePL)}`}>
                        {s.cumulativePL >= 0 ? '+' : ''}{fmtMoney(s.cumulativePL)}đ
                      </span>
                    </td>

                    {/* ROI % */}
                    <td className="px-4 py-3.5 text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${plBg(s.cumulativePL)}`}>
                        {s.roiPct >= 0 ? '▲ +' : '▼ '}{s.roiPct}%
                      </span>
                    </td>

                    {/* Win Rate */}
                    <td className="px-4 py-3.5 text-right font-bold text-indigo-600 dark:text-indigo-400">
                      {s.winRate}%
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {/* Footer tổng kết */}
        <div className="px-5 sm:px-6 py-3.5 bg-gray-50/90 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
          <span>
            Hiển thị <b>{sorted.length}</b> / {stockList.length} mã cổ phiếu
          </span>
          <div className="flex items-center gap-2">
            <span>Tổng P&L Tích Luỹ:</span>
            <span className={`font-black text-sm ${plColor(totalAllCumulativePL)}`}>
              {totalAllCumulativePL >= 0 ? '+' : ''}{fmtMoney(totalAllCumulativePL)}đ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
