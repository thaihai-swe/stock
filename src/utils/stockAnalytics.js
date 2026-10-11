/**
 * Engine Phân Tích Lãi / Lỗ Tích Luỹ Theo Từng Mã Cổ Phiếu (Per-Stock Cumulative P&L Engine)
 */

export function computeStockPerformance(buyOrders = [], sellOrders = [], dividends = [], marketPrices = {}) {
  // 1. Gom nhóm danh sách các mã duy nhất từng xuất hiện
  const symbolSet = new Set();
  buyOrders.forEach(b => b.symbol && symbolSet.add(b.symbol.toUpperCase()));
  sellOrders.forEach(s => s.symbol && symbolSet.add(s.symbol.toUpperCase()));
  dividends.forEach(d => d.symbol && symbolSet.add(d.symbol.toUpperCase()));

  const allSymbols = Array.from(symbolSet).sort();

  // 2. Tính toán chi tiết cho từng mã cổ phiếu
  const stockList = allSymbols.map(symbol => {
    const symbolBuys = buyOrders.filter(b => b.symbol?.toUpperCase() === symbol);
    const symbolSells = sellOrders.filter(s => s.symbol?.toUpperCase() === symbol);
    const symbolDivs = dividends.filter(d => d.symbol?.toUpperCase() === symbol);

    // a. Tổng vốn đã giải ngân qua các đợt mua
    const totalInvested = symbolBuys.reduce((sum, b) => sum + (b.totalCost || (b.quantity * b.price)), 0);

    // b. Khối lượng và giá vốn đang còn nắm giữ (vị thế mở)
    const holdingQty = symbolBuys.reduce((sum, b) => sum + (b.remainingQty !== undefined ? b.remainingQty : b.quantity), 0);
    const holdingCost = symbolBuys.reduce((sum, b) => sum + ((b.remainingQty || 0) * (b.costPerShare || b.price)), 0);
    const avgCost = holdingQty > 0 ? Math.round(holdingCost / holdingQty) : 0;

    // c. Lãi / Lỗ đã chốt từ các lệnh bán trong quá khứ (Realized P&L)
    const realizedPL = symbolSells.reduce((sum, s) => sum + (s.profitLoss || 0), 0);
    const sellCount = symbolSells.length;
    const winTrades = symbolSells.filter(s => (s.profitLoss || 0) > 0);
    const lossTrades = symbolSells.filter(s => (s.profitLoss || 0) < 0);
    const winCount = winTrades.length;
    const lossCount = lossTrades.length;
    const winRate = sellCount > 0 ? parseFloat(((winCount / sellCount) * 100).toFixed(1)) : 0;

    // d. Giá thị trường và Lãi / Lỗ tạm tính hiện tại (Unrealized P&L)
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

    // e. Cổ tức đã nhận
    const cashDividends = symbolDivs
      .filter(d => d.type === 'CASH')
      .reduce((sum, d) => sum + (d.netAmount || 0), 0);
    const stockDividends = symbolDivs
      .filter(d => d.type === 'STOCK')
      .reduce((sum, d) => sum + (d.quantity || 0), 0);

    // f. Tổng Lãi / Lỗ Tích Luỹ Toàn Thời Gian (All-Time Cumulative P&L)
    // = Lãi đã chốt + Lãi tạm tính hiện tại + Cổ tức tiền mặt đã nhận
    const cumulativePL = realizedPL + (holdingQty > 0 ? unrealizedPL : 0) + cashDividends;

    // g. Tỷ suất sinh lời toàn thời gian (All-Time ROI %)
    const roiPct = totalInvested > 0 ? parseFloat(((cumulativePL / totalInvested) * 100).toFixed(2)) : 0;

    // h. Trạng thái vị thế
    const isHolding = holdingQty > 0;
    const status = isHolding ? 'HOLDING' : 'CLOSED'; // 'HOLDING': Đang nắm giữ, 'CLOSED': Đã tất toán

    // i. Mốc thời gian giao dịch đầu tiên & gần nhất
    const allDates = [
      ...symbolBuys.map(b => b.date),
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
      buyCount: symbolBuys.length,
      divCount: symbolDivs.length,
      totalTrades: symbolBuys.length + symbolSells.length + symbolDivs.length,
      firstTradeDate,
      lastTradeDate,
    };
  });

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
  riskFreeRate = 5.0
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
  // Biến động chuẩn VN-Index ~ 18.0%/năm
  let portfolioVolatility = Math.max(5.0, avgBeta * 18.0);

  // Tính độ lệch chuẩn giảm (Downside Deviation) cho Sortino
  // Dựa trên tỷ lệ lệnh lỗ
  const lossTrades = sellOrders.filter(s => (s.profitLoss || 0) < 0);
  const lossRatio = sellOrders.length > 0 ? (lossTrades.length / sellOrders.length) : 0.3;
  let downsideDeviation = Math.max(3.0, portfolioVolatility * Math.sqrt(Math.max(0.15, lossRatio)));

  // Sharpe Ratio = (R_p - R_f) / Sigma
  const excessReturn = annualizedReturn - riskFreeRate;
  const sharpe = parseFloat((excessReturn / portfolioVolatility).toFixed(2));

  // Sortino Ratio = (R_p - R_f) / Downside Sigma
  const sortino = parseFloat((excessReturn / downsideDeviation).toFixed(2));

  // Xếp hạng chất lượng đầu tư
  let ratingText = 'Chưa đủ dữ liệu';
  let ratingColor = 'text-gray-400';

  if (sharpe >= 2.0) {
    ratingText = 'Xuất sắc (Top-tier)';
    ratingColor = 'text-emerald-600 dark:text-emerald-400';
  } else if (sharpe >= 1.0) {
    ratingText = 'Tốt (Đạt chuẩn)';
    ratingColor = 'text-indigo-600 dark:text-indigo-400';
  } else if (sharpe >= 0) {
    ratingText = 'Khá (Bù đắp rủi ro)';
    ratingColor = 'text-amber-600 dark:text-amber-400';
  } else {
    ratingText = 'Dưới lãi tiết kiệm';
    ratingColor = 'text-rose-600 dark:text-rose-400';
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
 * @param {Number} bankRate - Lãi suất gửi tiết kiệm %/năm (mặc định 5.0%)
 */
export function computeOpportunityCost(buyOrders = [], totalCumulativePL = 0, bankRate = 5.0) {
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
