import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPrices } from '../utils/api.js';
import {
  fmtMoney,
  getStockColor,
  plBg,
  plColor,
  getAllocationTier,
  compareAvgCostWithMarket,
} from '../utils/format.js';
import MonthlyPLChart from './charts/MonthlyPLChart.jsx';
import PortfolioChart from './charts/PortfolioChart.jsx';
import StockDetailModal from './StockDetailModal.jsx';

function StatCard({ label, value, sub, highlight }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-3.5 sm:p-5 border border-gray-100 ${highlight || ''}`}>
      <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 truncate">{label}</p>
      <div className="text-lg sm:text-2xl font-bold text-gray-800 break-words leading-tight">{value}</div>
      {sub && <div className="text-[10px] sm:text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard({ data, onNavigateBuy, onNavigateDca, onNavigateSell }) {
  const { buyOrders = [], sellOrders = [], portfolio = [], dividends = [] } = data;

  // State mở Modal Sổ Cái Tích Luỹ khi click vào mã CP
  const [selectedSymbolModal, setSelectedSymbolModal] = useState(null);

  // State giá thị trường thực tế & phiên giao dịch
  const [pricesData, setPricesData] = useState({ session: null, prices: {} });
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  // State Tìm kiếm & Bộ lọc nhanh 1-Click
  const [symbolFilter, setSymbolFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'profit' | 'loss'
  const [mobileViewMode, setMobileViewMode] = useState('card'); // 'card' | 'table'

  // 1. Tổng quan cơ bản
  const totalInvested = buyOrders.reduce((s, o) => s + (o.totalCost || (o.quantity * o.price)), 0);
  const holdingCost = buyOrders.reduce((s, o) => s + (o.remainingQty * (o.costPerShare || o.price)), 0);
  const realizedPL = sellOrders.reduce((s, o) => s + o.profitLoss, 0);
  const totalHolding = buyOrders.reduce((s, o) => s + o.remainingQty, 0);
  const txCount = buyOrders.length + sellOrders.length;
  const totalCashDividends = (dividends || []).filter(d => d.type === 'CASH').reduce((sum, d) => sum + (d.netAmount || 0), 0);

  // Lấy giá thị trường theo danh mục đang nắm giữ
  const loadMarketPrices = useCallback(async (force = false) => {
    if (!portfolio || portfolio.length === 0) return;
    const symbols = portfolio.map(p => p.symbol);
    setLoadingPrices(true);
    try {
      const res = await fetchPrices(symbols, force);
      setPricesData(res);
      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    } catch (e) {
      console.error('Không thể lấy giá thị trường:', e);
    } finally {
      setLoadingPrices(false);
    }
  }, [portfolio]);

  useEffect(() => {
    loadMarketPrices(false);
  }, [loadMarketPrices]);

  // Tổng giá trị danh mục theo thị trường (Market Value)
  const totalMarketValue = portfolio.reduce((sum, p) => {
    const curPrice = pricesData?.prices?.[p.symbol]?.price;
    const effectivePrice = curPrice || p.avgCost;
    return sum + (p.totalQty * effectivePrice);
  }, 0);

  // Tổng lãi / lỗ tạm tính theo thị trường
  const totalUnrealizedPL = totalMarketValue - holdingCost;
  const totalUnrealizedPLPct = holdingCost > 0
    ? parseFloat(((totalUnrealizedPL / holdingCost) * 100).toFixed(2))
    : 0;

  // 2. Thống kê hiệu suất (Performance metrics)
  const wins = sellOrders.filter(s => s.profitLoss > 0);
  const losses = sellOrders.filter(s => s.profitLoss < 0);
  const winCount = wins.length;
  const lossCount = losses.length;
  const winRate = sellOrders.length > 0 ? ((winCount / sellOrders.length) * 100).toFixed(1) : 0;
  const totalWinAmount = wins.reduce((s, o) => s + o.profitLoss, 0);
  const totalLossAmount = Math.abs(losses.reduce((s, o) => s + o.profitLoss, 0));
  const avgWin = winCount > 0 ? Math.round(totalWinAmount / winCount) : 0;
  const avgLoss = lossCount > 0 ? Math.round(totalLossAmount / lossCount) : 0;
  const profitFactor = totalLossAmount > 0
    ? (totalWinAmount / totalLossAmount).toFixed(2)
    : (totalWinAmount > 0 ? '∞' : '0.00');

  // Đếm các trạng thái phục vụ bộ lọc nhanh 1-Click
  const filterCounts = useMemo(() => {
    let profit = 0;
    let loss = 0;

    for (const p of portfolio) {
      const quote = pricesData?.prices?.[p.symbol];
      const marketPrice = quote?.price || null;
      const marketVal = marketPrice ? p.totalQty * marketPrice : p.totalCost;
      const unrealizedPL = marketPrice ? (marketVal - p.totalCost) : 0;

      if (marketPrice && unrealizedPL > 0) profit++;
      if (marketPrice && unrealizedPL < 0) loss++;
    }

    return { profit, loss };
  }, [portfolio, pricesData]);

  // Lọc danh sách danh mục hiển thị
  const displayedPortfolio = useMemo(() => {
    return portfolio.filter(p => {
      if (symbolFilter && !p.symbol.toUpperCase().includes(symbolFilter.trim().toUpperCase())) {
        return false;
      }
      const quote = pricesData?.prices?.[p.symbol];
      const marketPrice = quote?.price || null;
      const marketVal = marketPrice ? p.totalQty * marketPrice : p.totalCost;
      const unrealizedPL = marketPrice ? (marketVal - p.totalCost) : 0;

      if (statusFilter === 'profit') return marketPrice && unrealizedPL > 0;
      if (statusFilter === 'loss') return marketPrice && unrealizedPL < 0;
      return true;
    });
  }, [portfolio, symbolFilter, statusFilter, pricesData]);

  return (
    <div className="space-y-6">
      {/* Stat Cards - Hàng 1: Tổng vốn, Giá trị thị trường, Lãi thực hiện & Cổ tức */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 sm:gap-4">
        <StatCard
          label="Tổng vốn đầu tư"
          value={`${fmtMoney(totalInvested)}đ`}
          sub={`${buyOrders.length} lệnh mua`}
        />
        <StatCard
          label="Giá trị danh mục"
          value={`${fmtMoney(totalMarketValue)}đ`}
          sub={
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>Vốn gốc: <b className="text-gray-600">{fmtMoney(holdingCost)}đ</b></span>
              {holdingCost > 0 && (
                <span className={`font-semibold ${plColor(totalUnrealizedPL)}`}>
                  • {totalUnrealizedPL >= 0 ? '+' : ''}{fmtMoney(totalUnrealizedPL)}đ ({totalUnrealizedPLPct >= 0 ? '+' : ''}{totalUnrealizedPLPct}%)
                </span>
              )}
            </div>
          }
        />
        <StatCard
          label="Lãi / Lỗ thực hiện"
          value={
            <span className={plColor(realizedPL)}>
              {realizedPL >= 0 ? '+' : ''}{fmtMoney(realizedPL)}đ
            </span>
          }
          sub={`${sellOrders.length} lệnh bán đã chốt`}
        />
        <StatCard
          label="Cổ tức thực nhận"
          value={
            <span className="text-emerald-600">
              +{fmtMoney(totalCashDividends)}đ
            </span>
          }
          sub={`${(dividends || []).length} đợt chi trả`}
        />
        <StatCard
          label="Tổng giao dịch"
          value={txCount}
          sub={`${totalHolding.toLocaleString()} đang giữ`}
        />
      </div>

      {/* BẢNG DANH MỤC ĐANG NẮM GIỮ (HIỂN THỊ TRÊN CÙNG THEO YÊU CẦU) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-gray-50/50 to-white">
          <div className="flex items-center justify-between gap-2 flex-wrap w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-800 text-sm sm:text-base flex items-center gap-1.5">
                <span>📂</span> Danh Mục Đang Nắm Giữ
              </h2>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full font-semibold">
                {portfolio.length} mã
              </span>

              {/* Trạng thái phiên giao dịch thị trường */}
              {pricesData?.session && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${pricesData.session.isOpen ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                  {pricesData.session.label}
                </span>
              )}
            </div>

            {/* Toggle dạng Thẻ / Bảng trên mobile */}
            {portfolio.length > 0 && (
              <div className="sm:hidden flex items-center bg-gray-100 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setMobileViewMode('card')}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                    mobileViewMode === 'card'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📱 Thẻ
                </button>
                <button
                  type="button"
                  onClick={() => setMobileViewMode('table')}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                    mobileViewMode === 'table'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📊 Bảng
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
            {lastUpdated && (
              <span className="text-gray-400 text-[11px]">Cập nhật: {lastUpdated}</span>
            )}
            <button
              onClick={() => loadMarketPrices(true)}
              disabled={loadingPrices}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium transition-colors disabled:opacity-50 cursor-pointer"
              title="Làm mới giá thị trường từ sàn"
            >
              <span>{loadingPrices ? '⏳' : '🔄'}</span>
              <span>{loadingPrices ? 'Đang tải...' : 'Cập nhật giá'}</span>
            </button>
          </div>
        </div>

        {/* Thanh Tìm Kiếm & Bộ Lọc Nhanh 1-Click */}
        {portfolio.length > 0 && (
          <div className="px-6 py-3 bg-gray-50/70 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-gray-500 uppercase text-[11px] mr-1">Bộ lọc:</span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${statusFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
              >
                Tất cả ({portfolio.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('profit')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1 ${statusFilter === 'profit'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-white border border-gray-200 text-emerald-700 hover:bg-emerald-50'
                  }`}
              >
                <span>🟢 Đang Lãi</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">{filterCounts.profit}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('loss')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1 ${statusFilter === 'loss'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'bg-white border border-gray-200 text-red-600 hover:bg-red-50'
                  }`}
              >
                <span>🔴 Đang Lỗ</span>
                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded-full">{filterCounts.loss}</span>
              </button>
            </div>

            {/* Ô tìm kiếm mã & Nút mở DCA */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  value={symbolFilter}
                  onChange={e => setSymbolFilter(e.target.value.toUpperCase())}
                  placeholder="🔍 Tìm mã CP..."
                  className="w-36 sm:w-44 bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs uppercase font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {symbolFilter && (
                  <button
                    type="button"
                    onClick={() => setSymbolFilter('')}
                    className="absolute right-2 top-1 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {portfolio.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateDca) {
                      onNavigateDca(portfolio[0]);
                    }
                  }}
                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg border border-indigo-200 transition-colors flex items-center gap-1 shadow-2xs"
                  title="Mở bảng kế hoạch mua gom DCA"
                >
                  <span>🧮</span>
                  <span>Kế hoạch DCA</span>
                </button>
              )}
            </div>
          </div>
        )}

        {portfolio.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p className="font-medium text-gray-600">Danh mục hiện đang trống</p>
            <p className="text-xs text-gray-400 mt-1">Chuyển sang tab "Mua vào" để thêm cổ phiếu mới</p>
          </div>
        ) : displayedPortfolio.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <p className="text-2xl mb-1">🔍</p>
            <p className="font-medium text-gray-600">Không tìm thấy cổ phiếu phù hợp</p>
            <p className="text-xs text-gray-400 mt-1">Thử xóa bộ lọc hoặc tìm kiếm mã khác</p>
          </div>
        ) : (
          <>
            {/* Chế độ xem Thẻ (Mobile Card View) - Thân thiện trên điện thoại */}
            <div className={`p-3.5 space-y-3 ${mobileViewMode === 'card' ? 'block sm:hidden' : 'hidden'}`}>
              {displayedPortfolio.map((p) => {
                const allocationPct = holdingCost > 0 ? ((p.totalCost / holdingCost) * 100).toFixed(1) : 0;
                const quote = pricesData?.prices?.[p.symbol];
                const marketPrice = quote?.price || null;
                const marketVal = marketPrice ? p.totalQty * marketPrice : p.totalCost;
                const changePct = quote?.changePct || 0;
                const unrealizedPL = marketPrice ? (marketVal - p.totalCost) : null;
                const unrealizedPLPct = (unrealizedPL !== null && p.totalCost > 0)
                  ? parseFloat(((unrealizedPL / p.totalCost) * 100).toFixed(2))
                  : 0;
                const stockColor = getStockColor(p.symbol, portfolio);

                return (
                  <div
                    key={p.symbol}
                    className="bg-gray-50/70 hover:bg-gray-50 border border-gray-200/80 rounded-2xl p-3.5 transition-all shadow-2xs"
                  >
                    {/* Header Thẻ: Mã CP, Tỷ trọng, Giá thị trường */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-gray-200/60">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedSymbolModal(p.symbol)}
                          className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold shadow-2xs border hover:opacity-85 transition-opacity cursor-pointer"
                          style={{
                            backgroundColor: `${stockColor}15`,
                            borderColor: `${stockColor}40`,
                            color: stockColor,
                          }}
                          title={`Xem sổ cái tích luỹ ${p.symbol}`}
                        >
                          <span
                            className="w-2 h-2 rounded-full mr-1.5 shrink-0"
                            style={{ backgroundColor: stockColor }}
                          />
                          {p.symbol}
                        </button>
                        {(() => {
                          const allocTier = getAllocationTier(allocationPct);
                          return (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${allocTier.bg} ${allocTier.text} ${allocTier.border}`}>
                              {allocationPct}% DM
                            </span>
                          );
                        })()}
                      </div>

                      {/* Giá thị trường & % biến động phiên */}
                      <div className="text-right">
                        {marketPrice ? (
                          <div className="flex items-baseline justify-end gap-1.5">
                            <span className="text-sm font-bold text-gray-900">{fmtMoney(marketPrice)}đ</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                changePct > 0
                                  ? 'text-green-700 bg-green-50'
                                  : changePct < 0
                                  ? 'text-red-700 bg-red-50'
                                  : 'text-yellow-700 bg-yellow-50'
                              }`}
                            >
                              {changePct > 0 ? '▲ +' : changePct < 0 ? '▼ ' : '■ '}{changePct}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Đang cập nhật</span>
                        )}
                      </div>
                    </div>

                    {/* Body Thẻ: 2x2 Lưới chi tiết */}
                    <div className="grid grid-cols-2 gap-2 py-2.5 text-xs border-b border-gray-200/60">
                      <div className="bg-white p-2 rounded-xl border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Khối lượng</span>
                        <span className="font-bold text-gray-800 text-sm mt-0.5 block">
                          {p.totalQty.toLocaleString()} <span className="text-xs font-normal text-gray-400">cp</span>
                        </span>
                      </div>
                      {(() => {
                        const effectiveAvgCost = p.avgCost ?? (p.totalQty > 0 ? Math.round(p.totalCost / p.totalQty) : 0);
                        const costComp = compareAvgCostWithMarket(effectiveAvgCost, marketPrice);
                        return (
                          <div className="bg-white p-2 rounded-xl border border-gray-100 flex flex-col justify-between">
                            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Giá vốn TB</span>
                            <span className={`font-extrabold text-sm mt-0.5 block ${costComp.textColor}`}>
                              {fmtMoney(effectiveAvgCost)}đ
                            </span>
                            {marketPrice && costComp.diffPct !== null && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border inline-block mt-0.5 w-fit ${costComp.badgeClass}`}>
                                {costComp.label}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      <div className="bg-white p-2 rounded-xl border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Giá trị vốn</span>
                        <span className="font-bold text-gray-800 text-sm mt-0.5 block">
                          {fmtMoney(p.totalCost)}đ
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-gray-100">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Giá trị thị trường</span>
                        <span className="font-bold text-gray-900 text-sm mt-0.5 block">
                          {fmtMoney(marketVal)}đ
                        </span>
                      </div>
                    </div>

                    {/* Footer Thẻ: Lãi/Lỗ tạm tính */}
                    <div className="pt-2.5">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">Lãi / Lỗ tạm tính</span>
                        {marketPrice ? (
                          <div className="flex items-center gap-2">
                            <span className={`text-base font-extrabold ${plColor(unrealizedPL)}`}>
                              {unrealizedPL >= 0 ? '+' : ''}{fmtMoney(unrealizedPL)}đ
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${plBg(unrealizedPL)}`}>
                              {unrealizedPL >= 0 ? '▲ +' : '▼ '}{unrealizedPLPct}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Thẻ Tổng kết danh mục trên Mobile */}
              {portfolio.length > 1 && (
                <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-3.5 text-xs text-gray-700">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-indigo-200/60">
                    <span className="font-bold text-indigo-950 uppercase text-[11px]">Tổng cộng danh mục</span>
                    <span className="font-semibold text-gray-600">{totalHolding.toLocaleString()} cổ phiếu</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-gray-500 block text-[10px]">Tổng giá vốn:</span>
                      <span className="font-bold text-gray-900">{fmtMoney(holdingCost)}đ</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Tổng giá trị TT:</span>
                      <span className="font-bold text-gray-900">{fmtMoney(totalMarketValue)}đ</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between">
                    <span className="text-gray-600 font-semibold text-[11px]">Tổng Lãi / Lỗ:</span>
                    <div className="text-right">
                      <span className={`text-sm font-extrabold mr-1.5 ${plColor(totalUnrealizedPL)}`}>
                        {totalUnrealizedPL >= 0 ? '+' : ''}{fmtMoney(totalUnrealizedPL)}đ
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${plBg(totalUnrealizedPL)}`}>
                        {totalUnrealizedPL >= 0 ? '▲ +' : '▼ '}{totalUnrealizedPLPct}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chế độ xem Bảng (Desktop mặc định / Mobile khi chọn Bảng) */}
            <div className={`overflow-x-auto ${mobileViewMode === 'card' ? 'hidden sm:block' : 'block'}`}>
              <table className="w-full text-sm">
              <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100 font-semibold">
                <tr>
                  <th className="text-left px-5 py-3.5 font-bold text-gray-700">Mã CP</th>
                  <th className="text-right px-4 py-3.5">Số lượng</th>
                  <th className="text-right px-4 py-3.5">Tỷ trọng</th>
                  <th className="text-right px-4 py-3.5">Giá vốn TB</th>
                  <th className="text-right px-4 py-3.5 font-bold text-gray-700">Giá trị vốn</th>
                  <th className="text-right px-4 py-3.5">Giá thị trường</th>
                  <th className="text-right px-5 py-3.5 font-bold text-gray-700">Giá trị danh mục</th>
                  <th className="text-right px-5 py-3.5 font-bold text-gray-700">Lãi / Lỗ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedPortfolio.map((p) => {
                  const allocationPct = holdingCost > 0 ? ((p.totalCost / holdingCost) * 100).toFixed(1) : 0;

                  // Thông tin giá thị trường thực tế
                  const quote = pricesData?.prices?.[p.symbol];
                  const marketPrice = quote?.price || null;
                  const marketVal = marketPrice ? p.totalQty * marketPrice : p.totalCost;
                  const changePct = quote?.changePct || 0;

                  // Lãi / Lỗ tạm tính theo giá thị trường
                  const unrealizedPL = marketPrice ? (marketVal - p.totalCost) : null;
                  const unrealizedPLPct = (unrealizedPL !== null && p.totalCost > 0)
                    ? parseFloat(((unrealizedPL / p.totalCost) * 100).toFixed(2))
                    : 0;

                  const stockColor = getStockColor(p.symbol, portfolio);

                  return (
                    <tr key={p.symbol} className="hover:bg-indigo-50/30 transition-colors">
                      {/* 1. Mã CP */}
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setSelectedSymbolModal(p.symbol)}
                          className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold shadow-2xs border transition-all hover:scale-105 cursor-pointer"
                          style={{
                            backgroundColor: `${stockColor}15`,
                            borderColor: `${stockColor}40`,
                            color: stockColor,
                          }}
                          title={`Xem sổ cái tích luỹ ${p.symbol}`}
                        >
                          <span
                            className="w-2 h-2 rounded-full mr-1.5 shrink-0 shadow-2xs"
                            style={{ backgroundColor: stockColor }}
                          />
                          {p.symbol}
                        </button>
                      </td>

                      {/* 2. Số lượng */}
                      <td className="px-4 py-4 text-right font-semibold text-gray-800">
                        {p.totalQty.toLocaleString()} <span className="text-[11px] font-normal text-gray-400">cp</span>
                      </td>

                      {/* 3. Tỷ trọng */}
                      <td className="px-4 py-4 text-right">
                        {(() => {
                          const allocTier = getAllocationTier(allocationPct);
                          return (
                            <div className="inline-flex flex-col items-end gap-1">
                              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border shadow-2xs ${allocTier.bg} ${allocTier.text} ${allocTier.border}`}>
                                {allocationPct}%
                              </span>
                              <div className="w-12 h-1 bg-gray-200/80 rounded-full overflow-hidden" title={`Tỷ trọng: ${allocationPct}%`}>
                                <div
                                  className={`h-full ${allocTier.bar} rounded-full`}
                                  style={{ width: `${Math.min(parseFloat(allocationPct) || 0, 100)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* 4. Giá vốn TB */}
                      <td className="px-4 py-4 text-right">
                        {(() => {
                          const effectiveAvgCost = p.avgCost ?? (p.totalQty > 0 ? Math.round(p.totalCost / p.totalQty) : 0);
                          const costComp = compareAvgCostWithMarket(effectiveAvgCost, marketPrice);
                          return (
                            <div>
                              <div className={`font-extrabold text-sm tracking-tight ${costComp.textColor}`}>
                                {fmtMoney(effectiveAvgCost)}đ
                              </div>
                              {marketPrice && costComp.diffPct !== null && (
                                <div className="mt-0.5">
                                  <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${costComp.badgeClass}`}>
                                    {costComp.label}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* 5. Giá trị vốn */}
                      <td className="px-4 py-4 text-right font-bold text-gray-900">
                        {fmtMoney(p.totalCost)}đ
                      </td>

                      {/* 6. Giá Thị Trường (Live) */}
                      <td className="px-4 py-4 text-right">
                        {marketPrice ? (
                          <div>
                            <div className="font-bold text-gray-900 text-base">
                              {fmtMoney(marketPrice)}đ
                            </div>
                            <div className="text-[11px] flex items-center justify-end gap-1 mt-0.5">
                              <span className="text-gray-400">({(marketPrice / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })})</span>
                              <span className={`font-semibold ${changePct > 0 ? 'text-green-600' : changePct < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                {changePct > 0 ? '▲ +' : changePct < 0 ? '▼ ' : ''}{changePct}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">
                            {loadingPrices ? 'Đang tải...' : '—'}
                          </div>
                        )}
                      </td>

                      {/* 7. Giá Trị Danh Mục (Thị trường) */}
                      <td className="px-5 py-4 text-right">
                        <div className="font-bold text-gray-900 text-base">{fmtMoney(marketVal)}đ</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {(marketVal / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}k
                        </div>
                      </td>

                      {/* 8. Lãi / Lỗ Tạm Tính (Số tiền & %) */}
                      <td className="px-5 py-4 text-right">
                        {marketPrice ? (
                          <div>
                            <div className={`font-bold text-base ${plColor(unrealizedPL)}`}>
                              {unrealizedPL >= 0 ? '+' : ''}{fmtMoney(unrealizedPL)}đ
                            </div>
                            <div className="mt-0.5">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${plBg(unrealizedPL)}`}>
                                {unrealizedPL >= 0 ? '▲ +' : '▼ '}{unrealizedPLPct}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">—</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {portfolio.length > 1 && (
                <tfoot className="bg-gray-50/80 border-t-2 border-gray-200 font-semibold text-xs text-gray-700">
                  <tr>
                    {/* 1. Mã */}
                    <td className="px-5 py-3.5 text-left font-bold uppercase text-gray-500">Tổng cộng</td>
                    {/* 2. SL */}
                    <td className="px-4 py-3.5 text-right font-bold text-gray-900">{totalHolding.toLocaleString()} cp</td>
                    {/* 3. Tỷ trọng */}
                    <td className="px-4 py-3.5 text-right font-bold text-gray-700">100%</td>
                    {/* 4. Giá vốn TB */}
                    <td className="px-4 py-3.5 text-right text-gray-400">—</td>
                    {/* 5. Giá trị vốn */}
                    <td className="px-4 py-3.5 text-right font-bold text-gray-900">{fmtMoney(holdingCost)}đ</td>
                    {/* 6. Giá thị trường */}
                    <td className="px-4 py-3.5 text-right text-gray-400">—</td>
                    {/* 7. Giá trị danh mục */}
                    <td className="px-5 py-3.5 text-right font-bold text-gray-900 text-sm">{fmtMoney(totalMarketValue)}đ</td>
                    {/* 8. Lãi / Lỗ */}
                    <td className="px-5 py-3.5 text-right">
                      <div className={`font-bold text-sm ${plColor(totalUnrealizedPL)}`}>
                        {totalUnrealizedPL >= 0 ? '+' : ''}{fmtMoney(totalUnrealizedPL)}đ
                      </div>
                      <div className="mt-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${plBg(totalUnrealizedPL)}`}>
                          {totalUnrealizedPL >= 0 ? '▲ +' : '▼ '}{totalUnrealizedPLPct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          </>
        )}
      </div>

      {/* Stat Cards - Hàng 2: Thống kê hiệu suất trading */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tỷ lệ thắng (Win Rate)</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{winRate}%</p>
          <p className="text-xs text-gray-400 mt-1">{winCount} thắng / {lossCount} thua</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">TB lệnh lãi</p>
          <p className="text-2xl font-bold text-green-600 mt-1">+{fmtMoney(avgWin)}đ</p>
          <p className="text-xs text-gray-400 mt-1">trên các lệnh chốt lời</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">TB lệnh lỗ</p>
          <p className="text-2xl font-bold text-red-500 mt-1">-{fmtMoney(avgLoss)}đ</p>
          <p className="text-xs text-gray-400 mt-1">trên các lệnh cắt lỗ</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Profit Factor</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{profitFactor}</p>
          <p className="text-xs text-gray-400 mt-1">tổng lãi / tổng lỗ</p>
        </div>
      </div>

      {/* Biểu Đồ Trực Quan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-1.5">
              <span>🥧</span> Phân Bổ Vốn Danh Mục
            </h3>
            <span className="text-xs text-gray-400">Theo giá trị nắm giữ</span>
          </div>
          <PortfolioChart portfolio={portfolio} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 text-sm flex items-center gap-1.5">
              <span>📊</span> Lãi / Lỗ Theo Tháng
            </h3>
            <span className="text-xs text-gray-400">Thực nhận sau phí</span>
          </div>
          <MonthlyPLChart sellOrders={sellOrders} />
        </div>
      </div>

      {/* Lãi/Lỗ từng giao dịch bán gần nhất */}
      {sellOrders.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">💹 Giao Dịch Bán Gần Nhất</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-6 py-3">Mã</th>
                  <th className="text-right px-6 py-3">SL</th>
                  <th className="text-right px-6 py-3">Giá bán</th>
                  <th className="text-right px-6 py-3">Giá vốn TB</th>
                  <th className="text-right px-6 py-3">Lãi / Lỗ</th>
                  <th className="text-right px-6 py-3">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...sellOrders].reverse().slice(0, 5).map((s) => {
                  const avgCost = s.totalCost / s.quantity;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                          {s.symbol}
                        </span>
                        {s.tags && s.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {s.tags.slice(0, 2).map(t => (
                              <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">{s.quantity.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <div>{fmtMoney(s.price)}đ</div>
                        <div className="text-[11px] text-gray-400">({(s.price / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })})</div>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500">
                        <div className="font-medium text-amber-800">{fmtMoney(avgCost)}đ</div>
                        <div className="text-[11px] text-gray-400">({(avgCost / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })})</div>
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold ${plColor(s.profitLoss)}`}>
                        {s.profitLoss >= 0 ? '+' : ''}{fmtMoney(s.profitLoss)}đ
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plBg(s.profitLoss)}`}>
                          {s.profitLossPct >= 0 ? '+' : ''}{s.profitLossPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Sổ Cái Tích Luỹ Từng Mã */}
      <StockDetailModal
        symbol={selectedSymbolModal}
        isOpen={!!selectedSymbolModal}
        onClose={() => setSelectedSymbolModal(null)}
        data={data}
        marketPrices={pricesData?.prices || {}}
        onNavigateBuy={onNavigateBuy}
        onNavigateSell={onNavigateSell}
      />
    </div>
  );
}
