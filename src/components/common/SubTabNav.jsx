import React from 'react';

/**
 * SubTabNav - Unified SubTab Navigation & Segmented Control
 *
 * Chuẩn hóa toàn bộ thanh điều hướng con (SubTabs) trên khắp ứng dụng:
 * - Hỗ trợ các biến thể giao diện: 'segmented' (mặc định), 'pills', 'cards', 'underline'
 * - Bố cục linh hoạt: 'auto' | 'grid2' | 'grid3' | 'grid4' | 'flex'
 * - Kích thước: 'sm' | 'md' | 'lg'
 * - Hỗ trợ biểu tượng icon, badge đếm/trạng thái, và tooltip fullTitle
 */
export default function SubTabNav({
  tabs = [],
  activeTab,
  onChange,
  variant = 'segmented',
  layout = 'auto',
  size = 'md',
  className = '',
}) {
  if (!tabs || tabs.length === 0) return null;

  // 1. Kích thước (Padding, Text size, Icon size)
  const sizeMap = {
    sm: {
      btn: 'px-2.5 py-1.5 text-xs',
      icon: 'text-xs',
      badge: 'text-[10px] px-1.5 py-0.2',
    },
    md: {
      btn: 'px-3 py-2 text-xs sm:text-sm',
      icon: 'text-sm',
      badge: 'text-[10px] px-2 py-0.5',
    },
    lg: {
      btn: 'px-4 py-2.5 text-sm sm:text-base',
      icon: 'text-base',
      badge: 'text-xs px-2.5 py-0.5',
    },
  }[size] || sizeMap.md;

  // 2. Phân loại layout mode linh hoạt
  const isInline = layout === 'inline' || className.includes('w-auto') || className.includes('inline');
  const isGrid = layout.startsWith('grid') || (layout === 'auto' && tabs.length >= 2 && tabs.length <= 4 && !isInline);
  const isFlex = layout === 'flex' || (!isGrid && !isInline);

  // 3. Bố cục lưới & flex (Layout Classes)
  const getLayoutClasses = () => {
    if (layout === 'grid2') return 'grid grid-cols-2 gap-1.5 w-full';
    if (layout === 'grid3') return 'grid grid-cols-3 gap-1.5 w-full';
    if (layout === 'grid4') return 'grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full';
    if (layout === 'inline' || isInline) return 'inline-flex items-center gap-1';
    if (layout === 'flex' || isFlex) return 'flex items-center gap-1 w-full';

    // Auto layout dựa trên số lượng tab
    if (tabs.length === 2) return 'grid grid-cols-2 gap-1.5 w-full';
    if (tabs.length === 3) return 'grid grid-cols-3 gap-1.5 w-full';
    if (tabs.length === 4) return 'grid grid-cols-2 sm:grid-cols-4 gap-1.5 w-full';
    return 'flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full';
  };

  // 3. Biến thể giao diện 'cards' (dành cho các tab lớn như Workspaces trong Định Giá)
  if (variant === 'cards') {
    return (
      <div className={`w-full bg-white dark:bg-slate-800 rounded-2xl p-2 border border-slate-100 dark:border-slate-700/60 shadow-xs ${className}`}>
        <div className={getLayoutClasses()}>
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onChange?.(t.id)}
                title={t.fullTitle || t.label}
                className={`p-3 rounded-xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
                    : 'bg-slate-50/70 hover:bg-slate-100 dark:bg-slate-700/40 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-lg">{t.icon}</span>
                    {t.badge && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        }`}
                      >
                        {t.badge}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-xs sm:text-sm line-clamp-1">{t.label}</h4>
                </div>
                {(t.description || t.desc) && (
                  <p
                    className={`text-[11px] mt-1 line-clamp-1 ${
                      isActive ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'
                    }`}
                    title={t.description || t.desc}
                  >
                    {t.description || t.desc}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 4. Biến thể 'underline'
  if (variant === 'underline') {
    return (
      <div className={`flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto ${className}`}>
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange?.(t.id)}
              title={t.fullTitle || t.label}
              className={`flex items-center gap-1.5 pb-2.5 px-3 font-bold transition-all border-b-2 cursor-pointer shrink-0 ${sizeMap.btn} ${
                isActive
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t.icon && <span className={sizeMap.icon}>{t.icon}</span>}
              <span>{t.label}</span>
              {t.badge && (
                <span className={`rounded-full font-extrabold ${sizeMap.badge} ${t.badgeColor || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // 5. Biến thể 'pills' (rời, không bọc trong container xám)
  if (variant === 'pills') {
    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange?.(t.id)}
              title={t.fullTitle || t.label}
              className={`flex items-center justify-center gap-1.5 rounded-xl font-bold transition-all cursor-pointer ${sizeMap.btn} ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {t.icon && <span className={sizeMap.icon}>{t.icon}</span>}
              <span className="truncate">{t.label}</span>
              {t.badge && (
                <span className={`rounded-full font-extrabold ${sizeMap.badge} ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // 6. Biến thể chuẩn mặc định: 'segmented' (bọc trong nền xám/tối với bo góc tròn)
  const wrapperClass = isInline
    ? `inline-flex items-center bg-slate-100 dark:bg-slate-900/90 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-1 transition-colors shrink-0 ${className}`
    : isFlex
    ? `flex items-center bg-slate-100 dark:bg-slate-900/90 rounded-2xl border border-slate-200/60 dark:border-slate-800 p-1 transition-colors ${className}`
    : `w-full bg-slate-100 dark:bg-slate-900/90 rounded-2xl sm:rounded-3xl border border-slate-200/60 dark:border-slate-800 p-1.5 transition-colors overflow-hidden ${className}`;

  const btnLayoutClass = isGrid
    ? 'w-full min-w-0 flex items-center justify-center gap-1.5 rounded-xl sm:rounded-2xl font-extrabold transition-all cursor-pointer text-center'
    : isFlex
    ? 'flex-1 min-w-0 whitespace-nowrap flex items-center justify-center gap-1.5 rounded-xl font-bold transition-all cursor-pointer text-center'
    : 'shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 rounded-xl font-bold transition-all cursor-pointer text-center';

  return (
    <div className={wrapperClass}>
      <div className={getLayoutClasses()}>
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange?.(t.id)}
              title={t.fullTitle || t.label}
              className={`${btnLayoutClass} ${sizeMap.btn} ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              {t.icon && <span className={`shrink-0 ${sizeMap.icon}`}>{t.icon}</span>}
              <span className="truncate">{t.label}</span>
              {t.badge !== undefined && t.badge !== null && t.badge !== '' && (
                <span className={`rounded-full font-extrabold shrink-0 ${sizeMap.badge} ${
                  isActive ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
