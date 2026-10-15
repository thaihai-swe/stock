import React, { useState, useEffect, useMemo } from 'react';
import { formatVND } from '../../utils/format.js';
import IntelligenceBadge from '../common/IntelligenceBadge.jsx';

export default function InteractiveValuationSandboxCard({
  valuation,
  financials,
  currentPrice,
  symbol,
}) {
  const valData = valuation || financials?.valuationMultiples || {};
  const closePrice = currentPrice || valData.close || 0;
  const bvps = valData.bvps || 0;
  const eps = valData.eps || financials?.quarterly?.[financials.quarterly.length - 1]?.eps || 0;
  const roe = financials?.financialRatios?.profitability?.roe ?? valData.dupont?.roe ?? 15.0;

  // Lấy các tham số chuẩn ban đầu từ hệ thống
  const rawWacc = valData.dcfScenarios?.wacc ?? financials?.dcfScenarios?.wacc ?? financials?.dcfAnalysis?.sectorWacc ?? 11.5;
  const initWacc = Number(rawWacc > 1 ? rawWacc : rawWacc * 100) || 11.5;

  const rawG = valData.dcfScenarios?.terminalG ?? financials?.dcfScenarios?.terminalG ?? 3.5;
  const initTerminalG = Number(rawG > 1 ? rawG : rawG * 100) || 3.5;

  const initProjGrowth = 10.0; // Dự phóng tăng trưởng trung hạn mặc định
  const initTargetPe = Number(valData.pe || financials?.financialRatios?.valuation?.pe || 12.0);
  const initTargetPb = Number(valData.pb || financials?.financialRatios?.valuation?.pb || 1.35);
  const initMos = Number(valData.marginOfSafety ? (valData.marginOfSafety > 1 ? valData.marginOfSafety : valData.marginOfSafety * 100) : 20.0);

  const baseFairValue = Number(valData.fairValue || 0);
  const baseSafeBuyPrice = Number(valData.safeBuyPrice || (baseFairValue * (1 - initMos / 100)));

  // ── IN-MEMORY REACTIVE STATE (Không lưu LocalStorage, hoàn toàn linh hoạt trong phiên) ──
  const [wacc, setWacc] = useState(initWacc);
  const [terminalG, setTerminalG] = useState(initTerminalG);
  const [projGrowth, setProjGrowth] = useState(initProjGrowth);
  const [targetPe, setTargetPe] = useState(initTargetPe);
  const [targetPb, setTargetPb] = useState(initTargetPb);
  const [mos, setMos] = useState(initMos);
  const [activePreset, setActivePreset] = useState('base');

  // Khôi phục theo mã khi đổi sang mã cổ phiếu khác
  useEffect(() => {
    setWacc(initWacc);
    setTerminalG(initTerminalG);
    setProjGrowth(initProjGrowth);
    setTargetPe(initTargetPe);
    setTargetPb(initTargetPb);
    setMos(initMos);
    setActivePreset('base');
  }, [symbol, initWacc, initTerminalG, initProjGrowth, initTargetPe, initTargetPb, initMos]);

  // Bộ 3 Kịch bản nhanh (Presets)
  const applyPreset = (presetType) => {
    setActivePreset(presetType);
    if (presetType === 'bull') {
      setWacc(Math.max(7.0, Number((initWacc - 1.5).toFixed(1))));
      setTerminalG(Math.min(6.5, Number((initTerminalG + 1.0).toFixed(1))));
      setProjGrowth(Math.min(35.0, Number((initProjGrowth + 8.0).toFixed(1))));
      setTargetPe(Number((initTargetPe * 1.25).toFixed(1)));
      setTargetPb(Number((initTargetPb * 1.2).toFixed(2)));
      setMos(15);
    } else if (presetType === 'bear') {
      setWacc(Math.min(17.0, Number((initWacc + 2.0).toFixed(1))));
      setTerminalG(Math.max(1.5, Number((initTerminalG - 1.0).toFixed(1))));
      setProjGrowth(Math.max(-5.0, Number((initProjGrowth - 8.0).toFixed(1))));
      setTargetPe(Math.max(6.0, Number((initTargetPe * 0.8).toFixed(1))));
      setTargetPb(Math.max(0.7, Number((initTargetPb * 0.8).toFixed(2))));
      setMos(30);
    } else {
      // base
      setWacc(initWacc);
      setTerminalG(initTerminalG);
      setProjGrowth(initProjGrowth);
      setTargetPe(initTargetPe);
      setTargetPb(initTargetPb);
      setMos(initMos);
    }
  };

  // ── CLIENT-SIDE RECALCULATION ENGINE (Pure JS 0ms) ──
  const calculationResults = useMemo(() => {
    const rf = 6.0; // Lãi suất phi rủi ro tham chiếu thị trường VN
    const waccDec = Math.max(0.04, wacc / 100);
    const gDec = Math.max(0.01, terminalG / 100);
    const gProjDec = projGrowth / 100;
    const denominator = Math.max(0.015, waccDec - gDec);

    // 1. Graham Formula Dynamic
    let grahamVal = 0;
    if (eps > 0) {
      const hs = roe >= 15 ? 1.0 : 0.8;
      const basePe = Math.max(3.0, Math.min(8.5, 7.0));
      grahamVal = Math.round(eps * (basePe + hs * projGrowth) * (4.4 / rf));
    }

    // 2. Target P/E Multiple
    let peVal = 0;
    if (eps > 0) {
      const fwdEps = eps * (1 + gProjDec);
      peVal = Math.round(fwdEps * targetPe);
    }

    // 3. Gordon P/B & ROE Model
    let pbVal = 0;
    if (bvps > 0) {
      const roeDec = roe / 100;
      const spread = (roeDec - gDec) / denominator;
      const clampedSpread = Math.max(0.4, Math.min(4.5, spread));
      pbVal = Math.round(bvps * clampedSpread * (targetPb / Math.max(0.5, initTargetPb)));
    }

    // 4. Multi-Stage DCF (FCFF)
    let dcfVal = 0;
    const baseFcfPerShare = eps > 0 ? eps * 0.85 : (bvps > 0 ? bvps * 0.08 : 1000);
    if (baseFcfPerShare > 0) {
      const fcf1 = baseFcfPerShare * (1 + gProjDec);
      const fcf2 = fcf1 * (1 + gProjDec);
      const fcf3 = fcf2 * (1 + gProjDec);
      const df1 = 1 / (1 + waccDec);
      const df2 = 1 / Math.pow(1 + waccDec, 2);
      const df3 = 1 / Math.pow(1 + waccDec, 3);
      const pvExplicit = fcf1 * df1 + fcf2 * df2 + fcf3 * df3;
      const terminalVal = (fcf3 * (1 + gDec)) / denominator;
      dcfVal = Math.round(pvExplicit + terminalVal * df3);
    }

    // 5. Gordon Dividend Discount (DDM)
    let ddmVal = 0;
    const estimatedDiv = eps > 0 ? eps * 0.35 : 0;
    if (estimatedDiv > 0) {
      const div1 = estimatedDiv * (1 + Math.min(0.08, gProjDec));
      ddmVal = Math.round(div1 / denominator);
    }

    // 6. Residual Income Model (RIM / EVA)
    let rimVal = 0;
    if (bvps > 0) {
      const residualSpread = (roe / 100) - waccDec;
      const residualIncome = residualSpread * bvps;
      const pvResidual = residualIncome / denominator;
      rimVal = Math.round(Math.max(bvps * 0.5, bvps + pvResidual));
    }

    // 7. Tổng hợp các mô hình & lọc ngoại lai (Outlier Filter ±60%)
    const modelList = [
      { id: 'graham', name: 'Benjamin Graham Dynamic', val: grahamVal, weight: 0.15 },
      { id: 'pe', name: 'Target P/E Multiple', val: peVal, weight: 0.20 },
      { id: 'pb', name: 'Gordon P/B & ROE', val: pbVal, weight: 0.20 },
      { id: 'dcf', name: 'Multi-Stage DCF (FCFF)', val: dcfVal, weight: 0.25 },
      { id: 'ddm', name: 'Chiết Khấu Cổ Tức DDM', val: ddmVal, weight: 0.10 },
      { id: 'rim', name: 'Thu Nhập Thặng Dư RIM', val: rimVal, weight: 0.10 }
    ].filter(m => m.val > 0);

    let consensus = baseFairValue;
    if (modelList.length > 0) {
      const sortedVals = [...modelList.map(m => m.val)].sort((a, b) => a - b);
      const medianVal = sortedVals[Math.floor(sortedVals.length / 2)];
      
      const filtered = modelList.filter(m => Math.abs(m.val - medianVal) / medianVal <= 0.60);
      const activeList = filtered.length > 0 ? filtered : modelList;
      
      const totalWeight = activeList.reduce((acc, m) => acc + m.weight, 0);
      consensus = Math.round(activeList.reduce((acc, m) => acc + m.val * (m.weight / totalWeight), 0));
    }

    const safeBuy = Math.round(consensus * (1 - mos / 100));
    const currentMoS = consensus > 0 ? Number((((consensus - closePrice) / consensus) * 100).toFixed(1)) : 0;
    const deltaPrice = consensus - baseFairValue;
    const deltaPct = baseFairValue > 0 ? Number(((deltaPrice / baseFairValue) * 100).toFixed(1)) : 0;

    // Khuyến nghị hành động
    let recommendation = '🟡 THEO DÕI NẮM GIỮ';
    let recColor = 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800';
    if (closePrice <= safeBuy) {
      recommendation = '🟢 MUA GOM TÍCH LŨY (ĐẠT BIÊN AN TOÀN)';
      recColor = 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800';
    } else if (closePrice < consensus) {
      recommendation = '🟢 MUA THĂM DÒ (DƯỚI GIÁ TRỊ NỘI TẠI)';
      recColor = 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border-teal-300 dark:border-teal-800';
    } else if (closePrice > consensus * 1.25) {
      recommendation = '🔴 CÂN NHẮC CHỐT LỜI (VÙNG ĐẮT ĐỎ)';
      recColor = 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800';
    }

    return {
      consensus,
      safeBuy,
      currentMoS,
      deltaPrice,
      deltaPct,
      modelList,
      recommendation,
      recColor
    };
  }, [wacc, terminalG, projGrowth, targetPe, targetPb, mos, eps, bvps, roe, closePrice, baseFairValue, initTargetPb]);

  // ── MA TRẬN ĐỘ NHẠY 2 CHIỀU (5x5 Heatmap: WACC vs Terminal g) ──
  const sensitivityHeatmap = useMemo(() => {
    const waccSteps = [
      Math.max(6.0, Number((wacc - 2.0).toFixed(1))),
      Math.max(6.5, Number((wacc - 1.0).toFixed(1))),
      wacc,
      Number((wacc + 1.0).toFixed(1)),
      Number((wacc + 2.0).toFixed(1))
    ];
    const gSteps = [2.0, 2.75, 3.5, 4.25, 5.0];

    const baseFcf = eps > 0 ? eps * 0.85 : (bvps > 0 ? bvps * 0.08 : 1000);
    const gProjDec = projGrowth / 100;

    const rows = waccSteps.map(wStep => {
      const wDec = wStep / 100;
      const cols = gSteps.map(gStep => {
        const gDec = gStep / 100;
        const denom = Math.max(0.015, wDec - gDec);
        const fcf1 = baseFcf * (1 + gProjDec);
        const fcf2 = fcf1 * (1 + gProjDec);
        const fcf3 = fcf2 * (1 + gProjDec);
        const df1 = 1 / (1 + wDec);
        const df2 = 1 / Math.pow(1 + wDec, 2);
        const df3 = 1 / Math.pow(1 + wDec, 3);
        const pvExp = fcf1 * df1 + fcf2 * df2 + fcf3 * df3;
        const tv = (fcf3 * (1 + gDec)) / denom;
        const price = Math.round(pvExp + tv * df3);
        const upside = closePrice > 0 ? Number((((price - closePrice) / closePrice) * 100).toFixed(1)) : 0;
        const isCurrent = Math.abs(wStep - wacc) < 0.05 && Math.abs(gStep - terminalG) < 0.05;

        return {
          wStep,
          gStep,
          price,
          upside,
          isCurrent
        };
      });
      return { wStep, cols };
    });

    return { waccSteps, gSteps, rows };
  }, [wacc, terminalG, projGrowth, eps, bvps, closePrice]);

  return (
    <div className="p-5 sm:p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs space-y-6">
      {/* ── HEADER CỦA SANDBOX ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">🧪</span>
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Phòng Thí Nghiệm Giả Định
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Interactive Valuation Sandbox
            </span>
            <IntelligenceBadge type="heuristic" tooltip="Tự do điều chỉnh tham số giả định đầu vào và quan sát kết quả định giá phản hồi thời gian thực 0ms" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
            Phòng Thí Nghiệm Giả Định Định Giá &amp; Độ Nhạy Độ Sâu — {symbol}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Kéo các thanh trượt tham số bên dưới để kiểm tra các kịch bản thị trường khác nhau. Toàn bộ định giá được tính toán lại ngay lập tức trên trình duyệt của bạn.
          </p>
        </div>

        {/* ── BỘ PRESET KỊCH BẢN 1-CLICK ── */}
        <div className="flex items-center gap-1.5 flex-wrap self-start md:self-auto">
          <button
            type="button"
            onClick={() => applyPreset('bull')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
              activePreset === 'bull'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <span>🐂</span>
            <span>Bull Case</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('base')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
              activePreset === 'base'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200'
            }`}
          >
            <span>⚖️</span>
            <span>Base Case</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('bear')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1 cursor-pointer ${
              activePreset === 'bear'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
            }`}
          >
            <span>🐻</span>
            <span>Bear Case</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('base')}
            title="Đặt lại các tham số mặc định từ hệ thống"
            className="p-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            🔄
          </button>
        </div>
      </div>

      {/* ── HERO SO SÁNH BEFORE vs AFTER (LIVE DELTA) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cột 1: Định Giá Mặc Định Của Hệ Thống */}
        <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 space-y-1">
          <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">
            1. Định Giá Hệ Thống (Mặc Định)
          </span>
          <div className="text-xl font-black text-gray-800 dark:text-gray-200">
            {formatVND(baseFairValue)}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400">
            Giá mua an toàn gốc: <strong className="font-semibold text-gray-700 dark:text-gray-300">{formatVND(baseSafeBuyPrice)}</strong>
          </div>
        </div>

        {/* Cột 2: Định Giá Tùy Biến Trong Sandbox Của Bạn */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border-2 border-indigo-300 dark:border-indigo-700 shadow-2xs space-y-1 relative overflow-hidden">
          <div className="absolute top-2 right-2 text-indigo-400 dark:text-indigo-500 opacity-20 text-3xl select-none">
            🧪
          </div>
          <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 block uppercase tracking-wider">
            2. Định Giá Sandbox Của Bạn
          </span>
          <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300">
            {formatVND(calculationResults.consensus)}
          </div>
          <div className="text-xs text-indigo-900/80 dark:text-indigo-200 font-medium">
            Giá mua an toàn đề xuất: <strong className="font-bold text-emerald-600 dark:text-emerald-400">{formatVND(calculationResults.safeBuy)}</strong> (MoS {mos}%)
          </div>
        </div>

        {/* Cột 3: Delta Chênh Lệch & Khuyến Nghị Hành Động */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 space-y-2 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold text-gray-400 block uppercase tracking-wider">
              3. Chênh Lệch Giả Định (Delta)
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-base font-black ${calculationResults.deltaPrice >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {calculationResults.deltaPrice >= 0 ? '+' : ''}{formatVND(calculationResults.deltaPrice)}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${calculationResults.deltaPct >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'}`}>
                {calculationResults.deltaPct >= 0 ? '+' : ''}{calculationResults.deltaPct}%
              </span>
            </div>
          </div>
          <div className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-black text-center ${calculationResults.recColor}`}>
            {calculationResults.recommendation}
          </div>
        </div>
      </div>

      {/* ── BẢNG ĐIỀU KHIỂN 6 THANH TRƯỢT THAM SỐ (INTERACTIVE SLIDERS) ── */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚙️</span> Tinh Chỉnh 6 Tham Số Giả Định Cốt Lõi
          </h4>
          <span className="text-[11px] text-gray-400">
            Thị giá sàn: <strong className="text-gray-800 dark:text-gray-200">{formatVND(closePrice)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Slider 1: WACC */}
          <div className="p-3.5 bg-gray-50/70 dark:bg-gray-900/50 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <span>🏦</span> Chi Phí Vốn WACC
              </span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700">
                {wacc}%
              </span>
            </div>
            <input
              type="range"
              min="7.0"
              max="18.0"
              step="0.1"
              value={wacc}
              onChange={(e) => {
                setWacc(Number(e.target.value));
                setActivePreset('custom');
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>7.0% (Rẻ)</span>
              <span>Chuẩn: {initWacc}%</span>
              <span>18.0% (Đắt)</span>
            </div>
          </div>

          {/* Slider 2: Terminal g */}
          <div className="p-3.5 bg-gray-50/70 dark:bg-gray-900/50 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <span>🌱</span> Tăng Trưởng Dài Hạn (g)
              </span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700">
                {terminalG}%
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="6.5"
              step="0.1"
              value={terminalG}
              onChange={(e) => {
                setTerminalG(Number(e.target.value));
                setActivePreset('custom');
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>1.0% (Thận trọng)</span>
              <span>Chuẩn: {initTerminalG}%</span>
              <span>6.5% (Tích cực)</span>
            </div>
          </div>

          {/* Slider 3: Tăng trưởng EPS 3Y */}
          <div className="p-3.5 bg-gray-50/70 dark:bg-gray-900/50 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <span>🚀</span> Tăng Trưởng EPS 3 Năm
              </span>
              <span className={`font-mono font-bold px-2 py-0.5 rounded-md border ${projGrowth >= 0 ? 'text-emerald-600 dark:text-emerald-400 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'text-rose-600 dark:text-rose-400 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}>
                {projGrowth >= 0 ? '+' : ''}{projGrowth}%
              </span>
            </div>
            <input
              type="range"
              min="-10.0"
              max="35.0"
              step="0.5"
              value={projGrowth}
              onChange={(e) => {
                setProjGrowth(Number(e.target.value));
                setActivePreset('custom');
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>-10% (Suy giảm)</span>
              <span>10% (Bình thường)</span>
              <span>+35% (Bứt phá)</span>
            </div>
          </div>

          {/* Slider 4: Target P/E */}
          <div className="p-3.5 bg-gray-50/70 dark:bg-gray-900/50 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <span>🏷️</span> Bội Số P/E Mục Tiêu
              </span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700">
                {targetPe}x
              </span>
            </div>
            <input
              type="range"
              min="5.0"
              max="30.0"
              step="0.2"
              value={targetPe}
              onChange={(e) => {
                setTargetPe(Number(e.target.value));
                setActivePreset('custom');
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>5.0x</span>
              <span>Chuẩn: {initTargetPe}x</span>
              <span>30.0x</span>
            </div>
          </div>

          {/* Slider 5: Target P/B */}
          <div className="p-3.5 bg-gray-50/70 dark:bg-gray-900/50 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <span>📖</span> Bội Số P/B Mục Tiêu
              </span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700">
                {targetPb}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4.5"
              step="0.05"
              value={targetPb}
              onChange={(e) => {
                setTargetPb(Number(e.target.value));
                setActivePreset('custom');
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>0.5x</span>
              <span>Chuẩn: {initTargetPb}x</span>
              <span>4.5x</span>
            </div>
          </div>

          {/* Slider 6: Margin of Safety */}
          <div className="p-3.5 bg-gray-50/70 dark:bg-gray-900/50 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                <span>🛡️</span> Biên An Toàn (MoS)
              </span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700">
                {mos}%
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={mos}
              onChange={(e) => {
                setMos(Number(e.target.value));
                setActivePreset('custom');
              }}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>5% (Dễ dãi)</span>
              <span>Chuẩn: {initMos}%</span>
              <span>50% (Rất khắt khe)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── BẢNG ĐỐI CHIẾU 6 MÔ HÌNH ĐỊNH LƯỢNG SAU KHI ĐIỀU CHỈNH ── */}
      <div className="space-y-3 pt-2">
        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
          📊 Phân Rã Giá Trị Từng Mô Hình Sau Giả Định
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center text-xs">
          {calculationResults.modelList.map(m => {
            const diffFromClose = closePrice > 0 ? Math.round(((m.val - closePrice) / closePrice) * 100) : 0;
            return (
              <div key={m.id} className="p-3 bg-gray-50/60 dark:bg-gray-900/40 rounded-2xl border border-gray-200/70 dark:border-gray-700/70 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 line-clamp-1" title={m.name}>
                    {m.name}
                  </span>
                  <div className="font-black text-gray-900 dark:text-white text-sm mt-1">
                    {formatVND(m.val)}
                  </div>
                </div>
                <div className={`text-[10px] font-bold mt-1.5 ${diffFromClose >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {diffFromClose >= 0 ? '+' : ''}{diffFromClose}% vs giá sàn
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MA TRẬN ĐỘ NHẠY 2 CHIỀU (5x5 HEATMAP: WACC vs Terminal g) ── */}
      <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>🗺️</span> Ma Trận Độ Nhạy 2 Chiều: Chi Phí Vốn WACC vs Tăng Trưởng Dài Hạn (g)
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Quan sát mức giá mục tiêu biến động theo các kịch bản lãi suất và tăng trưởng kinh tế khác nhau.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-semibold self-start sm:self-auto">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Hời (&gt;+30%)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-teal-400"></span> Hấp dẫn (+10%~30%)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Hợp lý</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span> Đắt (&lt;-10%)</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <table className="w-full text-center border-collapse text-xs min-w-[500px]">
            <thead>
              <tr className="bg-gray-100/70 dark:bg-gray-900/60 text-gray-600 dark:text-gray-400 font-bold text-[11px]">
                <th className="p-2.5 border border-gray-200 dark:border-gray-700 text-left font-mono">
                  WACC \ g
                </th>
                {sensitivityHeatmap.gSteps.map(gStep => (
                  <th key={gStep} className="p-2.5 border border-gray-200 dark:border-gray-700">
                    g = {gStep}%
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivityHeatmap.rows.map(row => (
                <tr key={row.wStep}>
                  <td className="p-2.5 font-bold font-mono text-left bg-gray-50/80 dark:bg-gray-900/40 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 text-[11px]">
                    WACC = {row.wStep}%
                  </td>
                  {row.cols.map(c => {
                    let cellBg = 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                    if (c.upside >= 30) {
                      cellBg = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800';
                    } else if (c.upside >= 10) {
                      cellBg = 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800';
                    } else if (c.upside < -10) {
                      cellBg = 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800';
                    }

                    return (
                      <td
                        key={c.gStep}
                        className={`p-2 border transition-all ${cellBg} ${c.isCurrent ? 'ring-2 ring-indigo-600 dark:ring-indigo-400 font-black shadow-xs z-10' : 'font-medium'}`}
                      >
                        <div className="font-bold text-[11px]">
                          {formatVND(c.price)}
                        </div>
                        <div className="text-[10px] opacity-80 mt-0.5">
                          {c.upside >= 0 ? '+' : ''}{c.upside}%
                        </div>
                        {c.isCurrent && (
                          <span className="text-[9px] uppercase tracking-wider block font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                            🎯 Đang chọn
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
