import React from 'react';

/**
 * EmptyState - Unified Empty State Component
 *
 * Chuẩn hóa màn hình rỗng khi không có dữ liệu hoặc không tìm thấy kết quả tìm kiếm:
 * - Icon biểu tượng sinh động
 * - Tiêu đề & mô tả hướng dẫn người dùng
 * - Nút hành động chính (Primary Action) & nút hành động phụ (Secondary Action)
 */
export default function EmptyState({
  icon = '🔍',
  title = 'Chưa có dữ liệu',
  description,
  actionLabel,
  onAction,
  actionIcon,
  secondaryActionLabel,
  onSecondaryAction,
  minHeight = 'min-h-[260px]',
  className = '',
}) {
  return (
    <div
      className={`card-base rounded-3xl p-8 sm:p-12 text-center flex flex-col items-center justify-center animate-in fade-in duration-200 ${minHeight} ${className}`}
    >
      <div className="relative mb-3 flex items-center justify-center">
        <div className="text-4xl sm:text-5xl transform transition-transform hover:scale-110">
          {icon}
        </div>
      </div>

      <h4 className="font-extrabold text-gray-800 dark:text-slate-100 text-sm sm:text-base tracking-tight">
        {title}
      </h4>

      {description && (
        <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-md leading-relaxed">
          {description}
        </p>
      )}

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
          {actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="btn-primary !text-xs !px-4 !py-2 flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {actionIcon && <span>{actionIcon}</span>}
              <span>{actionLabel}</span>
            </button>
          )}

          {secondaryActionLabel && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="btn-secondary !text-xs !px-4 !py-2 flex items-center gap-1.5 cursor-pointer"
            >
              <span>{secondaryActionLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
