import { useState, useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { analyzeStrategies } from '../utils/strategyAnalytics.js';
import { fmtMoney, fmtDate, plColor, plBg, DISCIPLINE_TAGS } from '../utils/format.js';
import { fetchPrices } from '../utils/api.js';

const PIE_COLORS = [
  '#4f46e5', // indigo
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#3b82f6', // blue
  '#14b8a6', // teal
  '#6366f1', // violet
];

export default function StrategyAnalytics({ data, initialMarketPrices = {} }) {
  const { buyOrders = [], sellOrders = [], portfolio = [] } = data;
  const [marketPrices, setMarketPrices] = useState(initialMarketPrices);
  const [selectedTag, setSelectedTag] = useState(null);
  const [drilldownTab, setDrilldownTab] = useState('closed'); // 'closed' | 'active'

  useEffect(() => {
    if (portfolio.length > 0) {
      const symbols = portfolio.map(p => p.symbol);
      fetchPrices(symbols, false)
        .then(res => {
          if (res?.prices) setMarketPrices(res.prices);
        })
        .catch(() => {});
    }
  }, [portfolio]);

  // Tính toán toàn bộ chỉ số từ engine
  const analytics = useMemo(() => {
    return analyzeStrategies(buyOrders, sellOrders, marketPrices);
  }, [buyOrders, sellOrders, marketPrices]);

  const {
    strategyList,
    totalAllClosed,
    overallWinRate,
    overallRealizedPL,
    totalHoldingCapital,
    topProfitStrategy,
    topWinRateStrategy,
    topHoldingStrategy,
    insights,
  } = analytics;

  // Dữ liệu cho Biểu đồ Cột Lãi/Lỗ
  const barChartData = useMemo(() => {
    return strategyList
      .filter(s => s.totalClosed > 0)
      .map(s => ({
        tag: s.tag,
        profitLoss: s.totalRealizedPL,
        winRate: s.winRate,
        count: s.totalClosed,
      }));
  }, [strategyList]);

  // Dữ liệu cho Biểu đồ Tròn Phân Bổ Vốn
  const pieChartData = useMemo(() => {
    return strategyList
      .filter(s => s.activeCapital > 0)
      .map(s => ({
        name: s.tag,
        value: s.activeCapital,
        symbols: s.activeSymbols.join(', '),
        pct: totalHoldingCapital > 0 ? ((s.activeCapital / totalHoldingCapital) * 100).toFixed(1) : 0,
      }));
  }, [strategyList, totalHoldingCapital]);

  // Chi tiết của tag đang được chọn để drill-down
  const activeStrategyDetail = useMemo(() => {
    if (!selectedTag) return null;
    return strategyList.find(s => s.tag === selectedTag) || null;
  }, [selectedTag, strategyList]);

  // Thống kê nhật ký tâm lý & điểm kỷ luật từ các lệnh bán
  const disciplineStats = useMemo(() => {
    const map = {};
    DISCIPLINE_TAGS.forEach(d => {
      map[d.name] = {
        ...d,
        count: 0,
        winCount: 0,
        totalPL: 0,
      };
    });

    let evaluatedCount = 0;
    let positiveCount = 0;

    sellOrders.forEach(order => {
      if (!order.tags || !Array.isArray(order.tags)) return;
      order.tags.forEach(t => {
        if (map[t]) {
          map[t].count += 1;
          const pl = order.profitLoss !== undefined ? order.profitLoss : (order.realizedPL || 0);
          map[t].totalPL += pl;
          if (pl > 0) {
            map[t].winCount += 1;
          }
          evaluatedCount += 1;
          if (t === '🎯 Đạt mục tiêu' || t === '🛑 Cắt lỗ chuẩn' || t === '🔄 Đảo hàng') {
            positiveCount += 1;
          }
        }
      });
    });

    const disciplineScore = evaluatedCount > 0
      ? Math.round((positiveCount / evaluatedCount) * 100)
      : null;

    return {
      evaluatedCount,
      positiveCount,
      disciplineScore,
      items: Object.values(map),
    };
  }, [sellOrders]);

  if (strategyList.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm max-w-2xl mx-auto">
        <span className="text-5xl block mb-3">🎯</span>
        <h3 className="text-lg font-bold text-gray-800">Chưa có dữ liệu chiến lược</h3>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
          Hãy gắn các <b>🏷️ Thẻ nhật ký</b> (như <i>Tích sản, Lướt sóng, Breakout, Bắt đáy...</i>) khi nhập lệnh mua hoặc bán để hệ thống tự động đo lường tỷ lệ thắng và hiệu quả đầu tư của từng phương pháp.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 rounded-3xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-3xl p-2 bg-white/10 rounded-2xl">🎯</span>
              <div>
                <h2 className="text-xl font-bold">Phân Tích Hiệu Suất Chiến Lược & Tags</h2>
                <p className="text-indigo-100 text-xs mt-0.5">
                  Đo lường tỷ lệ thắng (Win Rate), tỷ lệ Thưởng/Rủi ro và mức sinh lời của từng phương pháp giao dịch
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-2xl border border-white/10 text-xs">
            <div>
              <span className="text-indigo-200">Hiệu suất toàn danh mục:</span>
              <div className="font-bold text-sm">
                Win Rate: <span className="text-emerald-300">{overallWinRate}%</span> · Lãi đã chốt:&nbsp;
                <span className={overallRealizedPL >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                  {overallRealizedPL >= 0 ? '+' : ''}{fmtMoney(overallRealizedPL)}đ
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Thẻ KPI Tinh Hoa */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Sinh lời tốt nhất */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            🏆 Lợi Nhuận Cao Nhất
          </p>
          {topProfitStrategy ? (
            <div>
              <div className="font-bold text-gray-900 text-base flex items-center gap-1.5 truncate">
                <span className="text-indigo-600">#{topProfitStrategy.tag}</span>
              </div>
              <div className="text-emerald-600 font-bold text-lg mt-0.5">
                +{fmtMoney(topProfitStrategy.totalRealizedPL)}đ
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                Win Rate: {topProfitStrategy.winRate}% ({topProfitStrategy.winCount}/{topProfitStrategy.totalClosed})
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 mt-2">Chưa có lệnh chốt lời</div>
          )}
        </div>

        {/* KPI 2: Tỷ lệ thắng cao nhất */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            🎯 Tỷ Lệ Thắng Tốt Nhất
          </p>
          {topWinRateStrategy ? (
            <div>
              <div className="font-bold text-gray-900 text-base truncate">
                <span className="text-indigo-600">#{topWinRateStrategy.tag}</span>
              </div>
              <div className="text-indigo-600 font-bold text-lg mt-0.5">
                {topWinRateStrategy.winRate}%
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                {topWinRateStrategy.winCount} thắng / {topWinRateStrategy.totalClosed} lệnh chốt
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 mt-2">Chưa có dữ liệu</div>
          )}
        </div>

        {/* KPI 3: Vốn đang giữ nhiều nhất */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            💼 Vốn Giải Ngân Lớn Nhất
          </p>
          {topHoldingStrategy ? (
            <div>
              <div className="font-bold text-gray-900 text-base truncate">
                <span className="text-indigo-600">#{topHoldingStrategy.tag}</span>
              </div>
              <div className="text-gray-900 font-bold text-lg mt-0.5">
                {fmtMoney(topHoldingStrategy.activeCapital)}đ
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                {topHoldingStrategy.activeSymbols.length} mã: {topHoldingStrategy.activeSymbols.join(', ')}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-400 mt-2">Không có vị thế mở</div>
          )}
        </div>

        {/* KPI 4: Tổng lệnh đã chốt */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            📋 Tổng Lệnh Đã Chốt
          </p>
          <div className="text-gray-900 font-bold text-lg mt-1">
            {totalAllClosed} giao dịch
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Qua {strategyList.length} phong cách đầu tư
          </div>
        </div>
      </div>

      {/* Actionable Insights / Nhận xét kỷ luật */}
      {insights.length > 0 && (
        <div className="space-y-2.5">
          {insights.map((item, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-4 border text-xs flex items-start gap-3 shadow-2xs ${
                item.type === 'success'
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : item.type === 'warning'
                  ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                  : 'bg-blue-50/80 border-blue-200 text-blue-900'
              }`}
            >
              <span className="text-xl mt-0.5">{item.icon}</span>
              <div className="flex-1">
                <h4 className="font-bold text-sm">{item.title}</h4>
                <p className="mt-0.5 leading-relaxed opacity-90">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2 Biểu Đồ Trực Quan */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Biểu đồ Cột: So sánh Lãi/Lỗ theo Chiến Lược */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <span>📊</span> Lãi / Lỗ Đã Chốt Theo Chiến Lược
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              So sánh mức sinh lời thực tế giữa các phương pháp
            </p>
          </div>

          {barChartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-gray-400 h-64">
              Chưa có lệnh bán nào để vẽ biểu đồ lãi/lỗ
            </div>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <XAxis
                    dataKey="tag"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={v => `${(v / 1000).toLocaleString('vi-VN')}k`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        const isWin = d.profitLoss >= 0;
                        return (
                          <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-xs">
                            <p className="font-bold text-gray-800 text-sm">Chiến lược: #{d.tag}</p>
                            <p className="text-gray-500 mt-1">Số lệnh chốt: <b>{d.count}</b></p>
                            <p className="text-gray-500">Tỷ lệ thắng: <b>{d.winRate}%</b></p>
                            <p className={`font-bold mt-1 text-sm ${isWin ? 'text-emerald-600' : 'text-red-500'}`}>
                              Lãi/Lỗ: {isWin ? '+' : ''}{fmtMoney(d.profitLoss)}đ
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="profitLoss" radius={[6, 6, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.profitLoss >= 0 ? '#10b981' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Biểu đồ Tròn: Phân Bổ Vốn Đang Nắm Giữ */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <span>🥧</span> Cơ Cấu Vốn Đang Nắm Giữ Theo Chiến Lược
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Tỷ trọng vốn đang giải ngân vào từng phong cách
            </p>
          </div>

          {pieChartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-gray-400 h-64">
              Không có vị thế nắm giữ nào đang mở
            </div>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-xs">
                            <p className="font-bold text-indigo-700 text-sm">#{item.name}</p>
                            <p className="text-gray-600 mt-1">Vốn đang giữ: <b>{fmtMoney(item.value)}đ</b></p>
                            <p className="text-gray-500">Tỷ trọng: <b>{item.pct}%</b></p>
                            {item.symbols && <p className="text-gray-400 text-[11px] mt-0.5">Mã: {item.symbols}</p>}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Bảng Xếp Hạng Toàn Bộ Chiến Lược */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-gray-800 text-base flex items-center gap-2">
              <span>📋</span> Bảng Hiệu Suất Chi Tiết Theo Chiến Lược ({strategyList.length})
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Bấm vào từng dòng để xem danh sách chi tiết các lệnh mua & bán tương ứng
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5">Chiến Lược (Tag)</th>
                <th className="text-center px-4 py-3.5">Số Lệnh Chốt</th>
                <th className="text-center px-4 py-3.5">Tỷ Lệ Thắng (Win Rate)</th>
                <th className="text-right px-4 py-3.5">Tổng Lãi/Lỗ Đã Chốt</th>
                <th className="text-right px-4 py-3.5">Lãi TB / Lệnh</th>
                <th className="text-center px-4 py-3.5">Tỷ Lệ Lãi:Lỗ</th>
                <th className="text-right px-4 py-3.5">Vốn Đang Giữ</th>
                <th className="text-right px-4 py-3.5">Lãi/Lỗ Tạm Tính</th>
                <th className="text-center px-4 py-3.5">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {strategyList.map(item => {
                const isSelected = selectedTag === item.tag;
                const winRateBadgeColor =
                  item.totalClosed === 0
                    ? 'bg-gray-100 text-gray-500'
                    : item.winRate >= 60
                    ? 'bg-emerald-100 text-emerald-800 font-bold'
                    : item.winRate >= 45
                    ? 'bg-amber-100 text-amber-800 font-bold'
                    : 'bg-red-100 text-red-700 font-bold';

                return (
                  <tr
                    key={item.tag}
                    onClick={() => setSelectedTag(isSelected ? null : item.tag)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50/70' : 'hover:bg-gray-50/70'
                    }`}
                  >
                    {/* Tên Thẻ */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-700 text-sm bg-indigo-50 px-2.5 py-1 rounded-xl">
                          #{item.tag}
                        </span>
                      </div>
                    </td>

                    {/* Lệnh đã chốt */}
                    <td className="px-4 py-4 text-center">
                      {item.totalClosed > 0 ? (
                        <div>
                          <span className="font-semibold text-gray-800">{item.totalClosed}</span>
                          <div className="text-[11px] text-gray-400">
                            {item.winCount}W - {item.lossCount}L
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">0</span>
                      )}
                    </td>

                    {/* Win Rate */}
                    <td className="px-4 py-4 text-center">
                      {item.totalClosed > 0 ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${winRateBadgeColor}`}>
                          {item.winRate}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Lãi / Lỗ Đã Chốt */}
                    <td className="px-4 py-4 text-right">
                      {item.totalClosed > 0 ? (
                        <span className={`font-bold text-sm ${plColor(item.totalRealizedPL)}`}>
                          {item.totalRealizedPL >= 0 ? '+' : ''}{fmtMoney(item.totalRealizedPL)}đ
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Lãi TB / Lệnh */}
                    <td className="px-4 py-4 text-right">
                      {item.totalClosed > 0 ? (
                        <span className={`text-xs font-semibold ${plColor(item.avgPLPerTrade)}`}>
                          {item.avgPLPerTrade >= 0 ? '+' : ''}{fmtMoney(item.avgPLPerTrade)}đ
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Tỷ lệ Lãi:Lỗ (Win:Loss) */}
                    <td className="px-4 py-4 text-center">
                      {item.totalClosed > 0 && item.winLossRatio > 0 ? (
                        <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                          {item.winLossRatio === 99.9 ? 'Tuyệt đối' : `${item.winLossRatio} : 1`}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Vốn Đang Giữ */}
                    <td className="px-4 py-4 text-right">
                      {item.activeCapital > 0 ? (
                        <div>
                          <span className="font-semibold text-gray-800 text-xs">
                            {fmtMoney(item.activeCapital)}đ
                          </span>
                          {item.activeSymbols.length > 0 && (
                            <div className="text-[10px] text-gray-400">
                              {item.activeSymbols.join(', ')}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Lãi / Lỗ Tạm Tính */}
                    <td className="px-4 py-4 text-right">
                      {item.activeCapital > 0 ? (
                        <div>
                          <span className={`font-semibold text-xs ${plColor(item.activeUnrealizedPL)}`}>
                            {item.activeUnrealizedPL >= 0 ? '+' : ''}{fmtMoney(item.activeUnrealizedPL)}đ
                          </span>
                          <span className={`text-[10px] ml-1 px-1.5 py-0.2 rounded-full ${plBg(item.activeUnrealizedPL)}`}>
                            {item.activeUnrealizedPLPct >= 0 ? '+' : ''}{item.activeUnrealizedPLPct}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>

                    {/* Nút Xem Chi Tiết */}
                    <td className="px-4 py-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTag(isSelected ? null : item.tag);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                        }`}
                      >
                        {isSelected ? 'Ẩn' : '🔍 Xem'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🧠 Thống Kê Tâm Lý & Điểm Kỷ Luật Giao Dịch */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <span>🧠</span> Nhật Ký Đánh Giá Tâm Lý & Kỷ Luật Giao Dịch
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Tự soi xét tâm lý khi chốt lệnh giúp kiểm soát cảm xúc, nâng cao kỷ luật cá nhân
            </p>
          </div>

          <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Điểm Kỷ Luật
              </div>
              <div className="text-sm font-bold text-gray-800">
                {disciplineStats.disciplineScore !== null ? (
                  <span className={disciplineStats.disciplineScore >= 70 ? 'text-emerald-600' : disciplineStats.disciplineScore >= 50 ? 'text-amber-600' : 'text-red-500'}>
                    {disciplineStats.disciplineScore}%
                  </span>
                ) : (
                  <span className="text-gray-400 text-xs">Chưa đủ dữ liệu</span>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500 border-l border-gray-200 pl-3">
              {disciplineStats.evaluatedCount > 0 ? (
                <><b>{disciplineStats.positiveCount}</b> / {disciplineStats.evaluatedCount} lệnh chuẩn kỷ luật</>
              ) : (
                <>Gắn thẻ tâm lý khi bán để đo lường</>
              )}
            </div>
          </div>
        </div>

        {/* 6 Psychological Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {disciplineStats.items.map(item => {
            const hasData = item.count > 0;
            const winRate = hasData ? Math.round((item.winCount / item.count) * 100) : 0;
            return (
              <div
                key={item.name}
                className={`p-4 rounded-2xl border transition-all ${
                  hasData
                    ? 'bg-gray-50/60 border-gray-200 hover:border-gray-300 shadow-2xs'
                    : 'bg-white border-gray-100 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${item.color}`}>
                    {item.name}
                  </span>
                  <span className="text-xs font-bold text-gray-600 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                    {item.count} lệnh
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-2 line-clamp-1">
                  {item.desc}
                </p>

                {hasData ? (
                  <div className="mt-3 pt-2.5 border-t border-gray-200/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Lãi/Lỗ ròng</span>
                      <span className={`font-bold ${plColor(item.totalPL)}`}>
                        {item.totalPL >= 0 ? '+' : ''}{fmtMoney(item.totalPL)}đ
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">Tỷ lệ thắng</span>
                      <span className="font-bold text-gray-700">{winRate}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 pt-2.5 border-t border-gray-100 text-[11px] text-gray-300 italic">
                    Chưa có giao dịch gắn nhãn này
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Drill-down Chi Tiết Giao Dịch Của Tag Được Chọn */}
      {activeStrategyDetail && (
        <div className="bg-white rounded-3xl p-6 border-2 border-indigo-200 shadow-md animate-in fade-in duration-200 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <span>🔍</span> Chi Tiết Giao Dịch: <span className="text-indigo-600">#{activeStrategyDetail.tag}</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Xem toàn bộ lịch sử lệnh mua và bán gắn với chiến lược này
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Tabs chuyển giữa Lệnh chốt & Vị thế đang giữ */}
              <button
                type="button"
                onClick={() => setDrilldownTab('closed')}
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  drilldownTab === 'closed'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                💸 Lệnh Đã Chốt ({activeStrategyDetail.totalClosed})
              </button>
              <button
                type="button"
                onClick={() => setDrilldownTab('active')}
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  drilldownTab === 'active'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🛒 Vị Thế Đang Giữ ({activeStrategyDetail.activeLots.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className="text-gray-400 hover:text-gray-600 text-sm p-1 ml-2"
                title="Đóng chi tiết"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Nội dung Tab: Lệnh Đã Chốt */}
          {drilldownTab === 'closed' && (
            activeStrategyDetail.closedTrades.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Chiến lược này chưa có lệnh bán chốt lời/lỗ nào.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2.5">Ngày Bán</th>
                      <th className="text-left px-4 py-2.5">Mã CP</th>
                      <th className="text-right px-4 py-2.5">Số Lượng</th>
                      <th className="text-right px-4 py-2.5">Giá Bán</th>
                      <th className="text-right px-4 py-2.5">Lãi / Lỗ</th>
                      <th className="text-right px-4 py-2.5">% Tỷ Suất</th>
                      <th className="text-left px-4 py-2.5">Ghi Chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeStrategyDetail.closedTrades.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50/80">
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(s.date)}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                            {s.symbol}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-700">{s.quantity.toLocaleString()} cp</td>
                        <td className="px-4 py-2.5 text-right font-medium text-gray-700">{fmtMoney(s.price)}đ</td>
                        <td className="px-4 py-2.5 text-right font-bold">
                          <span className={plColor(s.profitLoss)}>
                            {s.profitLoss >= 0 ? '+' : ''}{fmtMoney(s.profitLoss)}đ
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`px-2 py-0.5 rounded-full font-bold ${plBg(s.profitLoss)}`}>
                            {s.profitLossPct >= 0 ? '+' : ''}{s.profitLossPct}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">{s.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* Nội dung Tab: Vị Thế Đang Giữ */}
          {drilldownTab === 'active' && (
            activeStrategyDetail.activeLots.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Chiến lược này hiện không còn cổ phiếu nào đang nắm giữ.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2.5">Ngày Mua</th>
                      <th className="text-left px-4 py-2.5">Mã CP</th>
                      <th className="text-right px-4 py-2.5">Số Lượng Còn</th>
                      <th className="text-right px-4 py-2.5">Giá Vốn</th>
                      <th className="text-right px-4 py-2.5">Tổng Vốn</th>
                      <th className="text-right px-4 py-2.5">Giá Thị Trường</th>
                      <th className="text-left px-4 py-2.5">Ghi Chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeStrategyDetail.activeLots.map(b => {
                      const curPrice = marketPrices[b.symbol]?.price;
                      return (
                        <tr key={b.id} className="hover:bg-gray-50/80">
                          <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(b.date)}</td>
                          <td className="px-4 py-2.5">
                            <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                              {b.symbol}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-700">{b.remainingQty.toLocaleString()} cp</td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-700">{fmtMoney(b.costPerShare || b.price)}đ</td>
                          <td className="px-4 py-2.5 text-right font-bold text-gray-800">
                            {fmtMoney(b.remainingQty * (b.costPerShare || b.price))}đ
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {curPrice ? (
                              <span className="font-bold text-blue-700">{fmtMoney(curPrice)}đ</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">{b.note || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
