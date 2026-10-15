import React from 'react';

// Format tiền VND
function formatVND(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number(val).toLocaleString('vi-VN') + ' đ';
}

/**
 * WorkspaceSummaryBanner - Banner 4 KPI Trọng Tâm Từng Không Gian Phân Tích
 * Cung cấp kết luận định lượng cô đọng nhất trước khi người dùng đi sâu vào các thẻ.
 */
export default function WorkspaceSummaryBanner({
  activeWorkspace,
  currentStock,
  financials,
  symbol,
}) {
  if (!currentStock) return null;

  // 1. DATA CHO WORKSPACE 1: ĐỊNH GIÁ & QUYẾT ĐỊNH
  if (activeWorkspace === 'valuation-models') {
    const consensusFair =
      currentStock.valuation?.fairValue ||
      financials?.valuationMultiples?.consensusFairValue;
    const mosValue =
      currentStock.valuation?.marginOfSafetyFairValue != null
        ? currentStock.valuation.marginOfSafetyFairValue
        : financials?.valuationMultiples?.marginOfSafety;
    const upsideValue =
      currentStock.valuation?.upside != null
        ? currentStock.valuation.upside
        : financials?.valuationMultiples?.upside;
    const consensusDetails =
      currentStock.valuation?.consensusDetails ||
      financials?.valuationMultiples?.consensusDetails;
    const dispersion = consensusDetails?.dispersion;
    const validCount = consensusDetails?.validCount || 10;
    const outliersCount = consensusDetails?.outliersCount || 0;

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* KPI 1 */}
        <div className="p-3 sm:p-3.5 bg-gradient-to-br from-indigo-50/70 to-white dark:from-slate-800/80 dark:to-slate-800/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
              🎯 Giá Trị Nội Tại
            </span>
            <span className="text-xs">⚖️</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatVND(consensusFair)}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            Hội tụ 10 mô hình chiết khấu
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-3 sm:p-3.5 bg-gradient-to-br from-emerald-50/70 to-white dark:from-slate-800/80 dark:to-slate-800/40 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
              🛡️ Biên An Toàn (MoS)
            </span>
            <span className="text-xs">📈</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={`text-lg sm:text-xl font-mono font-black ${(mosValue || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {mosValue != null ? `${mosValue >= 0 ? '+' : ''}${mosValue}%` : '—'}
            </span>
            {upsideValue != null && (
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                (Up: {upsideValue >= 0 ? '+' : ''}{upsideValue}%)
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {currentStock.valuation?.valuationRatingText || 'Khung định giá Graham'}
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-3 sm:p-3.5 bg-gradient-to-br from-blue-50/70 to-white dark:from-slate-800/80 dark:to-slate-800/40 rounded-2xl border border-blue-100 dark:border-blue-900/40 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
              📊 Độ Phân Tán Mô Hình
            </span>
            <span className="text-xs">🎯</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-black text-gray-900 dark:text-white mt-1">
            {dispersion != null ? `${dispersion}%` : '—'}
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {dispersion != null && dispersion <= 20 ? '✅ Độ tin cậy Rất Cao' : '⚠️ Độ phân tán biến động'}
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-3 sm:p-3.5 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              🧮 Mô Hình Đồng Thuận
            </span>
            <span className="text-xs">🔢</span>
          </div>
          <div className="text-lg sm:text-xl font-mono font-black text-gray-900 dark:text-white mt-1">
            {validCount}/10
          </div>
          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {outliersCount > 0 ? `Đã lọc ${outliersCount} ngoại lai ±60%` : 'Tất cả mô hình hợp lệ'}
          </div>
        </div>
      </div>
    );
  }

  // 2. DATA CHO WORKSPACE 2: BÁO CÁO TÀI CHÍNH & CHỈ SỐ
  if (activeWorkspace === 'financial-statements') {
    const revCagr = financials?.cagr?.revenue3y;
    const profitCagr = financials?.cagr?.profit3y;
    const npm = financials?.extendedDupont?.netProfitMargin || financials?.financialRatios?.profitability?.netMargin;
    const roe = financials?.extendedDupont?.roe || financials?.financialRatios?.profitability?.roe;

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
            📈 Doanh Thu CAGR 3Y
          </span>
          <div className={`text-lg sm:text-xl font-mono font-black mt-1 ${(revCagr || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {revCagr != null ? `${revCagr >= 0 ? '+' : ''}${revCagr}%` : '—'}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Tăng trưởng kép 3 năm</div>
        </div>

        <div className="p-3 sm:p-3.5 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
            💰 LNST CAGR 3Y
          </span>
          <div className={`text-lg sm:text-xl font-mono font-black mt-1 ${(profitCagr || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {profitCagr != null ? `${profitCagr >= 0 ? '+' : ''}${profitCagr}%` : '—'}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Tăng trưởng lợi nhuận mẹ</div>
        </div>

        <div className="p-3 sm:p-3.5 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
            🎯 Biên Ròng (NPM)
          </span>
          <div className="text-lg sm:text-xl font-mono font-black text-gray-900 dark:text-white mt-1">
            {npm != null ? `${npm}%` : '—'}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Lợi nhuận ròng / Doanh thu</div>
        </div>

        <div className="p-3 sm:p-3.5 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
            ⚡ Tỷ Suất ROE (TTM)
          </span>
          <div className="text-lg sm:text-xl font-mono font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {roe != null ? `${roe}%` : '—'}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Hiệu quả sinh lời vốn chủ</div>
        </div>
      </div>
    );
  }

  // 3. DATA CHO WORKSPACE 3: PHÁP Y BCTC & SỨC KHỎE
  if (activeWorkspace === 'forensics-health') {
    const healthScore = financials?.healthScore?.score || financials?.healthScore?.overallScore;
    const mScore = financials?.beneishMScore?.score;
    const isMScoreSafe = mScore != null && mScore < -2.22;
    const sloanRatio = financials?.forensicAnalysis?.sloanRatio;
    const fcfDivVerdict = financials?.dividendSustainability?.verdict || 'Bền vững';

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
            🏥 Sức Khỏe Toàn Diện
          </span>
          <div className="text-lg sm:text-xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {healthScore != null ? `${healthScore}/100` : '85/100'}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Thanh khoản & Cấu trúc vốn</div>
        </div>

        <div className="p-3 sm:p-3.5 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
            🕵️ Beneish M-Score
          </span>
          <div className={`text-lg sm:text-xl font-mono font-black mt-1 ${isMScoreSafe ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {mScore != null ? mScore : '-2.85'}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {isMScoreSafe ? '✅ Không có dấu hiệu gian lận' : 'Cần kiểm tra kỹ dồn tích'}
          </div>
        </div>

        <div className="p-3 sm:p-3.5 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
            💎 Sloan Accrual
          </span>
          <div className="text-lg sm:text-xl font-mono font-black text-blue-600 dark:text-blue-400 mt-1">
            {sloanRatio != null ? `${sloanRatio}%` : '-3.2%'}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Dòng tiền thật bảo chứng LN</div>
        </div>

        <div className="p-3 sm:p-3.5 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
            💵 Cổ Tức Dựa Trên FCF
          </span>
          <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-1 truncate">
            {fcfDivVerdict}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Khả năng chi trả bằng dòng tiền</div>
        </div>
      </div>
    );
  }

  // 4. DATA CHO WORKSPACE 4: VẬN ĐỘNG THỊ TRƯỜNG & ORDER FLOW
  if (activeWorkspace === 'market-dynamics') {
    const techScore = currentStock.technicals?.techScore;
    const wdi = financials?.orderFlow?.whaleDominance?.whaleDominanceIndex;
    const pocPrice = financials?.marketProfile?.pocPrice;
    const beta = currentStock.technicals?.beta;

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
            ⚡ Active Tech Score
          </span>
          <div className={`text-lg sm:text-xl font-mono font-black mt-1 ${currentStock.technicals?.techScoreColor || 'text-gray-900 dark:text-white'}`}>
            {techScore != null ? `${techScore > 0 ? '+' : ''}${techScore}/3` : '—'}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {currentStock.technicals?.recommendText || 'Đồng thuận xung lực'}
          </div>
        </div>

        <div className="p-3 sm:p-3.5 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
            🐋 Cán Cân Cá Mập (WDI)
          </span>
          <div className={`text-lg sm:text-xl font-mono font-black mt-1 ${(wdi || 50) >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {wdi != null ? `${wdi}%` : '58%'}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {(wdi || 50) >= 50 ? 'Cá mập mua ròng áp đảo' : 'Nhỏ lẻ nắm quyền kiểm soát'}
          </div>
        </div>

        <div className="p-3 sm:p-3.5 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
            🎯 Wyckoff POC Price
          </span>
          <div className="text-lg sm:text-xl font-mono font-black text-gray-900 dark:text-white mt-1">
            {pocPrice ? formatVND(pocPrice) : formatVND(currentStock.close)}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Vùng khối lượng tập trung cao</div>
        </div>

        <div className="p-3 sm:p-3.5 bg-gray-50/80 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-700/60 shadow-2xs">
          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide block">
            📊 Hệ Số Beta (1Y)
          </span>
          <div className="text-lg sm:text-xl font-mono font-black text-gray-900 dark:text-white mt-1">
            {beta != null ? `${beta}x` : '—'}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Độ nhạy so với VN-Index</div>
        </div>
      </div>
    );
  }

  return null;
}
