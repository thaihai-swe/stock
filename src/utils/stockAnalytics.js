import {
  DEFAULT_BANK_INTEREST_RATE,
  VNINDEX_VOLATILITY,
  SHARPE_BRACKETS,
  DOWNSIDE_DEVIATION_PARAMS,
} from './constants.js';

/**
 * Engine Phân Tích Lãi / Lỗ Tích Luỹ Theo Từng Mã Cổ Phiếu (Per-Stock Cumulative P&L Engine)
 */

export function computeStockPerformance(buyOrders = [], sellOrders = [], dividends = [], marketPrices = {}, options = {}) {
  const { startDate = '', endDate = '' } = options;
  const isPeriodFilterActive = Boolean(startDate || endDate);

  // Bộ lọc ngày chuẩn YYYY-MM-DD
  const isDateInPeriod = (dateStr) => {
    if (!isPeriodFilterActive) return true;
    const d = dateStr ? String(dateStr).slice(0, 10) : '';
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  };

  const periodSellOrders = isPeriodFilterActive
    ? sellOrders.filter(s => isDateInPeriod(s.date))
    : sellOrders;

  const periodDividends = isPeriodFilterActive
    ? dividends.filter(d => isDateInPeriod(d.date))
    : dividends;

  const periodBuyOrders = isPeriodFilterActive
    ? buyOrders.filter(b => isDateInPeriod(b.date))
    : buyOrders;

  // 1. Gom nhóm danh sách các mã duy nhất từng xuất hiện
  const symbolSet = new Set();
  buyOrders.forEach(b => b.symbol && symbolSet.add(b.symbol.toUpperCase()));
  sellOrders.forEach(s => s.symbol && symbolSet.add(s.symbol.toUpperCase()));
  dividends.forEach(d => d.symbol && symbolSet.add(d.symbol.toUpperCase()));

  const allSymbols = Array.from(symbolSet).sort();

  // 2. Tính toán chi tiết cho từng mã cổ phiếu
  const rawStockList = allSymbols.map(symbol => {
    const allSymbolBuys = buyOrders.filter(b => b.symbol?.toUpperCase() === symbol);
    const symbolBuysInPeriod = periodBuyOrders.filter(b => b.symbol?.toUpperCase() === symbol);
    const symbolSells = periodSellOrders.filter(s => s.symbol?.toUpperCase() === symbol);
    const symbolDivs = periodDividends.filter(d => d.symbol?.toUpperCase() === symbol);

    // a. Khối lượng và giá vốn đang còn nắm giữ (vị thế mở thực tế)
    const holdingQty = allSymbolBuys.reduce((sum, b) => sum + (b.remainingQty !== undefined ? b.remainingQty : b.quantity), 0);
    const holdingCost = allSymbolBuys.reduce((sum, b) => sum + ((b.remainingQty || 0) * (b.costPerShare || b.price)), 0);
    const avgCost = holdingQty > 0 ? Math.round(holdingCost / holdingQty) : 0;
    const isHolding = holdingQty > 0;
    const status = isHolding ? 'HOLDING' : 'CLOSED';

    // b. Nếu đang bật lọc chu kỳ mà mã này không có bất kỳ lệnh mua/bán/cổ tức nào trong kỳ và không nắm giữ, đánh dấu bỏ qua
    const hasActivityInPeriod = symbolBuysInPeriod.length > 0 || symbolSells.length > 0 || symbolDivs.length > 0;
    if (isPeriodFilterActive && !hasActivityInPeriod && !isHolding) {
      return null;
    }

    // c. Tổng vốn đã giải ngân
    let totalInvested = 0;
    if (isPeriodFilterActive) {
      const buysCost = symbolBuysInPeriod.reduce((sum, b) => sum + (b.totalCost || (b.quantity * b.price)), 0);
      const sellsCostBasis = symbolSells.reduce((sum, s) => sum + (s.totalCost ?? ((s.netRevenue ?? s.totalRevenue ?? (s.quantity * s.price)) - (s.profitLoss || 0))), 0);
      totalInvested = buysCost > 0
        ? buysCost
        : (holdingCost > 0 ? holdingCost : (sellsCostBasis > 0 ? sellsCostBasis : allSymbolBuys.reduce((sum, b) => sum + (b.totalCost || (b.quantity * b.price)), 0)));
    } else {
      totalInvested = allSymbolBuys.reduce((sum, b) => sum + (b.totalCost || (b.quantity * b.price)), 0);
    }

    // d. Lãi / Lỗ đã chốt từ các lệnh bán trong kỳ (Realized P&L)
    const realizedPL = symbolSells.reduce((sum, s) => sum + (s.profitLoss || 0), 0);
    const sellCount = symbolSells.length;
    const winTrades = symbolSells.filter(s => (s.profitLoss || 0) > 0);
    const lossTrades = symbolSells.filter(s => (s.profitLoss || 0) < 0);
    const winCount = winTrades.length;
    const lossCount = lossTrades.length;
    const winRate = sellCount > 0 ? parseFloat(((winCount / sellCount) * 100).toFixed(1)) : 0;

    // e. Giá thị trường và Lãi / Lỗ tạm tính hiện tại (Unrealized P&L)
    const quote = marketPrices[symbol];
    const livePrice = quote?.price || null;
    let unrealizedPL = 0;
    let unrealizedPLPct = 0;
    let marketVal = holdingCost;

    if (holdingQty > 0 && livePrice) {
      marketVal = holdingQty * livePrice;
      unrealizedPL = marketVal - holdingCost;
      unrealizedPLPct = holdingCost > 0 ? parseFloat(((unrealizedPL / holdingCost) * 100).toFixed(2)) : 0;
    }

    // f. Cổ tức đã nhận trong kỳ
    const cashDividends = symbolDivs
      .filter(d => d.type === 'CASH')
      .reduce((sum, d) => sum + (d.netAmount || 0), 0);
    const stockDividends = symbolDivs
      .filter(d => d.type === 'STOCK')
      .reduce((sum, d) => sum + (d.quantity || 0), 0);

    // g. Tổng Lãi / Lỗ Tích Luỹ Chu Kỳ (Cumulative P&L)
    // = Lãi đã chốt trong kỳ + Lãi tạm tính hiện tại (nếu đang giữ) + Cổ tức tiền mặt trong kỳ
    const cumulativePL = realizedPL + (holdingQty > 0 ? unrealizedPL : 0) + cashDividends;

    // h. Tỷ suất sinh lời chu kỳ (ROI %)
    const roiPct = totalInvested > 0 ? parseFloat(((cumulativePL / totalInvested) * 100).toFixed(2)) : 0;

    // i. Mốc thời gian giao dịch đầu tiên & gần nhất trong kỳ
    const activeBuys = isPeriodFilterActive ? symbolBuysInPeriod : allSymbolBuys;
    const allDates = [
      ...activeBuys.map(b => b.date),
      ...symbolSells.map(s => s.date),
      ...symbolDivs.map(d => d.date),
    ].filter(Boolean).sort();
    const firstTradeDate = allDates[0] || '';
    const lastTradeDate = allDates[allDates.length - 1] || '';

    return {
      symbol,
      status,
      isHolding,
      holdingQty,
      holdingCost,
      avgCost,
      livePrice,
      marketVal,
      totalInvested,
      realizedPL,
      sellCount,
      winCount,
      lossCount,
      winRate,
      unrealizedPL: isHolding ? unrealizedPL : 0,
      unrealizedPLPct: isHolding ? unrealizedPLPct : 0,
      cashDividends,
      stockDividends,
      cumulativePL,
      roiPct,
      buyCount: activeBuys.length,
      divCount: symbolDivs.length,
      totalTrades: activeBuys.length + symbolSells.length + symbolDivs.length,
      firstTradeDate,
      lastTradeDate,
    };
  });

  const stockList = rawStockList.filter(Boolean);

  // 3. Tính toán các mã nổi bật (Key Highlights)
  const sortedByCumulative = [...stockList].sort((a, b) => b.cumulativePL - a.cumulativePL);
  const topProfitStock = sortedByCumulative.find(s => s.cumulativePL > 0) || null;
  const topLossStock = [...stockList].sort((a, b) => a.cumulativePL - b.cumulativePL).find(s => s.cumulativePL < 0) || null;
  const topDividendStock = [...stockList].sort((a, b) => b.cashDividends - a.cashDividends).find(s => s.cashDividends > 0) || null;

  const totalAllCumulativePL = stockList.reduce((sum, s) => sum + s.cumulativePL, 0);
  const totalAllRealizedPL = stockList.reduce((sum, s) => sum + s.realizedPL, 0);
  const totalAllCashDividends = stockList.reduce((sum, s) => sum + s.cashDividends, 0);
  const totalAllUnrealizedPL = stockList.reduce((sum, s) => sum + (s.isHolding ? s.unrealizedPL : 0), 0);

  const totalSells = stockList.reduce((sum, s) => sum + s.sellCount, 0);
  const totalWins = stockList.reduce((sum, s) => sum + s.winCount, 0);
  const overallWinRate = totalSells > 0 ? parseFloat(((totalWins / totalSells) * 100).toFixed(1)) : 0;

  return {
    stockList,
    topProfitStock,
    topLossStock,
    topDividendStock,
    totalAllCumulativePL,
    totalAllRealizedPL,
    totalAllCashDividends,
    totalAllUnrealizedPL,
    overallWinRate,
    totalSymbols: stockList.length,
    holdingSymbolsCount: stockList.filter(s => s.isHolding).length,
    closedSymbolsCount: stockList.filter(s => !s.isHolding).length,
  };
}

