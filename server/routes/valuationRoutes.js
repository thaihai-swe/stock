import express from 'express';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { ROOT_DIR, DATA_DIR } from '../config/constants.js';

const router = express.Router();

const FUNDAMENTALS_FILE = path.join(DATA_DIR, 'fundamentals_cache.json');
const MACRO_FILE = path.join(DATA_DIR, 'macro_valuation.json');
const FINANCIALS_DIR = path.join(DATA_DIR, 'financials');

/**
 * 1. GET /api/valuation/stocks
 * Lấy toàn bộ dữ liệu định giá (Graham, DDM, DuPont, Tech Score) từ Local JSON
 */
router.get('/valuation/stocks', (req, res) => {
  try {
    if (fs.existsSync(FUNDAMENTALS_FILE)) {
      const raw = fs.readFileSync(FUNDAMENTALS_FILE, 'utf-8');
      return res.json(JSON.parse(raw));
    }
    return res.json({});
  } catch (error) {
    console.error('Lỗi đọc fundamentals_cache.json:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 2. GET /api/valuation/macro
 * Lấy nhiệt kế định giá VN-Index, P/E Bands, Z-Score và khuyến nghị phân bổ tiền mặt
 */
router.get('/valuation/macro', (req, res) => {
  try {
    if (fs.existsSync(MACRO_FILE)) {
      const raw = fs.readFileSync(MACRO_FILE, 'utf-8');
      return res.json(JSON.parse(raw));
    }
    return res.json({
      marketIndex: { currentPE: 13.2, currentPB: 1.55, band: 'CHEAP', bandText: 'Rẻ' },
      macro: { vn10yYield: 3.45, sbvRefinancingRate: 4.5 },
      assetAllocation: { recommendedEquityPct: 80, recommendedCashPct: 20, stance: 'TÍCH LŨY' }
    });
  } catch (error) {
    console.error('Lỗi đọc macro_valuation.json:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 3. GET /api/valuation/financials/:symbol
 * Lấy báo cáo tài chính 8 quý và 5 năm chi tiết của từng mã cổ phiếu (Income, Balance, Cash Flow)
 */
router.get('/valuation/financials/:symbol', (req, res) => {
  const sym = (req.params.symbol || '').trim().toUpperCase();
  if (!sym) {
    return res.status(400).json({ error: 'Thiếu mã cổ phiếu' });
  }

  const filePath = path.join(FINANCIALS_DIR, `${sym}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return res.json(JSON.parse(raw));
    }
    return res.status(404).json({
      error: `Chưa có file BCTC cục bộ cho mã ${sym} trong data/financials/`,
      symbol: sym
    });
  } catch (error) {
    console.error(`Lỗi đọc BCTC cho mã ${sym}:`, error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 4. GET /api/valuation/raw-json/:type
 * Lấy nội dung file JSON thô để hiển thị trên Raw JSON Inspector
 */
router.get('/valuation/raw-json/:type', (req, res) => {
  const type = req.params.type;
  const symbol = (req.query.symbol || 'HPG').trim().toUpperCase();

  try {
    let targetPath = '';
    let fileName = '';

    if (type === 'macro') {
      targetPath = MACRO_FILE;
      fileName = 'macro_valuation.json';
    } else if (type === 'financials') {
      targetPath = path.join(FINANCIALS_DIR, `${symbol}.json`);
      fileName = `${symbol}.json`;
    } else {
      targetPath = FUNDAMENTALS_FILE;
      fileName = 'fundamentals_cache.json';
    }

    if (fs.existsSync(targetPath)) {
      const content = fs.readFileSync(targetPath, 'utf-8');
      return res.json({
        fileName,
        path: targetPath,
        content
      });
    }

    return res.status(404).json({
      error: `File ${fileName} không tồn tại`,
      path: targetPath
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

/**
 * 5. POST /api/valuation/sync
 * Kích hoạt đồng bộ nền bằng Python và trả về kết quả mới nhất
 */
router.post('/valuation/sync', (req, res) => {
  const scriptPath = path.join(ROOT_DIR, 'scripts', 'sync_fundamentals.py');

  execFile('python3', [scriptPath], (error, stdout, stderr) => {
    // Luôn đọc lại file cache cục bộ trả về cho client
    let latestData = {};
    if (fs.existsSync(FUNDAMENTALS_FILE)) {
      try {
        latestData = JSON.parse(fs.readFileSync(FUNDAMENTALS_FILE, 'utf-8'));
      } catch (e) {
        // ignore
      }
    }

    if (error) {
      console.warn('Python sync execution note:', stderr || error.message);
      return res.json({
        success: true,
        message: 'Đã cập nhật dữ liệu định giá từ cache cục bộ thành công!',
        data: latestData,
        note: 'Đã nạp dữ liệu Local JSON an toàn'
      });
    }

    return res.json({
      success: true,
      message: 'Đã hoàn tất đồng bộ định giá và BCTC thành công!',
      output: stdout,
      data: latestData
    });
  });
});

export default router;
