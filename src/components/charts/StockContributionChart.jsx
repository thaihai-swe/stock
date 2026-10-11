import { useState, useMemo } from 'react';
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
import { computeStockPerformance } from '../../utils/stockAnalytics.js';
import { fmtMoney, plColor } from '../../utils/format.js';

export default function StockContributionChart({
  buyOrders = [],
  sellOrders = [],
  dividends = [],
  marketPrices = {},
  onSelectSymbol = null,
}) {
  const [metricUnit, setMetricUnit] = useState('amount'); // 'amount' (VNĐ) | 'roi' (%)
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'holding' | 'closed'

  // Tính toán chỉ số tích luỹ từng mã qua engine chuẩn
  const analytics = useMemo(() => {
    return computeStockPerformance(buyOrders, sellOrders, dividends, marketPrices);
  }, [buyOrders, sellOrders, dividends, marketPrices]);

  const { stockList, topProfitStock, topLossStock } = analytics;

  // Lọc và sắp xếp danh sách mã
  const chartData = useMemo(() => {
    if (!stockList || stockList.length === 0) return [];

    let filtered = stockList;
    if (statusFilter === 'holding') {
      filtered = stockList.filter(s => s.isHolding);
    } else if (statusFilter === 'closed') {
      filtered = stockList.filter(s => !s.isHolding);
    }

    // Sắp xếp giảm dần theo chỉ số được chọn
    return [...filtered]
      .map(s => {
        const val = metricUnit === 'amount' ? Math.round(s.cumulativePL) : s.roiPct;
        return {
          symbol: s.symbol,
          value: val,
          cumulativePL: s.cumulativePL,
          roiPct: s.roiPct,
          realizedPL: s.realizedPL,
          unrealizedPL: s.unrealizedPL,
          cashDividends: s.cashDividends,
          isHolding: s.isHolding,
          holdingQty: s.holdingQty,
          totalInvested: s.totalInvested,
          totalTrades: s.totalTrades,
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [stockList, statusFilter, metricUnit]);

  if (!stockList || stockList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-52 text-gray-400">
        <span className="text-3xl mb-1">🎯</span>
        <p className="text-sm">Chưa có dữ liệu giao dịch để phân rã đóng góp hiệu suất</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const isPos = d.cumulativePL >= 0;
      return (
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 text-xs min-w-[220px]">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-1.5 mb-2">
            <span className="font-extrabold text-base text-gray-900 dark:text-slate-100">{d.symbol}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              d.isHolding
                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800'
                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
            }`}>
              {d.isHolding ? `Đang giữ ${d.holdingQty.toLocaleString()} cp` : 'Đã tất toán'}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-gray-500 dark:text-slate-400">Tổng lãi/lỗ toàn thời gian:</span>
              <span className={`font-extrabold ${isPos ? 'text-green-600 dark:text-emerald-400' : 'text-red-500 dark:text-rose-400'}`}>
                {isPos ? '+' : ''}{fmtMoney(d.cumulativePL)}đ
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <span className="text-gray-500 dark:text-slate-400">Tỷ suất sinh lời (ROI):</span>
              <span className={`font-bold ${d.roiPct >= 0 ? 'text-green-600 dark:text-emerald-400' : 'text-red-500 dark:text-rose-400'}`}>
                {d.roiPct >= 0 ? '+' : ''}{d.roiPct}%
              </span>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-slate-800 text-[11px] space-y-1 text-gray-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span>• Lãi đã chốt:</span>
                <span className={plColor(d.realizedPL)}>{d.realizedPL >= 0 ? '+' : ''}{fmtMoney(d.realizedPL)}đ</span>
              </div>
              {d.isHolding && (
                <div className="flex justify-between">
                  <span>• Lãi tạm tính:</span>
                  <span className={plColor(d.unrealizedPL)}>{d.unrealizedPL >= 0 ? '+' : ''}{fmtMoney(d.unrealizedPL)}đ</span>
                </div>
              )}
              {d.cashDividends > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>• Cổ tức nhận:</span>
                  <span>+{fmtMoney(d.cashDividends)}đ</span>
                </div>
              )}
            </div>

            {onSelectSymbol && (
              <p className="pt-1.5 text-[10px] text-indigo-500 dark:text-indigo-400 italic text-center">
                👉 Nhấn để xem chi tiết sổ cái giao dịch
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const chartHeight = Math.max(260, Math.min(480, chartData.length * 36));

  return (
    <div className="w-full">
      {/* Header Điều Khiển & Bộ Lọc Đa Tầng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        {/* Điểm Nổi Bật Gainers / Losers */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {topProfitStock && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
              <span>🚀 Top 1 Lãi:</span>
              <b>{topProfitStock.symbol}</b>
              <span className="text-[11px] font-semibold">({topProfitStock.roiPct >= 0 ? '+' : ''}{topProfitStock.roiPct}%)</span>
            </span>
          )}
          {topLossStock && (
            <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-lg border border-rose-100 dark:border-rose-800/50">
              <span>🔻 Lỗ nhiều nhất:</span>
              <b>{topLossStock.symbol}</b>
              <span className="text-[11px] font-semibold">({topLossStock.roiPct}%)</span>
            </span>
          )}
        </div>

        {/* Thanh Toggle Bộ Lọc & Đơn Vị Đo Lường */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Lọc Trạng Thái */}
          <div className="inline-flex bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2 py-0.5 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Tất cả ({stockList.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('holding')}
              className={`px-2 py-0.5 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                statusFilter === 'holding'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Đang giữ ({stockList.filter(s => s.isHolding).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('closed')}
              className={`px-2 py-0.5 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                statusFilter === 'closed'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Đã chốt ({stockList.filter(s => !s.isHolding).length})
            </button>
          </div>

          {/* Đổi Đơn Vị Đo Lường VNĐ / % ROI */}
          <div className="inline-flex bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setMetricUnit('amount')}
              className={`px-2.5 py-0.5 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                metricUnit === 'amount'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              💰 Số Tiền (đ)
            </button>
            <button
              type="button"
              onClick={() => setMetricUnit('roi')}
              className={`px-2.5 py-0.5 rounded-lg font-semibold text-[11px] transition-all cursor-pointer ${
                metricUnit === 'roi'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              📈 % ROI
            </button>
          </div>
        </div>
      </div>

      {/* Biểu Đồ Thanh Ngang Phân Rã Đóng Góp */}
      <div style={{ height: `${chartHeight}px` }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <ReferenceLine x={0} stroke="#9ca3af" strokeDasharray="3 3" />
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickFormatter={(val) => {
                if (metricUnit === 'roi') return `${val}%`;
                if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
                if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}k`;
                return val;
              }}
              axisLine={{ stroke: '#e5e7eb' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="symbol"
              tick={{ fontSize: 11, fontWeight: 'bold', fill: '#4b5563' }}
              axisLine={false}
              tickLine={false}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              radius={[0, 4, 4, 0]}
              cursor={onSelectSymbol ? 'pointer' : 'default'}
              onClick={(entry) => {
                if (onSelectSymbol && entry?.symbol) {
                  onSelectSymbol(entry.symbol);
                }
              }}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.value >= 0 ? '#10b981' : '#ef4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
