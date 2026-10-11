import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { getSystemConstants } from './configLoader.js';

const sysConfig = getSystemConstants().systemAndNetwork || {};

export const ROOT_DIR = path.resolve(__dirname, '../../');
export const DATA_DIR = path.join(ROOT_DIR, 'data');
export const DATA_FILE = path.join(DATA_DIR, 'transactions.json');
export const PRICES_CACHE_FILE = path.join(DATA_DIR, 'prices_cache.json');
export const FUNDAMENTALS_CACHE_FILE = path.join(DATA_DIR, 'fundamentals_cache.json');
export const SUPPORTED_STOCKS_FILE = path.join(DATA_DIR, 'supported_stocks.json');
export const MACRO_VALUATION_FILE = path.join(DATA_DIR, 'macro_valuation.json');
export const DEFAULT_CONSTANTS_FILE = path.join(DATA_DIR, 'default-constant-value.json');
export const DIST_DIR = path.join(ROOT_DIR, 'dist');

export const PORT = process.env.PORT || sysConfig.serverPort || 3001;
export const IN_SESSION_TTL_MS = sysConfig.inSessionTtlMs || 60 * 60 * 1000; // 1 giờ trong phiên giao dịch
export const FUNDAMENTALS_TTL_MS = sysConfig.fundamentalsTtlMs || 12 * 60 * 60 * 1000; // 12 giờ cho dữ liệu định giá cơ bản