/**
 * Tính toán Bộ Chỉ Số Sharpe & Sortino Đo Lường Tỷ Suất Sinh Lời Vượt Trội / Rủi Ro
 * @param {Array} buyOrders
 * @param {Array} sellOrders
 * @param {Array} portfolio
 * @param {Array} dividends
 * @param {Object} marketPrices
 * @param {Object} fundamentalsMap
 * @param {Number} riskFreeRate - Lãi suất phi rủi ro / tiền gửi (mặc định 5.0%/năm)
 */
export function computeRiskAdjustedRatios(
  buyOrders = [],
  sellOrders = [],
  portfolio = [],
  dividends = [],
  marketPrices = {},
  fundamentalsMap = {},
  riskFreeRate = DEFAULT_BANK_INTEREST_RATE
) {
  const totalInvested = buyOrders.reduce((s, o) => s + (o.totalCost || (o.quantity * o.price)), 0);
  if (totalInvested <= 0) {
    return {
      sharpe: 0,
      sortino: 0,
      annualizedReturn: 0,
      portfolioVolatility: 0,
      downsideDeviation: 0,
      ratingText: 'Chưa đủ dữ liệu',
      ratingColor: 'text-gray-400',
      riskFreeRate,
    };
  }

  const realizedPL = sellOrders.reduce((s, o) => s + (o.profitLoss || 0), 0);
  const holdingCost = buyOrders.reduce((s, o) => s + ((o.remainingQty || 0) * (o.costPerShare || o.price)), 0);
  const totalMarketVal = portfolio.reduce((s, p) => {
    const curP = marketPrices[p.symbol]?.price || p.avgCost;
    return s + (p.totalQty * curP);
  }, 0);
  const unrealizedPL = totalMarketVal - holdingCost;
  const cashDividends = (dividends || []).filter(d => d.type === 'CASH').reduce((s, d) => s + (d.netAmount || 0), 0);
  const totalCumulativePL = realizedPL + unrealizedPL + cashDividends;
  const roiPct = (totalCumulativePL / totalInvested) * 100;

  // Xác định khoảng thời gian đầu tư
  const dates = buyOrders.map(b => b.date).filter(Boolean).sort();
  const firstDate = dates[0] ? new Date(dates[0]) : new Date();
  const diffDays = Math.max(1, Math.round((new Date().getTime() - firstDate.getTime()) / (1000 * 86400)));
  const holdingYears = Math.max(diffDays / 365, 0.08); // Tối thiểu ~1 tháng

  // Tỷ suất sinh lời hàng năm (Annualized Return)
  let annualizedReturn = 0;
  if (holdingYears >= 1) {
    const totalReturnFactor = 1 + (totalCumulativePL / totalInvested);
    if (totalReturnFactor > 0) {
      annualizedReturn = (Math.pow(totalReturnFactor, 1 / holdingYears) - 1) * 100;
    } else {
      annualizedReturn = -100;
    }
  } else {
    annualizedReturn = (roiPct / holdingYears);
  }
  // Giới hạn biên độ hiển thị hợp lý
  annualizedReturn = Math.max(-100, Math.min(annualizedReturn, 500));

  // Tính độ biến động danh mục (Portfolio Volatility - Sigma)
  let weightedBeta = 0;
  let validBetaWeight = 0;
  portfolio.forEach(p => {
    const curP = marketPrices[p.symbol]?.price || p.avgCost;
    const val = p.totalQty * curP;
    const beta = fundamentalsMap[p.symbol]?.technicals?.beta;
    if (beta != null && !isNaN(beta)) {
      weightedBeta += val * beta;
      validBetaWeight += val;
    }
  });

  const avgBeta = validBetaWeight > 0 ? (weightedBeta / validBetaWeight) : 1.0;
  // Biến động chuẩn VN-Index
  let portfolioVolatility = Math.max(5.0, avgBeta * VNINDEX_VOLATILITY);

  // Tính độ lệch chuẩn giảm (Downside Deviation) cho Sortino
  // Dựa trên tỷ lệ lệnh lỗ
  const lossTrades = sellOrders.filter(s => (s.profitLoss || 0) < 0);
  const lossRatio = sellOrders.length > 0
    ? (lossTrades.length / sellOrders.length)
    : (DOWNSIDE_DEVIATION_PARAMS.defaultLossRatio ?? 0.3);
  let downsideDeviation = Math.max(
    DOWNSIDE_DEVIATION_PARAMS.minDownsideFloor ?? 3.0,
    portfolioVolatility * Math.sqrt(Math.max(DOWNSIDE_DEVIATION_PARAMS.minLossRatioFloor ?? 0.15, lossRatio))
  );

  // Sharpe Ratio = (R_p - R_f) / Sigma
  const excessReturn = annualizedReturn - riskFreeRate;
  const sharpe = parseFloat((excessReturn / portfolioVolatility).toFixed(2));

  // Sortino Ratio = (R_p - R_f) / Downside Sigma
  const sortino = parseFloat((excessReturn / downsideDeviation).toFixed(2));

  // Xếp hạng chất lượng đầu tư theo thang điểm từ cấu hình
  let ratingText = 'Chưa đủ dữ liệu';
  let ratingColor = 'text-gray-400';

  const brackets = Array.isArray(SHARPE_BRACKETS)
    ? SHARPE_BRACKETS
    : (SHARPE_BRACKETS && typeof SHARPE_BRACKETS === 'object'
        ? Object.values(SHARPE_BRACKETS)
        : []);

  for (const b of brackets) {
    const minVal = b?.minSharpe ?? b?.min ?? -999;
    if (sharpe >= minVal) {
      ratingText = b?.text ?? b?.label ?? 'Chưa đủ dữ liệu';
      ratingColor = b?.color ?? 'text-gray-400';
      break;
    }
  }

  return {
    sharpe,
    sortino,
    annualizedReturn: parseFloat(annualizedReturn.toFixed(1)),
    portfolioVolatility: parseFloat(portfolioVolatility.toFixed(1)),
    downsideDeviation: parseFloat(downsideDeviation.toFixed(1)),
    ratingText,
    ratingColor,
    riskFreeRate,
  };
}

