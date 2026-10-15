import {
  DISCIPLINE_TAGS,
  RISK_ALERT_WIN_RATE_THRESHOLD,
  STRATEGY_NARRATIVES,
} from './constants.js';

/**
 * Engine Phân Tích Hiệu Suất Chiến Lược & Tags (Trading Journal Analytics)
 */

export function analyzeStrategies(buyOrders = [], sellOrders = [], marketPrices = {}) {
  const buyMap = new Map();
  buyOrders.forEach(b => buyMap.set(b.id, b));

  // Hàm xác định 1 tag duy nhất cho lệnh mua
  function getBuyOrderTag(buyOrder) {
    if (buyOrder.tags && buyOrder.tags.length > 0 && buyOrder.tags[0]) {
      return buyOrder.tags[0];
    }
    return 'Chưa gắn thẻ';
  }

  const rawTags = Array.isArray(DISCIPLINE_TAGS)
    ? DISCIPLINE_TAGS
    : (DISCIPLINE_TAGS && typeof DISCIPLINE_TAGS === 'object'
        ? Object.values(DISCIPLINE_TAGS)
        : []);
  const disciplineTagNames = new Set(rawTags.map(t => t?.label || t?.id));

  // Hàm xác định 1 tag chiến lược duy nhất cho lệnh bán
  function getSellOrderTag(sellOrder) {
    if (sellOrder.tags && sellOrder.tags.length > 0) {
      const strat = sellOrder.tags.find(t => !disciplineTagNames.has(t));
      if (strat) return strat;
    }
    if (sellOrder.matchedLots && sellOrder.matchedLots.length > 0) {
      for (const m of sellOrder.matchedLots) {
        const parent = buyMap.get(m.buyOrderId);
        if (parent?.tags && parent.tags.length > 0) {
          const strat = parent.tags.find(t => !disciplineTagNames.has(t));
          if (strat) return strat;
        }
      }
    }
    if (sellOrder.tags && sellOrder.tags.length > 0 && sellOrder.tags[0]) {
      return sellOrder.tags[0];
    }
    return 'Chưa gắn thẻ';
  }

  // Thu thập tất cả các tags duy nhất trong hệ thống
  const allTagsSet = new Set();
  buyOrders.forEach(b => {
    allTagsSet.add(getBuyOrderTag(b));
  });

  sellOrders.forEach(s => {
    allTagsSet.add(getSellOrderTag(s));
  });

  const allTags = Array.from(allTagsSet);

  // Thống kê cho từng Tag
  const strategyList = allTags.map(tag => {
    // 1. Các lệnh bán chốt lời/lỗ liên quan đến tag này
    const closedTrades = sellOrders.filter(s => getSellOrderTag(s) === tag);
    const totalClosed = closedTrades.length;
    const winTrades = closedTrades.filter(s => (s.profitLoss || 0) > 0);
    const lossTrades = closedTrades.filter(s => (s.profitLoss || 0) < 0);
    const evenTrades = closedTrades.filter(s => (s.profitLoss || 0) === 0);

    const winCount = winTrades.length;
    const lossCount = lossTrades.length;
    const evenCount = evenTrades.length;
    const winRate = totalClosed > 0 ? parseFloat(((winCount / totalClosed) * 100).toFixed(1)) : 0;

    const totalRealizedPL = closedTrades.reduce((sum, s) => sum + (s.profitLoss || 0), 0);
    const avgPLPerTrade = totalClosed > 0 ? Math.round(totalRealizedPL / totalClosed) : 0;

    const totalWinAmount = winTrades.reduce((sum, s) => sum + s.profitLoss, 0);
    const totalLossAmount = Math.abs(lossTrades.reduce((sum, s) => sum + s.profitLoss, 0));

    const avgWin = winCount > 0 ? Math.round(totalWinAmount / winCount) : 0;
    const avgLoss = lossCount > 0 ? Math.round(totalLossAmount / lossCount) : 0;
    const winLossRatio = avgLoss > 0 ? parseFloat((avgWin / avgLoss).toFixed(2)) : (avgWin > 0 ? 99.9 : 0);

    const bestTrade = closedTrades.reduce((best, s) => {
      if (!best || (s.profitLoss || 0) > (best.profitLoss || 0)) return s;
      return best;
    }, null);

    const worstTrade = closedTrades.reduce((worst, s) => {
      if (!worst || (s.profitLoss || 0) < (worst.profitLoss || 0)) return s;
      return worst;
    }, null);

    // 2. Các vị thế đang nắm giữ (Active / Open Positions) thuộc tag này
    const activeLots = buyOrders.filter(b => {
      if (b.remainingQty <= 0) return false;
      return getBuyOrderTag(b) === tag;
    });

    const activeQty = activeLots.reduce((sum, b) => sum + b.remainingQty, 0);
    const activeCapital = activeLots.reduce((sum, b) => {
      const cost = b.costPerShare || b.price;
      return sum + (b.remainingQty * cost);
    }, 0);

    const activeMarketVal = activeLots.reduce((sum, b) => {
      const curPrice = marketPrices[b.symbol]?.price || (b.costPerShare || b.price);
      return sum + (b.remainingQty * curPrice);
    }, 0);

    const activeUnrealizedPL = Math.round(activeMarketVal - activeCapital);
    const activeUnrealizedPLPct = activeCapital > 0 ? parseFloat(((activeUnrealizedPL / activeCapital) * 100).toFixed(2)) : 0;
    const activeSymbols = Array.from(new Set(activeLots.map(b => b.symbol)));

    return {
      tag,
      totalClosed,
      winCount,
      lossCount,
      evenCount,
      winRate,
      totalRealizedPL,
      avgPLPerTrade,
      avgWin,
      avgLoss,
      winLossRatio,
      bestTrade,
      worstTrade,
      closedTrades,
      activeLots,
      activeQty,
      activeCapital: Math.round(activeCapital),
      activeMarketVal: Math.round(activeMarketVal),
      activeUnrealizedPL,
      activeUnrealizedPLPct,
      activeSymbols,
      totalActivity: totalClosed + activeLots.length,
    };
  }).filter(s => s.totalActivity > 0);

  // Sắp xếp mặc định: Tổng lãi/lỗ đã chốt giảm dần
  strategyList.sort((a, b) => b.totalRealizedPL - a.totalRealizedPL);

  // Thống kê toàn diện (Overall KPIs)
  const totalAllClosed = sellOrders.length;
  const totalAllWins = sellOrders.filter(s => (s.profitLoss || 0) > 0).length;
  const overallWinRate = totalAllClosed > 0 ? parseFloat(((totalAllWins / totalAllClosed) * 100).toFixed(1)) : 0;
  const overallRealizedPL = sellOrders.reduce((sum, s) => sum + (s.profitLoss || 0), 0);
  const totalHoldingCapital = strategyList.reduce((sum, s) => sum + s.activeCapital, 0);

  // Top performers
  const validClosedStrategies = strategyList.filter(s => s.totalClosed > 0);
  const topProfitStrategy = validClosedStrategies.length > 0 && validClosedStrategies[0].totalRealizedPL > 0
    ? validClosedStrategies[0]
    : null;

  const topWinRateStrategy = [...validClosedStrategies]
    .filter(s => s.totalClosed >= 1)
    .sort((a, b) => b.winRate - a.winRate)[0] || null;

  const topHoldingStrategy = [...strategyList]
    .filter(s => s.activeCapital > 0)
    .sort((a, b) => b.activeCapital - a.activeCapital)[0] || null;

  const riskAlertStrategy = [...validClosedStrategies]
    .filter(s => s.totalRealizedPL < 0 || s.winRate < RISK_ALERT_WIN_RATE_THRESHOLD)
    .sort((a, b) => a.totalRealizedPL - b.totalRealizedPL)[0] || null;

  // Tự động sinh Khuyến Nghị & Kỷ Luật Giao Dịch (Actionable Insights)
  const insights = [];

  if (topProfitStrategy) {
    const titleTemplate = STRATEGY_NARRATIVES.topProfitTitle || 'Chiến lược hiệu quả nhất: {tag}';
    const descTemplate = STRATEGY_NARRATIVES.topProfitDesc || 'Đã mang về tổng cộng +{profit}đ với tỷ lệ thắng {winRate}% ({winCount}/{totalClosed} lệnh). Tiếp tục phát huy thế mạnh này.';
    insights.push({
      type: 'success',
      icon: '🏆',
      title: titleTemplate.replace('{tag}', topProfitStrategy.tag),
      desc: descTemplate
        .replace('{profit}', new Intl.NumberFormat('vi-VN').format(topProfitStrategy.totalRealizedPL))
        .replace('{winRate}', String(topProfitStrategy.winRate))
        .replace('{winCount}', String(topProfitStrategy.winCount))
        .replace('{totalClosed}', String(topProfitStrategy.totalClosed)),
    });
  }

  if (riskAlertStrategy) {
    const titleTemplate = STRATEGY_NARRATIVES.riskAlertTitle || 'Cảnh báo chiến lược rủi ro: {tag}';
    const descTemplate = STRATEGY_NARRATIVES.riskAlertDesc || 'Chiến lược này đang ghi nhận {lossReason}. Hãy kiểm tra lại tiêu chí chọn điểm mua và kỷ luật cắt lỗ sớm.';
    const lossReason = riskAlertStrategy.totalRealizedPL < 0
      ? 'thua lỗ ' + new Intl.NumberFormat('vi-VN').format(riskAlertStrategy.totalRealizedPL) + 'đ'
      : 'tỷ lệ thắng chỉ ' + riskAlertStrategy.winRate + '%';
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: titleTemplate.replace('{tag}', riskAlertStrategy.tag),
      desc: descTemplate
        .replace('{lossReason}', lossReason),
    });
  }

  if (topHoldingStrategy && totalHoldingCapital > 0) {
    const allocPct = ((topHoldingStrategy.activeCapital / totalHoldingCapital) * 100).toFixed(1);
    const titleTemplate = STRATEGY_NARRATIVES.topHoldingTitle || 'Tập trung nguồn vốn: {tag}';
    const descTemplate = STRATEGY_NARRATIVES.topHoldingDesc || 'Chiếm {allocPct}% tổng vốn đang nắm giữ ({capital}đ) qua {symbolCount} mã ({symbols}).';
    insights.push({
      type: 'info',
      icon: '💼',
      title: titleTemplate.replace('{tag}', topHoldingStrategy.tag),
      desc: descTemplate
        .replace('{allocPct}', allocPct)
        .replace('{capital}', new Intl.NumberFormat('vi-VN').format(topHoldingStrategy.activeCapital))
        .replace('{symbolCount}', String(topHoldingStrategy.activeSymbols.length))
        .replace('{symbols}', topHoldingStrategy.activeSymbols.join(', ')),
    });
  }

  return {
    strategyList,
    totalAllClosed,
    overallWinRate,
    overallRealizedPL,
    totalHoldingCapital,
    topProfitStrategy,
    topWinRateStrategy,
    topHoldingStrategy,
    riskAlertStrategy,
    insights,
  };
}
