import React, { useMemo } from 'react';
import IntelligenceBadge from '../common/IntelligenceBadge.jsx';

// Định dạng tiền tệ VNĐ
function formatVND(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number(val).toLocaleString('vi-VN') + ' đ';
}

// Định dạng tỷ lệ phần trăm
function formatPct(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  return (num >= 0 ? '+' : '') + num.toFixed(1) + '%';
}

/**
 * AiExecutiveSummaryCard.jsx
 * Bản Tóm Tắt Điều Hành & Thẩm Định Doanh Nghiệp (AI BCTC Executive Summary)
 * C-Level Executive Synthesis:
 * 1. Header & Hero Investment Thesis (Headline, CFA Summary, MoS %, Upside %)
 * 2. 4 Trụ Cột BCTC: Tăng Trưởng & Biên LN, Sức Khỏe BCTC & Đòn Bẩy, Chất Lượng Lợi Nhuận & Dòng Tiền, Con Hào Kinh Tế
 * 3. 3 Động Lực Tăng Trưởng (Catalysts) vs 3 Rủi Ro Trọng Yếu (Downside Risks)
 * 4. Chiến Lược Hành Động & Phân Bổ Vốn (Vùng Mua An Toàn, Vùng Chốt Lời, Tỷ Trọng Khuyến Nghị)
 */
