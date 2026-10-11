import React from 'react';

export default function ExecutiveSummaryCard({ executiveSummary = {} }) {
  const { keyRisks = [], catalysts = [], keyTakeaways = [] } = executiveSummary;

  if (!keyRisks.length && !catalysts.length && !keyTakeaways.length) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs p-5 sm:p-7 space-y-6">
      {/* ── 1. HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100 dark:border-gray-700/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Điều Hành Chiến Lược
            </span>
            <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200/50">
              Executive Briefing
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1 flex items-center gap-2">
            <span>📋</span> Báo Cáo Điều Hành: Rủi Ro, Động Lực & Điểm Nhấn Danh Mục
          </h3>
        </div>
      </div>

      {/* ── 2. KEY TAKEAWAYS HERO BOX (3 BULLETS CÓ ⭐ INSIGHT TỔNG HỢP) ── */}
      {keyTakeaways.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/5 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2.5">
          <div className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
            <span>🎯</span> 3 Điểm Nhấn Điều Hành Trọng Tâm (Key Takeaways)
          </div>
          <div className="space-y-2">
            {keyTakeaways.map((takeaway, idx) => {
              const isHighlight = takeaway.startsWith('⭐');
              return (
                <div
                  key={idx}
                  className={`text-xs sm:text-sm leading-relaxed p-2.5 rounded-xl ${
                    isHighlight
                      ? 'bg-white/80 dark:bg-gray-800/90 font-bold text-gray-900 dark:text-white shadow-2xs border border-indigo-200/50 dark:border-indigo-800/50'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {takeaway}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 3. LƯỚI 2 CỘT: RỦI RO TRỌNG YẾU VS ĐỘNG LỰC TĂNG TRƯỞNG ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Cột 1: Rủi Ro Trọng Yếu (Key Risks) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <span>⚠️</span> Rủi Ro Trọng Yếu ({keyRisks.length})
            </h4>
            <span className="text-[10px] text-gray-400">Xếp theo mức độ tác động</span>
          </div>

          <div className="space-y-2.5">
            {keyRisks.map((risk, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {risk.title}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border shrink-0 ${
                      risk.level === 'Rất cao'
                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                        : risk.level === 'Cao'
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                        : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                    }`}
                  >
                    {risk.level}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {risk.risk}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Cột 2: Động Lực Tăng Trưởng (Catalysts) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span>🚀</span> Động Lực Tăng Trưởng ({catalysts.length})
            </h4>
            <span className="text-[10px] text-gray-400">Cơ hội & Hậu thuẫn vĩ mô</span>
          </div>

          <div className="space-y-2.5">
            {catalysts.map((cat, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">
                    {cat.title}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border shrink-0 ${
                      cat.level === 'Cao'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                        : 'bg-teal-500/10 text-teal-600 border-teal-500/30'
                    }`}
                  >
                    {cat.level}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {cat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
