import { useState, useEffect } from 'react';
import { fetchValuationMacro, triggerValuationSync } from '../utils/api.js';

// Các component phân hệ thị trường chuyên trách
import MarketHeroStatusBar from './macro/MarketHeroStatusBar.jsx';
import MarketSubTabNav from './macro/MarketSubTabNav.jsx';
import MarketIndexLiveChart from './macro/MarketIndexLiveChart.jsx';
import MacroValuationWindowCard from './macro/MacroValuationWindowCard.jsx';
import MarketValuationHistoryChart from './macro/MarketValuationHistoryChart.jsx';
import StyleValuationComparison from './macro/StyleValuationComparison.jsx';
import SectorValuationHeatmap from './macro/SectorValuationHeatmap.jsx';
import { useToast } from '../context/ToastContext.jsx';
import LoadingState from './common/LoadingState.jsx';

export default function MarketDashboard({ refreshKey, onSwitchTab }) {
  const { showToast } = useToast();
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('indices'); // 'indices' | 'valuation' | 'styles' | 'sectors'
  const [valuationWindow, setValuationWindow] = useState('ten_year'); // 'five_year' | 'ten_year' | 'modern' | 'all_time'

  const loadData = async () => {
    setLoading(true);
    try {
      const m = await fetchValuationMacro().catch(() => null);
      setMarketData(m);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu thị trường:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await triggerValuationSync();
      await loadData();
      showToast(res?.message || '✅ Đồng bộ dữ liệu thị trường thành công!', 'info');
    } catch (e) {
      showToast('❌ ' + e.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  if (loading && !marketData) {
    return (
      <LoadingState
        message="Đang nạp toàn cảnh thị trường chứng khoán & VN-Index..."
        subMessage="Đồng bộ chỉ số trực tuyến, nhiệt kế định giá 4 cửa sổ và bản đồ 10 ngành GICS"
        minHeight="min-h-[400px]"
      />
    );
  }

  const market = marketData?.marketIndex || {};
  const styleIndices = marketData?.styleIndices || [];
  const assetAlloc = marketData?.assetAllocation || {};
  const regime = marketData?.regime || {};

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ── 1. HEADER & ĐỒNG BỘ THỊ TRƯỜNG ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50/60 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900 text-gray-900 dark:text-white rounded-3xl p-5 sm:p-7 lg:p-8 shadow-sm dark:shadow-xl border border-indigo-100 dark:border-white/10 relative overflow-hidden transition-colors">
        {/* Glow hiệu ứng nền */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              Hệ Thống Phân Tích Toàn Cảnh Thị Trường
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              Cập nhật: {marketData?._meta?.updatedAt ? new Date(marketData._meta.updatedAt).toLocaleDateString('vi-VN') : 'Mới nhất'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-2 sm:gap-3 text-gray-900 dark:text-white">
            <span>🏛️</span> Thị Trường Chứng Khoán & VN-Index
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
            Biểu đồ trực tuyến, nhiệt kế định giá P/E & P/B 4 chu kỳ, so sánh phân khúc vốn hóa & bản đồ luân chuyển 10 nhóm ngành GICS.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-white/10 dark:hover:bg-white/20 dark:text-white active:scale-95 text-xs font-bold transition border border-indigo-500 dark:border-white/20 shadow-xs cursor-pointer disabled:opacity-50"
            title="Kích hoạt Python thu thập dữ liệu định giá chỉ số và 10 ngành GICS (~15-25 giây)"
          >
            <span className={syncing ? 'animate-spin' : ''}>🔄</span>
            <span>{syncing ? 'Đang chạy Python (~20s)...' : 'Đồng Bộ Thị Trường (Python)'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. HERO STATUS BAR: 4 KPI CARDS THỊ TRƯỜNG ── */}
      <MarketHeroStatusBar
        market={market}
        styleIndices={styleIndices}
        valuationWindow={valuationWindow}
      />

      {/* ── 3. THANH ĐIỀU HƯỚNG 4 PHÂN HỆ THỊ TRƯỜNG ── */}
      <MarketSubTabNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* ── 4. NỘI DUNG TỪNG PHÂN HỆ ── */}

      {/* PHÂN HỆ 1: CHỈ SỐ & BIỂU ĐỒ TRỰC TUYẾN */}
      {activeTab === 'indices' && (
        <div className="space-y-6">
          <MarketIndexLiveChart />
        </div>
      )}

      {/* PHÂN HỆ 2: ĐỊNH GIÁ CHU KỲ & LỊCH SỬ 25 NĂM */}
      {activeTab === 'valuation' && (
        <div className="space-y-6">
          <MacroValuationWindowCard
            market={market}
            valuationWindow={valuationWindow}
            onValuationWindowChange={setValuationWindow}
            assetAlloc={assetAlloc}
          />
          <MarketValuationHistoryChart />
        </div>
      )}

      {/* PHÂN HỆ 3: SO SÁNH 4 PHÂN KHÚC VỐN HÓA & PHONG CÁCH */}
      {activeTab === 'styles' && (
        <div className="space-y-6">
          <StyleValuationComparison
            styleIndices={styleIndices}
            vnindexPE={market.currentPE || null}
            vnindexPB={market.currentPB || null}
            aiStyleRotation={marketData?.aiStyleRotation}
          />
        </div>
      )}

      {/* PHÂN HỆ 4: BẢN ĐỒ NHIỆT 10 NHÓM NGÀNH GICS */}
      {activeTab === 'sectors' && (
        <div className="space-y-6">
          <SectorValuationHeatmap
            dualMatrix={marketData?.dualMatrix}
            sectorValuations={marketData?.sectorValuations}
            sectorRotation={marketData?.sectorRotation}
            vnindexPE={market.currentPE || null}
            regime={regime}
            sectorTransmission={marketData?.sectorTransmission}
          />
        </div>
      )}
    </div>
  );
}
