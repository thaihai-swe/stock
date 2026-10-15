/**
 * src/utils/timeframe.js
 * Quản trị tập trung các khung thời gian (Timeframes, Horizons, Periods)
 * Single Source of Truth cho toàn bộ ứng dụng (Bộ lọc, Biểu đồ, Phân tích hiệu suất).
 */
import defaultConstantsJson from '../../data/default-constant-value.json' with { type: 'json' };

// 1. CANONICAL TIMEFRAME IDS (ENUM)
export const TIMEFRAME_IDS = {
  ONE_DAY: '1D',
  ONE_WEEK: '1W',
  ONE_MONTH: '1M',
  THREE_MONTHS: '3M',
  SIX_MONTHS: '6M',
  MTD: 'MTD',       // Month-To-Date
  YTD: 'YTD',       // Year-To-Date
  ONE_YEAR: '1Y',
  THREE_YEARS: '3Y',
  FIVE_YEARS: '5Y',
  TEN_YEARS: '10Y',
  ALL: 'ALL',       // Toàn thời gian
  CUSTOM: 'CUSTOM', // Tùy chỉnh ngày bắt đầu / kết thúc
};

/**
 * Chuẩn hóa chuỗi ID khung thời gian về Canonical Uppercase ID.
 * Nếu không hợp lệ hoặc thiếu thì gán mặc định về 'ALL'.
 * @param {string} input
 * @returns {string} Canonical ID ('ALL' | 'YTD' | '1Y' | 'MTD' | '1M' ...)
 */
export function normalizeTimeframeId(input) {
  if (!input) return TIMEFRAME_IDS.ALL;
  const cleaned = String(input).trim().toUpperCase();
  return TIMEFRAME_CONFIG[cleaned] ? cleaned : TIMEFRAME_IDS.ALL;
}

// 3. ĐỊNH NGHĨA METADATA MẶC ĐỊNH
const DEFAULT_DEFINITIONS = {
  '1D': { id: '1D', label: '1 Ngày', shortLabel: '1D', desc: 'Trong phiên hôm nay', days: 1, dnseResolution: '1' },
  '1W': { id: '1W', label: '1 Tuần', shortLabel: '1W', desc: '7 ngày gần nhất', days: 7, dnseResolution: '1D', perfKey: 'w1' },
  '1M': { id: '1M', label: '1 Tháng', shortLabel: '1M', desc: '30 ngày gần nhất', days: 30, dnseResolution: '1D', perfKey: 'm1' },
  '3M': { id: '3M', label: '3 Tháng', shortLabel: '3M', desc: '90 ngày gần nhất (1 Quý)', days: 90, dnseResolution: '1D', perfKey: 'm3' },
  '6M': { id: '6M', label: '6 Tháng', shortLabel: '6M', desc: '180 ngày gần nhất (2 Quý)', days: 180, dnseResolution: '1D', perfKey: 'm6' },
  'MTD': { id: 'MTD', label: 'Tháng Này (MTD)', shortLabel: 'MTD', desc: 'Từ đầu tháng đến nay', days: null, dnseResolution: '1D' },
  'YTD': { id: 'YTD', label: 'Từ Đầu Năm (YTD)', shortLabel: 'YTD', desc: 'Từ 01/01 đến nay', days: null, dnseResolution: '1D', perfKey: 'ytd' },
  '1Y': { id: '1Y', label: '1 Năm', shortLabel: '1Y', desc: '365 ngày gần nhất', days: 365, dnseResolution: '1D', perfKey: 'y1' },
  '3Y': { id: '3Y', label: '3 Năm', shortLabel: '3Y', desc: '3 năm gần nhất', days: 1095, dnseResolution: '1W' },
  '5Y': { id: '5Y', label: '5 Năm', shortLabel: '5Y', desc: '5 năm gần nhất', days: 1825, dnseResolution: '1W', perfKey: 'y5' },
  '10Y': { id: '10Y', label: '10 Năm', shortLabel: '10Y', desc: '10 năm gần nhất', days: 3650, dnseResolution: '1M' },
  'ALL': { id: 'ALL', label: 'Toàn Thời Gian', shortLabel: 'Tất Cả', desc: 'Toàn bộ lịch sử', days: null, dnseResolution: '1D' },
  'CUSTOM': { id: 'CUSTOM', label: 'Tùy Chỉnh', shortLabel: 'Tùy Chọn', desc: 'Khoảng ngày linh hoạt', days: null, dnseResolution: '1D' },
};