/**
 * Phân Tích Chi Phí Cơ Hội (Opportunity Cost vs Lãi Suất Tiết Kiệm Ngân Hàng)
 * @param {Array} buyOrders
 * @param {Number} totalCumulativePL
 * @param {Number} bankRate - Lãi suất gửi tiết kiệm %/năm (mặc định theo cấu hình)
 */
export function computeOpportunityCost(buyOrders = [], totalCumulativePL = 0, bankRate = DEFAULT_BANK_INTEREST_RATE) {
  if (!buyOrders || buyOrders.length === 0) {
    return {
      totalSimulatedInterest: 0,
      alphaCash: 0,
      alphaPct: 0,
      bankRoiPct: 0,
      stockRoiPct: 0,
      outperformed: false,
      totalInvested: 0,
      holdingDaysAvg: 0,
      bankRate,
    };
  }

  const now = new Date();
  let totalInvested = 0;
  let totalSimulatedInterest = 0;
  let totalWeightedDays = 0;

  buyOrders.forEach(b => {
    const cost = b.totalCost || (b.quantity * b.price);
    if (!cost || cost <= 0) return;
    totalInvested += cost;

    let buyDate = b.date ? new Date(b.date) : now;
    if (isNaN(buyDate.getTime())) buyDate = now;
    const days = Math.max(1, Math.floor((now.getTime() - buyDate.getTime()) / (1000 * 86400)));
    totalWeightedDays += days * cost;

    // Lãi tiết kiệm giả định: Vốn * (Lãi suất / 100) * (Số ngày / 365)
    const interest = cost * (bankRate / 100) * (days / 365);
    totalSimulatedInterest += interest;
  });

  const holdingDaysAvg = totalInvested > 0 ? Math.round(totalWeightedDays / totalInvested) : 0;
  const alphaCash = totalCumulativePL - totalSimulatedInterest;
  const stockRoiPct = totalInvested > 0 ? parseFloat(((totalCumulativePL / totalInvested) * 100).toFixed(2)) : 0;
  const bankRoiPct = totalInvested > 0 ? parseFloat(((totalSimulatedInterest / totalInvested) * 100).toFixed(2)) : 0;
  const alphaPct = parseFloat((stockRoiPct - bankRoiPct).toFixed(2));
  const outperformed = alphaCash >= 0;

  return {
    totalSimulatedInterest: Math.round(totalSimulatedInterest),
    alphaCash: Math.round(alphaCash),
    alphaPct,
    bankRoiPct,
    stockRoiPct,
    outperformed,
    totalInvested,
    holdingDaysAvg,
    bankRate,
  };
}
