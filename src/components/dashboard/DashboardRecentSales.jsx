import { fmtMoney, plColor, plBg } from '../../utils/format.js';
import { TIMEFRAME_IDS } from '../../utils/timeframe.js';

export default function DashboardRecentSales({
  sellOrders = [],
  timeWindow = TIMEFRAME_IDS.ALL,
  periodLabel = 'Toàn Thời Gian',
  onSwitchTab,
}) {
  if (!sellOrders || sellOrders.length === 0) return null;

  const recentList = [...sellOrders].reverse().slice(0, 5);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 p-5 sm:p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h3 className="font-extrabold text-gray-800 dark:text-slate-100 text-sm sm:text-base flex items-center gap-2">
              <span>💹</span> Lệnh Bán Gần Nhất
            </h3>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              5 giao dịch chốt lời/cắt lỗ gần nhất {timeWindow !== TIMEFRAME_IDS.ALL ? `(${periodLabel})` : ''}
            </p>
          </div>

          {onSwitchTab && (
            <button
              type="button"
              onClick={() => onSwitchTab('history')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Xem tất cả ({sellOrders.length})</span>
              <span>→</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-gray-100 dark:divide-slate-800/80">
          {recentList.map((s) => {
            const avgCost = s.quantity > 0 ? (s.totalCost / s.quantity) : 0;
            const isProfit = (s.profitLoss || 0) >= 0;

            return (
              <div
                key={s.id}
                className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-gray-50/50 dark:hover:bg-slate-800/30 rounded-xl px-2 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900/40 shrink-0">
                    {s.symbol}
                  </span>
                  <div className="min-w-0">
                    <span className="font-bold text-gray-800 dark:text-slate-200 block truncate">
                      {s.quantity.toLocaleString()} cp @ {fmtMoney(s.price)}đ
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 block truncate">
                      Giá vốn: {fmtMoney(avgCost)}đ
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`font-black text-xs ${plColor(s.profitLoss)}`}>
                    {isProfit ? '+' : ''}{fmtMoney(s.profitLoss)}đ
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full inline-block mt-0.5 ${plBg(s.profitLoss)}`}>
                    {s.profitLossPct >= 0 ? '▲ +' : '▼ '}{s.profitLossPct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
