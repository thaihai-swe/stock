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
