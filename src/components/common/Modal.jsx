import React, { useEffect, useRef } from 'react';

/**
 * Component Modal dùng chung tiêu chuẩn cho toàn bộ ứng dụng
 * Tự động khóa scroll body, lắng nghe phím Escape, click backdrop đóng, và hỗ trợ đa dạng kích thước.
 */
export default function Modal({
  isOpen = false,
  onClose,
  title,
  subtitle,
  icon,
  badge,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full'
  children,
  footer,
  customHeader,
  customFooter,
  hideCloseButton = false,
  closeOnBackdrop = true,
  closeOnEsc = true,
  headerContent,
  className = '',
  dialogClassName = '',
}) {
  const dialogRef = useRef(null);

  // 1. Tự động khoá cuộn trang (Body Scroll Lock) khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // 2. Lắng nghe phím ESC để đóng modal
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  // Bản đồ kích cỡ modal
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    full: 'max-w-6xl w-full',
  }[size] || 'max-w-md';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto ${className}`}
    >
      {/* Lớp nền mờ (Backdrop) */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={() => {
          if (closeOnBackdrop) onClose?.();
        }}
      />

      {/* Khung nội dung Modal (Dialog Container) */}
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-h-[92vh] flex flex-col w-full z-10 transition-all duration-150 animate-in zoom-in-95 overflow-hidden ${sizeClasses} ${dialogClassName}`}
      >
        {/* HEADER TIÊU CHUẨN HOẶC CUSTOM */}
        {customHeader ? (
          customHeader
        ) : (title || headerContent) && (
          <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-900/80">
            {headerContent ? (
              headerContent
            ) : (
              <div className="flex items-center gap-3 min-w-0 pr-2">
                {icon && <span className="text-xl shrink-0">{icon}</span>}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-gray-900 dark:text-slate-100 text-sm sm:text-base truncate">
                      {title}
                    </h3>
                    {badge && (
                      <span className="shrink-0">{badge}</span>
                    )}
                  </div>
                  {subtitle && (
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            )}

            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-100 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-sm font-bold flex items-center justify-center shrink-0 ml-auto"
                aria-label="Đóng cửa sổ"
                title="Đóng (Esc)"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* BODY NỘI DUNG */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* FOOTER NẾU CÓ HOẶC CUSTOM FOOTER */}
        {customFooter ? (
          customFooter
        ) : footer && (
          <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
