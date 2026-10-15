import React from 'react';
import { formatVND } from '../../utils/format.js';
import IntelligenceBadge from '../common/IntelligenceBadge.jsx';

export default function HistoricalValuationBandCard({ historicalBands, currentPrice, symbol, eps, bvps }) {
  if (!historicalBands) return null;

  const { peBand = {}, pbBand = {}, priceBands = {} } = historicalBands;

  const renderBandGauge = (label, band = {}, unit = 'x') => {
    const p25 = band.p25 ?? 0;
    const p50 = band.p50 ?? 0;
    const p75 = band.p75 ?? 0;

    let cur = band.current ?? 0;
    if (cur <= 0 && currentPrice > 0) {
      if (label.includes('P/E') && eps > 0) {
        cur = currentPrice / eps;
      } else if (label.includes('P/B') && bvps > 0) {
        cur = currentPrice / bvps;
      }
    }
    const hasCur = cur > 0;

    // Tính % vị trí của current trong khoảng [p25 * 0.8, p75 * 1.2]
    const minVal = p25 > 0 ? p25 * 0.8 : 0;
    const maxVal = p75 > 0 ? p75 * 1.2 : (p50 > 0 ? p50 * 1.5 : 1);
    const range = maxVal - minVal || 1;
    const curPercent = hasCur ? Math.max(5, Math.min(95, ((cur - minVal) / range) * 100)) : 50;

    const isCheap = hasCur && cur <= p50;

    return (
      <div className="p-4 bg-gray-50/70 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
            {label}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Hiện tại:</span>
            <span className={`text-sm font-black ${
              !hasCur
                ? 'text-gray-400'
                : isCheap
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}>
              {hasCur ? `${cur.toFixed(2)}${unit}` : '—'}
            </span>
            {hasCur && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                cur < p25
                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400'
                  : cur <= p50
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  : cur <= p75
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
              }`}>
                {cur < p25 ? '< P25 (Rất rẻ)' : cur <= p50 ? '≤ P50 (Dưới trung vị)' : cur <= p75 ? 'P50-P75' : '> P75 (Vùng đỉnh)'}
              </span>
            )}
          </div>
        </div>

        {/* Bar */}
        <div className="relative pt-2 pb-1">
          <div className="h-2.5 w-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 rounded-full opacity-80" />
          {/* Marker */}
          {hasCur && (
            <div
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center transition-all duration-300"
              style={{ left: `${curPercent}%` }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-indigo-600 border-2 border-white dark:border-gray-800 shadow-md" />
            </div>
          )}
        </div>

        {/* 3 Milestones */}
        <div className="grid grid-cols-3 text-center pt-1 text-[11px]">
          <div>
            <span className="text-gray-400 block text-[10px]">P25 (Đáy {band.yearsUsed ? `${band.yearsUsed} năm` : '5 năm'})</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{p25 > 0 ? `${p25.toFixed(2)}${unit}` : '—'}</span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px]">P50 (Trung vị)</span>
            <span className="font-bold text-gray-700 dark:text-gray-300">{p50 > 0 ? `${p50.toFixed(2)}${unit}` : '—'}</span>
            {band.mean != null && (
              <span className="text-[9px] text-gray-400 block font-normal">Mean: {band.mean.toFixed(2)}{unit}</span>
            )}
          </div>
          <div>
            <span className="text-gray-400 block text-[10px]">P75 (Đỉnh {band.yearsUsed ? `${band.yearsUsed} năm` : 'chu kỳ'})</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">{p75 > 0 ? `${p75.toFixed(2)}${unit}` : '—'}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-5 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs space-y-5">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Thống Kê Phân Vị Lịch Sử
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              Dải Băng P25 - P50 - P75 Chu Kỳ {peBand.yearsUsed ? `${peBand.yearsUsed} Năm` : '5 Năm'}
            </span>
            <IntelligenceBadge type="heuristic" tooltip="Mô hình dải băng định giá phân vị P25/P50/P75 chu kỳ 5 năm" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1">
            Định Giá Lịch Sử 3 Tầng Phân Vị P/E & P/B — {symbol}
          </h3>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-gray-400 font-medium block">Thị giá tham chiếu:</span>
          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
            {formatVND(currentPrice)}
          </span>
        </div>
      </div>

      {/* ── 2 GAUGES P/E & P/B BANDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderBandGauge(`Thang Đo P/E ${peBand.yearsUsed ? `${peBand.yearsUsed} Năm` : '5 Năm'} (Price to Earnings)`, peBand)}
        {renderBandGauge(`Thang Đo P/B ${pbBand.yearsUsed ? `${pbBand.yearsUsed} Năm` : '5 Năm'} (Price to Book)`, pbBand)}
      </div>

      {/* ── BẢNG THỊ GIÁ TƯƠNG ỨNG CÁC MỐC PHÂN VỊ ── */}
      <div className="p-4 bg-gray-50/50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
          🎯 Thị Giá Tương Ứng Từng Mốc Phân Vị Lịch Sử:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-center">
          <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">P/E @ P25</span>
            <span className="text-xs font-black text-gray-900 dark:text-white mt-0.5 block">{formatVND(priceBands.peP25Price)}</span>
            <span className="text-[9px] text-gray-400">Đáy P/E</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block">P/E @ P50</span>
            <span className="text-xs font-black text-gray-900 dark:text-white mt-0.5 block">{formatVND(priceBands.peP50Price)}</span>
            <span className="text-[9px] text-gray-400">Trung vị P/E</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">P/E @ P75</span>
            <span className="text-xs font-black text-gray-900 dark:text-white mt-0.5 block">{formatVND(priceBands.peP75Price)}</span>
            <span className="text-[9px] text-gray-400">Đỉnh P/E</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">P/B @ P25</span>
            <span className="text-xs font-black text-gray-900 dark:text-white mt-0.5 block">{formatVND(priceBands.pbP25Price)}</span>
            <span className="text-[9px] text-gray-400">Đáy P/B</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block">P/B @ P50</span>
            <span className="text-xs font-black text-gray-900 dark:text-white mt-0.5 block">{formatVND(priceBands.pbP50Price)}</span>
            <span className="text-[9px] text-gray-400">Trung vị P/B</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">P/B @ P75</span>
            <span className="text-xs font-black text-gray-900 dark:text-white mt-0.5 block">{formatVND(priceBands.pbP75Price)}</span>
            <span className="text-[9px] text-gray-400">Đỉnh P/B</span>
          </div>
        </div>
      </div>
    </div>
  );
}
