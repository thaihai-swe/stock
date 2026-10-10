import { Fragment, useEffect, useMemo, useState } from 'react';
import { deleteBuy, deleteSell, fetchPrices } from '../utils/api.js';
import { fmtDate, fmtMoney, getDisciplineTagInfo, getStockColor, plBg, plColor } from '../utils/format.js';
import StockDetailModal from './StockDetailModal.jsx';
import StockPerformanceTable from './StockPerformanceTable.jsx';

export default function TransactionHistory({ data, onSuccess, onNavigateBuy, onNavigateSell, onSwitchTab }) {
  const { buyOrders = [], sellOrders = [] } = data;
  const [subTab, setSubTab] = useState('orders'); // 'orders' | 'performance'
  const [selectedSymbolModal, setSelectedSymbolModal] = useState(null);
  const [marketPrices, setMarketPrices] = useState({});

  useEffect(() => {
    if (data.portfolio && data.portfolio.length > 0) {
      const symbols = data.portfolio.map(p => p.symbol);
      fetchPrices(symbols, false)
        .then(res => {
          if (res?.prices) setMarketPrices(res.prices);
        })
        .catch(() => { });
    }
  }, [data.portfolio]);

  const [tab, setTab] = useState('all'); // 'all' | 'buy' | 'sell'
  const [pnlFilter, setPnlFilter] = useState('all'); // 'all' | 'profit' | 'loss'
  const [textSearch, setTextSearch] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const [deletingId, setDeletingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null); // id của lệnh bán đang mở xem chi tiết lô
  const [mobileViewMode, setMobileViewMode] = useState('card'); // 'card' | 'table'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Gộp tất cả giao dịch
  const allTx = useMemo(() => {
    return [
      ...buyOrders.map(o => ({ ...o, type: 'BUY' })),
      ...sellOrders.map(o => ({ ...o, type: 'SELL' })),
    ];
  }, [buyOrders, sellOrders]);

  // Danh sách các mã cổ phiếu duy nhất có trong dữ liệu
  const uniqueSymbols = useMemo(() => {
    return Array.from(new Set(allTx.map(t => t.symbol))).sort();
  }, [allTx]);

  // Danh sách các thẻ duy nhất
  const uniqueTags = useMemo(() => {
    return Array.from(new Set(allTx.flatMap(t => t.tags || []))).sort();
  }, [allTx]);

  // Bộ lọc dữ liệu
  const filtered = useMemo(() => {
    return allTx.filter(tx => {
      // Lọc theo loại (Mua / Bán)
      if (tab === 'buy' && tx.type !== 'BUY') return false;
      if (tab === 'sell' && tx.type !== 'SELL') return false;

      // Lọc theo Lãi / Lỗ đối với lệnh bán
      if (pnlFilter === 'profit' && (tx.type !== 'SELL' || tx.profitLoss <= 0)) return false;
      if (pnlFilter === 'loss' && (tx.type !== 'SELL' || tx.profitLoss >= 0)) return false;

      // Tìm kiếm tự do (mã, ghi chú, tag)
      if (textSearch) {
        const query = textSearch.trim().toLowerCase();
        const inSym = tx.symbol.toLowerCase().includes(query);
        const inNote = (tx.note || '').toLowerCase().includes(query);
        const inTags = (tx.tags || []).some(t => t.toLowerCase().includes(query));
        if (!inSym && !inNote && !inTags) return false;
      }

      // Lọc theo mã cổ phiếu
      if (symbolFilter && !tx.symbol.toUpperCase().includes(symbolFilter.trim().toUpperCase())) {
        return false;
      }

      // Lọc theo Thẻ (Tag)
      if (tagFilter && (!tx.tags || !tx.tags.includes(tagFilter))) {
        return false;
      }

      // Lọc theo khoảng ngày (YYYY-MM-DD)
      const txDate = tx.date ? String(tx.date).slice(0, 10) : '';
      if (startDate && txDate < startDate) return false;
      if (endDate && txDate > endDate) return false;

      return true;
    });
  }, [allTx, tab, pnlFilter, textSearch, symbolFilter, tagFilter, startDate, endDate]);

  // Sắp xếp dữ liệu
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let valA, valB;
      switch (sortField) {
        case 'type':
          valA = a.type;
          valB = b.type;
          break;
        case 'symbol':
          valA = a.symbol;
          valB = b.symbol;
          break;
        case 'quantity':
          valA = a.quantity;
          valB = b.quantity;
          break;
        case 'price':
          valA = a.price;
          valB = b.price;
          break;
        case 'total':
          valA = a.type === 'BUY' ? (a.totalCost || a.quantity * a.price) : (a.totalRevenue || a.quantity * a.price);
          valB = b.type === 'BUY' ? (b.totalCost || b.quantity * b.price) : (b.totalRevenue || b.quantity * b.price);
          break;
        case 'profitLoss':
          valA = a.type === 'SELL' ? (a.profitLoss || 0) : -999999999999;
          valB = b.type === 'SELL' ? (b.profitLoss || 0) : -999999999999;
          break;
        case 'date':
        default:
          valA = a.date || '';
          valB = b.date || '';
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
      setSortDirection(field === 'symbol' || field === 'type' ? 'asc' : 'desc');
    }
  }

  function handleResetFilters() {
    setTab('all');
    setPnlFilter('all');
    setTextSearch('');
    setSymbolFilter('');
    setTagFilter('');
    setStartDate('');
    setEndDate('');
  }

  const hasFilterActive = tab !== 'all' || pnlFilter !== 'all' || textSearch || symbolFilter || tagFilter || startDate || endDate;
  const activeFilterCount = (symbolFilter ? 1 : 0) + (tagFilter ? 1 : 0) + (startDate || endDate ? 1 : 0) + (pnlFilter !== 'all' ? 1 : 0);

  async function handleDelete(tx) {
    if (!confirm(`Xóa lệnh ${tx.type === 'BUY' ? 'mua' : 'bán'} ${tx.symbol}?`)) return;
    setDeletingId(tx.id);
    try {
      if (tx.type === 'BUY') await deleteBuy(tx.id);
      else await deleteSell(tx.id);
      onSuccess();
    } catch (err) {
      alert('❌ ' + err.message);
    } finally {
      setDeletingId(null);
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

  return (
    <div className="space-y-4">
      {/* Thanh Chuyển Đổi Sub-Tab */}
      <div className="flex items-center gap-2 p-1 bg-gray-200/80 rounded-2xl w-fit shadow-2xs">
        <button
          type="button"
          onClick={() => setSubTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${subTab === 'orders'
            ? 'bg-white text-indigo-700 shadow-xs'
            : 'text-gray-600 hover:text-gray-900 font-medium'
            }`}
        >
          <span>📑</span>
          <span>Nhật Ký Từng Lệnh</span>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded-full font-bold ml-0.5">
            {allTx.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('performance')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${subTab === 'performance'
            ? 'bg-white text-indigo-700 shadow-xs'
            : 'text-gray-600 hover:text-gray-900 font-medium'
            }`}
        >
          <span>📊</span>
          <span>Hiệu Suất Theo Mã</span>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded-full font-bold ml-0.5">
            {uniqueSymbols.length}
          </span>
        </button>
      </div>

      {/* Nội dung Sub-Tab */}
      {subTab === 'performance' ? (
        <StockPerformanceTable
          data={data}
          marketPrices={marketPrices}
          onSelectSymbol={setSelectedSymbolModal}
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header + Tabs + View Switcher */}
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <h2 className="font-bold text-gray-800 text-sm sm:text-base">📋 Lịch Sử Giao Dịch</h2>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-semibold">
                  {sorted.length} / {allTx.length}
                </span>
              </div>

              {/* Nút chuyển đổi Thẻ / Bảng cho Mobile */}
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl border border-gray-200/60 sm:hidden">
                <button
                  type="button"
                  onClick={() => setMobileViewMode('card')}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-all ${mobileViewMode === 'card'
                    ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-700 font-medium'
                    }`}
                >
                  📱 Thẻ
                </button>
                <button
                  type="button"
                  onClick={() => setMobileViewMode('table')}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-all ${mobileViewMode === 'table'
                    ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-700 font-medium'
                    }`}
                >
                  📊 Bảng
                </button>
              </div>
            </div>

            {/* Tab filter (All, Buy, Sell) & Desktop View Switcher */}
            <div className="flex items-center justify-between md:justify-end gap-2">
              <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                {[
                  ['all', 'Tất cả'],
                  ['buy', '🛒 Mua'],
                  ['sell', '💸 Bán'],
                ].map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setTab(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${tab === v ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {/* Desktop View Switcher */}
              <div className="hidden sm:flex items-center gap-1 bg-gray-100 p-0.5 rounded-xl border border-gray-200/60">
                <button
                  type="button"
                  onClick={() => setMobileViewMode('card')}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-all ${mobileViewMode === 'card'
                    ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-700 font-medium'
                    }`}
                >
                  📱 Thẻ
                </button>
                <button
                  type="button"
                  onClick={() => setMobileViewMode('table')}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-all ${mobileViewMode === 'table'
                    ? 'bg-white text-indigo-600 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-700 font-medium'
                    }`}
                >
                  📊 Bảng
                </button>
              </div>
            </div>
          </div>

          {/* Filter Toolbar (Search + Quick P&L + Collapsible Advanced Filters) */}
          <div className="px-4 sm:px-6 py-3 bg-gray-50/70 border-b border-gray-100 space-y-2.5 text-xs sm:text-sm">
            {/* Hàng 1: Ô tìm kiếm nhanh + Quick P&L desktop + Nút mở bộ lọc mobile */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={textSearch}
                  onChange={e => setTextSearch(e.target.value)}
                  placeholder="🔍 Tìm mã, ghi chú, thẻ tag..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-700 shadow-2xs"
                />
                {textSearch && (
                  <button
                    type="button"
                    onClick={() => setTextSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Quick P&L toggle trên Desktop */}
              <div className="hidden sm:flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPnlFilter('all')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${pnlFilter === 'all' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setPnlFilter('profit')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${pnlFilter === 'profit' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                >
                  🟢 Lãi
                </button>
                <button
                  type="button"
                  onClick={() => setPnlFilter('loss')}
                  className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${pnlFilter === 'loss' ? 'bg-red-600 text-white font-bold' : 'text-red-600 hover:bg-red-50'
                    }`}
                >
                  🔴 Lỗ
                </button>
              </div>

              {/* Nút bật/tắt bộ lọc chi tiết trên mobile */}
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`sm:hidden px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors shadow-2xs ${showAdvancedFilters || activeFilterCount > 0
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-gray-200 text-gray-700'
                  }`}
              >
                <span>⚙️ Lọc</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Hàng 2: Bộ lọc chi tiết (Mã, P&L mobile, Ngày, Tag) - Tự động hiện trên desktop, thu gọn trên mobile */}
            <div className={`flex-wrap items-center gap-2.5 pt-1 ${showAdvancedFilters ? 'flex' : 'hidden sm:flex'}`}>
              {/* Quick P&L riêng cho mobile khi mở bộ lọc */}
              <div className="flex sm:hidden items-center gap-1 bg-white border border-gray-200 rounded-xl p-0.5 w-full">
                <button
                  type="button"
                  onClick={() => setPnlFilter('all')}
                  className={`flex-1 py-1 text-xs rounded-lg font-medium text-center transition-colors ${pnlFilter === 'all' ? 'bg-indigo-600 text-white font-bold' : 'text-gray-600'
                    }`}
                >
                  Tất cả P&L
                </button>
                <button
                  type="button"
                  onClick={() => setPnlFilter('profit')}
                  className={`flex-1 py-1 text-xs rounded-lg font-medium text-center transition-colors ${pnlFilter === 'profit' ? 'bg-emerald-600 text-white font-bold' : 'text-emerald-700'
                    }`}
                >
                  🟢 Lãi
                </button>
                <button
                  type="button"
                  onClick={() => setPnlFilter('loss')}
                  className={`flex-1 py-1 text-xs rounded-lg font-medium text-center transition-colors ${pnlFilter === 'loss' ? 'bg-red-600 text-white font-bold' : 'text-red-600'
                    }`}
                >
                  🔴 Lỗ
                </button>
              </div>

              {/* Lọc theo mã cổ phiếu */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-500">Mã:</span>
                <input
                  type="text"
                  value={symbolFilter}
                  onChange={e => setSymbolFilter(e.target.value.toUpperCase())}
                  placeholder="VD: HPG..."
                  className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs uppercase font-semibold w-24 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white shadow-2xs"
                />
                {uniqueSymbols.length > 0 && (
                  <select
                    value={symbolFilter}
                    onChange={e => setSymbolFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-700 shadow-2xs"
                  >
                    <option value="">-- Tất cả --</option>
                    {uniqueSymbols.map(sym => (
                      <option key={sym} value={sym}>{sym}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Lọc theo Thẻ / Tag */}
              {uniqueTags.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-gray-500">Thẻ:</span>
                  <select
                    value={tagFilter}
                    onChange={e => setTagFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-700 shadow-2xs"
                  >
                    <option value="">-- Tất cả thẻ --</option>
                    {uniqueTags.map(tag => (
                      <option key={tag} value={tag}>#{tag}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lọc theo khoảng ngày */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium text-gray-500">Từ:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-700 shadow-2xs"
                />
                <span className="text-xs font-medium text-gray-500">Đến:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-700 shadow-2xs"
                />
              </div>

              {/* Nút đặt lại */}
              {hasFilterActive && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors ml-auto shadow-2xs"
                >
                  ✕ Xóa bộ lọc
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          {sorted.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <p className="text-4xl mb-2">🔍</p>
              <p className="font-medium text-gray-600">Không tìm thấy giao dịch nào phù hợp</p>
              <p className="text-xs text-gray-400 mt-1">Thử thay đổi bộ lọc mã, thẻ hoặc khoảng ngày</p>
              {hasFilterActive && (
                <button
                  onClick={handleResetFilters}
                  className="mt-3 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Xóa tất cả bộ lọc
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Chế độ xem Thẻ (Mobile Card View) - Thân thiện trên điện thoại */}
              <div className={`p-3.5 sm:p-4 space-y-3 bg-gray-50/40 ${mobileViewMode === 'card' ? 'block sm:hidden' : 'hidden'}`}>
                {sorted.map((tx) => {
                  const isBuy = tx.type === 'BUY';
                  const total = isBuy
                    ? (tx.totalCost || (tx.quantity * tx.price))
                    : (tx.totalRevenue || (tx.quantity * tx.price));
                  const avgCost = !isBuy && tx.totalCost && tx.quantity > 0 ? (tx.totalCost / tx.quantity) : 0;
                  const diffPerShare = !isBuy && avgCost > 0 ? (tx.price - avgCost) : 0;
                  const isExpanded = expandedId === tx.id;
                  const stockColor = getStockColor(tx.symbol);

                  return (
                    <div
                      key={tx.id}
                      className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs hover:shadow-xs transition-all space-y-2.5"
                    >
                      {/* Header thẻ: Badge Loại, Mã CP, Ngày & Lãi/Lỗ hoặc Tổng Tiền */}
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${isBuy ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60' : 'bg-orange-50 text-orange-700 border border-orange-200/60'
                            }`}>
                            {isBuy ? '🛒 MUA' : '💸 BÁN'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSymbolModal(tx.symbol);
                            }}
                            className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold border shadow-2xs hover:opacity-80 transition-opacity cursor-pointer"
                            style={{
                              backgroundColor: `${stockColor}15`,
                              borderColor: `${stockColor}40`,
                              color: stockColor,
                            }}
                            title={`Xem sổ cái tích luỹ ${tx.symbol}`}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0"
                              style={{ backgroundColor: stockColor }}
                            />
                            {tx.symbol}
                          </button>
                          <span className="text-[11px] text-gray-400 font-medium">
                            {fmtDate(tx.date)}
                          </span>
                        </div>

                        <div>
                          {!isBuy ? (
                            <div className="text-right">
                              <div className={`text-sm font-extrabold ${plColor(tx.profitLoss)}`}>
                                {tx.profitLoss >= 0 ? '+' : ''}{fmtMoney(tx.profitLoss)}đ
                              </div>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${plBg(tx.profitLoss)}`}>
                                {tx.profitLossPct >= 0 ? '▲ +' : '▼ '}{tx.profitLossPct}%
                              </span>
                            </div>
                          ) : (
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-900">{fmtMoney(total)}đ</div>
                              <span className="text-[10px] text-gray-400">Vốn bỏ ra</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Body: Lưới 2x2 Thông số giao dịch */}
                      <div className="grid grid-cols-2 gap-2 bg-gray-50/70 p-2.5 rounded-xl text-xs border border-gray-100">
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase font-semibold">Khối lượng</span>
                          <span className="font-bold text-gray-800 text-sm mt-0.5 block">
                            {tx.quantity.toLocaleString()} <span className="text-xs font-normal text-gray-400">cp</span>
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase font-semibold">
                            {isBuy ? 'Giá mua' : 'Giá bán'}
                          </span>
                          <span className="font-bold text-gray-800 text-sm mt-0.5 block">
                            {fmtMoney(tx.price)}đ

                          </span>
                        </div>

                        {isBuy ? (
                          <>
                            <div>
                              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Giá vốn/CP (sau phí)</span>
                              <span className="font-bold text-gray-700 text-xs mt-0.5 block">
                                {fmtMoney(tx.costPerShare || tx.price)}đ
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Phí giao dịch</span>
                              <span className="font-medium text-gray-600 text-xs mt-0.5 block">
                                {tx.feePct !== undefined ? `${tx.feePct}%` : '0%'} {tx.fee ? `(${fmtMoney(tx.fee)}đ)` : ''}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Vốn gốc TB</span>
                              <span className="font-bold text-amber-800 text-xs mt-0.5 block">
                                {fmtMoney(avgCost)}đ
                                {diffPerShare !== 0 && (
                                  <span className={`ml-1 text-[10px] ${diffPerShare > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    ({diffPerShare > 0 ? '+' : ''}{fmtMoney(diffPerShare)}đ)
                                  </span>
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Thu thực nhận</span>
                              <span className="font-bold text-indigo-700 text-xs mt-0.5 block">
                                {fmtMoney(tx.totalRevenue || total)}đ
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Ghi chú & Thẻ Tags */}
                      {(tx.note || (tx.tags && tx.tags.length > 0)) && (
                        <div className="space-y-1.5 pt-0.5">
                          {tx.note && (
                            <div className="text-xs text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-100 flex items-start gap-1.5">
                              <span className="text-[11px]">📝</span>
                              <span className="italic">{tx.note}</span>
                            </div>
                          )}
                          {tx.tags && tx.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {tx.tags.map(t => {
                                const disc = getDisciplineTagInfo(t);
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => setTagFilter(t)}
                                    className={`text-[10px] px-2 py-0.5 rounded-md font-medium cursor-pointer transition-opacity hover:opacity-80 ${disc
                                      ? `${disc.color} border font-semibold`
                                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100'
                                      }`}
                                    title={disc ? disc.desc : `Lọc theo #${t}`}
                                  >
                                    {disc ? t : `#${t}`}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons: Xem chi tiết lô & Xóa */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 text-xs">
                        <div>
                          {!isBuy && tx.matchedLots && tx.matchedLots.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60'
                                }`}
                            >
                              <span>🏷️</span>
                              <span>{isExpanded ? '▲ Ẩn lô' : `Xem ${tx.matchedLots.length} lô gốc`}</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDelete(tx)}
                          disabled={deletingId === tx.id}
                          className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1 disabled:opacity-50 ml-auto cursor-pointer"
                        >
                          <span>🗑️</span>
                          <span>{deletingId === tx.id ? 'Đang xóa...' : 'Xóa lệnh'}</span>
                        </button>
                      </div>

                      {/* Chi tiết các lô mua gốc đã khớp (Mini cards trên mobile) */}
                      {isExpanded && tx.matchedLots && (
                        <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/50 rounded-xl p-3 space-y-2 mt-1">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-950 dark:text-amber-300 pb-1.5 border-b border-amber-200/60 dark:border-amber-800/40">
                            <span>Chi tiết {tx.matchedLots.length} lô mua gốc đã khớp</span>
                            <span className="text-[10px] font-normal text-amber-800 dark:text-amber-400">FIFO</span>
                          </div>
                          <div className="space-y-2">
                            {tx.matchedLots.map((lot, idx) => {
                              const lotUnit = lot.unitCost || lot.buyPrice;
                              const lotTotalCost = lot.quantityUsed * lotUnit;
                              const diff = tx.price - lotUnit;
                              return (
                                <div key={idx} className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-800/40 text-xs space-y-1 shadow-2xs">
                                  <div className="flex justify-between items-center font-bold text-gray-800 dark:text-slate-200">
                                    <span>Lô #{idx + 1} ({fmtDate(lot.buyDate)})</span>
                                    <span className={diff >= 0 ? 'text-green-600 dark:text-emerald-400 font-bold' : 'text-red-500 dark:text-rose-400 font-bold'}>
                                      {diff >= 0 ? '+' : ''}{fmtMoney(diff)}đ/cp ({((diff / lotUnit) * 100).toFixed(1)}%)
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-1 text-[11px] text-gray-500 dark:text-slate-400 pt-0.5">
                                    <div>SL: <b className="text-gray-800 dark:text-slate-200">{lot.quantityUsed.toLocaleString()} cp</b></div>
                                    <div>Giá gốc: <b className="text-gray-800 dark:text-slate-200">{fmtMoney(lot.buyPrice)}đ</b></div>
                                    <div>Vốn lô: <b className="text-gray-800 dark:text-slate-200">{fmtMoney(lotTotalCost)}đ</b></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Chế độ xem Bảng (Desktop mặc định / Mobile khi chọn Bảng) */}
              <div className={`overflow-x-auto ${mobileViewMode === 'card' ? 'hidden sm:block' : 'block'}`}>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider select-none border-b border-gray-100">
                    <tr>
                      {/* Loại */}
                      <th
                        onClick={() => handleSort('type')}
                        className="text-left px-5 py-3 cursor-pointer hover:bg-gray-100 transition-colors group"
                        title="Nhấn để sắp xếp theo Loại"
                      >
                        <div className="inline-flex items-center">
                          <span className={sortField === 'type' ? 'text-indigo-600 font-bold' : ''}>Loại</span>
                          {renderSortIcon('type')}
                        </div>
                      </th>

                      {/* Mã */}
                      <th
                        onClick={() => handleSort('symbol')}
                        className="text-left px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors group"
                        title="Nhấn để sắp xếp theo Mã cổ phiếu"
                      >
                        <div className="inline-flex items-center">
                          <span className={sortField === 'symbol' ? 'text-indigo-600 font-bold' : ''}>Mã CP</span>
                          {renderSortIcon('symbol')}
                        </div>
                      </th>

                      {/* SL */}
                      <th
                        onClick={() => handleSort('quantity')}
                        className="text-right px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors group"
                        title="Nhấn để sắp xếp theo Số lượng"
                      >
                        <div className="inline-flex items-center justify-end w-full">
                          <span className={sortField === 'quantity' ? 'text-indigo-600 font-bold' : ''}>SL</span>
                          {renderSortIcon('quantity')}
                        </div>
                      </th>

                      {/* Giá Thực Hiện & Giá Vốn Gốc */}
                      <th
                        onClick={() => handleSort('price')}
                        className="text-right px-5 py-3 cursor-pointer hover:bg-gray-100 transition-colors group"
                        title="Nhấn để sắp xếp theo Giá"
                      >
                        <div className="inline-flex items-center justify-end w-full">
                          <span className={sortField === 'price' ? 'text-indigo-600 font-bold' : ''}>Giá Bán / Giá Vốn</span>
                          {renderSortIcon('price')}
                        </div>
                      </th>

                      {/* Tổng tiền & Vốn */}
                      <th
                        onClick={() => handleSort('total')}
                        className="text-right px-5 py-3 cursor-pointer hover:bg-gray-100 transition-colors group"
                        title="Nhấn để sắp xếp theo Tổng tiền"
                      >
                        <div className="inline-flex items-center justify-end w-full">
                          <span className={sortField === 'total' ? 'text-indigo-600 font-bold' : ''}>Tổng Tiền / Vốn Gốc</span>
                          {renderSortIcon('total')}
                        </div>
                      </th>

                      {/* Lãi / Lỗ */}
                      <th
                        onClick={() => handleSort('profitLoss')}
                        className="text-right px-5 py-3 cursor-pointer hover:bg-gray-100 transition-colors group"
                        title="Nhấn để sắp xếp theo Lãi / Lỗ"
                      >
                        <div className="inline-flex items-center justify-end w-full">
                          <span className={sortField === 'profitLoss' ? 'text-indigo-600 font-bold' : ''}>Lãi / Lỗ</span>
                          {renderSortIcon('profitLoss')}
                        </div>
                      </th>

                      {/* Ngày */}
                      <th
                        onClick={() => handleSort('date')}
                        className="text-left px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors group"
                        title="Nhấn để sắp xếp theo Ngày giao dịch"
                      >
                        <div className="inline-flex items-center">
                          <span className={sortField === 'date' ? 'text-indigo-600 font-bold' : ''}>Ngày GD</span>
                          {renderSortIcon('date')}
                        </div>
                      </th>

                      {/* Ghi chú & Thẻ */}
                      <th className="text-left px-4 py-3 text-gray-500 font-medium">Ghi chú & Thẻ</th>

                      {/* Chi tiết lô & Thao tác */}
                      <th className="px-4 py-3 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sorted.map((tx) => {
                      const isBuy = tx.type === 'BUY';
                      const total = isBuy
                        ? (tx.totalCost || (tx.quantity * tx.price))
                        : (tx.totalRevenue || (tx.quantity * tx.price));
                      const avgCost = !isBuy && tx.totalCost && tx.quantity > 0 ? (tx.totalCost / tx.quantity) : 0;
                      const diffPerShare = !isBuy && avgCost > 0 ? (tx.price - avgCost) : 0;
                      const isExpanded = expandedId === tx.id;

                      return (
                        <Fragment key={tx.id}>
                          <tr className={`hover:bg-gray-50/80 transition-colors ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
                            {/* Loại */}
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isBuy ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                {isBuy ? '🛒 MUA' : '💸 BÁN'}
                              </span>
                            </td>

                            {/* Mã */}
                            <td className="px-4 py-3.5">
                              <button
                                type="button"
                                onClick={() => setSelectedSymbolModal(tx.symbol)}
                                className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold border shadow-2xs hover:opacity-80 transition-opacity cursor-pointer"
                                style={{
                                  backgroundColor: `${getStockColor(tx.symbol)}15`,
                                  borderColor: `${getStockColor(tx.symbol)}40`,
                                  color: getStockColor(tx.symbol),
                                }}
                                title={`Xem sổ cái tích luỹ ${tx.symbol}`}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0"
                                  style={{ backgroundColor: getStockColor(tx.symbol) }}
                                />
                                {tx.symbol}
                              </button>
                            </td>

                            {/* SL */}
                            <td className="px-4 py-3.5 text-right font-medium">{tx.quantity.toLocaleString()}</td>

                            {/* Giá Thực Hiện & Giá Vốn Gốc (HIỂN THỊ CẢ 2 ĐỐI VỚI LỆNH BÁN) */}
                            <td className="px-5 py-3.5 text-right">
                              {isBuy ? (
                                <div>
                                  <div className="font-semibold text-gray-800">{fmtMoney(tx.price)}đ</div>
                                </div>
                              ) : (
                                <div>
                                  <div className="font-bold text-gray-900">
                                    Bán: {fmtMoney(tx.price)}đ
                                  </div>
                                  <div className="text-xs text-amber-800 font-bold mt-0.5 bg-amber-50 px-1.5 py-0.5 rounded inline-block">
                                    Vốn gốc: {fmtMoney(avgCost)}đ
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Tổng Tiền & Vốn Gốc */}
                            <td className="px-5 py-3.5 text-right">
                              {isBuy ? (
                                <div>
                                  <div className="font-semibold text-gray-800">{fmtMoney(total)}đ</div>
                                  <div className="text-[11px] text-gray-400">
                                    Phí {tx.feePct !== undefined ? `${tx.feePct}%` : '0%'}
                                    {tx.fee ? ` (+${fmtMoney(tx.fee)}đ)` : ''}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="font-semibold text-indigo-700">
                                    Thu: {fmtMoney(tx.totalRevenue)}đ
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    Vốn gốc: {fmtMoney(tx.totalCost)}đ
                                  </div>
                                  <div className="text-[10px] text-gray-400">
                                    Phí {tx.feePct || 0.1}% (-{fmtMoney(tx.fee || 0)}đ)
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Lãi / Lỗ */}
                            <td className="px-5 py-3.5 text-right">
                              {!isBuy ? (
                                <div>
                                  <span className={`font-bold ${plColor(tx.profitLoss)}`}>
                                    {tx.profitLoss >= 0 ? '+' : ''}{fmtMoney(tx.profitLoss)}đ
                                  </span>
                                  <br />
                                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${plBg(tx.profitLoss)}`}>
                                    {tx.profitLossPct >= 0 ? '+' : ''}{tx.profitLossPct}%
                                  </span>
                                  <div className="text-[10px] text-gray-400 mt-0.5 font-medium">
                                    Chênh: {diffPerShare >= 0 ? '+' : ''}{fmtMoney(diffPerShare)}đ/cp
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>

                            {/* Ngày */}
                            <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap text-xs">{fmtDate(tx.date)}</td>

                            {/* Ghi chú & Thẻ */}
                            <td className="px-4 py-3.5 max-w-[180px]">
                              {tx.note && <div className="text-gray-700 text-xs truncate">{tx.note}</div>}
                              {tx.tags && tx.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {tx.tags.map(t => {
                                    const disc = getDisciplineTagInfo(t);
                                    return (
                                      <span
                                        key={t}
                                        onClick={() => setTagFilter(t)}
                                        className={`cursor-pointer text-[10px] px-1.5 py-0.5 rounded font-medium transition-opacity hover:opacity-80 ${disc
                                          ? `${disc.color} border font-semibold`
                                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                          }`}
                                        title={disc ? disc.desc : `Lọc theo #${t}`}
                                      >
                                        {disc ? t : `#${t}`}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              {!tx.note && (!tx.tags || tx.tags.length === 0) && (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>

                            {/* Nút Xem chi tiết lô (chỉ lệnh bán) & Nút Xóa */}
                            <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1.5">
                              {!isBuy && tx.matchedLots && tx.matchedLots.length > 0 && (
                                <button
                                  onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                                  className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${isExpanded ? 'bg-indigo-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                                    }`}
                                  title="Xem chi tiết các lô mua gốc đã khớp cho lệnh bán này"
                                >
                                  {isExpanded ? '▲ Ẩn lô' : '🔍 Xem giá gốc'}
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(tx)}
                                disabled={deletingId === tx.id}
                                className="text-red-400 hover:text-red-600 text-xs disabled:opacity-50 transition-colors p-1"
                                title="Xóa giao dịch"
                              >
                                {deletingId === tx.id ? '...' : '🗑️'}
                              </button>
                            </td>
                          </tr>

                          {/* DÒNG CHI TIẾT CÁC LÔ MUA GỐC ĐÃ KHỚP (Mở rộng khi bấm) */}
                          {isExpanded && tx.matchedLots && (
                            <tr className="bg-amber-50/50 dark:bg-amber-950/20">
                              <td colSpan={9} className="px-6 py-3.5 border-b border-amber-100 dark:border-amber-900/40">
                                <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-amber-200/80 dark:border-amber-800/50 shadow-xs">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                                      <span>🏷️</span> Chi Tiết Giá Vốn Gốc Từng Lô Đã Khớp (Lệnh Bán {tx.symbol} ngày {fmtDate(tx.date)})
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-slate-400">
                                      Giá bán: <b className="text-gray-900 dark:text-slate-100">{fmtMoney(tx.price)}đ</b> · Vốn gốc TB: <b className="text-amber-800 dark:text-amber-300">{fmtMoney(avgCost)}đ</b>
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="text-gray-500 dark:text-slate-400 border-b border-gray-100 dark:border-slate-800 text-[11px]">
                                          <th className="text-left py-1.5 px-2">Lô</th>
                                          <th className="text-left py-1.5 px-2">Ngày Mua Gốc</th>
                                          <th className="text-right py-1.5 px-2">SL Khớp</th>
                                          <th className="text-right py-1.5 px-2">Giá Mua Gốc</th>
                                          <th className="text-right py-1.5 px-2">Phí Mua</th>
                                          <th className="text-right py-1.5 px-2">Giá Vốn/CP</th>
                                          <th className="text-right py-1.5 px-2">Tổng Vốn Lô</th>
                                          <th className="text-right py-1.5 px-2">Chênh Lệch Với Giá Bán</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                                        {tx.matchedLots.map((lot, idx) => {
                                          const lotUnit = lot.unitCost || lot.buyPrice;
                                          const lotTotalCost = lot.quantityUsed * lotUnit;
                                          const diff = tx.price - lotUnit;
                                          return (
                                            <tr key={idx} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/30">
                                              <td className="py-2 px-2 font-semibold text-gray-700 dark:text-slate-300">#{idx + 1}</td>
                                              <td className="py-2 px-2 text-gray-600 dark:text-slate-400">{fmtDate(lot.buyDate)}</td>
                                              <td className="py-2 px-2 text-right font-medium text-gray-800 dark:text-slate-200">{lot.quantityUsed.toLocaleString()} cp</td>
                                              <td className="py-2 px-2 text-right font-semibold text-gray-800 dark:text-slate-200">
                                                {fmtMoney(lot.buyPrice)}đ
                                              </td>
                                              <td className="py-2 px-2 text-right text-gray-500 dark:text-slate-400">{lot.buyFeePct || 0}%</td>
                                              <td className="py-2 px-2 text-right font-bold text-amber-900 dark:text-amber-300">
                                                {fmtMoney(lotUnit)}đ
                                              </td>
                                              <td className="py-2 px-2 text-right font-bold text-gray-800 dark:text-slate-200">{fmtMoney(lotTotalCost)}đ</td>
                                              <td className={`py-2 px-2 text-right font-bold ${diff >= 0 ? 'text-green-600 dark:text-emerald-400' : 'text-red-500 dark:text-rose-400'}`}>
                                                {diff >= 0 ? '+' : ''}{fmtMoney(diff)}đ/cp
                                                <span className="text-[10px] font-normal ml-1">({((diff / lotUnit) * 100).toFixed(1)}%)</span>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Footer tổng kết */}
          <div className="px-4 sm:px-6 py-3 border-t border-gray-100 text-xs text-gray-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span>
              Đang hiển thị <b>{sorted.length}</b> / {allTx.length} giao dịch
              {sortField && (
                <span className="ml-2 text-gray-400">
                  (Sắp xếp theo: <b className="text-gray-600">{
                    sortField === 'date' ? 'Ngày' :
                      sortField === 'symbol' ? 'Mã' :
                        sortField === 'type' ? 'Loại' :
                          sortField === 'quantity' ? 'Số lượng' :
                            sortField === 'price' ? 'Giá' :
                              sortField === 'total' ? 'Tổng tiền' : 'Lãi/Lỗ'
                  } {sortDirection === 'asc' ? '▲ Tăng dần' : '▼ Giảm dần'}</b>)
                </span>
              )}
            </span>

            {/* Tổng lãi lỗ của các lệnh bán đang hiển thị */}
            {sorted.some(t => t.type === 'SELL') && (
              <div>
                Tổng lãi/lỗ hiển thị:{' '}
                <span className={`font-semibold text-sm ${plColor(sorted.filter(t => t.type === 'SELL').reduce((s, t) => s + (t.profitLoss || 0), 0))}`}>
                  {sorted.filter(t => t.type === 'SELL').reduce((s, t) => s + (t.profitLoss || 0), 0) >= 0 ? '+' : ''}
                  {fmtMoney(sorted.filter(t => t.type === 'SELL').reduce((s, t) => s + (t.profitLoss || 0), 0))}đ
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Sổ Cái Chi Tiết Từng Mã */}
      <StockDetailModal
        symbol={selectedSymbolModal}
        isOpen={!!selectedSymbolModal}
        onClose={() => setSelectedSymbolModal(null)}
        data={data}
        marketPrices={marketPrices}
        onNavigateBuy={onNavigateBuy}
        onNavigateSell={onNavigateSell}
        onSwitchTab={onSwitchTab}
      />
    </div>
  );
}
