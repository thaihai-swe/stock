import { useState, useEffect, useMemo } from 'react';
import { fmtMoney, calcBreakEvenPrice } from '../utils/format.js';

export default function DcaSimulatorModal({
  isOpen,
  onClose,
  initialStock,
  portfolio = [],
  marketPrices = {},
  onNavigateBuy,
}) {
  // Chế độ: 'grid' (Lập Kế Hoạch Mua Gom Đa Tầng) hoặc 'single' (Mua Bình Quân Nhanh 1 Lần)
  const [tabMode, setTabMode] = useState('grid');
  const [selectedSymbol, setSelectedSymbol] = useState('');

  // --- State Chế độ 1 Lần ---
  const [addQty, setAddQty] = useState('100');
  const [addPriceK, setAddPriceK] = useState(''); // x1.000đ
  const [feePct, setFeePct] = useState('0.1');

  // --- State Chế độ Mua Gom Đa Tầng (Grid Pyramiding) ---
  const [gridBasePriceK, setGridBasePriceK] = useState(''); // Giá khởi điểm P0 (mặc định lấy theo thị trường)
  const [gridDropPct, setGridDropPct] = useState(3); // Bước giá giảm mỗi đợt (-3% mặc định)
  const [gridSteps, setGridSteps] = useState(20); // Số đợt gom (20 lần mặc định)
  const [gridBaseLot, setGridBaseLot] = useState(100); // Lô cơ sở (100 cp)
  const [gridVolumeStrategy, setGridVolumeStrategy] = useState('cluster3'); // 'cluster3', 'fixed', 'linear', 'martingale'
  const [includeCurrentHoldings, setIncludeCurrentHoldings] = useState(true); // Mặc định tính kèm danh mục hiện có

  // Khởi tạo mã khi mở modal
  useEffect(() => {
    if (initialStock?.symbol) {
      setSelectedSymbol(initialStock.symbol);
    } else if (portfolio.length > 0 && !selectedSymbol) {
      setSelectedSymbol(portfolio[0].symbol);
    }
  }, [initialStock, portfolio]);

  const currentStock = useMemo(() => {
    return portfolio.find(p => p.symbol === selectedSymbol) || initialStock || null;
  }, [portfolio, selectedSymbol, initialStock]);

  const livePrice = useMemo(() => {
    if (!selectedSymbol) return 0;
    return marketPrices[selectedSymbol]?.price || 0;
  }, [marketPrices, selectedSymbol]);

  // Cập nhật giá khởi điểm dự kiến mặc định theo Giá thị trường hiện tại (Live Price) khi đổi mã
  useEffect(() => {
    if (livePrice > 0) {
      const liveK = String(livePrice / 1000);
      setAddPriceK(liveK);
      setGridBasePriceK(liveK);
    } else if (currentStock?.avgCost > 0) {
      const avgK = String(Math.round(currentStock.avgCost / 1000));
      setAddPriceK(avgK);
      setGridBasePriceK(avgK);
    } else {
      setAddPriceK('10');
      setGridBasePriceK('10');
    }

    // Mặc định bật tích hợp vị thế nếu tài khoản đang nắm giữ cổ phiếu này
    if (currentStock?.totalQty > 0) {
      setIncludeCurrentHoldings(true);
    }
  }, [selectedSymbol, livePrice, currentStock]);

  const currentQty = currentStock?.totalQty || 0;
  const currentTotalCost = currentStock?.totalCost || 0;
  const currentAvgCost = currentStock?.avgCost || 0;
  const currentBreakEven = currentStock?.breakEvenPrice || calcBreakEvenPrice(currentAvgCost, 0.1);

  // ==========================================
  // 1. TÍNH TOÁN CHẾ ĐỘ 1 LẦN (SINGLE STEP)
  // ==========================================
  const plannedQty = parseInt(addQty) || 0;
  const plannedPrice = (parseFloat(addPriceK) || 0) * 1000;
  const plannedFeePercent = parseFloat(feePct) || 0.1;

  const additionalGross = plannedQty * plannedPrice;
  const additionalFee = additionalGross * (plannedFeePercent / 100);
  const additionalTotalCost = Math.round(additionalGross + additionalFee);

  const simulatedQty = currentQty + plannedQty;
  const simulatedTotalCost = currentTotalCost + additionalTotalCost;
  const simulatedAvgCost = simulatedQty > 0 ? simulatedTotalCost / simulatedQty : 0;
  const simulatedBreakEven = simulatedAvgCost > 0 ? Math.round(simulatedAvgCost / 0.999) : 0;

  const costReduction = currentAvgCost - simulatedAvgCost;
  const costReductionPct = currentAvgCost > 0 ? ((costReduction / currentAvgCost) * 100).toFixed(2) : 0;
  const breakEvenReduction = currentBreakEven - simulatedBreakEven;

  const reqGainFromPlanned = plannedPrice > 0 ? (((simulatedBreakEven - plannedPrice) / plannedPrice) * 100).toFixed(2) : 0;

  function handleQuickQty(type) {
    if (type === '20pct') setAddQty(String(Math.max(10, Math.round(currentQty * 0.2))));
    if (type === '50pct') setAddQty(String(Math.max(10, Math.round(currentQty * 0.5))));
    if (type === '100pct') setAddQty(String(Math.max(10, currentQty)));
    if (type === '100') setAddQty('100');
  }

  function handleGoBuySingle() {
    if (onNavigateBuy && selectedSymbol) {
      onNavigateBuy(selectedSymbol, addQty, addPriceK);
      onClose();
    }
  }

  // =======================================================
  // 2. TÍNH TOÁN CHẾ ĐỘ MUA GOM ĐA TẦNG (MULTI-STEP GRID DCA)
  // =======================================================
  const P0 = (parseFloat(gridBasePriceK) || 0) * 1000;
  const stepDropRate = (parseFloat(gridDropPct) || 0) / 100;
  const totalSteps = Math.min(30, Math.max(2, parseInt(gridSteps) || 20));
  const baseLot = Math.max(1, parseInt(gridBaseLot) || 100);

  // Vị thế ban đầu đang nắm giữ
  const initialQty = (includeCurrentHoldings && currentQty > 0) ? currentQty : 0;
  const initialTotalCost = (includeCurrentHoldings && currentTotalCost > 0) ? currentTotalCost : 0;
  const initialAvgCost = initialQty > 0 ? (initialTotalCost / initialQty) : (P0 || 0);
  const initialMarketVal = initialQty * P0;
  const initialPnL = initialMarketVal - initialTotalCost;
  const initialPnLPct = initialTotalCost > 0 ? (((initialPnL / initialTotalCost) * 100).toFixed(1)) : '0';
  const initialBreakEven = initialAvgCost > 0 ? Math.round(initialAvgCost / 0.999) : 0;
  const initialReqGain = P0 > 0 ? (((initialBreakEven - P0) / P0) * 100).toFixed(1) : '0';

  const gridRows = useMemo(() => {
    if (P0 <= 0 || stepDropRate <= 0) return [];

    let cumVol = initialQty;
    let cumCost = initialTotalCost;
    const rows = [];

    for (let i = 1; i <= totalSteps; i++) {
      const dropRatio = (i - 1) * stepDropRate;
      const dropPercentText = (dropRatio * 100).toFixed(1).replace(/\.0$/, '');
      const price = Math.max(100, Math.round(P0 * (1 - dropRatio)));

      let vol = baseLot;
      let clusterIndex = 0;
      if (gridVolumeStrategy === 'cluster3') {
        clusterIndex = Math.floor((i - 1) / 3);
        vol = baseLot * Math.pow(2, clusterIndex);
      } else if (gridVolumeStrategy === 'linear') {
        clusterIndex = i - 1;
        vol = baseLot * i;
      } else if (gridVolumeStrategy === 'martingale') {
        clusterIndex = i - 1;
        vol = baseLot * Math.pow(2, i - 1);
      } else {
        // fixed
        clusterIndex = 0;
        vol = baseLot;
      }

      const stepCost = vol * price;
      cumVol += vol;
      cumCost += stepCost;
      const avgCost = cumVol > 0 ? Math.round(cumCost / cumVol) : 0;

      // Giá trị thị trường và Lãi/Lỗ tạm tính tại thời điểm đó
      const marketVal = cumVol * price;
      const pnl = marketVal - cumCost;
      const pnlPct = cumCost > 0 ? ((pnl / cumCost) * 100).toFixed(1) : '0';

      // Giá hòa vốn (sau 0.1% phí bán)
      const breakEvenPrice = avgCost > 0 ? Math.round(avgCost / 0.999) : 0;
      // % tăng cần thiết từ mức giá mua đợt này để đạt giá hòa vốn
      const reqGainPct = price > 0 ? (((breakEvenPrice - price) / price) * 100).toFixed(1) : '0';

      // % giảm giá vốn trung bình so với giá vốn ban đầu
      const baselineCost = initialAvgCost > 0 ? initialAvgCost : P0;
      const costDiscountPct = baselineCost > 0 ? (((baselineCost - avgCost) / baselineCost) * 100).toFixed(1) : '0';

      rows.push({
        step: i,
        clusterIndex,
        dropRatio,
        dropPercentText: dropRatio === 0 ? '0%' : `-${dropPercentText}%`,
        price,
        vol,
        cost: stepCost,
        cumVol,
        cumCost,
        marketVal,
        pnl,
        pnlPct,
        avgCost,
        breakEvenPrice,
        reqGainPct,
        costDiscountPct,
      });
    }

    return rows;
  }, [P0, stepDropRate, totalSteps, baseLot, gridVolumeStrategy, initialQty, initialTotalCost, initialAvgCost]);

  // Thống kê tổng quan kế hoạch gom
  const newCampaignShares = gridRows.reduce((s, r) => s + r.vol, 0);
  const newCampaignCapital = gridRows.reduce((s, r) => s + r.cost, 0);

  const lastRow = gridRows.length > 0 ? gridRows[gridRows.length - 1] : null;
  const finalTotalShares = lastRow ? lastRow.cumVol : initialQty;
  const finalTotalCapital = lastRow ? lastRow.cumCost : initialTotalCost;
  const finalAvgCost = lastRow ? lastRow.avgCost : initialAvgCost;
  const finalDiscountPct = lastRow ? lastRow.costDiscountPct : '0';
  const finalReqGain = lastRow ? lastRow.reqGainPct : '0';
  const lastStepPrice = lastRow ? lastRow.price : P0;

  // So sánh nếu không gom DCA: từ mức giá đáy cần hồi bao nhiêu % về giá vốn ban đầu
  const naiveReqGain = lastStepPrice > 0 && initialAvgCost > 0
    ? (((initialBreakEven - lastStepPrice) / lastStepPrice) * 100).toFixed(1)
    : '0';

  function handleGoBuyStep(stepRow) {
    if (onNavigateBuy && selectedSymbol) {
      onNavigateBuy(selectedSymbol, stepRow.vol, String(stepRow.price / 1000));
      onClose();
    }
  }

  // Bảng màu nhẹ cho các tầng gom khối lượng
  const CLUSTER_BG_COLORS = [
    'hover:bg-blue-50/40',
    'bg-sky-50/20 hover:bg-sky-50/50',
    'bg-indigo-50/20 hover:bg-indigo-50/50',
    'bg-purple-50/20 hover:bg-purple-50/50',
    'bg-pink-50/20 hover:bg-pink-50/50',
    'bg-amber-50/20 hover:bg-amber-50/50',
    'bg-emerald-50/20 hover:bg-emerald-50/50',
    'bg-cyan-50/20 hover:bg-cyan-50/50',
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* --- Header & Tabs Switcher --- */}
        <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 p-5 sm:p-6 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2.5 bg-white/10 rounded-2xl backdrop-blur-md shadow-xs">🪜</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                    Mô Phỏng Mua Bình Quân Giá & Lập Kế Hoạch Gom Cổ Phiếu
                  </h3>
                  <span className="text-[10px] uppercase font-bold bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full shadow-xs">
                    PRO DCA
                  </span>
                </div>
                <p className="text-blue-100 text-xs sm:text-sm mt-0.5">
                  Lập kế hoạch mua gom đa tầng (Kim tự tháp ngược Martingale) và tính toán điểm hòa vốn chính xác
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              title="Đóng"
            >
              ✕
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 mt-4 bg-black/20 p-1 rounded-2xl w-fit">
            <button
              onClick={() => setTabMode('grid')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                tabMode === 'grid'
                  ? 'bg-white text-indigo-700 shadow-md scale-102'
                  : 'text-blue-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>🪜 Kế Hoạch Mua Gom Đa Tầng (Lưới Martingale)</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-1.5 py-0.2 rounded-md">
                Khuyên dùng
              </span>
            </button>
            <button
              onClick={() => setTabMode('single')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                tabMode === 'single'
                  ? 'bg-white text-indigo-700 shadow-md scale-102'
                  : 'text-blue-100 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>⚡ Mua Bình Quân Nhanh (1 Lần)</span>
            </button>
          </div>
        </div>

        {/* --- Body (Scrollable) --- */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Thanh chọn cổ phiếu dùng chung */}
          <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Cổ phiếu áp dụng
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedSymbol}
                    onChange={e => setSelectedSymbol(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-xs"
                  >
                    {portfolio.map(p => (
                      <option key={p.symbol} value={p.symbol}>
                        {p.symbol} (Đang giữ {p.totalQty.toLocaleString()} cp - Giá vốn {fmtMoney(p.avgCost)}đ)
                      </option>
                    ))}
                    {!portfolio.some(p => p.symbol === selectedSymbol) && selectedSymbol && (
                      <option value={selectedSymbol}>{selectedSymbol} (Chưa có trong DM)</option>
                    )}
                  </select>

                  <input
                    type="text"
                    placeholder="Nhập mã khác..."
                    value={selectedSymbol}
                    onChange={e => setSelectedSymbol(e.target.value.toUpperCase())}
                    className="w-28 uppercase bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Thông tin hiện tại của cổ phiếu */}
            <div className="flex items-center gap-4 text-xs bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-2xs">
              <div>
                <span className="text-gray-400 block">Giá sàn hiện tại:</span>
                <span className="font-bold text-sm text-blue-600">
                  {livePrice > 0 ? `${fmtMoney(livePrice)}đ` : '---'}
                </span>
              </div>
              {currentStock && (
                <>
                  <div className="h-6 w-px bg-gray-200" />
                  <div>
                    <span className="text-gray-400 block">Đang nắm giữ:</span>
                    <span className="font-bold text-sm text-gray-800">
                      {currentQty.toLocaleString()} cp
                    </span>
                  </div>
                  <div className="h-6 w-px bg-gray-200" />
                  <div>
                    <span className="text-gray-400 block">Giá vốn hiện tại:</span>
                    <span className="font-bold text-sm text-amber-700">
                      {fmtMoney(currentAvgCost)}đ
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: KẾ HOẠCH MUA GOM ĐA TẦNG (GRID PYRAMIDING)        */}
          {/* ======================================================== */}
          {tabMode === 'grid' && (
            <div className="space-y-6">
              {/* Form Tùy Biến Tham Số Kế Hoạch */}
              <div className="bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
                    <span>⚙️</span> Thiết Lập Thông Số Chiến Dịch Mua Gom
                  </h4>
                  {currentQty > 0 && (
                    <label className="flex items-center gap-2 text-xs font-semibold text-indigo-900 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 cursor-pointer shadow-2xs hover:bg-indigo-50/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={includeCurrentHoldings}
                        onChange={e => setIncludeCurrentHoldings(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-400 h-4 w-4"
                      />
                      <span>Tích hợp vị thế đang nắm giữ ({currentQty.toLocaleString()} cp - Vốn {fmtMoney(currentTotalCost)}đ)</span>
                    </label>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Giá khởi điểm P0 */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-700">
                        Giá khởi điểm P₀ (x1.000đ)
                      </label>
                      <div className="flex items-center gap-1.5">
                        {livePrice > 0 && (
                          <button
                            type="button"
                            onClick={() => setGridBasePriceK(String(livePrice / 1000))}
                            className="text-[10px] text-blue-600 font-semibold hover:underline"
                            title="Lấy giá sàn hiện tại"
                          >
                            ⚡ Giá Live
                          </button>
                        )}
                        {currentStock?.avgCost > 0 && (
                          <button
                            type="button"
                            onClick={() => setGridBasePriceK(String(Math.round(currentStock.avgCost / 1000)))}
                            className="text-[10px] text-amber-700 font-semibold hover:underline"
                            title="Lấy giá vốn hiện tại"
                          >
                            🎯 Giá vốn
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        value={gridBasePriceK}
                        onChange={e => setGridBasePriceK(e.target.value)}
                        placeholder="VD: 34.5"
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-16 shadow-2xs"
                      />
                      <span className="absolute right-2 top-2 text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        × 1.000đ
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1 flex items-center justify-between">
                      <span>= <b>{fmtMoney(P0)}đ</b></span>
                      {livePrice > 0 && Math.abs(P0 - livePrice) < 50 && (
                        <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.2 rounded">Mặc định: Giá Live</span>
                      )}
                    </p>
                  </div>

                  {/* Bước giá giảm mỗi đợt */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-700">
                        Bước giá giảm mỗi đợt
                      </label>
                      <span className="text-[10px] text-red-600 font-bold">-{gridDropPct}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[-2, -3, -5, -7].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setGridDropPct(Math.abs(val))}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                            gridDropPct === Math.abs(val)
                              ? 'bg-red-600 text-white shadow-2xs'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {val}%
                        </button>
                      ))}
                      <input
                        type="number"
                        min="0.5"
                        max="20"
                        step="0.5"
                        value={gridDropPct}
                        onChange={e => setGridDropPct(Math.max(0.5, parseFloat(e.target.value) || 1))}
                        className="w-14 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        title="Tự nhập %"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Mỗi đợt giảm {gridDropPct}%</p>
                  </div>

                  {/* Số đợt gom (Steps) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-700">
                        Số đợt gom kế hoạch
                      </label>
                      <span className="text-[10px] text-indigo-600 font-bold">{totalSteps} lần</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[5, 10, 15, 20].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setGridSteps(val)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                            totalSteps === val
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                      <input
                        type="number"
                        min="2"
                        max="30"
                        value={totalSteps}
                        onChange={e => setGridSteps(Math.min(30, Math.max(2, parseInt(e.target.value) || 5)))}
                        className="w-14 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        title="Tự nhập số đợt"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Mặc định: 20 lần gom</p>
                  </div>

                  {/* Lô cơ sở (Base Lot) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-700">
                        Lô cơ sở (Đợt 1)
                      </label>
                      <span className="text-[10px] text-gray-500">{baseLot.toLocaleString()} cp</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[100, 200, 500, 1000].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setGridBaseLot(val)}
                          className={`text-xs px-2 py-1.5 rounded-lg font-semibold transition-all ${
                            baseLot === val
                              ? 'bg-indigo-600 text-white shadow-2xs scale-102'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">1 lô chuẩn sàn HOSE / HNX</p>
                  </div>
                </div>

                {/* Chiến lược phân bổ khối lượng */}
                <div className="pt-2 border-t border-indigo-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-gray-700">
                    Quy tắc phân bổ khối lượng:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setGridVolumeStrategy('cluster3')}
                      className={`text-left p-2 rounded-xl border text-xs font-semibold transition-all ${
                        gridVolumeStrategy === 'cluster3'
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1">
                        <span>🌟 Kim tự tháp x2 mỗi 3 đợt</span>
                      </div>
                      <div className={`text-[10px] ${gridVolumeStrategy === 'cluster3' ? 'text-indigo-100' : 'text-gray-400'}`}>
                        100 → 100 → 100 → 200... (Chuẩn mẫu)
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGridVolumeStrategy('fixed')}
                      className={`text-left p-2 rounded-xl border text-xs font-semibold transition-all ${
                        gridVolumeStrategy === 'fixed'
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-bold">📐 Khối lượng đều</div>
                      <div className={`text-[10px] ${gridVolumeStrategy === 'fixed' ? 'text-indigo-100' : 'text-gray-400'}`}>
                        100 → 100 → 100 → 100...
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGridVolumeStrategy('linear')}
                      className={`text-left p-2 rounded-xl border text-xs font-semibold transition-all ${
                        gridVolumeStrategy === 'linear'
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-bold">📈 Tăng dần đều</div>
                      <div className={`text-[10px] ${gridVolumeStrategy === 'linear' ? 'text-indigo-100' : 'text-gray-400'}`}>
                        100 → 200 → 300 → 400...
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGridVolumeStrategy('martingale')}
                      className={`text-left p-2 rounded-xl border text-xs font-semibold transition-all ${
                        gridVolumeStrategy === 'martingale'
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-bold">🚀 Gấp đôi mỗi bước</div>
                      <div className={`text-[10px] ${gridVolumeStrategy === 'martingale' ? 'text-indigo-100' : 'text-gray-400'}`}>
                        100 → 200 → 400 → 800...
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Hộp Thống Kê Tổng Kết Kế Hoạch Gom (Campaign Summary) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-2xl border border-indigo-100 shadow-2xs">
                  <div className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
                    <span>💰</span> Vốn Gom Thêm Dự Trù
                  </div>
                  <div className="text-lg sm:text-xl font-black text-gray-900 mt-1">
                    {fmtMoney(newCampaignCapital)}đ
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    Dự trù giải ngân đủ {totalSteps} đợt gom
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-2xl border border-blue-100 shadow-2xs">
                  <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1">
                    <span>💼</span> Tổng Vốn Toàn Bộ
                  </div>
                  <div className="text-lg sm:text-xl font-black text-blue-900 mt-1">
                    {fmtMoney(finalTotalCapital)}đ
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {initialQty > 0 ? (
                      <span>{fmtMoney(initialTotalCost)}đ gốc + {fmtMoney(newCampaignCapital)}đ gom</span>
                    ) : (
                      <span>Toàn bộ {totalSteps} đợt gom</span>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-white p-4 rounded-2xl border border-emerald-100 shadow-2xs">
                  <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                    <span>📦</span> Tổng SL Sau Cùng
                  </div>
                  <div className="text-lg sm:text-xl font-black text-emerald-800 mt-1">
                    {finalTotalShares.toLocaleString()} <span className="text-xs font-normal text-gray-600">cp</span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {initialQty > 0 ? (
                      <span>{initialQty.toLocaleString()} gốc + {newCampaignShares.toLocaleString()} gom</span>
                    ) : (
                      <span>Tích lũy từ mức {fmtMoney(P0)}đ</span>
                    )}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-amber-50 to-white p-4 rounded-2xl border border-amber-100 shadow-2xs">
                  <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                    <span>🎯</span> Kéo Hạ Giá Vốn TB
                  </div>
                  <div className="text-lg sm:text-xl font-black text-amber-900 mt-1">
                    {fmtMoney(finalAvgCost)}đ
                  </div>
                  <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                    Hạ -{finalDiscountPct}% so với vốn ban đầu ({fmtMoney(initialAvgCost)}đ)
                  </div>
                </div>
              </div>

              {/* So sánh mục tiêu về bờ tại đáy */}
              <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🚀</span>
                  <span className="text-gray-700">
                    Tại mức giá đáy <b>{fmtMoney(lastStepPrice)}đ</b>: Cổ phiếu chỉ cần hồi phục{' '}
                    <span className="font-extrabold text-emerald-700 text-sm">+{finalReqGain}%</span> là hòa vốn toàn bộ danh mục!
                  </span>
                </div>
                {initialQty > 0 && (
                  <div className="text-gray-500 sm:text-right">
                    (Thay vì phải chờ tăng <span className="text-red-600 font-bold">+{naiveReqGain}%</span> nếu không DCA mà giữ nguyên vị thế cũ)
                  </div>
                )}
              </div>

              {/* Bảng Chi Tiết Lộ Trình Gom Đa Tầng (Interactive Grid Table) */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 bg-gray-50/90 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase text-gray-700 tracking-wider">
                      📋 Bảng Chi Tiết Lộ Trình Gom Từng Thời Điểm ({gridRows.length} đợt)
                    </span>
                    <span className="text-[11px] text-gray-400">
                      (Bao gồm số lượng cổ phiếu, giá trị vốn và định giá tại từng bước)
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 font-medium hidden sm:block">
                    Click <span className="font-bold text-indigo-600">"🛒 Mua đợt này"</span> để chuyển nhanh vào Form Đặt Lệnh
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-100/95 text-gray-600 uppercase font-bold text-[10px] sticky top-0 z-10 backdrop-blur-md shadow-2xs">
                      <tr>
                        <th className="py-2.5 px-3 text-center">Đợt</th>
                        <th className="py-2.5 px-3 text-center">% Giảm</th>
                        <th className="py-2.5 px-3 text-right">Mức Giá Mua</th>
                        <th className="py-2.5 px-3 text-right">Mua Đợt Này</th>
                        <th className="py-2.5 px-3 text-right">Tổng SL Cổ Phiếu</th>
                        <th className="py-2.5 px-3 text-right">Tổng Vốn Đầu Tư</th>
                        <th className="py-2.5 px-3 text-right">Định Giá & P&L</th>
                        <th className="py-2.5 px-3 text-right">Giá Vốn TB Mới</th>
                        <th className="py-2.5 px-3 text-center">Mục Tiêu Về Bờ</th>
                        <th className="py-2.5 px-3 text-center">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                      {/* ĐỢT 0: VỊ THẾ BAN ĐẦU (HIỆN TẠI) NẾU CÓ NẮM GIỮ */}
                      {initialQty > 0 && (
                        <tr className="bg-slate-50/90 border-b-2 border-indigo-200/80 font-medium text-slate-800">
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 text-[10px] font-extrabold">
                              <span>⚓</span> Đợt 0 (Hiện tại)
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-200 text-slate-700">
                              0% (Gốc)
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-blue-700 whitespace-nowrap">
                            {fmtMoney(P0)}đ <span className="text-[10px] text-blue-500 font-normal block">(Giá Live)</span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-500 whitespace-nowrap">
                            <span className="italic text-[11px]">Vị thế ban đầu</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-gray-900 whitespace-nowrap">
                            {initialQty.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">cp</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                            {fmtMoney(initialTotalCost)}đ
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="font-semibold text-gray-800">{fmtMoney(initialMarketVal)}đ</div>
                            <div className={`text-[10px] font-bold ${initialPnL >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {initialPnL >= 0 ? '+' : ''}{fmtMoney(initialPnL)}đ ({initialPnLPct}%)
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <span className="font-black text-amber-800 text-xs sm:text-sm">
                              {fmtMoney(initialAvgCost)}đ
                            </span>
                            <span className="text-[10px] text-gray-400 block font-normal">(Giá vốn gốc)</span>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                              +{initialReqGain}%
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-1 rounded-md font-semibold">
                              Đang giữ
                            </span>
                          </td>
                        </tr>
                      )}

                      {/* CÁC ĐỢT GOM TIẾP THEO (ĐỢT 1 ĐẾN ĐỢT N) */}
                      {gridRows.map((row) => {
                        const bgClass = CLUSTER_BG_COLORS[row.clusterIndex % CLUSTER_BG_COLORS.length];
                        const isFirstInCluster = row.step === 1 || (row.step - 1) % 3 === 0;

                        return (
                          <tr key={row.step} className={`transition-colors ${bgClass}`}>
                            {/* Cột Đợt */}
                            <td className="py-2.5 px-3 text-center font-bold text-gray-900 whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-[11px] font-extrabold">
                                  {row.step}
                                </span>
                                {gridVolumeStrategy === 'cluster3' && isFirstInCluster && (
                                  <span className="text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-1 py-0.2 rounded font-semibold hidden md:inline">
                                    Tầng {row.clusterIndex + 1}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Cột % Giảm */}
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                  row.dropRatio === 0
                                    ? 'bg-gray-100 text-gray-600'
                                    : 'bg-red-50 text-red-600 border border-red-100'
                                }`}
                              >
                                {row.dropPercentText}
                              </span>
                            </td>

                            {/* Cột Mức Giá Mua */}
                            <td className="py-2.5 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                              {fmtMoney(row.price)}đ
                            </td>

                            {/* Cột Mua Đợt Này (SL & Tiền đợt) */}
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="font-extrabold text-blue-700">
                                +{row.vol.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">cp</span>
                              </div>
                              <div className="text-[10px] text-gray-500 font-medium">
                                +{fmtMoney(row.cost)}đ
                              </div>
                            </td>

                            {/* Cột Tổng SL Cổ Phiếu Tại Thời Điểm Đó */}
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="font-extrabold text-gray-900">
                                {row.cumVol.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">cp</span>
                              </div>
                              {initialQty > 0 && (
                                <div className="text-[10px] text-gray-400 font-normal">
                                  {initialQty.toLocaleString()} gốc + {(row.cumVol - initialQty).toLocaleString()} gom
                                </div>
                              )}
                            </td>

                            {/* Cột Tổng Vốn Đầu Tư Tại Thời Điểm Đó */}
                            <td className="py-2.5 px-3 text-right whitespace-nowrap font-bold text-gray-900">
                              <div>{fmtMoney(row.cumCost)}đ</div>
                            </td>

                            {/* Cột Định Giá & P&L Tại Thời Điểm Đó */}
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="font-semibold text-gray-800">{fmtMoney(row.marketVal)}đ</div>
                              <div className={`text-[10px] font-bold ${row.pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {row.pnl >= 0 ? '+' : ''}{fmtMoney(row.pnl)}đ ({row.pnlPct}%)
                              </div>
                            </td>

                            {/* Cột Giá Vốn TB Mới */}
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <span className="font-black text-indigo-700 text-xs sm:text-sm">
                                {fmtMoney(row.avgCost)}đ
                              </span>
                              {row.costDiscountPct !== '0' && (
                                <span className="text-[10px] text-emerald-600 font-semibold block">
                                  (Hạ -{row.costDiscountPct}%)
                                </span>
                              )}
                            </td>

                            {/* Cột Mục Tiêu Về Bờ */}
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                +{row.reqGainPct}%
                              </span>
                            </td>

                            {/* Cột Thao Tác */}
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              {onNavigateBuy && (
                                <button
                                  type="button"
                                  onClick={() => handleGoBuyStep(row)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-2.5 py-1 rounded-lg text-[11px] transition-all shadow-2xs hover:shadow-xs active:scale-95 inline-flex items-center gap-1"
                                  title={`Đặt mua ngay ${row.vol} cp @ ${fmtMoney(row.price)}đ`}
                                >
                                  <span>🛒</span>
                                  <span>Mua đợt này</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: MUA BÌNH QUÂN NHANH 1 LẦN (SINGLE STEP SIMULATION) */}
          {/* ======================================================== */}
          {tabMode === 'single' && (
            <div className="space-y-6">
              {/* Form nhập thông số dự kiến mua thêm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                {/* Số lượng dự kiến mua thêm */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700 uppercase">
                      SL dự kiến mua thêm (cp)
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleQuickQty('50pct')}
                        className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded"
                      >
                        +50%
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickQty('100pct')}
                        className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded"
                      >
                        +100%
                      </button>
                    </div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="10"
                    value={addQty}
                    onChange={e => setAddQty(e.target.value)}
                    placeholder="100"
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                {/* Mức giá dự kiến mua */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-gray-700 uppercase">
                      Mức giá mua (x1.000đ)
                    </label>
                    {livePrice > 0 && (
                      <button
                        type="button"
                        onClick={() => setAddPriceK(String(livePrice / 1000))}
                        className="text-[10px] text-blue-600 hover:underline"
                      >
                        Lấy giá sàn
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={addPriceK}
                      onChange={e => setAddPriceK(e.target.value)}
                      placeholder="VD: 25.5"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-16"
                    />
                    <span className="absolute right-2 top-2 text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      × 1.000đ
                    </span>
                  </div>
                  {plannedPrice > 0 && (
                    <p className="text-[11px] text-gray-500 mt-1">
                      = <b>{fmtMoney(plannedPrice)}đ</b> / cp
                    </p>
                  )}
                </div>
              </div>

              {/* Bảng đối chiếu so sánh: Hiện Tại vs Sau Khi Mua Thêm */}
              <div className="bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50 rounded-2xl p-5 border border-indigo-100 shadow-xs space-y-4">
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-1.5">
                  <span>📊</span> Kết Quả Mô Phỏng Thay Đổi Vị Thế (1 Đợt)
                </h4>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {/* Cột Hiện Tại */}
                  <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-2">
                    <div className="text-xs font-bold text-gray-400 uppercase">1. Hiện Tại</div>
                    <div>
                      <span className="text-xs text-gray-500">Số lượng:</span>
                      <div className="font-semibold text-gray-800">{currentQty.toLocaleString()} cp</div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Giá vốn TB:</span>
                      <div className="font-bold text-gray-900">{fmtMoney(currentAvgCost)}đ</div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Giá hòa vốn:</span>
                      <div className="font-semibold text-emerald-700">{fmtMoney(currentBreakEven)}đ</div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Tổng vốn đã chi:</span>
                      <div className="font-semibold text-gray-700">{fmtMoney(currentTotalCost)}đ</div>
                    </div>
                  </div>

                  {/* Cột Sau Khi Mua Thêm */}
                  <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-xs space-y-2 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                      MÔ PHỎNG
                    </div>
                    <div className="text-xs font-bold text-indigo-600 uppercase">2. Sau Khi Mua Thêm</div>
                    <div>
                      <span className="text-xs text-gray-500">Tổng SL mới:</span>
                      <div className="font-bold text-indigo-900">
                        {simulatedQty.toLocaleString()} cp{' '}
                        <span className="text-xs text-green-600 font-normal">
                          (+{plannedQty.toLocaleString()})
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Giá vốn TB mới:</span>
                      <div className="font-bold text-indigo-600 text-base">
                        {fmtMoney(simulatedAvgCost)}đ
                        {costReduction > 0 && (
                          <span className="text-xs text-green-600 font-normal ml-1">
                            (Hạ -{costReductionPct}%)
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Giá hòa vốn mới:</span>
                      <div className="font-bold text-emerald-700 text-base">
                        {fmtMoney(simulatedBreakEven)}đ
                        {breakEvenReduction > 0 && (
                          <span className="text-xs text-green-600 font-normal ml-1">
                            (-{fmtMoney(breakEvenReduction)}đ)
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Tổng vốn mới:</span>
                      <div className="font-bold text-gray-900">{fmtMoney(simulatedTotalCost)}đ</div>
                    </div>
                  </div>
                </div>

                {/* Thông tin chiến lược */}
                <div className="bg-white/80 p-3.5 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">💰 Số tiền cần chuẩn bị:</span>
                    <span className="font-bold text-gray-900 text-sm ml-1.5">
                      {fmtMoney(additionalTotalCost)}đ
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">🎯 Mục tiêu về bờ:</span>
                    <span className="font-bold text-indigo-700 text-sm ml-1.5">
                      Cần tăng +{reqGainFromPlanned}% từ giá mua
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- Footer --- */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Đóng
          </button>

          {tabMode === 'single' && onNavigateBuy && (
            <button
              onClick={handleGoBuySingle}
              disabled={plannedQty <= 0 || plannedPrice <= 0}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-xl text-sm transition-colors shadow-xs flex items-center gap-1.5"
            >
              <span>🛒</span>
              <span>Đi Đến Đặt Lệnh Mua Này</span>
            </button>
          )}

          {tabMode === 'grid' && (
            <div className="text-xs text-gray-500">
              💡 Bấm vào <span className="font-bold text-indigo-600">"🛒 Mua đợt này"</span> tại dòng bạn muốn giải ngân trong bảng
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
