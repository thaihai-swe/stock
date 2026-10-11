import { useMemo } from 'react';

const VALUATION_WINDOWS = [
  { id: 'five_year', label: '5 Năm', shortLabel: '5N', desc: 'Chu kỳ kinh tế & tiền tệ gần nhất' },
  { id: 'ten_year', label: '10 Năm', shortLabel: '10N', desc: 'Cửa sổ chuẩn mực vĩ mô dài hạn (Khuyến nghị)' },
  { id: 'modern', label: 'Từ 2007', shortLabel: '2007', desc: 'Thời kỳ hội nhập WTO' },
  { id: 'all_time', label: 'Toàn Bộ (25 Năm)', shortLabel: '25N', desc: 'Toàn cảnh từ ngày lập sàn HOSE' },
];

// Helper ánh xạ màu badge định vị P/E thích ứng Light & Dark
function getAdaptiveBandBadge(band) {
  switch (band) {
    case 'Rất rẻ':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60';
    case 'Rẻ':
      return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60';
    case 'Trung bình':
    case 'Hợp lý':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60';
    case 'Mắc':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60';
    case 'Rất mắc':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60';
    default:
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60';
  }
}

// Helper ánh xạ màu badge tín hiệu tổng hợp thích ứng Light & Dark
function getAdaptiveSignalBadge(signal) {
  if (!signal) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60';
  }
  const s = String(signal).toUpperCase();
  if (s.includes('MUA') || s.includes('BUY')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60';
  }
  if (s.includes('QUAN SÁT') || s.includes('NẮM GIỮ') || s.includes('HOLD')) {
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60';
  }
  if (s.includes('CHỐT LỜI')) {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60';
  }
  return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60';
}

