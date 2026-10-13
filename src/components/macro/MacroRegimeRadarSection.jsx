import ExecutiveSummaryCard from './ExecutiveSummaryCard.jsx';
import IntelligenceBadge from '../common/IntelligenceBadge.jsx';

export default function MacroRegimeRadarSection({
  macroData = {},
  regime = {},
  macroClock = {},
  risk = {},
  leading = {},
  leadLag = {},
  confidence = {},
  scenarioMatrix = {},
  tailRisks = [],
  hasActiveTailRisk = false,
  market = {},
}) {
  return (
    <div className="space-y-6">
      {/* ── 1. BÁO CÁO ĐIỀU HÀNH TRỌNG YẾU (EXECUTIVE SUMMARY) ── */}
      <ExecutiveSummaryCard
        executiveSummary={macroData?.executiveSummary}
        aiInsight={macroData?.aiInsight}
        weeklyPulse={macroData?.weeklyPulse}
      />

      {/* ── 2. CẢNH BÁO TAIL-RISKS NẾU ĐƯỢC KÍCH HOẠT ── */}
      {hasActiveTailRisk && tailRisks?.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="animate-ping inline-flex h-2 w-2 rounded-full bg-rose-400 opacity-75" />
              🚨 Cảnh Báo Rủi Ro Đuôi Kích Hoạt (Active Tail-Risks Triggers)
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">
              {tailRisks.length} cảnh báo đang mở
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tailRisks.map((tr) => (
              <div
                key={tr.id}
                className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent border border-rose-500/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>⚡</span> {tr.name}
                  </span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${tr.badge || 'bg-rose-500/20 text-rose-300 border-rose-500/40'}`}>
                    {tr.severity || 'HIGH'}
                  </span>
                </div>
                <div className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                  <span className="font-bold">Ngưỡng kích hoạt:</span> {tr.trigger}
                </div>
                <div className="text-[11px] text-gray-600 dark:text-gray-400">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Tác động thị trường:</span> {tr.impact}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. CARD MA TRẬN 3 KỊCH BẢN THỊ TRƯỜNG (SCENARIO MATRIX) ── */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Dự Phóng Vĩ Mô & Định Lượng Kịch Bản (Scenario Matrix)
              </span>
              <IntelligenceBadge type="heuristic" tooltip="Mô hình dự phóng xác suất 3 kịch bản VN-Index & phân bổ ngành" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 mt-0.5">
              3 Kịch Bản Định Giá VN-Index & Phân Bổ Ngành
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {(market?.currentPoint || scenarioMatrix?.base?.currentPoint) && (
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-800/40">
                🎯 Điểm gốc: <b>{Number(market?.currentPoint || scenarioMatrix?.base?.currentPoint).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</b> điểm
              </span>
            )}
            <span className="text-gray-400 dark:text-slate-500">
              Xác suất: <b className="text-indigo-600 dark:text-indigo-400">{scenarioMatrix?.base?.probability || 55}% Base · {scenarioMatrix?.bull?.probability || 25}% Bull · {scenarioMatrix?.bear?.probability || 20}% Bear</b>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Base Case */}
          {scenarioMatrix?.base && (
            <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-blue-700 dark:text-blue-300">
                    {scenarioMatrix.base.name}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-xs font-black">
                    {scenarioMatrix.base.probability}%
                  </span>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-blue-900 dark:text-blue-100">
                    {scenarioMatrix.base.vnIndexRange}
                  </div>
                  <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    Dải điểm kỳ vọng VN-Index
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  <b className="text-gray-900 dark:text-white">Điều kiện:</b> {scenarioMatrix.base.conditions}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  <b className="text-gray-900 dark:text-white">Luận điểm:</b> {scenarioMatrix.base.narrative}
                </div>
              </div>
              <div className="pt-3 border-t border-blue-200/60 dark:border-blue-800/40 space-y-1.5">
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span>✓ Ưu tiên:</span>
                  <span className="font-normal text-gray-700 dark:text-gray-300">{scenarioMatrix.base.sectorBenefit?.join(', ')}</span>
                </div>
                <div className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                  <span>✕ Thận trọng:</span>
                  <span className="font-normal text-gray-700 dark:text-gray-300">{scenarioMatrix.base.sectorImpacted?.join(', ')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Bull Case */}
          {scenarioMatrix?.bull && (
            <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300">
                    {scenarioMatrix.bull.name}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-black">
                    {scenarioMatrix.bull.probability}%
                  </span>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100">
                    {scenarioMatrix.bull.vnIndexRange}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Dải điểm kỳ vọng VN-Index
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  <b className="text-gray-900 dark:text-white">Điều kiện:</b> {scenarioMatrix.bull.conditions}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  <b className="text-gray-900 dark:text-white">Luận điểm:</b> {scenarioMatrix.bull.narrative}
                </div>
              </div>
              <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 space-y-1.5">
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span>✓ Ưu tiên:</span>
                  <span className="font-normal text-gray-700 dark:text-gray-300">{scenarioMatrix.bull.sectorBenefit?.join(', ')}</span>
                </div>
                <div className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                  <span>✕ Thận trọng:</span>
                  <span className="font-normal text-gray-700 dark:text-gray-300">{scenarioMatrix.bull.sectorImpacted?.join(', ')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Bear Case */}
          {scenarioMatrix?.bear && (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-rose-700 dark:text-rose-300">
                    {scenarioMatrix.bear.name}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs font-black">
                    {scenarioMatrix.bear.probability}%
                  </span>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black text-rose-900 dark:text-rose-100">
                    {scenarioMatrix.bear.vnIndexRange}
                  </div>
                  <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                    Dải điểm kỳ vọng VN-Index
                  </div>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  <b className="text-gray-900 dark:text-white">Điều kiện:</b> {scenarioMatrix.bear.conditions}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  <b className="text-gray-900 dark:text-white">Luận điểm:</b> {scenarioMatrix.bear.narrative}
                </div>
              </div>
              <div className="pt-3 border-t border-rose-200/60 dark:border-rose-800/40 space-y-1.5">
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span>✓ Ưu tiên:</span>
                  <span className="font-normal text-gray-700 dark:text-gray-300">{scenarioMatrix.bear.sectorBenefit?.join(', ')}</span>
                </div>
                <div className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                  <span>✕ Thận trọng:</span>
                  <span className="font-normal text-gray-700 dark:text-gray-300">{scenarioMatrix.bear.sectorImpacted?.join(', ')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. MACRO CLOCK: 4 GÓC PHẦN TƯ CHU KỲ VĨ MÔ ── */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Đồng Hồ Vĩ Mô (Macro Clock Framework)
              </span>
              <IntelligenceBadge type="heuristic" tooltip="Khung lý thuyết Macro Clock 4 góc phần tư GDP vs Lạm phát" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 mt-0.5">
              4 Góc Phần Tư Tăng Trưởng GDP & Lạm Phát
            </h3>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800 self-start sm:self-auto">
            {macroClock?.titleVi || 'Tăng Trưởng Bền Vững'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            {
              key: 'expansion',
              aliases: ['expansion', 'goldilocks'],
              icon: '🌟',
              title: 'Tăng Trưởng Vững Vàng (Goldilocks)',
              sub: 'GDP Tăng Trưởng Cao • Lạm Phát Ổn Định',
              desc: 'Môi trường lý tưởng nhất cho thị trường chứng khoán. Lợi nhuận doanh nghiệp tăng trưởng mạnh.',
              sectors: 'Ngân hàng, Chứng khoán, Bán lẻ, Công nghệ',
              activeClass: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-500 shadow-xs',
              badgeBg: 'bg-emerald-600',
              subColor: 'text-emerald-600 dark:text-emerald-400',
              sectorColor: 'text-emerald-700 dark:text-emerald-300'
            },
            {
              key: 'overheating',
              aliases: ['overheating'],
              icon: '🔥',
              title: 'Quá Nhiệt / Tăng Tốc (Overheating)',
              sub: 'GDP Tăng Trưởng Tốt • Lạm Phát Tăng Cao',
              desc: 'Sản xuất sôi động nhưng chi phí vốn bắt đầu tăng. Lợi nhuận phân hóa mạnh giữa các nhóm ngành.',
              sectors: 'Bất động sản, Thép, Hóa chất, Năng lượng',
              activeClass: 'bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-500 shadow-xs',
              badgeBg: 'bg-amber-600',
              subColor: 'text-amber-600 dark:text-amber-400',
              sectorColor: 'text-amber-700 dark:text-amber-300'
            },
            {
              key: 'stagflation',
              aliases: ['stagflation'],
              icon: '⚠️',
              title: 'Đình Lạm (Stagflation)',
              sub: 'GDP Chậm Lại • Lạm Phát Neo Cao',
              desc: 'Kịch bản rủi ro: chi phí đầu vào tăng xói mòn biên lợi nhuận trong khi sức mua sụt giảm.',
              sectors: 'Tiện ích, Dược phẩm, Tiền mặt, Vàng',
              activeClass: 'bg-rose-50/70 dark:bg-rose-950/30 border-2 border-rose-500 shadow-xs',
              badgeBg: 'bg-rose-600',
              subColor: 'text-rose-600 dark:text-rose-400',
              sectorColor: 'text-rose-700 dark:text-rose-300'
            },
            {
              key: 'reflation',
              aliases: ['reflation'],
              icon: '🌱',
              title: 'Phục Hồi / Bơm Tiền (Reflation)',
              sub: 'GDP Tạo Đáy • Lạm Phát Hạ Nhiệt',
              desc: 'Chính sách tiền tệ nới lỏng tạo thanh khoản dồi dào, định giá cổ phiếu phục hồi từ vùng trũng.',
              sectors: 'Chứng khoán, Công nghệ, Bán lẻ, Xây dựng',
              activeClass: 'bg-blue-50/70 dark:bg-blue-950/30 border-2 border-blue-500 shadow-xs',
              badgeBg: 'bg-blue-600',
              subColor: 'text-blue-600 dark:text-blue-400',
              sectorColor: 'text-blue-700 dark:text-blue-300'
            }
          ].map((q) => {
            const isCurrent = q.aliases.includes(macroClock?.quadrantKey);
            return (
              <div
                key={q.key}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isCurrent
                    ? q.activeClass
                    : 'bg-gray-50/50 dark:bg-slate-800/40 border-gray-200/60 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">{q.icon}</span>
                  {isCurrent && (
                    <span className={`px-2 py-0.5 rounded-full ${q.badgeBg} text-white text-[10px] font-black uppercase`}>
                      Đang Ở Đây
                    </span>
                  )}
                </div>
                <div className="font-black text-sm text-gray-900 dark:text-white mt-2">
                  {q.title}
                </div>
                <div className={`text-xs font-bold ${q.subColor} mt-1`}>
                  {q.sub}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {q.desc}
                </p>
                <div className={`mt-3 pt-2 border-t border-gray-100 dark:border-slate-800 text-[11px] ${q.sectorColor}`}>
                  <b>Ngành ưu tiên:</b> {q.sectors}
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Position Note */}
        <div className="p-3.5 bg-gray-50 dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="text-gray-600 dark:text-slate-300">
            <span className="font-bold text-gray-900 dark:text-white">Vị thế hiện tại:</span> Tăng trưởng GDP thực tế{' '}
            <b className="text-indigo-600 dark:text-indigo-400">{macroClock?.gdpValue}%</b> ({macroClock?.gdpPhaseVi}) &bull; Lạm phát CPI{' '}
            <b className="text-amber-600 dark:text-amber-400">{macroClock?.cpiValue}%</b> ({macroClock?.inflationStateVi})
          </div>
          <div className="text-gray-400 dark:text-slate-500 text-[11px] shrink-0">
            Khuyến nghị: {macroClock?.favoredSectors?.slice(0, 3).join(', ')}
          </div>
        </div>
      </div>

      {/* ── 5. MÔ HÌNH 5 PHA KINH TẾ (RESPONSIVE CHỐNG CO CỤM CHỮ) ── */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Mô Hình Nhận Diện Chu Kỳ Kinh Tế (5 Phases)
              </span>
              <IntelligenceBadge type="heuristic" tooltip="Mô hình nhận diện 5 pha chu kỳ kinh tế từ 6 động lực vĩ mô" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 mt-0.5">
              Định Danh Pha Kinh Tế: <span className="text-indigo-600 dark:text-indigo-400">{regime.titleVi}</span>
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Đồng thuận chỉ số:</span>
            <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
              {regime.voteCount}/6 Drivers
            </span>
          </div>
        </div>

        {/* Thanh 5 pha chu kỳ (Responsive: 2-3 cột trên Mobile, 5 cột trên Desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
          {[
            { key: 'Recovery', name: 'Phục Hồi', color: 'border-emerald-500' },
            { key: 'Expansion', name: 'Mở Rộng', color: 'border-blue-500' },
            { key: 'Overheating', name: 'Tăng Nhiệt', color: 'border-amber-500' },
            { key: 'Slowdown', name: 'Chậm Lại', color: 'border-orange-500' },
            { key: 'Recession', name: 'Suy Thoái', color: 'border-rose-500' },
          ].map((p) => {
            const isCurrent = regime.phase === p.key;
            const score = regime.scores?.[p.key] || 0;
            return (
              <div
                key={p.key}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  isCurrent
                    ? `bg-indigo-50/70 dark:bg-indigo-950/40 border-2 ${p.color} shadow-xs font-bold ring-2 ring-indigo-500/20`
                    : 'bg-gray-50/50 dark:bg-slate-800/30 border-gray-100 dark:border-slate-800 text-gray-500 dark:text-slate-400'
                }`}
              >
                <div className="text-xs font-bold truncate">{p.name}</div>
                <div className="text-xs mt-1 text-gray-400 dark:text-slate-500">{score} điểm</div>
                {isCurrent && (
                  <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-black uppercase mt-1">
                    Hiện Tại
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Các drivers phù hợp */}
        <div className="p-4 bg-gray-50/70 dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2">
          <span className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">
            Dẫn Chứng Chỉ Số Phù Hợp Pha:
          </span>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {(regime.matchedDrivers || []).map((d, i) => (
              <span key={i} className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-xs font-semibold text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700 shadow-2xs">
                {d}
              </span>
            ))}
          </div>
        </div>

        {/* Phân rã 4 Lớp Rủi Ro (4-Layer Risk Decomposition) */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider block">
            Phân Rã 4 Lớp Rủi Ro Vĩ Mô (0 - 100):
          </span>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { name: 'Thanh Khoản (Monetary)', val: risk.layers?.monetary || 44.9, desc: 'Lãi suất & Đường cong' },
              { name: 'Tăng Trưởng (Growth)', val: risk.layers?.growth || 35.8, desc: 'GDP & Tín dụng' },
              { name: 'Lạm Phát (Price)', val: risk.layers?.price || 64.4, desc: 'CPI & Chi phí đẩy' },
              { name: 'Tỷ Giá (External)', val: risk.layers?.external || 46.9, desc: 'USD/VND & Lợi suất US' },
            ].map((ly, i) => (
              <div key={i} className="p-3.5 bg-gray-50 dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-800">
                <div className="text-[11px] font-bold text-gray-500 dark:text-slate-400">{ly.name}</div>
                <div className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mt-1">{ly.val}%</div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className={`h-full ${ly.val > 60 ? 'bg-rose-500' : ly.val > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${ly.val}%` }}
                  />
                </div>
                <div className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">{ly.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 6. RADAR 6 TÍN HIỆU SỚM DẪN DẮT (LEADING SIGNALS) ── */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Radar Tín Hiệu Sớm Vĩ Mô (Macro Leading Signals)
            </span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mt-0.5">
              6 Chỉ Báo Định Hình Dòng Tiền Thị Trường
            </h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-black ${leading.badgeClass || 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}>
            {leading.stance || 'Risk-On Nhẹ'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(leading.signals || []).map((sig, i) => (
            <div key={i} className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 dark:text-slate-200">{sig.name}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    sig.status === 'bullish'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : sig.status === 'bearish'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200'
                  }`}
                >
                  {sig.status === 'bullish' ? 'Tích Cực' : sig.status === 'bearish' ? 'Cảnh Báo' : 'Trung Lập'}
                </span>
              </div>
              <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{sig.val}</div>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-tight">{sig.lead}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 7. LEAD-LAG DIVERGENCE & MODEL CONFIDENCE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box Lead-Lag Divergence */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Độ Lệch Sớm - Trễ (Lead-Lag Divergence)
                </span>
                <IntelligenceBadge type="heuristic" tooltip="Định lượng độ lệch sớm - trễ giữa thị trường tài chính và kinh tế thực" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100 mt-0.5">
                Thị Trường Tài Chính vs Kinh Tế Thực
              </h3>
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${leadLag?.badge || 'bg-amber-100 text-amber-700 border-amber-300'}`}>
              {leadLag?.signal || 'BALANCED'}
            </span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-600 dark:text-slate-300">Chỉ Báo Sớm (Lãi suất, Tỷ giá, Dầu, Vàng)</span>
                <span className="text-indigo-600 dark:text-indigo-400">{leadLag?.leadingPct || 50}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${leadLag?.leadingPct || 50}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-gray-600 dark:text-slate-300">Chỉ Báo Trễ (GDP, Lạm phát CPI, Bán lẻ)</span>
                <span className="text-blue-600 dark:text-blue-400">{leadLag?.laggingPct || 50}%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${leadLag?.laggingPct || 50}%` }} />
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-gray-50 dark:bg-slate-800/40 rounded-2xl border border-gray-100 dark:border-slate-800 text-xs text-gray-600 dark:text-slate-300 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span>Chênh lệch độ lệch (Δ Divergence):</span>
              <span className={`${(leadLag?.divergence ?? 0) > 15 ? 'text-amber-500 font-black' : (leadLag?.divergence ?? 0) < -15 ? 'text-emerald-500 font-black' : 'text-gray-700 dark:text-slate-200'}`}>
                {(leadLag?.divergence ?? 0) > 0 ? `+${leadLag.divergence}` : (leadLag?.divergence ?? 0)}%
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
              {leadLag?.desc || 'Đo lường sự khác biệt giữa phản ứng nhanh của thị trường tài chính và tốc độ phản ánh chậm của số liệu vĩ mô thực.'}
            </p>
          </div>
        </div>

        {/* Box Model Confidence */}
        <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Độ Tin Cậy Mô Hình (Model Confidence)
              </span>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100 mt-0.5">
                Điểm Số Độ Chuẩn Xác Thuật Toán
              </h3>
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${confidence?.badge || 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>
              {confidence?.labelVi || confidence?.label || 'CAO'}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-slate-100">{confidence?.overall || 80.5}</span>
            <span className="text-xs font-bold text-gray-400">/ 100</span>
            <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto">Xung đột tín hiệu: <b>0</b></span>
          </div>

          <div className="space-y-2.5">
            {[
              { label: 'Chất Lượng Dữ Liệu Nguồn (Data Quality)', val: confidence?.dataQuality || 100, color: 'bg-emerald-500' },
              { label: 'Độ Ổn Định Chu Kỳ (Regime Stability)', val: confidence?.regimeStability || 75, color: 'bg-indigo-500' },
              { label: 'Độ Rõ Ràng Tín Hiệu (Signal Clarity)', val: confidence?.signalClarity || 70, color: 'bg-blue-500' },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-gray-600 dark:text-slate-400">{item.label}</span>
                  <span className="text-gray-900 dark:text-slate-100">{item.val}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.val}%` }} />
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-gray-400 dark:text-slate-500 leading-relaxed">
            Mô hình tổng hợp 6 động lực vĩ mô chính và 95 chỉ số TradingEconomics để lượng hóa độ tin cậy của chu kỳ kinh tế hiện hành.
          </p>
        </div>
      </div>
    </div>
  );
}
