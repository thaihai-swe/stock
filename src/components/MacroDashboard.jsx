import { useState, useEffect, useMemo } from 'react';
import { fetchValuationMacro, fetchMacroIndicators, triggerValuationSync } from '../utils/api.js';
import MarketIndexLiveChart from './macro/MarketIndexLiveChart.jsx';
import MarketValuationHistoryChart from './macro/MarketValuationHistoryChart.jsx';
import StyleValuationComparison from './macro/StyleValuationComparison.jsx';
import ExecutiveSummaryCard from './macro/ExecutiveSummaryCard.jsx';
import ScenarioAllocationMatrix from './macro/ScenarioAllocationMatrix.jsx';
import SectorValuationHeatmap from './macro/SectorValuationHeatmap.jsx';

export default function MacroDashboard({ refreshKey, onSwitchTab }) {
  const [macroData, setMacroData] = useState(null);
  const [indicatorsData, setIndicatorsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'regime' | 'sectors' | 'allocation' | 'indicators'
  const [indicatorCategory, setIndicatorCategory] = useState('overview');
  const [indicatorSearch, setIndicatorSearch] = useState('');
  const [valuationWindow, setValuationWindow] = useState('ten_year'); // 'five_year' | 'ten_year' | 'modern' | 'all_time'

  const loadAllMacroData = async () => {
    setLoading(true);
    try {
      const [m, ind] = await Promise.all([
        fetchValuationMacro().catch(() => null),
        fetchMacroIndicators().catch(() => null)
      ]);
      setMacroData(m);
      // Ưu tiên ind nếu có categories, fallback sang m.tradingEconomics
      const validIndicators = (ind && ind.categories && Object.keys(ind.categories).length > 0)
        ? ind
        : (m?.tradingEconomics || null);
      setIndicatorsData(validIndicators);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu vĩ mô:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllMacroData();
  }, [refreshKey]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await triggerValuationSync();
      await loadAllMacroData();
    } catch (e) {
      alert('Lỗi đồng bộ: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  // Filtered indicators list (tìm kiếm toàn diện 95 chỉ số khi nhập keyword)
  const currentCategoryObj = indicatorsData?.categories?.[indicatorCategory];
  const filteredIndicators = useMemo(() => {
    if (!indicatorsData?.categories) return [];
    if (!indicatorSearch.trim()) {
      return currentCategoryObj?.items || [];
    }
    const q = indicatorSearch.toLowerCase();
    const allFound = [];
    Object.values(indicatorsData.categories).forEach((cat) => {
      (cat.items || []).forEach((it) => {
        if (
          it.name.toLowerCase().includes(q) ||
          (it.unit && it.unit.toLowerCase().includes(q)) ||
          (cat.title && cat.title.toLowerCase().includes(q))
        ) {
          if (!allFound.some((existing) => existing.name === it.name)) {
            allFound.push({ ...it, categoryTitle: cat.title });
          }
        }
      });
    });
    return allFound;
  }, [indicatorsData, currentCategoryObj, indicatorSearch]);

  if (loading && !macroData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium text-sm">Đang nạp toàn cảnh kinh tế vĩ mô & chu kỳ...</p>
      </div>
    );
  }

  const market = macroData?.marketIndex || {};
  const macro = macroData?.macro || {};
  const regime = macroData?.regime || {};
  const risk = macroData?.riskAssessment || {};
  const leading = macroData?.leadingSignals || {};
  const assetAlloc = macroData?.assetAllocation || {};
  const goldAdv = macroData?.goldAdvisor || {};
  const macroClock = macroData?.macroClock || {};
  const yieldCurve = macroData?.yieldCurveAnalysis || {};
  const scenarioMatrix = macroData?.scenarioMatrix || {};
  const tailRisks = macroData?.tailRisks || [];
  const hasActiveTailRisk = macroData?.hasActiveTailRisk || false;
  const leadLag = macroData?.leadLagDivergence || {};
  const confidence = macroData?.confidence || {};

  const VALUATION_WINDOWS = [
    { id: 'five_year', label: '5 Năm', shortLabel: '5N', desc: 'Chu kỳ kinh tế & tiền tệ gần nhất' },
    { id: 'ten_year', label: '10 Năm', shortLabel: '10N', desc: 'Cửa sổ chuẩn mực vĩ mô dài hạn (Khuyến nghị)' },
    { id: 'modern', label: 'Từ 2007', shortLabel: '2007', desc: 'Thời kỳ hội nhập WTO' },
    { id: 'all_time', label: 'Toàn Bộ (25 Năm)', shortLabel: '25N', desc: 'Toàn cảnh từ ngày lập sàn HOSE' },
  ];

  const activeWin = market.windows?.[valuationWindow] || market.windows?.ten_year || null;
  const peStats = activeWin?.pe || null;
  const pbStats = activeWin?.pb || null;
  const peXpbStats = activeWin?.peXpb || null;
  const roeStats = activeWin?.roeProxy || null;
  const compSignal = activeWin?.compositeSignal || null;
  const derivedMetrics = market.derivedMetrics || {};
  const pePos = peStats?.percentile != null ? Math.min(96, Math.max(4, peStats.percentile)) : 35;

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. HEADER & THỜI ĐIỂM ĐỒNG BỘ ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-white/10 relative overflow-hidden">
        {/* Glow hiệu ứng */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
              Hệ Thống Trí Tuệ Vĩ Mô & Thị Trường
            </span>
            <span className="text-xs text-gray-400">
              Cập nhật: {macroData?._meta?.updatedAt ? new Date(macroData._meta.updatedAt).toLocaleDateString('vi-VN') : 'Mới nhất'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <span>🌐</span> Toàn Cảnh Kinh Tế Vĩ Mô & Chu Kỳ Thị Trường
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
            Nhận diện 5 pha chu kỳ kinh tế, đo lường điểm rủi ro vĩ mô, ma trận xoay vòng 11 nhóm ngành HOSE và dữ liệu 95 chỉ số TradingEconomics.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-bold text-white transition border border-white/20 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <span className={syncing ? 'animate-spin' : ''}>🔄</span>
            <span>{syncing ? 'Đang đồng bộ...' : 'Đồng Bộ Dữ Liệu'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. HERO STATUS BAR: PHA CHU KỲ & KHẨU VỊ RỦI RO ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pha Kinh Tế & Macro Clock */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-2">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Pha Chu Kỳ Vĩ Mô</div>
          <div className="flex items-center justify-between">
            <div className="text-lg font-black text-gray-900 dark:text-white">
              {regime.titleVi || 'Mở Rộng Tăng Trưởng'}
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase ${regime.badgeColor || 'bg-blue-100 text-blue-700'}`}>
              {regime.phase || 'Expansion'}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {regime.description || 'Hoạt động kinh tế tăng trưởng vững chắc, tín dụng và sản xuất mở rộng.'}
          </p>
          {macroClock?.quadrant && (
            <div className="flex items-center justify-between pt-1.5 text-[11px] border-t border-gray-100 dark:border-gray-700/60">
              <span className="text-gray-400">Macro Clock:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{macroClock.titleVi || macroClock.quadrant}</span>
            </div>
          )}
        </div>

        {/* Card 2: Khẩu Vị Thị Trường & Lead-Lag */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-2">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Khẩu Vị Thị Trường</div>
          <div className="flex items-center justify-between">
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {leading.stance || 'Risk-On Nhẹ'}
            </div>
            {leadLag?.signal && (
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${leadLag.divergence > 15 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'}`}>
                {leadLag.signal}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Tín hiệu tích cực: <b className="text-emerald-600">{leading.bullishCount || 3}</b></span>
            <span>•</span>
            <span>Cảnh báo: <b className="text-rose-600">{leading.bearishCount || 1}</b></span>
          </div>
          <div className="flex items-center justify-between pt-1.5 text-[11px] border-t border-gray-100 dark:border-gray-700/60">
            <span className="text-gray-400">Độ lệch Sớm-Trễ:</span>
            <span className={`font-bold ${leadLag?.divergence > 15 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {leadLag?.divergence > 0 ? `+${leadLag.divergence}` : (leadLag?.divergence ?? 0)}%
            </span>
          </div>
        </div>

        {/* Card 3: Thước Đo Rủi Ro Vĩ Mô & Model Confidence */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-2">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Điểm Rủi Ro Vĩ Mô (Risk Score)</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white">{risk.riskScore || 44.4}</span>
            <span className="text-xs font-bold text-gray-400">/ 100</span>
            <span className={`text-xs font-black ml-auto ${risk.riskBucketColor || 'text-amber-500'}`}>
              [{risk.riskBucket || 'B2'}]
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                (risk.riskScore || 44) <= 40 ? 'bg-emerald-500' : (risk.riskScore || 44) <= 60 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, risk.riskScore || 44))}%` }}
            />
          </div>
          <div className="flex items-center justify-between pt-1.5 text-[11px] border-t border-gray-100 dark:border-gray-700/60">
            <span className="text-gray-400">Độ tin cậy:</span>
            <span className={`font-bold ${confidence?.label === 'HIGH' ? 'text-emerald-500' : confidence?.label === 'MEDIUM' ? 'text-amber-500' : 'text-rose-500'}`}>
              {confidence?.overall || 80}% ({confidence?.labelVi || confidence?.label || 'Cao'})
            </span>
          </div>
        </div>

        {/* Card 4: Nhiệt Kế Định Giá VN-Index */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-2">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Định Giá VN-Index (P/E)</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{market.currentPE || 13.15}x</span>
            <span className="text-xs font-bold text-gray-400">Mean 5Y: {market.historicalMeanPE || 14.2}x</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold">
              {market.bandText || 'Rẻ (Vùng gom mua)'}
            </span>
            <span className="text-xs text-gray-400">Z-Score: {market.zScore || -0.5}</span>
          </div>
          <div className="text-[11px] text-gray-400 truncate">Khuyến nghị: {assetAlloc.stance || '80% Cổ phiếu / 20% Tiền'}</div>
        </div>
      </div>

      {/* ── 3. THANH ĐIỀU HƯỚNG CÁC PHÂN HỆ VĨ MÔ (RESPONSIVE GRID / FLEX) ── */}
      <div className="grid grid-cols-2 md:flex md:items-center gap-1.5 p-1.5 bg-gray-100 dark:bg-gray-800/80 rounded-2xl border border-gray-200/60 dark:border-gray-700">
        {[
          { id: 'overview', icon: '📊', shortLabel: 'VN-Index & Định Giá', fullLabel: 'Định Giá VN-Index & Tài Sản Thực' },
          { id: 'regime', icon: '🌀', shortLabel: 'Chu Kỳ 5 Pha', fullLabel: 'Chu Kỳ 5 Pha & Radar Dẫn Dắt' },
          { id: 'sectors', icon: '🗺️', shortLabel: '10 Nhóm Ngành', fullLabel: 'Bản Đồ Nhiệt 10 Nhóm Ngành GICS' },
          { id: 'allocation', icon: '⚖️', shortLabel: 'Phân Bổ & Giá Vàng', fullLabel: 'Phân Bổ 4 Tài Sản & Giá Vàng' },
          { id: 'indicators', icon: '📑', shortLabel: '95 Chỉ Số TradingEconomics', fullLabel: '95 Chỉ Số TradingEconomics', fullSpan: true },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center justify-center md:justify-start gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer text-center md:text-left ${
              t.fullSpan ? 'col-span-2 md:col-span-auto' : ''
            } ${
              activeTab === t.id
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50'
            }`}
          >
            <span className="text-sm shrink-0">{t.icon}</span>
            <span className="md:hidden truncate">{t.shortLabel}</span>
            <span className="hidden md:inline whitespace-nowrap">{t.fullLabel}</span>
          </button>
        ))}
      </div>

      {/* ── 4. PHÂN HỆ 1: ĐỊNH GIÁ VN-INDEX & TÀI SẢN THỰC ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 1. Biểu đồ chỉ số trực tuyến & intraday DNSE */}
          <MarketIndexLiveChart />

          {/* 2. Card Định Giá VN-Index Đa Chu Kỳ (Vietstock 2000 - Hiện Tại) */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-lg border border-white/10 space-y-6">
            {/* Cảnh báo độ lệch chuẩn cực đoan (|z| > 2) */}
            {market.extremeAlert && market.extremeAlertText && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs sm:text-sm font-bold animate-pulse">
                <span className="text-xl shrink-0">🚨</span>
                <span className="leading-relaxed">{market.extremeAlertText}</span>
              </div>
            )}

            {/* Header: Tên chỉ số, Band nhãn & Composite Signal */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    Nhiệt Kế Định Giá VN-Index (Vietstock 2000–Hiện Tại)
                  </span>
                  {derivedMetrics.dataDate && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                      Chốt tháng: {derivedMetrics.dataDate}
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black mt-1 flex flex-wrap items-center gap-3">
                  {market.name || 'Chỉ Số VN-Index'}
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${peStats?.bandBadge || 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'}`}>
                    P/E {activeWin?.label || '10N'}: {peStats?.band || market.bandText || 'Rất rẻ'}
                  </span>
                </h3>
              </div>

              {/* Tín hiệu định giá tổng hợp (Composite Valuation Signal) */}
              <div className="flex flex-col sm:items-end gap-1 bg-white/5 p-3 rounded-2xl border border-white/10">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Tín Hiệu Định Giá Tổng Hợp
                </span>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase ${compSignal?.badge || 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'}`}>
                    {compSignal?.signal || 'MUA TÍCH LŨY'}
                  </span>
                  <span className="text-lg font-black text-white">
                    {compSignal?.score ?? 50}<span className="text-xs text-gray-400 font-normal">/100</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Thanh chuyển đổi 4 Cửa Sổ Chu Kỳ Thống Kê */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/10 shrink-0">
                {VALUATION_WINDOWS.map((win) => {
                  const isSelected = valuationWindow === win.id;
                  return (
                    <button
                      key={win.id}
                      type="button"
                      onClick={() => setValuationWindow(win.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                      title={win.desc}
                    >
                      <span className="hidden sm:inline">{win.label}</span>
                      <span className="sm:hidden">{win.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
              <div className="text-xs text-gray-300 flex items-center gap-2 flex-wrap">
                <span>Chu kỳ: <b className="text-indigo-300">{activeWin?.label || '10 Năm'}</b></span>
                <span>•</span>
                <span>{activeWin?.dateFrom} → {activeWin?.dateTo}</span>
                <span className="text-gray-400">({activeWin?.nObs || 0} kỳ tháng)</span>
              </div>
            </div>

            {/* Grid 4 Chỉ Số Thống Kê Sâu */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Cột 1: P/E */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-xs text-gray-400 flex items-center justify-between">
                  <span>P/E Thị Trường</span>
                  <span className={`text-[10px] font-bold ${peStats?.vsMedianPct <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {peStats?.vsMedianPct > 0 ? `+${peStats?.vsMedianPct}` : peStats?.vsMedianPct}% vs Med
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-400">{market.currentPE}x</div>
                <div className="text-[11px] text-gray-300 space-y-0.5 pt-1 border-t border-white/5">
                  <div className="flex justify-between">
                    <span>Trung bình:</span>
                    <b className="text-white">{peStats?.mean}x</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Trung vị:</span>
                    <b className="text-white">{peStats?.median}x</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Z-Score / Phân vị:</span>
                    <b className="text-indigo-300">{peStats?.zscore > 0 ? `+${peStats?.zscore}` : peStats?.zscore}σ · {peStats?.percentile}%</b>
                  </div>
                </div>
              </div>

              {/* Cột 2: P/B */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-xs text-gray-400 flex items-center justify-between">
                  <span>P/B Thị Trường</span>
                  <span className={`text-[10px] font-bold ${pbStats?.vsMedianPct <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {pbStats?.vsMedianPct > 0 ? `+${pbStats?.vsMedianPct}` : pbStats?.vsMedianPct}% vs Med
                  </span>
                </div>
                <div className="text-2xl font-black text-white">{market.currentPB}x</div>
                <div className="text-[11px] text-gray-300 space-y-0.5 pt-1 border-t border-white/5">
                  <div className="flex justify-between">
                    <span>Trung bình:</span>
                    <b className="text-white">{pbStats?.mean}x</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Trung vị:</span>
                    <b className="text-white">{pbStats?.median}x</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Z-Score / Phân vị:</span>
                    <b className="text-indigo-300">{pbStats?.zscore > 0 ? `+${pbStats?.zscore}` : pbStats?.zscore}σ · {pbStats?.percentile}%</b>
                  </div>
                </div>
              </div>

              {/* Cột 3: Tích số P/E * P/B (Graham Test) */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-xs text-gray-400 flex items-center justify-between">
                  <span>P/E × P/B (Graham)</span>
                  <span className={`text-[10px] font-bold ${(derivedMetrics.peXpb || 0) <= 22.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {(derivedMetrics.peXpb || 0) <= 22.5 ? '≤ 22.5 (Đạt)' : '> 22.5'}
                  </span>
                </div>
                <div className="text-2xl font-black text-indigo-300">{derivedMetrics.peXpb || peXpbStats?.current || '-'}x</div>
                <div className="text-[11px] text-gray-300 space-y-0.5 pt-1 border-t border-white/5">
                  <div className="flex justify-between">
                    <span>Ngưỡng Graham:</span>
                    <b className="text-white">&lt; 22.5x</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Trung bình chu kỳ:</span>
                    <b className="text-white">{peXpbStats?.mean}x</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Z-Score / Phân vị:</span>
                    <b className="text-indigo-300">{peXpbStats?.zscore > 0 ? `+${peXpbStats?.zscore}` : peXpbStats?.zscore}σ · {peXpbStats?.percentile}%</b>
                  </div>
                </div>
              </div>

              {/* Cột 4: ROE Proxy */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="text-xs text-gray-400 flex items-center justify-between">
                  <span>ROE Thị Trường (Proxy)</span>
                  <span className="text-[10px] font-bold text-indigo-300">P/B ÷ P/E</span>
                </div>
                <div className="text-2xl font-black text-cyan-300">{derivedMetrics.roeProxy || roeStats?.current || '-'}%</div>
                <div className="text-[11px] text-gray-300 space-y-0.5 pt-1 border-t border-white/5">
                  <div className="flex justify-between">
                    <span>Trung bình chu kỳ:</span>
                    <b className="text-white">{roeStats?.mean}%</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Trung vị chu kỳ:</span>
                    <b className="text-white">{roeStats?.median}%</b>
                  </div>
                  <div className="flex justify-between">
                    <span>Z-Score / Phân vị:</span>
                    <b className="text-indigo-300">{roeStats?.zscore > 0 ? `+${roeStats?.zscore}` : roeStats?.zscore}σ · {roeStats?.percentile}%</b>
                  </div>
                </div>
              </div>
            </div>

            {/* Thanh đo dải P/E Bands Động theo Cửa Sổ Được Chọn */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                <span>Rất rẻ (&le; {peStats?.p10}x)</span>
                <span>Rẻ ({peStats?.p10}–{peStats?.p25}x)</span>
                <span>Trung vị ({peStats?.median}x)</span>
                <span>Mắc ({peStats?.p75}–{peStats?.p90}x)</span>
                <span>Rất mắc (&gt; {peStats?.p90}x)</span>
              </div>
              <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden p-0.5 flex gap-1 border border-white/10 relative">
                <div className="flex-1 bg-emerald-500 rounded-l-full" title={`Rất rẻ: <= ${peStats?.p10}x`} />
                <div className="flex-1 bg-teal-500" title={`Rẻ: ${peStats?.p10}x - ${peStats?.p25}x`} />
                <div className="flex-2 bg-blue-500" title={`Hợp lý: ${peStats?.p25}x - ${peStats?.p75}x`} />
                <div className="flex-1 bg-amber-500" title={`Mắc: ${peStats?.p75}x - ${peStats?.p90}x`} />
                <div className="flex-1 bg-rose-500 rounded-r-full" title={`Rất mắc: > ${peStats?.p90}x`} />

                {/* Kim chỉ thị động theo percentile thực tế */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-white rounded-full border-2 border-indigo-900 shadow-xl animate-pulse z-10"
                  style={{ left: `${pePos}%` }}
                  title={`P/E hiện tại ${market.currentPE}x (Phân vị ${peStats?.percentile}%)`}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>P10: {peStats?.p10}x</span>
                <span>P25: {peStats?.p25}x</span>
                <span className="text-indigo-300 font-bold">Vị thế hiện tại: {market.currentPE}x ({peStats?.percentile}%)</span>
                <span>P75: {peStats?.p75}x</span>
                <span>P90: {peStats?.p90}x</span>
              </div>
            </div>

            {/* Khuyến nghị phân bổ vốn & Tín hiệu vĩ mô */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Khuyến Nghị Vị Thế Vốn: {assetAlloc.stance}
                </span>
                <p className="text-xs text-gray-300 mt-1">
                  {compSignal?.description || assetAlloc.rationale}
                </p>
              </div>
              <div className="flex items-center gap-2 text-lg font-black shrink-0">
                <span className="text-emerald-400">{assetAlloc.recommendedEquityPct}% Cổ phiếu</span>
                <span className="text-gray-400">/</span>
                <span className="text-indigo-300">{assetAlloc.recommendedCashPct}% Tiền</span>
              </div>
            </div>
          </div>

          {/* 3. Lịch Sử Định Giá Thị Trường Đa Chu Kỳ (Google Sheets Simply Wall St) */}
          <MarketValuationHistoryChart />

          {/* 3.1. So Sánh Định Giá & Dòng Tiền 4 Phân Khúc (VN-Index, VN30, Diamond, Midcap) */}
          <StyleValuationComparison
            styleIndices={macroData?.styleIndices}
            vnindexPE={market.currentPE || peStats?.current || 10.72}
            vnindexPB={market.currentPB || pbStats?.current || 1.8}
          />

          {/* 3.2. Phân Tích Đường Cong Lợi Suất & Thị Trường Nợ (Yield Curve & Debt Market Stress) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Thị Trường Nợ & Cấu Trúc Lãi Suất (Yield Curve Analysis)
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                  Đường Cong Lợi Suất & Chỉ Số Căng Thẳng Nợ: <span className="text-indigo-600 dark:text-indigo-400">{yieldCurve.ycRegimeVi || yieldCurve.ycRegime || 'Bình Thường'}</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${yieldCurve.regimeBadge || 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                  {yieldCurve.ycRegime || 'Normal'}
                </span>
                <span className="text-xs text-gray-400">Stress: <b className="text-rose-500 font-bold">{yieldCurve.ycStressIndex || 0}/100</b></span>
              </div>
            </div>

            {/* Inversion Alert if triggered */}
            {yieldCurve.inversionWarning && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">⚠️</span>
                <div className="space-y-1">
                  <div className="uppercase tracking-wider">Cảnh Báo Đảo Ngược Kỳ Hạn (Long-Short Inversion: LSS &lt; 0)</div>
                  <div className="text-[11px] font-normal leading-relaxed text-amber-800 dark:text-amber-300">
                    Lợi suất TPCP 10Y ({yieldCurve.vn10y}%) hiện đang thấp hơn Lãi suất tái cấp vốn SBV ({yieldCurve.sbvRefinancingRate}%).
                    Độ lệch dốc LSS = <b className="font-mono font-bold text-amber-900 dark:text-amber-100">{yieldCurve.longShortSpread}%</b>.
                    Đây là tín hiệu cảnh báo thanh khoản tiền đồng thắt chặt trong ngắn hạn hoặc kỳ vọng kinh tế hạ nhiệt.
                  </div>
                </div>
              </div>
            )}

            {/* 4 Metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* LSS */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 space-y-1">
                <div className="text-[11px] font-bold text-gray-400 uppercase">Long-Short Spread (LSS)</div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-black ${(yieldCurve.longShortSpread ?? 0) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {(yieldCurve.longShortSpread ?? 0) > 0 ? `+${yieldCurve.longShortSpread}` : yieldCurve.longShortSpread}%
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  VN 10Y ({yieldCurve.vn10y}%) – SBV ({yieldCurve.sbvRefinancingRate}%)
                </div>
                <div className={`text-[10px] font-bold ${(yieldCurve.longShortSpread ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {(yieldCurve.longShortSpread ?? 0) < 0 ? '⚠️ Đường cong đảo ngược' : '✓ Đường cong bình thường'}
                </div>
              </div>

              {/* Cross Country */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 space-y-1">
                <div className="text-[11px] font-bold text-gray-400 uppercase">Chênh Lệch Quốc Tế (Cross-Country)</div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-black ${(yieldCurve.crossCountrySpread ?? 0) < 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {(yieldCurve.crossCountrySpread ?? 0) > 0 ? `+${yieldCurve.crossCountrySpread}` : yieldCurve.crossCountrySpread}%
                  </span>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  VN 10Y ({yieldCurve.vn10y}%) – US 10Y ({yieldCurve.us10y}%)
                </div>
                <div className={`text-[10px] font-bold ${(yieldCurve.crossCountrySpread ?? 0) < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {(yieldCurve.crossCountrySpread ?? 0) < 0 ? '⚠️ Áp lực tỷ giá & rút ròng vốn' : '✓ Cân bằng dòng vốn ngoại'}
                </div>
              </div>

              {/* TPCP 10Y */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 space-y-1">
                <div className="text-[11px] font-bold text-gray-400 uppercase">Lợi Suất TPCP VN 10Y</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{yieldCurve.vn10y}%</span>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400">
                  Chu kỳ lãi suất chuẩn thị trường
                </div>
                <div className="text-[10px] font-bold text-gray-400">
                  LS Qua đêm: {macro.interbankOvernight}%
                </div>
              </div>

              {/* Debt Stress Index */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 space-y-1">
                <div className="text-[11px] font-bold text-gray-400 uppercase">Chỉ Số Căng Thẳng Nợ (YC Stress)</div>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-black ${(yieldCurve.ycStressIndex ?? 0) > 60 ? 'text-rose-500' : (yieldCurve.ycStressIndex ?? 0) > 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {yieldCurve.ycStressIndex ?? 0}
                  </span>
                  <span className="text-xs font-bold text-gray-400">/ 100</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full ${(yieldCurve.ycStressIndex ?? 0) > 60 ? 'bg-rose-500' : (yieldCurve.ycStressIndex ?? 0) > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, Math.max(0, yieldCurve.ycStressIndex ?? 0))}%` }}
                  />
                </div>
                <div className="text-[10px] font-bold text-gray-400 mt-1">
                  Mức độ: {(yieldCurve.ycStressIndex ?? 0) > 60 ? 'Căng thẳng cao' : (yieldCurve.ycStressIndex ?? 0) > 40 ? 'Trung bình' : 'Ổn định'}
                </div>
              </div>
            </div>

            {/* Assessment rationale */}
            {yieldCurve.assessment && (
              <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/60 dark:border-indigo-800/30 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-1.5">Nhận định chuyên sâu:</span>
                {yieldCurve.assessment}
              </div>
            )}
          </div>

          {/* 4. Grid Chỉ Số Tài Sản Thực & Lãi Suất */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'TPCP VN 10Y', val: `${macro.vn10yYield}%`, desc: 'Lợi suất trái phiếu', icon: '🏛️' },
              { label: 'LS Tái Cấp Vốn', val: `${macro.sbvRefinancingRate}%`, desc: 'Lãi suất SBV', icon: '🏦' },
              { label: 'LS Liên Ngân Hàng', val: `${macro.interbankOvernight}%`, desc: 'Kỳ hạn qua đêm', icon: '⚡' },
              { label: 'Tỷ Giá USD/VND', val: Number(macro.usdVndRate).toLocaleString(), desc: 'Tỷ giá liên ngân hàng', icon: '💵' },
              { label: 'Vàng Thế Giới', val: `$${Number(macro.goldWorld).toLocaleString()}`, desc: 'USD / oz', icon: '🟡' },
              { label: 'Dầu Brent', val: `$${macro.oilBrent}`, desc: 'USD / thùng', icon: '🛢️' },
            ].map((m, i) => (
              <div key={i} className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </div>
                <div className="text-lg font-black text-gray-900 dark:text-white mt-1">{m.val}</div>
                <div className="text-[10px] text-gray-400">{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 5. PHÂN HỆ 2: CHU KỲ 5 PHA & RADAR DẪN DẮT ── */}
      {activeTab === 'regime' && (
        <div className="space-y-6">
          {/* Báo Cáo Điều Hành Trọng Yếu (Executive Summary: Key Risks, Catalysts & Takeaways) */}
          <ExecutiveSummaryCard executiveSummary={macroData?.executiveSummary} />

          {/* Cảnh báo Tail-Risks Kích Hoạt */}
          {hasActiveTailRisk && tailRisks?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="animate-ping inline-flex h-2 w-2 rounded-full bg-rose-400 opacity-75" />
                  🚨 Cảnh Báo Rủi Ro Đuôi Kích Hoạt (Active Tail-Risks Triggers)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">
                  {tailRisks.length} cảnh báo đang mở
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {tailRisks.map((tr) => (
                  <div
                    key={tr.id}
                    className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent border border-rose-500/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>⚡</span> {tr.name}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${tr.badge || 'bg-rose-500/20 text-rose-300 border-rose-500/40'}`}>
                        {tr.severity || 'HIGH'}
                      </span>
                    </div>
                    <div className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                      <span className="font-bold">Ngưỡng kích hoạt:</span> {tr.trigger}
                    </div>
                    <div className="text-[11px] text-gray-600 dark:text-gray-400">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">Tác động thị trường:</span> {tr.impact}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card Ma Trận 3 Kịch Bản Thị Trường (Scenario Matrix) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Dự Phóng Vĩ Mô & Định Lượng Kịch Bản (Scenario Matrix)
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                  3 Kịch Bản Định Giá VN-Index & Phân Bổ Ngành
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {(market?.currentPoint || scenarioMatrix?.base?.currentPoint) && (
                  <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-800/40">
                    🎯 Điểm số làm gốc: <b>{Number(market?.currentPoint || scenarioMatrix?.base?.currentPoint).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</b> điểm
                  </span>
                )}
                <span className="text-gray-400">
                  Phân bổ xác suất: <b className="text-indigo-600 dark:text-indigo-400">{scenarioMatrix?.base?.probability || 55}% Base · {scenarioMatrix?.bull?.probability || 25}% Bull · {scenarioMatrix?.bear?.probability || 20}% Bear</b>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Base Case */}
              {scenarioMatrix?.base && (
                <div className="p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-blue-700 dark:text-blue-300">
                        {scenarioMatrix.base.name}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-xs font-black">
                        {scenarioMatrix.base.probability}%
                      </span>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-blue-900 dark:text-blue-100">
                        {scenarioMatrix.base.vnIndexRange}
                      </div>
                      <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                        Dải điểm kỳ vọng VN-Index
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      <b className="text-gray-900 dark:text-white">Điều kiện:</b> {scenarioMatrix.base.conditions}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      <b className="text-gray-900 dark:text-white">Luận điểm:</b> {scenarioMatrix.base.narrative}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-blue-200/60 dark:border-blue-800/40 space-y-1.5">
                    <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span>✓ Ưu tiên:</span>
                      <span className="font-normal text-gray-700 dark:text-gray-300">{scenarioMatrix.base.sectorBenefit?.join(', ')}</span>
                    </div>
                    <div className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                      <span>✕ Thận trọng:</span>
                      <span className="font-normal text-gray-700 dark:text-gray-300">{scenarioMatrix.base.sectorImpacted?.join(', ')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bull Case */}
              {scenarioMatrix?.bull && (
                <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300">
                        {scenarioMatrix.bull.name}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-black">
                        {scenarioMatrix.bull.probability}%
                      </span>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
                        {scenarioMatrix.bull.vnIndexRange}
                      </div>
                      <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        Dải điểm kỳ vọng VN-Index
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      <b className="text-gray-900 dark:text-white">Điều kiện:</b> {scenarioMatrix.bull.conditions}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      <b className="text-gray-900 dark:text-white">Luận điểm:</b> {scenarioMatrix.bull.narrative}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 space-y-1.5">
                    <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span>✓ Ưu tiên:</span>
                      <span className="font-normal text-gray-700 dark:text-gray-300">{scenarioMatrix.bull.sectorBenefit?.join(', ')}</span>
                    </div>
                    <div className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                      <span>✕ Thận trọng:</span>
                      <span className="font-normal text-gray-700 dark:text-gray-300">{scenarioMatrix.bull.sectorImpacted?.join(', ')}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bear Case */}
              {scenarioMatrix?.bear && (
                <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-rose-700 dark:text-rose-300">
                        {scenarioMatrix.bear.name}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs font-black">
                        {scenarioMatrix.bear.probability}%
                      </span>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-rose-900 dark:text-rose-100">
                        {scenarioMatrix.bear.vnIndexRange}
                      </div>
                      <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                        Dải điểm kỳ vọng VN-Index
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      <b className="text-gray-900 dark:text-white">Điều kiện:</b> {scenarioMatrix.bear.conditions}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      <b className="text-gray-900 dark:text-white">Luận điểm:</b> {scenarioMatrix.bear.narrative}
                    </div>
                  </div>
                  <div className="pt-3 border-t border-rose-200/60 dark:border-rose-800/40 space-y-1.5">
                    <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span>✓ Phòng vệ:</span>
                      <span className="font-normal text-gray-700 dark:text-gray-300">{scenarioMatrix.bear.sectorBenefit?.join(', ')}</span>
                    </div>
                    <div className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                      <span>✕ Thận trọng:</span>
                      <span className="font-normal text-gray-700 dark:text-gray-300">{scenarioMatrix.bear.sectorImpacted?.join(', ')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card Đồng Hồ Vĩ Mô 4 Góc Phần Tư (Macro Clock 4-Quadrant) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Đồng Hồ Kinh Tế Vĩ Mô (Macro Clock 4-Quadrant)
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                  Tương Quan Tăng Trưởng GDP × Chu Kỳ Lạm Phát CPI
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Góc hiện tại:</span>
                <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                  {macroClock?.quadrant || 'OVERHEATING'}
                </span>
              </div>
            </div>

            {/* 2x2 Quadrant Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Q1: Goldilocks */}
              <div
                className={`p-5 rounded-2xl border transition ${
                  macroClock?.quadrantKey === 'goldilocks'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-500 shadow-xs'
                    : 'bg-gray-50/50 dark:bg-gray-700/20 border-gray-200/60 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌟</span>
                    <span className="font-black text-sm text-gray-900 dark:text-white">Tăng Trưởng Vàng (Goldilocks)</span>
                  </div>
                  {macroClock?.quadrantKey === 'goldilocks' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase">
                      Đang Ở Đây
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                  GDP Tăng Trưởng Cao &bull; Lạm Phát Thấp/Ổn Định
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Môi trường hoàn hảo cho thị trường chứng khoán. Doanh nghiệp tăng trưởng mạnh mẽ mà không chịu áp lực lãi suất.
                </p>
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-[11px] text-emerald-700 dark:text-emerald-300">
                  <b>Ngành hưởng lợi:</b> Ngân hàng, Chứng khoán, Bán lẻ, Công nghệ
                </div>
              </div>

              {/* Q2: Overheating */}
              <div
                className={`p-5 rounded-2xl border transition ${
                  macroClock?.quadrantKey === 'overheating'
                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-2 border-amber-500 shadow-xs'
                    : 'bg-gray-50/50 dark:bg-gray-700/20 border-gray-200/60 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔥</span>
                    <span className="font-black text-sm text-gray-900 dark:text-white">Mở Rộng Tăng Tốc / Quá Nhiệt (Overheating)</span>
                  </div>
                  {macroClock?.quadrantKey === 'overheating' && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black uppercase">
                      Đang Ở Đây
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-2">
                  GDP Tăng Trưởng Tốt &bull; Lạm Phát Gia Tăng
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Sản xuất và tiêu dùng sôi động nhưng chi phí vốn bắt đầu tăng. Lợi nhuận phân hóa mạnh giữa các nhóm ngành.
                </p>
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-[11px] text-amber-700 dark:text-amber-300">
                  <b>Ngành hưởng lợi:</b> Bất động sản, Thép, Hóa chất, Năng lượng
                </div>
              </div>

              {/* Q3: Stagflation */}
              <div
                className={`p-5 rounded-2xl border transition ${
                  macroClock?.quadrantKey === 'stagflation'
                    ? 'bg-rose-50/70 dark:bg-rose-950/30 border-2 border-rose-500 shadow-xs'
                    : 'bg-gray-50/50 dark:bg-gray-700/20 border-gray-200/60 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <span className="font-black text-sm text-gray-900 dark:text-white">Đình Lạm (Stagflation)</span>
                  </div>
                  {macroClock?.quadrantKey === 'stagflation' && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase">
                      Đang Ở Đây
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-2">
                  GDP Tăng Chậm Lại &bull; Lạm Phát Cao
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Kịch bản rủi ro nhất: chi phí đầu vào tăng cao làm xói mòn biên lợi nhuận trong khi sức mua sụt giảm.
                </p>
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-[11px] text-rose-700 dark:text-rose-300">
                  <b>Ngành phòng thủ:</b> Tiện ích, Dược phẩm, Tiền mặt, Vàng
                </div>
              </div>

              {/* Q4: Reflation */}
              <div
                className={`p-5 rounded-2xl border transition ${
                  macroClock?.quadrantKey === 'reflation'
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border-2 border-blue-500 shadow-xs'
                    : 'bg-gray-50/50 dark:bg-gray-700/20 border-gray-200/60 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌱</span>
                    <span className="font-black text-sm text-gray-900 dark:text-white">Phục Hồi / Bơm Tiền (Reflation)</span>
                  </div>
                  {macroClock?.quadrantKey === 'reflation' && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase">
                      Đang Ở Đây
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-2">
                  GDP Bắt Đầu Tạo Đáy &bull; Lạm Phát Hạ Nhiệt
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Chính sách tiền tệ nới lỏng tạo thanh khoản dồi dào, định giá cổ phiếu phục hồi từ vùng trũng lịch sử.
                </p>
                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/60 text-[11px] text-blue-700 dark:text-blue-300">
                  <b>Ngành hưởng lợi:</b> Chứng khoán, Công nghệ, Bán lẻ, Xây dựng
                </div>
              </div>
            </div>

            {/* Current Position Note */}
            <div className="p-3.5 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="text-gray-600 dark:text-gray-300">
                <span className="font-bold text-gray-900 dark:text-white">Vị thế hiện tại:</span> Tăng trưởng GDP thực tế{' '}
                <b className="text-indigo-600 dark:text-indigo-400">{macroClock?.gdpValue}%</b> ({macroClock?.gdpPhaseVi}) &bull; Lạm phát CPI{' '}
                <b className="text-amber-600 dark:text-amber-400">{macroClock?.cpiValue}%</b> ({macroClock?.inflationStateVi})
              </div>
              <div className="text-gray-400 text-[11px] shrink-0">
                Khuyến nghị: {macroClock?.favoredSectors?.slice(0, 3).join(', ')}
              </div>
            </div>
          </div>

          {/* Card Phân tích 5 pha kinh tế */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Mô Hình Nhận Diện Chu Kỳ Kinh Tế (5 Phases)
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                  Định Danh Pha Kinh Tế Việt Nam: <span className="text-indigo-600 dark:text-indigo-400">{regime.titleVi}</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Đồng thuận chỉ số:</span>
                <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                  {regime.voteCount}/6 Drivers
                </span>
              </div>
            </div>

            {/* Thanh 5 pha chu kỳ */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {[
                { key: 'Recovery', name: 'Phục Hồi', color: 'border-emerald-500' },
                { key: 'Expansion', name: 'Mở Rộng', color: 'border-blue-500' },
                { key: 'Overheating', name: 'Tăng Nhiệt', color: 'border-amber-500' },
                { key: 'Slowdown', name: 'Chậm Lại', color: 'border-orange-500' },
                { key: 'Recession', name: 'Suy Thoái', color: 'border-rose-500' },
              ].map((p) => {
                const isCurrent = regime.phase === p.key;
                const score = regime.scores?.[p.key] || 0;
                return (
                  <div
                    key={p.key}
                    className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border text-center transition ${
                      isCurrent
                        ? `bg-indigo-50/70 dark:bg-indigo-950/40 border-2 ${p.color} shadow-xs font-bold`
                        : 'bg-gray-50/50 dark:bg-gray-700/20 border-gray-100 dark:border-gray-700 text-gray-500'
                    }`}
                  >
                    <div className="text-[10px] sm:text-[11px] font-bold truncate">{p.name}</div>
                    <div className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 text-gray-400">{score}đ</div>
                    {isCurrent && (
                      <span className="inline-block px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded bg-indigo-600 text-white text-[8px] sm:text-[9px] font-bold mt-1">
                        Hiện Tại
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Các drivers phù hợp */}
            <div className="p-4 bg-gray-50/70 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
                Dẫn Chứng Chỉ Số Phù Hợp Pha:
              </span>
              <div className="flex flex-wrap gap-2">
                {(regime.matchedDrivers || []).map((d, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-xl bg-white dark:bg-gray-800 text-xs font-semibold text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-2xs">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Phân rã 4 Lớp Rủi Ro (4-Layer Risk Decomposition) */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
                Phân Rã 4 Lớp Rủi Ro Vĩ Mô (0 - 100):
              </span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { name: 'Thanh Khoản (Monetary)', val: risk.layers?.monetary || 44.9, desc: 'Lãi suất & Đường cong' },
                  { name: 'Tăng Trưởng (Growth)', val: risk.layers?.growth || 35.8, desc: 'GDP & Tín dụng' },
                  { name: 'Lạm Phát (Price)', val: risk.layers?.price || 64.4, desc: 'CPI & Chi phí đẩy' },
                  { name: 'Tỷ Giá & Quốc Tế (External)', val: risk.layers?.external || 46.9, desc: 'USD/VND & Lợi suất US' },
                ].map((ly, i) => (
                  <div key={i} className="p-3.5 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400">{ly.name}</div>
                    <div className="text-xl font-black text-gray-900 dark:text-white mt-1">{ly.val}%</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full ${ly.val > 60 ? 'bg-rose-500' : ly.val > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${ly.val}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">{ly.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Radar 6 Tín hiệu sớm dẫn dắt (Leading Signals) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Radar Tín Hiệu Sớm Vĩ Mô (Macro Leading Signals)
                </span>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                  6 Chỉ Báo Định Hình Dòng Tiền Thị Trường
                </h3>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black ${leading.badgeClass || 'bg-emerald-100 text-emerald-700'}`}>
                {leading.stance || 'Risk-On Nhẹ'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(leading.signals || []).map((sig, i) => (
                <div key={i} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200">{sig.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        sig.status === 'bullish'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : sig.status === 'bearish'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                      }`}
                    >
                      {sig.status === 'bullish' ? 'Tích Cực' : sig.status === 'bearish' ? 'Cảnh Báo' : 'Trung Lập'}
                    </span>
                  </div>
                  <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">{sig.val}</div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">{sig.lead}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Card Lead-Lag Divergence & Model Confidence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box Lead-Lag Divergence */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Độ Lệch Sớm - Trễ (Lead-Lag Divergence)
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                    Thị Trường Tài Chính vs Kinh Tế Thực
                  </h3>
                </div>
                <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${leadLag?.badge || 'bg-amber-100 text-amber-700 border-amber-300'}`}>
                  {leadLag?.signal || 'BALANCED'}
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-600 dark:text-gray-300">Chỉ Báo Sớm (Leading: Lãi suất, Tỷ giá, Dầu, Vàng)</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{leadLag?.leadingPct || 50}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${leadLag?.leadingPct || 50}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-600 dark:text-gray-300">Chỉ Báo Trễ (Lagging: GDP, Lạm phát CPI, Bán lẻ)</span>
                    <span className="text-blue-600 dark:text-blue-400">{leadLag?.laggingPct || 50}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${leadLag?.laggingPct || 50}%` }} />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>Chênh lệch độ lệch (Δ Divergence):</span>
                  <span className={`${(leadLag?.divergence ?? 0) > 15 ? 'text-amber-500 font-black' : (leadLag?.divergence ?? 0) < -15 ? 'text-emerald-500 font-black' : 'text-gray-700 dark:text-gray-200'}`}>
                    {(leadLag?.divergence ?? 0) > 0 ? `+${leadLag.divergence}` : (leadLag?.divergence ?? 0)}%
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  {leadLag?.desc || 'Độ lệch đo lường sự khác biệt giữa phản ứng nhanh của thị trường tài chính và tốc độ phản ánh chậm của số liệu vĩ mô thực.'}
                </p>
              </div>
            </div>

            {/* Box Model Confidence */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    Độ Tin Cậy Mô Hình (Model Confidence)
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                    Điểm Số Độ Chuẩn Xác Thuật Toán
                  </h3>
                </div>
                <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${confidence?.badge || 'bg-emerald-100 text-emerald-700 border-emerald-300'}`}>
                  {confidence?.labelVi || confidence?.label || 'CAO'}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900 dark:text-white">{confidence?.overall || 80.5}</span>
                <span className="text-xs font-bold text-gray-400">/ 100</span>
                <span className="text-xs text-gray-400 ml-auto">Xung đột tín hiệu: <b>0</b></span>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: 'Chất Lượng Dữ Liệu Nguồn (Data Quality)', val: confidence?.dataQuality || 100, color: 'bg-emerald-500' },
                  { label: 'Độ Ổn Định Chu Kỳ (Regime Stability)', val: confidence?.regimeStability || 75, color: 'bg-indigo-500' },
                  { label: 'Độ Rõ Ràng Tín Hiệu (Signal Clarity)', val: confidence?.signalClarity || 70, color: 'bg-blue-500' },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                      <span className="text-gray-900 dark:text-white">{item.val}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-gray-400">
                Mô hình tổng hợp 6 động lực vĩ mô chính và 95 chỉ số TradingEconomics để lượng hóa độ tin cậy của chu kỳ kinh tế hiện hành.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. PHÂN HỆ 3: BẢN ĐỒ NHIỆT 10 NGÀNH & MA TRẬN THIÊN THỜI HỘI TỤ (GICS VIETNAM) ── */}
      {activeTab === 'sectors' && (
        <div className="space-y-6">
          <SectorValuationHeatmap
            dualMatrix={macroData?.dualMatrix}
            sectorValuations={macroData?.sectorValuations}
            sectorRotation={macroData?.sectorRotation}
            vnindexPE={market.currentPE || peStats?.current || 10.72}
            regime={regime}
          />
        </div>
      )}

      {/* ── 7. PHÂN HỆ 4: PHÂN BỔ 4 TÀI SẢN & VÀNG SJC ── */}
      {activeTab === 'allocation' && (
        <div className="space-y-6">
          {/* Ma Trận Phân Bổ 4 Lớp Tài Sản Đa Kịch Bản & Khẩu Vị Rủi Ro (Base/Bull/Bear Matrix) */}
          <ScenarioAllocationMatrix
            scenarioAllocation={macroData?.scenarioAllocation}
            currentBucket={macroData?.scenarioAllocation?.currentBucket || assetAlloc.riskBucket || regime.bucket || 'B2'}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Box 1: Phân bổ 4 Lớp Tài Sản Động */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-5">
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Mô Hình Phân Bổ 4 Lớp Tài Sản (Dynamic Allocation)
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                  Tỷ Trọng Khuyến Nghị Chu Kỳ {regime.phase}
                </h3>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Cổ Phiếu (Equity)', val: assetAlloc.fourAssets?.equity || 60, color: 'bg-emerald-500', text: 'text-emerald-600' },
                  { label: 'Trái Phiếu (Bond)', val: assetAlloc.fourAssets?.bond || 25, color: 'bg-blue-500', text: 'text-blue-600' },
                  { label: 'Tiền Mặt (Cash)', val: assetAlloc.fourAssets?.cash || 10, color: 'bg-indigo-500', text: 'text-indigo-600' },
                  { label: 'Vàng Vật Chất (Gold)', val: assetAlloc.fourAssets?.gold || 5, color: 'bg-amber-500', text: 'text-amber-600' },
                ].map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                      <span className={item.text}>{item.val}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${item.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100/60 dark:border-indigo-800/40 text-xs text-gray-600 dark:text-gray-300">
                Tỷ trọng được tự động điều chỉnh động theo Risk Bucket [{risk.riskBucket}] và áp lực từ 4 lớp rủi ro vĩ mô (Thanh khoản, Tăng trưởng, Lạm phát, Tỷ giá).
              </div>
            </div>

            {/* Box 2: Tư Vấn Chênh Lệch Vàng (Gold Arbitrage) */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Chênh Lệch Giá Vàng (Gold Arbitrage)
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                    Thị Trường Trong Nước vs Thế Giới
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-black self-start sm:self-auto">
                    {goldAdv.action || 'NẮM GIỮ'}
                  </span>
                </div>
              </div>

              {/* 3 Thẻ so sánh: Vàng SJC, Nhẫn PNJ 999.9, Thế Giới Quy Đổi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Vàng SJC */}
                <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-center space-y-1">
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">
                    Vàng Miếng SJC
                  </div>
                  <div className="text-lg font-black text-amber-600 dark:text-amber-400">
                    {goldAdv.sjcSell || macro.sjcGoldSell || '---'} Tr
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    Mua: {goldAdv.sjcBuy || macro.sjcGoldBuy || '---'} Tr
                  </div>
                  <div className="inline-block px-2 py-0.5 rounded-md bg-amber-100/80 dark:bg-amber-900/40 text-[10px] font-bold text-amber-700 dark:text-amber-300 mt-0.5">
                    Spread: {goldAdv.sjcSpreadPct ? `${goldAdv.sjcSpreadPct > 0 ? '+' : ''}${goldAdv.sjcSpreadPct}%` : (goldAdv.spreadPct ? `${goldAdv.spreadPct}%` : '---')}
                  </div>
                </div>

                {/* Nhẫn Trơn PNJ 999.9 */}
                <div className="p-3.5 rounded-2xl bg-yellow-50/60 dark:bg-yellow-950/20 border border-yellow-200/60 dark:border-yellow-800/40 text-center space-y-1">
                  <div className="text-[10px] text-yellow-700 dark:text-yellow-400 font-bold uppercase tracking-wider">
                    Nhẫn Trơn PNJ 999.9
                  </div>
                  <div className="text-lg font-black text-yellow-600 dark:text-yellow-400">
                    {goldAdv.pnjSell || macro.pnjGoldSell || '---'} Tr
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    Mua: {goldAdv.pnjBuy || macro.pnjGoldBuy || '---'} Tr
                  </div>
                  <div className="inline-block px-2 py-0.5 rounded-md bg-yellow-100/80 dark:bg-yellow-900/40 text-[10px] font-bold text-yellow-700 dark:text-yellow-300 mt-0.5">
                    Spread: {goldAdv.pnjSpreadPct ? `${goldAdv.pnjSpreadPct > 0 ? '+' : ''}${goldAdv.pnjSpreadPct}%` : '---'}
                  </div>
                </div>

                {/* Thế Giới Quy Đổi */}
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 text-center space-y-1">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    Thế Giới Quy Đổi
                  </div>
                  <div className="text-lg font-black text-gray-900 dark:text-white">
                    {(Number(goldAdv.worldConvertedVnd) / 1_000_000).toFixed(1)} Tr
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    ${Number(goldAdv.worldPriceUsd || macro.goldWorld).toLocaleString()} / oz
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    USD: {Number(macro.usdVndRate).toLocaleString()} đ
                  </div>
                </div>
              </div>

              {/* Rationale & Advice */}
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 space-y-2">
                <div className="flex flex-wrap items-center justify-between text-xs font-bold text-amber-800 dark:text-amber-300 gap-2">
                  <span>Khuyến nghị phân bổ: {goldAdv.sizeHint || '5-10% danh mục'}</span>
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    Nguồn: PNJ Official {goldAdv.updatedAt ? `(${goldAdv.updatedAt})` : (macro.pnjUpdateDate ? `(${macro.pnjUpdateDate})` : '')}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {goldAdv.reason}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. PHÂN HỆ 5: THƯ VIỆN 95 CHỈ SỐ TRADINGECONOMICS ── */}
      {activeTab === 'indicators' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Cơ Sở Dữ Liệu Kinh Tế Vĩ Mô Toàn Diện
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                95 Chỉ Số Kinh Tế Việt Nam — TradingEconomics
              </h3>
            </div>
            {/* Ô tìm kiếm chỉ số */}
            <div className="relative w-full md:w-72">
              <input
                type="text"
                value={indicatorSearch}
                onChange={(e) => setIndicatorSearch(e.target.value)}
                placeholder="Tìm chỉ số (CPI, GDP, PMI, M2...)..."
                className="w-full pl-3.5 pr-8 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {indicatorSearch && (
                <button
                  onClick={() => setIndicatorSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* 1. Bộ chọn danh mục trên Mobile (Dropdown Native - Không cuộn ngang) */}
          <div className="md:hidden space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400">
              <span>NHÓM DANH MỤC ({Object.keys(indicatorsData?.categories || {}).length})</span>
              <span>{filteredIndicators.length} chỉ số</span>
            </div>
            <select
              value={indicatorCategory}
              onChange={(e) => {
                setIndicatorCategory(e.target.value);
                setIndicatorSearch('');
              }}
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {Object.entries(indicatorsData?.categories || {}).map(([key, cat]) => (
                <option key={key} value={key}>
                  {cat.title} ({cat.count} chỉ số)
                </option>
              ))}
            </select>
          </div>

          {/* 2. Hàng Tab 10 danh mục Desktop (Pills Flex Wrap) */}
          <div className="hidden md:flex flex-wrap items-center gap-1.5 pb-1">
            {Object.entries(indicatorsData?.categories || {}).map(([key, cat]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setIndicatorCategory(key);
                  setIndicatorSearch('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  indicatorCategory === key && !indicatorSearch
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {cat.title} ({cat.count})
              </button>
            ))}
          </div>

          {/* Bảng dữ liệu chỉ số (Có cột tên Sticky cố định khi vuốt ngang) */}
          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-4 py-3 sticky left-0 bg-gray-50 dark:bg-gray-700/95 z-10 shadow-2xs">Tên Chỉ Số</th>
                  <th className="px-4 py-3 text-right">Giá Trị Mới Nhất</th>
                  <th className="px-4 py-3 text-right">Kỳ Trước</th>
                  <th className="px-4 py-3 text-right">Đỉnh Lịch Sử</th>
                  <th className="px-4 py-3 text-right">Đáy Lịch Sử</th>
                  <th className="px-4 py-3 text-center">Đơn Vị</th>
                  <th className="px-4 py-3 text-right">Kỳ Báo Cáo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredIndicators.map((it, idx) => (
                  <tr key={idx} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition">
                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10 shadow-2xs">
                      <div>{it.name}</div>
                      {it.categoryTitle && (
                        <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400">
                          {it.categoryTitle}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-indigo-600 dark:text-indigo-400">
                      {it.rawLast || it.value}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{it.rawPrevious || it.previous || '—'}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">{it.highest ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-rose-500 font-medium">{it.lowest ?? '—'}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{it.unit || '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{it.period || '—'}</td>
                  </tr>
                ))}
                {filteredIndicators.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Không tìm thấy chỉ số phù hợp với từ khóa "{indicatorSearch}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
