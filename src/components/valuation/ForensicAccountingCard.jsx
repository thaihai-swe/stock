import React, { useState } from 'react';
import { formatPercent, formatBn } from '../../utils/format';
import { MAGIC_FORMULA_UI } from '../../utils/constants';
import IntelligenceBadge from '../common/IntelligenceBadge.jsx';

/**
 * ForensicAccountingCard.jsx
 * Phân hệ Kiểm toán Tài chính & Bùng nổ Dòng Tiền:
 * 1. Beneish M-Score: Kiểm toán gian lận BCTC 8 biến số chuẩn học thuật.
 * 2. Joel Greenblatt Magic Formula: Kết hợp Earnings Yield (EY%) và Return on Capital (ROIC%).
 * 3. FCF Inflection Point: Nhận diện điểm uốn CapEx và Thước đo Dồn tích (Accruals Ratio).
 */
export default function ForensicAccountingCard({ financials, stockItem }) {
  const [activeTab, setActiveTab] = useState('beneish'); // 'beneish' | 'magic' | 'inflection'

  if (!financials) return null;

  const beneish = financials.beneishMScore || financials.forensicAnalysis?.beneish;
  const magic = financials.magicFormula || financials.forensicAnalysis?.magicFormula;
  const inflection = financials.fcfInflection || financials.forensicAnalysis?.fcfInflection;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
        <div>
          <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
            <span>🛡️</span>
            <span>Kiểm Toán Tài Chính & Sàng Lọc Lượng Hóa Cao Cấp</span>
            <IntelligenceBadge type="heuristic" tooltip="Mô hình kiểm toán gian lận Beneish, Magic Formula & điểm uốn FCF" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
            Beneish M-Score · Magic Formula · Điểm Uốn FCF
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Tự động đối chiếu số liệu từ BCTC kiểm toán, phát hiện nguy cơ thao túng lợi nhuận & nhận diện điểm bùng nổ chu kỳ vốn.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('beneish')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'beneish'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
            }`}
          >
            1. Beneish M-Score
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('magic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'magic'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
            }`}
          >
            2. Magic Formula
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inflection')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'inflection'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
            }`}
          >
            3. Điểm Uốn FCF & Accruals
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 1: BENEISH M-SCORE                                       */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'beneish' && (
        <div className="space-y-6">
          {beneish ? (
            <>
              {/* Hero Banner M-Score */}
              <div
                className={`p-5 rounded-2xl border ${
                  beneish.status === 'SAFE'
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                    : beneish.status === 'GREY'
                    ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50'
                    : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">
                        {beneish.status === 'SAFE' ? '🛡️' : beneish.status === 'GREY' ? '⚠️' : '🚨'}
                      </span>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                        Chỉ Số Kiểm Toán Gian Lận Beneish M-Score
                      </h4>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                          beneish.status === 'SAFE'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : beneish.status === 'GREY'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                        }`}
                      >
                        {beneish.manipulationProbability}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 max-w-2xl leading-relaxed">
                      {beneish.summary}
                    </p>
                    <div className="text-[11px] text-gray-400 mt-1">
                      Kỳ đối chiếu BCTC: <strong className="text-gray-700 dark:text-gray-300">{beneish.periodComparison}</strong>
                    </div>
                  </div>

                  {/* Big Number */}
                  <div className="text-right shrink-0 bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                    <div className="text-[10px] text-gray-400 font-semibold uppercase">Điểm Beneish M-Score</div>
                    <div
                      className={`text-3xl font-black mt-0.5 ${
                        beneish.status === 'SAFE'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : beneish.status === 'GREY'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {beneish.mScore != null ? beneish.mScore.toFixed(2) : '—'}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Chuẩn an toàn: &lt; -2.22</div>
                  </div>
                </div>

                {/* Thước đo trực quan 3 vùng */}
                <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-gray-700/60">
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mb-1.5 flex justify-between">
                    <span>Thang đo độ rủi ro thao túng:</span>
                    <span className="font-bold">M-Score = {beneish.mScore}</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex relative">
                    <div className="h-full bg-emerald-500 w-[50%]" title="An toàn (M < -2.22)" />
                    <div className="h-full bg-amber-400 w-[20%]" title="Vùng xám (-2.22 <= M <= -1.78)" />
                    <div className="h-full bg-rose-500 w-[30%]" title="Nguy cơ cao (M > -1.78)" />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">An Toàn (&lt; -2.22)</span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">Vùng Xám [-2.22; -1.78]</span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">Nguy Cơ Cao (&gt; -1.78)</span>
                  </div>
                </div>
              </div>

              {/* ── AI FORENSIC AUDITOR & EARNINGS QUALITY ── */}
              {financials?.forensicAnalysis?.aiAuditComment && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-50/80 via-indigo-50/50 to-white dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-gray-800 border border-purple-200/80 dark:border-purple-800/60 space-y-3.5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 dark:border-purple-800/40 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">🧠</span>
                      <h5 className="text-xs font-black uppercase tracking-wider text-purple-900 dark:text-purple-200">
                        Chẩn Đoán Kiểm Toán Pháp Y (AI Forensic Auditor)
                      </h5>
                      <IntelligenceBadge provider={financials.forensicAnalysis.aiAuditComment.provider} />
                    </div>
                    {financials.forensicAnalysis.aiAuditComment.auditVerdict && (
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        financials.forensicAnalysis.aiAuditComment.auditVerdict.includes('Sạch')
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : financials.forensicAnalysis.aiAuditComment.auditVerdict.includes('Lưu Ý')
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                      }`}>
                        {financials.forensicAnalysis.aiAuditComment.auditVerdict}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                    {financials.forensicAnalysis.aiAuditComment.forensicDiagnosis}
                  </p>

                  {Array.isArray(financials.forensicAnalysis.aiAuditComment.auditorChecklist) && financials.forensicAnalysis.aiAuditComment.auditorChecklist.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5">
                      <span className="text-[11px] font-black uppercase text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                        <span>📋</span> Câu Hỏi Chất Vấn Kiểm Toán Trọng Yếu Tại ĐHCĐ
                      </span>
                      <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5">
                        {financials.forensicAnalysis.aiAuditComment.auditorChecklist.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-indigo-600 font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Bảng 8 Chỉ Số Con Beneish */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-400 text-[11px] uppercase">
                      <th className="pb-3 pl-2">Mã & Tên Chỉ Số</th>
                      <th className="pb-3 text-right">Giá Trị Tính Toán</th>
                      <th className="pb-3 text-center">Ngưỡng Chuẩn</th>
                      <th className="pb-3 text-center">Đánh Giá</th>
                      <th className="pb-3 pl-4">Ý Nghĩa Thực Tế</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {(beneish.indices || []).map((idx) => (
                      <tr key={idx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                        <td className="py-3 pl-2">
                          <div className="font-bold text-gray-900 dark:text-white">{idx.name}</div>
                          <div className="text-[10px] text-gray-400">{idx.id}</div>
                        </td>
                        <td className="py-3 text-right font-black text-gray-900 dark:text-white">
                          <span
                            className={
                              idx.isAlert
                                ? 'text-rose-600 dark:text-rose-400 font-black'
                                : 'text-gray-900 dark:text-white'
                            }
                          >
                            {idx.value != null ? idx.value.toFixed(3) : '—'}
                          </span>
                        </td>
                        <td className="py-3 text-center text-gray-500 font-mono">{idx.benchmark}</td>
                        <td className="py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              idx.isAlert
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            }`}
                          >
                            {idx.status}
                          </span>
                        </td>
                        <td className="py-3 pl-4 text-gray-500 dark:text-gray-400 text-[11px] max-w-md">
                          {idx.desc}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Ghi chú học thuật */}
              <div className="p-3.5 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                💡 <strong>Phương pháp luận Beneish:</strong> Giáo sư Messod Beneish (Đại học Indiana, 1999) xây dựng mô hình định lượng này và từng dự báo chính xác vụ phá sản gian lận lịch sử của Tập đoàn Enron trước khi sụp đổ. Điểm M-Score âm càng sâu chứng tỏ tính liêm chính của BCTC càng vững chắc.
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-gray-400 text-xs">
              Đang tính toán hoặc chưa đủ dữ liệu đối chiếu 2 kỳ BCTC.
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 2: JOEL GREENBLATT MAGIC FORMULA                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'magic' && (
        <div className="space-y-6">
          {magic ? (
            <>
              {/* Hero Banner Magic Formula */}
              <div className="p-5 rounded-2xl border bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">✨</span>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                        Joel Greenblatt Magic Formula
                      </h4>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                          magic.tier === 'TOP_TIER'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : magic.tier === 'QUALITY_GROWTH'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                            : magic.tier === 'VALUE_PLAY'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                        }`}
                      >
                        {magic.category}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 max-w-2xl leading-relaxed">
                      👉 <strong>Khuyến nghị chiến lược:</strong> {magic.recommendation}
                    </p>
                  </div>

                  {/* Composite Score */}
                  <div className="text-right shrink-0 bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                    <div className="text-[10px] text-gray-400 font-semibold uppercase">Điểm Tổng Hợp Magic</div>
                    <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {magic.compositeScore}/100
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Top-Tier: &ge; {MAGIC_FORMULA_UI.topTierScore ?? 70} điểm</div>
                  </div>
                </div>
              </div>

              {/* 2 Trụ Cột: Earnings Yield & ROIC */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Trụ 1: Earnings Yield */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      1. Tỷ Suất Sinh Lời Thu Nhập (Earnings Yield - EY)
                    </span>
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-md ${
                        magic.earningsYield >= (MAGIC_FORMULA_UI.eyThreshold ?? 8.5)
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}
                    >
                      {magic.earningsYield >= (MAGIC_FORMULA_UI.eyThreshold ?? 8.5) ? 'Hấp Dẫn (Rẻ)' : 'Định Giá Cao'}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {magic.earningsYield}%
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    Công thức: <code>EBIT ÷ Enterprise Value (EV)</code>. Chuẩn: {magic.benchmarks?.earningsYieldTarget}
                  </p>
                </div>

                {/* Trụ 2: Return on Capital */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      2. Tỷ Suất Sinh Lời Trên Vốn (ROIC)
                    </span>
                    <span
                      className={`text-xs font-black px-2 py-0.5 rounded-md ${
                        magic.roic >= (MAGIC_FORMULA_UI.roicThreshold ?? 15.0)
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}
                    >
                      {magic.roic >= (MAGIC_FORMULA_UI.roicThreshold ?? 15.0) ? 'Moat Mạnh' : 'Hiệu Quả Vừa'}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {magic.roic}%
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                    Công thức: <code>EBIT ÷ (Vốn Lưu Động Ròng + TSCĐ)</code>. Chuẩn: {magic.benchmarks?.roicTarget}
                  </p>
                </div>
              </div>

              {/* Chi tiết thông số đầu vào */}
              {magic.parameters && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-3">
                    Bảng Tham Số Định Lượng (Đơn Vị: Tỷ Đồng)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                    <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">EBIT TTM</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                        {formatBn(magic.parameters.ebitTTM)}
                      </div>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">Vốn Hóa (MCap)</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                        {formatBn(magic.parameters.marketCap)}
                      </div>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">Nợ Ròng (Net Debt)</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                        {formatBn(magic.parameters.netDebt)}
                      </div>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">Giá Trị DN (EV)</div>
                      <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        {formatBn(magic.parameters.enterpriseValue)}
                      </div>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="text-[10px] text-gray-400 uppercase font-semibold">Vốn Hoạt Động</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                        {formatBn(magic.parameters.capitalEmployed)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-gray-400 text-xs">
              Đang tổng hợp dữ liệu Magic Formula cho mã cổ phiếu.
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 3: ĐIỂM UỐN FCF & ACCRUALS RATIO                          */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'inflection' && (
        <div className="space-y-6">
          {inflection ? (
            <>
              {/* Hero Banner FCF Inflection */}
              <div
                className={`p-5 rounded-2xl border ${
                  inflection.isInflection
                    ? 'bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-transparent border-indigo-300 dark:border-indigo-700'
                    : inflection.signal === 'CASH_COW_GENERATION'
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                    : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                        {inflection.statusTitle}
                      </h4>
                      {inflection.isInflection && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-600 text-white animate-pulse">
                          HOT INFLECTION
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 max-w-2xl leading-relaxed">
                      {inflection.narrative}
                    </p>
                  </div>

                  <div className="text-right shrink-0 bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                    <div className="text-[10px] text-gray-400 font-semibold uppercase">Tỷ Lệ Tiền CFO / LNST</div>
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {inflection.cfoToNiRatio}x
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Chuẩn chất lượng: &ge; 1.0x</div>
                  </div>
                </div>
              </div>

              {/* 4 Thước Đo Dòng Tiền & Dồn Tích */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                  <div className="text-[10px] text-gray-400 font-semibold uppercase">Cường Độ CapEx / DT</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                    {inflection.capexToRevenueRatio}%
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Tái đầu tư mở rộng</div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                  <div className="text-[10px] text-gray-400 font-semibold uppercase">Xây Dựng Dở Dang / TTS</div>
                  <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    {inflection.cipRatio}%
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{formatBn(inflection.constructionInProgress)} tỷ dở dang</div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                  <div className="text-[10px] text-gray-400 font-semibold uppercase">Hệ Số Dồn Tích (Accruals)</div>
                  <div
                    className={`text-xl font-black mt-1 ${
                      inflection.accrualsRatio <= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {inflection.accrualsRatio}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">(LNST - CFO) / TTS</div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                  <div className="text-[10px] text-gray-400 font-semibold uppercase">Xếp Hạng Chất Lượng Lợi Nhuận</div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                    {inflection.accrualsRating}
                  </div>
                </div>
              </div>

              {/* Giải thích chiến lược điểm uốn */}
              <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/40 text-xs text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
                <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <span>💡</span>
                  <span>Quy Luật Chu Kỳ Vốn & Điểm Uốn Tái Định Giá (Capital Cycle Inflection):</span>
                </div>
                <p>
                  Các cổ phiếu sản xuất đầu ngành (như Hòa Phát, PV Drilling, Vinamilk...) khi xây dựng đại công trình công suất mới, dòng tiền FCF thường bị âm hoặc thu hẹp do CapEx đạt đỉnh. Đây chính là vùng đáy định giá tâm lý. Khi dự án bước sang giai đoạn khánh thành đưa vào vận hành thương mại, CapEx giải ngân giảm mạnh trong khi doanh thu mới tạo ra dòng tiền đột biến. Sự đảo chiều của FCF từ Âm sang Dương chính là ngòi nổ cho sóng tái định giá mạnh nhất (Multiple Re-rating).
                </p>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-gray-400 text-xs">
              Đang phân tích chu kỳ dòng tiền tự do & dồn tích cho mã cổ phiếu.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
