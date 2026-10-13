import React from 'react';
import IntelligenceBadge from '../common/IntelligenceBadge.jsx';

export default function IndustrySpecificCard({ industrySpecific, symbol }) {
  if (!industrySpecific || !industrySpecific.metrics) return null;

  const {
    categoryName = 'Phân Tích Ngành Nghề Đặc Thù',
    categoryIcon = '🏭',
    highlights = '',
    metrics = []
  } = industrySpecific;

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{categoryIcon}</span>
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Chỉ Số Tài Chính Đặc Thù Ngành Nghề
            </span>
            <IntelligenceBadge type="heuristic" tooltip="Chỉ tiêu tài chính đặc thù phân loại theo chuẩn ngành GICS" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {categoryName} ({symbol})
          </h3>
        </div>
        <div className="text-xs text-gray-400">
          Chỉ tiêu thiết kế chuyên biệt · Không dùng khuôn mẫu đại trà
        </div>
      </div>

      {highlights && (
        <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/80 dark:border-indigo-800/40 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed flex items-start gap-2.5">
          <span className="text-base">📌</span>
          <div>
            <b className="font-bold">Đặc thù phân tích:</b> {highlights}
          </div>
        </div>
      )}

      {/* Lưới Metrics Ngành */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div
            key={m.id}
            className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700/60 space-y-2 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                  {m.name}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    m.rating === 'Xuất sắc' || m.rating === 'An toàn' || m.rating === 'Dồi dào' || m.rating === 'Rất nhanh' || m.rating === 'Mở rộng công suất'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
                      : m.rating === 'Tốt' || m.rating === 'Đạt chuẩn' || m.rating === 'Chuẩn mực' || m.rating === 'Khá'
                      ? 'bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200'
                      : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200'
                  }`}
                >
                  {m.rating}
                </span>
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                {m.value}
                <span className="text-xs font-bold text-gray-400 ml-1">{m.unit || ''}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-200/50 dark:border-gray-600/50 space-y-1">
              <div className="text-[10px] text-gray-400 flex justify-between">
                <span>Ngưỡng tham chiếu:</span>
                <b className="text-gray-700 dark:text-gray-300">{m.benchmark}</b>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                {m.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
