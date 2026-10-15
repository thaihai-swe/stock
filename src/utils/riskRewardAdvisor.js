/**
 * src/utils/riskRewardAdvisor.js
 * Động Cơ Quản Trị Vị Thế: Điểm Cắt Lỗ Kỷ Luật & Mốc Chặn Lãi (Trailing Stop)
 * Thước Đo Tỷ Lệ Thưởng / Rủi Ro (Risk-Reward Ratio — R:R)
 * 
 * Nguyên tắc thiết kế:
 * 1. TRUNG THỰC & CHUẨN XÁC: Đang lỗ hoặc chưa có lãi thì tuyệt đối KHÔNG tính tiền lãi khóa.
 * 2. ĐƠN GIẢN & DỄ HIỂU: Ngôn ngữ mộc mạc, phân định rạch ròi giữa "Mốc Cắt Lỗ" và "Mốc Chặn Lãi".
 * 3. BẢO TOÀN VỐN: Khi có lãi từ +6% trở lên mới bắt đầu kích hoạt khóa hòa vốn và khóa lãi.
 */
import defaultConstantsJson from '../../data/default-constant-value.json' with { type: 'json' };

export const RISK_REWARD_CONFIG = defaultConstantsJson?.riskRewardConfig || {
  defaultInitialStopLossPct: 7.0, // Cắt lỗ kỷ luật ban đầu (-7% từ giá vốn)
  breakevenTriggerPct: 6.0,       // Lãi từ +6% trở lên: Dời mốc chặn lên Hòa Vốn
  tier1ProfitTriggerPct: 15.0,    // Lãi từ +15% trở lên: Khóa lãi tối thiểu +8%
  superProfitTriggerPct: 30.0,    // Lãi từ +30% trở lên: Siết sát đỉnh (-6% từ đỉnh)
  warningDistancePct: 2.5,        // Khoảng cách cảnh báo khi tiệm cận mức dừng (<= 2.5%)
};

export const TAKE_PROFIT_GRID_CONFIG = defaultConstantsJson?.takeProfitGridConfig || {
  tier1RatioPct: 30.0,
  tier1MinProfitPct: 15.0,
  tier1FairValueDiscountPct: 12.0,
  tier2RatioPct: 40.0,
  tier2FairValueRatio: 1.0,
  tier3RatioPct: 30.0,
  tier3BubblePremiumPct: 20.0,
  defaultFallbackGainPct: 25.0,
  tiers: [
    {
      tier: 1,
      name: "Tầng 1",
      label: "Thu Hồi Vốn & Khóa Lãi Đệm",
      description: "Bán một phần lô đầu để bảo toàn vốn gốc, đưa vị thế vào trạng thái tâm lý thảnh thơi",
      defaultSellPct: 30,
      badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800"
    },
    {
      tier: 2,
      name: "Tầng 2",
      label: "Chốt Lời Theo Định Giá Hợp Lý",
      description: "Chốt phần lớn thành quả khi thị giá chạm đúng Giá Trị Hợp Lý (Consensus Fair Value)",
      defaultSellPct: 40,
      badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
    },
    {
      tier: 3,
      name: "Tầng 3",
      label: "Thả Trôi Bắt Trọn Siêu Sóng",
      description: "Giữ phần còn lại gồng lãi theo Trailing Stop (không bán non, chỉ bán khi gãy mốc dừng)",
      defaultSellPct: 30,
      badge: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800"
    }
  ]
};

/**
 * Tính toán mức Cắt Lỗ Kỷ Luật hoặc Mốc Chặn Lãi (Trailing Stop) cho 1 vị thế.
 * 
 * @param {Object} params
 * @param {number} params.avgCost - Giá vốn bình quân (đ)
 * @param {number} params.marketPrice - Thị giá hiện tại (đ)
 * @param {number} [params.breakEvenPrice] - Giá hòa vốn (đã tính thuế phí)
 * @returns {Object} Kết quả phân tích chi tiết
 */
