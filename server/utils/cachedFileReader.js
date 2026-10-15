import fs from 'fs';

const memoryCache = new Map();
const MAX_CACHE_ENTRIES = 200;

/**
 * Đọc file JSON từ đĩa có đệm bộ nhớ (RAM Cache) thông minh:
 * - So sánh mtime (thời điểm file bị sửa đổi lần cuối trên đĩa).
 * - Nếu file chưa bị ghi đè và chưa hết TTL: Trả về trực tiếp từ RAM (0ms I/O, 0 parse).
 * - Nếu file bị Python/tiến trình khác ghi đè hoặc quá TTL: Đọc lại và cập nhật cache.
 *
 * @param {string} filePath - Đường dẫn tuyệt đối tới file JSON
 * @param {Object} [options]
 * @param {number} [options.ttlMs=15000] - Thời gian sống trong RAM (mặc định 15s)
 * @param {any} [options.fallback=null] - Dữ liệu trả về nếu file không tồn tại hoặc lỗi cú pháp
 * @returns {any} Dữ liệu JSON đã parse
 */
export function readJsonCached(filePath, options = {}) {
  const { ttlMs = 15000, fallback = null } = options;
  if (!filePath || typeof filePath !== 'string') return fallback;

  try {
    if (!fs.existsSync(filePath)) {
      memoryCache.delete(filePath);
      return fallback;
    }

    const stat = fs.statSync(filePath);
    const mtimeMs = stat.mtimeMs;
    const now = Date.now();
    const entry = memoryCache.get(filePath);

    if (entry && entry.mtimeMs === mtimeMs && now - entry.cachedAt < ttlMs) {
      return entry.data;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);

    // Dọn dẹp cache nếu quá kích thước tối đa
    if (memoryCache.size >= MAX_CACHE_ENTRIES) {
      for (const [k, v] of memoryCache.entries()) {
        if (now - v.cachedAt > 60000) memoryCache.delete(k);
      }
      if (memoryCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = memoryCache.keys().next().value;
        if (oldestKey) memoryCache.delete(oldestKey);
      }
    }

    memoryCache.set(filePath, {
      data,
      mtimeMs,
      cachedAt: now,
    });

    return data;
  } catch (err) {
    console.warn(`⚠️ [cachedFileReader] Lỗi đọc JSON (${filePath}):`, err.message);
    return fallback;
  }
}

/**
 * Xóa cache RAM của một file hoặc toàn bộ cache
 * @param {string} [filePath]
 */
export function invalidateJsonCache(filePath = '') {
  if (!filePath) {
    memoryCache.clear();
  } else {
    memoryCache.delete(filePath);
  }
}
