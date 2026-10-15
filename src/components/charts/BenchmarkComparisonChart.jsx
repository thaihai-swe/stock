import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { fetchDnseOhlc } from '../../utils/api.js';
import { computeBenchmarkComparison } from '../../utils/stockAnalytics.js';
import { useChartTheme } from '../../utils/useChartTheme.js';
import { fmtMoney } from '../../utils/format.js';

const TIMEFRAME_PRESETS = [
  { id: '1M', label: '1 Tháng', days: 30 },
  { id: '3M', label: '3 Tháng', days: 90 },
  { id: '6M', label: '6 Tháng', days: 180 },
  { id: 'YTD', label: 'Từ đầu năm', days: null },
  { id: '1Y', label: '1 Năm', days: 365 },
  { id: 'ALL', label: 'Toàn bộ', days: null },
];

export default function BenchmarkComparisonChart({
  buyOrders = [],
  sellOrders = [],
  dividends = [],
  portfolio = [],
  marketPrices = {},
  fundamentalsMap = {},
}) {
  const [timeframe, setTimeframe] = useState('1Y');
  const [vnindexCandles, setVnindexCandles] = useState(null);
  const [loading, setLoading] = useState(false);
  const chartTheme = useChartTheme();

  // Tải dữ liệu nến ngày VN-Index từ DNSE API
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const nowSec = Math.floor(Date.now() / 1000);
    // Lấy 3 năm gần nhất để bao phủ đủ các chu kỳ (1M, 3M, 6M, YTD, 1Y, ALL)
    const fromSec = nowSec - (3 * 365 * 86400);

    fetchDnseOhlc({
      symbol: 'VNINDEX',
      resolution: '1D',
      from: String(fromSec),
      to: String(nowSec),
    })
      .then((res) => {
        if (!isMounted) return;
        if (res?.data?.t && res.data.t.length > 0) {
          setVnindexCandles(res.data);
        } else if (res?.t && res.t.length > 0) {
          setVnindexCandles(res);
        }
      })
      .catch((err) => {
        console.warn('Không thể tải nến VN-Index:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Tính toán chuỗi dữ liệu đối chiếu và chỉ số định lượng
  const comparisonData = useMemo(() => {
    return computeBenchmarkComparison({
      buyOrders,
      sellOrders,
      dividends,
      portfolio,
      marketPrices,
      fundamentalsMap,
      vnindexData: vnindexCandles,
      timeframe,
    });
  }, [buyOrders, sellOrders, dividends, portfolio, marketPrices, fundamentalsMap, vnindexCandles, timeframe]);

  const { timeline = [], summary = {} } = comparisonData;

  const {
    portfolioReturn = 0,
    benchmarkReturn = 0,
    alpha = 0,
    outperformed = false,
    portfolioBeta = 1.0,
    correlation = 1.0,
    winRateDaysPct = 100,
    maxDrawdownPortfolio = 0,
    maxDrawdownBenchmark = 0,
    initialVnindex = 0,
    latestVnindex = 0,
  } = summary;

  // Custom Tooltip tinh tế hiển thị cả Điểm số & Tỷ suất
  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    const isOutperforming = d.alpha >= 0;

    return (
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 text-xs space-y-1.5 min-w-[220px]">
        <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-slate-800">
          <span className="font-extrabold text-gray-800 dark:text-slate-100 text-sm">
            📅 {d.date}
          </span>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              isOutperforming
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
            }`}
          >
            {isOutperforming ? '🏆 Vượt trội' : '⚠️ Kém hơn'}
          </span>
        </div>

        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 inline-block" />
              Danh mục của bạn:
            </span>
            <span className={`font-mono font-black ${d.portfolioReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {d.portfolioReturn >= 0 ? '+' : ''}{d.portfolioReturn.toFixed(2)}%
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              VN-Index:
            </span>
            <span className="font-mono font-bold text-gray-700 dark:text-slate-300">
              {d.vnindexPoint?.toLocaleString()} ({d.vnindexReturn >= 0 ? '+' : ''}{d.vnindexReturn.toFixed(2)}%)
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1 border-t border-dashed border-gray-100 dark:border-slate-800 text-[11px]">
            <span className="text-gray-400 dark:text-slate-500">Chênh lệch (Alpha):</span>
            <span className={`font-mono font-black ${d.alpha >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {d.alpha >= 0 ? '+' : ''}{d.alpha.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. THANH ĐIỀU HƯỚNG CHU KỲ (TIMEFRAME SELECTOR) & TRẠNG THÁI */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-gray-200/70 dark:border-slate-700/60 text-xs">
            {TIMEFRAME_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setTimeframe(p.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  timeframe === p.id
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {loading && (
            <span className="text-[11px] text-gray-400 dark:text-slate-500 animate-pulse flex items-center gap-1">
              <span>⏳</span> Đang đồng bộ nến VN-Index...
            </span>
          )}
        </div>

        {/* Huy hiệu kết luận tổng quát */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-black px-3 py-1 rounded-xl border flex items-center gap-1.5 ${
              outperformed
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
            }`}
          >
            <span>{outperformed ? '🏆' : '⚠️'}</span>
            <span>
              {outperformed
                ? `Alpha: +${alpha.toFixed(2)}% (Thắng Thị Trường)`
                : `Alpha: ${alpha.toFixed(2)}% (Kém Thị Trường)`}
            </span>
          </span>
        </div>
      </div>

      {/* 2. LƯỚI 4 THẺ KPI ĐỊNH LƯỢNG (PORTFOLIO, VNINDEX, ALPHA, BETA & CORRELATION) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* KPI 1: Lợi nhuận Danh mục */}
        <div className="bg-gray-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-gray-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            Lợi Nhuận Danh Mục
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-lg sm:text-xl font-black font-mono ${portfolioReturn >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {portfolioReturn >= 0 ? '+' : ''}{portfolioReturn.toFixed(2)}%
            </span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
            Tổng vốn: {fmtMoney(summary.totalInvested || 0)}đ
          </p>
        </div>

        {/* KPI 2: Lợi nhuận VN-Index */}
        <div className="bg-gray-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-gray-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            VN-Index Benchmark
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-lg sm:text-xl font-black font-mono ${benchmarkReturn >= 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400'}`}>
              {benchmarkReturn >= 0 ? '+' : ''}{benchmarkReturn.toFixed(2)}%
            </span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
            {initialVnindex?.toFixed(1)} ➔ {latestVnindex?.toFixed(1)} điểm
          </p>
        </div>

        {/* KPI 3: Thặng dư Alpha */}
        <div className="bg-gray-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-gray-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
            Thặng Dư Alpha (α)
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-lg sm:text-xl font-black font-mono ${alpha >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {alpha >= 0 ? '+' : ''}{alpha.toFixed(2)}%
            </span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
            {outperformed ? 'Vượt trội chỉ số chuẩn' : 'Chưa vượt được chỉ số'}
          </p>
        </div>

        {/* KPI 4: Beta & Tương quan */}
        <div className="bg-gray-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-gray-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wider">
            Beta (β) & Tương Quan (r)
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg sm:text-xl font-black font-mono text-gray-800 dark:text-slate-100">
              {portfolioBeta}x
            </span>
            <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">
              (r = {correlation})
            </span>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
            {portfolioBeta > 1.1 ? 'Biến động mạnh hơn TT' : (portfolioBeta < 0.9 ? 'Phòng thủ êm hơn TT' : 'Tương đồng biến động TT')}
          </p>
        </div>
      </div>

      {/* 3. BIỂU ĐỒ RECHARTS DIỆN TÍCH & ĐƯỜNG */}
      <div className="h-[340px] sm:h-[380px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartTheme.primaryLine || '#6366f1'} stopOpacity={0.35} />
                <stop offset="95%" stopColor={chartTheme.primaryLine || '#6366f1'} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.gridColor} />

            <XAxis
              dataKey="dateLabel"
              tickLine={false}
              axisLine={{ stroke: chartTheme.axisColor }}
              tick={{ fill: chartTheme.textMuted, fontSize: 11 }}
              minTickGap={25}
            />

            <YAxis
              tickLine={false}
              axisLine={{ stroke: chartTheme.axisColor }}
              tick={{ fill: chartTheme.textMuted, fontSize: 11 }}
              tickFormatter={(val) => `${val >= 0 ? '+' : ''}${val}%`}
              domain={['auto', 'auto']}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: '12px', fontSize: '12px', fontWeight: 'bold' }}
            />

            {/* Đường mốc tham chiếu 0% */}
            <ReferenceLine
              y={0}
              stroke={chartTheme.isDark ? '#475569' : '#94a3b8'}
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />

            {/* 1. Đường VN-Index (Thị trường chung) */}
            <Area
              type="monotone"
              dataKey="vnindexReturn"
              name="VN-Index (Thị trường chung)"
              stroke="#f59e0b"
              strokeWidth={2.2}
              fill="transparent"
              dot={false}
              activeDot={{ r: 5, fill: '#f59e0b' }}
            />

            {/* 2. Đường Danh Mục Đầu Tư Của Bạn (Với gradient bóng mờ) */}
            <Area
              type="monotone"
              dataKey="portfolioReturn"
              name="Danh mục của bạn"
              stroke={chartTheme.primaryLine || '#6366f1'}
              strokeWidth={2.8}
              fill="url(#portfolioGradient)"
              dot={false}
              activeDot={{ r: 6, fill: chartTheme.primaryLine || '#6366f1' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 4. FOOTER: THÔNG SỐ ĐO LƯỜNG RỦI RO & KHẢ NĂNG CHỊU ĐỰNG SỤT GIẢM (DRAWDOWN) */}
      <div className="pt-3 border-t border-gray-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
          <span className="text-base">🎯</span>
          <span>
            Tỷ lệ phiên thắng (Outperformance Days): <b className="text-gray-800 dark:text-slate-100">{winRateDaysPct}%</b>
          </span>
        </div>

        <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
          <span className="text-base">📉</span>
          <span>
            Sụt giảm tối đa (Max Drawdown):{' '}
            <b className="text-gray-800 dark:text-slate-100">
              Danh mục -{maxDrawdownPortfolio}% / VN-Index -{maxDrawdownBenchmark}%
            </b>
          </span>
        </div>

        <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500 sm:justify-end">
          <span>💡</span>
          <span>Chuẩn hóa 0.00% tại mốc bắt đầu.</span>
        </div>
      </div>
    </div>
  );
}
