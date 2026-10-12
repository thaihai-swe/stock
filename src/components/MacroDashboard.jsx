import { useState, useEffect } from 'react';
import { fetchValuationMacro, fetchMacroIndicators, triggerValuationSync } from '../utils/api.js';

// Các component phân hệ vĩ mô chuyên trách
import MarketIndexLiveChart from './macro/MarketIndexLiveChart.jsx';
import MarketValuationHistoryChart from './macro/MarketValuationHistoryChart.jsx';
import StyleValuationComparison from './macro/StyleValuationComparison.jsx';
import YieldCurveMonitorCard from './macro/YieldCurveMonitorCard.jsx';
import SectorValuationHeatmap from './macro/SectorValuationHeatmap.jsx';

// Các component vừa được module hóa và tối ưu responsive
import MacroHeroStatusBar from './macro/MacroHeroStatusBar.jsx';
import MacroSubTabNav from './macro/MacroSubTabNav.jsx';
import MacroValuationWindowCard from './macro/MacroValuationWindowCard.jsx';
import MacroYieldCurveStressBox from './macro/MacroYieldCurveStressBox.jsx';
import MacroIntermarketGrid from './macro/MacroIntermarketGrid.jsx';
import MacroRegimeRadarSection from './macro/MacroRegimeRadarSection.jsx';
import MacroAllocationGoldSection from './macro/MacroAllocationGoldSection.jsx';
import MacroTradingEconomicsTable from './macro/MacroTradingEconomicsTable.jsx';

