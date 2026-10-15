import React, { useState, useMemo } from 'react';

export default function MacroTradingEconomicsTable({ indicatorsData = {} }) {
  const [indicatorCategory, setIndicatorCategory] = useState('overview');
  const [indicatorSearch, setIndicatorSearch] = useState('');

  const categories = indicatorsData?.categories || {};
  const currentCategoryObj = categories[indicatorCategory];

  // Helper tính toán xu hướng tăng/giảm so với kỳ trước
  const getTrend = (current, prev) => {
    if (current == null || prev == null) return null;
    const numCurrent = typeof current === 'number' ? current : parseFloat(String(current).replace(/,/g, ''));
    const numPrev = typeof prev === 'number' ? prev : parseFloat(String(prev).replace(/,/g, ''));
    if (isNaN(numCurrent) || isNaN(numPrev)) return null;
    const diff = numCurrent - numPrev;
    if (Math.abs(diff) < 0.0001) return { direction: 'flat', symbol: '—', text: '0.00', color: 'text-gray-400' };
    if (diff > 0) return { direction: 'up', symbol: '▲', text: `+${diff.toFixed(2)}`, color: 'text-emerald-500 dark:text-emerald-400' };
    return { direction: 'down', symbol: '▼', text: diff.toFixed(2), color: 'text-rose-500 dark:text-rose-400' };
  };

  // Lọc chỉ số theo tìm kiếm hoặc danh mục
  const filteredIndicators = useMemo(() => {
    if (!categories || Object.keys(categories).length === 0) return [];

    if (!indicatorSearch.trim()) {
      return currentCategoryObj?.items || [];
    }

    const q = indicatorSearch.toLowerCase().trim();
    const allFound = [];

    Object.values(categories).forEach((cat) => {
      (cat.items || []).forEach((it) => {
        if (
          it.name.toLowerCase().includes(q) ||
          (it.unit && it.unit.toLowerCase().includes(q)) ||
          (cat.title && cat.title.toLowerCase().includes(q))
        ) {
          if (!allFound.some((existing) => existing.name === it.name)) {
            allFound.push({ ...it, categoryTitle: cat.title });
          }
        }
      });
    });

    return allFound;
  }, [categories, currentCategoryObj, indicatorSearch]);

  // Xuất file CSV
  const handleExportCsv = () => {
    if (!filteredIndicators || filteredIndicators.length === 0) return;
    const headers = ['Danh Mục', 'Tên Chỉ Số', 'Giá Trị Mới Nhất', 'Kỳ Trước', 'Đỉnh Lịch Sử', 'Đáy Lịch Sử', 'Đơn Vị', 'Kỳ Báo Cáo'];
    const rows = filteredIndicators.map((it) => [
      `"${(it.categoryTitle || currentCategoryObj?.title || '').replace(/"/g, '""')}"`,
      `"${(it.name || '').replace(/"/g, '""')}"`,
      `"${(it.rawLast || it.value || '').toString().replace(/"/g, '""')}"`,
      `"${(it.rawPrevious || it.previous || '').toString().replace(/"/g, '""')}"`,
      `"${(it.highest ?? '').toString().replace(/"/g, '""')}"`,
      `"${(it.lowest ?? '').toString().replace(/"/g, '""')}"`,
      `"${(it.unit || '').replace(/"/g, '""')}"`,
      `"${(it.period || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const categoryName = indicatorCategory || 'macro';
    link.setAttribute('download', `vietnam_macro_indicators_${categoryName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 border border-gray-100 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
      {/* ── 1. HEADER & SEARCH BAR & EXPORT ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Cơ Sở Dữ Liệu Kinh Tế Vĩ Mô Toàn Diện
          </span>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 mt-0.5">
            95 Chỉ Số Kinh Tế Việt Nam — TradingEconomics
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Ô tìm kiếm chỉ số */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={indicatorSearch}
              onChange={(e) => setIndicatorSearch(e.target.value)}
              placeholder="Tìm chỉ số (CPI, GDP, PMI, M2, Lãi suất...)..."
              className="w-full pl-4 pr-9 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {indicatorSearch && (
              <button
                type="button"
                onClick={() => setIndicatorSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Nút Xuất CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredIndicators.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
            title="Tải về danh sách chỉ số vĩ mô dưới định dạng CSV"
          >
            <span>📥</span>
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* ── 2. BỘ CHỌN DANH MỤC TRÊN MOBILE (NATIVE SELECT) ── */}
      <div className="md:hidden space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 dark:text-slate-500 px-1">
          <span>NHÓM CHỈ SỐ ({Object.keys(categories).length})</span>
          <span>{filteredIndicators.length} kết quả</span>
        </div>
        <select
          value={indicatorCategory}
          onChange={(e) => {
            setIndicatorCategory(e.target.value);
            setIndicatorSearch('');
          }}
          className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          {Object.entries(categories).map(([key, cat]) => (
            <option key={key} value={key}>
              {cat.title} ({cat.count} chỉ số)
            </option>
          ))}
        </select>
      </div>

      {/* ── 3. HÀNG TAB 10 DANH MỤC TRÊN DESKTOP (PILLS FLEX WRAP) ── */}
      <div className="hidden md:flex flex-wrap items-center gap-1.5 pb-1">
        {Object.entries(categories).map(([key, cat]) => {
          const isSelected = indicatorCategory === key && !indicatorSearch;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setIndicatorCategory(key);
                setIndicatorSearch('');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat.title} ({cat.count})
            </button>
          );
        })}
      </div>

      {/* ── 4. CHẾ ĐỘ THẺ TRÊN MOBILE (<768px) ── */}
      <div className="block md:hidden space-y-2.5">
        {filteredIndicators.map((it, idx) => {
          const trend = getTrend(it.rawLast || it.value, it.rawPrevious || it.previous);
          return (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-xs text-gray-900 dark:text-slate-100">
                    {it.name}
                  </div>
                  {it.categoryTitle && (
                    <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400">
                      {it.categoryTitle}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-200/80 dark:bg-slate-700 text-gray-700 dark:text-slate-300 shrink-0">
                  {it.unit || '---'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200/40 dark:border-slate-700/50 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 block">Mới nhất:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm text-indigo-600 dark:text-indigo-400">
                      {it.rawLast || it.value || '—'}
                    </span>
                    {trend && (
                      <span className={`text-[10px] font-black ${trend.color}`}>
                        {trend.symbol}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 block">Kỳ trước:</span>
                  <span className="font-semibold text-gray-600 dark:text-slate-300">
                    {it.rawPrevious || it.previous || '—'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-slate-500 pt-1">
                <span>Đỉnh: <b className="text-emerald-600">{it.highest ?? '—'}</b> · Đáy: <b className="text-rose-500">{it.lowest ?? '—'}</b></span>
                <span>{it.period || '—'}</span>
              </div>
            </div>
          );
        })}

        {filteredIndicators.length === 0 && (
          <div className="py-8 text-center text-gray-400 text-xs">
            Không tìm thấy chỉ số phù hợp với từ khóa "{indicatorSearch}".
          </div>
        )}
      </div>

      {/* ── 5. BẢNG DỮ LIỆU TRÊN DESKTOP (≥768px) ── */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 dark:border-slate-800">
        <table className="w-full text-xs text-left">
          <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-slate-400 uppercase tracking-wider font-extrabold border-b border-gray-100 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3 sticky left-0 bg-gray-50 dark:bg-slate-800 z-10">Tên Chỉ Số</th>
              <th className="px-4 py-3 text-right">Giá Trị Mới Nhất</th>
              <th className="px-4 py-3 text-center">Xu Hướng</th>
              <th className="px-4 py-3 text-right">Kỳ Trước</th>
              <th className="px-4 py-3 text-right">Đỉnh Lịch Sử</th>
              <th className="px-4 py-3 text-right">Đáy Lịch Sử</th>
              <th className="px-4 py-3 text-center">Đơn Vị</th>
              <th className="px-4 py-3 text-right">Kỳ Báo Cáo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {filteredIndicators.map((it, idx) => {
              const trend = getTrend(it.rawLast || it.value, it.rawPrevious || it.previous);
              return (
                <tr key={idx} className="hover:bg-indigo-50/30 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-slate-100 sticky left-0 bg-white dark:bg-slate-900 z-10">
                    <div>{it.name}</div>
                    {it.categoryTitle && (
                      <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400">
                        {it.categoryTitle}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-indigo-600 dark:text-indigo-400">
                    {it.rawLast || it.value}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {trend ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                        trend.direction === 'up'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                          : trend.direction === 'down'
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                      }`}>
                        <span>{trend.symbol}</span>
                        <span>{trend.text}</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 dark:text-slate-400">
                    {it.rawPrevious || it.previous || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                    {it.highest ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-rose-500 dark:text-rose-400 font-semibold">
                    {it.lowest ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400 dark:text-slate-500">
                    {it.unit || '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400 dark:text-slate-500">
                    {it.period || '—'}
                  </td>
                </tr>
              );
            })}
            {filteredIndicators.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  Không tìm thấy chỉ số phù hợp với từ khóa "{indicatorSearch}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
