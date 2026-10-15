import React, { useState, useMemo } from 'react';
import { calculateSbvOmoRadar } from '../../utils/sbvOmoRadar.js';

export default function SbvOmoInterbankRadarCard({ macroData = {} }) {
  const [viewMode, setViewMode] = useState('data'); // 'data' | 'ai'

  const radar = useMemo(() => {
    return calculateSbvOmoRadar(macroData);
  }, [macroData]);

  const {
    interbankRate,
    sbvRefinancingRate,
    interbankSpread,
    isSpreadElevated,
    usdVndRate,
    m2GrowthYoY,
    fxReservesM,
    compositeStressScore,
    posture,
    equityStatus,
    equityGuidance,
    componentScores,
    aiDiagnosis
  } = radar;

  // Progress bar color based on stress score
  let scoreBarColor = 'bg-emerald-500';
  let scoreTextColor = 'text-emerald-600 dark:text-emerald-400';
  if (compositeStressScore > 65) {
    scoreBarColor = 'bg-rose-500';
    scoreTextColor = 'text-rose-600 dark:text-rose-400';
  } else if (compositeStressScore > 35) {
    scoreBarColor = 'bg-amber-500';
    scoreTextColor = 'text-amber-600 dark:text-amber-400';
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Chính Sách Tiền Tệ & OMO
            </span>
            <span className={`text-xs font-bold px-3 py-0.5 rounded-full border ${posture.badge}`}>
              Trạng thái: {posture.label}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-1 flex items-center gap-2">
            <span>📡</span> Radar Bơm/Hút Tiền SBV & Thanh Khoản Liên Ngân Hàng
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Giám sát chênh lệch Lãi suất LNH vs SBV, tỷ giá USD/VND và áp lực can thiệp OMO
          </p>
        </div>

        {/* VIEW MODE TOGGLE (HYBRID) */}
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
            <span>Số Liệu Định Lượng (0ms)</span>
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
            <span>Nhận Định AI (Weekly)</span>
          </button>
        </div>
      </div>

      {/* ── STRESS GAUGE & OVERVIEW BAR ── */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <span>🎚️</span> Điểm Áp Lực Thanh Khoản Tiền Tệ (Liquidity Stress Score)
            </span>
            <span className={`text-sm font-black ${scoreTextColor}`}>
              {compositeStressScore} / 100
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${scoreBarColor} transition-all duration-500 rounded-full`}
              style={{ width: `${compositeStressScore}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            <span>0 (Tiền Rẻ Dồi Dào)</span>
            <span>35 (Cân Bằng)</span>
            <span>65 (Thắt Chặt)</span>
            <span>100 (Căng Thẳng Cao)</span>
          </div>
        </div>

        <div className="md:border-l md:border-gray-200 dark:md:border-slate-700 md:pl-5 shrink-0 space-y-1">
          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider block">
            Khuyến Nghị Đối Với Cổ Phiếu
          </span>
          <span className="text-xs font-black text-gray-900 dark:text-white flex items-center gap-1.5">
            <span>🎯</span> {equityStatus}
          </span>
        </div>
      </div>

      {/* ── CHẾ ĐỘ XEM 1: SỐ LIỆU ĐỊNH LƯỢNG 0ms ── */}
      {viewMode === 'data' && (
        <div className="space-y-5">
          {/* 4 Chỉ Số Cốt Lõi */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Lãi suất LNH qua đêm */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/80 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-400">
                Lãi Suất LNH Qua Đêm (ON)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                  {interbankRate}%
                </span>
                <span className="text-[11px] text-gray-400">/năm</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-slate-700">
                Thang chuẩn: 3.0% — 6.0%
              </div>
            </div>

            {/* 2. Chênh lệch vs SBV Refinancing */}
            <div className={`p-4 rounded-2xl border shadow-xs space-y-1 ${
              isSpreadElevated
                ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                : 'bg-white dark:bg-slate-800/80 border-gray-100 dark:border-slate-700/80'
            }`}>
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-400">
                Spread (LNH - SBV Tái Cấp Vốn)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl sm:text-2xl font-black ${
                  isSpreadElevated ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'
                }`}>
                  {interbankSpread > 0 ? `+${interbankSpread}` : interbankSpread}%
                </span>
                <span className="text-[10px] text-gray-400">(SBV: {sbvRefinancingRate}%)</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-slate-700">
                {isSpreadElevated ? '⚠️ LNH cao hơn lãi suất điều hành' : '✅ Nằm trong biên độ thoải mái'}
              </div>
            </div>

            {/* 3. Tỷ giá USD/VND */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/80 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-400">
                Tỷ Giá USD/VND
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                  {usdVndRate.toLocaleString('vi-VN')}
                </span>
                <span className="text-[11px] text-gray-400">đ</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-slate-700">
                {usdVndRate >= 25500 ? '🔴 Vùng can thiệp ngoại tệ' : '🟢 Ổn định dưới 25,500đ'}
              </div>
            </div>

            {/* 4. Tăng trưởng tín dụng & Cung tiền */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/80 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-400">
                Tín Dụng / Cung Tiền M2
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                  +{m2GrowthYoY}%
                </span>
                <span className="text-[11px] text-gray-400">YoY</span>
              </div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-slate-700">
                Dự trữ: ${(fxReservesM / 1000).toFixed(1)}B USD
              </div>
            </div>
          </div>

          {/* Phân rã 4 thành phần trọng số Stress Score */}
          <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-700 space-y-3">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <span>⚖️</span> Phân Rã Trọng Số Chấm Điểm Căng Thẳng Thanh Khoản
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-gray-500 dark:text-gray-400 text-[11px]">
                  <span>Lãi Suất LNH (40%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{componentScores.interbankNorm}/100</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${componentScores.interbankNorm}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-gray-500 dark:text-gray-400 text-[11px]">
                  <span>Chênh Lệch Spread (30%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{componentScores.spreadNorm}/100</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${componentScores.spreadNorm}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-gray-500 dark:text-gray-400 text-[11px]">
                  <span>Tỷ Giá USD/VND (20%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{componentScores.usdVndNorm}/100</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: `${componentScores.usdVndNorm}%` }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-gray-500 dark:text-gray-400 text-[11px]">
                  <span>Cung Tiền M2 (10%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{componentScores.m2Norm}/100</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${componentScores.m2Norm}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Banner hướng dẫn danh mục */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div className="text-xs space-y-1 text-indigo-950 dark:text-indigo-200">
              <span className="font-bold block">Định hướng danh mục theo thanh khoản:</span>
              <p className="leading-relaxed opacity-90">{equityGuidance}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── CHẾ ĐỘ XEM 2: NHẬN ĐỊNH CHIẾN LƯỢC AI HÀNG TUẦN (WEEKLY) ── */}
      {viewMode === 'ai' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/60 dark:from-purple-950/40 dark:via-slate-900 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-800/60 space-y-3">
            <div className="flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 pb-2 border-b border-purple-100 dark:border-purple-800/40">
              <span className="font-bold flex items-center gap-1.5">
                <span>🤖</span> Bản Tin Chẩn Đoán Thanh Khoản Hàng Tuần
              </span>
              <span className="text-[10px] text-gray-400">
                {aiDiagnosis.updatedAt ? new Date(aiDiagnosis.updatedAt).toLocaleDateString('vi-VN') : 'Tuần hiện tại'}
              </span>
            </div>

            <h4 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
              {aiDiagnosis.headline}
            </h4>

            <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {aiDiagnosis.strategicNarrative}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* NIM Ngân hàng */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700 space-y-1.5">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <span>🏦</span> Tác Động Đến Biên Lãi NIM Ngành Ngân Hàng
              </span>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {aiDiagnosis.bankingNIMImpact}
              </p>
            </div>

            {/* Dòng tiền chứng khoán */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700 space-y-1.5">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <span>📈</span> Tác Động Đến Dòng Tiền Thị Trường Cổ Phiếu
              </span>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                {aiDiagnosis.equityMarketVerdict}
              </p>
            </div>
          </div>

          {/* Khuyến nghị hành động */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 flex items-start gap-3">
            <span className="text-xl">🛡️</span>
            <div className="text-xs space-y-1 text-emerald-950 dark:text-emerald-200">
              <span className="font-bold block">Khuyến nghị chiến thuật từ AI:</span>
              <p className="leading-relaxed opacity-90">{aiDiagnosis.actionableAdvice}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
