import React, { useState, useEffect } from 'react';
import IntelligenceBadge from '../common/IntelligenceBadge.jsx';

export default function ExecutiveSummaryCard({ executiveSummary = {}, aiInsight: initialAiInsight = null, weeklyPulse: initialWeeklyPulse = null }) {
  const { keyRisks = [], catalysts = [], keyTakeaways = [] } = executiveSummary;
  const [activeTab, setActiveTab] = useState('ai_strategist'); // 'ai_strategist' | 'weekly_pulse' | 'traditional'
  const [aiInsight, setAiInsight] = useState(initialAiInsight || executiveSummary?.aiInsight || null);
  const [weeklyPulse, setWeeklyPulse] = useState(initialWeeklyPulse || executiveSummary?.weeklyPulse || null);

  useEffect(() => {
    if (initialAiInsight) {
      setAiInsight(initialAiInsight);
    } else if (executiveSummary?.aiInsight) {
      setAiInsight(executiveSummary.aiInsight);
    }
  }, [initialAiInsight, executiveSummary?.aiInsight]);

  useEffect(() => {
    if (initialWeeklyPulse) {
      setWeeklyPulse(initialWeeklyPulse);
    } else if (executiveSummary?.weeklyPulse) {
      setWeeklyPulse(executiveSummary.weeklyPulse);
    }
  }, [initialWeeklyPulse, executiveSummary?.weeklyPulse]);

  const hasTraditional = keyRisks.length > 0 || catalysts.length > 0 || keyTakeaways.length > 0;
  if (!hasTraditional && !aiInsight && !weeklyPulse) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs p-5 sm:p-7 space-y-6">
      {/* ── 1. HEADER & AI STATUS BADGE ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700/60">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Điều Hành Chiến Lược
            </span>
            {activeTab === 'ai_strategist' && (
              <IntelligenceBadge provider={aiInsight?.provider} />
            )}
            {activeTab === 'weekly_pulse' && (
              <IntelligenceBadge provider={weeklyPulse?.provider} />
            )}
            {activeTab === 'traditional' && (
              <IntelligenceBadge type="heuristic" tooltip="Báo cáo vĩ mô Heuristic quy tắc (macro_advisor.py)" />
            )}
            <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold border border-purple-200/50">
              {activeTab === 'weekly_pulse' ? 'Weekly Market Wrap' : activeTab === 'traditional' ? 'Rule-based & AI Synthesis' : 'CIO Macro Copilot'}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1 flex items-center gap-2">
            <span>{activeTab === 'weekly_pulse' ? '📅' : activeTab === 'traditional' ? '📋' : '🤖'}</span>
            <span>
              {activeTab === 'weekly_pulse'
                ? 'Bản Tin Nhịp Đập Thị Trường Cuối Tuần'
                : activeTab === 'traditional'
                ? 'Báo Cáo Điều Hành Tổng Hợp Quy Chuẩn'
                : 'Báo Cáo Chiến Lược CIO & Động Lực Vĩ Mô'}
            </span>
          </h3>
        </div>

        {/* Chuyển tab & Badge nguồn dữ liệu Pipeline */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-700/60 p-0.5 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('ai_strategist')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === 'ai_strategist'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-black'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <span>🤖 Chiến Lược CIO</span>
              <IntelligenceBadge size="xs" provider={aiInsight?.provider} />
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('weekly_pulse')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === 'weekly_pulse'
                  ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-2xs font-black'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <span>📅 Nhịp Đập Tuần</span>
              <IntelligenceBadge size="xs" provider={weeklyPulse?.provider} />
            </button>
            {hasTraditional && (
              <button
                type="button"
                onClick={() => setActiveTab('traditional')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer inline-flex items-center gap-1.5 ${
                  activeTab === 'traditional'
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-black'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <span>📋 Tổng Hợp Quy Chuẩn</span>
                <IntelligenceBadge size="xs" type="heuristic" tooltip="Báo cáo định lượng Heuristic quy chuẩn tài chính (macro_advisor.py) nhằm kiểm chứng chéo độc lập với AI" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/50 dark:border-indigo-800/40">
            <span>⚡</span>
            <span>Python Pipeline</span>
          </div>
        </div>
      </div>

      {/* ── 2. VIEW 1: AI MACRO STRATEGIST COPILOT ── */}
      {activeTab === 'ai_strategist' && (
        <div className="space-y-5">
          {aiInsight ? (
            <>
              {/* Hero Banner CIO Briefing */}
              <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-indigo-500/5 border border-indigo-200/80 dark:border-indigo-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                    <span className="text-base">💎</span>
                    <span>{aiInsight.headline || 'Chiến Lược Phân Bổ CIO Toàn Diện'}</span>
                  </div>
                  {aiInsight.updatedAt && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      Cập nhật: {new Date(aiInsight.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                  {aiInsight.executiveSummary}
                </p>
              </div>

              {/* 4 Trụ Cột Chiến Lược (Regime, Yield Curve, Sector, Asset Alloc) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiInsight.macroRegimeAssessment && (
                  <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      <span>🏛️</span> Chu Kỳ & Tăng Trưởng
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      {aiInsight.macroRegimeAssessment}
                    </p>
                  </div>
                )}

                {aiInsight.yieldCurveDiagnosis && (
                  <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      <span>📈</span> Đường Cong Lợi Suất & Thanh Khoản
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      {aiInsight.yieldCurveDiagnosis}
                    </p>
                  </div>
                )}

                {aiInsight.sectorActionStrategy && (
                  <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      <span>🎯</span> Nhóm Ngành Đón Sóng
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      {aiInsight.sectorActionStrategy}
                    </p>
                  </div>
                )}

                {aiInsight.assetAllocationAdvice && (
                  <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      <span>⚖️</span> Tỷ Trọng Phân Bổ Tài Sản
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      {aiInsight.assetAllocationAdvice}
                    </p>
                  </div>
                )}
              </div>

              {/* Lưới 2 cột: Kế Hoạch Hành Động (Action Plan) vs Cảnh Báo Rủi Ro (Risk Alerts) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Array.isArray(aiInsight.actionPlan) && aiInsight.actionPlan.length > 0 && (
                  <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-2">
                    <div className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <span>✅</span> Kế Hoạch Hành Động Cụ Thể
                    </div>
                    <div className="space-y-1.5">
                      {aiInsight.actionPlan.map((action, idx) => (
                        <div key={idx} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2">
                          <span className="font-bold text-emerald-600">#{idx + 1}</span>
                          <span className="leading-relaxed">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(aiInsight.riskAlerts) && aiInsight.riskAlerts.length > 0 && (
                  <div className="p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 space-y-2">
                    <div className="text-xs font-black uppercase text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <span>⚠️</span> Ngưỡng Rủi Ro Cần Giám Sát
                    </div>
                    <div className="space-y-1.5">
                      {aiInsight.riskAlerts.map((alert, idx) => (
                        <div key={idx} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2">
                          <span className="text-rose-500 font-bold">•</span>
                          <span className="leading-relaxed">{alert}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 space-y-2">
              <span className="text-3xl">✨</span>
              <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                Chưa Có Dữ Liệu Báo Cáo Chiến Lược CIO
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Báo cáo sẽ tự động được đồng bộ trong chu kỳ nền tuần (sáng Thứ Bảy 10:00) hoặc qua lệnh: <code className="font-mono text-indigo-600 dark:text-indigo-400">python scripts/generate_ai_insights.py --scope macro</code>.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── 3. VIEW 2: WEEKLY MARKET PULSE (NHỊP ĐẬP CUỐI TUẦN) ── */}
      {activeTab === 'weekly_pulse' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {weeklyPulse ? (
            <>
              {/* Hero Banner Weekly Pulse */}
              <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-indigo-500/5 border border-emerald-200/80 dark:border-emerald-800/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <span className="text-base">📅</span>
                    <span>{weeklyPulse.pulseHeadline || 'Bản Tin Nhịp Đập Thị Trường Cuối Tuần'}</span>
                  </div>
                  {weeklyPulse.updatedAt && (
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                      Cập nhật: {new Date(weeklyPulse.updatedAt).toLocaleDateString('vi-VN')}
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                  {weeklyPulse.weeklySummary}
                </p>
              </div>

              {/* 2 Cột: Dòng Tiền Tổ Chức & Nhóm Ngành Tâm Điểm Tuần */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {weeklyPulse.institutionalFlow && (
                  <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      <span>🏦</span> Dòng Tiền Tổ Chức & Khối Ngoại
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      {weeklyPulse.institutionalFlow}
                    </p>
                  </div>
                )}

                {Array.isArray(weeklyPulse.weeklyLeadingSectors) && weeklyPulse.weeklyLeadingSectors.length > 0 && (
                  <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      <span>🏆</span> Luân Chuyển Nhóm Ngành Tuần
                    </div>
                    <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-300">
                      {weeklyPulse.weeklyLeadingSectors.map((sec, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{sec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 3-4 Diễn Biến Trọng Yếu Trong Tuần */}
              {Array.isArray(weeklyPulse.keyDevelopments) && weeklyPulse.keyDevelopments.length > 0 && (
                <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 space-y-2">
                  <div className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-2">
                    <span>📌</span> Diễn Biến & Sự Kiện Trọng Yếu Trong Tuần
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {weeklyPulse.keyDevelopments.map((dev, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white/80 dark:bg-gray-800/80 border border-blue-100 dark:border-blue-900/40 text-xs text-gray-700 dark:text-gray-300">
                        <span className="font-bold text-blue-600 dark:text-blue-400 mr-1.5">{idx + 1}.</span>
                        {dev}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2 Cột: Kịch Bản Tuần Tới & Chiến Lược Hành Động */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {weeklyPulse.nextWeekOutlook && (
                  <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/40 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                      <span>🔮</span> Kịch Bản & Dự Phóng Tuần Tới
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      {weeklyPulse.nextWeekOutlook}
                    </p>
                  </div>
                )}

                {weeklyPulse.actionableAdvice && (
                  <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                      <span>🎯</span> Chiến Lược Khuyến Nghị Cho Nhà Đầu Tư
                    </div>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                      {weeklyPulse.actionableAdvice}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 space-y-2">
              <span className="text-3xl">📅</span>
              <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                Chưa Có Dữ Liệu Nhịp Đập Tuần
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Bản tin sẽ tự động được đồng bộ vào mỗi sáng Thứ Bảy lúc 10:00 hoặc chạy qua lệnh: <code className="font-mono text-emerald-600 dark:text-emerald-400">python scripts/generate_ai_insights.py --scope weekly_market</code>.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── 3. VIEW 2: BÁO CÁO ĐIỀU HÀNH TỔNG HỢP (AI EXECUTIVE SYNTHESIS & HEURISTIC BREAKDOWN) ── */}
      {activeTab === 'traditional' && (
        <div className="space-y-6">
          {/* AI Executive Synthesis Banner (Trích xuất tóm tắt AI để đối chiếu song song) */}
          {aiInsight?.executiveSummary && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent border border-purple-200/80 dark:border-purple-800/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-black uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <span className="text-sm">🤖</span>
                  <span>Tóm Tắt Tổng Hợp Điều Hành (AI Executive Synthesis)</span>
                </div>
                <IntelligenceBadge size="xs" provider={aiInsight?.provider} />
              </div>
              <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                {aiInsight.executiveSummary}
              </p>
            </div>
          )}

          {keyTakeaways.length > 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/5 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2.5">
              <div className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <span>🎯</span> 3 Điểm Nhấn Điều Hành Trọng Tâm (Key Takeaways)
              </div>
              <div className="space-y-2">
                {keyTakeaways.map((takeaway, idx) => {
                  const isHighlight = takeaway.startsWith('⭐');
                  return (
                    <div
                      key={idx}
                      className={`text-xs sm:text-sm leading-relaxed p-2.5 rounded-xl ${
                        isHighlight
                          ? 'bg-white/80 dark:bg-gray-800/90 font-bold text-gray-900 dark:text-white shadow-2xs border border-indigo-200/50 dark:border-indigo-800/50'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {takeaway}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Cột 1: Rủi Ro Trọng Yếu */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <span>⚠️</span> Rủi Ro Trọng Yếu ({keyRisks.length})
                </h4>
                <span className="text-[10px] text-gray-400">Xếp theo mức độ tác động</span>
              </div>

              <div className="space-y-2.5">
                {keyRisks.map((risk, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {risk.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border shrink-0 ${
                          risk.level === 'Rất cao'
                            ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                            : risk.level === 'Cao'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                        }`}
                      >
                        {risk.level}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {risk.risk}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cột 2: Động Lực Tăng Trưởng */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span>🚀</span> Động Lực Tăng Trưởng ({catalysts.length})
                </h4>
                <span className="text-[10px] text-gray-400">Cơ hội & Hậu thuẫn vĩ mô</span>
              </div>

              <div className="space-y-2.5">
                {catalysts.map((cat, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-gray-900 dark:text-white">
                        {cat.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border shrink-0 ${
                          cat.level === 'Cao'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            : 'bg-teal-500/10 text-teal-600 border-teal-500/30'
                        }`}
                      >
                        {cat.level}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                      {cat.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
