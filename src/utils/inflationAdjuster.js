import { DEFAULT_CONSTANTS } from './constants.js';

/**
 * Fallback configuration for Inflation Adjustment & Real Purchasing Power
 */
const DEFAULT_INFLATION_CONFIG = {
  defaultBenchmarkSavingsRate: 5.5,
  defaultAnnualCpi: 5.08,
  realReturnBrackets: [
    { minRealReturn: 10.0, rating: 'OUTPERFORM', label: 'Đại Thắng Lạm Phát (> +10%)', color: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
    { minRealReturn: 3.0, rating: 'BEAT_INFLATION', label: 'Vượt Trội Lạm Phát (+3% đến +10%)', color: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
    { minRealReturn: 0.0, rating: 'PRESERVED', label: 'Bảo Toàn Sức Mua (0% đến +3%)', color: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
    { minRealReturn: -999.0, rating: 'EROSION', label: 'Bị Lạm Phát Bào Mòn (< 0%)', color: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' }
  ]
};

/**
 * Calculates Fisher Real Rate of Return:
 * r_real = ((1 + r_nominal) / (1 + i_cpi)) - 1
 * @param {number} nominalReturnPct - Nominal return in percentage (e.g. 15 for 15%)
 * @param {number} cpiPct - CPI inflation rate in percentage (e.g. 5.08 for 5.08%)
 * @returns {number} Real return in percentage rounded to 2 decimal places
 */
export function calculateFisherRealReturn(nominalReturnPct = 0, cpiPct = 5.08) {
  const rNom = Number(nominalReturnPct) / 100;
  const iCpi = Number(cpiPct) / 100;

  if (1 + iCpi === 0) return Number(nominalReturnPct);

  const rReal = ((1 + rNom) / (1 + iCpi)) - 1;
  return Number((rReal * 100).toFixed(2));
}

/**
 * Determines the purchasing power performance bracket
 * @param {number} realReturnPct - Calculated real return percentage
 * @param {Array} brackets - Brackets configuration
 * @returns {Object} Bracket object
 */
export function getRealReturnBracket(realReturnPct = 0, brackets = null) {
  const list = brackets || DEFAULT_CONSTANTS.inflationReturnConfig?.realReturnBrackets || DEFAULT_INFLATION_CONFIG.realReturnBrackets;
  for (const b of list) {
    if (realReturnPct >= b.minRealReturn) {
      return b;
    }
  }
  return list[list.length - 1];
}

/**
 * Calculates comprehensive Real Purchasing Power & Inflation Adjustments
 * @param {Object} portfolioData - Total investment, current value, nominal profit
 * @param {Object} macroData - Macro valuation data containing inflation metrics
 * @param {Object} customConfig - Optional custom config override
 * @returns {Object} Full breakdown of nominal vs real returns, drag in VNĐ, 4-asset horse race and weekly AI layer
 */
export function calculateInflationAdjustedMetrics(portfolioData = {}, macroData = {}, customConfig = null) {
  const config = customConfig || DEFAULT_CONSTANTS.inflationReturnConfig || DEFAULT_INFLATION_CONFIG;
  const macro = macroData?.macro || {};

  // 1. Inflation parameters
  const annualCpi = Number(macro.inflationCpi ?? macroData?.inflationCpi ?? config.defaultAnnualCpi ?? 5.08);
  const coreInflation = Number(macro.coreInflation ?? macroData?.coreInflation ?? 4.45);
  const savingsRate = Number(config.defaultBenchmarkSavingsRate ?? 5.5);

  // 2. Portfolio parameters
  const totalInvested = Number(portfolioData.totalInvested ?? portfolioData.totalCost ?? 0);
  const totalValue = Number(portfolioData.totalValue ?? (totalInvested + (portfolioData.totalGainLoss ?? 0)));
  const nominalGainVnd = Number(portfolioData.totalGainLoss ?? (totalValue - totalInvested));
  const nominalReturnPct = totalInvested > 0
    ? Number(((nominalGainVnd / totalInvested) * 100).toFixed(2))
    : Number(portfolioData.returnPct ?? 0);

  // 3. Real Return calculations (Fisher Equation)
  const portfolioRealReturnPct = calculateFisherRealReturn(nominalReturnPct, annualCpi);

  // Inflation Drag in VNĐ: How much purchasing power was eroded by inflation on the invested capital
  const inflationDragVnd = Math.round(totalInvested * (annualCpi / 100));

  // Real Purchasing Power Gain/Loss in VNĐ
  const realGainVnd = nominalGainVnd - inflationDragVnd;

  // Bracket assessment
  const bracket = getRealReturnBracket(portfolioRealReturnPct, config.realReturnBrackets);

  // 4. The 4-Asset Horse Race (Cuộc đua 4 kênh tài sản bảo vệ sức mua)
  // Benchmarks
  const vnindexNominalReturn = Number(macroData?.marketIndex?.ytdReturn ?? 12.5);
  const goldNominalReturn = Number(macroData?.goldAdvisor?.ytdReturn ?? 18.2);

  const assets = [
    {
      id: 'portfolio',
      name: 'Danh Mục Của Bạn',
      category: 'Cổ Phiếu Cá Nhân',
      nominalReturnPct,
      realReturnPct: portfolioRealReturnPct,
      isUserPortfolio: true,
      bracket: getRealReturnBracket(portfolioRealReturnPct, config.realReturnBrackets)
    },
    {
      id: 'vnindex',
      name: 'VN-Index (Thị Trường)',
      category: 'Chỉ Số Thị Trường',
      nominalReturnPct: vnindexNominalReturn,
      realReturnPct: calculateFisherRealReturn(vnindexNominalReturn, annualCpi),
      isUserPortfolio: false,
      bracket: getRealReturnBracket(calculateFisherRealReturn(vnindexNominalReturn, annualCpi), config.realReturnBrackets)
    },
    {
      id: 'gold',
      name: 'Vàng SJC / PNJ',
      category: 'Tài Sản Trú Ẩn',
      nominalReturnPct: goldNominalReturn,
      realReturnPct: calculateFisherRealReturn(goldNominalReturn, annualCpi),
      isUserPortfolio: false,
      bracket: getRealReturnBracket(calculateFisherRealReturn(goldNominalReturn, annualCpi), config.realReturnBrackets)
    },
    {
      id: 'savings',
      name: 'Gửi Tiết Kiệm 12T',
      category: 'Thu Nhập Cố Định',
      nominalReturnPct: savingsRate,
      realReturnPct: calculateFisherRealReturn(savingsRate, annualCpi),
      isUserPortfolio: false,
      bracket: getRealReturnBracket(calculateFisherRealReturn(savingsRate, annualCpi), config.realReturnBrackets)
    }
  ].sort((a, b) => b.realReturnPct - a.realReturnPct);

  // 5. Weekly AI Inflation & Purchasing Power Strategic Diagnosis Layer
  const aiDiagnosis = macroData?.aiInflationDiagnosis || {
    updatedAt: new Date().toISOString(),
    cpiAssessment: `Chỉ số CPI ở mức ${annualCpi}% YoY trong khi Lạm phát lõi ở mức ${coreInflation}%, phản ánh áp lực chi phí đẩy từ năng lượng và dịch vụ y tế/giáo dục.`,
    purchasingPowerVerdict: portfolioRealReturnPct >= 0
      ? `Danh mục của bạn đang duy trì tỷ suất sinh lời thực dương (+${portfolioRealReturnPct}%), bảo vệ thành công sức mua trước đà trượt giá của tiền mặt.`
      : `Lãi suất thực của danh mục đang chịu áp lực từ lạm phát, sức mua của vốn gốc bị bào mòn tạm thời (-${Math.abs(portfolioRealReturnPct)}%).`,
    assetProtectionRanking: [
      { asset: 'Cổ Phiếu Cơ Bản Tốt', rating: 'Tối Ưu', note: 'Khả năng chuyển giao chi phí lạm phát vào giá bán sản phẩm giúp bảo toàn EPS.' },
      { asset: 'Vàng SJC / PNJ', rating: 'Khá Tốt', note: 'Kênh trú ẩn an toàn truyền thống chống mất giá tiền tệ vượt trội.' },
      { asset: 'Trái Phiếu DN Chất Lượng', rating: 'Trung Bình', note: 'Lợi suất cố định bù đắp vừa đủ lạm phát nhưng rủi ro kỳ hạn.' },
      { asset: 'Tiền Gửi Ngân Hàng', rating: 'Yếu', note: 'Lãi suất thực sau lạm phát chỉ tiệm cận 0 - 0.5%, sức mua không tăng trưởng.' }
    ],
    hedgingStrategy: 'Phân bổ tối thiểu 60-70% vốn vào cổ phiếu chất lượng cao có ROE > 18% và Vàng vật chất để bảo vệ sức mua thực tế vượt trên đà lạm phát.',
    provider: 'system_curated'
  };

  return {
    annualCpi,
    coreInflation,
    savingsRate,
    totalInvested,
    totalValue,
    nominalGainVnd,
    nominalReturnPct,
    portfolioRealReturnPct,
    inflationDragVnd,
    realGainVnd,
    bracket,
    assetsComparison: assets,
    aiDiagnosis
  };
}
