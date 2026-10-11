export default function MacroYieldCurveStressBox({ yieldCurve = {}, macro = {} }) {
  const stressIndex = Number(yieldCurve.ycStressIndex) || 0;
  const lss = Number(yieldCurve.longShortSpread) || 0;
  const crossCountry = Number(yieldCurve.crossCountrySpread) || 0;

  return (
    <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Thị Trường Nợ & Cấu Trúc Lãi Suất (Yield Curve Analysis)
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 mt-0.5">
            Đường Cong Lợi Suất & Chỉ Số Căng Thẳng Nợ:{' '}
            <span className="text-indigo-600 dark:text-indigo-400">{yieldCurve.ycRegimeVi || yieldCurve.ycRegime || 'Bình Thường'}</span>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${yieldCurve.regimeBadge || 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800'}`}>
            {yieldCurve.ycRegime || 'Normal'}
          </span>
          <span className="text-xs text-gray-400 dark:text-slate-500">
            Stress: <b className="text-rose-500 font-black">{stressIndex}/100</b>
          </span>
        </div>
      </div>

      {/* Cảnh báo đảo ngược kỳ hạn (Inversion Alert) */}
      {yieldCurve.inversionWarning && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-start gap-3">
          <span className="text-xl shrink-0 mt-0.5">⚠️</span>
          <div className="space-y-1">
            <div className="uppercase tracking-wider">Cảnh Báo Đảo Ngược Kỳ Hạn (Long-Short Inversion: LSS &lt; 0)</div>
            <div className="text-[11px] font-normal leading-relaxed text-amber-800 dark:text-amber-300">
              Lợi suất TPCP 10Y ({yieldCurve.vn10y}%) hiện đang thấp hơn Lãi suất tái cấp vốn SBV ({yieldCurve.sbvRefinancingRate}%).
              Độ lệch dốc LSS = <b className="font-mono font-bold text-amber-900 dark:text-amber-100">{lss}%</b>.
              Đây là tín hiệu cảnh báo thanh khoản tiền đồng thắt chặt trong ngắn hạn hoặc kỳ vọng kinh tế hạ nhiệt.
            </div>
          </div>
        </div>
      )}

      {/* 4 Thẻ chỉ số nợ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* LSS */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase">Long-Short Spread (LSS)</div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl sm:text-2xl font-black ${lss < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
              {lss > 0 ? `+${lss}` : lss}%
            </span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-slate-400">
            VN 10Y ({yieldCurve.vn10y}%) – SBV ({yieldCurve.sbvRefinancingRate}%)
          </div>
          <div className={`text-[10px] font-bold ${lss < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {lss < 0 ? '⚠️ Đường cong đảo ngược' : '✓ Đường cong bình thường'}
          </div>
        </div>

        {/* Cross Country */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase">Chênh Lệch Quốc Tế (Cross-Country)</div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl sm:text-2xl font-black ${crossCountry < 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {crossCountry > 0 ? `+${crossCountry}` : crossCountry}%
            </span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-slate-400">
            VN 10Y ({yieldCurve.vn10y}%) – US 10Y ({yieldCurve.us10y}%)
          </div>
          <div className={`text-[10px] font-bold ${crossCountry < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {crossCountry < 0 ? '⚠️ Áp lực tỷ giá & rút ròng vốn' : '✓ Cân bằng dòng vốn ngoại'}
          </div>
        </div>

        {/* TPCP 10Y */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase">Lợi Suất TPCP VN 10Y</div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">{yieldCurve.vn10y}%</span>
          </div>
          <div className="text-[11px] text-gray-500 dark:text-slate-400">
            Chu kỳ lãi suất chuẩn thị trường
          </div>
          <div className="text-[10px] font-bold text-gray-400 dark:text-slate-500">
            LS Qua đêm: {macro.interbankOvernight}%
          </div>
        </div>

        {/* Debt Stress Index */}
        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 space-y-1">
          <div className="text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase">Chỉ Số Căng Thẳng Nợ (YC Stress)</div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl sm:text-2xl font-black ${stressIndex > 60 ? 'text-rose-500' : stressIndex > 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {stressIndex}
            </span>
            <span className="text-xs font-bold text-gray-400 dark:text-slate-500">/ 100</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full ${stressIndex > 60 ? 'bg-rose-500' : stressIndex > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, Math.max(0, stressIndex))}%` }}
            />
          </div>
          <div className="text-[10px] font-bold text-gray-400 dark:text-slate-500 mt-1">
            Mức độ: {stressIndex > 60 ? 'Căng thẳng cao' : stressIndex > 40 ? 'Trung bình' : 'Ổn định'}
          </div>
        </div>
      </div>

      {/* Nhận định chuyên sâu */}
      {yieldCurve.assessment && (
        <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/60 dark:border-indigo-800/30 text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
          <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1.5">Nhận định chuyên sâu:</span>
          {yieldCurve.assessment}
        </div>
      )}
    </div>
  );
}