// Đọc cấu hình từ JSON nếu có
const JSON_TIMEFRAME_CONFIG = defaultConstantsJson?.timeframeConfig || {};
const MERGED_DEFINITIONS = {
  ...DEFAULT_DEFINITIONS,
  ...(JSON_TIMEFRAME_CONFIG.definitions || {}),
};

export const TIMEFRAME_CONFIG = MERGED_DEFINITIONS;

// 4. NHÓM PRESETS DÀNH CHO CÁC MÀN HÌNH KHÁC NHAU
export const TIMEFRAME_PRESETS = {
  // 1. So sánh tương quan vs VN-Index (Benchmark Comparison)
  BENCHMARK: [
    { ...TIMEFRAME_CONFIG['1M'] },
    { ...TIMEFRAME_CONFIG['3M'] },
    { ...TIMEFRAME_CONFIG['6M'] },
    { ...TIMEFRAME_CONFIG['YTD'] },
    { ...TIMEFRAME_CONFIG['1Y'] },
    { ...TIMEFRAME_CONFIG['ALL'] },
  ],

  // 2. Bộ lọc Chu kỳ Sổ lệnh & Danh mục (Portfolio & Transaction History)
  PORTFOLIO: [
    { ...TIMEFRAME_CONFIG['ALL'] },
    { ...TIMEFRAME_CONFIG['YTD'] },
    { ...TIMEFRAME_CONFIG['1Y'] },
    { ...TIMEFRAME_CONFIG['MTD'] },
  ],

  // 3. Bộ lọc mở rộng đầy đủ chu kỳ
  PORTFOLIO_EXTENDED: [
    { ...TIMEFRAME_CONFIG['ALL'] },
    { ...TIMEFRAME_CONFIG['YTD'] },
    { ...TIMEFRAME_CONFIG['1Y'] },
    { ...TIMEFRAME_CONFIG['6M'] },
    { ...TIMEFRAME_CONFIG['3M'] },
    { ...TIMEFRAME_CONFIG['1M'] },
    { ...TIMEFRAME_CONFIG['MTD'] },
  ],

  // 4. Biểu đồ nến kỹ thuật thị trường (Market Live Chart)
  MARKET_CHART: [
    { ...TIMEFRAME_CONFIG['1D'], days: 5 }, // 5 ngày nến 1 phút để vẽ intraday
    { ...TIMEFRAME_CONFIG['1M'] },
    { ...TIMEFRAME_CONFIG['6M'] },
    { ...TIMEFRAME_CONFIG['1Y'] },
  ],

  // 5. Lịch sử Định giá P/E 10 năm (Market Valuation History)
  VALUATION_HISTORY: [
    { id: '1Y', dataKey: '1year', label: '1Y', fullLabel: '1 Năm' },
    { id: '3Y', dataKey: '3year', label: '3Y', fullLabel: '3 Năm' },
    { id: '5Y', dataKey: '5year', label: '5Y', fullLabel: '5 Năm' },
    { id: '10Y', dataKey: '10year', label: '10Y', fullLabel: '10 Năm' },
  ],

  // 6. Thước đo 7 chu kỳ hiệu suất cổ phiếu (Stock Cockpit Header)
  STOCK_PERFORMANCE: [
    { ...TIMEFRAME_CONFIG['1W'] },
    { ...TIMEFRAME_CONFIG['1M'] },
    { ...TIMEFRAME_CONFIG['3M'] },
    { ...TIMEFRAME_CONFIG['6M'] },
    { ...TIMEFRAME_CONFIG['YTD'] },
    { ...TIMEFRAME_CONFIG['1Y'] },
    { ...TIMEFRAME_CONFIG['5Y'] },
  ],
};

