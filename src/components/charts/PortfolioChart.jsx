import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { fmtMoney, PORTFOLIO_COLORS, getStockSector, SECTOR_COLORS } from '../../utils/format.js';

export default function PortfolioChart({ portfolio = [], fundamentalsMap = {}, marketPrices = {} }) {
  // 'stock-cost': Theo Mã (Vốn gốc) | 'stock-market': Theo Mã (Thị giá) | 'sector': Theo Ngành (GICS)
  const [mode, setMode] = useState('stock-cost');

  if (!portfolio || portfolio.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-slate-500">
        <span className="text-3xl mb-1">🥧</span>
        <p className="text-sm">Chưa có cổ phiếu nào trong danh mục</p>
      </div>
    );
  }

  // 1. Tổng vốn gốc
  const totalCostAll = useMemo(() => {
    return portfolio.reduce((sum, item) => sum + (item.totalCost || 0), 0);
  }, [portfolio]);

  // 2. Tổng giá trị thị trường
  const totalMarketValAll = useMemo(() => {
    return portfolio.reduce((sum, item) => {
      const livePrice = marketPrices?.[item.symbol]?.price;
      const effectivePrice = livePrice || item.avgCost || (item.totalQty > 0 ? item.totalCost / item.totalQty : 0);
      return sum + (item.totalQty * effectivePrice);
    }, 0);
  }, [portfolio, marketPrices]);

  // Dữ liệu theo từng mã (Vốn gốc)
  const stockCostData = useMemo(() => {
    return portfolio.map((item, index) => ({
      name: item.symbol,
      value: item.totalCost,
      qty: item.totalQty,
      avgCost: item.avgCost,
      pct: totalCostAll > 0 ? ((item.totalCost / totalCostAll) * 100).toFixed(1) : 0,
      color: PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length],
    }));
  }, [portfolio, totalCostAll]);

  // Dữ liệu theo từng mã (Thị giá thực tế)
  const stockMarketData = useMemo(() => {
    return portfolio.map((item, index) => {
      const livePrice = marketPrices?.[item.symbol]?.price;
      const effectivePrice = livePrice || item.avgCost || (item.totalQty > 0 ? item.totalCost / item.totalQty : 0);
      const marketVal = item.totalQty * effectivePrice;
      return {
        name: item.symbol,
        value: marketVal,
        qty: item.totalQty,
        livePrice,
        pct: totalMarketValAll > 0 ? ((marketVal / totalMarketValAll) * 100).toFixed(1) : 0,
        color: PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length],
      };
    });
  }, [portfolio, marketPrices, totalMarketValAll]);

  // Dữ liệu gom nhóm theo nhóm ngành (GICS)
  const sectorData = useMemo(() => {
    const map = {};
    for (const item of portfolio) {
      const sectorInfo = getStockSector(item.symbol, fundamentalsMap);
      const key = sectorInfo.name;
      const livePrice = marketPrices?.[item.symbol]?.price;
      const effectivePrice = livePrice || item.avgCost || (item.totalQty > 0 ? item.totalCost / item.totalQty : 0);
      const itemVal = item.totalQty * effectivePrice;

      if (!map[key]) {
        map[key] = {
          name: key,
          icon: sectorInfo.icon,
          color: sectorInfo.color || SECTOR_COLORS[key] || '#64748b',
          value: 0,
          costVal: 0,
          symbols: [],
        };
      }
      map[key].value += itemVal;
      map[key].costVal += item.totalCost;
      map[key].symbols.push(item.symbol);
    }

    return Object.values(map)
      .sort((a, b) => b.value - a.value)
      .map(s => ({
        ...s,
        pct: totalMarketValAll > 0 ? ((s.value / totalMarketValAll) * 100).toFixed(1) : 0,
      }));
  }, [portfolio, fundamentalsMap, marketPrices, totalMarketValAll]);

  const activeData = useMemo(() => {
    if (mode === 'stock-market') return stockMarketData;
    if (mode === 'sector') return sectorData;
    return stockCostData;
  }, [mode, stockCostData, stockMarketData, sectorData]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      if (mode === 'sector') {
        return (
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-lg border border-gray-100 dark:border-slate-800 text-xs">
            <p className="font-bold text-gray-800 dark:text-slate-100 text-sm flex items-center gap-1.5">
              <span>{item.icon}</span> {item.name}
            </p>
            <p className="text-gray-600 dark:text-slate-300 mt-1">
              Các mã: <b className="text-indigo-600 dark:text-indigo-400">{item.symbols?.join(', ')}</b>
            </p>
            <p className="text-gray-600 dark:text-slate-300">
              Thị giá: <b>{fmtMoney(item.value)}đ</b>
            </p>
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Tỷ trọng ngành: <b>{item.pct}%</b>
            </p>
          </div>
        );
      }
      if (mode === 'stock-market') {
        return (
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-lg border border-gray-100 dark:border-slate-800 text-xs">
            <p className="font-bold text-gray-800 dark:text-slate-100 text-sm">{item.name}</p>
            <p className="text-gray-600 dark:text-slate-300 mt-1">Số lượng: <b>{item.qty?.toLocaleString()} cp</b></p>
            {item.livePrice && (
              <p className="text-gray-500 dark:text-slate-400">Thị giá: <b>{fmtMoney(item.livePrice)}đ</b></p>
            )}
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold">Giá trị thị trường: <b>{fmtMoney(item.value)}đ</b></p>
            <p className="text-gray-500 dark:text-slate-400">Tỷ trọng: <b>{item.pct}%</b></p>
          </div>
        );
      }
      return (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-lg border border-gray-100 dark:border-slate-800 text-xs">
          <p className="font-bold text-gray-800 dark:text-slate-100 text-sm">{item.name}</p>
          <p className="text-gray-600 dark:text-slate-300 mt-1">Số lượng: <b>{item.qty?.toLocaleString()} cp</b></p>
          <p className="text-indigo-600 dark:text-indigo-400">Giá trị vốn: <b>{fmtMoney(item.value)}đ</b></p>
          <p className="text-gray-500 dark:text-slate-400">Tỷ trọng: <b>{item.pct}%</b></p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {/* Thanh Toggle Chế Độ Phân Bổ: 3 Tùy Chọn */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <span className="text-xs text-gray-400 dark:text-slate-400">
          {mode === 'sector'
            ? `Phân bổ qua ${sectorData.length} nhóm ngành kinh tế`
            : mode === 'stock-market'
            ? `Tổng thị giá: ${fmtMoney(totalMarketValAll)}đ (${portfolio.length} mã)`
            : `Tổng vốn gốc: ${fmtMoney(totalCostAll)}đ (${portfolio.length} mã)`}
        </span>
        <div className="inline-flex bg-gray-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs gap-0.5">
          <button
            type="button"
            onClick={() => setMode('stock-cost')}
            className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
              mode === 'stock-cost'
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            title="Xem tỷ trọng theo vốn đã giải ngân"
          >
            🏷️ Vốn Gốc
          </button>
          <button
            type="button"
            onClick={() => setMode('stock-market')}
            className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
              mode === 'stock-market'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            title="Xem tỷ trọng theo giá trị thị trường hiện tại"
          >
            📈 Thị Giá
          </button>
          <button
            type="button"
            onClick={() => setMode('sector')}
            className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
              mode === 'sector'
                ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
            title="Xem tỷ trọng theo 10 nhóm ngành GICS"
          >
            🏭 Nhóm Ngành
          </button>
        </div>
      </div>

      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={activeData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {activeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={40}
              formatter={(value, entry) => (
                <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">
                  {entry.payload.icon ? `${entry.payload.icon} ` : ''}{value} ({entry.payload.pct}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
