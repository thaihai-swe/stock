import { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { fetchMarketValuationHistory } from '../../utils/api.js';

const PERIODS = [
  { id: '1year', label: '1Y' },
  { id: '3year', label: '3Y' },
  { id: '5year', label: '5Y' },
  { id: '10year', label: '10Y' },
];

const METRICS = [
  { id: 'absolutePe', label: 'Absolute PE', unit: 'x', isMultiplier: true },
  { id: 'pe', label: 'PE', unit: 'x', isMultiplier: true },
  { id: 'ps', label: 'PS', unit: 'x', isMultiplier: true },
  { id: 'marketCap', label: 'Market Cap', unit: 'Nghìn tỷ ₫', isCurrency: true },
  { id: 'revenue', label: 'Revenue', unit: 'Nghìn tỷ ₫', isCurrency: true },
  { id: 'earnings', label: 'Earnings', unit: 'Nghìn tỷ ₫', isCurrency: true },
];

export default function MarketValuationHistoryChart() {
  const [valuationData, setValuationData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('1year');
  const [selectedMetric, setSelectedMetric] = useState('absolutePe');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetchMarketValuationHistory();
        setValuationData(res);
      } catch (err) {
        console.error('Lỗi nạp lịch sử định giá:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const activePeriodObj = valuationData?.periods?.[selectedPeriod];
  const metricConfig = METRICS.find((m) => m.id === selectedMetric) || METRICS[0];
  const stats = activePeriodObj?.stats?.[selectedMetric] || {};
  const rawSeries = activePeriodObj?.series || [];

  // Chuẩn bị dữ liệu hiển thị biểu đồ
  const chartSeries = useMemo(() => {
    return rawSeries
      .map((p, idx) => {
        const val = p[selectedMetric];
        const dStr = p.date || '';
        const parts = dStr.split(', ');
        const dateCore = parts.length > 1 ? parts[1] : dStr;
        return {
          idx,
          dateFull: p.date,
          dateLabel: dateCore,
          value: val,
          rawStr: p[`${selectedMetric}Raw`] || (val != null ? `${val}${metricConfig.unit}` : ''),
        };
      })
      .filter((p) => p.value != null && isFinite(p.value));
  }, [rawSeries, selectedMetric, metricConfig.unit]);

  // Tính các mốc Độ Lệch Chuẩn (Mean, ±1 SD, ±2 SD) & Y-Domain
  const { yMin, yMax, meanVal, plus1Sd, plus2Sd, minus1Sd, minus2Sd, currentZScore } = useMemo(() => {
    if (!chartSeries.length) {
      return {
        yMin: 0,
        yMax: 20,
        meanVal: 14,
        plus1Sd: 15.5,
        plus2Sd: 17,
        minus1Sd: 12.5,
        minus2Sd: 11,
        currentZScore: 0,
      };
    }

    const vals = chartSeries.map((p) => p.value);
    const mean = stats.mean != null ? stats.mean : +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
    const sd = stats.stdDev != null && stats.stdDev > 0 ? stats.stdDev : 1.0;

    const p1 = +(mean + sd).toFixed(2);
    const p2 = +(mean + 2 * sd).toFixed(2);
    const m1 = +(mean - sd).toFixed(2);
    const m2 = +(mean - 2 * sd).toFixed(2);

    const allKeys = [...vals, p2, m2];
    const minVal = Math.min(...allKeys);
    const maxVal = Math.max(...allKeys);
    const range = maxVal - minVal || Math.max(Math.abs(maxVal) * 0.1, 1);

    const padMin = +(minVal - range * 0.08).toFixed(2);
    const padMax = +(maxVal + range * 0.08).toFixed(2);

    const curr = stats.current != null ? stats.current : vals[vals.length - 1];
    const z = sd > 0 ? +((curr - mean) / sd).toFixed(2) : 0;

    return {
      yMin: padMin,
      yMax: padMax,
      meanVal: mean,
      plus1Sd: p1,
      plus2Sd: p2,
      minus1Sd: m1,
      minus2Sd: m2,
      currentZScore: z,
    };
  }, [chartSeries, stats.mean, stats.stdDev, stats.current]);

  // Nhận định vị thế hiện tại theo dải Std Dev
  const currentStance = useMemo(() => {
    if (stats.current == null) return { label: 'Chưa có dữ liệu', color: 'text-gray-400', bg: 'bg-gray-100' };
    const curr = stats.current;
    if (curr <= minus2Sd) {
      return { label: 'Rất Rẻ (Dưới -2 SD)', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300' };
    }
    if (curr <= minus1Sd) {
      return { label: 'Rẻ Hấp Dẫn (-1 SD đến -2 SD)', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200' };
    }
    if (curr <= plus1Sd) {
      return { label: 'Hợp Lý (Dao Động ±1 SD)', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200' };
    }
    if (curr <= plus2Sd) {
      return { label: 'Đắt (+1 SD đến +2 SD)', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200' };
    }
    return { label: 'Rất Đắt (Vượt +2 SD)', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200' };
  }, [stats.current, minus2Sd, minus1Sd, plus1Sd, plus2Sd]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs overflow-hidden">
      {/* ── 1. HEADER & BỘ ĐIỀU KHIỂN CHU KỲ ── */}
      <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700/60">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Định Giá Chu Kỳ Lịch Sử
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200/50 dark:border-emerald-800/40">
                📊 Simply Wall St Vietnam
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
              Market Valuation and Performance
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
              Định giá thị trường chứng khoán Việt Nam qua các chu kỳ lịch sử 1Y, 3Y, 5Y, 10Y với các dải độ lệch chuẩn ±1,2 SD.
            </p>
          </div>

          {/* Controls: Tabs & Dropdown */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 self-start md:self-auto">
            {/* Period Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/80 p-1 rounded-xl">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                    selectedPeriod === p.id
                      ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Metric Dropdown */}
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="bg-gray-50 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white text-xs font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 cursor-pointer outline-hidden"
            >
              {METRICS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── 2. 4 THẺ THỐNG KÊ (CURRENT, AVERAGE, STD. DEVIATION, OBSERVATIONS) ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6">
          {/* Card 1: Current */}
          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-750/70 border border-gray-100 dark:border-gray-700/60 space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
              CURRENT
            </span>
            <div
              className={`text-2xl sm:text-3xl font-black ${
                currentZScore > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {stats.current != null ? stats.current : '—'}
              <span className="text-xs ml-1 text-gray-400 font-semibold">{metricConfig.unit}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${currentStance.bg} ${currentStance.color}`}
              >
                {currentZScore >= 0 ? `+${currentZScore} SD` : `${currentZScore} SD`}
              </span>
            </div>
          </div>

          {/* Card 2: Average */}
          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-750/70 border border-gray-100 dark:border-gray-700/60 space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
              AVERAGE (MEAN)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {stats.mean != null ? stats.mean : '—'}
              <span className="text-xs ml-1 text-gray-400 font-semibold">{metricConfig.unit}</span>
            </div>
            <span className="text-[10px] text-gray-400">Mức bình quân chu kỳ</span>
          </div>

          {/* Card 3: Std. Deviation */}
          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-750/70 border border-gray-100 dark:border-gray-700/60 space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
              STD. DEVIATION (1 SD)
            </span>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {stats.stdDev != null ? stats.stdDev : '—'}
              <span className="text-xs ml-1 text-gray-400 font-semibold">{metricConfig.unit}</span>
            </div>
            <span className="text-[10px] text-gray-400">Độ lệch chuẩn mẫu</span>
          </div>

          {/* Card 4: Observations */}
          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-750/70 border border-gray-100 dark:border-gray-700/60 space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
              OBSERVATIONS
            </span>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {stats.observations || chartSeries.length}
            </div>
            <span className="text-[10px] text-gray-400">Số mốc dữ liệu nạp</span>
          </div>
        </div>

        {/* ── THANH CHỈ BÁO CÁC MỐC ±1,2 STD DEV ── */}
        <div className="mt-4 p-3 rounded-2xl bg-gray-50/90 dark:bg-gray-700/50 border border-gray-200/60 dark:border-gray-600/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-500 dark:text-gray-300 text-[11px] uppercase tracking-wider">
              Thang Đo Chu Kỳ:
            </span>
            <span className="font-black text-xs text-indigo-600 dark:text-indigo-400">
              {currentStance.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200/60" title="Vùng Rất Rẻ">
              -2 SD: <b>{minus2Sd}{metricConfig.unit}</b>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 text-[11px] font-bold border border-cyan-200/60" title="Vùng Rẻ Hấp Dẫn">
              -1 SD: <b>{minus1Sd}{metricConfig.unit}</b>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-bold border border-amber-200/60" title="Trung Bình Chu Kỳ">
              Mean: <b>{meanVal}{metricConfig.unit}</b>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 text-[11px] font-bold border border-orange-200/60" title="Vùng Đắt">
              +1 SD: <b>{plus1Sd}{metricConfig.unit}</b>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px] font-bold border border-rose-200/60" title="Vùng Rất Đắt">
              +2 SD: <b>{plus2Sd}{metricConfig.unit}</b>
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. BIỂU ĐỒ HAI VÙNG SO VỚI MỨC TRUNG BÌNH CÙNG CÁC ĐƯỜNG ±1,2 SD ── */}
      <div className="p-4 sm:p-6">
        {loading && !chartSeries.length ? (
          <div className="h-72 sm:h-96 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400">Đang nạp dữ liệu định giá chu kỳ...</span>
          </div>
        ) : chartSeries.length > 0 ? (
          <div className="h-72 sm:h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartSeries} margin={{ top: 15, right: 20, left: -15, bottom: 0 }}>
                {/* Vùng Trên Trung Bình: Higher than average (hồng / đỏ nhạt) */}
                <ReferenceArea
                  y1={meanVal}
                  y2={yMax}
                  fill="#fca5a5"
                  fillOpacity={0.2}
                  stroke="none"
                />

                {/* Vùng Dưới Trung Bình: Lower than average (xanh mint / lục nhạt) */}
                <ReferenceArea
                  y1={yMin}
                  y2={meanVal}
                  fill="#86efac"
                  fillOpacity={0.25}
                  stroke="none"
                />

                {/* Đường +2 SD: Vùng Rất Đắt (Đỏ) */}
                <ReferenceLine
                  y={plus2Sd}
                  stroke="#f43f5e"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{
                    value: `+2 SD: ${plus2Sd}${metricConfig.unit}`,
                    position: 'insideTopRight',
                    fill: '#f43f5e',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}
                />

                {/* Đường +1 SD: Vùng Đắt (Cam) */}
                <ReferenceLine
                  y={plus1Sd}
                  stroke="#fb923c"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{
                    value: `+1 SD: ${plus1Sd}${metricConfig.unit}`,
                    position: 'insideTopRight',
                    fill: '#fb923c',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}
                />

                {/* Đường Tham Chiếu Trung Bình Lịch Sử (Vàng / Hổ phách) */}
                <ReferenceLine
                  y={meanVal}
                  stroke="#d97706"
                  strokeWidth={2}
                  label={{
                    value: `Mean: ${meanVal}${metricConfig.unit}`,
                    position: 'insideTopLeft',
                    fill: '#d97706',
                    fontSize: 11,
                    fontWeight: 'bold',
                  }}
                />

                {/* Đường -1 SD: Vùng Rẻ Hấp Dẫn (Xanh Dương / Cyan) */}
                <ReferenceLine
                  y={minus1Sd}
                  stroke="#0284c7"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{
                    value: `-1 SD: ${minus1Sd}${metricConfig.unit}`,
                    position: 'insideBottomRight',
                    fill: '#0284c7',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}
                />

                {/* Đường -2 SD: Vùng Rất Rẻ (Xanh Lục / Emerald) */}
                <ReferenceLine
                  y={minus2Sd}
                  stroke="#10b981"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{
                    value: `-2 SD: ${minus2Sd}${metricConfig.unit}`,
                    position: 'insideBottomRight',
                    fill: '#10b981',
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}
                />

                <XAxis
                  dataKey="dateLabel"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  interval="preserveStartEnd"
                  minTickGap={35}
                />
                <YAxis
                  domain={[yMin, yMax]}
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
                    const diff = stats.mean != null ? +(d.value - stats.mean).toFixed(2) : null;
                    const z = stats.stdDev && stats.stdDev > 0 ? +((d.value - stats.mean) / stats.stdDev).toFixed(2) : null;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1">
                        <div className="text-gray-400 font-medium">{d.dateFull}</div>
                        <div className="text-sm font-black text-white">
                          {metricConfig.label}: {d.value} {metricConfig.unit}
                        </div>
                        {diff != null && (
                          <div
                            className={`text-[11px] font-bold ${
                              diff >= 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            Lệch Mean: {diff > 0 ? `+${diff}` : diff} {metricConfig.unit} {z != null ? `(${z > 0 ? `+${z}` : z} SD)` : ''}
                          </div>
                        )}
                      </div>
                    );
                  }}
                />

                {/* Đường Chuỗi Dữ Liệu Thực Tế (Dark Navy / Indigo) */}
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#1e293b"
                  strokeWidth={2.4}
                  dot={false}
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                  isAnimationActive={true}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex items-center justify-center text-xs text-gray-400">
            Không có dữ liệu cho chu kỳ này.
          </div>
        )}

        {/* ── 4. CHÚ THÍCH (LEGEND) CHI TIẾT CÁC ĐƯỜNG ±1,2 SD ── */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60 text-[11px] text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span>+2 SD (Rất đắt)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
            <span>+1 SD (Đắt)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-amber-500 inline-block" />
            <span>Mean (Trung bình)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 inline-block" />
            <span>-1 SD (Rẻ)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>-2 SD (Rất rẻ)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-slate-800 dark:bg-white inline-block" />
            <span>Current series</span>
          </div>
        </div>

        {/* ── 5. FOOTER GHI CHÚ NGUỒN ── */}
        <div className="text-[11px] text-gray-400 text-center mt-3">
          Source: Google Sheets · {selectedPeriod} · {metricConfig.label} · Mean: {meanVal}{metricConfig.unit} · 1 SD: {stats.stdDev || '—'}{metricConfig.unit}
        </div>
      </div>
    </div>
  );
}
