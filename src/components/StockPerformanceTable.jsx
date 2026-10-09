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
    totalAllRealizedPL,
    totalAllCashDividends,
    totalAllUnrealizedPL,
    overallWinRate,
    holdingSymbolsCount,
    closedSymbolsCount,
  } = performanceData;

  // Lọc dữ liệu
  const filtered = useMemo(() => {
    return stockList.filter(s => {
      // Tìm kiếm theo mã
      if (textSearch && !s.symbol.includes(textSearch.trim().toUpperCase())) {
        return false;
      }
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

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDirection]);

  function handleSort(field) {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'symbol' ? 'asc' : 'desc');
    }
  }

  function renderSortIcon(field) {
    if (sortField !== field) {
      return <span className="text-gray-300 group-hover:text-gray-500 text-xs ml-1 font-mono">⇅</span>;
    }
    return (
      <span className="text-indigo-600 text-xs ml-1 font-bold">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  }

  // Tổng kết các mã đang được lọc
  const summaryFiltered = useMemo(() => {
    const totalInvested = sorted.reduce((sum, s) => sum + s.totalInvested, 0);
    const realizedPL = sorted.reduce((sum, s) => sum + s.realizedPL, 0);
    const unrealizedPL = sorted.reduce((sum, s) => sum + s.unrealizedPL, 0);
    const cashDividends = sorted.reduce((sum, s) => sum + s.cashDividends, 0);
    const cumulativePL = sorted.reduce((sum, s) => sum + s.cumulativePL, 0);
    return { totalInvested, realizedPL, unrealizedPL, cashDividends, cumulativePL };
  }, [sorted]);

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
                  {topDividendStock.divCount} lần
                </span>
              </div>
              <p className="text-sm font-bold text-amber-700 mt-0.5">
                +{fmtMoney(topDividendStock.cashDividends)}đ
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 mt-1">—</p>
          )}
        </div>

        {/* Total Cumulative */}
        <div className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-2xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
              🎯 Tổng Lãi Tích Luỹ
            </span>
            <span className="text-base">💎</span>
          </div>
          <div className={`text-base font-extrabold ${plColor(totalAllCumulativePL)}`}>
            {totalAllCumulativePL >= 0 ? '+' : ''}{fmtMoney(totalAllCumulativePL)}đ
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Win rate chung: <b className="text-gray-700">{overallWinRate}%</b> ({stockList.length} mã)
          </p>
        </div>
      </div>

      {/* 2. Thanh Công Cụ & Bộ Lọc */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tìm kiếm & Bộ lọc nhanh */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Ô tìm kiếm mã */}
          <div className="relative">
            <input
              type="text"
              value={textSearch}
              onChange={e => setTextSearch(e.target.value.toUpperCase())}
              placeholder="🔍 Tìm mã CP..."
              className="px-3 py-1.5 pl-8 border border-gray-200 rounded-xl text-xs uppercase font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 w-36 sm:w-44"
            />
            <span className="absolute left-2.5 top-1.5 text-xs text-gray-400">🔍</span>
            {textSearch && (
              <button
                type="button"
                onClick={() => setTextSearch('')}
                className="absolute right-2 top-1.5 text-xs text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

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

        {/* Chuyển đổi Thẻ / Bảng cho Mobile */}
        <div className="flex items-center justify-between sm:justify-end gap-2">
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

      {/* 3. Danh sách Chế độ Thẻ (Mobile Card View) */}
      <div className={`sm:hidden space-y-3 ${mobileViewMode === 'card' ? 'block' : 'hidden'}`}>
        {sorted.map(s => {
          const stockColor = getStockColor(s.symbol, stockList);
          const isProfit = s.cumulativePL >= 0;

          return (
            <div
              key={`card-${s.symbol}`}
              onClick={() => onSelectSymbol && onSelectSymbol(s.symbol)}
              className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-2xs hover:border-indigo-300 transition-all cursor-pointer space-y-3"
            >
              {/* Header Thẻ: Mã CP & Trạng thái */}
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

              {/* Lãi / Lỗ Tích Luỹ Hero */}
              <div className="flex items-baseline justify-between pt-1 border-t border-gray-100">
                <span className="text-xs text-gray-400 font-medium">Lãi / Lỗ Tích Luỹ:</span>
                <span className={`text-lg font-extrabold ${plColor(s.cumulativePL)}`}>
                  {isProfit ? '+' : ''}{fmtMoney(s.cumulativePL)}đ
                </span>
              </div>

              {/* 3 Trụ Cột Tóm Tắt */}
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

              <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1">
                <span>Vốn đã mua: <b>{fmtMoney(s.totalInvested)}đ</b></span>
                <span className="text-indigo-600 font-bold flex items-center gap-0.5">
                  Xem sổ cái ➔
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Chế độ xem Bảng (Desktop mặc định / Mobile khi chọn Bảng) */}
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${
        mobileViewMode === 'card' ? 'hidden sm:block' : 'block'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100 font-semibold">
              <tr>
                {/* 1. Mã CP */}
                <th
                  onClick={() => handleSort('symbol')}
                  className="text-left px-5 py-3.5 font-bold text-gray-700 cursor-pointer group hover:bg-gray-100/60"
                >
                  <span className="inline-flex items-center">
                    Mã CP {renderSortIcon('symbol')}
                  </span>
                </th>

                {/* 2. Trạng thái */}
                <th
                  onClick={() => handleSort('status')}
                  className="text-center px-4 py-3.5 cursor-pointer group hover:bg-gray-100/60"
                >
                  <span className="inline-flex items-center">
                    Trạng thái {renderSortIcon('status')}
                  </span>
                </th>

                {/* 3. Tổng vốn mua */}
                <th
                  onClick={() => handleSort('totalInvested')}
                  className="text-right px-4 py-3.5 font-bold text-gray-700 cursor-pointer group hover:bg-gray-100/60"
                >
                  <span className="inline-flex items-center">
                    Tổng vốn mua {renderSortIcon('totalInvested')}
                  </span>
                </th>

                {/* 4. Lãi đã chốt */}
                <th
                  onClick={() => handleSort('realizedPL')}
                  className="text-right px-4 py-3.5 cursor-pointer group hover:bg-gray-100/60"
                >
                  <span className="inline-flex items-center">
                    Lãi đã chốt {renderSortIcon('realizedPL')}
                  </span>
                </th>

                {/* 5. Lãi tạm tính */}
                <th
                  onClick={() => handleSort('unrealizedPL')}
                  className="text-right px-4 py-3.5 cursor-pointer group hover:bg-gray-100/60"
                >
                  <span className="inline-flex items-center">
                    Lãi tạm tính {renderSortIcon('unrealizedPL')}
                  </span>
                </th>

                {/* 6. Cổ tức tiền mặt */}
                <th
                  onClick={() => handleSort('cashDividends')}
                  className="text-right px-4 py-3.5 cursor-pointer group hover:bg-gray-100/60"
                >
                  <span className="inline-flex items-center">
                    Cổ tức nhận {renderSortIcon('cashDividends')}
                  </span>
                </th>

                {/* 7. LÃI / LỖ TÍCH LUỸ */}
                <th
                  onClick={() => handleSort('cumulativePL')}
                  className="text-right px-5 py-3.5 font-extrabold text-indigo-900 bg-indigo-50/50 cursor-pointer group hover:bg-indigo-100/60"
                >
                  <span className="inline-flex items-center">
                    🎯 Lãi Tích Luỹ {renderSortIcon('cumulativePL')}
                  </span>
                </th>

                {/* 8. Tỷ suất ROI */}
                <th
                  onClick={() => handleSort('roiPct')}
                  className="text-right px-4 py-3.5 cursor-pointer group hover:bg-gray-100/60"
                >
                  <span className="inline-flex items-center">
                    ROI {renderSortIcon('roiPct')}
                  </span>
                </th>

                {/* 9. Thao tác */}
                <th className="text-center px-4 py-3.5 text-gray-400 font-normal">
                  Sổ cái
                </th>
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
                      {/* 1. Mã CP */}
                      <td className="px-5 py-4">
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

                      {/* 2. Trạng thái */}
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

                      {/* 3. Tổng vốn mua */}
                      <td className="px-4 py-4 text-right font-semibold text-gray-800">
                        {fmtMoney(s.totalInvested)}đ
                      </td>

                      {/* 4. Lãi đã chốt */}
                      <td className="px-4 py-4 text-right">
                        <div className={`font-bold ${plColor(s.realizedPL)}`}>
                          {s.realizedPL >= 0 ? '+' : ''}{fmtMoney(s.realizedPL)}đ
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {s.sellCount} lần ({s.winCount} thắng)
                        </div>
                      </td>

                      {/* 5. Lãi tạm tính */}
                      <td className="px-4 py-4 text-right">
                        {s.isHolding ? (
                          <>
                            <div className={`font-bold ${plColor(s.unrealizedPL)}`}>
                              {s.unrealizedPL >= 0 ? '+' : ''}{fmtMoney(s.unrealizedPL)}đ
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              {s.unrealizedPL >= 0 ? '▲ +' : '▼ '}{s.unrealizedPLPct}%
                            </div>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* 6. Cổ tức tiền mặt */}
                      <td className="px-4 py-4 text-right">
                        {s.cashDividends > 0 ? (
                          <span className="font-bold text-amber-700">
                            +{fmtMoney(s.cashDividends)}đ
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>

                      {/* 7. LÃI / LỖ TÍCH LUỸ (Highlight) */}
                      <td className="px-5 py-4 text-right bg-indigo-50/20">
                        <div className={`font-extrabold text-base ${plColor(s.cumulativePL)}`}>
                          {isProfit ? '+' : ''}{fmtMoney(s.cumulativePL)}đ
                        </div>
                      </td>

                      {/* 8. Tỷ suất ROI */}
                      <td className="px-4 py-4 text-right">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${plBg(s.cumulativePL)}`}>
                          {isProfit ? '▲ +' : '▼ '}{s.roiPct}%
                        </span>
                      </td>

                      {/* 9. Chi tiết */}
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-xl bg-gray-100 group-hover:bg-indigo-100 text-gray-600 group-hover:text-indigo-700 transition-colors">
                          🔍 Chi tiết
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Tổng cộng footer */}
            {sorted.length > 1 && (
              <tfoot className="bg-gray-50/90 border-t-2 border-gray-200 font-semibold text-xs text-gray-700">
                <tr>
                  <td className="px-5 py-3.5 text-left font-bold uppercase text-gray-500">
                    Tổng ({sorted.length} mã)
                  </td>
                  <td className="px-4 py-3.5 text-center text-gray-400">—</td>
                  <td className="px-4 py-3.5 text-right font-bold text-gray-900">
                    {fmtMoney(summaryFiltered.totalInvested)}đ
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold">
                    <span className={plColor(summaryFiltered.realizedPL)}>
                      {summaryFiltered.realizedPL >= 0 ? '+' : ''}{fmtMoney(summaryFiltered.realizedPL)}đ
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold">
                    <span className={plColor(summaryFiltered.unrealizedPL)}>
                      {summaryFiltered.unrealizedPL >= 0 ? '+' : ''}{fmtMoney(summaryFiltered.unrealizedPL)}đ
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-amber-700">
                    +{fmtMoney(summaryFiltered.cashDividends)}đ
                  </td>
                  <td className="px-5 py-3.5 text-right bg-indigo-50/50">
                    <div className={`font-extrabold text-sm ${plColor(summaryFiltered.cumulativePL)}`}>
                      {summaryFiltered.cumulativePL >= 0 ? '+' : ''}{fmtMoney(summaryFiltered.cumulativePL)}đ
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right text-gray-400">—</td>
                  <td className="px-4 py-3.5 text-center text-gray-400">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
