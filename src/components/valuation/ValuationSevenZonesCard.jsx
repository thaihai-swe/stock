import React from 'react';
import { formatVND } from '../../utils/format.js';

export default function ValuationSevenZonesCard({
  sevenPriceZones,
  threeLayerDecision,
  currentPrice,
  symbol
}) {
  if (!sevenPriceZones && !threeLayerDecision) return null;

  const zones = [
    { id: 'deep_value', label: 'Deep Value', sub: '< 0.75x', color: 'from-purple-600 to-indigo-600', text: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800' },
    { id: 'safe_buy', label: 'Mua An Toàn', sub: '0.75 - 0.85x', color: 'from-emerald-600 to-teal-600', text: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800' },
    { id: 'accumulate', label: 'Tích Luỹ', sub: '0.85 - 0.95x', color: 'from-teal-600 to-cyan-600', text: 'text-teal-400', bg: 'bg-teal-950/40 border-teal-800' },
    { id: 'fair_range', label: 'Hợp Lý', sub: '0.95 - 1.10x', color: 'from-blue-600 to-slate-600', text: 'text-blue-400', bg: 'bg-blue-950/40 border-blue-800' },
    { id: 'above_fair', label: 'Chớm Đắt', sub: '1.10 - 1.20x', color: 'from-amber-600 to-orange-500', text: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800' },
    { id: 'expensive', label: 'Đắt', sub: '1.20 - 1.35x', color: 'from-orange-600 to-rose-600', text: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-800' },
    { id: 'danger', label: 'Nguy Hiểm', sub: '> 1.35x', color: 'from-rose-600 to-red-700', text: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-800' }
  ];

  const currentZone = sevenPriceZones?.currentZone || 'Fair Range';
  const boundaries = sevenPriceZones?.boundaries || {};
  const safeBuy = sevenPriceZones?.safeBuyPrice;
  const acceptableBuy = sevenPriceZones?.acceptableBuyPrice;
  const bear = sevenPriceZones?.bearPrice;
  const bull = sevenPriceZones?.bullPrice;

  const decision = threeLayerDecision || {};
  const composite = decision.compositeScore ?? 5.0;
  const vScore = decision.valuationLayerScore ?? 5.0;
  const qScore = decision.qualityLayerScore ?? 5.0;
  const tScore = decision.timingLayerScore ?? 5.0;
  const roeCoe = decision.roeCoeSpread;
  const rec = decision.buyRecommendation || '🟡 HOLD';
  const reason = decision.decisionReason || '';
  const isGateOpen = decision.isGateOpen;
  const isCapped = decision.isTrapCapped;

  // Active Zone Mapping
  const zoneIndexMap = {
    'Deep Value': 0,
    'Safe Buy': 1,
    'Accumulate': 2,
    'Fair Range': 3,
    'Above Fair': 4,
    'Expensive': 5,
    'Extreme Danger': 6
  };
  const activeIndex = zoneIndexMap[currentZone] ?? 3;

  return (
    <div className="p-5 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Mô Hình Định Lượng Độc Lập
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              7 Vùng Giá & Khung Ra Quyết Định 3 Tầng
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1">
            Bản Đồ 7 Vùng Định Giá & Quyết Định Đầu Tư — {symbol}
          </h3>
        </div>

        {/* Current Zone Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="text-right">
            <span className="text-[10px] text-gray-400 font-medium block">Vị thế hiện tại:</span>
            <span className={`text-xs font-black px-2.5 py-1 rounded-xl uppercase inline-block mt-0.5 ${
              activeIndex <= 1
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : activeIndex === 2
                ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20'
                : activeIndex === 3
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                : activeIndex === 4
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            }`}>
              🎯 {currentZone}
            </span>
          </div>
        </div>
      </div>

      {/* ── 1. THANH TRƯỢT 7 VÙNG ĐỊNH GIÁ TRỰC QUAN ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
          <span className="flex items-center gap-1.5">
            <span>📊</span> Phân Bổ 7 Vùng Giá (Từ Siêu Rẻ Đến Quá Đắt)
          </span>
          <span className="text-gray-400 text-[11px] font-normal">
            Thị giá: <strong className="text-indigo-600 dark:text-indigo-400">{formatVND(currentPrice)}</strong>
          </span>
        </div>

        {/* 7-Segment Zone Bar */}
        <div className="grid grid-cols-7 gap-1.5 p-1.5 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800">
          {zones.map((z, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={z.id}
                className={`relative p-2 rounded-xl text-center transition-all flex flex-col justify-between ${
                  isActive
                    ? 'ring-2 ring-indigo-500 bg-white dark:bg-gray-800 shadow-md scale-[1.02]'
                    : 'bg-white/50 dark:bg-gray-800/40 opacity-75'
                }`}
              >
                {isActive && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center justify-center">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                    </span>
                  </div>
                )}
                <div>
                  <div className={`text-[10px] font-black uppercase tracking-tight ${isActive ? z.text : 'text-gray-400'}`}>
                    {z.label}
                  </div>
                  <div className="text-[9px] text-gray-400 font-mono mt-0.5">{z.sub}</div>
                </div>
                <div className={`h-1.5 w-full rounded-full mt-2 bg-gradient-to-r ${z.color} opacity-80`} />
              </div>
            );
          })}
        </div>

        {/* Giá then chốt (Safe Buy, Acceptable Buy, Bear, Bull) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase block">
              🛡️ Giá Mua An Toàn (MoS 15-25%)
            </span>
            <span className="text-sm font-black text-emerald-800 dark:text-emerald-300 mt-0.5 block">
              {formatVND(safeBuy)}
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-500">Vùng gom chiến lược</span>
          </div>

          <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50">
            <span className="text-[10px] text-teal-700 dark:text-teal-400 font-bold uppercase block">
              🎯 Giá Mua Chấp Nhận (MoS 5-15%)
            </span>
            <span className="text-sm font-black text-teal-800 dark:text-teal-300 mt-0.5 block">
              {formatVND(acceptableBuy)}
            </span>
            <span className="text-[10px] text-teal-600 dark:text-teal-500">Tích luỹ định kỳ DCA</span>
          </div>

          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase block">
              🐻 Kịch Bản Gấu (Bear Stress -30%)
            </span>
            <span className="text-sm font-black text-gray-700 dark:text-gray-300 mt-0.5 block">
              {formatVND(bear)}
            </span>
            <span className="text-[10px] text-gray-400">Đáy suy thoái khắc nghiệt</span>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50">
            <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold uppercase block">
              🐂 Kịch Bản Bò (Bull Catalyst +25%)
            </span>
            <span className="text-sm font-black text-indigo-800 dark:text-indigo-300 mt-0.5 block">
              {formatVND(bull)}
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-500">Mục tiêu chu kỳ bùng nổ</span>
          </div>
        </div>
      </div>

      {/* ── 2. KHUNG QUYẾT ĐỊNH 3 TẦNG GATED (V40 / Q35 / T25) ── */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-50 to-indigo-50/30 dark:from-gray-900/50 dark:to-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Khung Ra Quyết Định Gated 3 Tầng (Trọng số 40% - 35% - 25%)
            </span>
            <h4 className="text-sm font-black text-gray-900 dark:text-white mt-0.5 flex items-center gap-2">
              <span>Khuyến Nghị:</span>
              <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                rec.includes('STRONG BUY') || rec.includes('ACCUMULATE')
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : rec.includes('HOLD')
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
              }`}>
                {rec}
              </span>
            </h4>
          </div>

          {/* Composite Score Card */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <div className="text-right">
              <span className="text-[10px] text-gray-400 block">Điểm Tổng Hợp</span>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                {composite} <span className="text-xs text-gray-400 font-normal">/ 10</span>
              </span>
            </div>
            {isCapped && (
              <span className="text-[10px] font-black px-2 py-1 rounded-md bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                ⚠️ Khóa trần ≤ 5.0 (Bẫy Cao)
              </span>
            )}
          </div>
        </div>

        {/* 3 Thước Đo Điểm Tầng */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Tầng 1: Valuation Layer */}
          <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700 dark:text-gray-300">Tầng 1: Định Giá (V₄₀)</span>
              <span className="font-black text-indigo-600 dark:text-indigo-400">{vScore}/10</span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, vScore * 10)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 block">Trọng số 40% · Độ rẻ so với hội tụ & lịch sử</span>
          </div>

          {/* Tầng 2: Quality Layer */}
          <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700 dark:text-gray-300">Tầng 2: Chất Lượng (Q₃₅)</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400">{qScore}/10</span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, qScore * 10)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 block">Trọng số 35% · Sức khỏe tài chính & Quản trị</span>
          </div>

          {/* Tầng 3: Timing Layer */}
          <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-700 dark:text-gray-300">Tầng 3: Thời Điểm (T₂₅)</span>
              <span className="font-black text-amber-600 dark:text-amber-400">{tScore}/10</span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, tScore * 10)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 block">Trọng số 25% · Xung lực kỹ thuật & Vị thế chu kỳ</span>
          </div>
        </div>

        {/* Chi Tiết Cổng Điều Kiện & ROE-CoE Spread */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
          <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-start gap-2.5">
            <span className="text-base">{isGateOpen ? '🔓' : '🔒'}</span>
            <div>
              <div className="font-bold text-gray-800 dark:text-gray-200">
                Trạng Thái Cổng Điều Kiện: <span className={isGateOpen ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{isGateOpen ? 'ĐÃ MỞ' : 'CHƯA MỞ'}</span>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {reason || (isGateOpen ? 'Cả định giá và chất lượng đều vượt ngưỡng an toàn ≥ 6.0' : 'Yêu cầu cả Định giá và Chất lượng ≥ 6.0 mới kích hoạt tín hiệu Mua.')}
              </div>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-start gap-2.5">
            <span className="text-base">{roeCoe != null && roeCoe > 0 ? '✨' : '⚠️'}</span>
            <div>
              <div className="font-bold text-gray-800 dark:text-gray-200">
                Thặng Dư Giá Trị Kinh Tế (ROE - CoE Spread):{' '}
                <span className={roeCoe != null && roeCoe > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                  {roeCoe != null ? `${roeCoe > 0 ? '+' : ''}${roeCoe}%` : '—'}
                </span>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {roeCoe != null && roeCoe > 0
                  ? 'ROE vượt chi phí vốn chủ sở hữu (CoE) -> Doanh nghiệp gia tăng giá trị ròng bền vững.'
                  : 'ROE thấp hơn CoE -> Nguy cơ bào mòn vốn chủ sở hữu theo thời gian.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
