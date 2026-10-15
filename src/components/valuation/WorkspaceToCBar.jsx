import React from 'react';

/**
 * WorkspaceToCBar - Thanh Mục Lục & Công Cụ Thao Tác Cho Workspace Hiện Tại
 * Cho phép nhảy nhanh tới từng thẻ (Anchor Navigation),
 * Mở/Thu gọn tất cả (Expand/Collapse All), và Chuyển chế độ 1 cột / 2 cột.
 */
export default function WorkspaceToCBar({
  items = [],
  onScrollToCard,
  activeCardId,
  isAllCollapsed = false,
  onToggleCollapseAll,
  viewMode = 'stacked',
  onChangeViewMode,
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs rounded-2xl p-2.5 sm:p-3 border border-gray-100 dark:border-slate-700/60 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
      {/* 1. Dải Anchor Pills nhảy nhanh tới card */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <span>🧭</span>
          <span className="hidden sm:inline">Mục Lục:</span>
        </span>
        {items.map((item) => {
          const isActive = activeCardId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onScrollToCard?.(item.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 border shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                  : 'bg-gray-50 hover:bg-gray-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-200/80 dark:border-slate-600/50'
              }`}
              title={`Nhảy tới: ${item.label}`}
            >
              <span className="text-xs">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Thao Tác: Mở/Thu Gọn Tất Cả & Bộ Chuyển Đổi Layout */}
      <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-slate-700/60">
        {/* Nút Thu gọn / Mở rộng tất cả */}
        {onToggleCollapseAll && (
          <button
            type="button"
            onClick={onToggleCollapseAll}
            className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-gray-50 hover:bg-gray-100 dark:bg-slate-700/40 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 border border-gray-200/70 dark:border-slate-600/40 transition cursor-pointer flex items-center gap-1"
            title={isAllCollapsed ? 'Mở rộng tất cả các thẻ trong không gian này' : 'Thu gọn tất cả các thẻ để xem nhanh tóm tắt'}
          >
            <span>{isAllCollapsed ? '📂' : '📁'}</span>
            <span>{isAllCollapsed ? 'Mở tất cả' : 'Thu gọn tất cả'}</span>
          </button>
        )}

        {/* Nút Chuyển Đổi Chế Độ 1 Cột / 2 Cột */}
        {onChangeViewMode && (
          <div className="hidden lg:flex items-center p-0.5 rounded-xl bg-gray-100 dark:bg-slate-700/50 border border-gray-200/60 dark:border-slate-600/50">
            <button
              type="button"
              onClick={() => onChangeViewMode('stacked')}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'stacked'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              title="Chế độ 1 cột danh sách dọc (Toàn diện, chuyên sâu)"
            >
              <span>☰</span>
              <span className="text-[11px]">1 Cột</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeViewMode('grid')}
              className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              title="Chế độ 2 cột song song (So sánh nhanh trên màn hình rộng)"
            >
              <span>☷</span>
              <span className="text-[11px]">2 Cột</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
