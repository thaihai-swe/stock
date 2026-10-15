import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { fetchFundamentals, fetchPrices, updateCashBalance } from '../utils/api.js';
import { fmtMoney } from '../utils/format.js';
import { computeRiskAdjustedRatios } from '../utils/stockAnalytics.js';
import DashboardAnalyticsHub from './dashboard/DashboardAnalyticsHub.jsx';
import DashboardHero from './dashboard/DashboardHero.jsx';
import DashboardHoldingsTable from './dashboard/DashboardHoldingsTable.jsx';
import DashboardKpiMatrix from './dashboard/DashboardKpiMatrix.jsx';
import DashboardRecentSales from './dashboard/DashboardRecentSales.jsx';
import PortfolioStressTestCard from './dashboard/PortfolioStressTestCard.jsx';
import OpportunityCostCard from './OpportunityCostCard.jsx';
import TimeHorizonFilter, { calculateDateRange } from './common/TimeHorizonFilter.jsx';
import Modal from './common/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { TIMEFRAME_IDS } from '../utils/constants.js';

const StockDetailModal = lazy(() => import('./StockDetailModal.jsx'));

export default function Dashboard({
  data,
  onNavigateBuy,
  onNavigateDca,
  onNavigateSell,
  onSuccess,
  refreshKey,
  onSwitchTab,
}) {
  const { showToast } = useToast();
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

  // State Sắp xếp dữ liệu danh mục nắm giữ
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
  const totalCashDividends = (dividends || []).filter(d => d.type === 'CASH').reduce((sum, d) => sum + (d.netAmount || 0), 0);

  // State Chu kỳ thời gian (Time Horizon Filter): 'ALL' | 'YTD' | '1Y' | 'MTD' | 'CUSTOM'
  const [timePreset, setTimePreset] = useState(TIMEFRAME_IDS.ALL);
  const [periodStartDate, setPeriodStartDate] = useState('');
  const [periodEndDate, setPeriodEndDate] = useState('');
  const [periodLabel, setPeriodLabel] = useState('Toàn thời gian');
  const timeWindow = timePreset;

  const handleTimeRangeChange = useCallback(({ preset, startDate, endDate, label }) => {
    setTimePreset(preset);
    setPeriodStartDate(startDate);
    setPeriodEndDate(endDate);
    setPeriodLabel(label);
  }, []);

  // Lọc các giao dịch bán và cổ tức theo chu kỳ thời gian
  const sellOrdersInPeriod = useMemo(() => {
    if (timePreset === TIMEFRAME_IDS.ALL && !periodStartDate && !periodEndDate) return sellOrders;
    return sellOrders.filter(s => {
      const d = s.date ? String(s.date).slice(0, 10) : '';
      return (!periodStartDate || d >= periodStartDate) && (!periodEndDate || d <= periodEndDate);
    });
  }, [sellOrders, timePreset, periodStartDate, periodEndDate]);

  const dividendsInPeriod = useMemo(() => {
    if (timePreset === TIMEFRAME_IDS.ALL && !periodStartDate && !periodEndDate) return dividends;
    return (dividends || []).filter(d => {
      const dateVal = d.date ? String(d.date).slice(0, 10) : '';
      return (!periodStartDate || dateVal >= periodStartDate) && (!periodEndDate || dateVal <= periodEndDate);
    });
  }, [dividends, timePreset, periodStartDate, periodEndDate]);

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
    if (isNaN(val)) return;
    setSavingCash(true);
    try {
      await updateCashBalance(val);
      setCashBalance(val);
      setIsEditingCash(false);
      showToast('✅ Đã cập nhật số dư tiền mặt thành công!', 'success');
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast(err.message || 'Lỗi cập nhật số dư tiền mặt', 'error');
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

  // Bộ Chỉ Số Sharpe & Sortino
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

  // Sắp xếp danh mục hiển thị
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
      {/* 🌟 1. BENTO HERO SECTION: NAV, CASH ALLOCATION, QUICK ACTIONS */}
      <DashboardHero
        totalNAV={totalNAV}
        cashBalance={cashBalance}
        totalMarketValue={totalMarketValue}
        cashPct={cashPct}
        stockPct={stockPct}
        totalCumulativePL={totalCumulativePL}
        totalCumulativePLPct={totalCumulativePLPct}
        periodRealizedPL={periodRealizedPL}
        periodCashDividends={periodCashDividends}
        totalUnrealizedPL={totalUnrealizedPL}
        timeWindow={timePreset}
        periodLabel={periodLabel}
        pricesSession={pricesData?.session}
        lastUpdated={lastUpdated}
        loadingPrices={loadingPrices}
        onRefreshPrices={() => loadMarketPrices(true)}
        onOpenEditCash={() => {
          setCashInput(cashBalance > 0 ? cashBalance.toString() : '');
          setIsEditingCash(true);
        }}
        onNavigateBuy={onNavigateBuy}
        onNavigateSell={onNavigateSell}
        onNavigateDca={onNavigateDca}
        onSwitchTab={onSwitchTab}
      />

      {/* 🌟 2. BỘ LỌC CHU KỲ THỜI GIAN (TIME HORIZON SELECTOR) */}
      <div className="card-base p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span>⏳</span> Chu Kỳ Hiệu Suất:
          </span>
          <span className="badge-indigo text-xs">
            {periodLabel}
          </span>
          {timePreset !== TIMEFRAME_IDS.ALL && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">
              (Lọc theo ngày chốt lệnh bán & nhận cổ tức)
            </span>
          )}
        </div>
        <TimeHorizonFilter
          preset={timePreset}
          startDate={periodStartDate}
          endDate={periodEndDate}
          onChange={handleTimeRangeChange}
          customLabel="Khoảng Thời Gian:"
        />
      </div>

      {/* 🌟 3. CẢNH BÁO MỤC TIÊU WATCHLIST (NẾU CÓ) */}
      {watchlistAlerts.length > 0 && !dismissAlerts && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 dark:from-amber-500/20 dark:via-slate-900/60 dark:to-emerald-500/20 border border-amber-300/80 dark:border-amber-700/60 rounded-2xl p-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg animate-bounce">🔔</span>
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <span>Tín Hiệu Mục Tiêu Watchlist</span>
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {watchlistAlerts.length}
                </span>
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setDismissAlerts(true)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
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
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${alt.type === 'BUY' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                        }`}
                    >
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

      {/* 🌟 4. MA TRẬN TÀI CHÍNH 3 TRỤ CỘT (3-PILLAR FINANCIAL MATRIX) */}
      <DashboardKpiMatrix
        totalInvested={totalInvested}
        holdingCost={holdingCost}
        totalMarketValue={totalMarketValue}
        totalUnrealizedPL={totalUnrealizedPL}
        totalUnrealizedPLPct={totalUnrealizedPLPct}
        buyOrdersCount={buyOrders.length}
        timeWindow={timePreset}
        periodLabel={periodLabel}
        periodRealizedPL={periodRealizedPL}
        periodCashDividends={periodCashDividends}
        periodDividendsCount={(dividendsInPeriod || []).length}
        sellOrdersInPeriodCount={sellOrdersInPeriod.length}
        totalCumulativePL={totalCumulativePL}
        totalCumulativePLPct={totalCumulativePLPct}
        winRate={winRate}
        winCount={winCount}
        lossCount={lossCount}
        avgWin={avgWin}
        avgLoss={avgLoss}
        profitFactor={profitFactor}
        portfolioBeta={portfolioBeta}
        portfolioDividendYield={portfolioDividendYield}
        riskRatios={riskRatios}
      />

      {/* 🌟 5. SỔ CÁI DANH MỤC NẮM GIỮ (HOLDINGS LEDGER) */}
      <DashboardHoldingsTable
        portfolio={portfolio}
        displayedPortfolio={displayedPortfolio}
        pricesData={pricesData}
        holdingCost={holdingCost}
        symbolFilter={symbolFilter}
        setSymbolFilter={setSymbolFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        filterCounts={filterCounts}
        sortField={sortField}
        sortDirection={sortDirection}
        handleSort={handleSort}
        renderSortIcon={renderSortIcon}
        mobileViewMode={mobileViewMode}
        setMobileViewMode={setMobileViewMode}
        displayedHoldingQty={displayedHoldingQty}
        displayedHoldingCost={displayedHoldingCost}
        displayedMarketValue={displayedMarketValue}
        displayedUnrealizedPL={displayedUnrealizedPL}
        displayedUnrealizedPLPct={displayedUnrealizedPLPct}
        onSelectSymbol={setSelectedSymbolModal}
        onNavigateBuy={onNavigateBuy}
        onNavigateSell={onNavigateSell}
        onNavigateDca={onNavigateDca}
      />

      {/* 🌟 5b. ĐO LƯỜNG SỨC KHỎE DANH MỤC & CHỊU TẢI VĨ MÔ (AI PORTFOLIO STRESS-TEST) */}
      <PortfolioStressTestCard
        holdings={displayedPortfolio}
        cashBalance={data?.cashBalance || 0}
        onRefreshSuccess={onSuccess}
      />

      {/* 🌟 6. TRUNG TÂM PHÂN TÍCH THỊ GIÁ & LỢI NHUẬN 4-TRONG-1 (ANALYTICS HUB) */}
      <DashboardAnalyticsHub
        portfolio={portfolio}
        buyOrders={buyOrders}
        sellOrders={sellOrders}
        dividends={dividends}
        marketPrices={pricesData?.prices || {}}
        fundamentalsMap={fundamentalsMap}
        timeWindow={timePreset}
        periodLabel={periodLabel}
        onSelectSymbolModal={setSelectedSymbolModal}
      />

      {/* 🌟 7. BOTTOM DUAL DOCK: CHI PHÍ CƠ HỘI & LỆNH BÁN GẦN NHẤT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <OpportunityCostCard
          buyOrders={buyOrders}
          totalCumulativePL={
            timePreset === TIMEFRAME_IDS.ALL
              ? totalCumulativePL
              : (periodRealizedPL + periodCashDividends + totalUnrealizedPL)
          }
        />
        <DashboardRecentSales
          sellOrders={sellOrdersInPeriod}
          timeWindow={timePreset}
          periodLabel={periodLabel}
          onSwitchTab={onSwitchTab}
        />
      </div>

      {/* 🌟 8. MODAL SỔ CÁI TÍCH LUỸ TỪNG MÃ (FIFO P/L LEDGER) */}
      {selectedSymbolModal && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      {/* 🌟 9. MODAL CẬP NHẬT SỐ DƯ TIỀN MẶT */}
      <Modal
        isOpen={isEditingCash}
        onClose={() => setIsEditingCash(false)}
        title="Cập Nhật Số Dư Tiền Mặt"
        icon="💵"
        size="md"
      >
        <form onSubmit={handleSaveCash} className="space-y-4 p-5 sm:p-6">
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 mb-1">
              Nhập số dư tiền mặt hiện tại (VNĐ):
            </label>
            <div className="relative">
              <input
                type="number"
                step="1000"
                value={cashInput}
                onChange={(e) => setCashInput(e.target.value)}
                placeholder="VD: 50000000 hoặc -20000000 (nếu vay margin)"
                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12"
                autoFocus
              />
              <span className="absolute right-3 top-2.5 text-xs text-gray-400 dark:text-slate-500 font-medium">VNĐ</span>
            </div>
            {cashInput && !isNaN(Number(cashInput)) && (
              <p className={`text-xs font-semibold mt-1.5 ${Number(cashInput) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {Number(cashInput) < 0 ? '⚠️ Dư nợ ký quỹ (Margin): ' : '💵 Quy đổi: '}
                {fmtMoney(Number(cashInput))} đồng
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
      </Modal>
    </div>
  );
}
