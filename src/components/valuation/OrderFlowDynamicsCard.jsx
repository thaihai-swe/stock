import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
  Cell
} from 'recharts';
import { useChartTheme } from '../../utils/useChartTheme.js';
import { formatVND, formatPercent } from '../../utils/format.js';
import { ORDER_SIZE_TIERS } from '../../utils/constants.js';
import { refreshStockOrderFlow } from '../../utils/api.js';
import IntelligenceBadge from '../common/IntelligenceBadge.jsx';

// Định dạng khối lượng cổ phiếu (cp)
function formatShares(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Math.abs(Number(val));
  const sign = Number(val) < 0 ? '-' : (Number(val) > 0 ? '+' : '');
  if (num >= 1_000_000) {
    return `${sign}${(num / 1_000_000).toFixed(2)}M cp`;
  }
  if (num >= 1_000) {
    return `${sign}${(num / 1_000).toFixed(1)}k cp`;
  }
  return `${sign}${num.toLocaleString('vi-VN')} cp`;
}

// Định dạng giá trị tỷ đồng
function formatBillion(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)} Tỷ đ`;
}

/**
 * OrderFlowDynamicsCard.jsx
 * Phân Hệ Giám Sát Cán Cân Lệnh Cá Mập vs Nhỏ Lẻ & Dòng Tiền Chủ Động (Aggressive Order Flow & CVD)
 * Hỗ trợ 2 chế độ:
 * 1. ⏱️ Trong Phiên Hôm Nay (Intraday 1D): Nến 1m, BVC Delta, CVD, Top 15 Lệnh Khủng
 * 2. 📅 Xu Hướng 10 Phiên (Multi-Day 10D / 2 Tuần): CVD tích lũy đa phiên, Chu kỳ Gom/Xả Cá Mập
 */
export default function OrderFlowDynamicsCard({ orderFlow: propOrderFlow, financials, symbol, currentPrice }) {
  const chartTheme = useChartTheme();
  const [timeframeMode, setTimeframeMode] = useState('intraday'); // 'intraday' | 'multiday'
  const [refreshing, setRefreshing] = useState(false);
  const [localData, setLocalData] = useState(null);

  const sym = (symbol || financials?._meta?.symbol || 'STOCK').toUpperCase();

  // Dữ liệu order flow (ưu tiên localData sau khi refresh, kế đến propOrderFlow hoặc financials.orderFlow)
  const activeFlow = useMemo(() => {
    return localData || propOrderFlow || financials?.orderFlow || null;
  }, [localData, propOrderFlow, financials]);

  // Làm mới nhanh dòng lệnh trong phiên
  const handleRefreshFlow = async () => {
    if (refreshing || !sym) return;
    setRefreshing(true);
    try {
      const res = await refreshStockOrderFlow(sym);
      if (res?.data) {
        setLocalData(res.data);
      }
    } catch (err) {
      console.warn('Lỗi làm mới order flow:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Trích xuất các trường tóm tắt & dữ liệu biểu đồ
  const summary = activeFlow?.summary || {};
  const intraday = activeFlow?.intraday || {};
  const multiDay = activeFlow?.multiDay || {};

  const wdiScore = Number(summary.whaleDominanceIndex ?? 55);
  const primaryRegime = summary.primaryRegime || 'Cán Cân Giằng Co Cân Bằng';
  const actionableBias = summary.actionableBias || 'THEO DÕI NẮM GIỮ';

  // Lựa chọn chuỗi dữ liệu cho biểu đồ theo chế độ
  const chartData = useMemo(() => {
    if (timeframeMode === 'intraday') {
      const list = intraday.chartSeries || [];
      // Lấy tối đa 120 điểm nến gần nhất để biểu đồ thanh thoát
      return list.length > 120 ? list.slice(-120) : list;
    }
    return multiDay.chartSeries || [];
  }, [timeframeMode, intraday, multiDay]);

  // Phân rã quy mô 3 tầng: kết hợp config động từ ORDER_SIZE_TIERS
  const tierMatrix = useMemo(() => {
    const rawBreakdown = intraday.sizeBreakdown || [];
    const breakdownMap = {};
    rawBreakdown.forEach(item => {
      if (item.tierId) breakdownMap[item.tierId] = item;
    });

    return ORDER_SIZE_TIERS.map(tierDef => {
      const data = breakdownMap[tierDef.id] || {};
      return {
        ...tierDef,
        buyVol: data.buyVol || 0,
        sellVol: data.sellVol || 0,
        netDelta: data.netDelta || 0,
        netValueBillion: data.netValueBillion || 0,
        buyRatio: data.buyRatio != null ? data.buyRatio : 50.0,
        totalSharePct: data.totalSharePct || 0
      };
    });
  }, [intraday]);

  // Màu sắc badge WDI
  const getWdiColor = (score) => {
    if (score >= 70) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    if (score <= 40) return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-800';
    return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-800';
  };

  // Tín hiệu phân kỳ tiếng Việt
  const getDivergenceLabel = (signal) => {
    switch (signal) {
      case 'BULLISH_ABSORPTION':
        return { label: '🛡️ Hấp Thụ Mua Ngầm (Bullish Absorption)', color: 'text-emerald-600 dark:text-emerald-400' };
      case 'BEARISH_DISTRIBUTION':
        return { label: '⚠️ Kéo Xả Phân Phối (Bearish Distribution)', color: 'text-rose-600 dark:text-rose-400' };
      case 'MARKUP_EXPANSION':
        return { label: '🚀 Đồng Thuận Đẩy Giá (Markup Expansion)', color: 'text-indigo-600 dark:text-indigo-400' };
      default:
        return { label: '⚖️ Cân Bằng / Luân Chuyển Dòng Tiền', color: 'text-gray-600 dark:text-gray-300' };
    }
  };

  const divInfo = getDivergenceLabel(summary.divergenceSignal);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-6">
      {/* ── HEADER & BỘ ĐIỀU HƯỚNG CHẾ ĐỘ ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
        <div>
          <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2 flex-wrap">
            <span className="text-base">🦈</span>
            <span>Vi Cấu Trúc Khớp Lệnh & Dòng Tiền Lớn</span>
            <IntelligenceBadge
              type="heuristic"
              tooltip="Mô hình BVC Bulk Volume Classification & Cumulative Volume Delta (CVD) theo dõi lệnh Cá Mập vs Nhỏ Lẻ"
            />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            Cán Cân Lệnh Cá Mập vs Nhỏ Lẻ & Dòng Tiền Chủ Động (Order Flow & CVD)
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Phân tích lực Mua/Bán ăn thẳng dư lệnh (Aggressive Order Flow), bóc trần dấu chân tích lũy hay kéo xả của Smart Money.
          </p>
        </div>

        {/* Nút Chuyển Chế Độ 1D / 10D & Làm Mới Realtime */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          {/* Bộ Toggle Chế Độ */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTimeframeMode('intraday')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeframeMode === 'intraday'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
              }`}
            >
              ⏱️ Trong Phiên (1D)
            </button>
            <button
              type="button"
              onClick={() => setTimeframeMode('multiday')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeframeMode === 'multiday'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
              }`}
            >
              📅 Xu Hướng 10 Phiên (2W)
            </button>
          </div>

          {/* Nút Làm Mới Dòng Lệnh */}
          <button
            type="button"
            onClick={handleRefreshFlow}
            disabled={refreshing}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 disabled:opacity-50 active:scale-95"
            title="Làm mới nến 1-phút và sổ lệnh khớp gần nhất"
          >
            <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
            <span>{refreshing ? 'Đang tải...' : 'Làm Mới'}</span>
          </button>
        </div>
      </div>

      {/* ── BANNER TRẠNG THÁI KIỂM SOÁT CỦA CÁ MẬP (WHALE DOMINANCE HERO BANNER) ── */}
      <div className="p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/60 via-purple-50/30 to-white dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="text-2xl shrink-0">🐋</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider border shadow-2xs ${getWdiColor(wdiScore)}`}>
                Kiểm Soát Cá Mập: {wdiScore}/100
              </span>
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                {primaryRegime}
              </span>
            </div>
            <div className={`text-xs font-semibold mt-1 flex items-center gap-1.5 ${divInfo.color}`}>
              <span>{divInfo.label}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs shrink-0">
          <span className="text-gray-400">Định hướng hành động:</span>
          <span className="px-3 py-1 rounded-xl bg-white dark:bg-gray-800 font-bold text-indigo-600 dark:text-indigo-400 border border-gray-200 dark:border-gray-700 shadow-2xs">
            {actionableBias}
          </span>
        </div>
      </div>

      {/* ── 4 HERO KPI THÍCH ỨNG THEO CHẾ ĐỘ ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {timeframeMode === 'intraday' ? (
          <>
            {/* KPI 1: Cá Mập Mua/Bán Ròng Trong Phiên */}
            <div className="p-3.5 bg-gray-50/70 dark:bg-gray-800/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-2xs">
              <div className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1">
                <span>🐋</span>
                <span>Cá Mập Mua Ròng (1D)</span>
              </div>
              <div className={`mt-1 font-mono text-base font-black ${(intraday.whaleNetDelta || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatShares(intraday.whaleNetDelta)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                {formatBillion(intraday.whaleNetValue)}
              </div>
            </div>

            {/* KPI 2: Nhỏ Lẻ Mua/Bán Ròng Trong Phiên */}
            <div className="p-3.5 bg-gray-50/70 dark:bg-gray-800/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-2xs">
              <div className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1">
                <span>🦐</span>
                <span>Nhỏ Lẻ Mua Ròng (1D)</span>
              </div>
              <div className={`mt-1 font-mono text-base font-black ${(intraday.retailNetDelta || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatShares(intraday.retailNetDelta)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                {formatBillion(intraday.retailNetValue)}
              </div>
            </div>

            {/* KPI 3: Tỷ Lệ Mua Chủ Động */}
            <div className="p-3.5 bg-gray-50/70 dark:bg-gray-800/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-2xs">
              <div className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1">
                <span>⚡</span>
                <span>Tỷ Lệ Mua Ăn Lên</span>
              </div>
              <div className="mt-1 font-mono text-base font-black text-indigo-600 dark:text-indigo-400">
                {(intraday.aggressiveBuyRatio || 50).toFixed(1)}%
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                Khớp thẳng vào giá Dư Bán
              </div>
            </div>

            {/* KPI 4: CVD Tích Lũy Trong Phiên */}
            <div className="p-3.5 bg-gray-50/70 dark:bg-gray-800/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-2xs">
              <div className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1">
                <span>🌊</span>
                <span>CVD Net Trong Phiên</span>
              </div>
              <div className={`mt-1 font-mono text-base font-black ${(intraday.cvd || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatShares(intraday.cvd)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                Delta lũy kế từ mở cửa
              </div>
            </div>
          </>
        ) : (
          <>
            {/* KPI 1 (10D): Tổng Vốn Cá Mập Gom 10 Phiên */}
            <div className="p-3.5 bg-gray-50/70 dark:bg-gray-800/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-2xs">
              <div className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1">
                <span>🐋</span>
                <span>Vốn Cá Mập 10 Phiên</span>
              </div>
              <div className={`mt-1 font-mono text-base font-black ${(multiDay.tenDayWhaleNetValue || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatBillion(multiDay.tenDayWhaleNetValue)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                Lũy kế 2 tuần giao dịch
              </div>
            </div>

            {/* KPI 2 (10D): Tỷ Lệ Phiên Gom Hàng */}
            <div className="p-3.5 bg-gray-50/70 dark:bg-gray-800/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-2xs">
              <div className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1">
                <span>📅</span>
                <span>Số Phiên Gom Hàng</span>
              </div>
              <div className="mt-1 font-mono text-base font-black text-indigo-600 dark:text-indigo-400">
                {multiDay.accumulationDays || 0} / 10 Phiên
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                {multiDay.distributionDays || 0} phiên xả hàng
              </div>
            </div>

            {/* KPI 3 (10D): CVD 10 Phiên */}
            <div className="p-3.5 bg-gray-50/70 dark:bg-gray-800/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-2xs">
              <div className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1">
                <span>🌊</span>
                <span>CVD 10 Phiên (2 Tuần)</span>
              </div>
              <div className={`mt-1 font-mono text-base font-black ${(multiDay.tenDayCvd || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatShares(multiDay.tenDayCvd)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                Biến động giá: {formatPercent(multiDay.priceChangePercent || 0)}
              </div>
            </div>

            {/* KPI 4 (10D): Trạng Thái Chu Kỳ */}
            <div className="p-3.5 bg-gray-50/70 dark:bg-gray-800/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-2xs">
              <div className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1">
                <span>🎯</span>
                <span>Trạng Thái Chu Kỳ</span>
              </div>
              <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white truncate">
                {summary.divergenceSignal === 'BULLISH_ABSORPTION' ? 'Gom Hàng Ngầm' : (
                  summary.divergenceSignal === 'BEARISH_DISTRIBUTION' ? 'Kéo Xả Phân Phối' : 'Đồng Thuận Đẩy Giá'
                )}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                Phân kỳ nỗ lực vs kết quả
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── TẦNG 1: BIỂU ĐỒ KÉP COMPOSEDCHART (GIÁ VS CVD & DELTA BARS) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
            <span>📈</span>
            <span>
              {timeframeMode === 'intraday'
                ? 'Tương Quan Thị Giá 1m vs Đường Cong Delta Tích Lũy (CVD Trong Phiên)'
                : 'Diễn Biến Giá Đóng Cửa vs Đường Cong CVD 10 Phiên (2 Tuần)'}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            {timeframeMode === 'intraday' ? 'Độ phân giải: 1 Phút (DNSE)' : 'Khung: Daily EOD (10 Phiên)'}
          </span>
        </div>

        <div className="h-72 w-full bg-gray-50/50 dark:bg-gray-900/30 p-3 rounded-2xl border border-gray-100 dark:border-gray-700/60">
          {chartData && chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} vertical={false} />
                <XAxis
                  dataKey={timeframeMode === 'intraday' ? 'time' : 'date'}
                  stroke={chartTheme.textColor}
                  fontSize={10}
                  tickLine={false}
                  interval={timeframeMode === 'intraday' ? Math.ceil(chartData.length / 8) : 0}
                />
                {/* Trục trái: Giá VNĐ */}
                <YAxis
                  yAxisId="priceAxis"
                  domain={['auto', 'auto']}
                  stroke={chartTheme.textColor}
                  fontSize={10}
                  tickLine={false}
                  orientation="left"
                  tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
                />
                {/* Trục phải: CVD & Delta */}
                <YAxis
                  yAxisId="cvdAxis"
                  orientation="right"
                  stroke={chartTheme.textColor}
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val) => formatShares(val).replace(' cp', '')}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0]?.payload || {};
                    return (
                      <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl text-xs space-y-1.5 font-sans">
                        <div className="font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-1 flex items-center justify-between gap-4">
                          <span>{timeframeMode === 'intraday' ? `Giờ: ${item.time}` : `Ngày: ${item.date}`}</span>
                          <span className="font-mono text-indigo-600 dark:text-indigo-400">{formatVND(item.price || item.close)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-gray-600 dark:text-gray-300">
                          <span>Khối lượng:</span>
                          <strong className="font-mono text-gray-900 dark:text-white">{Number(item.volume || 0).toLocaleString('vi-VN')} cp</strong>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span>Net Delta:</span>
                          <strong className={`font-mono ${Number(item.delta || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {formatShares(item.delta)}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between gap-4 border-t border-gray-100 dark:border-gray-800 pt-1">
                          <span>CVD Tích Lũy:</span>
                          <strong className="font-mono text-purple-600 dark:text-purple-400">{formatShares(item.cvd)}</strong>
                        </div>
                        {item.isWhaleBar && (
                          <div className="pt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <span>🐋</span> Phút bùng nổ lệnh Cá Mập
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={24}
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', paddingBottom: '4px' }}
                />
                <ReferenceLine yAxisId="cvdAxis" y={0} stroke={chartTheme.axisColor} strokeDasharray="2 2" />

                {/* Cột Delta từng thanh (Green = Mua ăn lên, Red = Bán đè) */}
                <Bar yAxisId="cvdAxis" dataKey="delta" name="Net Delta (cp)" radius={[2, 2, 0, 0]}>
                  {chartData.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={Number(entry.delta || 0) >= 0 ? '#10b981' : '#f43f5e'}
                      fillOpacity={entry.isWhaleBar ? 1.0 : 0.75}
                    />
                  ))}
                </Bar>

                {/* Đường Giá Cổ Phiếu */}
                <Line
                  yAxisId="priceAxis"
                  type="monotone"
                  dataKey={timeframeMode === 'intraday' ? 'price' : 'close'}
                  name="Thị Giá"
                  stroke={chartTheme.primaryLine}
                  strokeWidth={2}
                  dot={false}
                />

                {/* Đường CVD Lũy Kế */}
                <Line
                  yAxisId="cvdAxis"
                  type="monotone"
                  dataKey="cvd"
                  name="CVD Tích Lũy"
                  stroke="#a855f7"
                  strokeWidth={2}
                  strokeDasharray={timeframeMode === 'multiday' ? '0' : '2 2'}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-gray-400">
              Chưa có đủ số liệu nến để dựng biểu đồ CVD
            </div>
          )}
        </div>
      </div>

      {/* ── TẦNG 2: MA TRẬN CÁN CÂN 3 PHÂN CẤP QUY MÔ LỆNH (WHALE / MEDIUM / RETAIL) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
            <span>⚖️</span>
            <span>Ma Trận Phân Bổ Khối Lượng Theo 3 Cấp Quy Mô Lệnh</span>
          </div>
          <span className="text-[11px] text-gray-400 italic">
            Cấu hình Single Source of Truth từ default-constant-value.json
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tierMatrix.map((tier) => (
            <div
              key={tier.id}
              className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-gray-50/40 dark:bg-gray-800/40 space-y-3 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <span className="text-base">{tier.icon}</span>
                  <span>{tier.name}</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${tier.badgeClass}`}>
                  {tier.totalSharePct}% Vol
                </span>
              </div>

              {/* Thanh Stacked Bar Mua vs Bán */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Mua: {tier.buyRatio}%
                  </span>
                  <span className="text-rose-600 dark:text-rose-400 font-bold">
                    Bán: {(100 - tier.buyRatio).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${tier.buyRatio}%` }} />
                  <div className="bg-rose-500 h-full transition-all" style={{ width: `${100 - tier.buyRatio}%` }} />
                </div>
              </div>

              {/* Số Liệu Khối Lượng & Giá Trị Ròng */}
              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-100 dark:border-gray-700/60">
                <div>
                  <div className="text-[10px] text-gray-400">Net Delta</div>
                  <div className={`font-mono font-bold ${tier.netDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatShares(tier.netDelta)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400">Giá Trị Ròng</div>
                  <div className={`font-mono font-bold ${tier.netValueBillion >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatBillion(tier.netValueBillion)}
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 leading-tight">
                {tier.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── TẦNG 3: BẢNG CHI TIẾT (TOP SỔ LỆNH KHỦNG 1D / NHẬT KÝ 10D) ── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 uppercase tracking-wider">
            <span>{timeframeMode === 'intraday' ? '📋' : '📅'}</span>
            <span>
              {timeframeMode === 'intraday'
                ? 'Sổ Lệnh Cá Mập & Khối Lượng Khủng Vừa Khớp Trong Phiên (Top Large Trades)'
                : 'Nhật Ký Cán Cân Dòng Tiền & Vốn Cá Mập 10 Phiên Gần Nhất'}
            </span>
          </div>
          <span className="text-[11px] text-gray-400">
            {timeframeMode === 'intraday' ? 'Khớp lệnh thời gian thực' : 'Tổng kết phiên EOD'}
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
          {timeframeMode === 'intraday' ? (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 font-bold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-2.5">Thời Gian</th>
                  <th className="px-4 py-2.5">Thị Giá (VNĐ)</th>
                  <th className="px-4 py-2.5">Khối Lượng</th>
                  <th className="px-4 py-2.5">Giá Trị (Triệu đ)</th>
                  <th className="px-4 py-2.5">Loại Lệnh</th>
                  <th className="px-4 py-2.5">Phân Cấp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {intraday.topWhaleTrades && intraday.topWhaleTrades.length > 0 ? (
                  intraday.topWhaleTrades.map((trade, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-4 py-2 font-mono text-gray-500">{trade.time}</td>
                      <td className="px-4 py-2 font-mono font-bold text-gray-900 dark:text-white">{formatVND(trade.price)}</td>
                      <td className="px-4 py-2 font-mono font-bold text-gray-800 dark:text-gray-200">{Number(trade.volume).toLocaleString('vi-VN')} cp</td>
                      <td className="px-4 py-2 font-mono text-indigo-600 dark:text-indigo-400 font-bold">{Number(trade.valueMillion).toLocaleString('vi-VN')} tr</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          trade.matchType === 'Buy'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : (trade.matchType === 'Sell' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300')
                        }`}>
                          {trade.matchType === 'Buy' ? '🟢 Mua Ăn Lên' : (trade.matchType === 'Sell' ? '🔴 Bán Đè Giá' : '⚡ ATC / Định Kỳ')}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-[11px] font-bold flex items-center gap-1">
                          <span>{trade.tier === 'whale' ? '🐋' : (trade.tier === 'medium' ? '🐬' : '🦐')}</span>
                          <span className="capitalize">{trade.tier === 'whale' ? 'Cá Mập' : (trade.tier === 'medium' ? 'Tay To' : 'Nhỏ Lẻ')}</span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-400 italic">
                      Chưa ghi nhận lệnh lớn đột biến trong phiên hôm nay
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 font-bold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-2.5">Ngày Phiên</th>
                  <th className="px-4 py-2.5">Giá Đóng Cửa</th>
                  <th className="px-4 py-2.5">Tổng Volume</th>
                  <th className="px-4 py-2.5">Net Delta (cp)</th>
                  <th className="px-4 py-2.5">Vốn Cá Mập (Tỷ đ)</th>
                  <th className="px-4 py-2.5">Hành Vi Smart Money</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {multiDay.dailyBreakdown && multiDay.dailyBreakdown.length > 0 ? (
                  multiDay.dailyBreakdown.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-4 py-2 font-mono font-bold text-gray-700 dark:text-gray-300">{row.date}</td>
                      <td className="px-4 py-2 font-mono font-bold text-gray-900 dark:text-white">{formatVND(row.close)}</td>
                      <td className="px-4 py-2 font-mono text-gray-600 dark:text-gray-400">{Number(row.volume).toLocaleString('vi-VN')} cp</td>
                      <td className={`px-4 py-2 font-mono font-bold ${Number(row.delta) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatShares(row.delta)}
                      </td>
                      <td className={`px-4 py-2 font-mono font-bold ${Number(row.whaleNetValue) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatBillion(row.whaleNetValue)}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.status === 'Gom Hàng'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : (row.status === 'Xả Hàng' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300')
                        }`}>
                          {row.status === 'Gom Hàng' ? '🟢 Gom Hàng Ròng' : (row.status === 'Xả Hàng' ? '🔴 Xả Hàng Ròng' : '⚖️ Cân Bằng')}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-gray-400 italic">
                      Chưa có đủ dữ liệu chuỗi 10 ngày
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── TẦNG 4: HƯỚNG DẪN KỶ LUẬT ĐẦU TƯ THEO DÒNG TIỀN (SMART MONEY ACTIONABLE GUIDE) ── */}
      <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
        <span className="text-base shrink-0">💡</span>
        <div className="leading-relaxed">
          <strong>Kỷ luật đọc vị dòng tiền Cá Mập: </strong>
          {summary.divergenceSignal === 'BULLISH_ABSORPTION' ? (
            <span>
              Thị trường đang xuất hiện <strong>Phân Kỳ Hấp Thụ (Bullish Absorption)</strong> — Giá đi ngang/giảm nhưng đường CVD dốc ngược lên, chứng tỏ Cá Mập đang âm thầm gom sạch lực cung của Nhỏ Lẻ. Nhà đầu tư nên kiên nhẫn nắm giữ, canh gom cùng Cá Mập tại các nhịp võng giá, tuyệt đối không hoảng loạn bán non.
            </span>
          ) : (
            summary.divergenceSignal === 'BEARISH_DISTRIBUTION' ? (
              <span>
                Cảnh báo <strong>Phân Phối Đỉnh (Bearish Distribution)</strong> — Giá đang kéo rướn tạo đỉnh nhưng CVD liên tục suy yếu, chứng tỏ Nhỏ Lẻ đang FOMO mua đuổi trong khi Cá Mập âm thầm ra hàng đối ứng. Khuyến nghị không mua đuổi vùng giá cao, chủ động chốt lời bảo toàn vốn.
              </span>
            ) : (
              <span>
                Cán cân giao dịch đang ở trạng thái cân bằng luân chuyển. Hãy kết hợp với 10 mô hình định lượng và Biên An Toàn (MoS) ở Không gian 1 để ra quyết định mua/bán chuẩn xác nhất.
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
