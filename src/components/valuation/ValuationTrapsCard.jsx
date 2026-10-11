import React from 'react';

export default function ValuationTrapsCard({ valuationTraps, symbol }) {
  if (!valuationTraps) return null;

  const {
    trapScore = 0,
    trapLabel = 'THẤP',
    trapReason = '',
    isCapPenalized = false,
    trapsList = []
  } = valuationTraps;

  const isLow = trapLabel === 'THẤP';
  const isMed = trapLabel === 'TRUNG BÌNH' || trapLabel === 'TB';
  const isHigh = trapLabel === 'CAO';

  const trapIcons = {
    value_trap: '📉',
    book_trap: '📚',
    cyclical_peak: '🎢',
    dividend_trap: '💸',
    debt_stress: '💣',
    share_dilution: '💧',
    wc_stress: '📦'
  };

  return (
    <div className="p-5 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs space-y-5">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Kiểm Toán Rủi Ro Định Giá
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              7 Bẫy Định Giá Kinh Điển
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1">
            Bộ Quét 7 Bẫy Định Giá & Bộ Lọc Giá Rẻ Giả Tạo — {symbol}
          </h3>
        </div>

        {/* Trap Level Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-gray-400 font-medium block">Mức độ rủi ro bẫy:</span>
            <span className={`text-xs font-black px-3 py-1 rounded-xl uppercase inline-flex items-center gap-1.5 mt-0.5 ${
              isLow
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : isMed
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
            }`}>
              <span>{isLow ? '🛡️' : isMed ? '⚠️' : '🚨'}</span>
              <span>{trapLabel} ({trapScore}/10)</span>
            </span>
          </div>
          {isCapPenalized && (
            <span className="text-[10px] font-black px-2.5 py-1.5 rounded-xl bg-rose-600 text-white animate-pulse">
              KHÓA TRẦN ĐIỂM ≤ 5.0
            </span>
          )}
        </div>
      </div>

      {/* ── BANNER GIẢI TRÌNH BẪY ── */}
      {isHigh ? (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3">
          <span className="text-xl">🚨</span>
          <div>
            <span className="font-bold block">Phát Hiện Dấu Hiệu Bẫy Định Giá Nguy Cấp:</span>
            <span className="mt-0.5 block">{trapReason || 'Cổ phiếu có chỉ số định giá P/E hoặc P/B rẻ nhưng nội tại kinh doanh đang xấu đi hoặc dòng tiền suy kiệt.'}</span>
            <span className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 block">
              🛡️ Hệ thống tự động khóa trần khuyến nghị không quá 5.0/10 (Trung tính / Nắm giữ), ngăn chặn khuyến nghị MUA sai lầm.
            </span>
          </div>
        </div>
      ) : isMed ? (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <span className="font-bold block">Cảnh Báo Bẫy Định Giá Cần Theo Dõi:</span>
            <span className="mt-0.5 block">{trapReason || 'Một số chỉ số cơ bản đang chớm có sự phân kỳ giữa lợi nhuận kế toán và dòng tiền thực.'}</span>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-3">
          <span className="text-lg">✅</span>
          <div>
            <span className="font-bold">An Toàn Toàn Diện:</span> Không ghi nhận bẫy giá rẻ giả tạo. Tăng trưởng doanh thu, chất lượng vốn và dòng tiền tự do FCF đồng thuận tích cực.
          </div>
        </div>
      )}

      {/* ── LƯỚI 7 BẪY ĐỊNH GIÁ CHI TIẾT ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {trapsList.map((trap) => {
          const icon = trapIcons[trap.id] || '⚠️';
          const isActive = trap.active;

          return (
            <div
              key={trap.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800/80 shadow-xs'
                  : 'bg-gray-50/50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{icon}</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      {trap.name}
                    </span>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${
                    isActive
                      ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {isActive ? 'Bẫy Kích Hoạt' : 'An Toàn'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                  {trap.desc}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between text-[10px]">
                <span className="text-gray-400 font-mono">ID: {trap.id}</span>
                <span className={isActive ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                  {isActive ? '⚠️ Rủi ro phát sinh' : '✓ Ổn định'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
