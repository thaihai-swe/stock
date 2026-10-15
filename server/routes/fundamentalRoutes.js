import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getMultipleFundamentals } from '../services/fundamentalService.js';
import { loadSupportedStocks, saveSupportedStocks } from '../storage/jsonStore.js';
import { isPythonAvailable, runPythonScript } from '../utils/pythonRunner.js';

const router = express.Router();

/**
 * 1. Lấy dữ liệu cơ bản theo danh sách mã
 */
router.get('/fundamentals', asyncHandler(async (req, res) => {
  const symbols = (req.query.symbols || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
  const force = req.query.force === 'true';

  const result = await getMultipleFundamentals(symbols, force);
  return res.json(result);
}));

/**
 * 2. Lấy cấu hình danh sách mã hỗ trợ đồng bộ định giá
 */
router.get('/fundamentals/supported-stocks', (req, res) => {
  const config = loadSupportedStocks();
  return res.json(config);
});

/**
 * 3. Cập nhật danh sách mã hỗ trợ đồng bộ định giá (Đã khoá - chỉ quản trị viên sửa trong source code)
 */
router.post('/fundamentals/supported-stocks', (req, res) => {
  return res.status(403).json({
    error: 'Danh sách mã cổ phiếu hỗ trợ được quản lý cố định trong mã nguồn (data/supported_stocks.json). Không cho phép chỉnh sửa qua giao diện UI hoặc API.'
  });
});

/**
 * 4. Kích hoạt đồng bộ nền bằng Python (kèm fallback JS an toàn)
 */
router.post('/fundamentals/sync', asyncHandler(async (req, res) => {
  if (!isPythonAvailable()) {
    const config = loadSupportedStocks();
    return res.json({
      success: true,
      message: 'Hệ thống đang hoạt động trên dữ liệu đồng bộ định kỳ mới nhất. Để cập nhật dữ liệu thị trường mới, vui lòng thông báo cho người quản lý.',
      syncedCount: config.syncedCount || 0,
      lastSyncedAt: config.lastSyncedAt,
      runner: 'Cached'
    });
  }

  // Chạy Python sync script qua unified pythonRunner
  const { success, stdout, stderr } = await runPythonScript('scripts/sync_fundamentals.py');

  if (success) {
    const config = loadSupportedStocks();
    return res.json({
      success: true,
      message: `Đã chạy xong đồng bộ Python thành công cho ${config.syncedCount || 0} mã!`,
      syncedCount: config.syncedCount || 0,
      lastSyncedAt: config.lastSyncedAt,
      runner: 'Python 3',
      output: stdout
    });
  }

  console.warn('⚠️ Không thể chạy python3 (fallback sang JS service):', stderr);

  // Fallback: Thực hiện fetch trực tiếp nếu script Python gặp lỗi
  const config = loadSupportedStocks();
  const allSymbols = config.symbols || [];
  const results = await getMultipleFundamentals(allSymbols, true);
  const successCount = Object.keys(results).filter(k => !results[k]?.error).length;

  config.lastSyncedAt = new Date().toISOString();
  config.syncedCount = successCount;
  saveSupportedStocks(config);

  return res.json({
    success: true,
    message: `Đã đồng bộ thành công ${successCount}/${allSymbols.length} mã cổ phiếu!`,
    syncedCount: successCount,
    lastSyncedAt: config.lastSyncedAt,
    runner: 'JavaScript Fallback'
  });
}));

export default router;
