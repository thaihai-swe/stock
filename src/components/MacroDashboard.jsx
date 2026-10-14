import { useState, useEffect } from 'react';
import { fetchValuationMacro, fetchMacroIndicators, triggerValuationSync } from '../utils/api.js';

// Các component phân hệ kinh tế vĩ mô chuyên trách
import YieldCurveMonitorCard from './macro/YieldCurveMonitorCard.jsx';
import MacroHeroStatusBar from './macro/MacroHeroStatusBar.jsx';
import MacroSubTabNav from './macro/MacroSubTabNav.jsx';
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
  const [activeTab, setActiveTab] = useState('regime'); // 'regime' | 'yield_curve' | 'allocation' | 'indicators'

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
              Hệ Thống Trí Tuệ Vĩ Mô & Chu Kỳ Kinh Tế
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              Cập nhật: {macroData?._meta?.updatedAt ? new Date(macroData._meta.updatedAt).toLocaleDateString('vi-VN') : 'Mới nhất'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-2 sm:gap-3 text-gray-900 dark:text-white">
            <span>🌐</span> Kinh Tế Vĩ Mô & Chu Kỳ Kinh Doanh
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
            Nhận diện 5 pha chu kỳ kinh tế, đo lường điểm rủi ro vĩ mô 4 tầng, giám sát đường cong lợi suất TPCP, phân bổ 4 lớp tài sản & thư viện 95 chỉ số TradingEconomics.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-white/10 dark:hover:bg-white/20 dark:text-white active:scale-95 text-xs font-bold transition border border-indigo-500 dark:border-white/20 shadow-xs cursor-pointer disabled:opacity-50"
            title="Kích hoạt Python thu thập lợi suất TPCP, tỷ giá, vàng SJC/PNJ, lãi suất SBV và chỉ số vĩ mô (~15-25 giây)"
          >
            <span className={syncing ? 'animate-spin' : ''}>🔄</span>
            <span>{syncing ? 'Đang chạy Python (~20s)...' : 'Đồng Bộ Vĩ Mô (Python)'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. HERO STATUS BAR: 4 KPI CARDS VĨ MÔ ── */}
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

      {/* ── 3. THANH ĐIỀU HƯỚNG 4 PHÂN HỆ VĨ MÔ ── */}
      <MacroSubTabNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── 4. NỘI DUNG TỪNG PHÂN HỆ ── */}

      {/* PHÂN HỆ 1: CHU KỲ 5 PHA & RADAR DẪN DẮT */}
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

      {/* PHÂN HỆ 2: ĐƯỜNG CONG LỢI SUẤT 17 DÒNG & THỊ TRƯỜNG NỢ */}
      {activeTab === 'yield_curve' && (
        <div className="space-y-6">
          <MacroYieldCurveStressBox yieldCurve={yieldCurve} macro={macro} />
          <YieldCurveMonitorCard data={macroData} />
        </div>
      )}

      {/* PHÂN HỆ 3: PHÂN BỔ 4 TÀI SẢN & GIÁ VÀNG */}
      {activeTab === 'allocation' && (
        <div className="space-y-6">
          <MacroAllocationGoldSection
            macroData={macroData}
            assetAlloc={assetAlloc}
            goldAdv={goldAdv}
            macro={macro}
            risk={risk}
            regime={regime}
          />
          <MacroIntermarketGrid macro={macro} />
        </div>
      )}

      {/* PHÂN HỆ 4: THƯ VIỆN 95 CHỈ SỐ TRADINGECONOMICS */}
      {activeTab === 'indicators' && (
        <MacroTradingEconomicsTable indicatorsData={indicatorsData} />
      )}
    </div>
  );
}
