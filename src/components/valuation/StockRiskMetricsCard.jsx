import React from 'react';
import IntelligenceBadge from '../common/IntelligenceBadge.jsx';

export default function StockRiskMetricsCard({ riskMetrics, symbol }) {
  if (!riskMetrics) return null;

  const {
    annualizedVolatility,
    dailyVolatility,
    maxDrawdown,
    var95,
    sharpeRatio,
    sortinoRatio,
    beta,
    riskFreeRate,
    ratings = {}
  } = riskMetrics;

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Đo Lường Rủi Ro Định Lượng (Quantitative Risk Engine)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200">
              Biến Động & Drawdown
            </span>
            <IntelligenceBadge type="heuristic" tooltip="Mô hình toán học định lượng rủi ro danh mục (VaR 95%, Sharpe, Sortino, Max Drawdown)" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            Chỉ Số Rủi Ro Thị Giá Cổ Phiếu ({symbol})
          </h3>
        </div>
        <div className="text-xs text-gray-400">
          Lãi suất phi rủi ro: <b className="text-indigo-600 dark:text-indigo-400">{riskFreeRate != null ? `${riskFreeRate}%` : '—'}</b> (TPCP 10Y HNX)
        </div>
      </div>

      {/* Grid 4 Cards Rủi Ro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Volatility */}
        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Biến Động Hàng Năm (Vol)
            </span>
            {ratings.volatility && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  ratings.volatility === 'Thấp'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : ratings.volatility === 'Trung bình'
                    ? 'bg-blue-50 text-blue-600 border border-blue-200'
                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                }`}
              >
                {ratings.volatility}
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
            {annualizedVolatility != null ? `${annualizedVolatility}%` : '—'}
            {annualizedVolatility != null && <span className="text-xs font-bold text-gray-400 ml-1">/ năm</span>}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200/50 dark:border-gray-600/50">
            Biến động ngày: <b className="text-gray-700 dark:text-gray-300">{dailyVolatility != null ? `±${dailyVolatility}%` : '—'}</b> · Beta: <b className="text-indigo-600 dark:text-indigo-400">{beta != null ? `${beta}x` : '—'}</b>
          </div>
        </div>

        {/* Card 2: Max Drawdown */}
        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Sụt Giảm Từ Đỉnh (MDD)
            </span>
            {ratings.drawdown && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  ratings.drawdown === 'An toàn'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-rose-50 text-rose-600 border border-rose-200'
                }`}
              >
                {ratings.drawdown}
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {maxDrawdown != null ? `-${maxDrawdown}%` : '—'}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200/50 dark:border-gray-600/50">
            Mức điều chỉnh sâu nhất từ đỉnh 52 tuần
          </div>
        </div>

        {/* Card 3: VaR 95% */}
        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              VaR 95% (1 Ngày)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
              Độ tin cậy 95%
            </span>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {var95 != null ? `-${var95}%` : '—'}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200/50 dark:border-gray-600/50">
            Mức lỗ tối đa trong 1 phiên ở điều kiện chuẩn
          </div>
        </div>

        {/* Card 4: Sharpe & Sortino */}
        <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Lợi Nhuận / Rủi Ro
            </span>
            {ratings.sharpe && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                {ratings.sharpe}
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {sharpeRatio != null ? `${sharpeRatio}x` : '—'}
            {sharpeRatio != null && <span className="text-xs font-bold text-gray-400 ml-1">Sharpe</span>}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200/50 dark:border-gray-600/50">
            Sortino Ratio: <b className="text-teal-600 dark:text-teal-400">{sortinoRatio != null ? `${sortinoRatio}x` : '—'}</b> (trừ rủi ro giảm giá)
          </div>
        </div>
      </div>
    </div>
  );
}
