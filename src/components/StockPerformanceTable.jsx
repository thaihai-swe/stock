import { useState, useMemo } from 'react';
import { fmtMoney, plColor, plBg, getStockColor } from '../utils/format.js';
import { computeStockPerformance } from '../utils/stockAnalytics.js';

export default function StockPerformanceTable({
  data = {},
  marketPrices = {},
  onSelectSymbol,
}) {
  const { buyOrders = [], sellOrders = [], dividends = [] } = data;

  const [textSearch, setTextSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'holding' | 'closed'
  const [pnlFilter, setPnlFilter] = useState('all'); // 'all' | 'profit' | 'loss'
  const [sortField, setSortField] = useState('cumulativePL');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const [mobileViewMode, setMobileViewMode] = useState('card'); // 'card' | 'table'

  // Tính toán toàn bộ chỉ số từ engine
  const performanceData = useMemo(() => {
    return computeStockPerformance(buyOrders, sellOrders, dividends, marketPrices);
  }, [buyOrders, sellOrders, dividends, marketPrices]);

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
      return <span className="text-gray-300 text-xs ml-1 font-normal opacity-0 group-hover:opacity-100">↕</span>;
    }
    return (
      <span className="text-indigo-600 text-xs ml-1 font-bold">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  }

  if (stockList.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
        <span className="text-5xl block mb-3">📊</span>
        <p className="text-base font-semibold text-gray-700">Chưa có dữ liệu giao dịch</p>
        <p className="text-xs text-gray-400 mt-1">
          Hãy nhập các lệnh mua hoặc bán để hệ thống tổng hợp hiệu suất lãi/lỗ theo từng mã cổ phiếu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 1. Thẻ Tóm Tắt Nổi Bật (Highlights) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Top Profit */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              🏆 Lời Nhất
            </span>
            <span className="text-base">📈</span>
          </div>
          {topProfitStock ? (
            <div
              onClick={() => onSelectSymbol && onSelectSymbol(topProfitStock.symbol)}
              className="cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {topProfitStock.symbol}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  +{topProfitStock.roiPct}% ROI
                </span>
              </div>
              <p className="text-sm font-bold text-emerald-600 mt-0.5">
                +{fmtMoney(topProfitStock.cumulativePL)}đ
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-1">—</p>
          )}
        </div>

        {/* Top Loss */}
        <div className="bg-white rounded-2xl p-4 border border-rose-100 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
              ⚠️ Lỗ Nhất
            </span>
            <span className="text-base">📉</span>
          </div>
          {topLossStock ? (
            <div
              onClick={() => onSelectSymbol && onSelectSymbol(topLossStock.symbol)}
              className="cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {topLossStock.symbol}
                </span>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-200">
                  {topLossStock.roiPct}% ROI
                </span>
              </div>
              <p className="text-sm font-bold text-rose-600 mt-0.5">
                {fmtMoney(topLossStock.cumulativePL)}đ
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Không có mã lỗ 🎉</p>
          )}
        </div>

        {/* Top Dividend */}
        <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              🎁 Vua Cổ Tức
            </span>
            <span className="text-base">💰</span>
          </div>
          {topDividendStock ? (
            <div
              onClick={() => onSelectSymbol && onSelectSymbol(topDividendStock.symbol)}
              className="cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {topDividendStock.symbol}
                </span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                  {topDividendStock.divCount} lần nhận
                </span>
              </div>
              <p className="text-sm font-bold text-amber-700 mt-0.5">
                +{fmtMoney(topDividendStock.cashDividends)}đ
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-1">Chưa có cổ tức</p>
          )}
        </div>

        {/* Overall Cumulative PL */}
        <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900">
              🎯 Tổng Lãi Tích Luỹ
            </span>
            <span className="text-base">⚖️</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-base font-black ${plColor(totalAllCumulativePL)}`}>
              {totalAllCumulativePL >= 0 ? '+' : ''}{fmtMoney(totalAllCumulativePL)}đ
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Win Rate chốt lời: <b className="text-indigo-600">{overallWinRate}%</b> ({holdingSymbolsCount} đang giữ)
          </p>
        </div>
      </div>

      {/* 2. Thanh Công Cụ & Bộ Lọc Dữ Liệu (Toolbar & Filters) */}
      <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-2xs space-y-3">
        {/* Hàng 1: Tiêu đề & Ô Tìm Kiếm */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <span>🎯</span> Sổ Hiệu Suất Theo Mã (FIFO Cumulative P&L)
            </span>
          </div>

          {/* Ô Tìm Kiếm */}
          <div className="relative">
            <input
              type="text"
              value={textSearch}
              onChange={e => setTextSearch(e.target.value)}
              placeholder="🔍 Tìm mã cổ phiếu..."
              className="px-3 py-1.5 pl-8 border border-gray-200 rounded-xl text-xs uppercase font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44 sm:w-56"
            />
            <span className="absolute left-2.5 top-1.5 text-xs text-gray-400">🔍</span>
            {textSearch && (
              <button
                type="button"
                onClick={() => setTextSearch('')}
                className="absolute right-2 top-1.5 text-xs text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Hàng 2: Bộ lọc trạng thái, P&L & Chuyển đổi Card/Table mobile */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Lọc Trạng Thái */}
            <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-800 font-medium'
                }`}
              >
                Tất cả ({stockList.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('holding')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'holding' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-800 font-medium'
                }`}
              >
                🟢 Đang giữ ({holdingSymbolsCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('closed')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'closed' ? 'bg-white text-gray-700 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-800 font-medium'
                }`}
              >
                ⚪ Đã tất toán ({closedSymbolsCount})
              </button>
            </div>

            {/* Lọc Lãi / Lỗ */}
            <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setPnlFilter('all')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  pnlFilter === 'all' ? 'bg-white text-gray-900 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-800 font-medium'
                }`}
              >
                Toàn bộ P&L
              </button>
              <button
                type="button"
                onClick={() => setPnlFilter('profit')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  pnlFilter === 'profit' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-800 font-medium'
                }`}
              >
                Có lời (+)
              </button>
              <button
                type="button"
                onClick={() => setPnlFilter('loss')}
                className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                  pnlFilter === 'loss' ? 'bg-white text-rose-700 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-800 font-medium'
                }`}
              >
                Thua lỗ (-)
              </button>
            </div>
          </div>

          {/* Toggle Thẻ / Bảng cho Mobile */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              Hiển thị <b>{sorted.length}</b> / {stockList.length} mã
            </span>

            <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl border border-gray-200/60 sm:hidden">
              <button
                type="button"
                onClick={() => setMobileViewMode('card')}
                className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                  mobileViewMode === 'card'
                    ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-700 font-medium'
                }`}
              >
                📱 Thẻ
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode('table')}
                className={`px-2.5 py-1 text-xs rounded-lg transition-all ${
                  mobileViewMode === 'table'
                    ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-700 font-medium'
                }`}
              >
                📊 Bảng
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BẢNG HIỆU SUẤT GIAO DỊCH (LÃI LỖ TÍCH LUỸ THEO CHUẨN FIFO) */}
      {/* Mobile Card View */}
      <div className={`sm:hidden space-y-3 ${mobileViewMode === 'card' ? 'block' : 'hidden'}`}>
        {sorted.map(s => {
          const stockColor = getStockColor(s.symbol, stockList);
          const isProfit = s.cumulativePL >= 0;

          return (
            <div
              key={`perf-card-${s.symbol}`}
              onClick={() => onSelectSymbol && onSelectSymbol(s.symbol)}
              className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold border shadow-2xs"
                    style={{
                      backgroundColor: `${stockColor}15`,
                      borderColor: `${stockColor}40`,
                      color: stockColor,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full mr-1.5 shrink-0"
                      style={{ backgroundColor: stockColor }}
                    />
                    {s.symbol}
                  </span>

                  {s.isHolding ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      🟢 Giữ {s.holdingQty.toLocaleString()} cp
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                      ⚪ Đã tất toán
                    </span>
                  )}
                </div>

                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${plBg(s.cumulativePL)}`}>
                  {isProfit ? '▲ +' : '▼ '}{s.roiPct}% ROI
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1 border-t border-gray-100">
                <span className="text-xs text-gray-400 font-medium">Lãi / Lỗ Tích Luỹ:</span>
                <span className={`text-lg font-extrabold ${plColor(s.cumulativePL)}`}>
                  {isProfit ? '+' : ''}{fmtMoney(s.cumulativePL)}đ
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                <div>
                  <span className="text-gray-400 block text-[10px]">Đã chốt</span>
                  <span className={`font-bold ${plColor(s.realizedPL)}`}>
                    {s.realizedPL >= 0 ? '+' : ''}{fmtMoney(s.realizedPL)}đ
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Tạm tính</span>
                  {s.isHolding ? (
                    <span className={`font-bold ${plColor(s.unrealizedPL)}`}>
                      {s.unrealizedPL >= 0 ? '+' : ''}{fmtMoney(s.unrealizedPL)}đ
                    </span>
                  ) : (
                    <span className="text-gray-400 font-medium">—</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Cổ tức</span>
                  <span className="font-bold text-amber-700">
                    +{fmtMoney(s.cashDividends)}đ
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${mobileViewMode === 'card' ? 'hidden sm:block' : 'block'}`}>
        {mobileViewMode === 'table' && (
          <p className="sm:hidden text-[11px] text-indigo-700 px-4 py-1.5 bg-indigo-50/60 border-b border-indigo-100 flex items-center gap-1 font-medium">
            <span>👉</span> Vuốt ngang để xem toàn bộ thông số
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider text-[11px] border-b border-gray-100 select-none">
              <tr>
                <th onClick={() => handleSort('symbol')} className="px-5 py-3.5 cursor-pointer group hover:bg-gray-100/60 sticky left-0 bg-gray-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                  <span className="inline-flex items-center">Mã CP {renderSortIcon('symbol')}</span>
                </th>
                <th onClick={() => handleSort('status')} className="text-center px-4 py-3.5 cursor-pointer group hover:bg-gray-100/60">
                  <span className="inline-flex items-center">Trạng thái {renderSortIcon('status')}</span>
                </th>
                <th onClick={() => handleSort('totalInvested')} className="text-right px-4 py-3.5 cursor-pointer group hover:bg-gray-100/60">
                  <span className="inline-flex items-center">Tổng vốn mua {renderSortIcon('totalInvested')}</span>
                </th>
                <th onClick={() => handleSort('realizedPL')} className="text-right px-4 py-3.5 cursor-pointer group hover:bg-gray-100/60">
                  <span className="inline-flex items-center">Lãi đã chốt {renderSortIcon('realizedPL')}</span>
                </th>
                <th onClick={() => handleSort('unrealizedPL')} className="text-right px-4 py-3.5 cursor-pointer group hover:bg-gray-100/60">
                  <span className="inline-flex items-center">Lãi tạm tính {renderSortIcon('unrealizedPL')}</span>
                </th>
                <th onClick={() => handleSort('cashDividends')} className="text-right px-4 py-3.5 cursor-pointer group hover:bg-gray-100/60">
                  <span className="inline-flex items-center">Cổ tức nhận {renderSortIcon('cashDividends')}</span>
                </th>
                <th onClick={() => handleSort('cumulativePL')} className="text-right px-5 py-3.5 font-extrabold text-indigo-900 bg-indigo-50/50 cursor-pointer group hover:bg-indigo-100/60">
                  <span className="inline-flex items-center">🎯 Lãi Tích Luỹ {renderSortIcon('cumulativePL')}</span>
                </th>
                <th onClick={() => handleSort('roiPct')} className="text-right px-4 py-3.5 cursor-pointer group hover:bg-gray-100/60">
                  <span className="inline-flex items-center">ROI {renderSortIcon('roiPct')}</span>
                </th>
                <th className="text-center px-4 py-3.5 text-gray-400 font-normal">Sổ cái</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-400 text-xs">
                    Không tìm thấy mã cổ phiếu nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                sorted.map(s => {
                  const stockColor = getStockColor(s.symbol, stockList);
                  const isProfit = s.cumulativePL >= 0;

                  return (
                    <tr
                      key={s.symbol}
                      onClick={() => onSelectSymbol && onSelectSymbol(s.symbol)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4 sticky left-0 bg-white group-hover:bg-indigo-50/60 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold shadow-2xs border transition-transform group-hover:scale-105"
                          style={{
                            backgroundColor: `${stockColor}15`,
                            borderColor: `${stockColor}40`,
                            color: stockColor,
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full mr-1.5 shrink-0"
                            style={{ backgroundColor: stockColor }}
                          />
                          {s.symbol}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-center">
                        {s.isHolding ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Giữ {s.holdingQty.toLocaleString()} cp
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                            Đã tất toán
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold text-gray-800">
                        {fmtMoney(s.totalInvested)}đ
                      </td>

                      <td className={`px-4 py-4 text-right font-bold ${plColor(s.realizedPL)}`}>
                        {s.realizedPL >= 0 ? '+' : ''}{fmtMoney(s.realizedPL)}đ
                      </td>

                      <td className="px-4 py-4 text-right">
                        {s.isHolding ? (
                          <span className={`font-bold ${plColor(s.unrealizedPL)}`}>
                            {s.unrealizedPL >= 0 ? '+' : ''}{fmtMoney(s.unrealizedPL)}đ
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-bold text-amber-700">
                        +{fmtMoney(s.cashDividends)}đ
                      </td>

                      <td className={`px-5 py-4 text-right font-black text-sm bg-indigo-50/30 ${plColor(s.cumulativePL)}`}>
                        {isProfit ? '+' : ''}{fmtMoney(s.cumulativePL)}đ
                      </td>

                      <td className="px-4 py-4 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[11px] ${plBg(s.cumulativePL)}`}>
                          {isProfit ? '▲ +' : '▼ '}{s.roiPct}%
                        </span>
                      </td>

                      <td className="px-4 py-4 text-center text-gray-400 group-hover:text-indigo-600">
                        📖
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
