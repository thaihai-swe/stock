import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { fetchDnseOhlc } from '../../utils/api.js';

const TIMEFRAMES = [
  { id: '1D', label: '1 ngày', resolution: '1', days: 5 },
  { id: '1M', label: '1 tháng', resolution: '1D', days: 30 },
  { id: '6M', label: '6 tháng', resolution: '1D', days: 180 },
  { id: '1Y', label: '1 năm', resolution: '1D', days: 365 },
];

export default function MarketIndexLiveChart() {
  const [activeTimeframe, setActiveTimeframe] = useState('1D');
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Nạp nến thời gian thực của VN-Index
  const loadVnIndexChart = useCallback(async (tfId) => {
    setLoading(true);
    try {
      const tf = TIMEFRAMES.find((t) => t.id === tfId) || TIMEFRAMES[0];
      const now = Math.floor(Date.now() / 1000);
      const from = now - tf.days * 86400;

      const res = await fetchDnseOhlc({
        symbol: 'VNINDEX',
        resolution: tf.resolution,
        from: String(from),
        to: String(now),
      });

      const raw = res?.data || {};
      const t = raw.t || [];
      const c = raw.c || [];
      const o = raw.o || [];
      const h = raw.h || [];
      const l = raw.l || [];
      const v = raw.v || [];

      if (!t.length) {
        setChartData([]);
        setSummary(null);
        return;
      }

      let parsedPoints = [];

      if (tf.id === '1D') {
        // Lấy ngày giao dịch gần nhất
        const lastTs = t[t.length - 1];
        const lastDateStr = new Date(lastTs * 1000).toDateString();

        for (let i = 0; i < t.length; i++) {
          const d = new Date(t[i] * 1000);
          if (d.toDateString() === lastDateStr) {
            const timeLabel = d.toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            });
            parsedPoints.push({
              ts: t[i],
              label: timeLabel,
              dateStr: d.toLocaleDateString('vi-VN'),
              open: o[i],
              high: h[i],
              low: l[i],
              close: c[i],
              volume: v[i],
            });
          }
        }
      } else {
        parsedPoints = t.map((timestamp, i) => {
          const d = new Date(timestamp * 1000);
          return {
            ts: timestamp,
            label: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
            dateStr: d.toLocaleDateString('vi-VN'),
            open: o[i],
            high: h[i],
            low: l[i],
            close: c[i],
            volume: v[i],
          };
        });
      }

      setChartData(parsedPoints);

      // Cập nhật summary VN-Index
      const n = parsedPoints.length;
      if (n > 0) {
        const firstPrice = parsedPoints[0].open || parsedPoints[0].close;
        const currentPrice = parsedPoints[n - 1].close;
        const change = +(currentPrice - firstPrice).toFixed(2);
        const changePercent = firstPrice ? +((change / firstPrice) * 100).toFixed(2) : 0;
        const allCloses = parsedPoints.map((p) => p.close);

        setSummary({
          symbol: 'VNINDEX',
          name: 'Chỉ Số VN-Index',
          current: currentPrice,
          change,
          changePercent,
          firstPrice,
          high: Math.max(...allCloses),
          low: Math.min(...allCloses),
          totalVolume: parsedPoints.reduce((acc, p) => acc + (p.volume || 0), 0),
        });
      }
    } catch (err) {
      console.error('Lỗi nạp nến VN-Index:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVnIndexChart(activeTimeframe);
  }, [activeTimeframe, loadVnIndexChart]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadVnIndexChart(activeTimeframe);
    setRefreshing(false);
  };

  const isPositive = (summary?.change || 0) >= 0;
  const strokeColor = isPositive ? '#10b981' : '#f43f5e';

  // Tính miền Y-axis
  const yDomain = useMemo(() => {
    if (!chartData.length) return ['auto', 'auto'];
    const closes = chartData.map((d) => d.close).filter(Boolean);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const padding = Math.max((max - min) * 0.1, 1);
    return [+(min - padding).toFixed(2), +(max + padding).toFixed(2)];
  }, [chartData]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs overflow-hidden">
      {/* ── 1. HEADER & THỜI ĐIỂM CẬP NHẬT ── */}
      <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Thị Trường Trực Tuyến
              </span>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold border border-amber-200/50 dark:border-amber-800/40">
                ⚡ DNSE Live Feed
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1 flex items-center gap-2">
              <span>📈</span> Diễn Biến Chỉ Số VN-Index
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Timeframe Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/80 p-1 rounded-xl">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setActiveTimeframe(tf.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTimeframe === tf.id
                      ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>
        </div>

        {/* ── 2. HERO TICKER STATS CHO RIÊNG VN-INDEX ── */}
        {summary && (
          <div className="flex flex-wrap items-baseline gap-4 sm:gap-6 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700/40">
            <div>
              <span className="text-xs text-gray-400 block font-medium">VNINDEX (HOSE)</span>
              <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                {Number(summary.current).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-lg sm:text-xl font-black ${
                  isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {summary.change > 0 ? `+${summary.change}` : summary.change}
              </span>
              <span
                className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                  isPositive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/50'
                }`}
              >
                {summary.changePercent > 0 ? `+${summary.changePercent}%` : `${summary.changePercent}%`}
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 ml-auto">
              <div>
                <span>Thấp nhất: </span>
                <b className="text-gray-700 dark:text-gray-300">{summary.low}</b>
              </div>
              <span>•</span>
              <div>
                <span>Cao nhất: </span>
                <b className="text-gray-700 dark:text-gray-300">{summary.high}</b>
              </div>
              {summary.totalVolume > 0 && (
                <>
                  <span>•</span>
                  <div>
                    <span>Khối lượng: </span>
                    <b className="text-gray-700 dark:text-gray-300">
                      {Number(summary.totalVolume).toLocaleString('vi-VN')} CP
                    </b>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 3. BIỂU ĐỒ DIỄN BIẾN VN-INDEX (RECHARTS AREA CHART) ── */}
      <div className="p-4 sm:p-6">
        {loading && !chartData.length ? (
          <div className="h-64 sm:h-80 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Đang nạp nến VN-Index...</span>
          </div>
        ) : chartData.length > 0 ? (
          <div className="h-64 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="vnIndexGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={strokeColor} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={strokeColor} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={25}
                />
                <YAxis
                  domain={yDomain}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  orientation="right"
                  tickFormatter={(v) => Number(v).toFixed(1)}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1">
                        <div className="text-gray-400 font-medium">
                          {d.dateStr} {d.label}
                        </div>
                        <div className="text-base font-black text-white">
                          VN-Index: {Number(d.close).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        {d.volume > 0 && (
                          <div className="text-[11px] text-gray-300">
                            Khối lượng: {Number(d.volume).toLocaleString('vi-VN')} CP
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke={strokeColor}
                  strokeWidth={2}
                  fill="url(#vnIndexGradient)"
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-xs text-gray-400">
            Không có dữ liệu nến cho khung thời gian này.
          </div>
        )}
      </div>
    </div>
  );
}
