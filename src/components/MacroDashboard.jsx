import { useState, useEffect, useMemo } from 'react';
import { fetchValuationMacro, fetchMacroIndicators, triggerValuationSync } from '../utils/api.js';
import MarketIndexLiveChart from './macro/MarketIndexLiveChart.jsx';
import MarketValuationHistoryChart from './macro/MarketValuationHistoryChart.jsx';

export default function MacroDashboard({ refreshKey, onSwitchTab }) {
  const [macroData, setMacroData] = useState(null);
  const [indicatorsData, setIndicatorsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'regime' | 'sectors' | 'allocation' | 'indicators'
  const [indicatorCategory, setIndicatorCategory] = useState('overview');
  const [indicatorSearch, setIndicatorSearch] = useState('');

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
  const sectors = macroData?.sectorRotation || [];
  const leading = macroData?.leadingSignals || {};
  const assetAlloc = macroData?.assetAllocation || {};
  const goldAdv = macroData?.goldAdvisor || {};

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
        {/* Card 1: Pha Kinh Tế */}
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
        </div>

        {/* Card 2: Khẩu Vị Rủi Ro */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-2">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Khẩu Vị Thị Trường</div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            {leading.stance || 'Risk-On Nhẹ'}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Tín hiệu tích cực: <b className="text-emerald-600">{leading.bullishCount || 3}</b></span>
            <span>•</span>
            <span>Cảnh báo: <b className="text-rose-600">{leading.bearishCount || 1}</b></span>
          </div>
          <div className="text-xs text-gray-400">Dòng tiền ưu tiên tài sản rủi ro và tăng trưởng</div>
        </div>

        {/* Card 3: Thước Đo Rủi Ro Vĩ Mô */}
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
          <div className="text-[11px] text-gray-400 truncate">{risk.riskBucketLabel || 'Trung Bình (Theo dõi)'}</div>
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
          <div className="text-[11px] text-gray-400">Khuyến nghị: {assetAlloc.stance || '80% Cổ phiếu / 20% Tiền'}</div>
        </div>
      </div>

      {/* ── 3. THANH ĐIỀU HƯỚNG CÁC PHÂN HỆ VĨ MÔ (RESPONSIVE GRID / FLEX) ── */}
      <div className="grid grid-cols-2 md:flex md:items-center gap-1.5 p-1.5 bg-gray-100 dark:bg-gray-800/80 rounded-2xl border border-gray-200/60 dark:border-gray-700">
        {[
          { id: 'overview', icon: '📊', shortLabel: 'VN-Index & Định Giá', fullLabel: 'Định Giá VN-Index & Tài Sản Thực' },
          { id: 'regime', icon: '🌀', shortLabel: 'Chu Kỳ 5 Pha', fullLabel: 'Chu Kỳ 5 Pha & Radar Dẫn Dắt' },
          { id: 'sectors', icon: '🗺️', shortLabel: '11 Nhóm Ngành', fullLabel: 'Bản Đồ Xoay Vòng 11 Nhóm Ngành' },
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

          {/* 2. Card Định giá VN-Index P/E Bands 5 Năm */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-lg border border-white/10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Nhiệt Kế Thị Trường Chứng Khoán Việt Nam
                </span>
                <h3 className="text-2xl font-black mt-1 flex items-center gap-3">
                  {market.name || 'Chỉ Số VN-Index'}
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    {market.bandText || 'Rẻ (Vùng định giá hấp dẫn)'}
                  </span>
                </h3>
              </div>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6">
                <div>
                  <div className="text-xs text-gray-400">P/E Thị trường</div>
                  <div className="text-2xl font-black text-emerald-400">{market.currentPE}x</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">P/B Thị trường</div>
                  <div className="text-2xl font-black text-white">{market.currentPB}x</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Z-Score 5 Năm</div>
                  <div className="text-2xl font-black text-indigo-300">{market.zScore}</div>
                </div>
              </div>
            </div>

            {/* Thanh đo dải P/E Bands */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-300 font-medium">
                <span>Dải định giá P/E: Rất rẻ (&lt;11.5x)</span>
                <span>Trung bình chu kỳ 5 năm: 14.2x</span>
                <span>Rất đắt (&gt;18.0x)</span>
              </div>
              <div className="w-full h-4 bg-gray-800 rounded-full overflow-hidden p-0.5 flex gap-1 border border-white/10">
                <div className="flex-1 bg-emerald-500 rounded-l-full" title="Rất rẻ: <= 11.5x" />
                <div className="flex-1 bg-emerald-400 relative" title="Rẻ: 11.5 - 13.5x">
                  <div className="absolute top-1/2 -translate-y-1/2 left-3/4 w-3.5 h-3.5 bg-white rounded-full border-2 border-indigo-900 shadow-lg animate-pulse" />
                </div>
                <div className="flex-1 bg-blue-500" title="Hợp lý: 13.5 - 16.0x" />
                <div className="flex-1 bg-amber-500" title="Đắt: 16.0 - 18.0x" />
                <div className="flex-1 bg-rose-500 rounded-r-full" title="Rất đắt: > 18.0x" />
              </div>
            </div>

            {/* Khuyến nghị phân bổ vốn */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Khuyến Nghị Vị Thế Vốn: {assetAlloc.stance}
                </span>
                <p className="text-xs text-gray-300 mt-1">{assetAlloc.rationale}</p>
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
        </div>
      )}

      {/* ── 6. PHÂN HỆ 3: BẢN ĐỒ XOAY VÒNG 11 NHÓM NGÀNH HOSE ── */}
      {activeTab === 'sectors' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Ma Trận Nhạy Cảm & Xoay Vòng Vĩ Mô (Sector Rotation)
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
                  Đánh Giá Tác Động Lên 11 Nhóm Ngành Niêm Yết
                </h3>
              </div>
              <div className="text-xs text-gray-400">
                Pha hiện tại: <b className="text-indigo-600 dark:text-indigo-400">{regime.titleVi}</b>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Điểm số ròng (Net Impact Score) tính toán dựa trên ma trận nhạy cảm của từng ngành trước 6 động lực vĩ mô (Lãi suất liên ngân hàng, Lãi suất SBV, CPI, USD/VND, Dầu Brent, PMI).
            </p>

            {/* Lưới 11 Nhóm Ngành */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sectors.map((sec) => (
                <div
                  key={sec.key}
                  className="p-5 rounded-2xl bg-gray-50/70 dark:bg-gray-700/30 border border-gray-100 dark:border-gray-700 space-y-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{sec.icon}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{sec.name}</span>
                    </div>
                    <span className="text-xs font-black text-gray-400">#{sec.rank}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black border ${sec.colorClass}`}>
                      {sec.action}
                    </span>
                    <span className="text-xs font-black text-gray-700 dark:text-gray-300">
                      Net Score: {sec.netScore > 0 ? `+${sec.netScore}` : sec.netScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 7. PHÂN HỆ 4: PHÂN BỔ 4 TÀI SẢN & VÀNG SJC ── */}
      {activeTab === 'allocation' && (
        <div className="space-y-6">
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
