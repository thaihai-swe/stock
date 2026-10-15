import { DEFAULT_CONSTANTS } from './constants.js';

/**
 * Fallback configuration for SBV OMO & Interbank Radar
 */
const DEFAULT_RADAR_CONFIG = {
  interbankStressThreshold: 6.0,
  interbankComfortThreshold: 3.0,
  interbankSpreadWarning: 1.5,
  usdVndInterventionThreshold: 25500,
  stressScoreWeights: {
    interbankRate: 0.40,
    interbankSpread: 0.30,
    usdVndPressure: 0.20,
    m2Growth: 0.10
  },
  postures: {
    FLUSH: {
      maxScore: 35,
      label: 'Dồi Dào',
      description: 'Thanh khoản liên ngân hàng dồi dào, tiền rẻ hỗ trợ mạnh mẽ thị trường chứng khoán',
      badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      equityGuidance: 'Môi trường tiền tệ lý tưởng để nắm giữ tỷ trọng cổ phiếu cao (70-90%).'
    },
    NEUTRAL: {
      maxScore: 65,
      label: 'Cân Bằng',
      description: 'Thanh khoản ở mức ổn định, SBV điều tiết nhịp nhàng, thị trường phân hóa theo kết quả kinh doanh',
      badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      equityGuidance: 'Duy trì tỷ trọng cân bằng (50-70%), tập trung chọn lọc cổ phiếu cơ bản tốt.'
    },
    TIGHTENING: {
      maxScore: 100,
      label: 'Căng Thẳng',
      description: 'Thanh khoản liên ngân hàng thắt chặt, SBV có xu hướng hút ròng để kiềm chế tỷ giá, cảnh báo rủi ro rung lắc',
      badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      equityGuidance: 'Hạn chế dùng Margin, nâng tỷ trọng tiền mặt (30-50%), phòng thủ danh mục.'
    }
  }
};

/**
 * Clamps a number within min and max
 */
function clamp(val, min = 0, max = 100) {
  return Math.min(Math.max(val, min), max);
}

/**
 * Calculates SBV OMO & Interbank Liquidity Radar metrics
 * @param {Object} macroData - Full macro valuation data object
 * @param {Object} customConfig - Optional custom configuration override
 * @returns {Object} Deterministic quantitative metrics + Weekly AI Strategic layer
 */
