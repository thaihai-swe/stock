export default function MacroHeroStatusBar({
  regime = {},
  macroClock = {},
  leading = {},
  leadLag = {},
  risk = {},
  confidence = {},
  market = {},
  assetAlloc = {},
}) {
  const currentRiskScore = Number(risk.riskScore) || 44;
  const riskProgress = Math.min(100, Math.max(0, currentRiskScore));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {/* ── CARD 1: PHA CHU KỲ VĨ MÔ ── */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
        <div className="text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
          Pha Chu Kỳ Vĩ Mô
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-base sm:text-lg font-black text-gray-900 dark:text-slate-100 truncate">
            {regime.titleVi || 'Mở Rộng Tăng Trưởng'}
          </div>
          <span className={`px-2.5 py-0.5 rounded-xl text-[11px] font-black uppercase shrink-0 ${regime.badgeColor || 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}>
            {regime.phase || 'Expansion'}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {regime.description || 'Hoạt động kinh tế tăng trưởng vững chắc, tín dụng và sản xuất mở rộng.'}
        </p>
        {macroClock?.quadrant && (
          <div className="flex items-center justify-between pt-2 text-[11px] border-t border-gray-100 dark:border-slate-800">
            <span className="text-gray-400 dark:text-slate-500">Macro Clock:</span>
            <span className="font-extrabold text-indigo-600 dark:text-indigo-400 truncate ml-1">
              {macroClock.titleVi || macroClock.quadrant}
            </span>
          </div>
        )}
      </div>

      {/* ── CARD 2: KHẨU VỊ THỊ TRƯỜNG & LEAD-LAG ── */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
        <div className="text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
          Khẩu Vị Thị Trường
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 truncate">
            {leading.stance || 'Risk-On Nhẹ'}
          </div>
          {leadLag?.signal && (
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black shrink-0 ${
              leadLag.divergence > 15
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
            }`}>
              {leadLag.signal}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
          <span>Tích cực: <b className="text-emerald-600 dark:text-emerald-400">{leading.bullishCount || 3}</b></span>
          <span>•</span>
          <span>Cảnh báo: <b className="text-rose-600 dark:text-rose-400">{leading.bearishCount || 1}</b></span>
        </div>
        <div className="flex items-center justify-between pt-2 text-[11px] border-t border-gray-100 dark:border-slate-800">
          <span className="text-gray-400 dark:text-slate-500">Độ lệch Sớm-Trễ:</span>
          <span className={`font-black ${leadLag?.divergence > 15 ? 'text-amber-500' : 'text-emerald-500'}`}>
            {leadLag?.divergence > 0 ? `+${leadLag.divergence}` : (leadLag?.divergence ?? 0)}%
          </span>
        </div>
      </div>

      {/* ── CARD 3: ĐIỂM RỦI RO VĨ MÔ (RISK SCORE) ── */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
        <div className="text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
          Điểm Rủi Ro Vĩ Mô (Risk Score)
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-slate-100">
            {risk.riskScore || 44.4}
          </span>
          <span className="text-xs font-bold text-gray-400 dark:text-slate-500">/ 100</span>
          <span className={`text-xs font-black ml-auto ${risk.riskBucketColor || 'text-amber-500'}`}>
            [{risk.riskBucket || 'B2'}]
          </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              riskProgress <= 40 ? 'bg-emerald-500' : riskProgress <= 60 ? 'bg-amber-500' : 'bg-rose-500'
            }`}
            style={{ width: `${riskProgress}%` }}
          />
        </div>
        <div className="flex items-center justify-between pt-2 text-[11px] border-t border-gray-100 dark:border-slate-800">
          <span className="text-gray-400 dark:text-slate-500">Độ tin cậy:</span>
          <span className={`font-bold ${confidence?.label === 'HIGH' ? 'text-emerald-500' : confidence?.label === 'MEDIUM' ? 'text-amber-500' : 'text-rose-500'}`}>
            {confidence?.overall || 80}% ({confidence?.labelVi || confidence?.label || 'Cao'})
          </span>
        </div>
      </div>

      {/* ── CARD 4: NHIỆT KẾ ĐỊNH GIÁ VN-INDEX ── */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-2 transition-colors">
        <div className="text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
          Định Giá VN-Index (P/E)
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {market.currentPE || 13.15}x
          </span>
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500">
            Mean 5Y: {market.historicalMeanPE || 14.2}x
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold">
            {market.bandText || 'Rẻ (Vùng gom mua)'}
          </span>
          <span className="text-xs text-gray-400 dark:text-slate-500">
            Z: {market.zScore || -0.5}σ
          </span>
        </div>
        <div className="text-[11px] text-gray-400 dark:text-slate-500 truncate pt-2 border-t border-gray-100 dark:border-slate-800">
          Khuyến nghị: <b className="text-gray-700 dark:text-slate-300">{assetAlloc.stance || '80% CP / 20% Tiền'}</b>
        </div>
      </div>
    </div>
  );
}
