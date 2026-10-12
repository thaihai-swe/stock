import express from 'express';
import fs from 'fs';
import { execFile } from 'child_process';
import path from 'path';
import { ROOT_DIR } from '../config/constants.js';
import { getMultipleFundamentals } from '../services/fundamentalService.js';
import { loadSupportedStocks, saveSupportedStocks } from '../storage/jsonStore.js';

const router = express.Router();

const VENV_PYTHON = path.join(ROOT_DIR, '.venv', 'bin', 'python');
const PYTHON_CMD = fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python3';

/**
 * 1. Lấy dữ liệu cơ bản theo danh sách mã
 */
router.get('/fundamentals', async (req, res) => {
  const symbols = (req.query.symbols || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
  const force = req.query.force === 'true';

  try {
    const result = await getMultipleFundamentals(symbols, force);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 2. Lấy cấu hình danh sách mã hỗ trợ đồng bộ định giá
 */
router.get('/fundamentals/supported-stocks', (req, res) => {
  try {
    const config = loadSupportedStocks();
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
router.post('/fundamentals/sync', (req, res) => {
  const isServerlessOrNoPython = Boolean(
    process.env.VERCEL ||
    process.env.NOW_REGION ||
    !fs.existsSync(VENV_PYTHON)
  );

  if (isServerlessOrNoPython) {
    const config = loadSupportedStocks();
    return res.json({
      success: true,
      message: 'Hệ thống đang hoạt động trên dữ liệu đồng bộ định kỳ mới nhất. Để cập nhật dữ liệu thị trường mới, vui lòng thông báo cho người quản lý.',
      syncedCount: config.syncedCount || 0,
      lastSyncedAt: config.lastSyncedAt,
      runner: 'Cached'
    });
  }

  const pythonScript = path.join(ROOT_DIR, 'scripts', 'sync_fundamentals.py');

  // Ưu tiên chạy Python sync script
  execFile(PYTHON_CMD, [pythonScript], async (error, stdout, stderr) => {
    if (!error) {
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

    console.warn('⚠️ Không thể chạy python3 (fallback sang JS service):', stderr || error.message);

    // Fallback: Thực hiện fetch trực tiếp nếu môi trường thiếu python3
    try {
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
    } catch (fallbackErr) {
      return res.status(500).json({ error: fallbackErr.message });
    }
  });
});

export default router;
