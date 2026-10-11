import React from 'react';

function formatBn(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number(val).toLocaleString('vi-VN') + ' tỷ';
}

export default function FinancialRatiosView({ financialRatios }) {
  if (!financialRatios) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-5">
      <div>
        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
          Bộ 54 Chỉ Số Tài Chính Toàn Diện
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-0.5 flex items-center gap-2">
          <span>📊</span> Phân Tích Đa Chiều Sức Khỏe & Hiệu Quả Hoạt Động Doanh Nghiệp
        </h3>
        <p className="text-xs text-gray-400 mt-0.5">
          Dữ liệu trượt 4 quý gần nhất (TTM) kết hợp chuẩn hóa BCTC kiểm toán
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Nhóm Định Giá */}
        <div className="p-4 sm:p-5 bg-gray-50/80 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
            <span>🎯</span> 1. Nhóm Chỉ Số Định Giá (Multiples)
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">P/E (Giá / Thu nhập)</span>
              <span className="font-bold text-gray-900 dark:text-white">{financialRatios.valuation?.pe || '—'}x</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">P/B (Giá / Sổ sách)</span>
              <span className="font-bold text-gray-900 dark:text-white">{financialRatios.valuation?.pb || '—'}x</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">P/S (Giá / Doanh thu)</span>
              <span className="font-bold text-gray-900 dark:text-white">{financialRatios.valuation?.ps || '—'}x</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">P/CF (Giá / Dòng tiền CFO)</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{financialRatios.valuation?.pCf || '—'}x</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">EV / EBITDA</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{financialRatios.valuation?.evEbitda || '—'}x</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500 dark:text-gray-400">Tỷ suất cổ tức (Dividend Yield)</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{financialRatios.valuation?.dividendYield}%</span>
            </div>
          </div>
        </div>

        {/* 2. Nhóm Sinh Lời */}
        <div className="p-4 sm:p-5 bg-gray-50/80 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <span>📈</span> 2. Khả Năng Sinh Lời (Profitability)
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">ROE (Lợi nhuận / Vốn CSH)</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400">{financialRatios.profitability?.roe}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">ROA (Lợi nhuận / Tổng TS)</span>
              <span className="font-bold text-gray-900 dark:text-white">{financialRatios.profitability?.roa}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">ROIC (Lợi nhuận / Vốn đầu tư)</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{financialRatios.profitability?.roic}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Biên lợi nhuận gộp (Gross Margin)</span>
              <span className="font-bold text-gray-900 dark:text-white">{financialRatios.profitability?.grossMargin}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Biên lợi nhuận ròng (Net Margin)</span>
              <span className="font-bold text-gray-900 dark:text-white">{financialRatios.profitability?.netMargin}%</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500 dark:text-gray-400">EBITDA 4 Quý</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatBn(financialRatios.profitability?.ebitda)}</span>
            </div>
          </div>
        </div>

        {/* 3. Nhóm Thanh Khoản */}
        <div className="p-4 sm:p-5 bg-gray-50/80 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
            <span>💧</span> 3. Khả Năng Thanh Khoản (Liquidity)
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Thanh toán hiện hành (Current Ratio)</span>
              <span className="font-bold text-gray-900 dark:text-white">{financialRatios.liquidity?.currentRatio}x</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Thanh toán nhanh (Quick Ratio)</span>
              <span className="font-bold text-gray-900 dark:text-white">{financialRatios.liquidity?.quickRatio}x</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Thanh toán tiền mặt (Cash Ratio)</span>
              <span className="font-bold text-gray-900 dark:text-white">{financialRatios.liquidity?.cashRatio}x</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500 dark:text-gray-400">Nợ ngắn hạn / Tổng nợ</span>
              <span className="font-bold text-gray-900 dark:text-white">{financialRatios.liquidity?.shortTermDebtToTotalDebt}%</span>
            </div>
          </div>
        </div>

        {/* 4. Nhóm Hoạt Động & Hiệu Quả */}
        <div className="p-4 sm:p-5 bg-gray-50/80 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <span>⚙️</span> 4. Hiệu Quả Hoạt Động (Efficiency)
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Vòng quay khoản phải thu</span>
              <span className="font-bold text-gray-900 dark:text-white">{financialRatios.efficiency?.receivablesTurnover}x</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Vòng quay hàng tồn kho</span>
              <span className="font-bold text-gray-900 dark:text-white">{financialRatios.efficiency?.inventoryTurnover}x</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Vòng quay tài sản (Asset Turnover)</span>
              <span className="font-bold text-gray-900 dark:text-white">{financialRatios.efficiency?.assetTurnover}x</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Vòng quay vốn CSH (Equity Turnover)</span>
              <span className="font-bold text-gray-900 dark:text-white">{financialRatios.efficiency?.equityTurnover}x</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500 dark:text-gray-400">Chu kỳ chuyển đổi tiền mặt (CCC)</span>
              <span className="font-black text-indigo-600 dark:text-indigo-400">{financialRatios.efficiency?.ccc} ngày</span>
            </div>
          </div>
        </div>

        {/* 5. Nhóm Đòn Bẩy & Nợ */}
        <div className="p-4 sm:p-5 bg-gray-50/80 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <span>⚖️</span> 5. Đòn Bẩy Tài Chính & Cơ Cấu Nợ (Leverage)
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Tổng nợ / Vốn CSH (Debt / Equity)</span>
              <span className="font-bold text-rose-600 dark:text-rose-400">{financialRatios.leverage?.debtToEquity}x</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Vay nợ / Vốn CSH (Borrowings/Equity)</span>
              <span className="font-bold text-gray-900 dark:text-white">{financialRatios.leverage?.borrowingsToEquity}x</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">Đòn bẩy tài chính (Equity Multiplier)</span>
              <span className="font-bold text-gray-900 dark:text-white">{financialRatios.leverage?.financialLeverage}x</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-500 dark:text-gray-400">Nợ vay ròng (Net Debt)</span>
              <span className="font-bold text-gray-900 dark:text-white">{formatBn(financialRatios.leverage?.netDebt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