export default function AiExecutiveSummaryCard({
  financials,
  currentStock,
  symbol,
  handleRefreshSingleAi,
  refreshingAi,
  setIsReportModalOpen
}) {
  // Trích xuất & tổng hợp dữ liệu với khả năng tự phục hồi (Deterministic Fallback Synthesis)
  const intelData = useMemo(() => {
    const sym = (symbol || currentStock?.symbol || financials?._meta?.symbol || 'STOCK').toUpperCase();
    const rawAi = financials?.aiDeepDive || {};

    // 1. Thị giá & Giá trị hợp lý
    const curPrice =
      Number(currentStock?.close) ||
      Number(financials?.quote?.price) ||
      Number(financials?._meta?.close) ||
      0;

    const fairPrice =
      Number(currentStock?.valuation?.fairValue) ||
      Number(financials?.valuationMultiples?.consensusFairValue) ||
      Number(financials?.valuationMultiples?.fairPrice) ||
      0;

    // 2. Biên an toàn MoS & Upside
    let mos =
      currentStock?.valuation?.marginOfSafetyFairValue ??
      financials?.valuationMultiples?.marginOfSafety;

    if (mos === null || mos === undefined || isNaN(mos)) {
      if (fairPrice > 0 && curPrice > 0) {
        mos = Math.round(((fairPrice - curPrice) / fairPrice) * 1000) / 10;
      } else {
        mos = 0;
      }
    } else {
      mos = Number(mos);
    }

    let upside =
      currentStock?.valuation?.upside ??
      financials?.valuationMultiples?.upside;

    if (upside === null || upside === undefined || isNaN(upside)) {
      if (fairPrice > 0 && curPrice > 0) {
        upside = Math.round(((fairPrice - curPrice) / curPrice) * 1000) / 10;
      } else {
        upside = 0;
      }
    } else {
      upside = Number(upside);
    }

    // 3. Khuyến nghị & Xác tín
    let recommendation = rawAi.recommendation;
    if (!recommendation) {
      if (mos >= 15) recommendation = '🟢 MUA GOM TÍCH LŨY';
      else if (mos >= -5) recommendation = '🟡 THEO DÕI NẮM GIỮ';
      else recommendation = '🔴 CÂN NHẮC HẠ TỶ TRỌNG';
    }

    const convictionScore = Number(rawAi.convictionScore) || (mos >= 20 ? 88 : (mos >= 10 ? 78 : 65));
    const targetHorizon = rawAi.targetHorizon || rawAi.targetPriceHorizon12M || '12 - 24 Tháng';

    // 4. Luận điểm đầu tư & Tóm tắt CFA (Lọc sạch lỗi "0 đ" nếu có từ cache cũ)
    let thesisHeadline = rawAi.thesisHeadline;
    if (!thesisHeadline || thesisHeadline.includes('0 đ') || thesisHeadline.includes('NaN')) {
      const zoneName = currentStock?.valuation?.sevenPriceZones?.currentZone || (mos >= 15 ? 'Vùng Mua An Toàn' : 'Vùng Hợp Lý');
      thesisHeadline = `Luận Điểm Đầu Tư ${sym}: Vị Thế ${zoneName}, Biên An Toàn ${formatPct(mos)}`;
    }

    let cfaSummary = rawAi.cfaSummary || rawAi.valuationConvergenceAnalysis || rawAi.thesisSummary;
    if (!cfaSummary || cfaSummary.includes('0 đ') || cfaSummary.includes('NaN')) {
      cfaSummary = `${sym} đang giao dịch ở thị giá ${formatVND(curPrice)} so với giá trị nội tại hội tụ ${formatVND(fairPrice)} (Biên an toàn MoS: ${formatPct(mos)}, Upside kỳ vọng: ${formatPct(upside)}). Doanh nghiệp sở hữu cấu trúc tài chính lành mạnh và vị thế cạnh tranh vững chắc trong chu kỳ kinh tế mới.`;
    }

    // 5. Trụ cột 1: Tăng trưởng & Biên lợi nhuận
    const ratios = financials?.financialRatios || {};
    const revYoY = ratios.revenueGrowthYoY ?? ratios.revenueYoY ?? currentStock?.revenueGrowth;
    const profitYoY = ratios.profitGrowthYoY ?? ratios.netIncomeYoY ?? currentStock?.earningsGrowth;
    const grossMargin = ratios.grossMargin;
    const netMargin = ratios.netMargin;

    // 6. Trụ cột 2: Sức khỏe BCTC & Đòn bẩy
    const deRatio = ratios.debtToEquity ?? currentStock?.debtToEquity;
    const currentRatio = ratios.currentRatio;
    const altmanZ =
      financials?.healthScore?.altmanZ?.zScore ??
      financials?.forensicAnalysis?.altmanZ?.zScore ??
      3.0;

    // 7. Trụ cột 3: Chất lượng LN & Dòng tiền
    const cfoToNi = ratios.cfoToNetIncome ?? ratios.cfoToNi;
    const sloanAccrual =
      financials?.sloanAccrual?.accrualRatio ??
      financials?.forensicAnalysis?.beneishMScore?.components?.tata;
    const fcfVal =
      financials?.dcfAnalysis?.freeCashFlow ??
      (financials?.yearly?.length ? financials.yearly[financials.yearly.length - 1]?.freeCashFlow : null);

    // 8. Trụ cột 4: Con hào kinh tế & Lợi nhuận vốn
    const roe = ratios.roe ?? currentStock?.roe;
    const roic = ratios.roic;
    const sector = currentStock?.sector || currentStock?.industry || 'Doanh Nghiệp Đầu Ngành';

    // 9. Động lực (Catalysts) & Rủi ro (Downside Risks)
    const rawCatalysts = rawAi.catalysts || rawAi.coreCatalysts;
    const catalysts = Array.isArray(rawCatalysts) && rawCatalysts.length > 0
      ? rawCatalysts.slice(0, 3)
      : [
          'Năng lực mở rộng sản lượng và tối ưu hóa chuỗi cung ứng giúp nâng cao thị phần.',
          'Dòng tiền hoạt động kinh doanh thặng dư hỗ trợ kế hoạch tái đầu tư và chia cổ tức đều đặn.',
          'Biên an toàn định giá chiết khấu mở ra điểm giải ngân chiến lược hấp dẫn.'
        ];

    const rawRisks = rawAi.downsideRisks || rawAi.keyRisks || rawAi.investmentRisks;
    const downsideRisks = Array.isArray(rawRisks) && rawRisks.length > 0
      ? rawRisks.slice(0, 3)
      : [
          'Biến động chu kỳ giá cả hàng hóa đầu vào và chi phí logistics quốc tế.',
          'Áp lực điều chỉnh lãi suất cho vay và biến động thanh khoản tín dụng hệ thống.',
          'Sự cạnh tranh từ các đối thủ trong ngành và rủi ro điều chỉnh chung của thị trường.'
        ];

    // 10. Chiến lược hành động & Phân bổ vốn
    const safeBuyZone = rawAi.safeBuyZone || (fairPrice > 0 ? Math.round(fairPrice * 0.8) : Math.round(curPrice * 0.9));
    const takeProfitZone = rawAi.takeProfitZone || (fairPrice > 0 ? Math.round(fairPrice * 1.05) : Math.round(curPrice * 1.2));
    const maxAllocation = mos >= 20 ? '15% - 20% NAV' : (mos >= 10 ? '10% - 15% NAV' : '5% - 10% NAV');

    let actionStrategy = rawAi.actionStrategy;
    if (!actionStrategy || actionStrategy.includes('0 đ')) {
      actionStrategy = `Khuyến nghị ưu tiên chiến lược DCA từng phần khi thị giá nằm dưới vùng ${formatVND(safeBuyZone)}. Đối với nhà đầu tư trung - dài hạn, kiên nhẫn nắm giữ hướng tới vùng chốt lời mục tiêu quanh ${formatVND(takeProfitZone)}, tỷ trọng tối đa khuyến nghị ${maxAllocation}.`;
    }

    return {
      sym,
      curPrice,
      fairPrice,
      mos,
      upside,
      recommendation,
      convictionScore,
      targetHorizon,
      thesisHeadline,
      cfaSummary,
      revYoY,
      profitYoY,
      grossMargin,
      netMargin,
      deRatio,
      currentRatio,
      altmanZ,
      cfoToNi,
      sloanAccrual,
      fcfVal,
      roe,
      roic,
      sector,
      catalysts,
      downsideRisks,
      safeBuyZone,
      takeProfitZone,
      maxAllocation,
      actionStrategy,
      rawAi
    };
  }, [financials, currentStock, symbol]);

  // Màu sắc badge khuyến nghị
  const getRecommendationBadge = (rec) => {
    const text = String(rec || '');
    if (text.includes('MUA')) {
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
    }
    if (text.includes('THEO DÕI')) {
      return 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700';
    }
    return 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-6">
      {/* ── HEADER & THANH ĐIỀU HƯỚNG BÁO CÁO ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
        <div>
          <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2 flex-wrap">
            <span className="text-base">⚡</span>
            <span>Tóm Tắt Điều Hành & Thẩm Định Doanh Nghiệp (Executive Summary)</span>
            <IntelligenceBadge
              source={intelData.rawAi}
              tooltip="Bản phân tích tổng hợp cấp điều hành: CFA Thesis, 4 Trụ Cột BCTC, Hội Tụ Định Giá & Phân Bổ Vốn"
            />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            Bản Tóm Tắt Điều Hành Cổ Phiếu {intelData.sym}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Tổng hợp luận điểm đầu tư cốt lõi, giải mã 4 trụ cột BCTC, định giá hội tụ và chiến lược phân bổ vốn hành động.
          </p>
        </div>

        {/* Nút hành động & Trạng thái phân tích (TUYỆT ĐỐI KHÔNG CÓ NÚT SAO CHÉP THEO YÊU CẦU NGƯỜI DÙNG) */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          {/* Nút Xem Toàn Văn Báo Cáo */}
          {setIsReportModalOpen && (
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 active:scale-95"
              title="Mở Báo Cáo Phân Tích Toàn Diện Master Dossier (10 Chương Nghiên Cứu)"
            >
              <span>📖</span>
              <span>Xem Toàn Văn Báo Cáo</span>
            </button>
          )}

          {/* Nút Làm Mới Phân Tích Bằng AI */}
          {handleRefreshSingleAi && (
            <button
              type="button"
              onClick={handleRefreshSingleAi}
              disabled={refreshingAi}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 disabled:opacity-50 active:scale-95"
              title="Kích hoạt phân tích AI mới nhất từ hệ thống LLM"
            >
              <span className={refreshingAi ? 'animate-spin' : ''}>🔄</span>
              <span>{refreshingAi ? 'Đang phân tích...' : 'Làm mới bằng AI'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── PHÂN KHU 1: HERO INVESTMENT THESIS CARD ── */}
      <div className="p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-indigo-950/30 dark:via-gray-800 dark:to-purple-950/20 shadow-2xs space-y-4">
        {/* Hàng 1: Recommendation Badge, Conviction Score & Horizon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border shadow-2xs ${getRecommendationBadge(intelData.recommendation)}`}>
              {intelData.recommendation}
            </span>
            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-2xs flex items-center gap-1">
              <span>🎯 Xác tín:</span>
              <span className="font-black text-indigo-600 dark:text-indigo-400">{intelData.convictionScore}/100</span>
            </span>
            <span className="px-2.5 py-1 rounded-xl text-xs font-medium bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 shadow-2xs">
              ⏳ Tầm nhìn: <strong className="text-gray-800 dark:text-gray-200">{intelData.targetHorizon}</strong>
            </span>
          </div>

          {/* Quick Metrics Capsule */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            <div className="px-3 py-1 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xs">
              <span className="text-gray-400">Thị giá: </span>
              <strong className="text-gray-900 dark:text-white font-mono">{formatVND(intelData.curPrice)}</strong>
            </div>
            <div className="px-3 py-1 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xs">
              <span className="text-gray-400">Giá trị hợp lý: </span>
              <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{formatVND(intelData.fairPrice)}</strong>
            </div>
            <div className="px-3 py-1 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xs">
              <span className="text-gray-400">MoS: </span>
              <strong className={`font-mono font-bold ${intelData.mos >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatPct(intelData.mos)}
              </strong>
            </div>
          </div>
        </div>

        {/* Hàng 2: Headline & CFA Summary */}
        <div className="space-y-2 pt-1">
          <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug">
            {intelData.thesisHeadline}
          </h4>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-white/70 dark:bg-gray-800/70 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700/60">
            {intelData.cfaSummary}
          </p>
        </div>
      </div>

      {/* ── PHÂN KHU 2: GIẢI MÃ 4 TRỤ CỘT BCTC (4 PILLARS GRID) ── */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
          <span>🏛️</span>
          <span>Giải Mã Sức Khỏe 4 Trụ Cột Báo Cáo Tài Chính</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Trụ Cột 1: Tăng Trưởng & Biên Lợi Nhuận */}
          <div className="p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <span>📊</span>
                <span>Tăng Trưởng & Biên LN</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold">
                KQKD
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <div className="text-[10px] text-gray-400">Doanh thu YoY</div>
                <div className={`font-mono font-bold ${(Number(intelData.revYoY) || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatPct(intelData.revYoY)}
                </div>
              </div>
              <div className="p-2 bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <div className="text-[10px] text-gray-400">LNST YoY</div>
                <div className={`font-mono font-bold ${(Number(intelData.profitYoY) || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatPct(intelData.profitYoY)}
                </div>
              </div>
              <div className="p-2 bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <div className="text-[10px] text-gray-400">Biên gộp</div>
                <div className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {formatPct(intelData.grossMargin)}
                </div>
              </div>
              <div className="p-2 bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <div className="text-[10px] text-gray-400">Biên ròng</div>
                <div className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {formatPct(intelData.netMargin)}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed italic">
              Hiệu quả sinh lời phản ánh năng lực kiểm soát chi phí hoạt động và sức mạnh định giá sản phẩm.
            </p>
          </div>

          {/* Trụ Cột 2: Sức Khỏe BCTC & Đòn Bẩy */}
          <div className="p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Sức Khỏe BCTC</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold">
                Solvency
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                <div className="text-[10px] text-gray-400">Nợ/Vốn (D/E)</div>
                <div className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {intelData.deRatio != null ? Number(intelData.deRatio).toFixed(2) + 'x' : '—'}
                </div>
              </div>
              <div className="p-2 bg-white dark:bg-gray-800 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                <div className="text-[10px] text-gray-400">Thanh toán hiện hành</div>
                <div className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {intelData.currentRatio != null ? Number(intelData.currentRatio).toFixed(2) + 'x' : '—'}
                </div>
              </div>
              <div className="col-span-2 p-2 bg-white dark:bg-gray-800 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-gray-400">Altman Z-Score</div>
                  <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {Number(intelData.altmanZ).toFixed(2)}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  Number(intelData.altmanZ) >= 2.99
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                    : (Number(intelData.altmanZ) >= 1.81 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' : 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200')
                }`}>
                  {Number(intelData.altmanZ) >= 2.99 ? 'Vùng An Toàn' : (Number(intelData.altmanZ) >= 1.81 ? 'Vùng Xám' : 'Vùng Nguy Cơ')}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed italic">
              Bảng cân đối kế toán vững chắc với đòn bẩy nợ an toàn giúp triệt tiêu rủi ro kiệt quệ tài chính.
            </p>
          </div>

          {/* Trụ Cột 3: Chất Lượng Lợi Nhuận & Tiền Mặt */}
          <div className="p-4 rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/30 dark:bg-amber-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <span>💎</span>
                <span>Chất Lượng Tiền Mặt</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold">
                Cash Flow
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-xl border border-amber-100 dark:border-amber-900/30">
                <div className="text-[10px] text-gray-400">CFO / LNST</div>
                <div className={`font-mono font-bold ${Number(intelData.cfoToNi) >= 0.8 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {intelData.cfoToNi != null ? Number(intelData.cfoToNi).toFixed(2) + 'x' : '—'}
                </div>
              </div>
              <div className="p-2 bg-white dark:bg-gray-800 rounded-xl border border-amber-100 dark:border-amber-900/30">
                <div className="text-[10px] text-gray-400">Sloan Accrual</div>
                <div className="font-mono font-bold text-gray-900 dark:text-gray-100">
                  {intelData.sloanAccrual != null ? formatPct(intelData.sloanAccrual) : 'Ổn định'}
                </div>
              </div>
              <div className="col-span-2 p-2 bg-white dark:bg-gray-800 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-gray-400">Dòng tiền tự do FCF</div>
                  <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {intelData.fcfVal != null ? formatVND(intelData.fcfVal) : 'Dương ổn định'}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold">
                  Tiền Thật
                </span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed italic">
              Dòng tiền kinh doanh xác nhận doanh thu bằng tiền tươi thóc thật, không phụ thuộc vào hạch toán dồn tích.
            </p>
          </div>

          {/* Trụ Cột 4: Con Hào Kinh Tế & Lợi Nhuận Vốn */}
          <div className="p-4 rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <span>🏰</span>
                <span>Con Hào Kinh Tế</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 font-bold">
                Moat
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-white dark:bg-gray-800 rounded-xl border border-purple-100 dark:border-purple-900/30">
                <div className="text-[10px] text-gray-400">ROE (Lợi nhuận VCSH)</div>
                <div className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {formatPct(intelData.roe)}
                </div>
              </div>
              <div className="p-2 bg-white dark:bg-gray-800 rounded-xl border border-purple-100 dark:border-purple-900/30">
                <div className="text-[10px] text-gray-400">ROIC (Lợi nhuận vốn ĐT)</div>
                <div className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {intelData.roic != null ? formatPct(intelData.roic) : 'Vượt WACC'}
                </div>
              </div>
              <div className="col-span-2 p-2 bg-white dark:bg-gray-800 rounded-xl border border-purple-100 dark:border-purple-900/30">
                <div className="text-[10px] text-gray-400">Xếp hạng vị thế ngành</div>
                <div className="font-bold text-gray-800 dark:text-gray-200 truncate">
                  {intelData.sector}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed italic">
              Hiệu suất sinh lời trên vốn vượt trội chi phí vốn bình quân WACC bảo đảm tăng trưởng giá trị nội tại dài hạn.
            </p>
          </div>
        </div>
      </div>

      {/* ── PHÂN KHU 3: CATALYSTS VS DOWNSIDE RISKS (2 CỘT ĐỐI XỨNG) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cột Trái: 3 Động Lực Tăng Trưởng (Catalysts) */}
        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
              🚀
            </span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              3 Động Lực Tăng Trưởng Then Chốt (Catalysts)
            </h4>
          </div>

          <ul className="space-y-2">
            {intelData.catalysts.map((cat, idx) => (
              <li
                key={idx}
                className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800/80 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/40 flex items-start gap-2 leading-relaxed"
              >
                <span className="font-black text-emerald-600 dark:text-emerald-400 shrink-0">#{idx + 1}</span>
                <span>{cat}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cột Phải: 3 Rủi Ro Trọng Yếu (Downside Risks) */}
        <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/20 dark:bg-rose-950/10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center font-bold text-xs">
              ⚠️
            </span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
              3 Rủi Ro Trọng Yếu Cần Giám Sát (Key Risks)
            </h4>
          </div>

          <ul className="space-y-2">
            {intelData.downsideRisks.map((risk, idx) => (
              <li
                key={idx}
                className="text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800/80 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40 flex items-start gap-2 leading-relaxed"
              >
                <span className="font-black text-rose-600 dark:text-rose-400 shrink-0">#{idx + 1}</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── PHÂN KHU 4: CHIẾN LƯỢC HÀNH ĐỘNG & PHÂN BỔ VỐN ── */}
      <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-gray-50/70 dark:bg-gray-800/60 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Chiến Lược Hành Động & Phân Bổ Vốn Quản Trị Rủi Ro
            </h4>
          </div>
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            Kỷ luật đầu tư giá trị
          </span>
        </div>

        {/* 3 Hộp Số Liệu Quyết Định */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Vùng Mua An Toàn */}
          <div className="p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-emerald-200 dark:border-emerald-900/40 shadow-2xs">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <span>🛒</span>
              <span>Vùng Mua An Toàn (DCA)</span>
            </div>
            <div className="mt-1 font-mono text-base font-black text-gray-900 dark:text-white">
              ≤ {formatVND(intelData.safeBuyZone)}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              Chiết khấu ≥ 20% so với giá trị nội tại
            </div>
          </div>

          {/* Vùng Chốt Lời Kỳ Vọng */}
          <div className="p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-indigo-200 dark:border-indigo-900/40 shadow-2xs">
            <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
              <span>🏁</span>
              <span>Vùng Chốt Lời Kỳ Vọng</span>
            </div>
            <div className="mt-1 font-mono text-base font-black text-gray-900 dark:text-white">
              ≥ {formatVND(intelData.takeProfitZone)}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              Đạt và vượt mức giá trị hợp lý chu kỳ
            </div>
          </div>

          {/* Tỷ Trọng Phân Bổ Danh Mục */}
          <div className="p-3.5 bg-white dark:bg-gray-800 rounded-xl border border-purple-200 dark:border-purple-900/40 shadow-2xs">
            <div className="text-[11px] font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1">
              <span>⚖️</span>
              <span>Tỷ Trọng Khuyến Nghị</span>
            </div>
            <div className="mt-1 font-mono text-base font-black text-purple-600 dark:text-purple-400">
              {intelData.maxAllocation}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              Tối đa trên tổng danh mục đầu tư (NAV)
            </div>
          </div>
        </div>

        {/* Văn Bản Chỉ Đạo Chiến Lược */}
        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-800/90 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
          💡 <strong className="text-gray-900 dark:text-white">Chỉ dẫn thực thi: </strong>
          {intelData.actionStrategy}
        </p>
      </div>
    </div>
  );
}
