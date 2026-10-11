import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { fmtMoney, plColor } from '../../utils/format.js';
import { useChartTheme } from '../../utils/useChartTheme.js';

export default function MonthlyPLChart({ sellOrders = [], dividends = [] }) {
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'cumulative'
  const chartTheme = useChartTheme();

  if (!sellOrders || sellOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <span className="text-3xl mb-1">📊</span>
        <p className="text-sm">Chưa có giao dịch bán nào để thống kê lãi/lỗ</p>
      </div>
    );
  }

  // 1. Gom nhóm theo tháng (YYYY-MM)
  const monthlyData = useMemo(() => {
    const map = {};

    for (const s of sellOrders) {
      if (!s.date) continue;
      const ym = s.date.slice(0, 7); // 'YYYY-MM'
      if (!map[ym]) {
        map[ym] = { ym, profitLoss: 0, count: 0, revenue: 0, cashDividend: 0 };
      }
      map[ym].profitLoss += s.profitLoss || 0;
      map[ym].revenue += s.totalRevenue || (s.quantity * s.price);
      map[ym].count += 1;
    }

    // Kết hợp cổ tức tiền mặt theo tháng (nếu có)
    for (const d of dividends) {
      if (!d.date || d.type !== 'CASH') continue;
      const ym = d.date.slice(0, 7);
      if (map[ym]) {
        map[ym].cashDividend += d.netAmount || 0;
      }
    }

    const sortedKeys = Object.keys(map).sort();
    let runningCumulative = 0;

    return sortedKeys.map(key => {
      const [year, month] = key.split('-');
      const pl = Math.round(map[key].profitLoss);
      runningCumulative += pl;

      return {
        key,
        monthLabel: `${month}/${year}`,
        profitLoss: pl,
        count: map[key].count,
        revenue: Math.round(map[key].revenue),
        cashDividend: Math.round(map[key].cashDividend),
        cumulativePL: runningCumulative,
      };
    });
  }, [sellOrders, dividends]);

  // Thông số thống kê nhanh
  const stats = useMemo(() => {
    if (monthlyData.length === 0) return { bestMonth: null, finalCumulative: 0, totalClosed: 0 };
    let best = monthlyData[0];
    let totalClosed = 0;
    for (const m of monthlyData) {
      if (m.profitLoss > best.profitLoss) best = m;
      totalClosed += m.count;
    }
    const finalCumulative = monthlyData[monthlyData.length - 1].cumulativePL;
    return { bestMonth: best, finalCumulative, totalClosed };
  }, [monthlyData]);

  // Custom Tooltip cho chế độ Từng Tháng
  const MonthlyTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const isPositive = d.profitLoss >= 0;
      return (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-lg border border-gray-100 dark:border-slate-800 text-xs">
          <p className="font-bold text-gray-800 dark:text-slate-100 text-sm">Tháng {d.monthLabel}</p>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Số lệnh chốt: <b>{d.count}</b></p>
          <p className={`font-bold mt-0.5 ${isPositive ? 'text-green-600 dark:text-emerald-400' : 'text-red-500 dark:text-rose-400'}`}>
            Lãi/Lỗ: {isPositive ? '+' : ''}{fmtMoney(d.profitLoss)}đ
          </p>
          {d.cashDividend > 0 && (
            <p className="text-emerald-600 dark:text-emerald-400 mt-0.5">
              Cổ tức: +{fmtMoney(d.cashDividend)}đ
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip cho chế độ Lũy Kế
  const CumulativeTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const isCumulativePos = d.cumulativePL >= 0;
      const isMonthPos = d.profitLoss >= 0;
      return (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-lg border border-gray-100 dark:border-slate-800 text-xs">
          <p className="font-bold text-gray-800 dark:text-slate-100 text-sm">Tháng {d.monthLabel}</p>
          <div className="mt-1.5 space-y-1">
            <p className={`font-extrabold text-sm ${isCumulativePos ? 'text-green-600 dark:text-emerald-400' : 'text-red-500 dark:text-rose-400'}`}>
              Lũy kế: {isCumulativePos ? '+' : ''}{fmtMoney(d.cumulativePL)}đ
            </p>
            <p className="text-gray-600 dark:text-slate-300">
              Tháng này: <b className={isMonthPos ? 'text-green-600 dark:text-emerald-400' : 'text-red-500 dark:text-rose-400'}>
                {isMonthPos ? '+' : ''}{fmtMoney(d.profitLoss)}đ
              </b> ({d.count} lệnh chốt)
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const isCumulativeFinalPos = stats.finalCumulative >= 0;

  return (
    <div className="w-full">
      {/* Header Điều Khiển & Chỉ Số Tóm Tắt */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-gray-400 dark:text-slate-400">
            {viewMode === 'monthly' ? (
              <>Thống kê qua <b>{monthlyData.length}</b> tháng ({stats.totalClosed} lệnh chốt)</>
            ) : (
              <>Lũy kế toàn thời gian: <b className={isCumulativeFinalPos ? 'text-green-600 dark:text-emerald-400' : 'text-red-500 dark:text-rose-400'}>{isCumulativeFinalPos ? '+' : ''}{fmtMoney(stats.finalCumulative)}đ</b></>
            )}
          </span>
          {stats.bestMonth && viewMode === 'cumulative' && (
            <span className="hidden sm:inline-flex items-center text-[11px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-800/50">
              🏆 Tháng đỉnh: {stats.bestMonth.monthLabel} (+{fmtMoney(stats.bestMonth.profitLoss)}đ)
            </span>
          )}
        </div>

        {/* Thanh Toggle Chế Độ Xem */}
        <div className="inline-flex bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setViewMode('monthly')}
            className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
              viewMode === 'monthly'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            📊 Từng Tháng
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cumulative')}
            className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
              viewMode === 'cumulative'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            📈 Lũy Kế (Equity Curve)
          </button>
        </div>
      </div>

      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'monthly' ? (
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <ReferenceLine y={0} stroke={chartTheme.axisColor} strokeDasharray="3 3" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11, fill: chartTheme.textColor }}
                axisLine={{ stroke: chartTheme.axisColor }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: chartTheme.textColor }}
                tickFormatter={(val) => {
                  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
                  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
                  return val;
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<MonthlyTooltip />} />
              <Bar dataKey="profitLoss" radius={[4, 4, 0, 0]}>
                {monthlyData.map((entry, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={entry.profitLoss >= 0 ? chartTheme.successColor : chartTheme.dangerColor}
                  />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <AreaChart data={monthlyData} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="colorCumulativePos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartTheme.successColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={chartTheme.successColor} stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorCumulativeNeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartTheme.dangerColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={chartTheme.dangerColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <ReferenceLine y={0} stroke={chartTheme.axisColor} strokeDasharray="3 3" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 11, fill: chartTheme.textColor }}
                axisLine={{ stroke: chartTheme.axisColor }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: chartTheme.textColor }}
                tickFormatter={(val) => {
                  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
                  if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
                  return val;
                }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CumulativeTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulativePL"
                stroke={isCumulativeFinalPos ? '#10b981' : '#ef4444'}
                strokeWidth={2.5}
                fill={isCumulativeFinalPos ? 'url(#colorCumulativePos)' : 'url(#colorCumulativeNeg)'}
                dot={{ r: 3, fill: isCumulativeFinalPos ? '#10b981' : '#ef4444' }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
