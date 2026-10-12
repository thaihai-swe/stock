import React from 'react';

export default function StyleValuationComparison({ styleIndices = [], vnindexPE = null, vnindexPB = null }) {
  if (!styleIndices || styleIndices.length === 0) {
    return null;
  }

  // Benjamin Graham metric cho VN-Index
  const hasPe = vnindexPE != null && Number(vnindexPE) > 0;
  const hasPb = vnindexPB != null && Number(vnindexPB) > 0;
  const grahamIndex = (hasPe && hasPb) ? +(Number(vnindexPE) * Number(vnindexPB)).toFixed(2) : null;
  const grahamSafe = grahamIndex != null ? grahamIndex <= 22.5 : null;
  const roeProxy = (hasPe && hasPb) ? +((Number(vnindexPB) / Number(vnindexPE)) * 100).toFixed(2) : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs p-5 sm:p-7 space-y-6">
      {/* ── 1. HEADER & THƯỚC ĐO BENJAMIN GRAHAM ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-700/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Phân Khúc & Phong Cách Đầu Tư
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/50">
              💎 Diamond · Midcap · Large-Cap
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
            So Sánh Định Giá & Dòng Tiền 4 Phân Khúc Thị Trường
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Đối chiếu tương quan P/E, P/B, Beta và phong cách vận động của dòng vốn giữa rổ Kim Cương, Vốn hóa vừa và Blue-chips.
          </p>
        </div>

        {/* Khối Thước Đo Benjamin Graham ($PE \times PB \le 22.5$) & ROE Proxy */}
        <div className="flex flex-wrap items-center gap-3 bg-gray-50 dark:bg-gray-900/60 p-3 rounded-2xl border border-gray-200/60 dark:border-gray-700">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Chỉ Số Benjamin Graham
            </span>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-gray-900 dark:text-white">
                {grahamIndex != null ? grahamIndex : '—'}
              </span>
              {grahamSafe != null && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                  grahamSafe
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                }`}>
                  {grahamSafe ? '≤ 22.5 (Vùng An Toàn)' : '> 22.5 (Đắt Đỏ)'}
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-400">
              {hasPe && hasPb ? `P/E (${vnindexPE}x) × P/B (${vnindexPB}x)` : 'Chưa có đủ số liệu VN-Index'}
            </span>
          </div>

          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />

          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              ROE Proxy Thị Trường
            </span>
            <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
              {roeProxy != null ? `${roeProxy}%` : '—'}
            </div>
            <span className="text-[10px] text-gray-400">(P/B ÷ P/E) × 100%</span>
          </div>
        </div>
      </div>

      {/* ── 2. LƯỚI THẺ SO SÁNH 4 PHÂN KHÚC (RESPONSIVE CARDS) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {styleIndices.filter(s => ['VNINDEX', 'VN30', 'VNDIAMOND', 'VNMIDCAP'].includes(s.code)).map((idx) => (
          <div
            key={idx.code}
            className={`p-5 rounded-3xl border transition-all hover:shadow-md space-y-3.5 relative overflow-hidden ${
              idx.code === 'VNDIAMOND'
                ? 'bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 dark:from-indigo-950/40 dark:via-gray-800 dark:to-purple-950/20 border-indigo-200/80 dark:border-indigo-800 ring-1 ring-indigo-500/20'
                : idx.code === 'VNMIDCAP'
                ? 'bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/40 dark:from-teal-950/40 dark:via-gray-800 dark:to-emerald-950/20 border-teal-200/80 dark:border-teal-800'
                : 'bg-gray-50/70 dark:bg-gray-800/80 border-gray-200/60 dark:border-gray-700'
            }`}
          >
            {/* Top Badge & Code */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">{idx.icon}</span>
                <div>
                  <div className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                    {idx.code}
                    {idx.proxy !== idx.code && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-white/80 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50">
                        {idx.proxy}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 block">{idx.type}</span>
                </div>
              </div>

              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase border ${idx.peBandColor}`}>
                {idx.peBand}
              </span>
            </div>

            {/* Metrics Ticker */}
            <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-white/80 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-700/60">
              <div>
                <span className="text-[10px] font-bold text-gray-400 block uppercase">P/E</span>
                <span className="text-base font-black text-gray-900 dark:text-white">
                  {idx.pe}x
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 block uppercase">P/B</span>
                <span className="text-base font-black text-gray-900 dark:text-white">
                  {idx.pb}x
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 block uppercase">Beta</span>
                <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
                  {idx.beta}
                </span>
              </div>
            </div>

            {/* Flow Character & Strategy */}
            <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
              <p className="line-clamp-2 text-[11px] leading-relaxed">
                <b className="text-gray-900 dark:text-white">Đặc tính:</b> {idx.flowCharacter}
              </p>
              <p className="line-clamp-2 text-[11px] leading-relaxed text-indigo-700 dark:text-indigo-300 font-medium">
                <b className="text-gray-900 dark:text-white">Chiến lược:</b> {idx.strategy}
              </p>
            </div>

            {/* Weight Advice Footer */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-[11px]">
              <span className="text-gray-400">Tỷ trọng khuyến nghị:</span>
              <span className="font-bold text-gray-900 dark:text-white">{idx.weightAdvice}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
