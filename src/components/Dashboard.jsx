import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchFundamentals, fetchPrices, updateCashBalance } from '../utils/api.js';
import {
  compareAvgCostWithMarket,
  fmtMoney,
  getAllocationTier,
  getStockColor,
  plBg,
  plColor,
} from '../utils/format.js';
import { computeRiskAdjustedRatios } from '../utils/stockAnalytics.js';
import MonthlyPLChart from './charts/MonthlyPLChart.jsx';
import PortfolioChart from './charts/PortfolioChart.jsx';
import StockContributionChart from './charts/StockContributionChart.jsx';
import WaterfallReturnChart from './charts/WaterfallReturnChart.jsx';
import OpportunityCostCard from './OpportunityCostCard.jsx';
import StockDetailModal from './StockDetailModal.jsx';

function StatCard({ label, value, sub, highlight }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-3.5 sm:p-5 border border-gray-100 dark:border-slate-800 ${highlight || ''}`}>
      <p className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 truncate">{label}</p>
      <div className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-slate-100 break-words leading-tight">{value}</div>
      {sub && <div className="text-[10px] sm:text-xs text-gray-400 dark:text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function Dashboard({ data, onNavigateBuy, onNavigateDca, onNavigateSell, onSuccess, refreshKey, onSwitchTab, showToast }) {
  const { buyOrders = [], sellOrders = [], portfolio = [], dividends = [], watchlist = [] } = data;

  // State mở Modal Sổ Cái Tích Luỹ khi click vào mã CP
  const [selectedSymbolModal, setSelectedSymbolModal] = useState(null);

  // State giá thị trường thực tế & phiên giao dịch
  const [pricesData, setPricesData] = useState({ session: null, prices: {} });
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [dismissAlerts, setDismissAlerts] = useState(false);

  // State Tìm kiếm & Bộ lọc nhanh 1-Click
  const [symbolFilter, setSymbolFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'profit' | 'loss'
  const [mobileViewMode, setMobileViewMode] = useState('card'); // 'card' | 'table'

  // State Sắp xếp dữ liệu danh mục nắm giữ (tương tự Lịch Sử Giao Dịch)
  const [sortField, setSortField] = useState('totalCost');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

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

  // 1. Tổng quan cơ bản
  const totalInvested = buyOrders.reduce((s, o) => s + (o.totalCost || (o.quantity * o.price)), 0);
  const holdingCost = buyOrders.reduce((s, o) => s + (o.remainingQty * (o.costPerShare || o.price)), 0);
  const realizedPL = sellOrders.reduce((s, o) => s + o.profitLoss, 0);
  const totalHolding = buyOrders.reduce((s, o) => s + o.remainingQty, 0);
  const txCount = buyOrders.length + sellOrders.length;
  const totalCashDividends = (dividends || []).filter(d => d.type === 'CASH').reduce((sum, d) => sum + (d.netAmount || 0), 0);

  // State Chu kỳ thời gian (Time Horizon Filter): 'all' | 'ytd' | '1y' | 'mtd'
  const [timeWindow, setTimeWindow] = useState('all');

  const { startDate: periodStartDate, endDate: periodEndDate, periodLabel } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    switch (timeWindow) {
      case 'ytd': {
        const start = `${now.getFullYear()}-01-01`;
        return { startDate: start, endDate: todayStr, periodLabel: `Năm ${now.getFullYear()} (YTD)` };
      }
      case '1y': {
        const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        return { startDate: oneYearAgo, endDate: todayStr, periodLabel: '1 Năm Gần Nhất' };
      }
      case 'mtd': {
        const monthStr = String(now.getMonth() + 1).padStart(2, '0');
        const start = `${now.getFullYear()}-${monthStr}-01`;
        return { startDate: start, endDate: todayStr, periodLabel: `Tháng ${monthStr}/${now.getFullYear()} (MTD)` };
      }
      case 'all':
      default:
        return { startDate: '', endDate: '', periodLabel: 'Toàn Thời Gian' };
    }
  }, [timeWindow]);

  // Lọc các giao dịch bán và cổ tức theo chu kỳ thời gian
  const sellOrdersInPeriod = useMemo(() => {
    if (timeWindow === 'all') return sellOrders;
    return sellOrders.filter(s => {
      const d = s.date ? String(s.date).slice(0, 10) : '';
      return (!periodStartDate || d >= periodStartDate) && (!periodEndDate || d <= periodEndDate);
    });
  }, [sellOrders, timeWindow, periodStartDate, periodEndDate]);

  const dividendsInPeriod = useMemo(() => {
    if (timeWindow === 'all') return dividends;
    return (dividends || []).filter(d => {
      const dateVal = d.date ? String(d.date).slice(0, 10) : '';
      return (!periodStartDate || dateVal >= periodStartDate) && (!periodEndDate || dateVal <= periodEndDate);
    });
  }, [dividends, timeWindow, periodStartDate, periodEndDate]);

  // Lãi/lỗ thực hiện trong kỳ
  const periodRealizedPL = useMemo(() => {
    return sellOrdersInPeriod.reduce((s, o) => s + (o.profitLoss || 0), 0);
  }, [sellOrdersInPeriod]);

  // Cổ tức tiền mặt trong kỳ
  const periodCashDividends = useMemo(() => {
    return (dividendsInPeriod || [])
      .filter(d => d.type === 'CASH')
      .reduce((sum, d) => sum + (d.netAmount || 0), 0);
  }, [dividendsInPeriod]);

  // Thống kê hiệu suất lệnh chốt trong kỳ
  const periodWins = useMemo(() => sellOrdersInPeriod.filter(s => s.profitLoss > 0), [sellOrdersInPeriod]);
  const periodLosses = useMemo(() => sellOrdersInPeriod.filter(s => s.profitLoss < 0), [sellOrdersInPeriod]);
  const periodWinCount = periodWins.length;
  const periodLossCount = periodLosses.length;
  const periodWinRate = sellOrdersInPeriod.length > 0 ? ((periodWinCount / sellOrdersInPeriod.length) * 100).toFixed(1) : 0;

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

  // Dữ liệu định giá & cơ bản của các mã đang giữ
  const [fundamentalsMap, setFundamentalsMap] = useState({});

  useEffect(() => {
    if (!portfolio || portfolio.length === 0) return;
    const symbols = portfolio.map(p => p.symbol);
    fetchFundamentals(symbols, false)
      .then(map => { if (map) setFundamentalsMap(map); })
      .catch(err => console.warn('Lỗi lấy chỉ số cơ bản cho dashboard:', err));
  }, [portfolio]);

  useEffect(() => {
    if (refreshKey) {
      loadMarketPrices(true);
      if (portfolio && portfolio.length > 0) {
        const symbols = portfolio.map(p => p.symbol);
        fetchFundamentals(symbols, true)
          .then(map => { if (map) setFundamentalsMap(map); })
          .catch(err => console.warn('Lỗi lấy chỉ số cơ bản cho dashboard:', err));
      }
    }
  }, [refreshKey]);

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

  // Tổng Lãi / Lỗ Tích Luỹ Toàn Thời Gian (Đã chốt + Tạm tính + Cổ tức tiền mặt)
  const totalCumulativePL = realizedPL + totalUnrealizedPL + totalCashDividends;
  const totalCumulativePLPct = totalInvested > 0
    ? parseFloat(((totalCumulativePL / totalInvested) * 100).toFixed(2))
    : 0;

  // Cảnh báo mục tiêu Watchlist (khi có mã chạm vùng mua hoặc vùng bán)
  const watchlistAlerts = useMemo(() => {
    if (!watchlist || watchlist.length === 0) return [];
    const alerts = [];
    for (const w of watchlist) {
      const sym = w.symbol?.toUpperCase();
      const quote = pricesData?.prices?.[sym];
      const curPrice = quote?.price;
      if (!curPrice) continue;

      const buyTarget = w.targetBuyPrice || w.targetPrice || null;
      if (buyTarget && curPrice <= buyTarget * 1.02) {
        alerts.push({
          type: 'BUY',
          symbol: sym,
          currentPrice: curPrice,
          targetPrice: buyTarget,
          diffPct: (((curPrice - buyTarget) / buyTarget) * 100).toFixed(1),
          message: `Đã vào vùng mua kỳ vọng (${fmtMoney(curPrice)}đ ≤ ${fmtMoney(buyTarget)}đ)`,
        });
      }

      const sellTarget = w.targetSellPrice || null;
      if (sellTarget && curPrice >= sellTarget * 0.98) {
        const isHolding = portfolio.some(p => p.symbol === sym && p.totalQty > 0);
        alerts.push({
          type: 'SELL',
          symbol: sym,
          currentPrice: curPrice,
          targetPrice: sellTarget,
          isHolding,
          diffPct: (((curPrice - sellTarget) / sellTarget) * 100).toFixed(1),
          message: `Đã chạm vùng bán chốt lời (${fmtMoney(curPrice)}đ ≥ ${fmtMoney(sellTarget)}đ)`,
        });
      }
    }
    return alerts;
  }, [watchlist, pricesData, portfolio]);

  // Quản lý số dư tiền mặt
  const [cashBalance, setCashBalance] = useState(data.settings?.cashBalance ?? 0);
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [cashInput, setCashInput] = useState('');
  const [savingCash, setSavingCash] = useState(false);

  useEffect(() => {
    if (data.settings?.cashBalance !== undefined) {
      setCashBalance(data.settings.cashBalance);
    }
  }, [data.settings?.cashBalance]);

  async function handleSaveCash(e) {
    e?.preventDefault();
    const val = Number(cashInput);
    if (isNaN(val) || val < 0) return;
    setSavingCash(true);
    try {
      await updateCashBalance(val);
      setCashBalance(val);
      setIsEditingCash(false);
      if (showToast) showToast('✅ Đã cập nhật số dư tiền mặt thành công!', 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      if (showToast) showToast(err.message || 'Lỗi cập nhật số dư tiền mặt', 'error');
      else alert(err.message || 'Lỗi cập nhật số dư tiền mặt');
    } finally {
      setSavingCash(false);
    }
  }

  // Tổng tài sản ròng (NAV) & Tỷ lệ phân bổ tiền mặt / cổ phiếu
  const totalNAV = cashBalance + totalMarketValue;
  const cashPct = totalNAV > 0 ? parseFloat(((cashBalance / totalNAV) * 100).toFixed(1)) : (cashBalance > 0 ? 100 : 0);
  const stockPct = totalNAV > 0 ? parseFloat(((totalMarketValue / totalNAV) * 100).toFixed(1)) : 0;

  // Tính Portfolio Beta & Tỷ suất Cổ tức bình quân danh mục
  const { portfolioBeta, portfolioDividendYield } = useMemo(() => {
    if (!portfolio || portfolio.length === 0 || totalMarketValue <= 0) {
      return { portfolioBeta: null, portfolioDividendYield: null };
    }
    let weightedBeta = 0;
    let weightedYield = 0;
    let validBetaWeight = 0;
    let validYieldWeight = 0;

    for (const p of portfolio) {
      const quote = pricesData?.prices?.[p.symbol];
      const curPrice = quote?.price || p.avgCost;
      const val = p.totalQty * curPrice;
      const weight = val / totalMarketValue;
      const fund = fundamentalsMap[p.symbol];

      if (fund?.technicals?.beta != null) {
        weightedBeta += weight * fund.technicals.beta;
        validBetaWeight += weight;
      }
      if (fund?.dividends?.yield != null) {
        weightedYield += weight * fund.dividends.yield;
        validYieldWeight += weight;
      }
    }

    const beta = validBetaWeight > 0 ? Number((weightedBeta / validBetaWeight).toFixed(2)) : null;
    const yieldPct = validYieldWeight > 0 ? Number((weightedYield / validYieldWeight).toFixed(2)) : null;

    return { portfolioBeta: beta, portfolioDividendYield: yieldPct };
  }, [portfolio, pricesData, totalMarketValue, fundamentalsMap]);

  // Bộ Chỉ Số Sharpe & Sortino Đo Lường Tỷ Suất Sinh Lời Vượt Trội / Rủi Ro
  const riskRatios = useMemo(() => {
    return computeRiskAdjustedRatios(
      buyOrders,
      sellOrders,
      portfolio,
      dividends,
      pricesData?.prices || {},
      fundamentalsMap
    );
  }, [buyOrders, sellOrders, portfolio, dividends, pricesData, fundamentalsMap]);

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

  // Lọc danh sách danh mục theo từ khóa và trạng thái P&L
  const filteredPortfolio = useMemo(() => {
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

  // Sắp xếp danh mục hiển thị (hỗ trợ tất cả các cột như Lịch Sử Giao Dịch)
  const displayedPortfolio = useMemo(() => {
    return [...filteredPortfolio].sort((a, b) => {
      let valA, valB;
      const quoteA = pricesData?.prices?.[a.symbol];
      const marketPriceA = quoteA?.price ?? null;
      const marketValA = marketPriceA !== null ? a.totalQty * marketPriceA : a.totalCost;
      const unrealizedPLA = marketPriceA !== null ? (marketValA - a.totalCost) : 0;
      const effectiveAvgCostA = a.avgCost ?? (a.totalQty > 0 ? a.totalCost / a.totalQty : 0);

      const quoteB = pricesData?.prices?.[b.symbol];
      const marketPriceB = quoteB?.price ?? null;
      const marketValB = marketPriceB !== null ? b.totalQty * marketPriceB : b.totalCost;
      const unrealizedPLB = marketPriceB !== null ? (marketValB - b.totalCost) : 0;
      const effectiveAvgCostB = b.avgCost ?? (b.totalQty > 0 ? b.totalCost / b.totalQty : 0);

      switch (sortField) {
        case 'symbol':
          valA = a.symbol;
          valB = b.symbol;
          break;
        case 'totalQty':
          valA = a.totalQty;
          valB = b.totalQty;
          break;
        case 'allocation':
          valA = a.totalCost;
          valB = b.totalCost;
          break;
        case 'avgCost':
          valA = effectiveAvgCostA;
          valB = effectiveAvgCostB;
          break;
        case 'totalCost':
          valA = a.totalCost;
          valB = b.totalCost;
          break;
        case 'marketPrice':
          valA = marketPriceA !== null ? marketPriceA : -1;
          valB = marketPriceB !== null ? marketPriceB : -1;
          break;
        case 'marketVal':
          valA = marketValA;
          valB = marketValB;
          break;
        case 'profitLoss':
          valA = unrealizedPLA;
          valB = unrealizedPLB;
          break;
        default:
          valA = a.totalCost;
          valB = b.totalCost;
          break;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [filteredPortfolio, sortField, sortDirection, pricesData]);

  // Tổng hợp số liệu các mã đang hiển thị
  const displayedHoldingQty = useMemo(() => {
    return displayedPortfolio.reduce((sum, p) => sum + p.totalQty, 0);
  }, [displayedPortfolio]);

  const displayedHoldingCost = useMemo(() => {
    return displayedPortfolio.reduce((sum, p) => sum + p.totalCost, 0);
  }, [displayedPortfolio]);

  const displayedMarketValue = useMemo(() => {
    return displayedPortfolio.reduce((sum, p) => {
      const curPrice = pricesData?.prices?.[p.symbol]?.price;
      const effectivePrice = curPrice || p.avgCost;
      return sum + (p.totalQty * effectivePrice);
    }, 0);
  }, [displayedPortfolio, pricesData]);

  const displayedUnrealizedPL = displayedMarketValue - displayedHoldingCost;
  const displayedUnrealizedPLPct = displayedHoldingCost > 0
    ? parseFloat(((displayedUnrealizedPL / displayedHoldingCost) * 100).toFixed(2))
    : 0;

  return (
    <div className="space-y-6">
      {/* 🌟 HERO SECTION: TỔNG TÀI SẢN (NAV), SỐ DƯ TIỀN MẶT & TỶ LỆ PHÂN BỔ */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-indigo-300 flex items-center gap-1.5">
              <span>💎</span> Tổng Giá Trị Tài Sản Ròng (NAV)
            </span>
            <button
              type="button"
              onClick={() => {
                setCashInput(cashBalance > 0 ? cashBalance.toString() : '');
                setIsEditingCash(true);
              }}
              className="text-xs bg-indigo-800/80 hover:bg-indigo-700 text-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-700/50 flex items-center gap-1.5 transition-all cursor-pointer font-medium shadow-xs"
            >
              <span>✏️</span> Nhập / Sửa Tiền Mặt
            </button>
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              {fmtMoney(totalNAV)}đ
            </span>
            <span className="text-xs sm:text-sm font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">
              Sức mua + Giá trị CP
            </span>
          </div>

          {/* Chi tiết Tiền mặt & Cổ phiếu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-indigo-800/40 text-xs">
            <div className="bg-white/5 rounded-2xl p-3 sm:p-4 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-indigo-300 text-[11px] block">💵 Tiền mặt khả dụng</span>
                <span className="text-lg sm:text-xl font-bold text-white mt-0.5 block truncate">
                  {fmtMoney(cashBalance)}đ
                </span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700/50 px-2.5 py-1 rounded-xl">
                {cashPct}%
              </span>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 sm:p-4 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-indigo-300 text-[11px] block">📈 Cổ phiếu nắm giữ</span>
                <span className="text-lg sm:text-xl font-bold text-white mt-0.5 block truncate">
                  {fmtMoney(totalMarketValue)}đ
                </span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-700/50 px-2.5 py-1 rounded-xl">
                {stockPct}%
              </span>
            </div>
          </div>

          {/* Thẻ Tổng Lãi / Lỗ Tích Luỹ Toàn Thời Gian hoặc Trong Kỳ */}
          <div className="bg-white/10 dark:bg-slate-900/50 rounded-2xl p-3.5 sm:p-4 border border-white/10 backdrop-blur-xs mt-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2.5">
              <div>
                <span className="text-indigo-200 text-[11px] font-bold uppercase tracking-wider block">
                  {timeWindow === 'all' ? '🏆 Tổng P&L Tích Luỹ Toàn Thời Gian' : `🏆 Tổng P&L Đã Thu Về Trong Kỳ (${periodLabel})`}
                </span>
                <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                  <span className={`text-xl sm:text-2xl font-black tracking-tight ${(timeWindow === 'all' ? totalCumulativePL : (periodRealizedPL + periodCashDividends)) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(timeWindow === 'all' ? totalCumulativePL : (periodRealizedPL + periodCashDividends)) >= 0 ? '+' : ''}{fmtMoney(timeWindow === 'all' ? totalCumulativePL : (periodRealizedPL + periodCashDividends))}đ
                  </span>
                  <span className={`text-xs sm:text-sm font-bold px-2 py-0.5 rounded-full ${(timeWindow === 'all' ? totalCumulativePL : (periodRealizedPL + periodCashDividends)) >= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                    {timeWindow === 'all' ? `${totalCumulativePL >= 0 ? '▲ +' : '▼ '}${totalCumulativePLPct}% ROI` : `${sellOrdersInPeriod.length} lệnh chốt · ${periodWinRate}% Win`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-2.5 text-[11px] text-indigo-200/90 flex-wrap">
                <div className="bg-black/25 px-2.5 py-1 rounded-xl border border-white/5">
                  <span className="opacity-75">{timeWindow === 'all' ? 'Đã chốt: ' : 'Chốt trong kỳ: '}</span>
                  <b className={(timeWindow === 'all' ? realizedPL : periodRealizedPL) >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                    {(timeWindow === 'all' ? realizedPL : periodRealizedPL) >= 0 ? '+' : ''}{fmtMoney(timeWindow === 'all' ? realizedPL : periodRealizedPL)}đ
                  </b>
                </div>
                <div className="bg-black/25 px-2.5 py-1 rounded-xl border border-white/5">
                  <span className="opacity-75">{timeWindow === 'all' ? 'Cổ tức: ' : 'Cổ tức trong kỳ: '}</span>
                  <b className="text-amber-300">
                    +{fmtMoney(timeWindow === 'all' ? totalCashDividends : periodCashDividends)}đ
                  </b>
                </div>
                <div className="bg-black/25 px-2.5 py-1 rounded-xl border border-white/5">
                  <span className="opacity-75">Tạm tính: </span>
                  <b className={totalUnrealizedPL >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                    {totalUnrealizedPL >= 0 ? '+' : ''}{fmtMoney(totalUnrealizedPL)}đ
                  </b>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thanh đo phân bổ Tiền mặt / Cổ phiếu (Cash Allocation Gauge) */}
        <div className="mt-4 pt-3 border-t border-indigo-800/30">
          <div className="flex items-center justify-between text-[11px] sm:text-xs mb-1.5 flex-wrap gap-1">
            <span className="text-indigo-200 font-medium flex items-center gap-1">
              <span>⚖️</span> Tỷ lệ phân bổ:
              <b className="text-emerald-300 ml-1">Tiền mặt {cashPct}%</b>
              <span className="text-indigo-400">/</span>
              <b className="text-indigo-200">Cổ phiếu {stockPct}%</b>
            </span>

            {/* Risk Management Posture */}
            <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] sm:text-[11px] ${cashPct >= 50
              ? 'bg-blue-900/80 text-blue-200 border border-blue-700/50'
              : cashPct >= 20
                ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-700/50'
                : cashPct >= 5
                  ? 'bg-amber-900/80 text-amber-200 border border-amber-700/50'
                  : 'bg-rose-900/80 text-rose-200 border border-rose-700/50'
              }`}>
              {cashPct >= 50
                ? '🛡️ Phòng thủ cao'
                : cashPct >= 20
                  ? '⚖️ Cân bằng tối ưu'
                  : cashPct >= 5
                    ? '🚀 Tấn công chủ động'
                    : '⚡ Full 100% Cổ phiếu'}
            </span>
          </div>

          {/* Gauge progress bar */}
          <div className="w-full bg-slate-800/80 h-3.5 rounded-full overflow-hidden flex p-0.5 border border-indigo-700/40">
            <div
              style={{ width: `${cashPct}%` }}
              className="bg-emerald-500 rounded-l-full transition-all duration-500 relative group"
              title={`Tiền mặt: ${cashPct}% (${fmtMoney(cashBalance)}đ)`}
            />
            <div
              style={{ width: `${stockPct}%` }}
              className="bg-indigo-500 rounded-r-full transition-all duration-500 relative group"
              title={`Cổ phiếu: ${stockPct}% (${fmtMoney(totalMarketValue)}đ)`}
            />
          </div>
        </div>
      </div>

      {/* 🌟 BỘ LỌC CHU KỲ THỜI GIAN (TIME HORIZON SELECTOR) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>⏳</span> Chu Kỳ Hiệu Suất:
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
            {periodLabel}
          </span>
          {timeWindow !== 'all' && (
            <span className="text-[11px] text-gray-400 dark:text-slate-500 hidden sm:inline">
              (Lọc theo ngày chốt lệnh & nhận cổ tức)
            </span>
          )}
        </div>
        <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl gap-1 text-xs">
          {[
            { id: 'all', label: 'Toàn thời gian', icon: '🌐' },
            { id: 'ytd', label: 'Năm nay (YTD)', icon: '📅' },
            { id: '1y', label: '1 Năm', icon: '🎯' },
            { id: 'mtd', label: 'Tháng này (MTD)', icon: '⚡' },
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTimeWindow(item.id)}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 ${timeWindow === item.id
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

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
              <span>Vốn gốc: <b className="text-gray-600 dark:text-slate-300">{fmtMoney(holdingCost)}đ</b></span>
              {holdingCost > 0 && (
                <span className={`font-semibold ${plColor(totalUnrealizedPL)}`}>
                  • {totalUnrealizedPL >= 0 ? '+' : ''}{fmtMoney(totalUnrealizedPL)}đ ({totalUnrealizedPLPct >= 0 ? '+' : ''}{totalUnrealizedPLPct}%)
                </span>
              )}
            </div>
          }
        />
        <StatCard
          label={`Lãi / Lỗ thực hiện ${timeWindow !== 'all' ? `(${timeWindow.toUpperCase()})` : ''}`}
          value={
            <span className={plColor(periodRealizedPL)}>
              {periodRealizedPL >= 0 ? '+' : ''}{fmtMoney(periodRealizedPL)}đ
            </span>
          }
          sub={`${sellOrdersInPeriod.length} lệnh bán ${timeWindow !== 'all' ? 'trong kỳ' : 'đã chốt'}`}
        />
        <StatCard
          label={`Cổ tức thực nhận ${timeWindow !== 'all' ? `(${timeWindow.toUpperCase()})` : ''}`}
          value={
            <span className="text-emerald-600 dark:text-emerald-400">
              +{fmtMoney(periodCashDividends)}đ
            </span>
          }
          sub={`${(dividendsInPeriod || []).length} đợt chi trả ${timeWindow !== 'all' ? 'trong kỳ' : ''}`}
        />
        <StatCard
          label={timeWindow === 'all' ? "Tổng giao dịch" : `Hiệu suất trong kỳ`}
          value={timeWindow === 'all' ? txCount : `${periodWinRate}%`}
          sub={timeWindow === 'all' ? `${totalHolding.toLocaleString()} đang giữ` : `Win Rate (${periodWinCount}W / ${periodLossCount}L)`}
        />
      </div>

      {/* SO KÈO CHI PHÍ CƠ HỘI (CHỨNG KHOÁN VS TIẾT KIỆM NGÂN HÀNG) */}
      <OpportunityCostCard
        buyOrders={buyOrders}
        totalCumulativePL={timeWindow === 'all' ? totalCumulativePL : (periodRealizedPL + periodCashDividends + totalUnrealizedPL)}
      />

      {/* BẢNG CẢNH BÁO WATCHLIST (KHI CÓ CỔ PHIẾU ĐẠT MỤC TIÊU MUA / BÁN) */}
      {watchlistAlerts.length > 0 && !dismissAlerts && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 dark:from-amber-500/20 dark:via-slate-900/60 dark:to-emerald-500/20 border border-amber-300/80 dark:border-amber-700/60 rounded-2xl p-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg animate-bounce">🔔</span>
              <h4 className="font-extrabold text-xs sm:text-sm text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
                <span>Tín Hiệu Mục Tiêu Watchlist</span>
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {watchlistAlerts.length}
                </span>
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setDismissAlerts(true)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs px-2 py-0.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              title="Tạm ẩn cảnh báo"
            >
              ✕ Đóng
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {watchlistAlerts.map((alt, idx) => (
              <div
                key={`${alt.symbol}-${alt.type}-${idx}`}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${alt.type === 'BUY'
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                  }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm">{alt.symbol}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${alt.type === 'BUY' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}>
                      {alt.type === 'BUY' ? '🛒 VÙNG MUA' : '💸 VÙNG BÁN'}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-85 mt-0.5 truncate">{alt.message}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {alt.type === 'BUY' ? (
                    <button
                      type="button"
                      onClick={() => onNavigateBuy && onNavigateBuy(alt.symbol, '', alt.currentPrice)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[11px] shadow-xs cursor-pointer transition-transform active:scale-95"
                    >
                      Mua ngay
                    </button>
                  ) : alt.isHolding ? (
                    <button
                      type="button"
                      onClick={() => onNavigateSell && onNavigateSell(alt.symbol)}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] shadow-xs cursor-pointer transition-transform active:scale-95"
                    >
                      Chốt lời
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onSwitchTab && onSwitchTab('watchlist')}
                    className="text-[11px] text-gray-500 dark:text-gray-400 hover:underline px-1 cursor-pointer"
                  >
                    Xem
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BẢNG DANH MỤC ĐANG NẮM GIỮ (HIỂN THỊ TRÊN CÙNG THEO YÊU CẦU) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-gray-50/50 to-white dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-center justify-between gap-2 flex-wrap w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-gray-800 dark:text-slate-100 text-sm sm:text-base flex items-center gap-1.5">
                <span>📂</span> Danh Mục Đang Nắm Giữ
              </h2>
              <span className="text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-semibold border border-indigo-100 dark:border-indigo-900/50">
                {portfolio.length} mã
              </span>

              {/* Trạng thái phiên giao dịch thị trường */}
              {pricesData?.session && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${pricesData.session.isOpen ? 'bg-green-100 dark:bg-emerald-950/60 text-green-800 dark:text-emerald-300 border border-green-200 dark:border-emerald-800/50' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700'
                  }`}>
                  {pricesData.session.label}
                </span>
              )}
            </div>

            {/* Toggle dạng Thẻ / Bảng trên mobile */}
            {portfolio.length > 0 && (
              <div className="sm:hidden flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setMobileViewMode('card')}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${mobileViewMode === 'card'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                  📱 Thẻ
                </button>
                <button
                  type="button"
                  onClick={() => setMobileViewMode('table')}
                  className={`px-2 py-0.5 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${mobileViewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                  📊 Bảng
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs">
            {lastUpdated && (
              <span className="text-gray-400 dark:text-slate-400 text-[11px]">Vừa cập nhật: {lastUpdated}</span>
            )}
            <button
              onClick={() => loadMarketPrices(true)}
              disabled={loadingPrices}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-2xs text-xs"
              title="Lấy thị giá khớp lệnh thời gian thực từ sàn HOSE/HNX (Bỏ qua bộ đệm 1h)"
            >
              <span>{loadingPrices ? '⏳' : '⚡'}</span>
              <span>{loadingPrices ? 'Đang tải giá...' : 'Cập nhật giá sàn'}</span>
            </button>
          </div>
        </div>

        {/* Thanh Tìm Kiếm & Bộ Lọc Nhanh 1-Click */}
        {portfolio.length > 0 && (
          <div className="px-6 py-3 bg-gray-50/70 dark:bg-slate-900/60 border-b border-gray-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-gray-500 dark:text-slate-400 uppercase text-[11px] mr-1">Bộ lọc:</span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${statusFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
              >
                Tất cả ({portfolio.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('profit')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1 ${statusFilter === 'profit'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  }`}
              >
                <span>🟢 Đang Lãi</span>
                <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.2 rounded-full">{filterCounts.profit}</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('loss')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1 ${statusFilter === 'loss'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-red-600 dark:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/40'
                  }`}
              >
                <span>🔴 Đang Lỗ</span>
                <span className="text-[10px] bg-red-100 dark:bg-rose-900/60 text-red-700 dark:text-rose-300 px-1.5 py-0.2 rounded-full">{filterCounts.loss}</span>
              </button>
            </div>

            {/* Ô tìm kiếm mã & Nút mở DCA */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  value={symbolFilter}
                  onChange={e => setSymbolFilter(e.target.value.toUpperCase())}
                  placeholder="🔍 Tìm mã CP..."
                  className="w-36 sm:w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs uppercase font-bold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {symbolFilter && (
                  <button
                    type="button"
                    onClick={() => setSymbolFilter('')}
                    className="absolute right-2 top-1 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200"
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
                  className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800/60 transition-colors flex items-center gap-1 shadow-2xs"
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
            <p className="text-xs text-gray-400 mt-1">Chuyển sang tab "Mua / Bán" để thêm cổ phiếu mới</p>
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
              {/* Sắp xếp nhanh cho giao diện thẻ trên điện thoại */}
              {displayedPortfolio.length > 1 && (
                <div className="flex items-center justify-between bg-white border border-gray-200/80 rounded-xl px-3 py-2 text-xs shadow-2xs">
                  <span className="text-gray-500 font-medium text-[11px] flex items-center gap-1">
                    <span>↕️</span> Sắp xếp:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={sortField}
                      onChange={e => {
                        const newField = e.target.value;
                        setSortField(newField);
                        setSortDirection(newField === 'symbol' ? 'asc' : 'desc');
                      }}
                      className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    >
                      <option value="totalCost">Giá trị vốn</option>
                      <option value="symbol">Mã CP</option>
                      <option value="totalQty">Số lượng</option>
                      <option value="allocation">Tỷ trọng</option>
                      <option value="avgCost">Giá vốn TB</option>
                      <option value="marketPrice">Giá thị trường</option>
                      <option value="marketVal">Giá trị danh mục</option>
                      <option value="profitLoss">Lãi / Lỗ</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                      className="px-2 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold text-indigo-600 transition-colors shadow-2xs"
                      title={sortDirection === 'asc' ? 'Tăng dần (nhấn để đổi)' : 'Giảm dần (nhấn để đổi)'}
                    >
                      {sortDirection === 'asc' ? '▲' : '▼'}
                    </button>
                  </div>
                </div>
              )}

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
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${changePct > 0
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
              {displayedPortfolio.length > 1 && (
                <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-3.5 text-xs text-gray-700">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-indigo-200/60">
                    <span className="font-bold text-indigo-950 uppercase text-[11px]">
                      {displayedPortfolio.length === portfolio.length ? 'Tổng cộng danh mục' : `Tổng hiển thị (${displayedPortfolio.length}/${portfolio.length} mã)`}
                    </span>
                    <span className="font-semibold text-gray-600">{displayedHoldingQty.toLocaleString()} cổ phiếu</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-gray-500 block text-[10px]">Tổng giá vốn:</span>
                      <span className="font-bold text-gray-900">{fmtMoney(displayedHoldingCost)}đ</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">Tổng giá trị TT:</span>
                      <span className="font-bold text-gray-900">{fmtMoney(displayedMarketValue)}đ</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between">
                    <span className="text-gray-600 font-semibold text-[11px]">Tổng Lãi / Lỗ:</span>
                    <div className="text-right">
                      <span className={`text-sm font-extrabold mr-1.5 ${plColor(displayedUnrealizedPL)}`}>
                        {displayedUnrealizedPL >= 0 ? '+' : ''}{fmtMoney(displayedUnrealizedPL)}đ
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${plBg(displayedUnrealizedPL)}`}>
                        {displayedUnrealizedPL >= 0 ? '▲ +' : '▼ '}{displayedUnrealizedPLPct}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chế độ xem Bảng (Desktop mặc định / Mobile khi chọn Bảng) */}
            <div className={`overflow-x-auto ${mobileViewMode === 'card' ? 'hidden sm:block' : 'block'}`}>
              {mobileViewMode === 'table' && (
                <p className="sm:hidden text-[11px] text-indigo-700 dark:text-indigo-300 px-4 py-1.5 bg-indigo-50/60 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center gap-1 font-medium">
                  <span>👉</span> Vuốt ngang để xem toàn bộ thông số
                </p>
              )}
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 dark:bg-slate-950 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-slate-800 font-semibold select-none">
                  <tr>
                    {/* 1. Mã CP */}
                    <th
                      onClick={() => handleSort('symbol')}
                      className="text-left px-5 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group select-none sticky left-0 bg-gray-50/90 dark:bg-slate-950 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]"
                      title="Nhấn để sắp xếp theo Mã cổ phiếu"
                    >
                      <div className="inline-flex items-center">
                        <span className={sortField === 'symbol' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-700 dark:text-slate-300 font-bold'}>Mã CP</span>
                        {renderSortIcon('symbol')}
                      </div>
                    </th>

                    {/* 2. Số lượng */}
                    <th
                      onClick={() => handleSort('totalQty')}
                      className="text-right px-4 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group select-none"
                      title="Nhấn để sắp xếp theo Số lượng"
                    >
                      <div className="inline-flex items-center justify-end w-full">
                        <span className={sortField === 'totalQty' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>Số lượng</span>
                        {renderSortIcon('totalQty')}
                      </div>
                    </th>

                    {/* 3. Tỷ trọng */}
                    <th
                      onClick={() => handleSort('allocation')}
                      className="text-right px-4 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group select-none"
                      title="Nhấn để sắp xếp theo Tỷ trọng danh mục"
                    >
                      <div className="inline-flex items-center justify-end w-full">
                        <span className={sortField === 'allocation' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>Tỷ trọng</span>
                        {renderSortIcon('allocation')}
                      </div>
                    </th>

                    {/* 4. Giá vốn TB */}
                    <th
                      onClick={() => handleSort('avgCost')}
                      className="text-right px-4 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group select-none"
                      title="Nhấn để sắp xếp theo Giá vốn TB"
                    >
                      <div className="inline-flex items-center justify-end w-full">
                        <span className={sortField === 'avgCost' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>Giá vốn TB</span>
                        {renderSortIcon('avgCost')}
                      </div>
                    </th>

                    {/* 5. Giá trị vốn */}
                    <th
                      onClick={() => handleSort('totalCost')}
                      className="text-right px-4 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group select-none"
                      title="Nhấn để sắp xếp theo Giá trị vốn"
                    >
                      <div className="inline-flex items-center justify-end w-full">
                        <span className={sortField === 'totalCost' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-700 dark:text-slate-300 font-bold'}>Giá trị vốn</span>
                        {renderSortIcon('totalCost')}
                      </div>
                    </th>

                    {/* 6. Giá thị trường */}
                    <th
                      onClick={() => handleSort('marketPrice')}
                      className="text-right px-4 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group select-none"
                      title="Nhấn để sắp xếp theo Giá thị trường"
                    >
                      <div className="inline-flex items-center justify-end w-full">
                        <span className={sortField === 'marketPrice' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : ''}>Giá thị trường</span>
                        {renderSortIcon('marketPrice')}
                      </div>
                    </th>

                    {/* 7. Giá trị danh mục */}
                    <th
                      onClick={() => handleSort('marketVal')}
                      className="text-right px-5 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group select-none"
                      title="Nhấn để sắp xếp theo Giá trị danh mục"
                    >
                      <div className="inline-flex items-center justify-end w-full">
                        <span className={sortField === 'marketVal' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-700 dark:text-slate-300 font-bold'}>Giá trị danh mục</span>
                        {renderSortIcon('marketVal')}
                      </div>
                    </th>

                    {/* 8. Lãi / Lỗ */}
                    <th
                      onClick={() => handleSort('profitLoss')}
                      className="text-right px-5 py-3.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors group select-none"
                      title="Nhấn để sắp xếp theo Lãi / Lỗ"
                    >
                      <div className="inline-flex items-center justify-end w-full">
                        <span className={sortField === 'profitLoss' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-700 dark:text-slate-300 font-bold'}>Lãi / Lỗ</span>
                        {renderSortIcon('profitLoss')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
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
                      <tr key={p.symbol} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/60 transition-colors">
                        {/* 1. Mã CP */}
                        <td className="px-5 py-4 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-indigo-50/30 dark:group-hover:bg-slate-800/60 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
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
                        <td className="px-4 py-4 text-right font-semibold text-gray-800 dark:text-slate-200">
                          {p.totalQty.toLocaleString()} <span className="text-[11px] font-normal text-gray-400 dark:text-slate-400">cp</span>
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
                                <div className="w-12 h-1 bg-gray-200/80 dark:bg-slate-700 rounded-full overflow-hidden" title={`Tỷ trọng: ${allocationPct}%`}>
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
                        <td className="px-4 py-4 text-right font-bold text-gray-900 dark:text-slate-100">
                          {fmtMoney(p.totalCost)}đ
                        </td>

                        {/* 6. Giá Thị Trường (Live) */}
                        <td className="px-4 py-4 text-right">
                          {marketPrice ? (
                            <div>
                              <div className="font-bold text-gray-900 dark:text-slate-100 text-base">
                                {fmtMoney(marketPrice)}đ
                              </div>
                              <div className="text-[11px] flex items-center justify-end gap-1 mt-0.5">
                                <span className={`font-semibold ${changePct > 0 ? 'text-green-600 dark:text-emerald-400' : changePct < 0 ? 'text-red-500 dark:text-rose-400' : 'text-gray-500 dark:text-slate-400'}`}>
                                  {changePct > 0 ? '▲ +' : changePct < 0 ? '▼ ' : ''}{changePct}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400 dark:text-slate-400">
                              {loadingPrices ? 'Đang tải...' : '—'}
                            </div>
                          )}
                        </td>

                        {/* 7. Giá Trị Danh Mục (Thị trường) */}
                        <td className="px-5 py-4 text-right">
                          <div className="font-bold text-gray-900 dark:text-slate-100 text-base">{fmtMoney(marketVal)}đ</div>
                          <div className="text-[11px] text-gray-400 dark:text-slate-400 mt-0.5">
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
                            <div className="text-xs text-gray-400 dark:text-slate-400">—</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {displayedPortfolio.length > 1 && (
                  <tfoot className="bg-gray-50/80 dark:bg-slate-950 border-t-2 border-gray-200 dark:border-slate-800 font-semibold text-xs text-gray-700 dark:text-slate-200">
                    <tr>
                      {/* 1. Mã */}
                      <td className="px-5 py-3.5 text-left font-bold uppercase text-gray-500 dark:text-slate-400">
                        {displayedPortfolio.length === portfolio.length ? 'Tổng cộng' : 'Tổng hiển thị'}
                      </td>
                      {/* 2. SL */}
                      <td className="px-4 py-3.5 text-right font-bold text-gray-900 dark:text-slate-100">{displayedHoldingQty.toLocaleString()} cp</td>
                      {/* 3. Tỷ trọng */}
                      <td className="px-4 py-3.5 text-right font-bold text-gray-700 dark:text-slate-300">
                        {holdingCost > 0 ? `${((displayedHoldingCost / holdingCost) * 100).toFixed(1)}%` : '100%'}
                      </td>
                      {/* 4. Giá vốn TB */}
                      <td className="px-4 py-3.5 text-right text-gray-400 dark:text-slate-500">—</td>
                      {/* 5. Giá trị vốn */}
                      <td className="px-4 py-3.5 text-right font-bold text-gray-900 dark:text-slate-100">{fmtMoney(displayedHoldingCost)}đ</td>
                      {/* 6. Giá thị trường */}
                      <td className="px-4 py-3.5 text-right text-gray-400 dark:text-slate-500">—</td>
                      {/* 7. Giá trị danh mục */}
                      <td className="px-5 py-3.5 text-right font-bold text-gray-900 dark:text-slate-100 text-sm">{fmtMoney(displayedMarketValue)}đ</td>
                      {/* 8. Lãi / Lỗ */}
                      <td className="px-5 py-3.5 text-right">
                        <div className={`font-bold text-sm ${plColor(displayedUnrealizedPL)}`}>
                          {displayedUnrealizedPL >= 0 ? '+' : ''}{fmtMoney(displayedUnrealizedPL)}đ
                        </div>
                        <div className="mt-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${plBg(displayedUnrealizedPL)}`}>
                            {displayedUnrealizedPL >= 0 ? '▲ +' : '▼ '}{displayedUnrealizedPLPct}%
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

        {/* Footer tổng kết & trạng thái sắp xếp giống Lịch Sử Giao Dịch */}
        {displayedPortfolio.length > 0 && (
          <div className="px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-gray-50/50 dark:bg-slate-900/50">
            <span>
              Đang hiển thị <b>{displayedPortfolio.length}</b> / {portfolio.length} mã cổ phiếu
              {sortField && (
                <span className="ml-2 text-gray-400">
                  (Sắp xếp theo: <b className="text-gray-600">{
                    sortField === 'symbol' ? 'Mã CP' :
                      sortField === 'totalQty' ? 'Số lượng' :
                        sortField === 'allocation' ? 'Tỷ trọng' :
                          sortField === 'avgCost' ? 'Giá vốn TB' :
                            sortField === 'totalCost' ? 'Giá trị vốn' :
                              sortField === 'marketPrice' ? 'Giá thị trường' :
                                sortField === 'marketVal' ? 'Giá trị danh mục' :
                                  sortField === 'profitLoss' ? 'Lãi/Lỗ' : ''
                  } {sortDirection === 'asc' ? '▲ Tăng dần' : '▼ Giảm dần'}</b>)
                </span>
              )}
            </span>

            {(sortField !== 'totalCost' || sortDirection !== 'desc') && (
              <button
                type="button"
                onClick={() => {
                  setSortField('totalCost');
                  setSortDirection('desc');
                }}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                title="Đặt lại sắp xếp về mặc định (Giá trị vốn giảm dần)"
              >
                ↺ Mặc định
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stat Cards - Hàng 2: Thống kê hiệu suất trading & Rủi ro danh mục */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-slate-800">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Tỷ lệ thắng (Win Rate)</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{winRate}%</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{winCount} thắng / {lossCount} thua</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-slate-800">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">TB lệnh lãi</p>
          <p className="text-2xl font-bold text-green-600 dark:text-emerald-400 mt-1">+{fmtMoney(avgWin)}đ</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">trên các lệnh chốt lời</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-slate-800">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">TB lệnh lỗ</p>
          <p className="text-2xl font-bold text-red-500 dark:text-rose-400 mt-1">-{fmtMoney(avgLoss)}đ</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">trên các lệnh cắt lỗ</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-slate-800">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Profit Factor</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-slate-100 mt-1">{profitFactor}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">tổng lãi / tổng lỗ</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-slate-800">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Beta & Yield DM</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
              {portfolioBeta != null ? portfolioBeta : '—'}
            </span>
            <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">Beta</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
            {portfolioDividendYield != null ? `Cổ tức: +${portfolioDividendYield}%/năm` : 'Độ nhạy so với VN-Index'}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 border border-gray-100 dark:border-slate-800">
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wide">Sharpe & Sortino</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-400" title="Chỉ số Sharpe: Tỷ suất sinh lời vượt trội trên tổng biến động">
              {riskRatios.sharpe}
            </span>
            <span className="text-xs text-gray-400 dark:text-slate-500 font-medium">/</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400" title="Chỉ số Sortino: Tỷ suất sinh lời vượt trội trên biến động giảm (downside risk)">
              {riskRatios.sortino}
            </span>
          </div>
          <p className={`text-xs font-semibold mt-1 truncate ${riskRatios.ratingColor}`}>
            {riskRatios.ratingText}
          </p>
        </div>
      </div>

      {/* Biểu Đồ Trực Quan - 3 Hàng Chuyên Sâu */}
      <div className="space-y-4">
        {/* Hàng 1: Phân Bổ Vốn Danh Mục (Toggle Theo Mã CP / Theo Nhóm Ngành) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 dark:text-slate-200 text-sm flex items-center gap-1.5">
              <span>🥧</span> Phân Bổ Vốn Danh Mục
            </h3>
            <span className="text-xs text-gray-400 dark:text-slate-500">Tỷ trọng vốn & thị giá</span>
          </div>
          <PortfolioChart
            portfolio={portfolio}
            fundamentalsMap={fundamentalsMap}
            marketPrices={pricesData?.prices || {}}
          />
        </div>

        {/* Hàng 2: Lãi / Lỗ & Quỹ Đạo Vốn (Toggle Từng Tháng / Lũy Kế) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 dark:text-slate-200 text-sm flex items-center gap-1.5">
              <span>📊</span> Lãi / Lỗ & Quỹ Đạo Vốn {timeWindow !== 'all' && <span className="text-xs text-indigo-600 dark:text-indigo-400">({periodLabel})</span>}
            </h3>
            <span className="text-xs text-gray-400 dark:text-slate-500">Thực nhận sau phí</span>
          </div>
          <MonthlyPLChart sellOrders={sellOrdersInPeriod} dividends={dividendsInPeriod} />
        </div>

        {/* Hàng 3: Đóng Góp Hiệu Suất Từng Mã (Top Gainers vs Losers) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 dark:text-slate-200 text-sm flex items-center gap-1.5">
              <span>🎯</span> Đóng Góp Hiệu Suất Từng Mã {timeWindow !== 'all' && <span className="text-xs text-indigo-600 dark:text-indigo-400">({periodLabel})</span>}
            </h3>
            <span className="text-xs text-gray-400 dark:text-slate-500">Xếp hạng lợi nhuận theo mã</span>
          </div>
          <StockContributionChart
            buyOrders={buyOrders}
            sellOrders={sellOrdersInPeriod}
            dividends={dividendsInPeriod}
            marketPrices={pricesData?.prices || {}}
            onSelectSymbol={setSelectedSymbolModal}
          />
        </div>

        {/* Hàng 4: Biểu Đồ Thác Nước Hiệu Suất (Waterfall Return Bridge) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 dark:text-slate-200 text-sm flex items-center gap-1.5">
              <span>🌊</span> Biểu Đồ Thác Nước Hiệu Suất {timeWindow !== 'all' && <span className="text-xs text-indigo-600 dark:text-indigo-400">({periodLabel})</span>}
            </h3>
            <span className="text-xs text-gray-400 dark:text-slate-500">Dòng chảy vốn & lãi/lỗ</span>
          </div>
          <WaterfallReturnChart
            buyOrders={buyOrders}
            sellOrders={sellOrdersInPeriod}
            portfolio={portfolio}
            dividends={dividendsInPeriod}
            marketPrices={pricesData?.prices || {}}
          />
        </div>
      </div>

      {/* Lãi/Lỗ từng giao dịch bán gần nhất */}
      {sellOrdersInPeriod.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 dark:text-slate-200 flex items-center gap-1.5">
              <span>💹</span> Giao Dịch Bán Gần Nhất {timeWindow !== 'all' && <span className="text-xs text-indigo-600 dark:text-indigo-400 font-normal">({periodLabel})</span>}
            </h2>
            {onSwitchTab && (
              <button
                type="button"
                onClick={() => onSwitchTab('history')}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Xem tất cả ({sellOrdersInPeriod.length})</span>
                <span>→</span>
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-slate-400 text-xs uppercase">
                <tr>
                  <th className="text-left px-6 py-3">Mã</th>
                  <th className="text-right px-6 py-3">SL</th>
                  <th className="text-right px-6 py-3">Giá bán</th>
                  <th className="text-right px-6 py-3">Giá vốn TB</th>
                  <th className="text-right px-6 py-3">Lãi / Lỗ</th>
                  <th className="text-right px-6 py-3">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800/60">
                {[...sellOrdersInPeriod].reverse().slice(0, 5).map((s) => {
                  const avgCost = s.totalCost / s.quantity;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900/40">
                          {s.symbol}
                        </span>
                        {s.tags && s.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {s.tags.slice(0, 2).map(t => (
                              <span key={t} className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 px-1.5 py-0.2 rounded border border-gray-200 dark:border-slate-700">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-800 dark:text-slate-200">{s.quantity.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-gray-800 dark:text-slate-200">
                        <div>{fmtMoney(s.price)}đ</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-medium text-amber-800 dark:text-amber-400">{fmtMoney(avgCost)}đ</div>
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
        onSwitchTab={onSwitchTab}
      />

      {/* Modal Chỉnh Sửa Số Dư Tiền Mặt */}
      {isEditingCash && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-bold text-gray-800 dark:text-slate-100 text-base flex items-center gap-2">
                <span>💵</span> Cập Nhật Số Dư Tiền Mặt
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingCash(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCash} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">
                  Nhập số dư tiền mặt hiện tại (VNĐ):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={cashInput}
                    onChange={(e) => setCashInput(e.target.value)}
                    placeholder="VD: 50000000 (= 50.000.000đ)"
                    className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12"
                    autoFocus
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400 dark:text-slate-500 font-medium">VNĐ</span>
                </div>
                {cashInput && !isNaN(Number(cashInput)) && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5">
                    💵 Quy đổi: {fmtMoney(Number(cashInput))} đồng
                  </p>
                )}
              </div>

              {/* Phím bấm chọn nhanh */}
              <div>
                <p className="text-[11px] text-gray-400 dark:text-slate-500 mb-1.5">Gợi ý mốc tiền nhanh:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 10000000, 20000000, 50000000, 100000000, 200000000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashInput(amt.toString())}
                      className="text-xs bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer border border-transparent dark:border-slate-750"
                    >
                      {amt === 0 ? '0đ' : `${amt / 1000000} Triệu`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditingCash(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingCash}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingCash ? '⏳ Đang lưu...' : '💾 Lưu Số Dư'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