export function calculateSmartTrailingStop({
  avgCost = 0,
  marketPrice = 0,
  breakEvenPrice = null,
}) {
  const cfg = RISK_REWARD_CONFIG;
  const cost = Number(avgCost) || 0;
  const current = Number(marketPrice) || cost;

  // Giá hòa vốn (tính thuế phí bán mặc định 0.1%)
  const resolvedBreakEven = breakEvenPrice && breakEvenPrice > 0
    ? breakEvenPrice
    : Math.round(cost / 0.999);

  // % Lãi/lỗ tạm tính hiện tại
  const currentPLPct = cost > 0 ? parseFloat((((current - cost) / cost) * 100).toFixed(2)) : 0;

  let mode = 'STOP_LOSS'; // 'STOP_LOSS' | 'BREAKEVEN' | 'LOCK_PROFIT_1' | 'LOCK_PROFIT_2'
  let stopPrice = 0;
  let modeLabel = '';
  let modeDesc = '';
  let modeBadge = '';
  let lockedProfitPerShare = 0;

  // 1. Phân loại theo mức lãi thực tế từ giá vốn
  if (currentPLPct < cfg.breakevenTriggerPct) {
    // TRƯỜNG HỢP A: Đang lỗ, hòa vốn hoặc mới chớm lãi nhẹ (< +6%)
    // -> Chưa đủ biên độ để khóa lãi. Mục tiêu cao nhất là BẢO VỆ VỐN qua Mốc Cắt Lỗ Kỷ Luật (-7%)
    mode = 'STOP_LOSS';
    stopPrice = Math.round(cost * (1 - cfg.defaultInitialStopLossPct / 100));
    modeLabel = 'Cắt Lỗ Kỷ Luật';
    modeDesc = `Canh mốc cắt lỗ kỷ luật -${cfg.defaultInitialStopLossPct}% (${stopPrice.toLocaleString()}đ) để bảo toàn vốn`;
    modeBadge = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
    lockedProfitPerShare = 0; // Chưa có lãi để khóa
  } else if (currentPLPct < cfg.tier1ProfitTriggerPct) {
    // TRƯỜNG HỢP B: Lãi từ +6% đến dưới +15%
    // -> Tự động nâng mốc chặn lên GIÁ HÒA VỐN (Free Trade). Nếu giá quay đầu thì bán hòa vốn, rủi ro mất vốn = 0!
    mode = 'BREAKEVEN';
    stopPrice = resolvedBreakEven;
    modeLabel = 'Bảo Vệ Hòa Vốn';
    modeDesc = `Đã lãi +${currentPLPct}%. Mốc chặn nâng lên giá hòa vốn ${resolvedBreakEven.toLocaleString()}đ (Rủi ro mất vốn về 0)`;
    modeBadge = 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    lockedProfitPerShare = 0;
  } else if (currentPLPct < cfg.superProfitTriggerPct) {
    // TRƯỜNG HỢP C: Lãi từ +15% đến dưới +30%
    // -> Khóa lãi chắc chắn tối thiểu +8% từ giá vốn HOẶC cách thị giá hiện tại -7%
    mode = 'LOCK_PROFIT_1';
    const trailingFromCurrent = Math.round(current * 0.93);
    const floorLock = Math.round(cost * 1.08);
    stopPrice = Math.max(trailingFromCurrent, floorLock);
    modeLabel = 'Khóa Lãi Bậc 1';
    modeDesc = `Đang lãi +${currentPLPct}%. Mốc chặn lãi là ${stopPrice.toLocaleString()}đ (Bảo vệ tối thiểu ≥ +8% lãi)`;
    modeBadge = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    lockedProfitPerShare = Math.max(0, Math.round(stopPrice * 0.999) - cost);
  } else {
    // TRƯỜNG HỢP D: Siêu lãi từ +30% trở lên
    // -> Thắt chặt mốc chặn sát thị giá (-6% từ giá hiện tại) để tối đa hóa lợi nhuận
    mode = 'LOCK_PROFIT_2';
    stopPrice = Math.round(current * 0.94);
    modeLabel = 'Khóa Lãi Siêu Chu Kỳ';
    modeDesc = `Đang siêu lãi +${currentPLPct}%. Mốc chặn lãi siết sát giá hiện tại ở ${stopPrice.toLocaleString()}đ (-6%)`;
    modeBadge = 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    lockedProfitPerShare = Math.max(0, Math.round(stopPrice * 0.999) - cost);
  }

  // 2. Tính khoảng cách từ thị giá hiện tại đến mốc dừng (%)
  const distancePct = current > 0
    ? parseFloat((((current - stopPrice) / current) * 100).toFixed(2))
    : 0;

  // 3. Trạng thái hành động: Vi phạm / Áp sát / An toàn
  const isTriggered = current <= stopPrice;
  const isWarning = !isTriggered && distancePct <= cfg.warningDistancePct;

  let urgency = 'SAFE';
  let statusText = '🟢 An toàn';
  let statusColor = 'text-emerald-600 dark:text-emerald-400';
  let badgeBg = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

  if (isTriggered) {
    urgency = 'TRIGGERED';
    statusText = mode === 'STOP_LOSS' ? '🚨 Chạm mức Cắt Lỗ' : '🚨 Chạm mốc Chặn Lãi';
    statusColor = 'text-rose-600 dark:text-rose-400';
    badgeBg = 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300 dark:border-rose-800';
  } else if (isWarning) {
    urgency = 'WARNING';
    statusText = mode === 'STOP_LOSS' ? '⚠️ Gần chạm Cắt Lỗ' : '⚠️ Gần chạm Chặn Lãi';
    statusColor = 'text-amber-600 dark:text-amber-400';
    badgeBg = 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300 dark:border-amber-800';
  }

  return {
    mode, // 'STOP_LOSS' | 'BREAKEVEN' | 'LOCK_PROFIT_1' | 'LOCK_PROFIT_2'
    modeLabel,
    modeDesc,
    modeBadge,
    costPrice: cost,
    marketPrice: current,
    stopPrice, // Mức giá cắt lỗ hoặc chặn lãi
    trailingStopPrice: stopPrice, // Alias tương thích
    tierRationale: modeDesc, // Alias tương thích
    currentPLPct,
    distancePct, // Còn cách bao nhiêu % nữa mới chạm stop
    isTriggered,
    isWarning,
    urgency,
    statusText,
    statusColor,
    badgeBg,
    lockedProfitPerShare, // Tiền lãi chắc chắn đã khóa trên mỗi cổ phiếu
  };
}

