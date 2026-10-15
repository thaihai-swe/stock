import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext({
  showToast: () => {},
  hideToast: () => {},
});

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    if (!message) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setToast({
      id: Date.now(),
      message,
      type, // 'success' | 'error' | 'warning' | 'info'
    });

    timerRef.current = setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, duration);
  }, []);

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-600 dark:bg-emerald-700 text-white border-emerald-500 shadow-emerald-950/20';
      case 'error':
        return 'bg-rose-600 dark:bg-rose-700 text-white border-rose-500 shadow-rose-950/20';
      case 'warning':
        return 'bg-amber-600 dark:bg-amber-700 text-white border-amber-500 shadow-amber-950/20';
      case 'info':
      default:
        return 'bg-slate-900 dark:bg-slate-800 text-white border-slate-700 shadow-slate-950/30';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}

      {/* TOAST UI NOTIFICATION CONTAINER (z-60 to display above z-50 modals) */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-20 md:bottom-6 right-4 z-60 max-w-sm sm:max-w-md px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in slide-in-from-bottom-3 duration-200 ${getToastStyles(
            toast.type
          )}`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-sm shrink-0">{getToastIcon(toast.type)}</span>
            <span className="truncate leading-relaxed">{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={hideToast}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer shrink-0 text-xs font-bold leading-none ml-2"
            title="Đóng thông báo"
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}
