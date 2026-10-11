import React from 'react';

export default function FinancialHealthCard({ healthScore, earlyWarning }) {
  if (!healthScore && !earlyWarning) return null;

  const score = healthScore?.overallScore ?? 75;
  const grade = healthScore?.grade || 'Mạnh';
  const pillars = healthScore?.pillars || {};
  const alerts = earlyWarning?.alerts || [];
  const positiveSignals = earlyWarning?.positiveSignals || [];
  const riskScore = earlyWarning?.riskScore ?? 25;
  const riskLevel = earlyWarning?.riskLevel || 'An Toàn';
  const riskBadge = earlyWarning?.riskBadge || 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200';

  // Màu sắc theo điểm số sức khỏe
  const getScoreColor = (s) => {
    if (s >= 80) return 'text-emerald-500 stroke-emerald-500';
    if (s >= 65) return 'text-teal-500 stroke-teal-500';
    if (s >= 50) return 'text-blue-500 stroke-blue-500';
    if (s >= 35) return 'text-amber-500 stroke-amber-500';
    return 'text-rose-500 stroke-rose-500';
  };

  const getPillarBarColor = (s) => {
    if (s >= 80) return 'bg-emerald-500';
    if (s >= 60) return 'bg-teal-500';
    if (s >= 40) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  return (
    <div className="space-y-6">
      {/* ── KHỐI 1: TỔNG QUAN ĐIỂM SỨC KHỎE TÀI CHÍNH (HEALTH SCORE 0-100) ── */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Thước Đo Sức Khỏe Toàn Diện (Overall Health Score)
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${healthScore?.badge || 'bg-indigo-600 text-white'}`}>
                {grade}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              Điểm Đánh Giá Sức Khỏe Doanh Nghiệp 4 Trụ Cột
            </h3>
          </div>
          <div className="text-xs text-gray-400 max-w-md">
            Mô hình trọng số chuẩn mực: <b>30% Sinh Lời</b> · <b>25% Hiệu Quả</b> · <b>25% Đòn Bẩy</b> · <b>20% Thanh Khoản</b>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Gauge Tròn Điểm Tổng */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-gray-50/70 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-gray-200 dark:stroke-gray-700"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className={`transition-all duration-1000 ease-out ${getScoreColor(score)}`}
                  strokeWidth="10"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * score) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                  {score}
                </span>
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  / 100 Điểm
                </span>
              </div>
            </div>
            <div className="mt-3 font-bold text-sm text-gray-900 dark:text-white">
              Xếp Hạng: <span className="text-indigo-600 dark:text-indigo-400">{grade}</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              {healthScore?.description}
            </p>
          </div>

          {/* 4 Thanh Tiến Trình 4 Trụ Cột */}
          <div className="lg:col-span-8 space-y-4">
            {Object.entries(pillars).map(([key, pillar]) => (
              <div key={key} className="p-3.5 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200">
                    <span>{pillar.name}</span>
                    <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                      Tỷ trọng {pillar.weight}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-600 dark:text-indigo-400 font-black">{pillar.score}/100</span>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">({pillar.rating})</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${getPillarBarColor(pillar.score)}`}
                    style={{ width: `${Math.min(100, Math.max(0, pillar.score))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KHỐI 2: HỆ THỐNG CẢNH BÁO SỚM & DẤU HIỆU BÁO ĐỘNG ĐỎ (RED FLAGS) ── */}
      <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Hệ Thống Cảnh Báo Sớm Rủi Ro (Early Warning System)
            </span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
              Rà Soát Rủi Ro Cấu Trúc & Tín Hiệu Báo Động Đỏ
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Risk Score:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-black border ${riskBadge}`}>
              {riskScore}/100 · {riskLevel}
            </span>
          </div>
        </div>

        {earlyWarning?.recommendation && (
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed flex items-start gap-2.5">
            <span className="text-base">💡</span>
            <div>
              <b className="font-bold">Đánh giá chiến lược:</b> {earlyWarning.recommendation}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Cột Tín Hiệu Cảnh Báo (Alerts / Red Flags) */}
          <div className="space-y-3">
            <div className="text-xs font-black uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1.5 pb-1">
              <span>🚩</span>
              <span>Cờ Đỏ Cần Thận Trọng ({alerts.length})</span>
            </div>
            {alerts.length === 0 ? (
              <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <span>✓</span>
                <span>Tuyệt vời! Không phát hiện dấu hiệu báo động đỏ tài chính nào trong các kỳ gần đây.</span>
              </div>
            ) : (
              alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border space-y-1.5 ${
                    alert.severity === 'critical'
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200'
                      : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <span>{alert.severity === 'critical' ? '🔴' : '🟠'}</span>
                      <span>{alert.title}</span>
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white dark:bg-gray-800 border">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-90 leading-relaxed pl-5">
                    {alert.detail}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Cột Tín Hiệu Tích Cực (Positive Signals) */}
          <div className="space-y-3">
            <div className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pb-1">
              <span>🛡️</span>
              <span>Điểm Tựa Tích Cực ({positiveSignals.length})</span>
            </div>
            {positiveSignals.length === 0 ? (
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/30 border text-xs text-gray-500">
                Chưa ghi nhận tín hiệu đột phá nổi bật.
              </div>
            ) : (
              positiveSignals.map((sig, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200 space-y-1"
                >
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>🟢</span>
                    <span>{sig.title}</span>
                  </div>
                  <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/80 leading-relaxed pl-5">
                    {sig.detail}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
