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
 * 4. Kích hoạt đồng bộ toàn bộ dữ liệu nền bằng Python (Chỉ khả dụng ở Local)
 * Hỗ trợ cadence: 'all' (mặc định), 'daily', 'weekly', 'quarterly'
 */
router.post('/fundamentals/sync', asyncHandler(async (req, res) => {
  if (!isPythonAvailable()) {
    return res.status(403).json({
      success: false,
      error: 'Chức năng đồng bộ dữ liệu pipeline chỉ có thể thực thi trên máy Local có môi trường Python virtualenv (.venv).'
    });
  }

  const rawCadence = (req.body?.cadence || 'all').toLowerCase();
  const validCadences = ['all', 'daily', 'weekly', 'quarterly'];
  const cadence = validCadences.includes(rawCadence) ? rawCadence : 'all';

  const args = ['--cadence', cadence];
  if (req.body?.symbols && typeof req.body.symbols === 'string') {
    args.push('--symbols', req.body.symbols.trim().toUpperCase());
  }

  const startTime = Date.now();
  // Chạy Python unified pipeline orchestrator với timeout 10 phút (600.000ms)
  const { success, stdout, stderr } = await runPythonScript('scripts/run_pipeline.py', args, {
    timeout: 600000
  });

  const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);

  if (success) {
    const config = loadSupportedStocks();
    config.lastSyncedAt = new Date().toISOString();
    config.lastSyncedCadence = cadence;
    saveSupportedStocks(config);

    return res.json({
      success: true,
      message: `Đã hoàn tất đồng bộ Pipeline [${cadence.toUpperCase()}] thành công trong ${elapsedSeconds}s!`,
      cadence,
      elapsedSeconds,
      syncedCount: config.syncedCount || (config.symbols || []).length,
      lastSyncedAt: config.lastSyncedAt,
      runner: 'Python Unified Pipeline',
      output: stdout
    });
  }

  console.error(`⚠️ Lỗi thực thi Python Pipeline [${cadence}]:`, stderr);
  return res.status(500).json({
    success: false,
    error: `Lỗi thực thi pipeline [${cadence}]: ${stderr || 'Tiến trình bị gián đoạn'}`,
    output: stdout,
    stderr: stderr
  });
}));

export default router;
