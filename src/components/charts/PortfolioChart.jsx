import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fmtMoney, PORTFOLIO_COLORS } from '../../utils/format.js';

export default function PortfolioChart({ portfolio = [] }) {
  if (!portfolio || portfolio.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <span className="text-3xl mb-1">🥧</span>
        <p className="text-sm">Chưa có cổ phiếu nào trong danh mục</p>
      </div>
    );
  }

  const totalAll = portfolio.reduce((sum, item) => sum + item.totalCost, 0);

  const data = portfolio.map(item => ({
    name: item.symbol,
    value: item.totalCost,
    qty: item.totalQty,
    pct: totalAll > 0 ? ((item.totalCost / totalAll) * 100).toFixed(1) : 0,
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-lg border border-gray-100 dark:border-slate-800 text-xs">
          <p className="font-bold text-gray-800 dark:text-slate-100 text-sm">{item.name}</p>
          <p className="text-gray-600 dark:text-slate-300 mt-1">Số lượng: <b>{item.qty.toLocaleString()} cp</b></p>
          <p className="text-indigo-600 dark:text-indigo-400">Giá trị vốn: <b>{fmtMoney(item.value)}đ</b></p>
          <p className="text-gray-500 dark:text-slate-400">Tỷ trọng: <b>{item.pct}%</b></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry) => (
              <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                {value} ({entry.payload.pct}%)
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