// 5. TIỆN ÍCH NGÀY THÁNG ĐỊA PHƯƠNG (GMT+7)
/**
 * Lấy chuỗi ngày YYYY-MM-DD theo giờ địa phương của người dùng
 */
export function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Định dạng ngày DD/MM/YYYY hiển thị thân thiện
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).slice(0, 10).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// 6. BỘ ĐỘNG CƠ TÍNH TOÁN KHOẢNG NGÀY & EPOCH SECONDS
/**
 * Tính toán mốc ngày bắt đầu, ngày kết thúc và epoch seconds chuẩn xác cho bất kỳ khung thời gian nào.
 *
 * @param {string} presetOrTf - '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL' | 'all' | 'custom'...
 * @param {string} [customStart=''] - YYYY-MM-DD
 * @param {string} [customEnd=''] - YYYY-MM-DD
 * @param {Object} [options={}]
 * @param {string} [options.firstTradeDate=''] - Mốc ngày giao dịch đầu tiên (dùng khi chọn ALL)
 * @param {Date|number} [options.now] - Mốc thời gian tham chiếu (mặc định: hiện tại)
 * @returns {{
 *   id: string,
 *   preset: string,
 *   startDate: string,
 *   endDate: string,
 *   label: string,
 *   shortLabel: string,
 *   isFiltered: boolean,
 *   fromSec: number,
 *   toSec: number,
 *   days: number|null,
 *   dnseResolution: string
 * }}
 */
