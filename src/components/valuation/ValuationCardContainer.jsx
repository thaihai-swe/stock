import React, { useState } from 'react';

/**
 * ValuationCardContainer - Khung Bọc Thẻ Chuẩn Hóa Thông Minh Cho Tab Định Giá
 * - Cung cấp ID neo (Anchor Target) cho thanh ToC
 * - Khi mở rộng: Giữ nguyên giao diện gốc của thẻ kèm nút "▲ Thu gọn" tinh tế ở góc phải
 * - Khi thu gọn: Thu nhỏ thẻ thành dải Teaser 1 dòng hiển thị kết luận cốt lõi
 * - Tự động ghi nhớ trạng thái đóng/mở
 */
export default function ValuationCardContainer({
  id,
  title,
  icon = '📊',
  badge,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  teaserContent,
  children,
  className = '',
}) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  return (
    <div
      id={id}
      className={`scroll-mt-20 transition-all duration-300 relative group/card ${className}`}
    >
      {/* ── KHI THU GỌN: HIỂN THỊ DẢI TEASER TÓM TẮT 1 DÒNG ── */}
      {isCollapsed ? (
        <div
          onClick={handleToggle}
          className="p-3.5 sm:p-4 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/60 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700/60 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 select-none"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-base shrink-0 shadow-2xs">
              {icon}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                  {title}
                </span>
                {badge && (
                  <span className="hidden sm:inline px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60">
                    {badge}
                  </span>
                )}
              </div>
              {teaserContent && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">⚡ Kết Luận:</span>
                  <span className="truncate">{teaserContent}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 hover:bg-indigo-100 transition flex items-center gap-1">
              <span>Mở rộng</span>
              <span className="text-[10px]">▼</span>
            </span>
          </div>
        </div>
      ) : (
        /* ── KHI MỞ RỘNG: HIỂN THỊ THẺ ĐẦY ĐỦ KÈM NÚT THU GỌN ── */
        <div className="relative">
          <div className="absolute top-3.5 sm:top-5 right-3.5 sm:right-5 z-20">
            <button
              type="button"
              onClick={handleToggle}
              className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-gray-100/90 hover:bg-gray-200/90 dark:bg-slate-700/80 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 transition cursor-pointer flex items-center gap-1 border border-gray-200/60 dark:border-slate-600/50 shadow-2xs backdrop-blur-xs"
              title="Thu gọn thẻ này để xem tóm tắt 1 dòng"
            >
              <span className="text-[10px]">▲</span>
              <span className="hidden sm:inline text-[11px]">Thu gọn</span>
            </button>
          </div>
          {children}
        </div>
      )}
    </div>
  );
}
