import React, { useState } from 'react';

export default function NewsSentimentCard({ newsDigest, symbol }) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  if (!newsDigest) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 text-center text-gray-500">
        Chưa có dữ liệu bản tin thời sự 30 ngày cho {symbol}
      </div>
    );
  }

  const { items = [], sentiment = {}, tldr = {} } = newsDigest;
  const { score = 0, verdictText, verdictBadge, bullishCount, neutralCount, bearishCount, totalCount, categoryScores = {} } = sentiment;
  const { summary: tldrSummary, metricBoxes = [] } = tldr;

  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter(it => it.category === selectedCategory);

  const categories = [
    { id: 'all', label: 'Tất Cả' },
    { id: 'biz', label: 'Kinh Doanh' },
    { id: 'sector', label: 'Ngành & Dự Án' },
    { id: 'macro', label: 'Vĩ Mô' },
    { id: 'disclosure', label: 'Công Bố TT' },
    { id: 'analyst', label: 'Phân Tích CTCK' }
  ];

  return (
    <div className="space-y-6">
      {/* ── HEADER & EXECUTIVE TL;DR ── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📰</span>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                Bản Tin Thời Sự & Bộ Đo Lường Tâm Lý 30 Ngày (News Digest & Sentiment)
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Phân loại 5 nhóm tin tức, đo lường điểm số tâm lý (-100 đến +100) theo chuẩn <code className="font-mono text-indigo-600 dark:text-indigo-400">ref-equity-research-vn</code>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-xs px-3 py-1.5 rounded-xl font-black ${verdictBadge}`}>
              {verdictText}
            </span>
          </div>
        </div>

        {/* 4 Metric Boxes */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {metricBoxes.map((box, idx) => (
            <div key={idx} className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-700/40 text-center space-y-0.5">
              <div className="text-[11px] text-gray-500 dark:text-gray-400">{box.label}</div>
              <div className={`text-base font-black ${box.type === 'positive'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : box.type === 'negative'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-gray-900 dark:text-white'
                }`}>
                {box.value}
              </div>
            </div>
          ))}
        </div>

        {/* Tóm tắt TL;DR */}
        <div className="mt-4 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          <div className="font-bold text-indigo-900 dark:text-indigo-200 mb-1 flex items-center gap-1.5">
            <span>⚡</span>
            <span>Executive Summary (TL;DR 30 Ngày):</span>
          </div>
          <p>{tldrSummary}</p>
        </div>
      </div>

      {/* ── SENTIMENT METER & CATEGORY BREAKDOWN ── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-base">🌡️</span>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              Nhiệt Kế Tâm Lý Tin Tức & Phân Rã 5 Nhóm Chức Năng
            </h4>
          </div>
          <span className="text-xs font-black font-mono">
            Điểm Số: <span className={score >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{score > 0 ? `+${score}` : score} / 100</span>
          </span>
        </div>

        {/* Thanh thước đo Sentiment */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-gray-400 font-bold">
            <span>Cực Tiêu Cực (-100)</span>
            <span>Trung Lập (0)</span>
            <span>Cực Tích Cực (+100)</span>
          </div>
          <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
            <div
              className={`h-full transition-all rounded-full ${score >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
              style={{
                width: `${Math.min(100, Math.abs(score))}%`,
                marginLeft: score < 0 ? `${Math.max(0, 50 + score / 2)}%` : '50%'
              }}
            />
            {/* Vạch giữa 0 */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gray-400 dark:bg-gray-500" />
          </div>
        </div>

        {/* Phân rã theo Category */}
        <div className="pt-2">
          <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Điểm tâm lý theo từng nhóm chức năng:</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            {Object.entries({
              biz: 'Kinh Doanh',
              sector: 'Ngành & Dự Án',
              macro: 'Vĩ Mô',
              disclosure: 'Công Bố TT',
              analyst: 'CTCK'
            }).map(([catKey, label]) => {
              const catScore = categoryScores[catKey];
              return (
                <div key={catKey} className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/40 text-center">
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{label}</div>
                  <div className={`text-sm font-bold font-mono mt-0.5 ${catScore != null
                      ? catScore > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : catScore < 0
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-400'
                    }`}>
                    {catScore != null ? (catScore > 0 ? `+${catScore}` : catScore) : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── NEWS FEED TƯƠNG TÁC CÓ BỘ LỌC ── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              Dòng Sự Kiện & Tin Tức Chi Tiết ({filteredItems.length} tin)
            </h4>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${selectedCategory === c.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* List of News Cards */}
        <div className="space-y-3">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700/60 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                    {item.categoryLabel}
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded-md ${item.sentiment === 'bullish'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : item.sentiment === 'bearish'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                      : 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                    }`}>
                    {item.sentiment === 'bullish' ? '▲ Tích cực' : item.sentiment === 'bearish' ? '▼ Tiêu cực' : '◆ Trung lập'}
                  </span>
                  <span className="text-gray-400">Tác động: <strong>{item.impact}</strong></span>
                </div>
                <div className="text-gray-400 font-mono">
                  {item.date} · {item.source}
                </div>
              </div>

              <h5 className="text-xs font-bold text-gray-900 dark:text-white leading-snug">
                {item.title}
              </h5>

              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                {item.summary}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