/**
 * Tính toán Thước Đo Tỷ Lệ Thưởng / Rủi Ro (Risk-Reward Ratio — R:R) thực tế.
 * 
 * @param {Object} params
 * @param {number} params.marketPrice - Thị giá hiện tại (đ)
 * @param {number} [params.targetPrice] - Mức giá kỳ vọng chốt lời (Fair Value)
 * @param {number} [params.stopPrice] - Mức giá cắt lỗ hoặc chặn lãi (đ)
 * @returns {Object}
 */
export function calculateRiskRewardRatio({
  marketPrice = 0,
  targetPrice = null,
  stopPrice = null,
}) {
  const current = Number(marketPrice) || 1;
  const target = targetPrice && targetPrice > 0 ? Number(targetPrice) : Math.round(current * 1.2);
  const stop = stopPrice && stopPrice > 0 ? Number(stopPrice) : Math.round(current * 0.93);

  const upside = Math.max(0, target - current);
  const downside = Math.max(0, current - stop);

  let ratio = 0;
  if (downside <= 0) {
    // Đã chạm hoặc thủng mức dừng -> Không còn tỷ lệ thưởng hợp lệ
    ratio = 0;
  } else {
    // Giới hạn tỷ lệ R:R tối đa 10.0 : 1 để tránh sinh ra các con số ảo 127:1
    const rawRatio = upside / downside;
    ratio = parseFloat(Math.min(10.0, rawRatio).toFixed(1));
  }

  let rating = 'POOR';
  let ratingLabel = '🔴 Bất Lợi (R:R < 1.5)';
  let color = 'text-rose-600 dark:text-rose-400';
  let bg = 'bg-rose-50 dark:bg-rose-950/60';
  let border = 'border-rose-200 dark:border-rose-800/50';

  if (ratio >= 3.0) {
    rating = 'EXCELLENT';
    ratingLabel = '🌟 Kèo Tốt (R:R ≥ 3:1)';
    color = 'text-emerald-600 dark:text-emerald-400';
    bg = 'bg-emerald-50 dark:bg-emerald-950/60';
    border = 'border-emerald-200 dark:border-emerald-800/50';
  } else if (ratio >= 2.0) {
    rating = 'GOOD';
    ratingLabel = '🟢 Khả Quan (R:R ≥ 2:1)';
    color = 'text-blue-600 dark:text-blue-400';
    bg = 'bg-blue-50 dark:bg-blue-950/60';
    border = 'border-blue-200 dark:border-blue-800/50';
  } else if (ratio >= 1.5) {
    rating = 'FAIR';
    ratingLabel = '🟡 Cân Nhắc (R:R ≥ 1.5:1)';
    color = 'text-amber-600 dark:text-amber-400';
    bg = 'bg-amber-50 dark:bg-amber-950/60';
    border = 'border-amber-200 dark:border-amber-800/50';
  }

  return {
    ratio,
    ratioString: `${ratio.toFixed(1)} : 1`,
    targetPrice: target,
    stopPrice: stop,
    currentPrice: current,
    upside,
    downside,
    rating,
    ratingLabel,
    color,
    bg,
    border,
  };
}

