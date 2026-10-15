import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '../../');
const CONFIG_FILE = path.join(ROOT_DIR, 'data', 'default-constant-value.json');

const FALLBACK_CONSTANTS = {
  systemAndNetwork: {
    serverPort: 3001,
    inSessionTtlMs: 60 * 60 * 1000,
    fundamentalsTtlMs: 12 * 60 * 60 * 1000,
  },
  tradingAndFees: {
    personalIncomeTaxRate: 0.001,
    defaultBrokerFeeRate: 0.0015,
    dividendCashTaxRate: 0.05,
    riskFreeRateAnnual: 0.045,
    defaultBankInterestRate: 5.0,
  },
  macro: {
    macroThresholds: {},
    macroNarratives: {},
    aiMacroConfig: {
      enabled: true,
      provider: 'heuristic_fallback',
      model: 'gemini-1.5-flash',
    },
  },
};

let cachedConstants = null;

/**
 * Đọc file data/default-constant-value.json với cơ chế fallback an toàn
 */
export function getSystemConstants(reload = false) {
  if (cachedConstants && !reload) {
    return cachedConstants;
  }

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      cachedConstants = {
        ...FALLBACK_CONSTANTS,
        ...parsed,
        systemAndNetwork: {
          ...FALLBACK_CONSTANTS.systemAndNetwork,
          ...(parsed.systemAndNetwork || {}),
        },
        tradingAndFees: {
          ...FALLBACK_CONSTANTS.tradingAndFees,
          ...(parsed.tradingAndFees || {}),
        },
        macro: {
          ...FALLBACK_CONSTANTS.macro,
          ...(parsed.macro || {}),
          macroThresholds: {
            ...(parsed.macro?.macroThresholds || {}),
          },
          macroNarratives: {
            ...(parsed.macro?.macroNarratives || {}),
          },
          aiMacroConfig: {
            ...FALLBACK_CONSTANTS.macro.aiMacroConfig,
            ...(parsed.macro?.aiMacroConfig || {}),
          },
        },
      };
      return cachedConstants;
    }
  } catch (err) {
    console.warn(`[configLoader] Không thể đọc ${CONFIG_FILE}: ${err.message}. Sử dụng fallback mặc định.`);
  }

  cachedConstants = FALLBACK_CONSTANTS;
  return cachedConstants;
}

export function getMacroConstants(reload = false) {
  const all = getSystemConstants(reload);
  return all.macro || {};
}

export function getMacroThresholds(reload = false) {
  const macro = getMacroConstants(reload);
  return macro.macroThresholds || {};
}

export function getMacroNarratives(reload = false) {
  const macro = getMacroConstants(reload);
  return macro.macroNarratives || {};
}

export function getAiMacroConfig(reload = false) {
  const macro = getMacroConstants(reload);
  return macro.aiMacroConfig || {};
}

export function getPortfolioConfig(reload = false) {
  const all = getSystemConstants(reload);
  return all.portfolioAnalytics || {};
}

export function getDcaConfig(reload = false) {
  const all = getSystemConstants(reload);
  return all.dcaPlannerConfig || {};
}

export function getStrategyConfig(reload = false) {
  const all = getSystemConstants(reload);
  return all.strategyAndDiscipline || {};
}

export function getValuationNarratives(reload = false) {
  const all = getSystemConstants(reload);
  return all.valuationNarrativesAndPresets || {};
}

export function getAiEngineConfig(reload = false) {
  const all = getSystemConstants(reload);
  return all.aiEngineHub || {};
}

export function getTaxAndFeesConfig(reload = false) {
  const all = getSystemConstants(reload);
  return all.taxAndFees || {};
}
