import { useEffect, useMemo, useState } from 'react';
import { deleteBuy, deleteSell, fetchPrices } from '../utils/api.js';
import StockDetailModal from './StockDetailModal.jsx';
import HistoryFilterToolbar from './history/HistoryFilterToolbar.jsx';
import HistoryHeroHeader from './history/HistoryHeroHeader.jsx';
import HistoryLotInspectorModal from './history/HistoryLotInspectorModal.jsx';
import HistoryOrdersTable from './history/HistoryOrdersTable.jsx';
import HistoryPerformanceTab from './history/HistoryPerformanceTab.jsx';
import { calculateDateRange } from './common/TimeHorizonFilter.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function TransactionHistory({
  data,
  onSuccess,
  onNavigateBuy,
  onNavigateSell,
  onSwitchTab,
}) {
  const { showToast } = useToast();
  const { buyOrders = [], sellOrders = [] } = data;

  // Sub-Tab: 'orders' (Nhật Ký Từng Lệnh) | 'performance' (Hiệu Suất Theo Mã)
  const [subTab, setSubTab] = useState('orders');

  // Modals
  const [selectedSymbolModal, setSelectedSymbolModal] = useState(null);
  const [selectedSellOrderModal, setSelectedSellOrderModal] = useState(null);

  // Thị giá cho danh mục
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

  // Bộ lọc dữ liệu
  const [tab, setTab] = useState('all'); // 'all' | 'buy' | 'sell'
  const [pnlFilter, setPnlFilter] = useState('all'); // 'all' | 'profit' | 'loss'
  const [textSearch, setTextSearch] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [timePreset, setTimePreset] = useState('all'); // 'all' | 'ytd' | '1y' | 'mtd' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const [deletingId, setDeletingId] = useState(null);
  const [mobileViewMode, setMobileViewMode] = useState('card'); // 'card' | 'table'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Hàm chọn preset thời gian nhanh (Chuẩn hóa múi giờ địa phương GMT+7)
  function handleSelectTimePreset(preset, customStart, customEnd) {
    const res = calculateDateRange(preset, customStart ?? startDate, customEnd ?? endDate);
    setTimePreset(res.preset);
    setStartDate(res.startDate);
    setEndDate(res.endDate);
  }

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

  // Lọc dữ liệu
  const filtered = useMemo(() => {
    return allTx.filter(tx => {
      // Lọc theo loại (Mua / Bán)
      if (tab === 'buy' && tx.type !== 'BUY') return false;
      if (tab === 'sell' && tx.type !== 'SELL') return false;

      // Lọc theo Lãi / Lỗ đối với lệnh bán
      if (pnlFilter === 'profit' && (tx.type !== 'SELL' || (tx.profitLoss || 0) <= 0)) return false;
      if (pnlFilter === 'loss' && (tx.type !== 'SELL' || (tx.profitLoss || 0) >= 0)) return false;

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
    setTimePreset('all');
    setStartDate('');
    setEndDate('');
  }

  const hasFilterActive = tab !== 'all' || pnlFilter !== 'all' || textSearch || symbolFilter || tagFilter || startDate || endDate || timePreset !== 'all';
  const activeFilterCount = (symbolFilter ? 1 : 0) + (tagFilter ? 1 : 0) + (startDate || endDate ? 1 : 0) + (pnlFilter !== 'all' ? 1 : 0) + (tab !== 'all' ? 1 : 0);

  // Nhãn mô tả bộ lọc đang chọn cho Hero Card
  const filterLabel = useMemo(() => {
    const parts = [];
    if (symbolFilter) parts.push(`Mã ${symbolFilter}`);
    if (tab === 'buy') parts.push('Lệnh mua');
    if (tab === 'sell') parts.push('Lệnh bán');
    if (pnlFilter === 'profit') parts.push('Có lãi');
    if (pnlFilter === 'loss') parts.push('Thua lỗ');
    if (timePreset === 'ytd') parts.push('YTD');
    else if (timePreset === '1y') parts.push('1Y');
    else if (timePreset === 'mtd') parts.push('MTD');
    else if (startDate && endDate) parts.push(`${startDate} → ${endDate}`);
    else if (startDate) parts.push(`Từ ${startDate}`);
    else if (endDate) parts.push(`Đến ${endDate}`);
    if (tagFilter) parts.push(`#${tagFilter}`);
    return parts.join(' · ');
  }, [symbolFilter, tab, pnlFilter, timePreset, startDate, endDate, tagFilter]);

  async function handleDelete(tx) {
    if (!confirm(`Xóa lệnh ${tx.type === 'BUY' ? 'mua' : 'bán'} ${tx.symbol}?`)) return;
    setDeletingId(tx.id);
    try {
      if (tx.type === 'BUY') await deleteBuy(tx.id);
      else await deleteSell(tx.id);
      showToast(`✅ Đã xóa lệnh ${tx.type === 'BUY' ? 'mua' : 'bán'} ${tx.symbol}`, 'success');
      onSuccess();
    } catch (err) {
      showToast('❌ ' + err.message, 'error');
    } finally {
      setDeletingId(null);
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

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 🌟 1. BENTO HERO HEADER (CHỈ HIỂN THỊ KHI Ở SUB-TAB NHẬT KÝ TỪNG LỆNH) */}
      {subTab === 'orders' && (
        <HistoryHeroHeader
          filteredOrders={filtered}
          allOrdersCount={allTx.length}
          isFiltered={hasFilterActive}
          filterLabel={filterLabel}
        />
      )}

      {/* 🌟 2. THANH BỘ LỌC ĐIỀU HƯỚNG 1-CHẠM (FILTER TOOLBAR) */}
      <HistoryFilterToolbar
        subTab={subTab}
        setSubTab={setSubTab}
        allTxCount={allTx.length}
        performanceCount={uniqueSymbols.length}
        tab={tab}
        setTab={setTab}
        pnlFilter={pnlFilter}
        setPnlFilter={setPnlFilter}
        textSearch={textSearch}
        setTextSearch={setTextSearch}
        symbolFilter={symbolFilter}
        setSymbolFilter={setSymbolFilter}
        uniqueSymbols={uniqueSymbols}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        uniqueTags={uniqueTags}
        timePreset={timePreset}
        setTimePreset={setTimePreset}
        handleSelectTimePreset={handleSelectTimePreset}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        handleResetFilters={handleResetFilters}
        hasFilterActive={hasFilterActive}
        activeFilterCount={activeFilterCount}
        mobileViewMode={mobileViewMode}
        setMobileViewMode={setMobileViewMode}
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
      />

      {/* 🌟 3. NỘI DUNG CHÍNH CỦA SUB-TAB */}
      {subTab === 'performance' ? (
        <HistoryPerformanceTab
          data={data}
          marketPrices={marketPrices}
          onSelectSymbol={setSelectedSymbolModal}
          timePreset={timePreset}
          setTimePreset={setTimePreset}
          handleSelectTimePreset={handleSelectTimePreset}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          mobileViewMode={mobileViewMode}
          setMobileViewMode={setMobileViewMode}
        />
      ) : (
        <HistoryOrdersTable
          sortedOrders={sorted}
          allTxCount={allTx.length}
          sortField={sortField}
          sortDirection={sortDirection}
          handleSort={handleSort}
          renderSortIcon={renderSortIcon}
          mobileViewMode={mobileViewMode}
          onSelectSymbol={setSelectedSymbolModal}
          onOpenLotInspector={setSelectedSellOrderModal}
          handleDelete={handleDelete}
          deletingId={deletingId}
          setTagFilter={setTagFilter}
          handleResetFilters={handleResetFilters}
          hasFilterActive={hasFilterActive}
        />
      )}

      {/* 🌟 4. MODAL SỔ CÁI TÍCH LUỸ TỪNG MÃ (FIFO P/L LEDGER) */}
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

      {/* 🌟 5. MODAL GIẢI PHẪU KHỚP LỆNH ĐA CHIẾN LƯỢC CHUYÊN SÂU */}
      <HistoryLotInspectorModal
        selectedSellOrder={selectedSellOrderModal}
        isOpen={!!selectedSellOrderModal}
        onClose={() => setSelectedSellOrderModal(null)}
      />
    </div>
  );
}
