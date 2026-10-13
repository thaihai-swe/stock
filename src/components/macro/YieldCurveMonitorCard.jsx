import React, { useState } from 'react';
import IntelligenceBadge from '../common/IntelligenceBadge.jsx';

/**
 * YieldCurveMonitorCard.jsx
 * Bảng Giám Sát Đường Cong Lợi Suất & Lãi Suất 17 Dòng (VN vs US)
 * Kế thừa tinh hoa học thuật & định lượng từ VN_MACRO_v4.2 & VnBondLab
 */
export default function YieldCurveMonitorCard({ data }) {
  const monitor = data?.yieldCurveMonitor;
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  if (!monitor || !monitor.rows || monitor.rows.length === 0) {
    return null;
  }

  const { summary, links, rows } = monitor;

  // Mapping highlight màu dòng
  const getRowHighlightClass = (type) => {
    switch (type) {
      case 'danger':
        return 'bg-rose-500/10 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 font-semibold';
      case 'warning':
        return 'bg-amber-500/10 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-medium';
      case 'success':
        return 'bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-semibold';
      default:
        return 'text-gray-700 dark:text-slate-300';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs">
      {/* ── 1. HEADER & TIÊU ĐỀ ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              VnBondLab & VN_MACRO_v4
            </span>
            <IntelligenceBadge type="heuristic" tooltip="Mô hình định lượng giám sát đường cong lợi suất TPCP 17 dòng VnBondLab" />
            <span className="text-xs text-gray-400">17-Row Yield Curve Monitor</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1 tracking-tight">
            Đường Cong Lợi Suất & Giám Sát Lãi Suất (VN vs US)
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Phân tích cấu trúc kỳ hạn Nelson-Siegel, bóc tách chuỗi truyền dẫn rủi ro 3 mắt xích (Link A/B/C) và nhận diện hình thái đường cong YC0–YC4.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowFormulaInfo(!showFormulaInfo)}
          className="self-start md:self-auto px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
        >
          <span>📐</span>
          <span>{showFormulaInfo ? 'Đóng giải thích toán' : 'Giải phẫu công thức'}</span>
        </button>
      </div>

      {/* ── 2. GIẢI THÍCH TOÁN HỌC NELSON-SIEGEL (NẾU BẬT) ── */}
      {showFormulaInfo && (
        <div className="my-5 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-gray-700 dark:text-slate-300 space-y-2">
          <div className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
            <span>🔬</span> CÔNG THỨC TOÁN ĐỘ CONG NELSON-SIEGEL & CẤU TRÚC KỲ HẠN:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
              <span className="font-bold text-gray-900 dark:text-white block">1. Độ Cong Cánh Bướm (Curvature):</span>
              <code className="text-indigo-600 dark:text-indigo-400 font-mono font-bold block my-1">
                Curvature = 2 × Y(5Y) - [Y(2Y) + Y(10Y)]
              </code>
              <p className="text-[11px] text-gray-500 dark:text-slate-400">
                • <b>Curv = 0.0% (Mỹ)</b>: Tuyến tính hóa đường cong (Linearization), thị trường đã định giá xong chu kỳ FED.<br/>
                • <b>Curv &gt; 0.3% (Việt Nam)</b>: Phình bụng kỳ hạn 5Y (Belly Focus) do thanh khoản liên ngân hàng ngắn hạn neo cao.
              </p>
            </div>
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
              <span className="font-bold text-gray-900 dark:text-white block">2. Chuỗi Truyền Dẫn Rủi Ro (Transmission Chain):</span>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                <b>Link A</b> (Áp lực USD/VND & Fed) → <b>Link B</b> (Thanh khoản liên ngân hàng ON) → <b>Link C</b> (Đảo ngược đường cong kỳ hạn).<br/>
                Khi cả 3 mắt xích cùng căng thẳng: Kích hoạt cảnh báo <i>FULL TRANSMISSION</i> (Ưu tiên tiền mặt/phòng thủ).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. HERO CARDS: 3 CHỈ BÁO CHIẾN LƯỢC CỐT LÕI ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        {/* Card 1: Khuyến Nghị Ưu Tiên Tài Sản */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/60 to-blue-50/40 dark:from-indigo-950/30 dark:to-slate-800/40 border border-indigo-100 dark:border-indigo-900/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 block">
            Quyết Định Phân Bổ Tài Sản
          </span>
          <div className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-1">
            {summary?.assetDecision}
          </div>
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
            {summary?.assetDecisionVi}
          </div>
          <div className="mt-2 text-[11px] text-gray-500 dark:text-slate-400 flex items-center justify-between border-t border-gray-100 dark:border-slate-800/80 pt-1.5">
            <span>Equity Risk Premium:</span>
            <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">+{summary?.equityRiskPremium}%</span>
          </div>
        </div>

        {/* Card 2: Chuỗi Truyền Dẫn Rủi Ro */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-950/20 dark:to-slate-800/40 border border-amber-100 dark:border-amber-900/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 block">
            Chuỗi Truyền Dẫn 3 Mắt Xích
          </span>
          <div className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-1 flex items-center gap-2">
            <span>{summary?.transChainStage}</span>
          </div>
          <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mt-0.5">
            {summary?.transStageSummary}
          </div>
          <div className="mt-2 text-[11px] text-gray-500 dark:text-slate-400 flex items-center justify-between border-t border-gray-100 dark:border-slate-800/80 pt-1.5">
            <span>Trạng thái 3 mắt xích:</span>
            <span className="font-bold font-mono">
              A:{links?.linkA?.pressured ? '⚠️' : '✅'} | B:{links?.linkB?.pressured ? '⚠️' : '✅'} | C:{links?.linkC?.pressured ? '⚠️' : '✅'}
            </span>
          </div>
        </div>

        {/* Card 3: Hình Thái Đường Cong & Ngành Hưởng Lợi */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/20 dark:to-slate-800/40 border border-emerald-100 dark:border-emerald-900/50">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-400 block">
            Hình Thái Đường Cong (YC Regime)
          </span>
          <div className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 mt-1">
            {summary?.vnYcCode} | {summary?.vnYcLabel}
          </div>
          <div className="text-xs font-medium text-gray-600 dark:text-slate-300 mt-0.5 truncate" title={summary?.favoredSectors}>
            Ngành hợp sóng: <b>{summary?.favoredSectors}</b>
          </div>
          <div className="mt-2 text-[11px] text-gray-500 dark:text-slate-400 flex items-center justify-between border-t border-gray-100 dark:border-slate-800/80 pt-1.5">
            <span>Trọng tâm dịch chuyển:</span>
            <span className="font-bold font-mono text-gray-700 dark:text-slate-300">{summary?.vnMoveFocus}</span>
          </div>
        </div>
      </div>

      {/* ── 4. BẢNG 17 DÒNG ĐỐI CHIẾU SONG SONG VN vs US ── */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-2xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/90 dark:bg-slate-800/80 text-gray-500 dark:text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-gray-200 dark:border-slate-800">
              <th className="py-3 px-3.5 sm:px-4 w-12 text-center">#</th>
              <th className="py-3 px-3.5 sm:px-4 w-56 sm:w-64">Chỉ Số / Cấu Trúc Lợi Suất</th>
              <th className="py-3 px-3.5 sm:px-4 bg-indigo-50/40 dark:bg-indigo-950/20 font-black text-indigo-900 dark:text-indigo-300">
                VIỆT NAM (VN)
              </th>
              <th className="py-3 px-3.5 sm:px-4 bg-blue-50/30 dark:bg-blue-950/20 font-black text-blue-900 dark:text-blue-300">
                HOA KỲ (US)
              </th>
              <th className="py-3 px-3.5 sm:px-4">Chênh Lệch & Luận Điểm Định Lượng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-sans">
            {rows.map((r) => (
              <tr
                key={r.id}
                className={`hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                  r.id === 6 || r.id === 14 || r.id === 17 ? 'font-bold bg-gray-50/40 dark:bg-slate-800/20' : ''
                }`}
              >
                <td className="py-2.5 px-3.5 sm:px-4 text-center font-mono text-gray-400 dark:text-slate-400">
                  {r.id}
                </td>
                <td className="py-2.5 px-3.5 sm:px-4 font-semibold text-gray-900 dark:text-white">
                  {r.metric}
                </td>
                <td className={`py-2.5 px-3.5 sm:px-4 font-mono font-bold ${getRowHighlightClass(r.highlight)}`}>
                  {r.vn}
                </td>
                <td className="py-2.5 px-3.5 sm:px-4 font-mono text-gray-700 dark:text-slate-300">
                  {r.us}
                </td>
                <td className="py-2.5 px-3.5 sm:px-4 text-gray-600 dark:text-slate-400 font-medium">
                  {r.delta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── 5. FOOTER GHI CHÚ BẢO VỆ NHÀ ĐẦU TƯ ── */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-gray-400 dark:text-slate-400 gap-2">
        <div>
          Nguồn dữ liệu: <b>HNX Bond Yields, SBV Refinancing, FRED Fed Funds & TVC Quotes</b>
        </div>
        <div className="font-mono">
          Nelson-Siegel Curvature: VN {summary?.vnCurvature}% vs US {summary?.usCurvature}%
        </div>
      </div>
    </div>
  );
}
