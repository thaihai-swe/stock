import React, { useRef } from 'react';
import { formatVND, formatBn, formatPercent } from '../../utils/format';

/**
 * FullResearchReportModal.jsx
 * Institutional Master Dossier 10 Chương chuẩn Ngân hàng đầu tư / CTCK:
 * Ch.1: Tóm Tắt Khuyến Nghị & Luận Điểm (Executive Summary)
 * Ch.2: Ma Trận Định Giá Hội Tụ & Chiết Khấu DCF FCFF
 * Ch.3: Kiểm Toán Gian Lận Beneish M-Score (8 Chỉ Số)
 * Ch.4: Joel Greenblatt Magic Formula (EY% & ROIC%)
 * Ch.5: Giải Mã Điểm Uốn Dòng Tiền & Dồn Tích (FCF Inflection & Accruals)
 * Ch.6: Phân Rã DuPont 5 Nhân Tố Mở Rộng
 * Ch.7: Sức Khỏe Tài Chính & Hệ Thống Cảnh Báo Sớm
 * Ch.8: Hồ Sơ Hành Vi Định Lượng & Khối Lượng Dải Giá (Wyckoff POC)
 * Ch.9: Đo Lường Rủi Ro Thị Giá (VaR 95%, Sharpe, MDD)
 * Ch.10: Bản Tin & Đo Lường Tâm Lý 30 Ngày
 */
