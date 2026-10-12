import React from 'react';

export default function ExtendedDupontCard({ extendedDupont }) {
  if (!extendedDupont) return null;

  const {
    roe = 0,
    taxBurden,
    interestBurden,
    operatingMargin,
    assetTurnover,
    financialLeverage,
    components = [],
    qualityAssessment = ''
  } = extendedDupont;

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Mô Hình Chuẩn Mực CFA Institute
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200">
              5 Nhân Tố Mở Rộng
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            Giải Phẫu DuPont 5 Nhân Tố: Động Lực Kéo ROE Thực Chất
          </h3>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            ROE = {roe != null ? `${roe}%` : '—'}
          </div>
          <div className="text-[11px] font-bold text-gray-400">
            Tỷ suất sinh lời trên vốn chủ sở hữu
          </div>
        </div>
      </div>

      {/* Phương Trình Trực Quan (Interactive Equation Banner) */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-purple-50/80 dark:from-indigo-950/40 dark:via-blue-950/20 dark:to-purple-950/40 border border-indigo-100/80 dark:border-indigo-800/40">
        <div className="text-[11px] font-bold uppercase text-indigo-600 dark:text-indigo-400 tracking-wider mb-2">
          Phương Trình Giải Phẫu Toán Học (The 5-Factor Formula):
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-black text-gray-800 dark:text-gray-200">
          <span className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border shadow-xs">
            ROE <span className="text-indigo-600 dark:text-indigo-400 font-black">({roe != null ? `${roe}%` : '—'})</span>
          </span>
          <span>=</span>
          <span className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 border">
            Tax Burden <span className="text-emerald-600 dark:text-emerald-400">({taxBurden != null ? `${taxBurden}x` : '—'})</span>
          </span>
          <span>×</span>
          <span className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 border">
            Interest Burden <span className="text-teal-600 dark:text-teal-400">({interestBurden != null ? `${interestBurden}x` : '—'})</span>
          </span>
          <span>×</span>
          <span className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 border">
            Operating Margin <span className="text-blue-600 dark:text-blue-400">({operatingMargin != null ? `${operatingMargin}%` : '—'})</span>
          </span>
          <span>×</span>
          <span className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 border">
            Asset Turnover <span className="text-purple-600 dark:text-purple-400">({assetTurnover != null ? `${assetTurnover}x` : '—'})</span>
          </span>
          <span>×</span>
          <span className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 border">
            Financial Leverage <span className="text-pink-600 dark:text-pink-400">({financialLeverage != null ? `${financialLeverage}x` : '—'})</span>
          </span>
        </div>
      </div>

      {/* Lưới 5 Thẻ Thành Phần */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {components.map((c) => (
          <div
            key={c.id}
            className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700/60 space-y-2.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {c.name.split('(')[0]}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    c.impact === 'Tích cực' || c.impact === 'Xuất sắc' || c.impact === 'An toàn'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
                      : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200'
                  }`}
                >
                  {c.impact}
                </span>
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                {c.value}
                <span className="text-xs font-bold text-gray-400 ml-1">{c.unit || 'x'}</span>
              </div>
              <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                {c.formula}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200/50 dark:border-gray-600/50 space-y-1">
              <div className="text-[10px] text-gray-400 flex justify-between">
                <span>Chuẩn mực:</span>
                <b className="text-gray-700 dark:text-gray-300">{c.benchmark}</b>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                {c.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Đánh Giá Chất Lượng Tổng Hợp */}
      {qualityAssessment && (
        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-1">
          <div className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <span>🧬</span>
            <span>Kết Luận Chất Lượng Động Lực ROE</span>
          </div>
          <p className="text-xs text-emerald-900/90 dark:text-emerald-200/90 leading-relaxed">
            {qualityAssessment}
          </p>
        </div>
      )}
    </div>
  );
}
