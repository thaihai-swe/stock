import React, { useState, useMemo, useEffect } from 'react';
import { calculateInflationAdjustedMetrics } from '../../utils/inflationAdjuster.js';
import { fetchValuationMacro } from '../../utils/api.js';
import { fmtMoney } from '../../utils/format.js';

export default function RealPurchasingPowerCard({
  portfolio = [],
  buyOrders = [],
  sellOrders = [],
  dividends = [],
  marketPrices = {},
  macroData: propMacroData = null
}) {
  const [viewMode, setViewMode] = useState('data'); // 'data' | 'ai'
  const [macroData, setMacroData] = useState(propMacroData);

  // If macroData is not passed as prop, fetch it once
  useEffect(() => {
    if (!propMacroData) {
      fetchValuationMacro()
        .then(m => { if (m) setMacroData(m); })
        .catch(() => {});
    } else {
      setMacroData(propMacroData);
    }
  }, [propMacroData]);

  // Aggregate portfolio totals
  const portfolioSummary = useMemo(() => {
    let totalInvested = 0;
    let currentValue = 0;

    portfolio.forEach(item => {
      const sym = item.symbol;
      const qty = Number(item.totalQuantity ?? item.quantity ?? 0);
      const cost = Number(item.avgCost ?? item.avgBuyPrice ?? 0);
      const curPrice = Number(marketPrices[sym]?.price ?? item.currentPrice ?? cost);

      totalInvested += qty * cost;
      currentValue += qty * curPrice;
    });

    // Fallback if portfolio array is empty or zero
    if (totalInvested === 0) {
      const totalBuyVal = buyOrders.reduce((sum, o) => sum + (Number(o.quantity || 0) * Number(o.price || 0)), 0);
      totalInvested = totalBuyVal;
      currentValue = totalBuyVal;
    }

    const totalGainLoss = currentValue - totalInvested;
    const returnPct = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalValue: currentValue,
      totalGainLoss,
      returnPct
    };
  }, [portfolio, buyOrders, marketPrices]);

  const metrics = useMemo(() => {
    return calculateInflationAdjustedMetrics(portfolioSummary, macroData);
  }, [portfolioSummary, macroData]);

  const {
    annualCpi,
    coreInflation,
    savingsRate,
    totalInvested,
    nominalGainVnd,
    nominalReturnPct,
    portfolioRealReturnPct,
    inflationDragVnd,
    realGainVnd,
    bracket,
    assetsComparison,
    aiDiagnosis
  } = metrics;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Kiểm Toán Sức Mua & Lạm Phát
            </span>
            <span className={`text-xs font-bold px-3 py-0.5 rounded-full ${bracket.badge}`}>
              {bracket.label}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-1 flex items-center gap-2">
            <span>🛡️</span> Thước Đo Tăng Trưởng Sức Mua Thực Tế (Fisher Real Return)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Bóc tách phần lợi nhuận bị lạm phát (CPI {annualCpi}%) bào mòn và đối chiếu 4 kênh tài sản
          </p>
        </div>

        {/* TOGGLE HYBRID VIEW */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl self-start sm:self-auto shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setViewMode('data')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'data'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
            }`}
          >
            <span>📊</span>
            <span>Bóc Tách Sức Mua (0ms)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('ai')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'ai'
                ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-300 shadow-xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700'
            }`}
          >
            <span>🧠</span>
            <span>Lời Bình AI (Weekly)</span>
          </button>
        </div>
      </div>

      {/* ── 4 KPI CARDS: SỨC MUA & LẠM PHÁT ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: Real Return % */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            Tỷ Suất Lãi Thực Tế (Fisher)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl sm:text-2xl font-black ${
              portfolioRealReturnPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {portfolioRealReturnPct >= 0 ? `+${portfolioRealReturnPct}` : portfolioRealReturnPct}%
            </span>
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-200/60 dark:border-slate-700">
            Lãi danh nghĩa: {nominalReturnPct >= 0 ? `+${nominalReturnPct}` : nominalReturnPct}%
          </div>
        </div>

        {/* KPI 2: Hao mòn lạm phát VNĐ */}
        <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 space-y-1">
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            Hao Mòn Lạm Phát (VNĐ Drag)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
              -{fmtMoney(inflationDragVnd)}
            </span>
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 pt-1 border-t border-rose-100 dark:border-rose-900/30">
            Ứng với CPI năm {annualCpi}%
          </div>
        </div>

        {/* KPI 3: Lợi nhuận sức mua ròng */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            Lợi Nhuận Sức Mua Ròng
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl sm:text-2xl font-black ${
              realGainVnd >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {realGainVnd >= 0 ? `+${fmtMoney(realGainVnd)}` : `-${fmtMoney(Math.abs(realGainVnd))}`}
            </span>
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-200/60 dark:border-slate-700">
            Lãi sổ sách: {nominalGainVnd >= 0 ? `+${fmtMoney(nominalGainVnd)}` : `-${fmtMoney(Math.abs(nominalGainVnd))}`}
          </div>
        </div>

        {/* KPI 4: Benchmark Lãi suất tiết kiệm */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
          <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            Lãi Tiết Kiệm Thực Tế (12T)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
              +0.40%
            </span>
          </div>
          <div className="text-[10px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-200/60 dark:border-slate-700">
            Tiền gửi {savingsRate}% - Lạm phát {annualCpi}%
          </div>
        </div>
      </div>

      {/* ── CHẾ ĐỘ XEM 1: BÓC TÁCH SỨC MUA & CUỘC ĐUA 4 TÀI SẢN ── */}
      {viewMode === 'data' && (
        <div className="space-y-5">
          {/* Sơ đồ dòng chảy giá trị (Waterfall Stream) */}
          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-700 space-y-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <span>🌊</span> Dòng Chảy Sức Mua: Từ Lợi Nhuận Sổ Sách Đến Sức Mua Thực Nhận
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex-1">
                <span className="text-[10px] text-gray-400 block">1. Vốn Đầu Tư Gốc</span>
                <span className="font-bold text-gray-900 dark:text-white">{fmtMoney(totalInvested)}</span>
              </div>
              <span className="text-gray-400 hidden sm:inline">➡️</span>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex-1">
                <span className="text-[10px] text-gray-400 block">2. Lãi Danh Nghĩa (Nominal)</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {nominalGainVnd >= 0 ? `+${fmtMoney(nominalGainVnd)}` : `-${fmtMoney(Math.abs(nominalGainVnd))}`}
                </span>
              </div>
              <span className="text-gray-400 hidden sm:inline">➡️</span>
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex-1">
                <span className="text-[10px] text-gray-400 block">3. Trừ Bào Mòn Lạm Phát</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">-{fmtMoney(inflationDragVnd)}</span>
              </div>
              <span className="text-gray-400 hidden sm:inline">➡️</span>
              <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex-1">
                <span className="text-[10px] text-indigo-700 dark:text-indigo-300 block font-bold">4. Sức Mua Thực Nhận</span>
                <span className="font-black text-indigo-600 dark:text-indigo-400">
                  {realGainVnd >= 0 ? `+${fmtMoney(realGainVnd)}` : `-${fmtMoney(Math.abs(realGainVnd))}`}
                </span>
              </div>
            </div>
          </div>

          {/* Cuộc Đua 4 Kênh Tài Sản Bảo Vệ Sức Mua (The 4-Asset Horse Race) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>🏇</span> Cuộc Đua 4 Kênh Tài Sản Bảo Vệ Sức Mua Thực Tế (Vs Lạm Phát {annualCpi}%)
              </span>
              <span className="text-[11px] text-gray-400">Sắp xếp theo Lãi thực tế</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {assetsComparison.map((asset, idx) => {
                const isWinner = idx === 0;
                return (
                  <div
                    key={asset.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      asset.isUserPortfolio
                        ? 'bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/30 dark:to-slate-800 border-indigo-300 dark:border-indigo-700 shadow-xs ring-1 ring-indigo-500/20'
                        : 'bg-white dark:bg-slate-800/80 border-gray-100 dark:border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1">
                        {isWinner && <span>👑</span>}
                        {asset.name}
                      </span>
                      {asset.isUserPortfolio && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                          Của Bạn
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11px] text-gray-400">Tỷ suất thực:</span>
                        <span className={`text-base font-black ${
                          asset.realReturnPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {asset.realReturnPct >= 0 ? `+${asset.realReturnPct}` : asset.realReturnPct}%
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between text-[11px] text-gray-400">
                        <span>Danh nghĩa:</span>
                        <span>{asset.nominalReturnPct >= 0 ? `+${asset.nominalReturnPct}` : asset.nominalReturnPct}%</span>
                      </div>

                      <div className="pt-2 border-t border-gray-100 dark:border-slate-700">
                        <span className={`text-[10px] font-bold block truncate ${asset.bracket?.color}`}>
                          {asset.bracket?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CHẾ ĐỘ XEM 2: LỜI BÌNH & KIỂM TOÁN AI HÀNG TUẦN (WEEKLY) ── */}
      {viewMode === 'ai' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-blue-50/80 via-white to-purple-50/60 dark:from-blue-950/40 dark:via-slate-900 dark:to-purple-950/40 border border-blue-200 dark:border-blue-800/60 space-y-3">
            <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 pb-2 border-b border-blue-100 dark:border-blue-800/40">
              <span className="font-bold flex items-center gap-1.5">
                <span>🤖</span> Kiểm Toán Sức Mua & Áp Lực Lạm Phát Hàng Tuần
              </span>
              <span className="text-[10px] text-gray-400">
                {aiDiagnosis.updatedAt ? new Date(aiDiagnosis.updatedAt).toLocaleDateString('vi-VN') : 'Tuần hiện tại'}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
              {aiDiagnosis.cpiAssessment}
            </p>

            <div className="p-3.5 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-blue-100 dark:border-blue-900/40 text-xs text-gray-800 dark:text-gray-200 leading-relaxed">
              <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                Đánh giá sức mua danh mục của bạn:
              </span>
              {aiDiagnosis.purchasingPowerVerdict}
            </div>
          </div>

          {/* Bảng xếp hạng 4 tài sản phòng thủ lạm phát */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700 space-y-3">
            <span className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>🏆</span> Xếp Hạng Khả Năng Bảo Vệ Sức Mua Của Các Kênh Tài Sản
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(aiDiagnosis.assetProtectionRanking || []).map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-gray-50/80 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-700 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900 dark:text-white">{item.asset}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {item.rating}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    {item.note}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Chiến lược phòng hộ */}
          <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div className="text-xs space-y-1 text-purple-950 dark:text-purple-200">
              <span className="font-bold block">Chiến lược phòng hộ lạm phát khuyến nghị:</span>
              <p className="leading-relaxed opacity-90">{aiDiagnosis.hedgingStrategy}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
