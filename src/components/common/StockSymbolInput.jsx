import React, { useRef } from 'react';

/**
 * StockSymbolInput - Unified Stock Symbol Input Component
 *
 * Chuẩn hóa ô nhập mã cổ phiếu 3 sàn (HOSE, HNX, UPCoM):
 * - Tự động viết hoa (Auto-uppercase) và loại bỏ ký tự khoảng trắng thừa
 * - Nút xóa nhanh (Clear button ✕)
 * - Tùy biến kích cỡ: 'sm' | 'md' | 'lg'
 * - Chủ đề viền & focus: 'emerald', 'blue', 'indigo', 'rose'
 * - Hỗ trợ nhấn Enter để submit / lookup
 * - Tùy chọn hiển thị các chip chọn nhanh mã (quickSymbols)
 */
export default function StockSymbolInput({
  value = '',
  onChange,
  onSubmit,
  placeholder = 'VD: VNM, HPG, FPT...',
  size = 'md',
  colorTheme = 'indigo',
  disabled = false,
  required = false,
  autoFocus = false,
  showClear = true,
  quickSymbols = [],
  className = '',
  inputClassName = '',
  name = 'symbol',
  id,
}) {
  const inputRef = useRef(null);

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs rounded-xl',
    md: 'px-3.5 py-2.5 text-sm rounded-xl',
    lg: 'px-4 py-3 text-sm font-extrabold rounded-2xl',
  }[size] || 'px-3.5 py-2.5 text-sm rounded-xl';

  const themeRings = {
    emerald: 'focus:ring-emerald-500 focus:border-emerald-500',
    blue: 'focus:ring-blue-500 focus:border-blue-500',
    indigo: 'focus:ring-indigo-500 focus:border-indigo-500',
    rose: 'focus:ring-rose-500 focus:border-rose-500',
  }[colorTheme] || 'focus:ring-indigo-500 focus:border-indigo-500';

  const handleChange = (e) => {
    const raw = e.target.value;
    const formatted = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    onChange?.(formatted);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.(value);
    }
  };

  const handleClear = () => {
    onChange?.('');
    inputRef.current?.focus();
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck="false"
          maxLength={10}
          className={`w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 font-extrabold uppercase text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 ${themeRings} transition-all disabled:opacity-50 tracking-wider ${
            showClear && value ? 'pr-8' : ''
          } ${sizeStyles} ${inputClassName}`}
        />

        {showClear && value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200 p-1 text-xs cursor-pointer font-bold transition-colors"
            title="Xóa mã"
            aria-label="Xóa mã đã nhập"
          >
            ✕
          </button>
        )}
      </div>

      {/* Chip chọn nhanh mã nếu được truyền vào */}
      {quickSymbols && quickSymbols.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {quickSymbols.map((sym) => {
            const symStr = typeof sym === 'string' ? sym : sym.symbol;
            if (!symStr) return null;
            const isSelected = value === symStr;
            return (
              <button
                key={symStr}
                type="button"
                onClick={() => onChange?.(symStr)}
                className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-indigo-400'
                }`}
              >
                {symStr}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
