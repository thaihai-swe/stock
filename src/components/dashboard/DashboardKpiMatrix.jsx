import { fmtMoney, plColor, plBg } from '../../utils/format.js';

export default function DashboardKpiMatrix({
  // Trụ cột 1: Vốn & Thị giá
  totalInvested = 0,
  holdingCost = 0,
  totalMarketValue = 0,
  totalUnrealizedPL = 0,
  totalUnrealizedPLPct = 0,
  buyOrdersCount = 0,

  // Trụ cột 2: Hiệu suất & Lợi nhuận
  timeWindow = 'all',
  periodLabel = 'Toàn Thời Gian',
  periodRealizedPL = 0,
  periodCashDividends = 0,
  periodDividendsCount = 0,
  sellOrdersInPeriodCount = 0,
  totalCumulativePL = 0,
  totalCumulativePLPct = 0,

  // Trụ cột 3: Quản trị rủi ro & Kỷ luật
  winRate = 0,
  winCount = 0,
  lossCount = 0,
  avgWin = 0,
  avgLoss = 0,
  profitFactor = '0.00',
  portfolioBeta = null,
  portfolioDividendYield = null,
  riskRatios = { sharpe: 0, sortino: 0, ratingText: 'Chưa đủ dữ liệu', ratingColor: 'text-gray-400' },
}) {
  const isPeriod = timeWindow !== 'all';
  const periodTotalReturn = periodRealizedPL + periodCashDividends;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 🏛️ TRỤ CỘT 1: VỐN & THỊ GIÁ */}
      <div className="card-base rounded-3xl p-5 flex flex-col justify-between hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>🏛️</span> Vốn & Thị Giá Danh Mục
            </span>
            <span className="badge-indigo text-[10px]">
              Live Quotes
            </span>
          </div>

          <div className="mt-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {fmtMoney(totalMarketValue)}đ
            </span>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Tổng giá trị cổ phiếu theo thị trường
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">Vốn gốc đang giữ:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 text-right">{fmtMoney(holdingCost)}đ</span>
          </div>

          <div className="flex items-center justify-between gap-1">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">Lãi / Lỗ tạm tính:</span>
            <span className={`font-bold flex items-center justify-end gap-1 flex-wrap text-right ${plColor(totalUnrealizedPL)}`}>
              <span>{totalUnrealizedPL >= 0 ? '+' : ''}{fmtMoney(totalUnrealizedPL)}đ</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${plBg(totalUnrealizedPL)}`}>
                {totalUnrealizedPL >= 0 ? '▲ +' : '▼ '}{totalUnrealizedPLPct}%
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
            <span className="shrink-0">Tổng vốn mua:</span>
            <span className="text-right truncate">{fmtMoney(totalInvested)}đ ({buyOrdersCount} lệnh)</span>
          </div>
        </div>
      </div>

      {/* 📈 TRỤ CỘT 2: HIỆU SUẤT & LỢI NHUẬN TRONG KỲ */}
      <div className="card-base rounded-3xl p-5 flex flex-col justify-between hover:border-emerald-200 dark:hover:border-emerald-900/50 transition-all">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <span>📈</span> Hiệu Suất & Lợi Nhuận
            </span>
            <span className="badge-gain text-[10px]">
              {isPeriod ? periodLabel : 'Toàn Thời Gian'}
            </span>
          </div>

          <div className="mt-1">
            <span className={`text-2xl sm:text-3xl font-black tracking-tight ${plColor(periodRealizedPL)}`}>
              {periodRealizedPL >= 0 ? '+' : ''}{fmtMoney(periodRealizedPL)}đ
            </span>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Lãi / Lỗ thực hiện đã chốt {isPeriod ? `(${periodLabel})` : ''}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">Cổ tức tiền mặt:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 text-right">
              +{fmtMoney(periodCashDividends)}đ <span className="text-[10px] font-normal text-slate-400">({periodDividendsCount} đợt)</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-1">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">Tổng thu về trong kỳ:</span>
            <span className={`font-bold text-right ${periodTotalReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {periodTotalReturn >= 0 ? '+' : ''}{fmtMoney(periodTotalReturn)}đ
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
            <span className="shrink-0">ROI toàn danh mục:</span>
            <span className={`font-bold text-right ${plColor(totalCumulativePL)}`}>
              {totalCumulativePL >= 0 ? '▲ +' : '▼ '}{totalCumulativePLPct}% ROI
            </span>
          </div>
        </div>
      </div>

      {/* 🛡️ TRỤ CỘT 3: QUẢN TRỊ RỦI RO & KỶ LUẬT */}
      <div className="card-base rounded-3xl p-5 flex flex-col justify-between hover:border-purple-200 dark:hover:border-purple-900/50 transition-all">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <span>🛡️</span> Quản Trị Rủi Ro & Kỷ Luật
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
              Trading Edge
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between">
            <div>
              <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                {winRate}%
              </span>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Tỷ lệ thắng ({winCount}W / {lossCount}L)
              </p>
            </div>

            <div className="text-right">
              <span className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {profitFactor}
              </span>
              <span className="text-[10px] text-slate-400 block">Profit Factor</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">TB Lãi / Lỗ:</span>
            <div className="font-semibold flex items-center gap-1 text-right">
              <span className="text-emerald-600 dark:text-emerald-400">+{fmtMoney(avgWin)}đ</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-rose-600 dark:text-rose-400">-{fmtMoney(avgLoss)}đ</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-1">
            <span className="text-slate-500 dark:text-slate-400 shrink-0">Sharpe / Sortino:</span>
            <div className="flex items-center gap-1 sm:gap-1.5 font-bold flex-wrap justify-end text-right">
              <span className="text-indigo-600 dark:text-indigo-400">{riskRatios.sharpe}</span>
              <span className="text-slate-300 dark:text-slate-600">/</span>
              <span className="text-emerald-600 dark:text-emerald-400">{riskRatios.sortino}</span>
              <span className={`text-[10px] ml-0.5 sm:ml-1 font-semibold ${riskRatios.ratingColor}`}>({riskRatios.ratingText})</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-1 text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
            <span className="shrink-0">Beta & Dividend Yield:</span>
            <span className="font-medium text-slate-700 dark:text-slate-300 text-right truncate">
              Beta {portfolioBeta != null ? portfolioBeta : '—'} · Yield {portfolioDividendYield != null ? `+${portfolioDividendYield}%` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