/**
 * Tính toán Lưới Chốt Lời Khoa Học 3 Tầng hoàn toàn từ cấu hình động (Không fix cứng).
 * 
 * @param {Object} params
 * @param {number} params.avgCost - Giá vốn bình quân (đ)
 * @param {number} params.marketPrice - Thị giá hiện tại (đ)
 * @param {number} params.totalQty - Tổng khối lượng cổ phiếu nắm giữ
 * @param {number} [params.fairValue] - Giá trị hợp lý hội tụ (Fair Value)
 * @param {Object} [params.config] - Cấu hình động tùy chỉnh (mặc định lấy TAKE_PROFIT_GRID_CONFIG)
 * @returns {Object}
 */
export function calculateTakeProfitGrid({
  avgCost = 0,
  marketPrice = 0,
  totalQty = 0,
  fairValue = null,
  config = TAKE_PROFIT_GRID_CONFIG,
}) {
  const cost = Number(avgCost) || 0;
  const current = Number(marketPrice) || cost;
  const qty = Number(totalQty) || 0;

  // 1. Xác định mốc Giá Trị Hợp Lý (Fair Value)
  const resolvedFairValue = fairValue && Number(fairValue) > 0
    ? Number(fairValue)
    : Math.round(cost * (1 + (Number(config?.defaultFallbackGainPct) || 25) / 100));

  // 2. Tính toán giá mục tiêu từng tầng từ cấu hình
  const t1Discount = (Number(config?.tier1FairValueDiscountPct) || 12) / 100;
  const t1MinGain = (Number(config?.tier1MinProfitPct) || 15) / 100;
  const tier1Price = Math.max(Math.round(cost * (1 + t1MinGain)), Math.round(resolvedFairValue * (1 - t1Discount)));

  const tier2Price = Math.round(resolvedFairValue * (Number(config?.tier2FairValueRatio) || 1.0));

  const t3Premium = (Number(config?.tier3BubblePremiumPct) || 20) / 100;
  const tier3Price = Math.round(resolvedFairValue * (1 + t3Premium));

  // 3. Phân bổ khối lượng bán theo % từ cấu hình
  const t1Ratio = (Number(config?.tier1RatioPct) || 30) / 100;
  const t2Ratio = (Number(config?.tier2RatioPct) || 40) / 100;
  const tier1Qty = Math.round(qty * t1Ratio);
  const tier2Qty = Math.round(qty * t2Ratio);
  const tier3Qty = Math.max(0, qty - tier1Qty - tier2Qty);

  // 4. Lãi/lỗ kỳ vọng từng tầng & khoảng cách từ thị giá
  const calcGainPct = (price) => cost > 0 ? parseFloat((((price - cost) / cost) * 100).toFixed(1)) : 0;
  const calcDistPct = (target) => current > 0 ? parseFloat((((target - current) / current) * 100).toFixed(1)) : 0;

  const t1Meta = config?.tiers?.[0] || {};
  const t2Meta = config?.tiers?.[1] || {};
  const t3Meta = config?.tiers?.[2] || {};

  return {
    fairValue: resolvedFairValue,
    tiers: [
      {
        tier: 1,
        name: t1Meta.name || 'Tầng 1',
        label: t1Meta.label || 'Thu Hồi Vốn & Khóa Lãi Đệm',
        description: t1Meta.description || '',
        badge: t1Meta.badge || 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        targetPrice: tier1Price,
        targetGainPct: calcGainPct(tier1Price),
        distancePct: calcDistPct(tier1Price),
        suggestedQty: tier1Qty,
        suggestedRatioPct: config?.tier1RatioPct || 30,
        isReached: current >= tier1Price,
      },
      {
        tier: 2,
        name: t2Meta.name || 'Tầng 2',
        label: t2Meta.label || 'Chốt Lời Theo Định Giá Hợp Lý',
        description: t2Meta.description || '',
        badge: t2Meta.badge || 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        targetPrice: tier2Price,
        targetGainPct: calcGainPct(tier2Price),
        distancePct: calcDistPct(tier2Price),
        suggestedQty: tier2Qty,
        suggestedRatioPct: config?.tier2RatioPct || 40,
        isReached: current >= tier2Price,
      },
      {
        tier: 3,
        name: t3Meta.name || 'Tầng 3',
        label: t3Meta.label || 'Thả Trôi Bắt Trọn Siêu Sóng',
        description: t3Meta.description || '',
        badge: t3Meta.badge || 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        targetPrice: tier3Price,
        targetGainPct: calcGainPct(tier3Price),
        distancePct: calcDistPct(tier3Price),
        suggestedQty: tier3Qty,
        suggestedRatioPct: config?.tier3RatioPct || 30,
        isReached: current >= tier3Price,
      },
    ],
  };
}

