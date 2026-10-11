import { fmtMoney, plColor, plBg } from '../../utils/format.js';

export default function HistoryHeroHeader({
  filteredOrders = [],
  allOrdersCount = 0,
  isFiltered = false,
  filterLabel = '',
}) {
  const buys = filteredOrders.filter(t => t.type === 'BUY');
  const sells = filteredOrders.filter(t => t.type === 'SELL');

  // Tổng vốn mua giải ngân
  const totalBuyCapital = buys.reduce((s, o) => s + (o.totalCost || (o.quantity * o.price)), 0);

  // Tổng tiền bán thu về
  const totalSellRevenue = sells.reduce((s, o) => s + (o.totalRevenue || (o.quantity * o.price)), 0);

  // Tổng lãi/lỗ đã chốt của các lệnh bán
  const totalRealizedPL = sells.reduce((s, o) => s + (o.profitLoss || 0), 0);
  const totalCostOfSoldShares = sells.reduce((s, o) => s + (o.totalCost || 0), 0);
  const realizedRoiPct = totalCostOfSoldShares > 0
    ? parseFloat(((totalRealizedPL / totalCostOfSoldShares) * 100).toFixed(2))
    : 0;

  // Thống kê Thắng / Thua & Kỷ luật
  const wins = sells.filter(s => (s.profitLoss || 0) > 0);
  const losses = sells.filter(s => (s.profitLoss || 0) < 0);
  const winCount = wins.length;
  const lossCount = losses.length;
  const winRate = sells.length > 0 ? ((winCount / sells.length) * 100).toFixed(1) : 0;

  const totalWinAmount = wins.reduce((s, o) => s + o.profitLoss, 0);
  const totalLossAmount = Math.abs(losses.reduce((s, o) => s + o.profitLoss, 0));
  const avgWin = winCount > 0 ? Math.round(totalWinAmount / winCount) : 0;
  const avgLoss = lossCount > 0 ? Math.round(totalLossAmount / lossCount) : 0;
  const profitFactor = totalLossAmount > 0
    ? (totalWinAmount / totalLossAmount).toFixed(2)
    : (totalWinAmount > 0 ? '∞' : '0.00');

  // Tỷ lệ dòng vốn Mua vs Bán
  const totalFlow = totalBuyCapital + totalSellRevenue;
  const buyFlowPct = totalFlow > 0 ? Math.round((totalBuyCapital / totalFlow) * 100) : 50;
  const sellFlowPct = totalFlow > 0 ? (100 - buyFlowPct) : 50;

  return (
    <div className="bg-gradient-to-br from-indigo-50/70 via-white to-slate-50/60 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 rounded-3xl p-5 sm:p-6 text-gray-900 dark:text-white shadow-sm dark:shadow-xl relative overflow-hidden border border-indigo-100 dark:border-indigo-800/40 transition-colors">
      {/* Background Ambient Glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-200/20 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-200/20 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* HÀNG 1: HEADER & PHẠM VI BỘ LỌC */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-indigo-100 dark:border-indigo-800/30">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[11px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-300 flex items-center gap-1.5">
              <span>📋</span> Sổ Cái Lịch Sử Giao Dịch
            </span>

            {isFiltered ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700/50">
                🔍 Đang lọc: {filterLabel || `${filteredOrders.length}/${allOrdersCount} lệnh`}
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-600 border border-gray-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700">
                Toàn thời gian ({allOrdersCount} lệnh)
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-3 flex-wrap">
            <span className={`text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight drop-shadow-xs break-words ${
              totalRealizedPL >= 0 ? 'text-gray-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {totalRealizedPL >= 0 ? '+' : ''}{fmtMoney(totalRealizedPL)}đ
            </span>
            <span className={`text-xs sm:text-sm font-bold px-3 py-1 rounded-full border ${
              totalRealizedPL >= 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/50'
                : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700/50'
            }`}>
              {totalRealizedPL >= 0 ? '▲ +' : '▼ '}{realizedRoiPct}% ROI Đã Chốt
            </span>
          </div>
        </div>

        {/* Thống kê vắn tắt số lượng lệnh */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <div className="bg-white/80 dark:bg-white/5 border border-indigo-100 dark:border-white/10 px-3 py-1.5 rounded-xl shadow-2xs dark:shadow-none transition-colors">
            <span className="text-gray-500 dark:text-indigo-300 text-[10px] block font-medium">Lệnh mua</span>
            <span className="font-bold text-gray-900 dark:text-white text-sm">{buys.length}</span>
          </div>
          <div className="bg-white/80 dark:bg-white/5 border border-indigo-100 dark:border-white/10 px-3 py-1.5 rounded-xl shadow-2xs dark:shadow-none transition-colors">
            <span className="text-gray-500 dark:text-indigo-300 text-[10px] block font-medium">Lệnh bán</span>
            <span className="font-bold text-gray-900 dark:text-white text-sm">{sells.length}</span>
          </div>
          <div className="bg-white/80 dark:bg-white/5 border border-indigo-100 dark:border-white/10 px-3 py-1.5 rounded-xl shadow-2xs dark:shadow-none transition-colors">
            <span className="text-gray-500 dark:text-indigo-300 text-[10px] block font-medium">Tỷ lệ thắng</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{winRate}%</span>
          </div>
        </div>
      </div>

      {/* HÀNG 2: 2 BENTO CARDS (LƯU CHUYỂN DÒNG TIỀN & THƯỚC ĐO KỶ LUẬT) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mt-4">
        {/* CARD TRÁI: DÒNG VỐN GIẢI NGÂN VS TIỀN THU VỀ */}
        <div className="bg-white/80 dark:bg-slate-900/60 rounded-2xl p-4 border border-indigo-100/80 dark:border-white/10 shadow-2xs dark:shadow-none flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="text-indigo-700 dark:text-indigo-200 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>⚖️</span> Lưu Chuyển Dòng Tiền Giao Dịch
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-900/60 dark:text-indigo-200 dark:border-indigo-700/40 font-semibold">
              {filteredOrders.length} lượt khớp
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-gray-50/80 dark:bg-slate-950/40 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 min-w-0 transition-colors">
              <span className="text-[11px] text-gray-500 dark:text-indigo-300 block">🛒 Vốn giải ngân (Mua)</span>
              <span className="font-bold text-gray-900 dark:text-white text-base sm:text-lg block truncate mt-0.5">
                {fmtMoney(totalBuyCapital)}đ
              </span>
              <span className="text-[10px] text-gray-400 dark:text-slate-400 block mt-0.5">
                {buys.length} lệnh mua
              </span>
            </div>

            <div className="bg-gray-50/80 dark:bg-slate-950/40 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 min-w-0 transition-colors">
              <span className="text-[11px] text-gray-500 dark:text-indigo-300 block">💸 Tiền thu về (Bán)</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base sm:text-lg block truncate mt-0.5">
                {fmtMoney(totalSellRevenue)}đ
              </span>
              <span className="text-[10px] text-gray-400 dark:text-slate-400 block mt-0.5">
                {sells.length} lệnh bán
              </span>
            </div>
          </div>

          {/* Capital Flow Bar */}
          <div>
            <div className="flex justify-between text-[10px] text-gray-600 dark:text-indigo-300 mb-1 font-medium">
              <span>Mua vào: {buyFlowPct}%</span>
              <span>Bán thu về: {sellFlowPct}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-slate-950/80 h-2.5 rounded-full overflow-hidden flex p-0.5 border border-gray-200 dark:border-indigo-700/40">
              <div
                style={{ width: `${buyFlowPct}%` }}
                className="bg-indigo-500 rounded-l-full transition-all duration-500"
                title={`Vốn mua: ${fmtMoney(totalBuyCapital)}đ`}
              />
              <div
                style={{ width: `${sellFlowPct}%` }}
                className="bg-emerald-500 rounded-r-full transition-all duration-500"
                title={`Thu về: ${fmtMoney(totalSellRevenue)}đ`}
              />
            </div>
          </div>
        </div>

        {/* CARD PHẢI: KỶ LUẬT GIAO DỊCH & PERFORMANCE EDGE */}
        <div className="bg-white/80 dark:bg-slate-900/60 rounded-2xl p-4 border border-indigo-100/80 dark:border-white/10 shadow-2xs dark:shadow-none flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="text-indigo-700 dark:text-indigo-200 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span>🛡️</span> Thước Đo Kỷ Luật & Hiệu Suất
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/60 dark:text-purple-200 dark:border-purple-700/40 font-semibold">
              Trading Edge
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-gray-50/80 dark:bg-slate-950/40 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 min-w-0 transition-colors">
              <span className="text-[11px] text-gray-500 dark:text-indigo-300 block">🎯 Win Rate chốt lời</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-black text-indigo-600 dark:text-indigo-400 text-lg sm:text-xl">
                  {winRate}%
                </span>
                <span className="text-[10px] text-gray-400 dark:text-slate-400">
                  ({winCount}W / {lossCount}L)
                </span>
              </div>
            </div>

            <div className="bg-gray-50/80 dark:bg-slate-950/40 p-2.5 rounded-xl border border-gray-100 dark:border-white/5 min-w-0 transition-colors">
              <span className="text-[11px] text-gray-500 dark:text-indigo-300 block">⚡ Profit Factor</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg sm:text-xl block mt-0.5">
                {profitFactor}
              </span>
            </div>
          </div>

          {/* Average Win vs Average Loss */}
          <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-[11px] bg-gray-50/80 dark:bg-slate-950/40 p-2 rounded-xl border border-gray-100 dark:border-white/5 transition-colors">
            <div>
              <span className="text-gray-500 dark:text-slate-400 block text-[9px] sm:text-[10px]">TB lệnh thắng:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-300 mt-0.5 block truncate">
                +{fmtMoney(avgWin)}đ
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400 block text-[9px] sm:text-[10px]">TB lệnh thua:</span>
              <span className="font-bold text-rose-600 dark:text-rose-300 mt-0.5 block truncate">
                -{fmtMoney(avgLoss)}đ
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