export default function MacroDashboard({ refreshKey, onSwitchTab, showToast }) {
  const [macroData, setMacroData] = useState(null);
  const [indicatorsData, setIndicatorsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'regime' | 'yield_curve' | 'sectors' | 'allocation' | 'indicators'
  const [valuationWindow, setValuationWindow] = useState('ten_year'); // 'five_year' | 'ten_year' | 'modern' | 'all_time'

  const loadAllMacroData = async () => {
    setLoading(true);
    try {
      const [m, ind] = await Promise.all([
        fetchValuationMacro().catch(() => null),
        fetchMacroIndicators().catch(() => null),
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
      const res = await triggerValuationSync();
      await loadAllMacroData();
      if (showToast) showToast(res?.message || '✅ Đồng bộ dữ liệu vĩ mô thành công!', 'info');
    } catch (e) {
      if (showToast) showToast('❌ ' + e.message, 'error');
      else alert('Lỗi đồng bộ: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ── 1. HEADER & ĐỒNG BỘ VĨ MÔ ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50/60 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 text-gray-900 dark:text-white rounded-3xl p-5 sm:p-7 lg:p-8 shadow-sm dark:shadow-xl border border-indigo-100 dark:border-white/10 relative overflow-hidden transition-colors">
        {/* Glow hiệu ứng nền */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              Hệ Thống Trí Tuệ Vĩ Mô & Thị Trường
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              Cập nhật: {macroData?._meta?.updatedAt ? new Date(macroData._meta.updatedAt).toLocaleDateString('vi-VN') : 'Mới nhất'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-2 sm:gap-3 text-gray-900 dark:text-white">
            <span>🌐</span> Toàn Cảnh Kinh Tế Vĩ Mô & Chu Kỳ Thị Trường
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
            Nhận diện 5 pha chu kỳ kinh tế, đo lường điểm rủi ro vĩ mô, ma trận xoay vòng 10 nhóm ngành GICS và dữ liệu 95 chỉ số TradingEconomics.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-white/10 dark:hover:bg-white/20 dark:text-white active:scale-95 text-xs font-bold transition border border-indigo-500 dark:border-white/20 shadow-xs cursor-pointer disabled:opacity-50"
            title="Kích hoạt Python thu thập lợi suất TPCP, tỷ giá, vàng SJC/PNJ, P/E VN-Index và 10 ngành GICS (~15-25 giây)"
          >
            <span className={syncing ? 'animate-spin' : ''}>🔄</span>
            <span>{syncing ? 'Đang chạy Python (~20s)...' : 'Đồng Bộ Vĩ Mô (Python)'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. HERO STATUS BAR: 4 KPI CARDS (RESPONSIVE 2x2 TRÊN MOBILE) ── */}
      <MacroHeroStatusBar
        regime={regime}
        macroClock={macroClock}
        leading={leading}
        leadLag={leadLag}
        risk={risk}
        confidence={confidence}
        market={market}
        assetAlloc={assetAlloc}
      />

      {/* ── 3. THANH ĐIỀU HƯỚNG 6 PHÂN HỆ VĨ MÔ ── */}
      <MacroSubTabNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── 4. NỘI DUNG TỪNG PHÂN HỆ ── */}

      {/* PHÂN HỆ 1: ĐỊNH GIÁ VN-INDEX & TÀI SẢN THỰC */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Biểu đồ chỉ số trực tuyến & intraday DNSE */}
          <MarketIndexLiveChart />

          {/* Nhiệt kế định giá VN-Index 4 chu kỳ */}
          <MacroValuationWindowCard
            market={market}
            valuationWindow={valuationWindow}
            onValuationWindowChange={setValuationWindow}
            assetAlloc={assetAlloc}
          />

          {/* Lịch sử định giá 25 năm Vietstock */}
          <MarketValuationHistoryChart />

          {/* So sánh định giá 4 phong cách vốn hóa (VN30, Diamond, Midcap vs VN-Index) */}
          <StyleValuationComparison
            styleIndices={macroData?.styleIndices}
            vnindexPE={market.currentPE || 10.72}
            vnindexPB={market.currentPB || 1.8}
          />

          {/* Tóm tắt căng thẳng thị trường nợ & LSS */}
          <MacroYieldCurveStressBox yieldCurve={yieldCurve} macro={macro} />

          {/* Lưới 6 chỉ số liên thị trường */}
          <MacroIntermarketGrid macro={macro} />
        </div>
      )}

      {/* PHÂN HỆ 2: CHU KỲ 5 PHA & RADAR DẪN DẮT */}
      {activeTab === 'regime' && (
        <MacroRegimeRadarSection
          macroData={macroData}
          regime={regime}
          macroClock={macroClock}
          risk={risk}
          leading={leading}
          leadLag={leadLag}
          confidence={confidence}
          scenarioMatrix={scenarioMatrix}
          tailRisks={tailRisks}
          hasActiveTailRisk={hasActiveTailRisk}
          market={market}
        />
      )}

      {/* PHÂN HỆ 3: ĐƯỜNG CONG LỢI SUẤT 17 DÒNG */}
      {activeTab === 'yield_curve' && (
        <div className="space-y-6">
          <YieldCurveMonitorCard data={macroData} />
        </div>
      )}

      {/* PHÂN HỆ 4: BẢN ĐỒ NHIỆT 10 NHÓM NGÀNH GICS */}
      {activeTab === 'sectors' && (
        <div className="space-y-6">
          <SectorValuationHeatmap
            dualMatrix={macroData?.dualMatrix}
            sectorValuations={macroData?.sectorValuations}
            sectorRotation={macroData?.sectorRotation}
            vnindexPE={market.currentPE || 10.72}
            regime={regime}
          />
        </div>
      )}

      {/* PHÂN HỆ 5: PHÂN BỔ 4 TÀI SẢN & GIÁ VÀNG */}
      {activeTab === 'allocation' && (
        <MacroAllocationGoldSection
          macroData={macroData}
          assetAlloc={assetAlloc}
          goldAdv={goldAdv}
          macro={macro}
          risk={risk}
          regime={regime}
        />
      )}

      {/* PHÂN HỆ 6: THƯ VIỆN 95 CHỈ SỐ TRADINGECONOMICS */}
      {activeTab === 'indicators' && (
        <MacroTradingEconomicsTable indicatorsData={indicatorsData} />
      )}
    </div>
  );
}
