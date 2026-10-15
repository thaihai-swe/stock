/**
 * Bộ kiểm tra & chuẩn hóa dữ liệu đầu vào (Input Validation & Sanitization)
 * Tăng cường bảo mật và phòng thủ lỗi cho tầng Backend Express.
 */

const SYMBOL_REGEX = /^[A-Z0-9]{2,8}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Kiểm tra và chuẩn hóa mã cổ phiếu TTCK Việt Nam
 * @param {any} symbol
 * @returns {string} Mã cổ phiếu viết hoa chuẩn (ví dụ: 'HPG', 'E1VFVN30')
 */
export function sanitizeSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    throw new Error('Mã cổ phiếu không hợp lệ hoặc bị thiếu.');
  }
  const clean = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!SYMBOL_REGEX.test(clean)) {
    throw new Error(`Mã cổ phiếu '${symbol}' không đúng định dạng (phải từ 2-8 ký tự chữ hoặc số).`);
  }
  return clean;
}

/**
 * Kiểm tra và chuẩn hóa số dương (khối lượng, giá)
 * @param {any} val
 * @param {string} fieldName
 * @param {Object} [options]
 * @param {number} [options.min=0]
 * @param {number} [options.max=1e12]
 * @param {boolean} [options.integer=false]
 * @returns {number}
 */
export function validatePositiveNumber(val, fieldName, { min = 0, max = 1e12, integer = false } = {}) {
  const num = Number(val);
  if (!Number.isFinite(num)) {
    throw new Error(`Trường '${fieldName}' phải là một số hợp lệ.`);
  }
  if (num <= min) {
    throw new Error(`Trường '${fieldName}' phải lớn hơn ${min}.`);
  }
  if (num > max) {
    throw new Error(`Trường '${fieldName}' vượt quá giá trị tối đa cho phép (${max}).`);
  }
  return integer ? Math.floor(num) : num;
}

/**
 * Kiểm tra và chuẩn hóa tỷ lệ phần trăm (phí, thuế)
 * @param {any} val
 * @param {string} fieldName
 * @param {Object} [options]
 * @param {number} [options.min=0]
 * @param {number} [options.max=100]
 * @param {number} [options.defaultVal=0]
 * @returns {number}
 */
export function validatePercentage(val, fieldName, { min = 0, max = 100, defaultVal = 0 } = {}) {
  if (val === undefined || val === null || val === '') {
    return defaultVal;
  }
  const num = Number(val);
  if (!Number.isFinite(num)) {
    throw new Error(`Trường '${fieldName}' phải là số hợp lệ.`);
  }
  if (num < min || num > max) {
    throw new Error(`Trường '${fieldName}' phải nằm trong khoảng từ ${min}% đến ${max}%.`);
  }
  return num;
}

/**
 * Kiểm tra và chuẩn hóa định dạng ngày YYYY-MM-DD
 * @param {any} dateStr
 * @param {string} fallback
 * @returns {string}
 */
export function sanitizeDate(dateStr, fallback) {
  if (!dateStr || typeof dateStr !== 'string') {
    return fallback;
  }
  const clean = dateStr.trim().slice(0, 10);
  if (!DATE_REGEX.test(clean)) {
    return fallback;
  }
  const year = parseInt(clean.slice(0, 4), 10);
  if (year < 2000 || year > 2100) {
    return fallback;
  }
  return clean;
}
