import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, '../../');
export const DATA_DIR = path.join(ROOT_DIR, 'data');
export const DATA_FILE = path.join(DATA_DIR, 'transactions.json');
export const PRICES_CACHE_FILE = path.join(DATA_DIR, 'prices_cache.json');
export const DIST_DIR = path.join(ROOT_DIR, 'dist');

export const PORT = process.env.PORT || 3001;
export const IN_SESSION_TTL_MS = 60 * 1000; // 60 giây trong phiên giao dịch