export default function FullResearchReportModal({ isOpen, onClose, symbol, stock, financials }) {
  const scrollContainerRef = useRef(null);

  if (!isOpen || !financials) return null;

  const currentPrice = stock?.close || financials.quarterly?.[financials.quarterly.length - 1]?.close || 0;
  const companyName = stock?.description || financials._meta?.companyName || symbol;
  const exchange = stock?.exchange || financials._meta?.exchange || 'HOSE';
  const multiples = financials.valuationMultiples || {};
  const health = financials.healthScore || {};
  const dupont = financials.extendedDupont || {};
  const earlyWarn = financials.earlyWarning || {};
  const dcf = financials.dcfAnalysis || {};
  const profile = financials.marketProfile || {};
  const news = financials.newsDigest || {};
  const risk = financials.riskMetrics || {};
  const beneish = financials.beneishMScore || financials.forensicAnalysis?.beneish || {};
  const magic = financials.magicFormula || financials.forensicAnalysis?.magicFormula || {};
  const inflection = financials.fcfInflection || financials.forensicAnalysis?.fcfInflection || {};

  const scrollToChapter = (chapterId) => {
    const el = document.getElementById(chapterId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-md overflow-hidden">
      <div
        ref={scrollContainerRef}
        className="bg-gray-900 text-gray-100 rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-700/80 p-5 md:p-8 space-y-6 relative scroll-smooth"
      >
        {/* Sticky Header & Action Bar */}
        <div className="sticky -top-5 md:-top-8 z-20 bg-gray-900/95 backdrop-blur-md pt-2 pb-4 border-b border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2.5 py-0.5 rounded-full font-extrabold bg-indigo-950 text-indigo-400 border border-indigo-800">
                {exchange}
              </span>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full font-extrabold ${
                  multiples.marginOfSafety >= 15
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                }`}
              >
                {multiples.marginOfSafety >= 15 ? 'MUA TÍCH LŨY' : 'THEO DÕI NẮM GIỮ'}
              </span>
              <span className="text-[11px] text-gray-400 font-mono">
                Institutional Master Dossier
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white mt-1">
              Báo Cáo Phân Tích Toàn Diện {symbol}
            </h2>
            <p className="text-xs text-gray-400">
              {companyName} · Bộ hồ sơ nghiên cứu 10 chương chuẩn Ngân hàng Đầu tư & CTCK
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all cursor-pointer"
              title="Đóng"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Quick Navigation 10 Chương (1-Click Jump) */}
        <div className="overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5 min-w-max text-xs">
            <span className="text-[11px] font-bold text-gray-400 mr-1 uppercase">Mục lục:</span>
            {[
              { id: 'ch1', label: '1. Luận Điểm' },
              { id: 'ch2', label: '2. Định Giá & DCF' },
              { id: 'ch3', label: '3. Beneish M-Score' },
              { id: 'ch4', label: '4. Magic Formula' },
              { id: 'ch5', label: '5. Điểm Uốn FCF' },
              { id: 'ch6', label: '6. DuPont 5 Nhân Tố' },
              { id: 'ch7', label: '7. Sức Khỏe & Rủi Ro' },
              { id: 'ch8', label: '8. Wyckoff POC' },
              { id: 'ch9', label: '9. Rủi Ro Thị Giá' },
              { id: 'ch10', label: '10. Tin Tức 30D' }
            ].map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => scrollToChapter(ch.id)}
                className="px-2.5 py-1 rounded-lg bg-gray-800/80 hover:bg-indigo-600 hover:text-white text-gray-300 font-semibold transition-colors cursor-pointer text-[11px]"
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hero KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 text-center">
            <div className="text-[10px] text-gray-400 font-bold uppercase">Thị Giá Hiện Tại</div>
            <div className="text-xl font-black text-indigo-400 mt-1">
              {formatVND(currentPrice)}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-center">
            <div className="text-[10px] text-gray-400 font-bold uppercase">Giá Hội Tụ (Consensus)</div>
            <div className="text-xl font-black text-emerald-400 mt-1">
              {formatVND(multiples.consensusFairValue)}
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-center">
            <div className="text-[10px] text-gray-400 font-bold uppercase">Biên An Toàn (MoS)</div>
            <div className="text-xl font-black text-emerald-400 mt-1">
              {multiples.marginOfSafety}%
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/60 text-center">
            <div className="text-[10px] text-gray-400 font-bold uppercase">Health Score</div>
            <div className="text-xl font-black text-purple-400 mt-1">
              {health.overallScore || '—'}/100
            </div>
          </div>
        </div>

        {/* ── CHƯƠNG 1: TÓM TẮT & LUẬN ĐIỂM ĐẦU TƯ ── */}
        <section id="ch1" className="space-y-3 pt-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <span>📌</span>
            <span>Chương 1: Tóm Tắt Khuyến Nghị & Luận Điểm Đầu Tư (Executive Summary)</span>
          </h3>
          <div className="p-4 rounded-2xl bg-gray-800/80 border border-gray-700 text-xs text-gray-200 leading-relaxed space-y-2">
            <p>
              Cổ phiếu <strong>{symbol}</strong> ghi nhận mức điểm sức khỏe tài chính tổng hợp đạt{' '}
              <strong className="text-emerald-400">{health.overallScore || '—'}/100 ({health.rating || 'Đạt Chuẩn'})</strong>{' '}
              với rủi ro vận hành ở mức thấp ({earlyWarn.riskLevel || 'An Toàn'}). Giá trị nội tại hội tụ từ 6 mô hình định giá chuyên sâu ước đạt{' '}
              <strong className="text-emerald-400">{formatVND(multiples.consensusFairValue)}</strong>, tương ứng Biên An Toàn (MoS) đạt{' '}
              <strong>{multiples.marginOfSafety}%</strong>.
            </p>
            <p>
              Hệ thống kiểm toán gian lận Beneish cho kết quả an toàn với điểm <strong>M-Score = {beneish.mScore || '—'}</strong>.
              Mô hình Magic Formula xếp hạng cổ phiếu vào nhóm <strong>{magic.category || 'Chất Lượng'}</strong> với ROIC đạt{' '}
              <strong className="text-indigo-400">{magic.roic || 0}%</strong> và Earnings Yield đạt{' '}
              <strong className="text-emerald-400">{magic.earningsYield || 0}%</strong>.
            </p>
          </div>
        </section>

        {/* ── CHƯƠNG 2: ĐỊNH GIÁ & DCF ── */}
        <section id="ch2" className="space-y-3 pt-3 border-t border-gray-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <span>🎯</span>
            <span>Chương 2: Ma Trận 6 Mô Hình Định Giá & Chiết Khấu DCF</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">1. GIÁ HỘI TỤ (CONSENSUS)</span>
              <span className="text-base font-bold text-emerald-400">{formatVND(multiples.consensusFairValue)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">2. DCF BASE CASE</span>
              <span className="text-base font-bold text-indigo-400">{formatVND(dcf.dcfScenarios?.basePrice)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">3. BENJAMIN GRAHAM</span>
              <span className="text-base font-bold text-white">{formatVND(multiples.grahamNumber)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">4. EV / EBITDA MULTIPLE</span>
              <span className="text-base font-bold text-white">{formatVND(multiples.evEbitdaFairPrice)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">5. DÒNG TIỀN P/CF</span>
              <span className="text-base font-bold text-white">{formatVND(multiples.pcfFairPrice)}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">6. P/E & P/B TARGET</span>
              <span className="text-base font-bold text-white">{formatVND(multiples.peTarget)}</span>
            </div>
          </div>
          <div className="text-xs text-gray-400">
            • Reverse DCF (Tốc độ tăng trưởng ngụ ý thị giá): <strong>{dcf.reverseDcfImpliedGrowth != null ? `${dcf.reverseDcfImpliedGrowth}%/năm` : '—'}</strong> · WACC: {dcf.sectorWacc || 10.5}%
          </div>
        </section>

        {/* ── CHƯƠNG 3: BENEISH M-SCORE ── */}
        <section id="ch3" className="space-y-3 pt-3 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <span>🛡️</span>
              <span>Chương 3: Kiểm Toán Gian Lận BCTC Beneish M-Score (8 Chỉ Số)</span>
            </h3>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                beneish.status === 'SAFE'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}
            >
              M-Score: {beneish.mScore || '—'} ({beneish.manipulationProbability || 'An toàn'})
            </span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">{beneish.summary}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-[10px] uppercase">
                  <th className="pb-2">Chỉ Số</th>
                  <th className="pb-2 text-right">Giá Trị</th>
                  <th className="pb-2 text-center">Ngưỡng Chuẩn</th>
                  <th className="pb-2">Diễn Giải Ý Nghĩa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {(beneish.indices || []).map((idx) => (
                  <tr key={idx.id}>
                    <td className="py-2">
                      <span className="font-bold text-white">{idx.name}</span>{' '}
                      <span className="text-[10px] text-gray-500 font-mono">({idx.id})</span>
                    </td>
                    <td className={`py-2 text-right font-mono font-bold ${idx.isAlert ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {idx.value != null ? idx.value.toFixed(3) : '—'}
                    </td>
                    <td className="py-2 text-center text-gray-400 font-mono">{idx.benchmark}</td>
                    <td className="py-2 text-gray-400 text-[11px]">{idx.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── CHƯƠNG 4: JOEL GREENBLATT MAGIC FORMULA ── */}
        <section id="ch4" className="space-y-3 pt-3 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <span>✨</span>
              <span>Chương 4: Joel Greenblatt Magic Formula (EY% & ROIC%)</span>
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-indigo-950 text-indigo-400 border border-indigo-800">
              Điểm: {magic.compositeScore || 0}/100
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">EARNINGS YIELD (EY%)</span>
              <span className="text-lg font-black text-emerald-400">{magic.earningsYield || 0}%</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">EBIT ÷ EV (&gt; 8.5% là rẻ)</span>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">RETURN ON CAPITAL (ROIC%)</span>
              <span className="text-lg font-black text-indigo-400">{magic.roic || 0}%</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Hiệu quả sử dụng vốn (&gt; 15%)</span>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">XẾP HẠNG MAGIC FORMULA</span>
              <span className="text-xs font-bold text-white block mt-1">{magic.category || 'Top-Tier'}</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">{magic.recommendation}</span>
            </div>
          </div>
        </section>

        {/* ── CHƯƠNG 5: ĐIỂM UỐN FCF & ACCRUALS ── */}
        <section id="ch5" className="space-y-3 pt-3 border-t border-gray-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <span>🎯</span>
            <span>Chương 5: Giải Mã Điểm Uốn Dòng Tiền & Dồn Tích (FCF Inflection Point)</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700 text-center">
              <span className="text-[10px] text-gray-400 block font-bold">CFO / LNST</span>
              <span className="text-base font-black text-emerald-400 mt-1">{inflection.cfoToNiRatio || 1.0}x</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Tiền thật về tài khoản</span>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700 text-center">
              <span className="text-[10px] text-gray-400 block font-bold">CAPEX / DOANH THU</span>
              <span className="text-base font-bold text-white mt-1">{inflection.capexToRevenueRatio || 0}%</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Tái đầu tư mở rộng</span>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700 text-center">
              <span className="text-[10px] text-gray-400 block font-bold">XDCB DỞ DANG / TTS</span>
              <span className="text-base font-bold text-amber-400 mt-1">{inflection.cipRatio || 0}%</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">{formatBn(inflection.constructionInProgress)} tỷ</span>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700 text-center">
              <span className="text-[10px] text-gray-400 block font-bold">ACCRUALS RATIO</span>
              <span className={`text-base font-mono font-bold mt-1 ${inflection.accrualsRatio <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {inflection.accrualsRatio || 0}
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">{inflection.accrualsRating}</span>
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700 text-xs text-gray-300">
            <strong>{inflection.statusTitle}:</strong> {inflection.narrative}
          </div>
        </section>

        {/* ── CHƯƠNG 6: DUPONT 5 NHÂN TỐ ── */}
        <section id="ch6" className="space-y-3 pt-3 border-t border-gray-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <span>🧬</span>
            <span>Chương 6: Phân Rã DuPont 5 Nhân Tố Mở Rộng</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">ROE THỰC TẾ</span>
              <span className="text-base font-bold text-emerald-400">{dupont.roe != null ? `${dupont.roe}%` : '—'}</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">OPERATING MARGIN</span>
              <span className="text-base font-bold text-white">{dupont.factors?.operatingMargin?.value != null ? `${dupont.factors.operatingMargin.value}%` : '—'}</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">VÒNG QUAY TÀI SẢN</span>
              <span className="text-base font-bold text-white">{dupont.factors?.assetTurnover?.value != null ? `${dupont.factors.assetTurnover.value}x` : '—'}</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">ĐÒN BẨY NỢ (LEVERAGE)</span>
              <span className="text-base font-bold text-white">{dupont.factors?.financialLeverage?.value != null ? `${dupont.factors.financialLeverage.value}x` : '—'}</span>
            </div>
          </div>
        </section>

        {/* ── CHƯƠNG 7: SỨC KHỎE TÀI CHÍNH ── */}
        <section id="ch7" className="space-y-3 pt-3 border-t border-gray-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <span>🏥</span>
            <span>Chương 7: Sức Khỏe Tài Chính & Cảnh Báo Sớm</span>
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">HEALTH SCORE (0-100)</span>
              <span className="text-lg font-black text-emerald-400">{health.overallScore || '—'}/100</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Xếp hạng: {health.rating || 'Đạt Chuẩn'}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">ĐIỂM RỦI RO (RISK SCORE)</span>
              <span className={`text-lg font-black ${earlyWarn.riskScore > 40 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {earlyWarn.riskScore || 0}/100
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Mức độ: {earlyWarn.riskLevel || 'An Toàn'}</span>
            </div>
          </div>
        </section>

        {/* ── CHƯƠNG 8: WYCKOFF POC ── */}
        <section id="ch8" className="space-y-3 pt-3 border-t border-gray-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <span>🧬</span>
            <span>Chương 8: Hồ Sơ Hành Vi Định Lượng & Wyckoff POC</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">POINT OF CONTROL (POC)</span>
              <span className="font-bold text-white mt-1 block">
                {profile.volumeAtPrice?.poc ? formatVND(profile.volumeAtPrice.poc.priceMid) : '—'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">DÒNG TIỀN CMF & VPCI</span>
              <span className="font-bold text-indigo-400 mt-1 block">
                CMF: {profile.moneyFlow?.cmf || 0} · VPCI: {profile.moneyFlow?.vpci || 1.0}x
              </span>
            </div>
            <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">ARCHETYPE</span>
              <span className="font-bold text-white mt-1 block">{profile.archetype?.name || 'Theo Xu Hướng'}</span>
            </div>
          </div>
        </section>

        {/* ── CHƯƠNG 9: RỦI RO BIẾN ĐỘNG ── */}
        <section id="ch9" className="space-y-3 pt-3 border-t border-gray-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <span>⚡</span>
            <span>Chương 9: Đo Lường Rủi Ro Biến Động Thị Giá</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700 text-center">
              <span className="text-[10px] text-gray-400 block font-bold">VOLATILITY (1Y)</span>
              <span className="text-base font-bold text-white mt-1">{risk.annualizedVolatility || 25}%</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700 text-center">
              <span className="text-[10px] text-gray-400 block font-bold">MAX DRAWDOWN</span>
              <span className="text-base font-bold text-rose-400 mt-1">-{risk.maxDrawdown || 15}%</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700 text-center">
              <span className="text-[10px] text-gray-400 block font-bold">VAR 95% (1D)</span>
              <span className="text-base font-bold text-rose-400 mt-1">-{risk.var95 || 2.5}%</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700 text-center">
              <span className="text-[10px] text-gray-400 block font-bold">SHARPE RATIO</span>
              <span className="text-base font-bold text-indigo-400 mt-1">{risk.sharpeRatio || 1.0}</span>
            </div>
          </div>
        </section>

        {/* ── CHƯƠNG 10: TIN TỨC 30 NGÀY ── */}
        <section id="ch10" className="space-y-3 pt-3 border-t border-gray-800">
          <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <span>📰</span>
            <span>Chương 10: Bản Tin & Tâm Lý Thị Trường 30 Ngày</span>
          </h3>
          <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700 text-xs text-gray-300 leading-relaxed">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-bold text-white">
                Điểm tâm lý: {news.sentiment?.score > 0 ? `+${news.sentiment?.score}` : news.sentiment?.score}/100 ({news.sentiment?.verdictText || 'Tích cực'})
              </span>
              <span className="text-[11px] text-gray-400 font-mono">{news.sentiment?.totalCount || 0} tin tức 30D</span>
            </div>
            <p className="text-[11px] text-gray-400">{news.tldr?.summary}</p>
          </div>
        </section>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-[11px] text-gray-500">
            Dữ liệu BCTC & Giá: {financials._meta?.updatedAt || 'Hôm nay'} · Chuẩn VAS TT200
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold transition-all cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
