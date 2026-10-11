import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { fmtMoney } from '../../utils/format.js';
import { computeStockPerformance } from '../../utils/stockAnalytics.js';

export default function WaterfallReturnChart({
  buyOrders = [],
  sellOrders = [],
  portfolio = [],
  dividends = [],
  marketPrices = {},
}) {
  const [mode, setMode] = useState('summary'); // 'summary' | 'stocks'

  // Tính toán số liệu tổng thể
  const holdingCost = useMemo(() => {
    return buyOrders.reduce((sum, b) => sum + ((b.remainingQty || 0) * (b.costPerShare || b.price)), 0);
  }, [buyOrders]);

  const realizedPL = useMemo(() => {
    return sellOrders.reduce((sum, s) => sum + (s.profitLoss || 0), 0);
  }, [sellOrders]);

  const totalCashDividends = useMemo(() => {
    return (dividends || [])
      .filter(d => d.type === 'CASH')
      .reduce((sum, d) => sum + (d.netAmount || 0), 0);
  }, [dividends]);

  const totalMarketVal = useMemo(() => {
    return portfolio.reduce((sum, p) => {
      const curPrice = marketPrices[p.symbol]?.price || p.avgCost;
      return sum + (p.totalQty * curPrice);
    }, 0);
  }, [portfolio, marketPrices]);

  const unrealizedPL = totalMarketVal - holdingCost;

  // Dữ liệu cho Chế độ 1: Cấu Trúc Tổng Hợp (Summary Waterfall)
  const summaryData = useMemo(() => {
    if (holdingCost <= 0 && realizedPL === 0 && totalCashDividends === 0) return [];

    let currentBase = holdingCost;
    const list = [];

    // 1. Vốn gốc đang giữ
    list.push({
      name: 'Vốn gốc',
      shortName: 'Vốn gốc',
      bottom: 0,
      value: holdingCost,
      delta: holdingCost,
      type: 'base',
      color: '#6366f1', // Indigo
      desc: 'Tổng vốn giải ngân đang nắm giữ',
    });

    // 2. Lãi/Lỗ đã chốt
    if (realizedPL !== 0) {
      const isPositive = realizedPL > 0;
      const bottom = isPositive ? currentBase : Math.max(0, currentBase + realizedPL);
      list.push({
        name: 'Đã chốt',
        shortName: 'Lãi đã chốt',
        bottom,
        value: Math.abs(realizedPL),
        delta: realizedPL,
        type: isPositive ? 'gain' : 'loss',
        color: isPositive ? '#10b981' : '#ef4444',
        desc: isPositive ? 'Lợi nhuận thực tế từ các lệnh bán' : 'Thua lỗ từ các lệnh cắt lỗ',
      });
      currentBase += realizedPL;
    }

    // 3. Lãi/Lỗ tạm tính hiện tại
    if (unrealizedPL !== 0) {
      const isPositive = unrealizedPL > 0;
      const bottom = isPositive ? currentBase : Math.max(0, currentBase + unrealizedPL);
      list.push({
        name: 'Tạm tính',
        shortName: 'Lãi tạm tính',
        bottom,
        value: Math.abs(unrealizedPL),
        delta: unrealizedPL,
        type: isPositive ? 'gain' : 'loss',
        color: isPositive ? '#10b981' : '#ef4444',
        desc: isPositive ? 'Thặng dư giá trị thị trường đang giữ' : 'Mức sụt giảm tạm tính hiện tại',
      });
      currentBase += unrealizedPL;
    }

    // 4. Cổ tức tiền mặt
    if (totalCashDividends > 0) {
      list.push({
        name: 'Cổ tức',
        shortName: 'Cổ tức tiền mặt',
        bottom: currentBase,
        value: totalCashDividends,
        delta: totalCashDividends,
        type: 'dividend',
        color: '#f59e0b', // Amber
        desc: 'Tổng cổ tức tiền mặt đã nhận về tài khoản',
      });
      currentBase += totalCashDividends;
    }

    // 5. Cột tổng kết: Tổng giá trị tài sản ròng
    const finalVal = Math.max(0, currentBase);
    list.push({
      name: 'Tài sản NAV',
      shortName: 'Tổng NAV Cổ Phiếu',
      bottom: 0,
      value: finalVal,
      delta: finalVal,
      type: 'total',
      color: '#3b82f6', // Blue
      desc: 'Tổng quy mô tài sản tích lũy',
    });

    return list;
  }, [holdingCost, realizedPL, unrealizedPL, totalCashDividends]);

  // Dữ liệu cho Chế độ 2: Đóng Góp Từng Cổ Phiếu (Per-Stock Waterfall)
  const stockData = useMemo(() => {
    if (holdingCost <= 0 && realizedPL === 0 && totalCashDividends === 0) return [];

    const perf = computeStockPerformance(buyOrders, sellOrders, dividends, marketPrices);
    const validStocks = (perf.stockList || []).filter(s => s.cumulativePL !== 0);

    // Sắp xếp: lãi nhiều nhất đến lỗ nhiều nhất
    validStocks.sort((a, b) => b.cumulativePL - a.cumulativePL);

    // Lấy tối đa 6 mã lớn nhất, còn lại gom vào "Khác"
    const topGainers = validStocks.filter(s => s.cumulativePL > 0).slice(0, 4);
    const topLosers = validStocks.filter(s => s.cumulativePL < 0).slice(-2);
    const pickedSet = new Set([...topGainers.map(s => s.symbol), ...topLosers.map(s => s.symbol)]);

    const otherCumulative = validStocks
      .filter(s => !pickedSet.has(s.symbol))
      .reduce((sum, s) => sum + s.cumulativePL, 0);

    let currentBase = holdingCost;
    const list = [];

    // Cột 1: Vốn gốc
    list.push({
      name: 'Vốn gốc',
      shortName: 'Vốn ban đầu',
      bottom: 0,
      value: holdingCost,
      delta: holdingCost,
      type: 'base',
      color: '#6366f1',
      desc: 'Tổng vốn đầu tư ban đầu',
    });

    // Các mã lãi
    topGainers.forEach(s => {
      const val = s.cumulativePL;
      list.push({
        name: s.symbol,
        shortName: `Mã ${s.symbol}`,
        bottom: currentBase,
        value: val,
        delta: val,
        type: 'gain',
        color: '#10b981',
        desc: `Đóng góp lãi từ ${s.symbol}`,
      });
      currentBase += val;
    });

    // Các mã khác (nếu có)
    if (otherCumulative !== 0) {
      const isPos = otherCumulative > 0;
      const bottom = isPos ? currentBase : Math.max(0, currentBase + otherCumulative);
      list.push({
        name: 'Mã khác',
        shortName: 'Các mã khác',
        bottom,
        value: Math.abs(otherCumulative),
        delta: otherCumulative,
        type: isPos ? 'gain' : 'loss',
        color: isPos ? '#10b981' : '#ef4444',
        desc: 'Tổng hợp các mã còn lại',
      });
      currentBase += otherCumulative;
    }

    // Các mã lỗ
    topLosers.forEach(s => {
      const val = s.cumulativePL;
      const bottom = Math.max(0, currentBase + val);
      list.push({
        name: s.symbol,
        shortName: `Mã ${s.symbol}`,
        bottom,
        value: Math.abs(val),
        delta: val,
        type: 'loss',
        color: '#ef4444',
        desc: `Khoản lỗ từ ${s.symbol}`,
      });
      currentBase += val;
    });

    // Cổ tức tiền mặt (nếu có)
    if (totalCashDividends > 0) {
      list.push({
        name: 'Cổ tức',
        shortName: 'Cổ tức tiền mặt',
        bottom: currentBase,
        value: totalCashDividends,
        delta: totalCashDividends,
        type: 'dividend',
        color: '#f59e0b',
        desc: 'Cổ tức tiền mặt đã nhận',
      });
      currentBase += totalCashDividends;
    }

    // Cột tổng kết
    const finalVal = Math.max(0, currentBase);
    list.push({
      name: 'Tài sản NAV',
      shortName: 'Tổng NAV Cổ Phiếu',
      bottom: 0,
      value: finalVal,
      delta: finalVal,
      type: 'total',
      color: '#3b82f6',
      desc: 'Tổng quy mô tài sản tích lũy',
    });

    return list;
  }, [holdingCost, realizedPL, totalCashDividends, buyOrders, sellOrders, dividends, marketPrices]);

  const activeChartData = mode === 'summary' ? summaryData : stockData;

  if (activeChartData.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400 dark:text-slate-500 text-xs">
        Chưa có dữ liệu danh mục để vẽ biểu đồ thác nước.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header Điều Khiển & Toggle Chế Độ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Dòng chảy vốn: Từ vốn giải ngân ban đầu qua các nguồn sinh lời để hình thành tài sản hiện tại
          </p>
        </div>

        {/* Toggle Chế Độ Xem */}
        <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl border border-gray-200/80 dark:border-slate-700/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode('summary')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'summary'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
            }`}
          >
            📊 Cấu Trúc Tổng Hợp
          </button>
          <button
            type="button"
            onClick={() => setMode('stocks')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mode === 'stocks'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
            }`}
          >
            🎯 Theo Từng Cổ Phiếu
          </button>
        </div>
      </div>

      {/* Biểu Đồ Thác Nước Recharts */}
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={activeChartData}
            margin={{ top: 20, right: 15, left: -5, bottom: 20 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#64748b' }}
              interval={0}
              angle={-10}
              textAnchor="end"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const d = payload[0].payload;
                  const isChange = d.type === 'gain' || d.type === 'loss' || d.type === 'dividend';
                  return (
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 text-xs min-w-[200px]">
                      <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-1.5">
                        <span className="font-bold text-gray-800 dark:text-slate-100">{d.shortName}</span>
                        <span className={`text-[10px] px-2 py-0.2 rounded-full font-extrabold ${
                          d.type === 'gain'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : d.type === 'loss'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                            : d.type === 'dividend'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300'
                        }`}>
                          {d.type === 'gain' ? '▲ Lãi' : d.type === 'loss' ? '▼ Lỗ' : d.type === 'dividend' ? '🎁 Cổ tức' : '💼 Mốc tài sản'}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-gray-400 dark:text-slate-400">{isChange ? 'Biến động:' : 'Giá trị:'}</span>
                          <span className={`font-black text-sm ${
                            d.delta > 0 && isChange
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : d.delta < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-gray-900 dark:text-slate-100'
                          }`}>
                            {d.delta > 0 && isChange ? '+' : ''}{fmtMoney(d.delta)}đ
                          </span>
                        </div>

                        <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-1 italic">
                          {d.desc}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Thanh chân đế trong suốt (Stack 1) */}
            <Bar dataKey="bottom" stackId="waterfall" fill="transparent" />

            {/* Thanh giá trị hiển thị (Stack 2) */}
            <Bar dataKey="value" stackId="waterfall" radius={[6, 6, 6, 6]}>
              {activeChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chú thích màu sắc */}
      <div className="flex items-center justify-center gap-4 text-[11px] text-gray-500 dark:text-slate-400 flex-wrap pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span>Vốn gốc</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Lợi nhuận (+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Thua lỗ (-)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Cổ tức (+)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>Tổng NAV hiện tại</span>
        </div>
      </div>
    </div>
  );
}
