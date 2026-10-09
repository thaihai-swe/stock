import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { fmtMoney } from '../../utils/format.js';

export default function MonthlyPLChart({ sellOrders = [] }) {
  if (!sellOrders || sellOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <span className="text-3xl mb-1">📊</span>
        <p className="text-sm">Chưa có giao dịch bán nào để thống kê lãi/lỗ</p>
      </div>
    );
  }

  // Gom nhóm theo tháng (YYYY-MM)
  const map = {};
  for (const s of sellOrders) {
    if (!s.date) continue;
    const ym = s.date.slice(0, 7); // 'YYYY-MM'
    if (!map[ym]) {
      map[ym] = { ym, profitLoss: 0, count: 0, revenue: 0 };
    }
    map[ym].profitLoss += s.profitLoss || 0;
    map[ym].revenue += s.totalRevenue || (s.quantity * s.price);
    map[ym].count += 1;
  }

  const sortedKeys = Object.keys(map).sort();
  const data = sortedKeys.map(key => {
    const [year, month] = key.split('-');
    return {
      monthLabel: `${month}/${year}`,
      profitLoss: Math.round(map[key].profitLoss),
      count: map[key].count,
      revenue: Math.round(map[key].revenue),
    };
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const isPositive = d.profitLoss >= 0;
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-xs">
          <p className="font-bold text-gray-800 text-sm">Tháng {d.monthLabel}</p>
          <p className="text-gray-500 mt-1">Số lệnh chốt: <b>{d.count}</b></p>
          <p className={`font-bold mt-0.5 ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
            Lãi/Lỗ: {isPositive ? '+' : ''}{fmtMoney(d.profitLoss)}đ
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
          <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickFormatter={(val) => {
              if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
              if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
              return val;
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="profitLoss" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell
                key={`bar-${index}`}
                fill={entry.profitLoss >= 0 ? '#10b981' : '#ef4444'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