export function calculateSbvOmoRadar(macroData = {}, customConfig = null) {
  const config = customConfig || DEFAULT_CONSTANTS.sbvOmoRadarConfig || DEFAULT_RADAR_CONFIG;
  const weights = config.stressScoreWeights || DEFAULT_RADAR_CONFIG.stressScoreWeights;
  const macro = macroData?.macro || {};

  // 1. Raw indicators extraction with safe defaults
  const interbankRate = Number(
    macro.interbankOvernight ??
    macroData?.interbankOvernight ??
    6.47
  );

  const sbvRefinancingRate = Number(
    macro.sbvRefinancingRate ??
    macroData?.sbvRefinancingRate ??
    4.50
  );

  const usdVndRate = Number(
    macro.usdVndRate ??
    macroData?.usdVndRate ??
    25894
  );

  const m2GrowthYoY = Number(
    macro.creditGrowthYoY ??
    macroData?.creditGrowthYoY ??
    12.0
  );

  const fxReservesM = Number(
    macroData?.tradingEconomics?.money?.items?.find(i => i.name?.includes('Reserves'))?.value ??
    82813
  );

  // 2. Spread calculation
  // Spread = Interbank ON - SBV Refinancing Rate
  const interbankSpread = Number((interbankRate - sbvRefinancingRate).toFixed(2));
  const isSpreadElevated = interbankSpread >= (config.interbankSpreadWarning ?? 1.5);

  // 3. Normalized component scores (0 - 100 scale)
  // Interbank Rate: 3.0% (0) to 7.0% (100)
  const minRate = config.interbankComfortThreshold ?? 3.0;
  const maxRate = (config.interbankStressThreshold ?? 6.0) + 1.0; // 7.0
  const interbankNorm = clamp(((interbankRate - minRate) / (maxRate - minRate)) * 100);

  // Spread: 0.0% (0) to 2.5% (100)
  const spreadNorm = clamp((interbankSpread / 2.5) * 100);

  // USD/VND: 24,500 (0) to 26,000 (100)
  const minFx = 24500;
  const maxFx = 26000;
  const usdVndNorm = clamp(((usdVndRate - minFx) / (maxFx - minFx)) * 100);

  // M2 Growth Drag: 15% (0 stress) to 9% (100 stress)
  const m2Norm = clamp(((15.0 - m2GrowthYoY) / (15.0 - 9.0)) * 100);

  // 4. Weighted Composite Stress Score (0 - 100)
  const compositeStressScore = clamp(
    Number((
      (interbankNorm * (weights.interbankRate ?? 0.40)) +
      (spreadNorm * (weights.interbankSpread ?? 0.30)) +
      (usdVndNorm * (weights.usdVndPressure ?? 0.20)) +
      (m2Norm * (weights.m2Growth ?? 0.10))
    ).toFixed(1))
  );

  // 5. Posture Determination
  let postureKey = 'NEUTRAL';
  const postures = config.postures || DEFAULT_RADAR_CONFIG.postures;

  if (compositeStressScore <= (postures.FLUSH?.maxScore ?? 35)) {
    postureKey = 'FLUSH';
  } else if (compositeStressScore <= (postures.NEUTRAL?.maxScore ?? 65)) {
    postureKey = 'NEUTRAL';
  } else {
    postureKey = 'TIGHTENING';
  }

  const postureInfo = postures[postureKey] || DEFAULT_RADAR_CONFIG.postures[postureKey];

  // 6. Actionable guidance for equity market
  let equityStatus = 'Cân bằng & Phân hóa';
  if (postureKey === 'FLUSH') {
    equityStatus = 'Thuận Lợi — Tiền Rẻ Tràn Đầy';
  } else if (postureKey === 'TIGHTENING') {
    equityStatus = 'Thận Trọng — Áp Lực Hút Tiền';
  }

  // 7. Weekly AI Strategic Diagnosis Layer
  const aiDiagnosis = macroData?.aiSbvOmoDiagnosis || {
    updatedAt: new Date().toISOString(),
    liquidityPosture: postureKey,
    headline: 'Áp Lực Tỷ Giá USD/VND Buộc SBV Duy Trì Lãi Suất Liên Ngân Hàng Neo Cao',
    strategicNarrative: 'Chênh lệch lãi suất USD-VND vẫn âm và tỷ giá neo sát trần can thiệp khiến SBV tiếp tục duy trì trạng thái hút ròng thanh khoản tiền tệ qua kênh OMO/tín phiếu nhằm nâng đỡ giá trị đồng nội tệ.',
    bankingNIMImpact: 'Chi phí vốn thị trường 2 tăng nhẹ gây áp lực lên NIM của các ngân hàng thương mại nhỏ phụ thuộc vốn liên ngân hàng, nhóm Big4 có tỷ lệ CASA vượt trội vẫn giữ vững vị thế.',
    equityMarketVerdict: 'Dòng tiền trên TTCK sẽ phân hóa mạnh. VN-Index có thể gặp rung lắc thanh khoản ngắn hạn, dòng vốn thông minh sẽ tìm đến các cổ phiếu phòng thủ có dòng tiền dồi dào và tỷ lệ nợ vay thấp.',
    actionableAdvice: postureInfo.equityGuidance,
    provider: 'system_curated'
  };

  return {
    interbankRate,
    sbvRefinancingRate,
    interbankSpread,
    isSpreadElevated,
    usdVndRate,
    m2GrowthYoY,
    fxReservesM,
    compositeStressScore,
    postureKey,
    posture: postureInfo,
    equityStatus,
    equityGuidance: postureInfo.equityGuidance,
    componentScores: {
      interbankNorm: Math.round(interbankNorm),
      spreadNorm: Math.round(spreadNorm),
      usdVndNorm: Math.round(usdVndNorm),
      m2Norm: Math.round(m2Norm)
    },
    aiDiagnosis
  };
}
