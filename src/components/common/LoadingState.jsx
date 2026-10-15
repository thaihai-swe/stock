import React from 'react';

/**
 * LoadingState - Unified Loading Spinner & State Component
 *
 * Chuẩn hóa màn hình chờ nạp dữ liệu trên khắp ứng dụng:
 * - Hiệu ứng xoay tròn mượt mà (smooth spinner)
 * - Thông điệp chính và phụ rõ ràng
 * - Chiều cao tối thiểu tùy biến linh hoạt
 */
export default function LoadingState({
  message = 'Đang tải dữ liệu...',
  subMessage,
  icon = '🔄',
  minHeight = 'min-h-[320px]',
  className = '',
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center select-none animate-in fade-in duration-200 ${minHeight} ${className}`}
    >
      <div className="relative mb-4 flex items-center justify-center">
        {/* Vòng hào quang lấp lánh phía sau */}
        <div className="absolute w-14 h-14 bg-indigo-500/10 dark:bg-indigo-400/10 rounded-full blur-xl animate-pulse" />

        {/* Icon xoay */}
        <div className="relative text-3xl sm:text-4xl animate-spin duration-1000 inline-block">
          {icon}
        </div>
      </div>

      <h4 className="text-sm sm:text-base font-extrabold text-gray-800 dark:text-slate-100 tracking-tight">
        {message}
      </h4>

      {subMessage && (
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm">
          {subMessage}
        </p>
      )}
    </div>
  );
}
