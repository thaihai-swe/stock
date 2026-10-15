import React, { useState, useMemo } from 'react';
import IntelligenceBadge from '../common/IntelligenceBadge.jsx';

const DEFAULT_SCENARIOS_META = {
  base: {
    id: 'base',
    label: 'Kịch Bản Cơ Sở (Base Case)',
    prob: '55%',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    desc: 'Lạm phát CPI ổn định < 4.5%, SBV giữ lãi suất hỗ trợ, GDP đạt mục tiêu 6.5-7.0%.',
    vnindexRange: '1.260 – 1.340 điểm'
  },
  bull: {
    id: 'bull',
    label: 'Kịch Bản Tích Cực (Bull Case)',
    prob: '25%',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    desc: 'Fed hạ lãi suất nhanh, dòng vốn ngoại ETF đảo chiều mua ròng, nâng hạng FTSE thành công.',
    vnindexRange: '1.350 – 1.450 điểm'
  },
  bear: {
    id: 'bear',
    label: 'Kịch Bản Thận Trọng (Bear Case)',
    prob: '20%',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    desc: 'Tỷ giá USD/VND căng thẳng kéo dài, chi phí đẩy tăng áp lực lạm phát, thanh khoản co hẹp.',
    vnindexRange: '1.180 – 1.250 điểm'
  }
};

