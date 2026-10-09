import { useState, useMemo, useEffect, useCallback } from 'react';
import { fmtMoney, fmtDate, plColor, plBg, getStockColor, fmtBillion, fmtShares, fmtPercent, fmtDecimal } from '../utils/format.js';
import { computeStockPerformance } from '../utils/stockAnalytics.js';
import { fetchFundamentals } from '../utils/api.js';

export default function StockDetailModal({
  symbol,
  isOpen,
  onClose,
  data = {},
  marketPrices = {},
  onNavigateBuy,
  onNavigateSell,
}) {
  const { buyOrders = [], sellOrders = [], dividends = [] } = data;
  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'valuation' | 'dividend_health' | 'technicals'
  const [filterType, setFilterType] = useState('all'); // 'all' | 'BUY' | 'SELL' | 'DIVIDEND'

  // Fundamental data state
  const [fundamentals, setFundamentals] = useState(null);
  const [loadingFundamentals, setLoadingFundamentals] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Đóng modal bằng phím ESC
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lấy dữ liệu cơ bản khi mở modal
  const loadFundamentalData = useCallback(async (sym, force = false) => {
    if (!sym) return;
    if (force) setRefreshing(true);
    else setLoadingFundamentals(true);

    try {
      const res = await fetchFundamentals([sym], force);
      if (res && res[sym.toUpperCase()]) {
        setFundamentals(res[sym.toUpperCase()]);
      }
    } catch (err) {
      console.warn('Không thể lấy dữ liệu cơ bản cho', sym, err);
    } finally {
      setLoadingFundamentals(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && symbol) {
      loadFundamentalData(symbol, false);
    } else {
      setActiveTab('ledger');
    }
  }, [isOpen, symbol, loadFundamentalData]);

  // Tính toán chỉ số tích luỹ của mã này
  const stockSummary = useMemo(() => {
    if (!symbol) return null;
    const res = computeStockPerformance(buyOrders, sellOrders, dividends, marketPrices);
    return res.stockList.find(s => s.symbol === symbol.toUpperCase()) || null;
  }, [symbol, buyOrders, sellOrders, dividends, marketPrices]);

  // Yield on Cost (YoC %) của riêng người dùng
  const personalYoC = useMemo(() => {
    if (!stockSummary || !stockSummary.isHolding || !stockSummary.avgCost || !fundamentals?.dividends?.dps) {
      return null;
    }
    const dps = fundamentals.dividends.dps;
    if (dps <= 0) return 0;
    return Number(((dps / stockSummary.avgCost) * 100).toFixed(2));
  }, [stockSummary, fundamentals]);

  // Gom toàn bộ dòng thời gian giao dịch của riêng mã này
  const timeline = useMemo(() => {
    if (!symbol) return [];
    const sym = symbol.toUpperCase();

    const buys = buyOrders
      .filter(b => b.symbol?.toUpperCase() === sym)
      .map(b => ({
        id: b.id,
        type: 'BUY',
        date: b.date || '',
        quantity: b.quantity,
        price: b.price,
        total: b.totalCost || (b.quantity * b.price),
        fee: b.fee || 0,
        remainingQty: b.remainingQty,
        note: b.note || '',
        tags: b.tags || [],
      }));

    const sells = sellOrders
      .filter(s => s.symbol?.toUpperCase() === sym)
      .map(s => ({
        id: s.id,
        type: 'SELL',
        date: s.date || '',
        quantity: s.quantity,
        price: s.price,
        total: s.totalRevenue || (s.quantity * s.price),
        fee: s.fee || 0,
        tax: s.tax || 0,
        profitLoss: s.profitLoss,
        profitLossPct: s.profitLossPct,
        matchedLots: s.matchedLots || [],
        note: s.note || '',
        tags: s.tags || [],
      }));

    const divs = dividends
      .filter(d => d.symbol?.toUpperCase() === sym)
      .map(d => ({
        id: d.id,
        type: 'DIVIDEND',
        subType: d.type, // 'CASH' | 'STOCK'
        date: d.date || '',
        quantity: d.quantity,
        amountPerShare: d.amountPerShare || 0,
        total: d.type === 'CASH' ? (d.netAmount || 0) : d.quantity,
        netAmount: d.netAmount || 0,
        grossAmount: d.grossAmount || 0,
        taxAmount: d.taxAmount || 0,
        note: d.note || '',
      }));

    const merged = [...buys, ...sells, ...divs];
    merged.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      if (a.type !== b.type) return a.type === 'SELL' ? -1 : 1;
      return 0;
    });

    return merged;
  }, [symbol, buyOrders, sellOrders, dividends]);

  const filteredTimeline = useMemo(() => {
    if (filterType === 'all') return timeline;
    return timeline.filter(t => t.type === filterType);
  }, [timeline, filterType]);

  if (!isOpen || !symbol || !stockSummary) return null;

  const stockColor = getStockColor(stockSummary.symbol);
  const isProfit = stockSummary.cumulativePL >= 0;

  // Đánh giá P/E Tier
  const getPeTier = (pe) => {
    if (pe == null || pe <= 0) return { label: 'Chưa có dữ liệu', color: 'bg-gray-100 text-gray-600' };
    if (pe < 10) return { label: 'Vùng rẻ / Hấp dẫn', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    if (pe <= 18) return { label: 'Hợp lý', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    return { label: 'Định giá cao', color: 'bg-amber-100 text-amber-800 border-amber-200' };
  };

  // Đánh giá ROE Tier
  const getRoeTier = (roe) => {
    if (roe == null) return { label: '—', color: 'bg-gray-100 text-gray-600' };
    if (roe >= 20) return { label: '⭐ Siêu việt (>20%)', color: 'bg-purple-100 text-purple-800 border-purple-200' };
    if (roe >= 15) return { label: '⭐ Xuất sắc (Buffett)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    if (roe >= 10) return { label: 'Khá tốt', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    return { label: 'Hiệu quả thấp', color: 'bg-gray-100 text-gray-600 border-gray-200' };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-10 max-h-[94vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* 1. Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/70">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center px-3 py-1.5 rounded-2xl text-sm font-extrabold shadow-2xs border"
              style={{
                backgroundColor: `${stockColor}18`,
                borderColor: `${stockColor}50`,
                color: stockColor,
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full mr-2 shrink-0 shadow-2xs"
                style={{ backgroundColor: stockColor }}
              />
              {stockSummary.symbol}
            </span>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 leading-tight">
                  {fundamentals?.description || `Cổ phiếu ${stockSummary.symbol}`}
                </h3>
                {stockSummary.isHolding ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    🟢 Đang giữ {stockSummary.holdingQty.toLocaleString()} cp
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                    ⚪ Đã tất toán vị thế
                  </span>
                )}
                {fundamentals?.sector && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                    🏢 {fundamentals.sector}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {fundamentals?.industry ? `Nhóm ngành: ${fundamentals.industry} • ` : ''}
                Sổ cái giao dịch & Hồ sơ định giá chuyên sâu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadFundamentalData(stockSummary.symbol, true)}
              disabled={refreshing || loadingFundamentals}
              className={`p-2 rounded-xl text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer text-xs ${
                refreshing ? 'animate-spin text-indigo-600' : ''
              }`}
              title="Làm mới chỉ số định giá"
            >
              🔄
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center font-bold text-sm cursor-pointer"
              title="Đóng cửa sổ"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 2. Sub-tab Navigation */}
        <div className="px-5 sm:px-6 bg-white border-b border-gray-100 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 py-2 min-w-max">
            <button
              type="button"
              onClick={() => setActiveTab('ledger')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ledger'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <span>📊</span> Sổ Cái Lãi/Lỗ
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('valuation')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'valuation'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <span>💡</span> Định Giá & Sinh Lời
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dividend_health')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'dividend_health'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <span>🎁</span> Cổ Tức & Sức Khỏe
              {personalYoC != null && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-400 text-amber-950 font-extrabold ml-0.5">
                  YoC {personalYoC}%
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('technicals')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'technicals'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <span>📈</span> Kỹ Thuật & Vận Động
            </button>
          </div>
        </div>

        {/* 3. Modal Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* TAB 1: SỔ CÁI & GIAO DỊCH */}
          {activeTab === 'ledger' && (
            <>
              {/* Hero Card: Lãi / Lỗ Tích Luỹ Toàn Thời Gian */}
              <div className={`p-4 sm:p-5 rounded-2xl border ${
                isProfit
                  ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border-emerald-200/80'
                  : 'bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-red-500/10 border-rose-200/80'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                      🎯 Tổng Lãi / Lỗ Tích Luỹ Toàn Thời Gian
                    </span>
                    <div className="flex items-baseline gap-2.5">
                      <span className={`text-2xl sm:text-3xl font-extrabold ${plColor(stockSummary.cumulativePL)}`}>
                        {isProfit ? '+' : ''}{fmtMoney(stockSummary.cumulativePL)}đ
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${plBg(stockSummary.cumulativePL)}`}>
                        {isProfit ? '▲ +' : '▼ '}{stockSummary.roiPct}% ROI
                      </span>
                    </div>
                  </div>

                  <div className="text-right sm:border-l sm:border-gray-200/80 sm:pl-4">
                    <span className="text-[10px] font-medium text-gray-400 block uppercase">Tổng vốn mua vào</span>
                    <span className="text-sm font-bold text-gray-800 block mt-0.5">
                      {fmtMoney(stockSummary.totalInvested)}đ
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      {stockSummary.totalTrades} giao dịch ({fmtDate(stockSummary.firstTradeDate)} → {fmtDate(stockSummary.lastTradeDate)})
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 Trụ Cột Thành Phần (Breakdown Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Lãi đã chốt */}
                <div className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-200/70">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-gray-500 uppercase">1. Lãi đã chốt</span>
                    <span className="text-base">💰</span>
                  </div>
                  <div className={`text-base font-extrabold ${plColor(stockSummary.realizedPL)}`}>
                    {stockSummary.realizedPL >= 0 ? '+' : ''}{fmtMoney(stockSummary.realizedPL)}đ
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-between">
                    <span>{stockSummary.sellCount} lần bán ({stockSummary.winCount} thắng)</span>
                    <span className="font-bold text-gray-600">{stockSummary.winRate}%</span>
                  </div>
                </div>

                {/* 2. Lãi tạm tính */}
                <div className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-200/70">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-gray-500 uppercase">2. Lãi tạm tính</span>
                    <span className="text-base">📈</span>
                  </div>
                  {stockSummary.isHolding ? (
                    <>
                      <div className={`text-base font-extrabold ${plColor(stockSummary.unrealizedPL)}`}>
                        {stockSummary.unrealizedPL >= 0 ? '+' : ''}{fmtMoney(stockSummary.unrealizedPL)}đ
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        Giá vốn: <b>{fmtMoney(stockSummary.avgCost)}đ</b>
                        {stockSummary.livePrice ? (
                          <span> | TT: <b className="text-indigo-600">{fmtMoney(stockSummary.livePrice)}đ</b></span>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-base font-bold text-gray-400">—</div>
                      <div className="text-[10px] text-gray-400 mt-1">Đã chốt hết, không giữ</div>
                    </>
                  )}
                </div>

                {/* 3. Cổ tức tiền mặt */}
                <div className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-200/70">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-gray-500 uppercase">3. Cổ tức nhận</span>
                    <span className="text-base">🎁</span>
                  </div>
                  <div className="text-base font-extrabold text-amber-700">
                    +{fmtMoney(stockSummary.cashDividends)}đ
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    {stockSummary.stockDividends > 0 ? (
                      <span>+{stockSummary.stockDividends.toLocaleString()} CP thưởng</span>
                    ) : (
                      <span>{stockSummary.divCount} đợt nhận cổ tức</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Dòng Thời Gian Giao Dịch (Timeline Section) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <span>⏱️</span> Dòng Thời Gian Giao Dịch ({timeline.length})
                  </h4>

                  {/* Sub-filters */}
                  <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[10px]">
                    <button
                      type="button"
                      onClick={() => setFilterType('all')}
                      className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                        filterType === 'all' ? 'bg-white text-gray-900 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      Tất cả ({timeline.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('BUY')}
                      className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                        filterType === 'BUY' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      Mua ({stockSummary.buyCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('SELL')}
                      className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                        filterType === 'SELL' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      Bán ({stockSummary.sellCount})
                    </button>
                    {stockSummary.divCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilterType('DIVIDEND')}
                        className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                          filterType === 'DIVIDEND' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-800'
                        }`}
                      >
                        Cổ tức ({stockSummary.divCount})
                      </button>
                    )}
                  </div>
                </div>

                {/* Timeline List */}
                {filteredTimeline.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-xs bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                    Không có giao dịch nào phù hợp với bộ lọc.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                    {filteredTimeline.map((item, idx) => {
                      if (item.type === 'BUY') {
                        return (
                          <div
                            key={`buy-${item.id || idx}`}
                            className="p-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50/80 transition-colors flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                                MUA
                              </span>
                              <div>
                                <div className="font-bold text-gray-800">
                                  +{item.quantity?.toLocaleString()} cp @ {fmtMoney(item.price)}đ
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  📅 {fmtDate(item.date)} • Phí: {fmtMoney(item.fee)}đ {item.note ? `• ${item.note}` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-900">
                                {fmtMoney(item.total)}đ
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {item.remainingQty > 0 ? `Còn giữ ${item.remainingQty.toLocaleString()} cp` : 'Đã bán hết lô này'}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (item.type === 'SELL') {
                        const isWin = (item.profitLoss || 0) >= 0;
                        return (
                          <div
                            key={`sell-${item.id || idx}`}
                            className={`p-3 rounded-xl border transition-colors flex items-center justify-between text-xs ${
                              isWin ? 'border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50/50' : 'border-rose-100 bg-rose-50/30 hover:bg-rose-50/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 text-[10px] ${
                                isWin ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                BÁN
                              </span>
                              <div>
                                <div className="font-bold text-gray-800">
                                  -{item.quantity?.toLocaleString()} cp @ {fmtMoney(item.price)}đ
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  📅 {fmtDate(item.date)} • Doanh thu: {fmtMoney(item.total)}đ {item.note ? `• ${item.note}` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-extrabold ${plColor(item.profitLoss)}`}>
                                {isWin ? '+' : ''}{fmtMoney(item.profitLoss)}đ
                              </div>
                              <div className={`text-[10px] font-bold ${isWin ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isWin ? '▲ +' : '▼ '}{item.profitLossPct}%
                              </div>
                            </div>
                          </div>
                        );
                      }

                      if (item.type === 'DIVIDEND') {
                        return (
                          <div
                            key={`div-${item.id || idx}`}
                            className="p-3 rounded-xl border border-amber-100 bg-amber-50/30 flex items-center justify-between text-xs hover:bg-amber-50/50 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-[10px]">
                                {item.subType === 'CASH' ? 'T.MẶT' : 'CP'}
                              </span>
                              <div>
                                <div className="font-bold text-gray-800">
                                  {item.subType === 'CASH'
                                    ? `Cổ tức tiền mặt (${fmtMoney(item.amountPerShare)}đ / cp)`
                                    : `Cổ phiếu thưởng / cổ tức (${item.quantity?.toLocaleString()} cp)`
                                  }
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5">
                                  📅 {fmtDate(item.date)} {item.note ? `• ${item.note}` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              {item.subType === 'CASH' ? (
                                <div className="font-bold text-amber-700">
                                  +{fmtMoney(item.netAmount)}đ
                                </div>
                              ) : (
                                <div className="font-bold text-indigo-700">
                                  +{item.quantity?.toLocaleString()} cp
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: ĐỊNH GIÁ & SINH LỜI */}
          {activeTab === 'valuation' && (
            <div className="space-y-5">
              {loadingFundamentals ? (
                <div className="py-12 text-center text-gray-400 text-sm">
                  <div className="animate-spin text-2xl mb-2">🔄</div>
                  Đang tải hồ sơ định giá và tài chính doanh nghiệp...
                </div>
              ) : !fundamentals || fundamentals.error ? (
                <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="font-bold text-gray-700 mb-1">Chưa có đủ dữ liệu định giá từ sàn</p>
                  <p className="text-xs text-gray-400 mb-4">
                    Mã này có thể là chứng chỉ quỹ ETF hoặc chưa công bố đủ kỳ báo cáo tài chính gần nhất.
                  </p>
                  <button
                    type="button"
                    onClick={() => loadFundamentalData(stockSummary.symbol, true)}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                  >
                    Thử tải lại
                  </button>
                </div>
              ) : (
                <>
                  {/* 4 Thẻ Hero Định Giá Cốt Lõi */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* 1. P/E */}
                    <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/40 rounded-2xl p-4 border border-indigo-100/80">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-indigo-900 uppercase">P/E (TTM)</span>
                        <span className="text-xs">🏷️</span>
                      </div>
                      <div className="text-2xl font-black text-indigo-950">
                        {fundamentals.valuation.pe != null ? `${fundamentals.valuation.pe}x` : '—'}
                      </div>
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${getPeTier(fundamentals.valuation.pe).color}`}>
                          {getPeTier(fundamentals.valuation.pe).label}
                        </span>
                      </div>
                    </div>

                    {/* 2. P/B */}
                    <div className="bg-gradient-to-br from-blue-50/70 to-sky-50/40 rounded-2xl p-4 border border-blue-100/80">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-blue-900 uppercase">P/B (Sổ sách)</span>
                        <span className="text-xs">📚</span>
                      </div>
                      <div className="text-2xl font-black text-blue-950">
                        {fundamentals.valuation.pb != null ? `${fundamentals.valuation.pb}x` : '—'}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-2">
                        {fundamentals.valuation.pb && fundamentals.valuation.pb < 1.0 ? 'Thị giá dưới giá trị sổ sách' : 'So với vốn chủ sở hữu'}
                      </div>
                    </div>

                    {/* 3. ROE */}
                    <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 rounded-2xl p-4 border border-emerald-100/80">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-emerald-900 uppercase">ROE (%)</span>
                        <span className="text-xs">⚡</span>
                      </div>
                      <div className="text-2xl font-black text-emerald-700">
                        {fundamentals.profitability.roe != null ? `${fundamentals.profitability.roe}%` : '—'}
                      </div>
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${getRoeTier(fundamentals.profitability.roe).color}`}>
                          {getRoeTier(fundamentals.profitability.roe).label}
                        </span>
                      </div>
                    </div>

                    {/* 4. EPS */}
                    <div className="bg-gradient-to-br from-amber-50/70 to-yellow-50/40 rounded-2xl p-4 border border-amber-100/80">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-bold text-amber-900 uppercase">EPS (Thu nhập/CP)</span>
                        <span className="text-xs">💵</span>
                      </div>
                      <div className="text-2xl font-black text-amber-900">
                        {fundamentals.profitability.eps != null ? `${fmtMoney(fundamentals.profitability.eps)}đ` : '—'}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-2">
                        Lợi nhuận 4 quý gần nhất
                      </div>
                    </div>
                  </div>

                  {/* Chi Tiết Biên Lợi Nhuận & Hiệu Quả Hoạt Động */}
                  <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <span>📊</span> Biên Lợi Nhuận & Chỉ Số Sinh Lời Mở Rộng
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Biên Lợi Nhuận Gộp</span>
                        <span className="text-sm font-bold text-gray-900 block mt-0.5">
                          {fmtPercent(fundamentals.profitability.grossMargin)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Biên Lợi Nhuận Ròng</span>
                        <span className="text-sm font-bold text-gray-900 block mt-0.5">
                          {fmtPercent(fundamentals.profitability.netMargin)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">ROA (Trên Tổng Tài Sản)</span>
                        <span className="text-sm font-bold text-gray-900 block mt-0.5">
                          {fmtPercent(fundamentals.profitability.roa)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">P/S (Giá / Doanh Thu)</span>
                        <span className="text-sm font-bold text-gray-900 block mt-0.5">
                          {fundamentals.valuation.ps != null ? `${fundamentals.valuation.ps}x` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quy Mô Vốn Hóa & Doanh Thu TTM */}
                  <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <span>🏢</span> Quy Mô Vốn Hóa & Kết Quả Kinh Doanh TTM
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Vốn Hóa Thị Trường</span>
                        <span className="text-sm font-bold text-indigo-700 block mt-0.5">
                          {fmtBillion(fundamentals.scale.marketCap)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Cổ Phiếu Lưu Hành</span>
                        <span className="text-sm font-bold text-gray-900 block mt-0.5">
                          {fmtShares(fundamentals.scale.sharesOutstanding)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Doanh Thu Thuần TTM</span>
                        <span className="text-sm font-bold text-gray-900 block mt-0.5">
                          {fmtBillion(fundamentals.scale.revenue)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Lợi Nhuận Ròng TTM</span>
                        <span className="text-sm font-bold text-emerald-700 block mt-0.5">
                          {fmtBillion(fundamentals.scale.netIncome)}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: CỔ TỨC & SỨC KHỎE TÀI CHÍNH */}
          {activeTab === 'dividend_health' && (
            <div className="space-y-5">
              {!fundamentals || fundamentals.error ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  Không có dữ liệu cổ tức và tài chính cho mã này.
                </div>
              ) : (
                <>
                  {/* Khối Cổ Tức: Đối Chiếu Yield Thị Trường vs YoC của Bạn */}
                  <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-orange-500/10 rounded-2xl p-4 sm:p-5 border border-amber-200/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block mb-1">
                          🎁 Tỷ Suất Cổ Tức Tiền Mặt Hàng Năm
                        </span>
                        <div className="flex items-baseline gap-3">
                          <span className="text-2xl sm:text-3xl font-extrabold text-amber-950">
                            {fundamentals.dividends.yield != null ? `${fundamentals.dividends.yield}%` : '—'}
                          </span>
                          <span className="text-xs text-amber-800 font-medium">
                            (Thị trường hiện tại)
                          </span>
                        </div>
                        <p className="text-xs text-amber-900/80 mt-1">
                          Cổ tức tiền mặt 1 cp: <b>{fmtMoney(fundamentals.dividends.dps)}đ/năm</b>
                        </p>
                      </div>

                      {/* Yield on Cost của riêng bạn */}
                      <div className="sm:border-l sm:border-amber-200 sm:pl-5 bg-white/70 p-3 rounded-xl border border-amber-100">
                        <span className="text-[10px] font-bold text-gray-500 uppercase block">
                          💎 Yield on Cost (YoC của bạn)
                        </span>
                        {personalYoC != null ? (
                          <>
                            <div className="text-xl font-black text-indigo-700 mt-0.5">
                              {personalYoC}% / năm
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {personalYoC > (fundamentals.dividends.yield || 0)
                                ? `🔥 Cao hơn thị giá +${(personalYoC - (fundamentals.dividends.yield || 0)).toFixed(2)}% do giá vốn bạn tốt (${fmtMoney(stockSummary.avgCost)}đ)!`
                                : `Tính trên giá vốn bình quân ${fmtMoney(stockSummary.avgCost)}đ`
                              }
                            </p>
                          </>
                        ) : (
                          <p className="text-[11px] text-gray-400 mt-1">
                            {stockSummary.isHolding ? 'Chưa ghi nhận cổ tức tiền mặt' : 'Bạn chưa nắm giữ mã này để tính YoC'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sức Khỏe Tài Chính & Đòn Bẩy Nợ Vay */}
                  <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <span>🛡️</span> Sức Khỏe Tài Chính & Đòn Bẩy (Balance Sheet)
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      {/* D/E */}
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Đòn Bẩy Nợ / Vốn (D/E)</span>
                        <span className={`text-sm font-bold block mt-0.5 ${
                          fundamentals.health.debtToEquity != null && fundamentals.health.debtToEquity > 1.5 ? 'text-amber-600' : 'text-emerald-700'
                        }`}>
                          {fundamentals.health.debtToEquity != null ? `${fundamentals.health.debtToEquity}x` : '—'}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          {fundamentals.health.debtToEquity != null && fundamentals.health.debtToEquity < 1.0 ? 'Rất an toàn (<1.0)' : 'Mức kiểm soát'}
                        </span>
                      </div>

                      {/* Current Ratio */}
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Thanh Toán Hiện Hành</span>
                        <span className="text-sm font-bold text-gray-900 block mt-0.5">
                          {fundamentals.health.currentRatio != null ? `${fundamentals.health.currentRatio}x` : '—'}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">Tài sản NH / Nợ NH</span>
                      </div>

                      {/* Quick Ratio */}
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Thanh Toán Nhanh</span>
                        <span className="text-sm font-bold text-gray-900 block mt-0.5">
                          {fundamentals.health.quickRatio != null ? `${fundamentals.health.quickRatio}x` : '—'}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">Trừ hàng tồn kho</span>
                      </div>

                      {/* EBITDA */}
                      <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">EBITDA (TTM)</span>
                        <span className="text-sm font-bold text-indigo-700 block mt-0.5">
                          {fmtBillion(fundamentals.health.ebitda)}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">Lợi nhuận cốt lõi</span>
                      </div>
                    </div>

                    {/* Dòng Tiền & Bảng Cân Đối */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 text-xs">
                        <span className="text-[10px] font-bold text-gray-500 uppercase block">Dòng Tiền Tự Do (FCF)</span>
                        <span className={`text-sm font-extrabold block mt-0.5 ${
                          (fundamentals.dividends.fcf || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'
                        }`}>
                          {fmtBillion(fundamentals.dividends.fcf)}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          Biên FCF: {fmtPercent(fundamentals.dividends.fcfMargin)}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 text-xs">
                        <span className="text-[10px] font-bold text-gray-500 uppercase block">Tổng Nợ Vay</span>
                        <span className="text-sm font-extrabold text-gray-900 block mt-0.5">
                          {fmtBillion(fundamentals.health.totalDebt)}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">Nợ ngắn + dài hạn</span>
                      </div>

                      <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-100 text-xs">
                        <span className="text-[10px] font-bold text-gray-500 uppercase block">Tổng Tài Sản</span>
                        <span className="text-sm font-extrabold text-gray-900 block mt-0.5">
                          {fmtBillion(fundamentals.health.totalAssets)}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">Quy mô tài sản</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 4: KỸ THUẬT & VẬN ĐỘNG */}
          {activeTab === 'technicals' && (
            <div className="space-y-5">
              {!fundamentals || fundamentals.error ? (
                <div className="py-8 text-center text-gray-400 text-xs">
                  Không có dữ liệu kỹ thuật cho mã này.
                </div>
              ) : (
                <>
                  {/* Vùng Giá 52 Tuần (Range Bar) */}
                  <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                        <span>🎯</span> Vị Trí Thị Giá Trong Chu Kỳ 52 Tuần
                      </h4>
                      <span className="text-xs font-bold text-indigo-700">
                        {fundamentals.performance.range52wPercent != null
                          ? `${fundamentals.performance.range52wPercent}% từ đáy`
                          : ''}
                      </span>
                    </div>

                    {/* Progress Slider Track */}
                    <div className="relative pt-6 pb-2">
                      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-rose-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(5, Math.min(100, fundamentals.performance.range52wPercent || 0))}%` }}
                        />
                      </div>

                      {/* Pin marker for current price */}
                      <div className="flex justify-between items-center text-xs mt-2 text-gray-500">
                        <div>
                          <span className="text-[10px] text-gray-400 block">Đáy 52 tuần</span>
                          <span className="font-bold text-emerald-700">{fmtMoney(fundamentals.performance.low52w)}đ</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] text-gray-400 block">Thị giá hiện tại</span>
                          <span className="font-extrabold text-indigo-700 text-sm">{fmtMoney(fundamentals.close)}đ</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 block">Đỉnh 52 tuần</span>
                          <span className="font-bold text-rose-700">{fmtMoney(fundamentals.performance.high52w)}đ</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bảng Hiệu Suất Sinh Lời Lịch Sử (Performance Cycles) */}
                  <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-2xs space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                      <span>⏱️</span> Hiệu Suất Biến Động Giá Qua Các Chu Kỳ
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-center">
                      {[
                        { label: '1 Tuần', val: fundamentals.performance.w1 },
                        { label: '1 Tháng', val: fundamentals.performance.m1 },
                        { label: '3 Tháng', val: fundamentals.performance.m3 },
                        { label: '6 Tháng', val: fundamentals.performance.m6 },
                        { label: 'Đầu năm', val: fundamentals.performance.ytd },
                        { label: '1 Năm', val: fundamentals.performance.y1 },
                        { label: '5 Năm', val: fundamentals.performance.y5 },
                      ].map((cycle, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                          <span className="text-[10px] text-gray-400 font-bold block">{cycle.label}</span>
                          <span className={`text-xs font-black block mt-0.5 ${plColor(cycle.val)}`}>
                            {fmtPercent(cycle.val, true)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chỉ Báo Kỹ Thuật: RSI, MACD, Beta & Đánh Giá */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* RSI */}
                    <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">RSI (14 Phiên)</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xl font-black text-gray-900">
                          {fundamentals.technicals.rsi != null ? fundamentals.technicals.rsi : '—'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          (fundamentals.technicals.rsi || 50) < 30
                            ? 'bg-emerald-100 text-emerald-800'
                            : (fundamentals.technicals.rsi || 50) > 70
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {(fundamentals.technicals.rsi || 50) < 30 ? 'Quá bán (<30)' : (fundamentals.technicals.rsi || 50) > 70 ? 'Quá mua (>70)' : 'Trung tính'}
                        </span>
                      </div>
                    </div>

                    {/* Beta */}
                    <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">Hệ Số Beta (1 Năm)</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="text-xl font-black text-gray-900">
                          {fundamentals.technicals.beta != null ? fundamentals.technicals.beta : '—'}
                        </span>
                        <span className="text-[10px] font-medium text-gray-500">
                          {fundamentals.technicals.beta != null && fundamentals.technicals.beta < 0.8
                            ? '🛡️ Phòng thủ'
                            : fundamentals.technicals.beta > 1.2
                            ? '⚡ Biến động mạnh'
                            : 'Theo thị trường'}
                        </span>
                      </div>
                    </div>

                    {/* Khuyến Nghị Kỹ Thuật */}
                    <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block">Đánh Giá Kỹ Thuật</span>
                      <div className="mt-1">
                        <span className={`text-base font-extrabold ${fundamentals.technicals.recommendColor}`}>
                          {fundamentals.technicals.recommendText}
                        </span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          Score: {fundamentals.technicals.recommendScore ?? '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* 4. Modal Footer (Actions) */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {onNavigateBuy && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateBuy({ symbol: stockSummary.symbol, quantity: '100', price: stockSummary.livePrice ? String(stockSummary.livePrice / 1000) : '' });
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <span>🛒</span> Mua thêm
              </button>
            )}

            {onNavigateSell && stockSummary.isHolding && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateSell(stockSummary.symbol);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <span>💸</span> Bán bớt
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-bold text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
