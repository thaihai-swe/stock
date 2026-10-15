import defaultConstantsJson from '../../data/default-constant-value.json' with { type: 'json' };

/**
 * Single Source of Truth cho các hằng số, ngưỡng kỹ thuật và nhận định mặc định ở Frontend
 */
export const DEFAULT_CONSTANTS = defaultConstantsJson || {};

/**
 * Safe Normalizer: Chuẩn hóa dữ liệu nguồn (dù là Array, Object/Dictionary hay undefined)
 * thành một Array đồng nhất, tự động merge với các trường styling mặc định.
 */
function safeNormalizeList(source, defaultList, keyId = 'id') {
  if (!source) return defaultList;
  if (Array.isArray(source)) {
    return source.map((item, idx) => {
      const match = defaultList.find(d => (d[keyId] && d[keyId] === item[keyId]) || (d.id && d.id === item.id)) || defaultList[idx] || {};
      return { ...match, ...item };
    });
  }
  if (typeof source === 'object') {
    return Object.entries(source).map(([k, v]) => {
      const itemVal = (v && typeof v === 'object') ? v : { value: v };
      const match = defaultList.find(d => (d[keyId] && d[keyId] === k) || (d.id && d.id === k)) || {};
      return { ...match, [keyId]: k, ...itemVal };
    });
  }
  return defaultList;
}

// 1. Phân hệ Quản trị danh mục & Phân tích rủi ro (Portfolio Analytics)
export const PORTFOLIO_CONFIG = DEFAULT_CONSTANTS.portfolioAnalytics || {};
export const DEFAULT_BANK_INTEREST_RATE = PORTFOLIO_CONFIG.defaultBankInterestRate ?? 6.0;
export const PRESET_BANK_INTEREST_RATES = Array.isArray(PORTFOLIO_CONFIG.bankInterestPresets)
  ? PORTFOLIO_CONFIG.bankInterestPresets
  : (Array.isArray(PORTFOLIO_CONFIG.presetBankInterestRates)
      ? PORTFOLIO_CONFIG.presetBankInterestRates
      : [5.0, 6.0, 7.0, 8.0]);

export const VNINDEX_VOLATILITY = PORTFOLIO_CONFIG.riskAdjusted?.vnindexAnnualVolatility
  ?? PORTFOLIO_CONFIG.vnIndexAnnualVolatility
  ?? 18.0;

