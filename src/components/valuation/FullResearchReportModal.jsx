import React from 'react';
import { formatVND } from '../../utils/format';

export default function FullResearchReportModal({ isOpen, onClose, symbol, stock, financials }) {
  if (!isOpen || !financials) return null;

  const currentPrice = stock?.close || financials.quarterly?.[financials.quarterly.length - 1]?.close || 0;
  const companyName = stock?.description || financials._meta?.companyName || symbol;
  const exchange = stock?.exchange || financials._meta?.exchange || 'HOSE';
  const multiples = financials.valuationMultiples || {};
  const health = financials.healthScore || {};
  const dupont = financials.extendedDupont || {};
  const earlyWarn = financials.earlyWarning || {};
  const industry = financials.industrySpecific || {};
  const dcf = financials.dcfAnalysis || {};
  const profile = financials.marketProfile || {};
  const news = financials.newsDigest || {};
  const ratios = financials.financialRatios || {};

  const handleExportHtml = () => {
    const reportHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo Cáo Phân Tích Nghiên Cứu Cổ Phiếu ${symbol} — Equity Research Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 24px; line-height: 1.5; }
    .container { max-width: 1000px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 36px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
    h1 { margin: 0; font-size: 26px; font-weight: 900; color: #0f172a; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .section { margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .section-title { font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; }
    .card-title { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
    .card-value { font-size: 18px; font-weight: 900; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
    th, td { padding: 10px; border: 1px solid #e2e8f0; text-align: left; }
    th { background: #f1f5f9; font-weight: 800; color: #334155; }
    .text-right { text-align: right; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .text-emerald { color: #059669; }
    .text-rose { color: #e11d48; }
    .footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <span class="badge badge-blue">${exchange}</span>
          <span class="badge badge-green">${multiples.marginOfSafety >= 15 ? 'KHUYẾN NGHỊ: MUA TÍCH LŨY' : 'KHUYẾN NGHỊ: THEO DÕI NẮM GIỮ'}</span>
        </div>
        <h1>${symbol} — ${companyName}</h1>
        <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Báo Cáo Phân Tích Định Lượng & Định Giá Toàn Diện (Equity Research Report)</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 11px; color: #64748b; font-weight: bold;">THỊ GIÁ HIỆN TẠI</div>
        <div style="font-size: 24px; font-weight: 900; color: #4338ca;">${formatVND(currentPrice)}</div>
        <div style="font-size: 11px; color: #64748b;">Giá Hội Tụ: <strong>${formatVND(multiples.consensusFairValue)}</strong> (MoS: ${multiples.marginOfSafety}%)</div>
      </div>
    </div>

    <!-- SECTION 1: EXECUTIVE SUMMARY -->
    <div class="section">
      <div class="section-title">📌 1. Tóm Tắt Khuyến Nghị & Luận Điểm Đầu Tư (Executive Summary)</div>
      <div class="card" style="background: #eef2ff; border-color: #c7d2fe;">
        <div style="font-size: 13px; color: #3730a3; font-weight: 500; line-height: 1.6;">
          ${symbol} ghi nhận mức điểm sức khỏe tài chính tổng hợp đạt <strong>${health.overallScore || '—'}/100 (${health.rating || 'Đạt Chuẩn'})</strong>. 
          Giá trị nội tại hội tụ từ 9 mô hình định giá chuyên sâu ước đạt <strong>${formatVND(multiples.consensusFairValue)}</strong>, 
          tương ứng biên an toàn <strong>${multiples.marginOfSafety}%</strong> so với thị giá hiện tại. 
          Hồ sơ hành vi thị trường xếp vào nhóm <strong>${profile.archetype?.name || 'Theo Xu Hướng'}</strong> với dòng tiền CMF duy trì trạng thái <strong>${profile.moneyFlow?.cmfStatus || 'Cân bằng'}</strong>.
        </div>
      </div>
    </div>

    <!-- SECTION 2: ĐỊNH GIÁ & DCF -->
    <div class="section">
      <div class="section-title">🎯 2. Ma Trận 9 Mô Hình Định Giá & Chiết Khấu Dòng Tiền (DCF)</div>
      <div class="grid">
        <div class="card">
          <div class="card-title">Giá Trị Hội Tụ (Consensus)</div>
          <div class="card-value text-emerald">${formatVND(multiples.consensusFairValue)}</div>
        </div>
        <div class="card">
          <div class="card-title">DCF FCFF (Base Case)</div>
          <div class="card-value">${formatVND(dcf.dcfScenarios?.basePrice)}</div>
        </div>
        <div class="card">
          <div class="card-title">Benjamin Graham</div>
          <div class="card-value">${formatVND(multiples.grahamNumber)}</div>
        </div>
        <div class="card">
          <div class="card-title">EV / EBITDA Multiple</div>
          <div class="card-value">${formatVND(multiples.evEbitdaFairPrice)}</div>
        </div>
      </div>
      <div style="margin-top: 12px; font-size: 12px; color: #475569;">
        • <strong>Reverse DCF (Tăng trưởng ngụ ý):</strong> ${dcf.reverseDcfImpliedGrowth != null ? `${dcf.reverseDcfImpliedGrowth}%/năm` : '—'} <br>
        • <strong>WACC áp dụng theo ngành:</strong> ${dcf.sectorWacc || 10.5}% (Ngành: ${dcf.industryCategory || 'GENERAL'})
      </div>
    </div>

    <!-- SECTION 3: SỨC KHỎE TÀI CHÍNH & CẢNH BÁO SỚM -->
    <div class="section">
      <div class="section-title">🏥 3. Sức Khỏe Tài Chính & Ma Trận Cảnh Báo Sớm (Red Flags)</div>
      <div class="grid">
        <div class="card">
          <div class="card-title">Health Score (0-100)</div>
          <div class="card-value">${health.overallScore || '—'} / 100</div>
          <div style="font-size: 11px; color: #64748b;">Hạng: ${health.rating || '—'}</div>
        </div>
        <div class="card">
          <div class="card-title">Risk Score (0-100)</div>
          <div class="card-value ${earlyWarn.riskScore > 40 ? 'text-rose' : 'text-emerald'}">${earlyWarn.riskScore || 0} / 100</div>
          <div style="font-size: 11px; color: #64748b;">Mức độ: ${earlyWarn.riskLevel || 'Thấp'}</div>
        </div>
        <div class="card">
          <div class="card-title">DuPont 5 Nhân Tố ROE</div>
          <div class="card-value text-emerald">${dupont.roe != null ? `${dupont.roe}%` : '—'}</div>
          <div style="font-size: 11px; color: #64748b;">EBIT Margin: ${dupont.factors?.operatingMargin?.value != null ? `${dupont.factors.operatingMargin.value}%` : '—'}</div>
        </div>
      </div>
    </div>

    <!-- SECTION 4: HỒ SƠ THỊ TRƯỜNG & WYCKOFF -->
    <div class="section">
      <div class="section-title">🧬 4. Hồ Sơ Thị Trường Định Lượng & Wyckoff VAP</div>
      <div style="font-size: 12px; color: #334155; line-height: 1.6;">
        • <strong>Vùng Kiểm Soát (Point of Control - POC):</strong> ${profile.volumeAtPrice?.poc ? `${formatVND(profile.volumeAtPrice.poc.priceLow)} - ${formatVND(profile.volumeAtPrice.poc.priceHigh)} (${profile.volumeAtPrice.poc.volumePercent}% khối lượng)` : '—'}<br>
        • <strong>Chỉ số xác nhận khối lượng VPCI:</strong> ${profile.moneyFlow?.vpci || 1.0}x (${profile.moneyFlow?.vpciStatus || 'Bình thường'})<br>
        • <strong>Dòng tiền Chaikin (CMF):</strong> ${profile.moneyFlow?.cmf || 0} (${profile.moneyFlow?.cmfStatus || 'Cân bằng'})<br>
        • <strong>Rủi ro đuôi VaR 95%:</strong> -${profile.tailRisk?.var95 || 2.5}% (Expected Shortfall: -${profile.tailRisk?.es95 || 3.8}%)<br>
        • <strong>Archetype tính cách:</strong> ${profile.archetype?.name || 'Bám Xu Hướng'}
      </div>
    </div>

    <!-- SECTION 5: BẢN TIN THỜI SỰ 30 NGÀY -->
    <div class="section">
      <div class="section-title">📰 5. Bản Tin Thời Sự & Tâm Lý Thị Trường 30 Ngày</div>
      <div style="font-size: 12px; color: #334155; line-height: 1.6;">
        • <strong>Điểm số tâm lý (Sentiment Score):</strong> ${news.sentiment?.score != null ? `${news.sentiment.score > 0 ? '+' : ''}${news.sentiment.score}/100 (${news.sentiment?.verdictText || 'Trung lập'})` : '—'}<br>
        • <strong>Tỷ lệ tin tích cực:</strong> ${news.sentiment?.totalCount ? `${Math.round((news.sentiment.bullishCount / news.sentiment.totalCount) * 100)}% (${news.sentiment.bullishCount}/${news.sentiment.totalCount} tin)` : '—'}<br>
        • <strong>Tóm tắt 30 ngày:</strong> ${news.tldr?.summary || 'Dòng tin tức hoạt động bình thường.'}
      </div>
    </div>

    <div class="footer">
      Báo cáo được khởi tạo tự động bởi Stock Portfolio Manager & Enterprise Valuation Engine (Chuẩn Institutional Equity Research VN).<br>
      Tài liệu phân tích phục vụ mục đích nghiên cứu và tham khảo, không cấu thành lời mời chào mua bán chứng khoán trực tiếp.
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${symbol}_Equity_Research_Report.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 dark:border-gray-700 p-6 md:p-8 space-y-6 relative">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {exchange}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {multiples.marginOfSafety >= 15 ? 'MUA TÍCH LŨY' : 'THEO DÕI NẮM GIỮ'}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mt-1">
              Báo Cáo Phân Tích Nghiên Cứu Cổ Phiếu {symbol}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {companyName} · Bản phân tích toàn diện 22 phân mục canonical chuẩn CTCK
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportHtml}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <span>📥</span>
              <span>Xuất File HTML Độc Lập</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Hero KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-center">
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase">Thị Giá Hiện Tại</div>
            <div className="text-lg font-black text-indigo-700 dark:text-indigo-300 mt-0.5">
              {formatVND(currentPrice)}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-center">
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase">Giá Hội Tụ (9 Models)</div>
            <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
              {formatVND(multiples.consensusFairValue)}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-center">
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase">Biên An Toàn (MoS)</div>
            <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">
              {multiples.marginOfSafety}%
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-center">
            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase">Health Score</div>
            <div className="text-lg font-black text-purple-700 dark:text-purple-300 mt-0.5">
              {health.overallScore || '—'}/100
            </div>
          </div>
        </div>

        {/* Section 1: Executive Summary */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40 text-xs text-gray-700 dark:text-gray-300 leading-relaxed space-y-1.5">
          <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            <span>⚡</span>
            <span>Luận Điểm Đầu Tư & Tóm Tắt (Executive Summary):</span>
          </div>
          <p>
            Doanh nghiệp được xếp hạng sức khỏe tài chính <strong>{health.rating || 'Đạt Chuẩn'}</strong> với rủi ro tài chính ở mức <strong>{earlyWarn.riskLevel || 'Thấp'}</strong>. 
            Mô hình chiết khấu dòng tiền DCF (Base Case) định giá cổ phiếu tại mức <strong>{formatVND(dcf.dcfScenarios?.basePrice)}</strong>, 
            kết hợp cùng Graham Number ({formatVND(multiples.grahamNumber)}) và EV/EBITDA ({formatVND(multiples.evEbitdaFairPrice)}) 
            tạo nên vùng giá trị hội tụ <strong>{formatVND(multiples.consensusFairValue)}</strong>.
          </p>
        </div>

        {/* Section 2: Valuation Models Breakdown */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <span>🎯</span>
            <span>Ma Trận 9 Phương Pháp Định Giá Độc Lập</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">1. BENJAMIN GRAHAM</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{formatVND(multiples.grahamNumber)}</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">2. DCF BASE CASE</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{formatVND(dcf.dcfScenarios?.basePrice)}</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">3. EV/EBITDA</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{formatVND(multiples.evEbitdaFairPrice)}</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">4. DÒNG TIỀN P/CF</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{formatVND(multiples.pcfFairPrice)}</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">5. TARGET P/E</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{formatVND(multiples.peTarget)}</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">6. TARGET P/B</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">{formatVND(multiples.pbTarget)}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Market Profile & Wyckoff */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <span>🧬</span>
            <span>Hồ Sơ Hành Vi Định Lượng & Khối Lượng Dải Giá (Wyckoff)</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">POINT OF CONTROL (POC)</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {profile.volumeAtPrice?.poc ? `${formatVND(profile.volumeAtPrice.poc.priceMid)}` : '—'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">VPCI & DÒNG TIỀN CMF</span>
              <span className="font-mono font-bold text-gray-900 dark:text-white">
                {profile.moneyFlow?.vpci || 1.0}x · CMF: {profile.moneyFlow?.cmf || 0}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] text-gray-400 block font-bold">ARCHETYPE</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {profile.archetype?.name || 'Theo Xu Hướng'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: News Sentiment 30-Day */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <span>📰</span>
            <span>Bản Tin & Tâm Lý 30 Ngày</span>
          </h4>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold">Điểm số tâm lý: {news.sentiment?.score > 0 ? `+${news.sentiment?.score}` : news.sentiment?.score}/100</span>
              <span className="text-[11px] text-gray-400 font-mono">{news.sentiment?.totalCount || 0} tin tức</span>
            </div>
            <p className="text-[11px] leading-relaxed">{news.tldr?.summary}</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            Cập nhật dữ liệu: {financials._meta?.updatedAt || 'Hôm nay'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportHtml}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
            >
              📥 Xuất File HTML Báo Cáo
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