export default function ScenarioAllocationMatrix({ scenarioAllocation = {}, currentBucket = 'B2' }) {
  const [activeScenario, setActiveScenario] = useState('base');
  const [profile, setProfile] = useState('balanced'); // 'conservative' | 'balanced' | 'aggressive'
  const [horizon, setHorizon] = useState('medium'); // 'short' | 'medium' | 'long'

  const scenariosMeta = useMemo(() => {
    return {
      ...DEFAULT_SCENARIOS_META,
      ...(scenarioAllocation?.scenariosMeta || {}),
    };
  }, [scenarioAllocation?.scenariosMeta]);

  const baseAlloc = scenarioAllocation?.base || { equity: 50.0, bond: 30.0, cash: 15.0, gold: 5.0 };
  const bullAlloc = scenarioAllocation?.bull || { equity: 65.0, bond: 20.0, cash: 10.0, gold: 5.0 };
  const bearAlloc = scenarioAllocation?.bear || { equity: 30.0, bond: 35.0, cash: 25.0, gold: 10.0 };

  const matrixMap = {
    base: baseAlloc,
    bull: bullAlloc,
    bear: bearAlloc,
  };

  // Tính toán tỷ trọng cá nhân hóa động
  const personalizedAlloc = useMemo(() => {
    const raw = { ...matrixMap[activeScenario] };
    const pAdj = scenarioAllocation?.profiles?.[profile]?.equityAdj || 0;
    const hAdj = scenarioAllocation?.horizons?.[horizon]?.equityAdj || 0;
    const totalAdj = pAdj + hAdj;

    raw.equity = Math.max(10, Math.min(85, raw.equity + totalAdj));
    raw.cash = Math.max(5, raw.cash - totalAdj);

    // Rebalance về 100%
    const sum = raw.equity + raw.bond + raw.cash + raw.gold;
    return {
      equity: +(raw.equity / sum * 100).toFixed(1),
      bond: +(raw.bond / sum * 100).toFixed(1),
      cash: +(raw.cash / sum * 100).toFixed(1),
      gold: +(raw.gold / sum * 100).toFixed(1),
    };
  }, [activeScenario, profile, horizon, scenarioAllocation, matrixMap]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-xs p-5 sm:p-7 space-y-6">
      {/* ── 1. HEADER ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700/60">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Phân Bổ Tài Sản 4×3 Đa Kịch Bản
            </span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200/50">
              Macro Allocation Engine
            </span>
            <IntelligenceBadge type="heuristic" tooltip="Động cơ phân bổ tài sản 4 lớp theo 3 kịch bản kinh tế vĩ mô & khẩu vị rủi ro cá nhân" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1">
            Ma Trận Phân Bổ Danh Mục Theo 3 Kịch Bản Kinh Tế
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Xây dựng kế hoạch dự phòng cho danh mục đầu tư theo kịch bản Cơ sở, Tích cực và Thận trọng kèm tinh chỉnh cá nhân hóa.
          </p>
        </div>

        {/* Tab chọn kịch bản */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/80 p-1.5 rounded-2xl">
          {Object.values(scenariosMeta).map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveScenario(s.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeScenario === s.id
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>{s.id === 'base' ? '⚖️' : s.id === 'bull' ? '🚀' : '🛡️'}</span>
              <span>{s.label.split(' ')[2]}</span>
              <span className="text-[10px] opacity-75">({s.prob})</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 2. CARD KỊCH BẢN ĐANG CHỌN (SCENARIO CARD) ── */}
      {(() => {
        const scMeta = scenariosMeta[activeScenario] || scenariosMeta.base;
        return (
          <div className="p-4 sm:p-5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-200/70 dark:border-gray-700 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase border ${scMeta.badge}`}>
                  Xác suất: {scMeta.prob}
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {scMeta.label}
                </span>
              </div>
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <span>Dự phóng VN-Index:</span>
                <span className="text-sm font-black text-gray-900 dark:text-white">{scMeta.vnindexRange}</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {scMeta.desc}
            </p>
          </div>
        );
      })()}

      {/* ── 3. BỘ ĐIỀU KHIỂN CÁ NHÂN HÓA (KHẨU VỊ RỦI RO & CHÂN TRỜI ĐẦU TƯ) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
        {/* Khẩu vị rủi ro */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <span>🎯</span> Khẩu Vị Rủi Ro Của Bạn:
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'conservative', label: 'Bảo Thủ', desc: 'Thấp' },
              { id: 'balanced',     label: 'Cân Bằng', desc: 'Chuẩn' },
              { id: 'aggressive',   label: 'Tiến Thủ', desc: 'Cao' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setProfile(p.id)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition text-center cursor-pointer border ${
                  profile === p.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chân trời đầu tư */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <span>⏳</span> Chân Trời Đầu Tư:
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'short',  label: '< 1 Năm', desc: 'Ngắn' },
              { id: 'medium', label: '1 - 5 Năm', desc: 'Trung' },
              { id: 'long',   label: '> 5 Năm', desc: 'Dài' },
            ].map((h) => (
              <button
                key={h.id}
                onClick={() => setHorizon(h.id)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition text-center cursor-pointer border ${
                  horizon === h.id
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                }`}
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. KẾT QUẢ PHÂN BỔ TỶ TRỌNG CÁ NHÂN HÓA ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-gray-500">
          <span>GỢI Ý TỶ TRỌNG PHÂN BỔ TỐI ƯU</span>
          <span className="text-indigo-600 dark:text-indigo-400">Tổng = 100%</span>
        </div>

        {/* Visual Multi-bar */}
        <div className="h-4 w-full rounded-full overflow-hidden flex shadow-2xs border border-gray-200 dark:border-gray-700">
          <div style={{ width: `${personalizedAlloc.equity}%` }} className="bg-indigo-600" title={`Cổ phiếu: ${personalizedAlloc.equity}%`} />
          <div style={{ width: `${personalizedAlloc.bond}%` }} className="bg-blue-400" title={`Trái phiếu: ${personalizedAlloc.bond}%`} />
          <div style={{ width: `${personalizedAlloc.cash}%` }} className="bg-amber-400" title={`Tiền mặt: ${personalizedAlloc.cash}%`} />
          <div style={{ width: `${personalizedAlloc.gold}%` }} className="bg-yellow-500" title={`Vàng: ${personalizedAlloc.gold}%`} />
        </div>

        {/* 4 Asset Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">📈 Cổ Phiếu</span>
              <span className="text-xs text-gray-400">Equity</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {personalizedAlloc.equity}%
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300">🏛️ Trái Phiếu / Gửi TK</span>
              <span className="text-xs text-gray-400">Bonds</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
              {personalizedAlloc.bond}%
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">💵 Tiền Mặt</span>
              <span className="text-xs text-gray-400">Cash</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
              {personalizedAlloc.cash}%
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-yellow-50/70 dark:bg-yellow-950/40 border border-yellow-200/60 dark:border-yellow-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-yellow-700 dark:text-yellow-300">🪙 Vàng & Ngoại Tệ</span>
              <span className="text-xs text-gray-400">Gold/FX</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-yellow-600 dark:text-yellow-500">
              {personalizedAlloc.gold}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