const DEFAULT_RISK_POSTURES = [
  { id: 'highDefense', minCashPct: 50, label: '🛡️ Phòng thủ cao', bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/80 dark:text-blue-200 dark:border-blue-700/50' },
  { id: 'optimalBalance', minCashPct: 20, label: '⚖️ Cân bằng tối ưu', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/80 dark:text-emerald-200 dark:border-emerald-700/50' },
  { id: 'activeOffense', minCashPct: 5, label: '🚀 Tấn công chủ động', bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/80 dark:text-amber-200 dark:border-amber-700/50' },
  { id: 'fullStock', minCashPct: 0, label: '⚡ Full 100% Cổ phiếu', bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/80 dark:text-rose-200 dark:border-rose-700/50' },
];

export const RISK_POSTURES = safeNormalizeList(
  PORTFOLIO_CONFIG.riskPostures || PORTFOLIO_CONFIG.riskPostureBrackets,
  DEFAULT_RISK_POSTURES
).sort((a, b) => (b.minCashPct ?? 0) - (a.minCashPct ?? 0));

const DEFAULT_ALLOCATION_TIERS = [
  { id: 'extreme', minPct: 50, label: 'Cực cao (>50%)', isWarning: true, bg: 'bg-red-50 dark:bg-rose-950/70', text: 'text-red-700 dark:text-rose-300', border: 'border-red-300 dark:border-rose-800/60', bar: 'bg-red-500' },
  { id: 'veryHigh', minPct: 40, label: 'Rất cao (40-50%)', isWarning: false, bg: 'bg-amber-50 dark:bg-amber-950/70', text: 'text-amber-800 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-800/60', bar: 'bg-amber-500' },
  { id: 'core', minPct: 25, label: 'Chủ lực (25-40%)', isWarning: false, bg: 'bg-indigo-50 dark:bg-indigo-950/70', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800/60', bar: 'bg-indigo-600' },
  { id: 'moderate', minPct: 10, label: 'Vừa phải (10-25%)', isWarning: false, bg: 'bg-blue-50 dark:bg-blue-950/70', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800/60', bar: 'bg-blue-500' },
  { id: 'low', minPct: 0, label: 'Thấp (<10%)', isWarning: false, bg: 'bg-gray-50 dark:bg-slate-800', text: 'text-gray-600 dark:text-slate-400', border: 'border-gray-200 dark:border-slate-700', bar: 'bg-gray-400' },
];

export const ALLOCATION_TIERS = safeNormalizeList(
  PORTFOLIO_CONFIG.allocationTiers,
  DEFAULT_ALLOCATION_TIERS
).sort((a, b) => (b.minPct ?? 0) - (a.minPct ?? 0));

const DEFAULT_SHARPE_BRACKETS = [
  { minSharpe: 2.0, text: 'Xuất sắc (Top-tier)', color: 'text-emerald-600 dark:text-emerald-400' },
  { minSharpe: 1.0, text: 'Tốt (Đạt chuẩn)', color: 'text-indigo-600 dark:text-indigo-400' },
  { minSharpe: 0.0, text: 'Khá (Bù đắp rủi ro)', color: 'text-amber-600 dark:text-amber-400' },
  { minSharpe: -999.0, text: 'Dưới lãi tiết kiệm', color: 'text-rose-600 dark:text-rose-400' },
];

export const SHARPE_BRACKETS = safeNormalizeList(
  PORTFOLIO_CONFIG.sharpeBrackets || PORTFOLIO_CONFIG.riskAdjusted?.sharpeBrackets,
  DEFAULT_SHARPE_BRACKETS
).map(b => ({
  minSharpe: b.minSharpe ?? b.min ?? -999,
  text: b.text ?? b.label ?? '',
  color: b.color ?? 'text-gray-400',
})).sort((a, b) => b.minSharpe - a.minSharpe);

export const DOWNSIDE_DEVIATION_PARAMS = {
  defaultLossRatio: PORTFOLIO_CONFIG.riskAdjusted?.defaultLossRatioFallback ?? 0.3,
  minLossRatioFloor: PORTFOLIO_CONFIG.riskAdjusted?.minLossVariance ?? 0.15,
  minDownsideFloor: PORTFOLIO_CONFIG.riskAdjusted?.downsideDeviationMin ?? 3.0,
};

// 2. Phân hệ Kế hoạch Mua Gom DCA (DCA Planner)
export const DCA_CONFIG = DEFAULT_CONSTANTS.dcaPlannerConfig || {};
export const DCA_DEFAULT_DROP_PCT = DCA_CONFIG.defaultDropPct ?? 3.0;
export const DCA_PRESET_DROP_PCTS = Array.isArray(DCA_CONFIG.presetDropPcts)
  ? DCA_CONFIG.presetDropPcts
  : [-2, -3, -5, -7];
export const DCA_DEFAULT_STEPS = DCA_CONFIG.defaultSteps ?? 20;
export const DCA_PRESET_STEPS = Array.isArray(DCA_CONFIG.presetSteps)
  ? DCA_CONFIG.presetSteps
  : [5, 10, 15, 20];
export const DCA_PRESET_BASE_LOTS = Array.isArray(DCA_CONFIG.presetBaseLots)
  ? DCA_CONFIG.presetBaseLots
  : (Array.isArray(DCA_CONFIG.baseLotPresets) ? DCA_CONFIG.baseLotPresets : [100, 200, 500, 1000]);

const DEFAULT_VOLUME_STRATEGIES = [
  { id: 'cluster3', label: '🌟 Kim tự tháp x2 mỗi 3 đợt', pattern: '100 → 100 → 100 → 200... (Chuẩn mẫu)' },
  { id: 'fixed', label: '📐 Khối lượng đều', pattern: '100 → 100 → 100 → 100...' },
  { id: 'linear', label: '📈 Tăng dần đều', pattern: '100 → 200 → 300 → 400...' },
  { id: 'martingale', label: '🚀 Gấp đôi mỗi bước', pattern: '100 → 200 → 400 → 800...' },
];

export const DCA_VOLUME_STRATEGIES = safeNormalizeList(
  DCA_CONFIG.volumeStrategies,
  DEFAULT_VOLUME_STRATEGIES
).map(strat => ({
  id: strat.id,
  label: strat.label || strat.name || strat.id,
  pattern: strat.pattern || '',
}));

// 3. Phân hệ Chiến lược & Kỷ luật Giao dịch (Strategy & Discipline)
export const STRATEGY_CONFIG = DEFAULT_CONSTANTS.strategyAndDiscipline || {};
export const RISK_ALERT_WIN_RATE_THRESHOLD = STRATEGY_CONFIG.riskAlertWinRateThreshold ?? 40.0;

const DEFAULT_DISCIPLINE_TAGS = [
  { id: 'target', label: '🎯 Đạt mục tiêu', shortLabel: 'Đạt mục tiêu', desc: 'Chốt lời chuẩn kế hoạch đã định', type: 'disciplined', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' },
  { id: 'stoploss', label: '🛑 Cắt lỗ chuẩn', shortLabel: 'Cắt lỗ chuẩn', desc: 'Cắt lỗ dứt khoát theo kỷ luật, bảo vệ vốn', type: 'disciplined', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' },
  { id: 'early', label: '🏃 Chốt non', shortLabel: 'Chốt non', desc: 'Bán vội khi vừa chớm lời, sợ mất lãi', type: 'emotional', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' },
  { id: 'late', label: '😰 Cắt lỗ trễ', shortLabel: 'Cắt lỗ trễ', desc: 'Chần chừ để lỗ sâu (gồng lỗ) mới bán', type: 'emotional', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' },
  { id: 'panic', label: '⚡ Bán hoảng / FOMO', shortLabel: 'Bán hoảng', desc: 'Bị tâm lý đám đông hoặc bảng điện chi phối', type: 'emotional', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800' },
  { id: 'rebalance', label: '🔄 Đảo hàng / Cơ cấu', shortLabel: 'Đảo hàng', desc: 'Bán để tái phân bổ vốn sang mã khác tốt hơn', type: 'neutral', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' },
];

export const DISCIPLINE_TAGS = safeNormalizeList(
  STRATEGY_CONFIG.disciplineTags,
  DEFAULT_DISCIPLINE_TAGS
);

export const STRATEGY_NARRATIVES = STRATEGY_CONFIG.narrativeTemplates || STRATEGY_CONFIG.narratives || {};

// 4. Phân hệ Định giá, 7 Vùng Giá & Báo Cáo Tài Chính
export const VALUATION_NARRATIVES = DEFAULT_CONSTANTS.valuationNarrativesAndPresets || {};

const DEFAULT_SEVEN_PRICE_ZONES = [
  { id: 'deep_value', label: 'Deep Value', sub: '< 0.75x', color: 'from-purple-600 to-indigo-600', text: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800' },
  { id: 'safe_buy', label: 'Mua An Toàn', sub: '0.75 - 0.85x', color: 'from-emerald-600 to-teal-600', text: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800' },
  { id: 'accumulate', label: 'Tích Luỹ', sub: '0.85 - 0.95x', color: 'from-teal-600 to-cyan-600', text: 'text-teal-400', bg: 'bg-teal-950/40 border-teal-800' },
  { id: 'fair_range', label: 'Hợp Lý', sub: '0.95 - 1.10x', color: 'from-blue-600 to-slate-600', text: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-800' },
  { id: 'above_fair', label: 'Chớm Đắt', sub: '1.10 - 1.20x', color: 'from-amber-600 to-orange-500', text: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800' },
  { id: 'expensive', label: 'Đắt', sub: '1.20 - 1.35x', color: 'from-orange-600 to-rose-600', text: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-800' },
  { id: 'danger', label: 'Nguy Hiểm', sub: '> 1.35x', color: 'from-rose-600 to-red-700', text: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-800' },
];

export const SEVEN_PRICE_ZONES = safeNormalizeList(
  VALUATION_NARRATIVES.sevenPriceZones || VALUATION_NARRATIVES.sevenPriceZonesMeta,
  DEFAULT_SEVEN_PRICE_ZONES
);

export const DCF_SCENARIOS = VALUATION_NARRATIVES.dcfScenarios || {};
export const REVERSE_DCF_THRESHOLDS = VALUATION_NARRATIVES.reverseDcfThresholds || { prudentMaxGrowth: 8.0, reasonableMaxGrowth: 18.0 };
export const REVERSE_DCF_NARRATIVES = VALUATION_NARRATIVES.reverseDcfNarratives || {};
export const DIVIDEND_SUSTAINABILITY = VALUATION_NARRATIVES.dividendSustainability || {
  fcfPayoutSafeThreshold: 60.0,
  fcfPayoutMaxThreshold: 100.0,
  accountingPayoutThreshold: 70.0,
};
export const FINANCIAL_SECTOR_EXEMPTION = VALUATION_NARRATIVES.financialSectorExemption || {};
export const MAGIC_FORMULA_UI = VALUATION_NARRATIVES.magicFormulaUi || { eyThreshold: 8.5, roicThreshold: 15.0, topTierScore: 70 };

// 5. Thuế, Phí Giao Dịch & Ghi Chú Pháp Lý
export const TAX_CONFIG = DEFAULT_CONSTANTS.taxAndFees || {};
export const STOCK_SALE_TAX_PCT = TAX_CONFIG.stockSaleTaxPct ?? 0.1;
export const DIVIDEND_CASH_TAX_PCT = TAX_CONFIG.dividendCashTaxPct ?? 5.0;
export const DEFAULT_TRADE_FEE_PCT = TAX_CONFIG.defaultTradeFeePct ?? 0.1;
export const PRESET_FEE_PCTS = Array.isArray(TAX_CONFIG.presetFeePcts) ? TAX_CONFIG.presetFeePcts : ['0', '0.1', '0.15'];
export const TAX_LEGAL_NOTE = TAX_CONFIG.legalNote || 'Theo quy định thuế TNCN tại Việt Nam, thuế chuyển nhượng chứng khoán được CTCK tự động khấu trừ 0.1% trên giá trị chuyển nhượng từng lần, thuế cổ tức tiền mặt là 5.0%.';

// 6. Phân hệ Khung Thời Gian (Timeframes, Horizons & Periods)
export * from './timeframe.js';

// 7. Phân hệ Cố Vấn Khóa Lợi Nhuận & Thước Đo R:R (Smart Trailing Stop & Risk-Reward)
export * from './riskRewardAdvisor.js';

// 8. Phân hệ Radar Bơm/Hút Tiền SBV OMO & Sức Mua Thực Tế
export * from './sbvOmoRadar.js';
export * from './inflationAdjuster.js';