export default function MacroValuationWindowCard({
  market = {},
  valuationWindow = 'ten_year',
  onValuationWindowChange,
  assetAlloc = {},
}) {
  const activeWin = market.windows?.[valuationWindow] || market.windows?.ten_year || null;
  const peStats = activeWin?.pe || null;
  const pbStats = activeWin?.pb || null;
  const peXpbStats = activeWin?.peXpb || null;
  const roeStats = activeWin?.roeProxy || null;
  const compSignal = activeWin?.compositeSignal || null;
  const derivedMetrics = market.derivedMetrics || {};
  const pePos = peStats?.percentile != null ? Math.min(96, Math.max(4, peStats.percentile)) : 35;

  return (
    <div className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-3xl p-5 sm:p-7 lg:p-8 shadow-sm border border-gray-100 dark:border-slate-800 space-y-6 transition-colors">
      {/* 1. CẢNH BÁO ĐỘ LỆCH CHUẨN CỰC ĐOAN (|z| > 2) */}
      {market.extremeAlert && market.extremeAlertText && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs sm:text-sm font-bold animate-pulse">
          <span className="text-xl shrink-0">🚨</span>
          <span className="leading-relaxed">{market.extremeAlertText}</span>
        </div>
      )}

      {/* 2. HEADER: TÊN CHỈ SỐ, BAND NHÃN & COMPOSITE SIGNAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Nhiệt Kế Định Giá VN-Index (Vietstock 2000–Hiện Tại)
            </span>
            {derivedMetrics.dataDate && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200/60 dark:border-slate-700">
                Chốt tháng: {derivedMetrics.dataDate}
              </span>
            )}
          </div>
          <h3 className="text-xl sm:text-2xl font-black mt-1 flex flex-wrap items-center gap-2 sm:gap-3 text-gray-900 dark:text-white">
            {market.name || 'Chỉ Số VN-Index'}
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getAdaptiveBandBadge(peStats?.band || market.bandText)}`}>
              P/E {activeWin?.label || '10N'}: {peStats?.band || market.bandText || 'Rất rẻ'}
            </span>
          </h3>
        </div>

        {/* Tín hiệu định giá tổng hợp (Composite Valuation Signal) */}
        <div className="flex flex-col sm:items-end gap-1 bg-gray-50/80 dark:bg-slate-800/60 p-3 rounded-2xl border border-gray-100 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
            Tín Hiệu Định Giá Tổng Hợp
          </span>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase border ${getAdaptiveSignalBadge(compSignal?.signal)}`}>
              {compSignal?.signal || 'MUA TÍCH LŨY'}
            </span>
            <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
              {compSignal?.score ?? 50}<span className="text-xs text-gray-400 dark:text-slate-500 font-normal">/100</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3. THANH CHUYỂN ĐỔI 4 CỬA SỔ CHU KỲ THỐNG KÊ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-slate-800/80 rounded-2xl border border-gray-200/60 dark:border-slate-700/60 shrink-0 overflow-x-auto">
          {VALUATION_WINDOWS.map((win) => {
            const isSelected = valuationWindow === win.id;
            return (
              <button
                key={win.id}
                type="button"
                onClick={() => onValuationWindowChange && onValuationWindowChange(win.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700/60'
                }`}
                title={win.desc}
              >
                <span className="hidden sm:inline">{win.label}</span>
                <span className="sm:hidden">{win.shortLabel}</span>
              </button>
            );
          })}
        </div>
        <div className="text-xs text-gray-600 dark:text-slate-400 flex items-center gap-2 flex-wrap">
          <span>Chu kỳ: <b className="text-indigo-600 dark:text-indigo-400">{activeWin?.label || '10 Năm'}</b></span>
          <span>•</span>
          <span>{activeWin?.dateFrom} → {activeWin?.dateTo}</span>
          <span className="text-gray-400 dark:text-slate-500">({activeWin?.nObs || 0} kỳ tháng)</span>
        </div>
      </div>

      {/* 4. GRID 4 CHỈ SỐ THỐNG KÊ SÂU (P/E, P/B, GRAHAM, ROE PROXY) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Cột 1: P/E */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gray-50/70 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 space-y-1 transition-colors">
          <div className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 flex items-center justify-between">
            <span>P/E Thị Trường</span>
            <span className={`text-[10px] font-bold ${peStats?.vsMedianPct <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {peStats?.vsMedianPct > 0 ? `+${peStats?.vsMedianPct}` : peStats?.vsMedianPct}%
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{market.currentPE}x</div>
          <div className="text-[10px] sm:text-[11px] text-gray-600 dark:text-slate-300 space-y-0.5 pt-1 border-t border-gray-200/60 dark:border-slate-700/60">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Trung bình:</span>
              <b className="text-gray-900 dark:text-white">{peStats?.mean}x</b>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Trung vị:</span>
              <b className="text-gray-900 dark:text-white">{peStats?.median}x</b>
            </div>
            <div className="flex justify-between truncate">
              <span className="text-gray-500 dark:text-slate-400">Z / Phân vị:</span>
              <b className="text-indigo-600 dark:text-indigo-400">{peStats?.zscore > 0 ? `+${peStats?.zscore}` : peStats?.zscore}σ · {peStats?.percentile}%</b>
            </div>
          </div>
        </div>

        {/* Cột 2: P/B */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gray-50/70 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 space-y-1 transition-colors">
          <div className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 flex items-center justify-between">
            <span>P/B Thị Trường</span>
            <span className={`text-[10px] font-bold ${pbStats?.vsMedianPct <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {pbStats?.vsMedianPct > 0 ? `+${pbStats?.vsMedianPct}` : pbStats?.vsMedianPct}%
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{market.currentPB}x</div>
          <div className="text-[10px] sm:text-[11px] text-gray-600 dark:text-slate-300 space-y-0.5 pt-1 border-t border-gray-200/60 dark:border-slate-700/60">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Trung bình:</span>
              <b className="text-gray-900 dark:text-white">{pbStats?.mean}x</b>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Trung vị:</span>
              <b className="text-gray-900 dark:text-white">{pbStats?.median}x</b>
            </div>
            <div className="flex justify-between truncate">
              <span className="text-gray-500 dark:text-slate-400">Z / Phân vị:</span>
              <b className="text-indigo-600 dark:text-indigo-400">{pbStats?.zscore > 0 ? `+${pbStats?.zscore}` : pbStats?.zscore}σ · {pbStats?.percentile}%</b>
            </div>
          </div>
        </div>

        {/* Cột 3: Tích số P/E * P/B (Graham Test) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gray-50/70 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 space-y-1 transition-colors">
          <div className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 flex items-center justify-between">
            <span>P/E × P/B (Graham)</span>
            <span className={`text-[10px] font-bold ${(derivedMetrics.peXpb || 0) <= 22.5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {(derivedMetrics.peXpb || 0) <= 22.5 ? '≤ 22.5' : '> 22.5'}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">{derivedMetrics.peXpb || peXpbStats?.current || '-'}x</div>
          <div className="text-[10px] sm:text-[11px] text-gray-600 dark:text-slate-300 space-y-0.5 pt-1 border-t border-gray-200/60 dark:border-slate-700/60">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Ngưỡng Graham:</span>
              <b className="text-gray-900 dark:text-white">&lt; 22.5x</b>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">TB chu kỳ:</span>
              <b className="text-gray-900 dark:text-white">{peXpbStats?.mean}x</b>
            </div>
            <div className="flex justify-between truncate">
              <span className="text-gray-500 dark:text-slate-400">Z / Phân vị:</span>
              <b className="text-indigo-600 dark:text-indigo-400">{peXpbStats?.zscore > 0 ? `+${peXpbStats?.zscore}` : peXpbStats?.zscore}σ · {peXpbStats?.percentile}%</b>
            </div>
          </div>
        </div>

        {/* Cột 4: ROE Proxy */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gray-50/70 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 space-y-1 transition-colors">
          <div className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 flex items-center justify-between">
            <span>ROE Proxy (P/B÷P/E)</span>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Tỷ suất sinh lời</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-cyan-600 dark:text-cyan-400">{derivedMetrics.roeProxy || roeStats?.current || '-'}%</div>
          <div className="text-[10px] sm:text-[11px] text-gray-600 dark:text-slate-300 space-y-0.5 pt-1 border-t border-gray-200/60 dark:border-slate-700/60">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">TB chu kỳ:</span>
              <b className="text-gray-900 dark:text-white">{roeStats?.mean}%</b>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-slate-400">Trung vị:</span>
              <b className="text-gray-900 dark:text-white">{roeStats?.median}%</b>
            </div>
            <div className="flex justify-between truncate">
              <span className="text-gray-500 dark:text-slate-400">Z / Phân vị:</span>
              <b className="text-indigo-600 dark:text-indigo-400">{roeStats?.zscore > 0 ? `+${roeStats?.zscore}` : roeStats?.zscore}σ · {roeStats?.percentile}%</b>
            </div>
          </div>
        </div>
      </div>

      {/* 5. THANH ĐO DẢI P/E BANDS ĐỘNG (RESPONSIVE CHỐNG ĐÈ CHỮ) */}
      <div className="space-y-2 pt-2">
        {/* Nhãn trên Desktop */}
        <div className="hidden sm:flex items-center justify-between text-xs text-gray-600 dark:text-slate-300 font-medium">
          <span>Rất rẻ (&le; {peStats?.p10}x)</span>
          <span>Rẻ ({peStats?.p10}–{peStats?.p25}x)</span>
          <span>Trung vị ({peStats?.median}x)</span>
          <span>Mắc ({peStats?.p75}–{peStats?.p90}x)</span>
          <span>Rất mắc (&gt; {peStats?.p90}x)</span>
        </div>
        {/* Nhãn trên Mobile: 3 mốc gọn gàng */}
        <div className="flex sm:hidden items-center justify-between text-[11px] text-gray-600 dark:text-slate-300 font-bold">
          <span className="text-emerald-600 dark:text-emerald-400">Đáy P10: {peStats?.p10}x</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-black">Hiện tại: {market.currentPE}x</span>
          <span className="text-rose-600 dark:text-rose-400">Đỉnh P90: {peStats?.p90}x</span>
        </div>

        {/* Thanh trượt gradient */}
        <div className="w-full h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5 flex gap-1 border border-gray-200 dark:border-white/10 relative">
          <div className="flex-1 bg-emerald-500 rounded-l-full" title={`Rất rẻ: <= ${peStats?.p10}x`} />
          <div className="flex-1 bg-teal-500" title={`Rẻ: ${peStats?.p10}x - ${peStats?.p25}x`} />
          <div className="flex-2 bg-blue-500" title={`Hợp lý: ${peStats?.p25}x - ${peStats?.p75}x`} />
          <div className="flex-1 bg-amber-500" title={`Mắc: ${peStats?.p75}x - ${peStats?.p90}x`} />
          <div className="flex-1 bg-rose-500 rounded-r-full" title={`Rất mắc: > ${peStats?.p90}x`} />

          {/* Kim chỉ thị động theo percentile thực tế */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full border-2 border-indigo-600 dark:border-indigo-400 shadow-md animate-pulse z-10"
            style={{ left: `${pePos}%` }}
            title={`P/E hiện tại ${market.currentPE}x (Phân vị ${peStats?.percentile}%)`}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-gray-500 dark:text-slate-400">
          <span>P10: {peStats?.p10}x</span>
          <span className="hidden sm:inline">P25: {peStats?.p25}x</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">Phân vị chu kỳ: {peStats?.percentile}%</span>
          <span className="hidden sm:inline">P75: {peStats?.p75}x</span>
          <span>P90: {peStats?.p90}x</span>
        </div>
      </div>

      {/* 6. KHUYẾN NGHỊ PHÂN BỔ VỐN & TÍN HIỆU VĨ MÔ */}
      <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors">
        <div>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            Khuyến Nghị Vị Thế Vốn: {assetAlloc.stance}
          </span>
          <p className="text-xs text-gray-600 dark:text-slate-300 mt-1 leading-relaxed">
            {compSignal?.description || assetAlloc.rationale}
          </p>
        </div>
        <div className="flex items-center gap-2 text-base sm:text-lg font-black shrink-0">
          <span className="text-emerald-600 dark:text-emerald-400">{assetAlloc.recommendedEquityPct}% Cổ phiếu</span>
          <span className="text-gray-400 dark:text-slate-500">/</span>
          <span className="text-indigo-600 dark:text-indigo-400">{assetAlloc.recommendedCashPct}% Tiền</span>
        </div>
      </div>
    </div>
  );
}

