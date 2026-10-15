import React from 'react';

// Format tiền VND
function formatVND(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number(val).toLocaleString('vi-VN') + ' đ';
}

/**
 * StickyCockpitBar - Thanh điều khiển & định giá thu nhỏ ghim cố định khi cuộn trang
 * Đảm bảo người dùng luôn nắm bắt được thị giá, định giá hội tụ và biên an toàn
 * ngay cả khi đang cuộn sâu vào 122 dòng BCTC hay dòng lệnh cá mập.
 */
export default function StickyCockpitBar({
  isVisible,
  currentStock,
  financials,
  selectedSymbol,
  activeWorkspace,
  onSelectWorkspace,
  workspaces = [],
  onScrollToTop,
  onOpenReportModal,
}) {
  if (!currentStock || !isVisible) return null;

  const closePrice = currentStock.close;
  const consensusFair =
    currentStock.valuation?.fairValue ||
    financials?.valuationMultiples?.consensusFairValue;

  const upsideValue =
    currentStock.valuation?.upside != null
      ? currentStock.valuation.upside
      : financials?.valuationMultiples?.upside;

  const mosValue =
    currentStock.valuation?.marginOfSafetyFairValue != null
      ? currentStock.valuation.marginOfSafetyFairValue
      : financials?.valuationMultiples?.marginOfSafety;

  const isUp = (currentStock.change || 0) >= 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-slate-700/80 shadow-md transition-all duration-300 animate-in slide-in-from-top-3">
      <div className="w-[94%] sm:w-[95%] max-w-[2400px] mx-auto px-2 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-4">
        {/* 1. Ticker & Thị Giá */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onScrollToTop}
            className="flex items-center gap-2 group text-left cursor-pointer"
            title="Cuộn lên đầu trang"
          >
            <span className="w-8 h-8 rounded-xl bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-black text-sm shrink-0 group-hover:scale-105 transition-transform">
              {selectedSymbol}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                  {currentStock.description || selectedSymbol}
                </span>
                <span className="hidden md:inline px-1.5 py-0.2 rounded text-[9px] font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700">
                  {currentStock.exchange || 'HOSE'}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                  {formatVND(closePrice)}
                </span>
                <span className={`text-[11px] font-bold ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {isUp ? '+' : ''}{currentStock.change || 0}%
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* 2. Giá Trị Nội Tại Hội Tụ & Biên An Toàn (MoS) */}
        <div className="hidden lg:flex items-center gap-4 border-x border-gray-200 dark:border-slate-700/60 px-4">
          <div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-semibold">
              🎯 Giá Trị Nội Tại
            </span>
            <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
              {formatVND(consensusFair)}
            </span>
          </div>

          <div className="border-l border-gray-100 dark:border-slate-800 pl-3">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider block font-semibold">
              Biên An Toàn (MoS)
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`font-mono font-bold text-xs ${(mosValue || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {mosValue != null ? `${mosValue >= 0 ? '+' : ''}${mosValue}%` : '—'}
              </span>
              {upsideValue != null && (
                <span className="text-[10px] text-gray-400 font-medium">
                  (Upside: {upsideValue >= 0 ? '+' : ''}{upsideValue}%)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Chuyển Nhanh 4 Workspace */}
        <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar">
          {workspaces.map((ws, idx) => {
            const isActive = activeWorkspace === ws.id;
            return (
              <button
                key={ws.id}
                type="button"
                onClick={() => onSelectWorkspace(ws.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100/80 hover:bg-gray-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'
                }`}
                title={ws.desc || ws.label}
              >
                <span>{ws.icon}</span>
                <span className="hidden md:inline">{ws.label.replace(/^\d+\.\s*/, '')}</span>
                <span className="md:hidden">{idx + 1}</span>
              </button>
            );
          })}
        </div>

        {/* 4. Hành Động: Master Dossier & Cuộn Lên Đầu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenReportModal && (
            <button
              type="button"
              onClick={onOpenReportModal}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer flex items-center gap-1"
              title="Mở Báo Cáo Phân Tích Toàn Diện Master Dossier (10 Chương)"
            >
              <span>📑</span>
              <span className="hidden xl:inline">Dossier</span>
            </button>
          )}

          <button
            type="button"
            onClick={onScrollToTop}
            className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 transition cursor-pointer"
            title="Cuộn lên đầu trang"
            aria-label="Cuộn lên đầu trang"
          >
            <span className="text-sm">⬆️</span>
          </button>
        </div>
      </div>
    </div>
  );
}
