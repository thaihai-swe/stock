import React, { useState } from 'react';
import IntelligenceBadge from '../common/IntelligenceBadge.jsx';

export default function ScenarioMatrixCard({
  macroData = {},
  scenarioMatrix = {},
  market = {},
}) {
  const [scenarioViewMode, setScenarioViewMode] = useState('ai'); // 'ai' | 'heuristic'
  const [isExpanded, setIsExpanded] = useState(true);

  const aiScenariosData = macroData?.aiScenarios || {};
  const aiScenarios = aiScenariosData?.scenarios || {};
  const hasAiScenarios = Boolean(aiScenarios?.base);
  const isAiScenarioActive = scenarioViewMode === 'ai' && hasAiScenarios;

  const currentPoint = market?.currentPoint || scenarioMatrix?.base?.currentPoint;

  return (
    <div className="bg-white dark:bg-slate-900 p-5 sm:p-7 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Dự Phóng Vĩ Mô & Định Lượng Kịch Bản (Scenario Matrix)
            </span>
            <IntelligenceBadge
              type={isAiScenarioActive ? 'ai' : 'heuristic'}
              tooltip={isAiScenarioActive ? 'Kịch bản dự phóng động tổng hợp từ AI Copilot' : 'Mô hình dự phóng xác suất 3 kịch bản VN-Index & phân bổ ngành'}
            />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 mt-0.5">
            3 Kịch Bản Định Giá VN-Index & Phân Bổ Ngành
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* View Mode Toggle */}
          {hasAiScenarios && (
            <div className="flex items-center bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setScenarioViewMode('ai')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  isAiScenarioActive
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span>🤖</span>
                <span>AI Phân Tích Động</span>
              </button>
              <button
                type="button"
                onClick={() => setScenarioViewMode('heuristic')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  !isAiScenarioActive
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <span>📐</span>
                <span>Định Lượng Neo</span>
              </button>
            </div>
          )}

          {/* Collapse / Expand Button */}
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            title={isExpanded ? 'Thu gọn kịch bản' : 'Mở rộng chi tiết kịch bản'}
          >
            <span>{isExpanded ? '▲' : '▼'}</span>
            <span className="hidden sm:inline">{isExpanded ? 'Thu Gọn' : 'Chi Tiết'}</span>
          </button>
        </div>
      </div>

      {/* Subheader info: Point + Probabilities */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {currentPoint && (
          <span className="px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-800/40">
            🎯 Điểm gốc: <b>{Number(currentPoint).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</b> điểm
          </span>
        )}
        <span className="text-gray-500 dark:text-slate-400">
          Xác suất: <b className="text-indigo-600 dark:text-indigo-400">
            {isAiScenarioActive
              ? `${aiScenarios?.base?.probability || 55}% Base · ${aiScenarios?.bull?.probability || 25}% Bull · ${aiScenarios?.bear?.probability || 20}% Bear`
              : `${scenarioMatrix?.base?.probability || 55}% Base · ${scenarioMatrix?.bull?.probability || 25}% Bull · ${scenarioMatrix?.bear?.probability || 20}% Bear`}
          </b>
        </span>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-1">
          {/* AI Market Verdict Banner */}
          {isAiScenarioActive && aiScenariosData.marketVerdict && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
              <span className="text-base">🎯</span>
              <div className="leading-relaxed">
                <span className="font-bold">Định Vị Thị Trường: </span>
                {aiScenariosData.marketVerdict}
              </div>
            </div>
          )}

          {/* ── HIỂN THỊ GÓC NHÌN AI PHÂN TÍCH ĐỘNG ── */}
          {isAiScenarioActive ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Base Case AI */}
              {aiScenarios.base && (
                <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-blue-700 dark:text-blue-300">
                        {aiScenarios.base.name}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-xs font-black">
                        {aiScenarios.base.probability}%
                      </span>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-blue-900 dark:text-blue-100">
                        {aiScenarios.base.vnIndexTargetRange}
                      </div>
                      <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                        Target P/E: {aiScenarios.base.targetPeRange} &bull; EPS: {aiScenarios.base.projectedEpsGrowth}
                      </div>
                    </div>
                    {aiScenarios.base.macroCatalysts?.length > 0 && (
                      <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                        <b className="text-gray-900 dark:text-white block">Chất xúc tác vĩ mô:</b>
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px] leading-relaxed">
                          {aiScenarios.base.macroCatalysts.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiScenarios.base.actionSummary && (
                      <div className="text-xs text-blue-800 dark:text-blue-200 bg-blue-100/50 dark:bg-blue-900/30 p-2.5 rounded-xl leading-relaxed">
                        <b>Chiến lược:</b> {aiScenarios.base.actionSummary}
                      </div>
                    )}
                  </div>
                  <div className="pt-3 border-t border-blue-200/60 dark:border-blue-800/40 space-y-2">
                    {aiScenarios.base.leadingSectors?.length > 0 && (
                      <div className="text-[11px] space-y-0.5">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <span>✓ Ngành dẫn dắt:</span>
                        </div>
                        {aiScenarios.base.leadingSectors.map((s, i) => (
                          <div key={i} className="text-gray-600 dark:text-gray-300 pl-2">
                            &bull; <b>{s.sector}:</b> {s.thesis}
                          </div>
                        ))}
                      </div>
                    )}
                    {aiScenarios.base.laggingSectors?.length > 0 && (
                      <div className="text-[11px] space-y-0.5">
                        <div className="font-bold text-rose-500 flex items-center gap-1">
                          <span>✕ Thận trọng:</span>
                        </div>
                        {aiScenarios.base.laggingSectors.map((s, i) => (
                          <div key={i} className="text-gray-600 dark:text-gray-300 pl-2">
                            &bull; <b>{s.sector}:</b> {s.risk}
                          </div>
                        ))}
                      </div>
                    )}
                    {aiScenarios.base.tacticalAllocation && (
                      <div className="pt-1.5 flex items-center justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400">
                        <span>Phân bổ:</span>
                        <span className="text-emerald-600 dark:text-emerald-400">CP {aiScenarios.base.tacticalAllocation.equity}%</span>
                        <span className="text-blue-600 dark:text-blue-400">TP {aiScenarios.base.tacticalAllocation.bond}%</span>
                        <span className="text-indigo-600 dark:text-indigo-400">Tiền {aiScenarios.base.tacticalAllocation.cash}%</span>
                        <span className="text-amber-600 dark:text-amber-400">Vàng {aiScenarios.base.tacticalAllocation.gold}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bull Case AI */}
              {aiScenarios.bull && (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-300">
                        {aiScenarios.bull.name}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-black">
                        {aiScenarios.bull.probability}%
                      </span>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100">
                        {aiScenarios.bull.vnIndexTargetRange}
                      </div>
                      <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        Target P/E: {aiScenarios.bull.targetPeRange} &bull; EPS: {aiScenarios.bull.projectedEpsGrowth}
                      </div>
                    </div>
                    {aiScenarios.bull.macroCatalysts?.length > 0 && (
                      <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                        <b className="text-gray-900 dark:text-white block">Chất xúc tác vĩ mô:</b>
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px] leading-relaxed">
                          {aiScenarios.bull.macroCatalysts.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiScenarios.bull.actionSummary && (
                      <div className="text-xs text-emerald-800 dark:text-emerald-200 bg-emerald-100/50 dark:bg-emerald-900/30 p-2.5 rounded-xl leading-relaxed">
                        <b>Chiến lược:</b> {aiScenarios.bull.actionSummary}
                      </div>
                    )}
                  </div>
                  <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 space-y-2">
                    {aiScenarios.bull.leadingSectors?.length > 0 && (
                      <div className="text-[11px] space-y-0.5">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <span>✓ Ngành dẫn dắt:</span>
                        </div>
                        {aiScenarios.bull.leadingSectors.map((s, i) => (
                          <div key={i} className="text-gray-600 dark:text-gray-300 pl-2">
                            &bull; <b>{s.sector}:</b> {s.thesis}
                          </div>
                        ))}
                      </div>
                    )}
                    {aiScenarios.bull.laggingSectors?.length > 0 && (
                      <div className="text-[11px] space-y-0.5">
                        <div className="font-bold text-rose-500 flex items-center gap-1">
                          <span>✕ Thận trọng:</span>
                        </div>
                        {aiScenarios.bull.laggingSectors.map((s, i) => (
                          <div key={i} className="text-gray-600 dark:text-gray-300 pl-2">
                            &bull; <b>{s.sector}:</b> {s.risk}
                          </div>
                        ))}
                      </div>
                    )}
                    {aiScenarios.bull.tacticalAllocation && (
                      <div className="pt-1.5 flex items-center justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400">
                        <span>Phân bổ:</span>
                        <span className="text-emerald-600 dark:text-emerald-400">CP {aiScenarios.bull.tacticalAllocation.equity}%</span>
                        <span className="text-blue-600 dark:text-blue-400">TP {aiScenarios.bull.tacticalAllocation.bond}%</span>
                        <span className="text-indigo-600 dark:text-indigo-400">Tiền {aiScenarios.bull.tacticalAllocation.cash}%</span>
                        <span className="text-amber-600 dark:text-amber-400">Vàng {aiScenarios.bull.tacticalAllocation.gold}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bear Case AI */}
              {aiScenarios.bear && (
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-rose-700 dark:text-rose-300">
                        {aiScenarios.bear.name}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs font-black">
                        {aiScenarios.bear.probability}%
                      </span>
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-black text-rose-900 dark:text-rose-100">
                        {aiScenarios.bear.vnIndexTargetRange}
                      </div>
                      <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                        Target P/E: {aiScenarios.bear.targetPeRange} &bull; EPS: {aiScenarios.bear.projectedEpsGrowth}
                      </div>
                    </div>
                    {aiScenarios.bear.macroCatalysts?.length > 0 && (
                      <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                        <b className="text-gray-900 dark:text-white block">Chất xúc tác vĩ mô:</b>
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px] leading-relaxed">
                          {aiScenarios.bear.macroCatalysts.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiScenarios.bear.actionSummary && (
                      <div className="text-xs text-rose-800 dark:text-rose-200 bg-rose-100/50 dark:bg-rose-900/30 p-2.5 rounded-xl leading-relaxed">
                        <b>Chiến lược:</b> {aiScenarios.bear.actionSummary}
                      </div>
                    )}
                  </div>
                  <div className="pt-3 border-t border-rose-200/60 dark:border-rose-800/40 space-y-2">
                    {aiScenarios.bear.leadingSectors?.length > 0 && (
                      <div className="text-[11px] space-y-0.5">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <span>✓ Ngành dẫn dắt:</span>
                        </div>
                        {aiScenarios.bear.leadingSectors.map((s, i) => (
                          <div key={i} className="text-gray-600 dark:text-gray-300 pl-2">
                            &bull; <b>{s.sector}:</b> {s.thesis}
                          </div>
                        ))}
                      </div>
                    )}
                    {aiScenarios.bear.laggingSectors?.length > 0 && (
                      <div className="text-[11px] space-y-0.5">
                        <div className="font-bold text-rose-500 flex items-center gap-1">
                          <span>✕ Thận trọng:</span>
                        </div>
                        {aiScenarios.bear.laggingSectors.map((s, i) => (
                          <div key={i} className="text-gray-600 dark:text-gray-300 pl-2">
                            &bull; <b>{s.sector}:</b> {s.risk}
                          </div>
                        ))}
                      </div>
                    )}
                    {aiScenarios.bear.tacticalAllocation && (
                      <div className="pt-1.5 flex items-center justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400">
                        <span>Phân bổ:</span>
                        <span className="text-emerald-600 dark:text-emerald-400">CP {aiScenarios.bear.tacticalAllocation.equity}%</span>
                        <span className="text-blue-600 dark:text-blue-400">TP {aiScenarios.bear.tacticalAllocation.bond}%</span>
                        <span className="text-indigo-600 dark:text-indigo-400">Tiền {aiScenarios.bear.tacticalAllocation.cash}%</span>
                        <span className="text-amber-600 dark:text-amber-400">Vàng {aiScenarios.bear.tacticalAllocation.gold}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── HIỂN THỊ GÓC NHÌN ĐỊNH LƯỢNG NEO (HEURISTIC) ── */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Base Case */}
              {scenarioMatrix?.base && (
                <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 space-y-3 flex flex-col justify-between">
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
                      <div className="text-xl sm:text-2xl font-black text-blue-900 dark:text-blue-100">
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
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 space-y-3 flex flex-col justify-between">
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
                      <div className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100">
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
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/40 space-y-3 flex flex-col justify-between">
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
                      <div className="text-xl sm:text-2xl font-black text-rose-900 dark:text-rose-100">
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
                      <span>✓ Ưu tiên:</span>
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
          )}
        </div>
      )}
    </div>
  );
}
