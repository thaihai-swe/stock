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
      };
      return cachedConstants;
    }
  } catch (err) {
    console.warn(`[configLoader] Không thể đọc ${CONFIG_FILE}: ${err.message}. Sử dụng fallback mặc định.`);
  }

  cachedConstants = FALLBACK_CONSTANTS;
  return cachedConstants;
}