export function calculateDateRange(presetOrTf = 'ALL', customStart = '', customEnd = '', options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const todayStr = getLocalDateString(now);
  const toSec = Math.floor(now.getTime() / 1000);

  const rawPreset = String(presetOrTf || 'ALL').trim();
  const canonicalId = normalizeTimeframeId(rawPreset);
  const cfg = TIMEFRAME_CONFIG[canonicalId] || TIMEFRAME_CONFIG.ALL;

  switch (canonicalId) {
    case '1D': {
      return {
        id: '1D',
        preset: canonicalId,
        startDate: todayStr,
        endDate: todayStr,
        label: 'Trong Ngày Hôm Nay',
        shortLabel: '1D',
        isFiltered: true,
        fromSec: toSec - 86400,
        toSec,
        days: 1,
        dnseResolution: cfg.dnseResolution || '1',
      };
    }

    case '1W': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      const start = getLocalDateString(d);
      return {
        id: '1W',
        preset: canonicalId,
        startDate: start,
        endDate: todayStr,
        label: '1 Tuần Gần Nhất',
        shortLabel: '1W',
        isFiltered: true,
        fromSec: toSec - (7 * 86400),
        toSec,
        days: 7,
        dnseResolution: cfg.dnseResolution || '1D',
      };
    }

    case '1M': {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      const start = getLocalDateString(d);
      return {
        id: '1M',
        preset: canonicalId,
        startDate: start,
        endDate: todayStr,
        label: '1 Tháng Gần Nhất',
        shortLabel: '1M',
        isFiltered: true,
        fromSec: toSec - (30 * 86400),
        toSec,
        days: 30,
        dnseResolution: cfg.dnseResolution || '1D',
      };
    }

    case '3M': {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      const start = getLocalDateString(d);
      return {
        id: '3M',
        preset: canonicalId,
        startDate: start,
        endDate: todayStr,
        label: '3 Tháng Gần Nhất',
        shortLabel: '3M',
        isFiltered: true,
        fromSec: toSec - (90 * 86400),
        toSec,
        days: 90,
        dnseResolution: cfg.dnseResolution || '1D',
      };
    }

    case '6M': {
      const d = new Date(now);
      d.setDate(d.getDate() - 180);
      const start = getLocalDateString(d);
      return {
        id: '6M',
        preset: canonicalId,
        startDate: start,
        endDate: todayStr,
        label: '6 Tháng Gần Nhất',
        shortLabel: '6M',
        isFiltered: true,
        fromSec: toSec - (180 * 86400),
        toSec,
        days: 180,
        dnseResolution: cfg.dnseResolution || '1D',
      };
    }

    case 'MTD': {
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
      const start = `${now.getFullYear()}-${monthStr}-01`;
      const startDt = new Date(`${start}T00:00:00`);
      return {
        id: 'MTD',
        preset: canonicalId,
        startDate: start,
        endDate: todayStr,
        label: `Tháng ${monthStr}/${now.getFullYear()} (MTD)`,
        shortLabel: 'MTD',
        isFiltered: true,
        fromSec: Math.floor(startDt.getTime() / 1000),
        toSec,
        days: Math.max(1, Math.floor((toSec - Math.floor(startDt.getTime() / 1000)) / 86400)),
        dnseResolution: cfg.dnseResolution || '1D',
      };
    }

    case 'YTD': {
      const start = `${now.getFullYear()}-01-01`;
      const startDt = new Date(`${start}T00:00:00`);
      return {
        id: 'YTD',
        preset: canonicalId,
        startDate: start,
        endDate: todayStr,
        label: `Năm ${now.getFullYear()} (YTD)`,
        shortLabel: 'YTD',
        isFiltered: true,
        fromSec: Math.floor(startDt.getTime() / 1000),
        toSec,
        days: Math.max(1, Math.floor((toSec - Math.floor(startDt.getTime() / 1000)) / 86400)),
        dnseResolution: cfg.dnseResolution || '1D',
      };
    }

    case '1Y': {
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const start = getLocalDateString(oneYearAgo);
      return {
        id: '1Y',
        preset: canonicalId,
        startDate: start,
        endDate: todayStr,
        label: '1 Năm Gần Nhất',
        shortLabel: '1Y',
        isFiltered: true,
        fromSec: toSec - (365 * 86400),
        toSec,
        days: 365,
        dnseResolution: cfg.dnseResolution || '1D',
      };
    }

    case '3Y': {
      const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
      const start = getLocalDateString(threeYearsAgo);
      return {
        id: '3Y',
        preset: canonicalId,
        startDate: start,
        endDate: todayStr,
        label: '3 Năm Gần Nhất',
        shortLabel: '3Y',
        isFiltered: true,
        fromSec: toSec - (3 * 365 * 86400),
        toSec,
        days: 1095,
        dnseResolution: cfg.dnseResolution || '1W',
      };
    }

    case '5Y': {
      const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
      const start = getLocalDateString(fiveYearsAgo);
      return {
        id: '5Y',
        preset: canonicalId,
        startDate: start,
        endDate: todayStr,
        label: '5 Năm Gần Nhất',
        shortLabel: '5Y',
        isFiltered: true,
        fromSec: toSec - (5 * 365 * 86400),
        toSec,
        days: 1825,
        dnseResolution: cfg.dnseResolution || '1W',
      };
    }

    case '10Y': {
      const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate());
      const start = getLocalDateString(tenYearsAgo);
      return {
        id: '10Y',
        preset: canonicalId,
        startDate: start,
        endDate: todayStr,
        label: '10 Năm Gần Nhất',
        shortLabel: '10Y',
        isFiltered: true,
        fromSec: toSec - (10 * 365 * 86400),
        toSec,
        days: 3650,
        dnseResolution: cfg.dnseResolution || '1M',
      };
    }

    case 'CUSTOM': {
      let label = 'Tùy chỉnh';
      if (customStart && customEnd) {
        label = `${formatDisplayDate(customStart)} → ${formatDisplayDate(customEnd)}`;
      } else if (customStart) {
        label = `Từ ${formatDisplayDate(customStart)}`;
      } else if (customEnd) {
        label = `Đến ${formatDisplayDate(customEnd)}`;
      }

      const sDt = customStart ? new Date(`${customStart}T00:00:00`) : null;
      const eDt = customEnd ? new Date(`${customEnd}T23:59:59`) : now;
      const fromSecCustom = sDt ? Math.floor(sDt.getTime() / 1000) : toSec - (365 * 86400);
      const toSecCustom = Math.floor(eDt.getTime() / 1000);

      return {
        id: 'CUSTOM',
        preset: canonicalId,
        startDate: customStart || '',
        endDate: customEnd || '',
        label,
        shortLabel: 'Tùy chọn',
        isFiltered: Boolean(customStart || customEnd),
        fromSec: fromSecCustom,
        toSec: toSecCustom,
        days: sDt ? Math.max(1, Math.floor((toSecCustom - fromSecCustom) / 86400)) : null,
        dnseResolution: '1D',
      };
    }

    case 'ALL':
    default: {
      const fallbackStart = options.firstTradeDate || '';
      return {
        id: 'ALL',
        preset: canonicalId,
        startDate: fallbackStart,
        endDate: fallbackStart ? todayStr : '',
        label: 'Toàn thời gian',
        shortLabel: 'Tất cả',
        isFiltered: Boolean(fallbackStart),
        fromSec: fallbackStart
          ? Math.floor(new Date(`${fallbackStart}T00:00:00`).getTime() / 1000)
          : toSec - (3 * 365 * 86400),
        toSec,
        days: null,
        dnseResolution: cfg.dnseResolution || '1D',
      };
    }
  }
}

