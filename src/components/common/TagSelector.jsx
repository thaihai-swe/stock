import React, { useState } from 'react';

/**
 * TagSelector - Unified Strategy / Reason Tag Selector Component
 *
 * Chuẩn hóa bộ chọn thẻ chiến lược (Mua) & lý do (Bán):
 * - Hỗ trợ danh sách thẻ gợi ý có sẵn (tags)
 * - Tự do nhập thẻ mới tùy chỉnh (customTag) với phím Enter hoặc nút bấm
 * - Tùy biến chủ đề màu sắc: 'emerald' (Mua), 'rose' (Bán), 'indigo', 'amber'
 * - Nút hủy chọn nhanh (Clear)
 */
export default function TagSelector({
  tags = [],
  selectedTag = '',
  onSelect,
  onClear,
  label = '🏷️ Chiến Lược / Lý Do',
  labelHint = '(Chọn 1 thẻ)',
  placeholder = 'Nhập thẻ tùy chỉnh...',
  colorTheme = 'emerald',
  className = '',
}) {
  const [customTagInput, setCustomTagInput] = useState('');

  // Bản đồ chủ đề màu sắc cho trạng thái được chọn (Active)
  const themeStyles = {
    emerald: {
      activeTag: 'bg-emerald-600 text-white border-emerald-600 shadow-2xs ring-2 ring-emerald-500/20',
      hint: 'text-emerald-600 dark:text-emerald-400',
      focusRing: 'focus:ring-emerald-500',
    },
    rose: {
      activeTag: 'bg-rose-600 text-white border-rose-600 shadow-2xs ring-2 ring-rose-500/20',
      hint: 'text-rose-600 dark:text-rose-400',
      focusRing: 'focus:ring-rose-500',
    },
    indigo: {
      activeTag: 'bg-indigo-600 text-white border-indigo-600 shadow-2xs ring-2 ring-indigo-500/20',
      hint: 'text-indigo-600 dark:text-indigo-400',
      focusRing: 'focus:ring-indigo-500',
    },
    amber: {
      activeTag: 'bg-amber-600 text-white border-amber-600 shadow-2xs ring-2 ring-amber-500/20',
      hint: 'text-amber-600 dark:text-amber-400',
      focusRing: 'focus:ring-amber-500',
    },
  }[colorTheme] || themeStyles.emerald;

  const handleSelect = (t) => {
    if (selectedTag === t) {
      onClear?.() || onSelect?.('');
    } else {
      onSelect?.(t);
    }
  };

  const handleAddCustom = (e) => {
    e?.preventDefault();
    const trimmed = customTagInput.trim();
    if (!trimmed) return;
    onSelect?.(trimmed);
    setCustomTagInput('');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label Header */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
          {label} {labelHint && <span className={`text-[11px] font-semibold ${themeStyles.hint}`}>{labelHint}</span>}
        </label>
        {selectedTag && (
          <button
            type="button"
            onClick={() => onClear?.() || onSelect?.('')}
            className="text-[11px] text-rose-500 hover:text-rose-600 font-bold transition-colors cursor-pointer"
          >
            ✕ Bỏ chọn
          </button>
        )}
      </div>

      {/* Danh sách Thẻ Gợi Ý */}
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => {
          const isSelected = selectedTag === t;
          return (
            <button
              type="button"
              key={t}
              onClick={() => handleSelect(t)}
              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border ${
                isSelected
                  ? themeStyles.activeTag
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200/80 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {isSelected ? '✓ ' : ''}{t}
            </button>
          );
        })}

        {/* Hiển thị thẻ tùy chỉnh nếu đang chọn và không nằm trong tags gợi ý */}
        {selectedTag && !tags.includes(selectedTag) && (
          <button
            type="button"
            onClick={() => onClear?.() || onSelect?.('')}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold border cursor-pointer ${themeStyles.activeTag}`}
          >
            ✓ {selectedTag}
          </button>
        )}
      </div>

      {/* Input Nhập Thẻ Tự Do */}
      <div className="flex gap-2 pt-1">
        <input
          value={customTagInput}
          onChange={(e) => setCustomTagInput(e.target.value)}
          placeholder={placeholder}
          className={`flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 ${themeStyles.focusRing} transition-all`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddCustom(e);
            }
          }}
        />
        <button
          type="button"
          onClick={handleAddCustom}
          className="text-xs bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 px-3 py-2 rounded-xl font-bold border border-gray-200 dark:border-slate-700 transition-colors cursor-pointer"
        >
          + Thêm
        </button>
      </div>
    </div>
  );
}
