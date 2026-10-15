import React from 'react';

export default function MarketHeroStatusBar({
  market = {},
  styleIndices = [],
  valuationWindow = 'ten_year',
}) {
  const currentPoint = market.currentPoint || market.currentPrice || 0;
  const change = market.change || 0;
  const changePercent = market.changePercent || 0;
  const isGain = change >= 0;

  const activeWin = market.windows?.[valuationWindow] || market.windows?.ten_year || {};
  const peStats = activeWin.pe || {};
  const pbStats = activeWin.pb || {};
  const currentPE = Number(market.currentPE || peStats.current) || 0;
  const currentPB = Number(market.currentPB || pbStats.current) || 0;
  const medianPE = Number(peStats.median) || 14.5;
  const peZone = peStats.zone || market.bandText || 'Hợp lý';

  // Chỉ số Benjamin Graham P/E * P/B
  const grahamVal = (currentPE > 0 && currentPB > 0) ? +(currentPE * currentPB).toFixed(2) : null;
  const grahamSafe = grahamVal != null ? grahamVal <= 22.5 : null;
  const roeProxy = (currentPE > 0 && currentPB > 0) ? +((currentPB / currentPE) * 100).toFixed(1) : null;

  // Lấy dữ liệu phong cách vốn hóa
  const diamond = styleIndices.find(s => s.code === 'VNDIAMOND') || {};
  const vn30 = styleIndices.find(s => s.code === 'VN30') || {};
  const midcap = styleIndices.find(s => s.code === 'VNMIDCAP') || {};

  // Định dạng khối lượng
  const fmtVolume = (v) => {
    if (!v || v <= 0) return '—';
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} tỷ CP`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} triệu CP`;
    return `${new Intl.NumberFormat('vi-VN').format(v)} CP`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
      {/* ── CARD 1: ĐIỂM SỐ VN-INDEX & BIẾN ĐỘNG ── */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-2 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
            Chỉ Số VN-Index (HOSE)
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Thời gian thực" />
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-slate-100 tracking-tight">
            {currentPoint > 0 ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(currentPoint) : '—'}
          </div>
          <span className={`px-2 py-0.5 rounded-xl text-xs font-black shrink-0 ${
            isGain
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/50'
              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/50'
          }`}>
            {isGain ? '▲ +' : '▼ '}
            {change.toFixed(2)} ({isGain ? '+' : ''}{changePercent.toFixed(2)}%)
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 text-[11px] border-t border-gray-100 dark:border-slate-800 text-gray-500 dark:text-slate-400">
          <span>Khối lượng phiên:</span>
          <span className="font-bold text-gray-700 dark:text-slate-200">
            {fmtVolume(market.volume)}
          </span>
        </div>
      </div>

      {/* ── CARD 2: NHIỆT KẾ ĐỊNH GIÁ P/E 10 NĂM ── */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-2 transition-colors">
        <div className="text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
          Nhiệt Kế Định Giá P/E Chu Kỳ
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {currentPE > 0 ? `${currentPE}x` : '—'}
            </span>
            <span className="text-xs text-gray-400 dark:text-slate-500">
              (Median: {medianPE}x)
            </span>
          </div>
          <span className={`px-2 py-0.5 rounded-xl text-[11px] font-black shrink-0 ${
            currentPE <= 11.5
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/50'
              : currentPE <= 13.5
              ? 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200/50'
              : currentPE <= 16.5
              ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200/50'
              : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/50'
          }`}>
            {peZone}
          </span>
        </div>

        <div className="flex items-center justify-between pt-2 text-[11px] border-t border-gray-100 dark:border-slate-800 text-gray-500 dark:text-slate-400">
          <span>Độ lệch chuẩn (Z-Score):</span>
          <span className={`font-black ${Number(market.zScore || 0) < 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
            {market.zScore != null ? Number(market.zScore).toFixed(2) : '—'}
          </span>
        </div>
      </div>

      {/* ── CARD 3: THƯỚC ĐO BENJAMIN GRAHAM (PE * PB) ── */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-2 transition-colors">
        <div className="text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
          Thước Đo Benjamin Graham
        </div>

        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-slate-100">
              {grahamVal != null ? grahamVal : '—'}
            </span>
            <span className="text-xs text-gray-400 dark:text-slate-500">
              (Ngưỡng: ≤ 22.5)
            </span>
          </div>
          {grahamSafe != null && (
            <span className={`px-2 py-0.5 rounded-xl text-[11px] font-black shrink-0 ${
              grahamSafe
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/50'
                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/50'
            }`}>
              {grahamSafe ? 'Vùng An Toàn' : 'Đắt Đỏ'}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 text-[11px] border-t border-gray-100 dark:border-slate-800 text-gray-500 dark:text-slate-400">
          <span>P/B ({currentPB}x) · ROE ước tính:</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">
            {roeProxy != null ? `${roeProxy}%` : '—'}
          </span>
        </div>
      </div>

      {/* ── CARD 4: PHÂN KHÚC VỐN HÓA DẪN SÓNG ── */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xs space-y-2 transition-colors">
        <div className="text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
          Phong Cách Vốn Hóa Dẫn Sóng
        </div>

        <div className="flex items-center justify-between gap-1 pt-0.5">
          <div className="text-center flex-1 min-w-0">
            <span className="text-[10px] text-gray-400 block truncate">🏢 VN30</span>
            <span className="text-xs font-black text-gray-800 dark:text-slate-200">
              {vn30.pe ? `${vn30.pe}x` : '—'}
            </span>
          </div>
          <div className="w-px h-6 bg-gray-200 dark:bg-slate-800" />
          <div className="text-center flex-1 min-w-0">
            <span className="text-[10px] text-gray-400 block truncate">💎 Diamond</span>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
              {diamond.pe ? `${diamond.pe}x` : '—'}
            </span>
          </div>
          <div className="w-px h-6 bg-gray-200 dark:bg-slate-800" />
          <div className="text-center flex-1 min-w-0">
            <span className="text-[10px] text-gray-400 block truncate">🚀 Midcap</span>
            <span className="text-xs font-black text-amber-600 dark:text-amber-400">
              {midcap.pe ? `${midcap.pe}x` : '—'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 text-[11px] border-t border-gray-100 dark:border-slate-800 text-gray-500 dark:text-slate-400">
          <span>Định giá hấp dẫn nhất:</span>
          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 truncate ml-1">
            {diamond.pe && vn30.pe && diamond.pe < vn30.pe ? 'VN Diamond' : 'VN30 Blue-chips'}
          </span>
        </div>
      </div>
    </div>
  );
}