// 7. HÀM TẠO NHÃN CHU KỲ NHANH & THÂN THIỆN
/**
 * Trả về chuỗi mô tả thân thiện cho chu kỳ thời gian (loại bỏ chuỗi ternary lặp lại ở UI)
 * @param {string} preset - 'ytd' | '1y' | 'mtd' | '1M' | '3M' | '6M' | 'all' | 'custom'
 * @param {string} [startDate='']
 * @param {string} [endDate='']
 * @returns {string}
 */
export function getTimeframeLabel(preset, startDate = '', endDate = '') {
  const canonicalId = normalizeTimeframeId(preset);
  if (canonicalId === 'CUSTOM' || (!canonicalId && (startDate || endDate))) {
    if (startDate && endDate) return `${formatDisplayDate(startDate)} → ${formatDisplayDate(endDate)}`;
    if (startDate) return `Từ ${formatDisplayDate(startDate)}`;
    if (endDate) return `Đến ${formatDisplayDate(endDate)}`;
    return 'Tùy chỉnh';
  }

  const range = calculateDateRange(preset, startDate, endDate);
  return range.label;
}

/**
 * Trả về danh sách object nút bấm cho UI theo danh sách ID hoặc key preset
 * @param {string|string[]} presetKeyOrArray
 * @returns {Array<Object>}
 */
export function getTimeframePresetList(presetKeyOrArray) {
  if (Array.isArray(presetKeyOrArray)) {
    return presetKeyOrArray.map((item) => {
      if (typeof item === 'object' && item.id) return item;
      const canonical = normalizeTimeframeId(item);
      return { ...(TIMEFRAME_CONFIG[canonical] || { id: item, label: item, shortLabel: item }) };
    });
  }

  if (typeof presetKeyOrArray === 'string' && TIMEFRAME_PRESETS[presetKeyOrArray.toUpperCase()]) {
    return TIMEFRAME_PRESETS[presetKeyOrArray.toUpperCase()];
  }

  return TIMEFRAME_PRESETS.PORTFOLIO;
}
