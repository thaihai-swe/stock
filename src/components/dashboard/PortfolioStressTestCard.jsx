import React, { useState, useEffect } from 'react';
import IntelligenceBadge, { getIntelligenceSource } from '../common/IntelligenceBadge.jsx';
import { fetchPortfolioAiStressTest, refreshPortfolioAiStressTest } from '../../utils/api.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function PortfolioStressTestCard({ holdings = [], cashBalance = 0, onRefreshSuccess }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('collapse_stress_test') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('collapse_stress_test', String(next));
      } catch (e) {}
      return next;
    });
  };

  useEffect(() => {
    let isMounted = true;
    async function loadReport() {
      try {
        setLoading(true);
        const data = await fetchPortfolioAiStressTest();
        if (isMounted) {
          setReport(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadReport();
    return () => { isMounted = false; };
  }, []);

  const handleRefresh = async () => {
    if (refreshing) return;
    try {
      setRefreshing(true);
      const res = await refreshPortfolioAiStressTest();
      if (res?.isQueued) {
        showToast(res.message || 'Yêu cầu làm mới đã được ghi nhận vào hàng đợi xử lý!', 'info');
        if (res.data) setReport(res.data);
      } else if (res?.data) {
        setReport(res.data);
        showToast(res.message || 'Đã làm mới báo cáo sức khỏe danh mục thành công!', 'success');
      } else {
        const updated = await fetchPortfolioAiStressTest();
        setReport(updated);
        showToast('Đã làm mới báo cáo sức khỏe danh mục!', 'success');
      }
      if (onRefreshSuccess) onRefreshSuccess();
    } catch (err) {
      console.warn('Lỗi refresh portfolio stress test:', err);
      showToast(err.message || 'Lỗi khi làm mới báo cáo AI', 'error');
    } finally {
      setRefreshing(false);
    }
  };


  const intel = getIntelligenceSource(report);
  const healthScore = report?.healthScore || 'B+';
  const isGoodScore = healthScore.startsWith('A');
  const isMidScore = healthScore.startsWith('B');

  const scoreColor = isGoodScore
    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
    : isMidScore
    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
    : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-slate-800 shadow-xs space-y-5 transition-all">
      {/* ── 1. HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Quản Trị Rủi Ro Danh Mục (CRO)
            </span>
            <IntelligenceBadge source={report} provider={report?.provider} />
            {report?.status === 'PENDING' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 animate-pulse border border-amber-300 dark:border-amber-700">
                ⏳ Đang chờ phân tích
              </span>
            )}
            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${scoreColor}`}>
              Hạng {healthScore}
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100 mt-1">
            Đo Lường Sức Khỏe Danh Mục & Chịu Tải Vĩ Mô
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Kích hoạt phân tích AI mới nhất cho cơ cấu danh mục hiện tại"
          >
            <span className={refreshing ? 'animate-spin' : ''}>⚡</span>
            <span>{refreshing ? 'Đang phân tích...' : 'Làm Mới AI'}</span>
          </button>
          <button
            type="button"
            onClick={toggleCollapse}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 transition-colors cursor-pointer"
            title={isCollapsed ? 'Mở rộng phân hệ' : 'Thu gọn phân hệ'}
          >
            <span>{isCollapsed ? 'Mở Rộng ▼' : 'Thu Gọn ▲'}</span>
          </button>
        </div>
      </div>

      {isCollapsed ? (
        <div className="flex flex-wrap items-center justify-between text-xs py-1 text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span>Beta: <strong className="text-slate-800 dark:text-slate-200 font-mono">{report?.portfolioBeta ?? 1.05}x</strong></span>
            <span>•</span>
            <span>Đệm Tiền: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{report?.cashWeightPct ?? 0}%</strong></span>
            <span>•</span>
            <span className="truncate max-w-xs">{report?.healthVerdict || 'Sức khỏe danh mục ổn định'}</span>
          </div>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">Hạng {healthScore}</span>
        </div>
      ) : loading && !report ? (
        <div className="p-8 text-center text-xs text-gray-400 dark:text-slate-500 animate-pulse">
          ⏳ Đang tính toán ma trận chịu tải vĩ mô của danh mục...
        </div>
      ) : (
        <>
          {/* ── 2. HERO VERDICT & TỔNG QUAN ── */}
          <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-start gap-2.5">
              <span className="text-xl">🛡️</span>
              <div className="space-y-1 flex-1">
                <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
                  {report?.healthVerdict || 'Danh mục được phân bổ cân bằng, độ nhạy cảm vĩ mô ở mức kiểm soát được.'}
                </p>
                <p className="text-xs text-gray-600 dark:text-slate-300 leading-relaxed">
                  {report?.summary || 'Cơ cấu phân bổ giữa cổ phiếu và tiền mặt tạo vùng đệm phòng thủ hợp lý trước biến động lãi suất.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
              <span className="text-gray-500 dark:text-slate-400">
                Beta Danh Mục: <strong className="text-gray-900 dark:text-slate-200 font-mono">{report?.portfolioBeta ?? 1.05}x</strong>
              </span>
              <span className="text-gray-300 dark:text-slate-700">•</span>
              <span className="text-gray-500 dark:text-slate-400">
                Đệm Tiền Mặt: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{report?.cashWeightPct ?? 0}%</strong>
              </span>
            </div>
          </div>

          {/* ── 3. MA TRẬN ĐỘ NHẠY VĨ MÔ ── */}
          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Chẩn Đoán Độ Nhạy Vĩ Mô (Macro Sensitivity)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Lãi suất */}
              <div className="p-3.5 bg-gray-50/70 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 block">
                  🏦 Rủi Ro Lãi Suất (Interest Rate)
                </span>
                <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 leading-relaxed">
                  {report?.macroSensitivity?.interestRateRisk || 'Trung bình — Nhóm ngân hàng có NIM ổn định bù đắp cho các ngành dùng nợ.'}
                </p>
              </div>

              {/* Tỷ giá USD/VND */}
              <div className="p-3.5 bg-gray-50/70 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 block">
                  💵 Rủi Ro Tỷ Giá (USD / VND)
                </span>
                <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 leading-relaxed">
                  {report?.macroSensitivity?.fxRisk || 'Thấp — Doanh nghiệp trong danh mục hầu như không có dư nợ vay ngoại tệ USD lớn.'}
                </p>
              </div>

              {/* Chu kỳ kinh tế */}
              <div className="p-3.5 bg-gray-50/70 dark:bg-slate-800/60 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-black uppercase text-gray-400 dark:text-slate-500 block">
                  🌊 Rủi Ro Chu Kỳ (Cyclical Risk)
                </span>
                <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 leading-relaxed">
                  {report?.macroSensitivity?.cyclicalRisk || 'Trung bình — Phụ thuộc vào chu kỳ phục hồi của tín dụng và đầu tư công.'}
                </p>
              </div>
            </div>
          </div>

          {/* ── 4. 3 KỊCH BẢN CHỊU TẢI (STRESS TEST SCENARIOS) ── */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Mô Phỏng 3 Kịch Bản Chịu Tải Cực Đoan (Macro Stress-Test)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(report?.stressTestScenarios || []).map((sc, i) => {
                const impact = Number(sc.estimatedImpactPct) || 0;
                const isHeavy = impact <= -6;
                const badgeColor = isHeavy
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200 dark:border-amber-800';

                return (
                  <div
                    key={i}
                    className="p-3.5 bg-gray-50/70 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md border text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900">
                          {sc.severity || 'Vừa phải'}
                        </span>
                        <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-md border ${badgeColor}`}>
                          Δ NAV: {impact > 0 ? `+${impact}%` : `${impact}%`}
                        </span>
                      </div>
                      <h5 className="text-xs font-bold text-gray-900 dark:text-slate-100">
                        {sc.name}
                      </h5>
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-slate-300 leading-relaxed pt-1 border-t border-gray-200/50 dark:border-slate-700/60">
                      {sc.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── 5. KẾ HOẠCH TÁI CÂN BẰNG (REBALANCING RECOMMENDATIONS) ── */}
          {report?.rebalancingRecommendations?.length > 0 && (
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base">🎯</span>
                <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Kế Hoạch Hành Động & Tái Cân Bằng (Rebalancing Blueprint)
                </h5>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-700 dark:text-slate-200">
                {report.rebalancingRecommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">•</span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer timestamp */}
          {report?.updatedAt && (
            <div className="text-right text-[10px] text-gray-400 dark:text-slate-500 font-mono">
              Báo cáo cập nhật: {new Date(report.updatedAt).toLocaleString('vi-VN')}
            </div>
          )}
        </>
      )}
    </div>
  );
}