/**
 * Đánh giá danh mục toàn diện: Tính tiền lãi đã khóa thực tế và các vị thế cần chú ý.
 */
export function evaluatePortfolioProtections({
  portfolio = [],
  marketPrices = {},
  fundamentalsMap = {},
  watchlist = [],
}) {
  if (!Array.isArray(portfolio) || portfolio.length === 0) {
    return {
      items: [],
      summary: {
        totalHoldings: 0,
        profitableCount: 0,
        lockedCount: 0,
        totalLockedProfit: 0,
        totalCurrentUnrealizedPL: 0,
        triggeredCount: 0,
        warningCount: 0,
        safeCount: 0,
        avgPortfolioRR: '0.0 : 1',
        hasActionRequired: false,
      },
    };
  }

  let totalLockedProfit = 0;
  let totalCurrentUnrealizedPL = 0;
  let triggeredCount = 0;
  let warningCount = 0;
  let safeCount = 0;
  let lockedCount = 0;
  let sumRR = 0;
  let validRRCount = 0;

  const items = portfolio.map((holding) => {
    const symbol = holding.symbol;
    const qty = holding.totalQty || 0;
    const avgCost = holding.avgCost || 0;
    const breakEvenPrice = holding.breakEvenPrice || Math.round(avgCost / 0.999);

    const quote = marketPrices[symbol];
    const marketPrice = quote?.price || avgCost;

    // 1. Tính toán Mốc Dừng (Cắt lỗ hoặc Chặn lãi)
    const protection = calculateSmartTrailingStop({
      avgCost,
      marketPrice,
      breakEvenPrice,
    });

    // 2. Xác định Target Price cho Thước đo R:R
    const watchItem = watchlist.find(w => w.symbol === symbol);
    const fundamentals = fundamentalsMap[symbol] || {};
    const consensusFairValue = fundamentals.valuation?.consensusDetails?.cleanWeightedAvg
      || fundamentals.valuation?.consensusDetails?.cleanMedian
      || null;

    const targetPrice = watchItem?.targetSellPrice
      || consensusFairValue
      || Math.round(marketPrice * 1.25);

    // 3. Tính toán R:R
    const rr = calculateRiskRewardRatio({
      marketPrice,
      targetPrice,
      stopPrice: protection.stopPrice,
    });

    // 4. Lưới Chốt Lời Khoa Học 3 Tầng
    const takeProfitGrid = calculateTakeProfitGrid({
      avgCost,
      marketPrice,
      totalQty: qty,
      fairValue: targetPrice,
    });

    // 5. Tiền lãi khóa thực tế (VNĐ)
    const lockedTotalAmount = Math.round(protection.lockedProfitPerShare * qty);
    const currentUnrealizedPL = Math.round((marketPrice - avgCost) * qty);

    totalLockedProfit += lockedTotalAmount;
    totalCurrentUnrealizedPL += currentUnrealizedPL;

    if (protection.lockedProfitPerShare > 0) lockedCount++;

    if (protection.isTriggered) triggeredCount++;
    else if (protection.isWarning) warningCount++;
    else safeCount++;

    if (rr.ratio > 0) {
      sumRR += rr.ratio;
      validRRCount++;
    }

    return {
      symbol,
      totalQty: qty,
      avgCost,
      marketPrice,
      breakEvenPrice,
      mode: protection.mode,
      modeLabel: protection.modeLabel,
      modeDesc: protection.modeDesc,
      modeBadge: protection.modeBadge,
      stopPrice: protection.stopPrice,
      currentPLPct: protection.currentPLPct,
      distancePct: protection.distancePct,
      isTriggered: protection.isTriggered,
      isWarning: protection.isWarning,
      urgency: protection.urgency,
      statusText: protection.statusText,
      statusColor: protection.statusColor,
      badgeBg: protection.badgeBg,
      lockedProfitPerShare: protection.lockedProfitPerShare,
      lockedTotalAmount,
      currentUnrealizedPL,
      targetPrice,
      rr,
      takeProfitGrid,
    };
  });

  const avgRRValue = validRRCount > 0 ? (sumRR / validRRCount).toFixed(1) : '0.0';

  return {
    items,
    summary: {
      totalHoldings: portfolio.length,
      profitableCount: items.filter(i => i.currentPLPct > 0).length,
      lockedCount,
      totalLockedProfit,
      totalCurrentUnrealizedPL,
      triggeredCount,
      warningCount,
      safeCount,
      avgPortfolioRR: `${avgRRValue} : 1`,
      hasActionRequired: triggeredCount > 0,
    },
  };
}
