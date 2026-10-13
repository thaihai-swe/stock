import { fmtMoney, plColor } from '../../utils/format.js';
import { RISK_POSTURES } from '../../utils/constants.js';

export default function DashboardHero({
  totalNAV = 0,
  cashBalance = 0,
  totalMarketValue = 0,
  cashPct = 0,
  stockPct = 0,
  totalCumulativePL = 0,
  totalCumulativePLPct = 0,
  periodRealizedPL = 0,
  periodCashDividends = 0,
  totalUnrealizedPL = 0,
  timeWindow = 'all',
  periodLabel = 'Toàn Thời Gian',
  pricesSession = null,
  lastUpdated = '',
  loadingPrices = false,
  onRefreshPrices,
  onOpenEditCash,
  onNavigateBuy,
  onNavigateSell,
  onNavigateDca,
  onSwitchTab,
}) {
  // Phong cách quản trị rủi ro phân bổ tài sản
  const getRiskPosture = () => {
    const postures = Array.isArray(RISK_POSTURES)
      ? RISK_POSTURES
      : (RISK_POSTURES && typeof RISK_POSTURES === 'object'
          ? Object.values(RISK_POSTURES)
          : []);

    for (const p of postures) {
      if (cashPct >= (p?.minCashPct ?? 0)) {
        return { label: p?.label ?? '', bg: p?.bg ?? '' };
      }
    }
    const fallback = postures[postures.length - 1];
    return {
      label: fallback?.label ?? '⚡ Full 100% Cổ phiếu',
      bg: fallback?.bg ?? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/80 dark:text-rose-200 dark:border-rose-700/50',
    };
  };

  const posture = getRiskPosture();
  const isAllTime = timeWindow === 'all';
  const displayPL = isAllTime ? totalCumulativePL : (periodRealizedPL + periodCashDividends);
  const displayRealized = isAllTime ? periodRealizedPL : periodRealizedPL;
  const displayDividends = isAllTime ? periodCashDividends : periodCashDividends;

  return (
    <div className="bg-gradient-to-br from-indigo-50/70 via-white to-slate-50/60 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 rounded-3xl p-5 sm:p-6 text-slate-900 dark:text-white shadow-sm dark:shadow-xl relative overflow-hidden border border-indigo-100 dark:border-indigo-800/40 transition-colors">
      {/* Background Ambient Glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-200/20 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-200/20 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HÀNG 1: HEADER & STATUS BADGES */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-indigo-100 dark:border-indigo-800/30">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-300 flex items-center gap-1.5">
              <span>💎</span> Tổng Giá Trị Tài Sản Ròng (NAV)
            </span>

            {/* Trạng thái phiên giao dịch */}
            {pricesSession && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                pricesSession.isOpen
                  ? 'badge-gain animate-pulse'
                  : 'badge-neutral'
              }`}>
                {pricesSession.label}
              </span>
            )}

            {lastUpdated && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                · Cập nhật: {lastUpdated}
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-xs break-words">
              {fmtMoney(totalNAV)}đ
            </span>
            <span className="badge-gain shadow-2xs">
              Sức mua + Giá trị CP
            </span>
          </div>
        </div>

        {/* QUICK ACTION DOCK (Thanh Tác Vụ 1-Chạm) */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onOpenEditCash}
            className="btn-secondary !bg-indigo-50 hover:!bg-indigo-100 !text-indigo-700 dark:!bg-indigo-950/60 dark:hover:!bg-indigo-900/60 dark:!text-indigo-200 !border-indigo-200 dark:!border-indigo-800/60 flex items-center justify-center gap-1.5 min-h-[38px]"
            title="Điều chỉnh số dư tiền mặt khả dụng"
          >
            <span>💵</span>
            <span>Sửa Tiền Mặt</span>
          </button>

          <button
            type="button"
            onClick={onNavigateBuy}
            className="btn-primary !bg-emerald-600 hover:!bg-emerald-500 shadow-md shadow-emerald-900/30 flex items-center justify-center gap-1.5 min-h-[38px]"
          >
            <span>🛒</span>
            <span>Mua Vào</span>
          </button>

          <button
            type="button"
            onClick={onNavigateSell}
            className="btn-danger flex items-center justify-center gap-1.5 min-h-[38px] shadow-md shadow-rose-900/30"
          >
            <span>💸</span>
            <span>Bán Ra</span>
          </button>

          <button
            type="button"
            onClick={onRefreshPrices}
            disabled={loadingPrices}
            className="btn-secondary flex items-center justify-center gap-1.5 min-h-[38px]"
            title="Lấy thị giá mới nhất từ sàn (Bỏ qua cache 1h)"
          >
            <span>{loadingPrices ? '⏳' : '⚡'}</span>
            <span>{loadingPrices ? 'Đang tải...' : 'Giá Sàn'}</span>
          </button>

          {onNavigateDca && (
            <button
              type="button"
              onClick={onNavigateDca}
              className="btn-primary flex items-center justify-center gap-1.5 min-h-[38px] hidden sm:flex"
            >
              <span>🧮</span>
              <span>DCA</span>
            </button>
          )}
        </div>
      </div>

      {/* HÀNG 2: 2 BENTO CARDS (PHÂN BỔ TÀI SẢN & TỔNG P&L THỰC NHẬN) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mt-4">
        {/* CARD TRÁI: TIỀN MẶT VS CỔ PHIẾU & RISK POSTURE GAUGE */}
        <div className="bg-white/80 dark:bg-slate-900/60 rounded-2xl p-4 border border-indigo-100/80 dark:border-white/10 shadow-2xs dark:shadow-none flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="text-indigo-700 dark:text-indigo-200 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>⚖️</span> Cơ Cấu Phân Bổ Danh Mục
            </span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] sm:text-[11px] border ${posture.bg}`}>
              {posture.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="card-nested !p-2.5">
              <span className="text-[11px] text-slate-500 dark:text-indigo-300 block">💵 Tiền mặt</span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="font-bold text-slate-900 dark:text-white text-base sm:text-lg truncate">
                  {fmtMoney(cashBalance)}đ
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 ml-1">
                  {cashPct}%
                </span>
              </div>
            </div>

            <div className="card-nested !p-2.5">
              <span className="text-[11px] text-slate-500 dark:text-indigo-300 block">📈 Cổ phiếu</span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="font-bold text-slate-900 dark:text-white text-base sm:text-lg truncate">
                  {fmtMoney(totalMarketValue)}đ
                </span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 ml-1">
                  {stockPct}%
                </span>
              </div>
            </div>
          </div>

          {/* Allocation Gauge Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-950/80 h-3 rounded-full overflow-hidden flex p-0.5 border border-slate-200 dark:border-indigo-700/40">
            <div
              style={{ width: `${cashPct}%` }}
              className="bg-emerald-500 rounded-l-full transition-all duration-500"
              title={`Tiền mặt: ${cashPct}% (${fmtMoney(cashBalance)}đ)`}
            />
            <div
              style={{ width: `${stockPct}%` }}
              className="bg-indigo-500 rounded-r-full transition-all duration-500"
              title={`Cổ phiếu: ${stockPct}% (${fmtMoney(totalMarketValue)}đ)`}
            />
          </div>
        </div>

        {/* CARD PHẢI: HIỆU SUẤT TỔNG P&L (LÃI CHỐT, CỔ TỨC & TẠM TÍNH) */}
        <div className="bg-white/80 dark:bg-slate-900/60 rounded-2xl p-4 border border-indigo-100/80 dark:border-white/10 shadow-2xs dark:shadow-none flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <span className="text-indigo-700 dark:text-indigo-200 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>🏆</span> {isAllTime ? 'P&L Tích Luỹ Toàn Thời Gian' : `P&L Thu Về Trong Kỳ (${periodLabel})`}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
              displayPL >= 0 ? 'badge-gain' : 'badge-loss'
            }`}>
              {isAllTime
                ? `${totalCumulativePL >= 0 ? '▲ +' : '▼ '}${totalCumulativePLPct}% ROI`
                : `${displayPL >= 0 ? '+' : ''}${fmtMoney(displayPL)}đ`}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-3">
            <span className={`text-2xl sm:text-3xl font-black tracking-tight ${
              displayPL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {displayPL >= 0 ? '+' : ''}{fmtMoney(displayPL)}đ
            </span>
          </div>

          {/* 3 Trụ Cột Thành Phần */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px]">
            <div className="card-nested !p-2 sm:!px-2.5 sm:!py-1.5 min-w-0">
              <span className="text-slate-500 dark:text-slate-400 block text-[9px] sm:text-[10px]">Đã chốt:</span>
              <span className={`font-bold mt-0.5 block truncate text-[10px] sm:text-xs ${
                displayRealized >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'
              }`}>
                {displayRealized >= 0 ? '+' : ''}{fmtMoney(displayRealized)}đ
              </span>
            </div>

            <div className="card-nested !p-2 sm:!px-2.5 sm:!py-1.5 min-w-0">
              <span className="text-slate-500 dark:text-slate-400 block text-[9px] sm:text-[10px]">Cổ tức nhận:</span>
              <span className="font-bold text-amber-600 dark:text-amber-300 mt-0.5 block truncate text-[10px] sm:text-xs">
                +{fmtMoney(displayDividends)}đ
              </span>
            </div>

            <div className="card-nested !p-2 sm:!px-2.5 sm:!py-1.5 min-w-0">
              <span className="text-slate-500 dark:text-slate-400 block text-[9px] sm:text-[10px]">Tạm tính:</span>
              <span className={`font-bold mt-0.5 block truncate text-[10px] sm:text-xs ${
                totalUnrealizedPL >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'
              }`}>
                {totalUnrealizedPL >= 0 ? '+' : ''}{fmtMoney(totalUnrealizedPL)}đ
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
