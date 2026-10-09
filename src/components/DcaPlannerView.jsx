import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchPrices } from '../utils/api.js';
import { calcBreakEvenPrice, fmtMoney } from '../utils/format.js';

export default function DcaPlannerView({
  portfolio = [],
  initialStock = null,
  onNavigateBuy,
}) {
  // Chế độ: 'grid' (Lập Kế Hoạch Mua Gom Đa Tầng) hoặc 'single' (Mua Bình Quân Nhanh 1 Lần)
  const [tabMode, setTabMode] = useState('grid');
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [marketPrices, setMarketPrices] = useState({});
  const [loadingPrice, setLoadingPrice] = useState(false);

  // --- State Chế độ 1 Lần ---
  const [addQty, setAddQty] = useState('100');
  const [addPriceK, setAddPriceK] = useState(''); // x1.000đ
  const [feePct, setFeePct] = useState('0.1');

  // --- State Chế độ Mua Gom Đa Tầng (Grid Pyramiding) ---
  const [gridBasePriceK, setGridBasePriceK] = useState(''); // Giá khởi điểm P0 (mặc định theo thị trường)
  const [gridDropPct, setGridDropPct] = useState(3); // Bước giá giảm mỗi đợt (-3% mặc định)
  const [gridSteps, setGridSteps] = useState(20); // Số đợt gom (20 lần mặc định)
  const [gridBaseLot, setGridBaseLot] = useState(100); // Lô cơ sở (100 cp)
  const [gridVolumeStrategy, setGridVolumeStrategy] = useState('cluster3'); // 'cluster3', 'fixed', 'linear', 'martingale'
  const [includeCurrentHoldings, setIncludeCurrentHoldings] = useState(true); // Mặc định tính kèm danh mục hiện có

  // Khởi tạo mã khi mở tab hoặc nhận initialStock
  useEffect(() => {
    if (initialStock?.symbol) {
      setSelectedSymbol(initialStock.symbol);
    } else if (portfolio.length > 0 && !selectedSymbol) {
      setSelectedSymbol(portfolio[0].symbol);
    }
  }, [initialStock, portfolio]);

  const currentStock = useMemo(() => {
    return portfolio.find(p => p.symbol === selectedSymbol) || (initialStock?.symbol === selectedSymbol ? initialStock : null);
  }, [portfolio, selectedSymbol, initialStock]);

  // Tự động tải giá Live của mã được chọn
  const loadPriceForSymbol = useCallback(async (sym) => {
    if (!sym) return;
    setLoadingPrice(true);
    try {
      const res = await fetchPrices([sym], false);
      if (res?.prices) {
        setMarketPrices(prev => ({ ...prev, ...res.prices }));
      }
    } catch (e) {
      console.error('Không thể lấy giá live cho mã:', sym, e);
    } finally {
      setLoadingPrice(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSymbol) {
      loadPriceForSymbol(selectedSymbol);
    }
  }, [selectedSymbol, loadPriceForSymbol]);

  const livePrice = useMemo(() => {
    if (!selectedSymbol) return 0;
    return marketPrices[selectedSymbol]?.price || 0;
  }, [marketPrices, selectedSymbol]);

  // Cập nhật giá khởi điểm dự kiến mặc định theo Giá thị trường Live khi đổi mã
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

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* --- Header Banner & Tab Selector --- */}
      <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl p-3 bg-white/10 rounded-2xl backdrop-blur-md shadow-xs shrink-0">🪜</span>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  Kế Hoạch Mua Gom Cổ Phiếu & Mô Phỏng Bình Quân Giá (DCA)
                </h2>
                <span className="text-xs uppercase font-extrabold bg-amber-400 text-amber-950 px-2.5 py-0.5 rounded-full shadow-xs">
                  PRO GRID DCA
                </span>
              </div>
              <p className="text-blue-100 text-xs sm:text-sm mt-1">
                Lập chiến lược mua gom đa tầng theo mô hình Kim tự tháp ngược Martingale, tính toán chi tiết vị thế và điểm hòa vốn tại từng bước
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-2xl w-fit self-start md:self-auto shrink-0">
            <button
              onClick={() => setTabMode('grid')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${tabMode === 'grid'
                  ? 'bg-white text-indigo-700 shadow-md scale-102'
                  : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
            >
              <span>🪜 Kế Hoạch Mua Gom Đa Tầng</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-1.5 py-0.5 rounded-md">
                Khuyên dùng
              </span>
            </button>
            <button
              onClick={() => setTabMode('single')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${tabMode === 'single'
                  ? 'bg-white text-indigo-700 shadow-md scale-102'
                  : 'text-blue-100 hover:text-white hover:bg-white/10'
                }`}
            >
              <span>⚡ Mua Nhanh 1 Lần</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- Thanh chọn cổ phiếu & Thông tin Live --- */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">
              Cổ phiếu lập kế hoạch
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedSymbol}
                onChange={e => setSelectedSymbol(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs"
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
                className="w-32 uppercase bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-2xs"
              />

              <button
                type="button"
                onClick={() => loadPriceForSymbol(selectedSymbol)}
                className="text-gray-400 hover:text-indigo-600 transition-colors p-2 text-lg"
                title="Làm mới giá thị trường"
              >
                🔄
              </button>
            </div>
          </div>
        </div>

        {/* Thông tin hiện tại của cổ phiếu */}
        <div className="flex items-center gap-4 sm:gap-6 text-xs bg-gray-50/80 px-5 py-3 rounded-xl border border-gray-200/80 shadow-2xs flex-wrap">
          <div>
            <span className="text-gray-400 block">Giá sàn Live:</span>
            <span className="font-extrabold text-base text-blue-600">
              {loadingPrice ? 'Đang tải...' : livePrice > 0 ? `${fmtMoney(livePrice)}đ` : '---'}
            </span>
          </div>
          {currentStock && (
            <>
              <div className="h-7 w-px bg-gray-200 hidden sm:block" />
              <div>
                <span className="text-gray-400 block">Đang nắm giữ:</span>
                <span className="font-extrabold text-base text-gray-800">
                  {currentQty.toLocaleString()} <span className="text-xs font-normal text-gray-500">cp</span>
                </span>
              </div>
              <div className="h-7 w-px bg-gray-200 hidden sm:block" />
              <div>
                <span className="text-gray-400 block">Giá vốn hiện tại:</span>
                <span className="font-extrabold text-base text-amber-700">
                  {fmtMoney(currentAvgCost)}đ
                </span>
              </div>
              <div className="h-7 w-px bg-gray-200 hidden sm:block" />
              <div>
                <span className="text-gray-400 block">Tổng vốn đã chi:</span>
                <span className="font-extrabold text-base text-gray-900">
                  {fmtMoney(currentTotalCost)}đ
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
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-400 uppercase tracking-wide flex items-center gap-2">
                <span>⚙️</span> Thiết Lập Thông Số Chiến Dịch Mua Gom
              </h4>
              {currentQty > 0 && (
                <label className="flex items-center gap-2.5 text-xs font-bold text-indigo-900 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/60 px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800/60 cursor-pointer shadow-2xs hover:bg-indigo-100/60 dark:hover:bg-indigo-900/60 transition-colors">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Giá khởi điểm P0 */}
              <div className="bg-gray-50/60 dark:bg-slate-800/70 p-3.5 rounded-xl border border-gray-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    Giá khởi điểm P₀ (x1.000đ)
                  </label>
                  <div className="flex items-center gap-1.5">
                    {livePrice > 0 && (
                      <button
                        type="button"
                        onClick={() => setGridBasePriceK(String(livePrice / 1000))}
                        className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline"
                        title="Lấy giá sàn hiện tại"
                      >
                        ⚡ Giá Live
                      </button>
                    )}
                    {currentStock?.avgCost > 0 && (
                      <button
                        type="button"
                        onClick={() => setGridBasePriceK(String(Math.round(currentStock.avgCost / 1000)))}
                        className="text-[10px] text-amber-700 dark:text-amber-400 font-bold hover:underline"
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
                    className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-sm font-bold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-16 shadow-2xs"
                  />
                  <span className="absolute right-2.5 top-2 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                    × 1.000đ
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1.5 flex items-center justify-between">
                  <span>= <b className="text-gray-900 dark:text-slate-100">{fmtMoney(P0)}đ</b></span>
                  {livePrice > 0 && Math.abs(P0 - livePrice) < 50 && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded">Mặc định: Giá Live</span>
                  )}
                </p>
              </div>

              {/* Bước giá giảm mỗi đợt */}
              <div className="bg-gray-50/60 dark:bg-slate-800/70 p-3.5 rounded-xl border border-gray-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    Bước giá giảm mỗi đợt
                  </label>
                  <span className="text-[11px] text-red-600 dark:text-rose-400 font-extrabold">-{gridDropPct}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[-2, -3, -5, -7].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setGridDropPct(Math.abs(val))}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all ${gridDropPct === Math.abs(val)
                          ? 'bg-red-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
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
                    className="w-14 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-center text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    title="Tự nhập %"
                  />
                </div>
                <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-1.5">Mỗi đợt giảm {gridDropPct}%</p>
              </div>

              {/* Số đợt gom (Steps) */}
              <div className="bg-gray-50/60 dark:bg-slate-800/70 p-3.5 rounded-xl border border-gray-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    Số đợt gom kế hoạch
                  </label>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-extrabold">{totalSteps} lần</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[5, 10, 15, 20].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setGridSteps(val)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all ${totalSteps === val
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
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
                    className="w-14 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs font-semibold text-center text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    title="Tự nhập số đợt"
                  />
                </div>
                <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-1.5">Kế hoạch {totalSteps} lần gom</p>
              </div>

              {/* Lô cơ sở (Base Lot) */}
              <div className="bg-gray-50/60 dark:bg-slate-800/70 p-3.5 rounded-xl border border-gray-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-slate-300">
                    Lô cơ sở (Đợt 1)
                  </label>
                  <span className="text-[11px] text-gray-600 dark:text-slate-300 font-bold">{baseLot.toLocaleString()} cp</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[100, 200, 500, 1000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setGridBaseLot(val)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all ${baseLot === val
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-1.5">1 lô chuẩn sàn HOSE / HNX</p>
              </div>
            </div>

            {/* Chiến lược phân bổ khối lượng */}
            <div className="pt-3 border-t border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="text-xs font-bold text-gray-700">
                Quy tắc phân bổ khối lượng gom:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => setGridVolumeStrategy('cluster3')}
                  className={`text-left p-3 rounded-xl border text-xs font-semibold transition-all ${gridVolumeStrategy === 'cluster3'
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="font-extrabold flex items-center gap-1">
                    <span>🌟 Kim tự tháp x2 mỗi 3 đợt</span>
                  </div>
                  <div className={`text-[11px] mt-0.5 ${gridVolumeStrategy === 'cluster3' ? 'text-indigo-100' : 'text-gray-400'}`}>
                    100 → 100 → 100 → 200... (Chuẩn mẫu)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setGridVolumeStrategy('fixed')}
                  className={`text-left p-3 rounded-xl border text-xs font-semibold transition-all ${gridVolumeStrategy === 'fixed'
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="font-extrabold">📐 Khối lượng đều</div>
                  <div className={`text-[11px] mt-0.5 ${gridVolumeStrategy === 'fixed' ? 'text-indigo-100' : 'text-gray-400'}`}>
                    100 → 100 → 100 → 100...
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setGridVolumeStrategy('linear')}
                  className={`text-left p-3 rounded-xl border text-xs font-semibold transition-all ${gridVolumeStrategy === 'linear'
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="font-extrabold">📈 Tăng dần đều</div>
                  <div className={`text-[11px] mt-0.5 ${gridVolumeStrategy === 'linear' ? 'text-indigo-100' : 'text-gray-400'}`}>
                    100 → 200 → 300 → 400...
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setGridVolumeStrategy('martingale')}
                  className={`text-left p-3 rounded-xl border text-xs font-semibold transition-all ${gridVolumeStrategy === 'martingale'
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <div className="font-extrabold">🚀 Gấp đôi mỗi bước</div>
                  <div className={`text-[11px] mt-0.5 ${gridVolumeStrategy === 'martingale' ? 'text-indigo-100' : 'text-gray-400'}`}>
                    100 → 200 → 400 → 800...
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Hộp Thống Kê Tổng Kết Kế Hoạch Gom (Campaign Summary Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-50/70 to-white dark:from-indigo-950/40 dark:to-slate-900 dark:bg-slate-900 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
              <div className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>💰</span> Vốn Gom Thêm Dự Trù
              </div>
              <div className="text-2xl font-black text-gray-900 dark:text-slate-100 mt-2">
                {fmtMoney(newCampaignCapital)}đ
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                Dự trù giải ngân đủ {totalSteps} đợt gom
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50/70 to-white dark:from-blue-950/40 dark:to-slate-900 dark:bg-slate-900 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-xs">
              <div className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>💼</span> Tổng Vốn Toàn Bộ
              </div>
              <div className="text-2xl font-black text-blue-900 dark:text-blue-300 mt-2">
                {fmtMoney(finalTotalCapital)}đ
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {initialQty > 0 ? (
                  <span>{fmtMoney(initialTotalCost)}đ gốc + {fmtMoney(newCampaignCapital)}đ gom</span>
                ) : (
                  <span>Toàn bộ {totalSteps} đợt gom</span>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50/70 to-white dark:from-emerald-950/40 dark:to-slate-900 dark:bg-slate-900 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-xs">
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>📦</span> Tổng SL Sau Cùng
              </div>
              <div className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-2">
                {finalTotalShares.toLocaleString()} <span className="text-sm font-normal text-gray-600 dark:text-slate-400">cp</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {initialQty > 0 ? (
                  <span>{initialQty.toLocaleString()} gốc + {newCampaignShares.toLocaleString()} gom</span>
                ) : (
                  <span>Tích lũy từ mức {fmtMoney(P0)}đ</span>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50/70 to-white dark:from-amber-950/40 dark:to-slate-900 dark:bg-slate-900 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/50 shadow-xs">
              <div className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎯</span> Kéo Hạ Giá Vốn TB
              </div>
              <div className="text-2xl font-black text-amber-900 dark:text-amber-300 mt-2">
                {fmtMoney(finalAvgCost)}đ
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                Hạ -{finalDiscountPct}% so với vốn ban đầu ({fmtMoney(initialAvgCost)}đ)
              </div>
            </div>
          </div>

          {/* So sánh mục tiêu về bờ tại đáy */}
          <div className="bg-amber-50/80 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200/90 dark:border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🚀</span>
              <span className="text-gray-800 dark:text-slate-200 font-medium">
                Tại mức giá đáy <b>{fmtMoney(lastStepPrice)}đ</b>: Cổ phiếu chỉ cần hồi phục{' '}
                <span className="font-black text-emerald-700 dark:text-emerald-400 text-base">+{finalReqGain}%</span> là hòa vốn toàn bộ danh mục!
              </span>
            </div>
            {initialQty > 0 && (
              <div className="text-gray-600 dark:text-slate-400 sm:text-right font-medium">
                (Thay vì phải chờ tăng <span className="text-red-600 dark:text-rose-400 font-bold">+{naiveReqGain}%</span> nếu không DCA mà giữ nguyên vị thế cũ)
              </div>
            )}
          </div>

          {/* Bảng Chi Tiết Lộ Trình Gom Đa Tầng Full-Width */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="px-6 py-4 bg-gray-50/90 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-sm uppercase text-gray-800 dark:text-slate-100 tracking-wider">
                  📋 Bảng Lộ Trình Gom Từng Thời Điểm ({gridRows.length} đợt)
                </span>
                <span className="text-xs text-gray-400 dark:text-slate-400">
                  (Bao gồm số lượng cổ phiếu, giá trị vốn và định giá tại từng bước)
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400 font-semibold">
                Click <span className="font-bold text-indigo-600 dark:text-indigo-400">"🛒 Mua đợt này"</span> để chuyển nhanh vào Form Đặt Lệnh Mua
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-100 dark:bg-slate-950 text-gray-600 dark:text-slate-400 uppercase font-bold text-[11px] sticky top-0 z-10 border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-3.5 text-center">Đợt</th>
                    <th className="py-3 px-3 text-center">% Giảm</th>
                    <th className="py-3 px-4 text-right">Mức Giá Mua</th>
                    <th className="py-3 px-4 text-right">Mua Đợt Này</th>
                    <th className="py-3 px-4 text-right">Tổng SL Cổ Phiếu</th>
                    <th className="py-3 px-4 text-right">Tổng Vốn Đầu Tư</th>
                    <th className="py-3 px-4 text-right">Giá Trị P&L</th>
                    <th className="py-3 px-4 text-right">Giá Vốn TB Mới</th>
                    <th className="py-3 px-3.5 text-center">Mục Tiêu Về Bờ</th>
                    <th className="py-3 px-4 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium text-gray-700 dark:text-slate-300">
                  {/* ĐỢT 0: VỊ THẾ BAN ĐẦU (HIỆN TẠI) NẾU CÓ NẮM GIỮ */}
                  {initialQty > 0 && (
                    <tr className="bg-slate-50/95 dark:bg-slate-900 border-b-2 border-indigo-200 dark:border-indigo-900 font-medium text-slate-800 dark:text-slate-200">
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[11px] font-black">
                          <span>⚓</span> Đợt 0 (Hiện tại)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          0% (Gốc)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-blue-700 dark:text-blue-400 whitespace-nowrap">
                        {fmtMoney(P0)}đ <span className="text-[10px] text-blue-500 dark:text-blue-300 font-normal block">(Giá Live)</span>
                      </td>
                      <td className="py-3 px-4 text-right text-gray-500 whitespace-nowrap">
                        <span className="italic text-xs">Vị thế ban đầu</span>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-gray-900 whitespace-nowrap text-sm">
                        {initialQty.toLocaleString()} <span className="text-xs font-normal text-gray-400">cp</span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900 whitespace-nowrap text-sm">
                        {fmtMoney(initialTotalCost)}đ
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-semibold text-gray-800">{fmtMoney(initialMarketVal)}đ</div>
                        <div className={`text-[11px] font-bold ${initialPnL >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {initialPnL >= 0 ? '+' : ''}{fmtMoney(initialPnL)}đ ({initialPnLPct}%)
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="font-black text-amber-800 text-sm">
                          {fmtMoney(initialAvgCost)}đ
                        </span>
                        <span className="text-[10px] text-gray-400 block font-normal">(Giá vốn gốc)</span>
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200">
                          +{initialReqGain}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="text-xs bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-bold">
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
                        <td className="py-3 px-3.5 text-center font-bold text-gray-900 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-xs font-extrabold">
                              {row.step}
                            </span>
                            {gridVolumeStrategy === 'cluster3' && isFirstInCluster && (
                              <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded font-bold hidden md:inline">
                                Tầng {row.clusterIndex + 1}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Cột % Giảm */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold ${row.dropRatio === 0
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-red-50 text-red-600 border border-red-100'
                              }`}
                          >
                            {row.dropPercentText}
                          </span>
                        </td>

                        {/* Cột Mức Giá Mua */}
                        <td className="py-3 px-4 text-right font-bold text-gray-900 whitespace-nowrap text-sm">
                          {fmtMoney(row.price)}đ
                        </td>

                        {/* Cột Mua Đợt Này (SL & Tiền đợt) */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="font-black text-blue-700 text-sm">
                            +{row.vol.toLocaleString()} <span className="text-xs font-normal text-gray-400">cp</span>
                          </div>
                          <div className="text-[11px] text-gray-500 font-medium">
                            +{fmtMoney(row.cost)}đ
                          </div>
                        </td>

                        {/* Cột Tổng SL Cổ Phiếu Tại Thời Điểm Đó */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="font-black text-gray-900 text-sm">
                            {row.cumVol.toLocaleString()} <span className="text-xs font-normal text-gray-400">cp</span>
                          </div>
                          {initialQty > 0 && (
                            <div className="text-[10px] text-gray-400 font-normal">
                              {initialQty.toLocaleString()} gốc + {(row.cumVol - initialQty).toLocaleString()} gom
                            </div>
                          )}
                        </td>

                        {/* Cột Tổng Vốn Đầu Tư Tại Thời Điểm Đó */}
                        <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-gray-900 text-sm">
                          <div>{fmtMoney(row.cumCost)}đ</div>
                        </td>

                        {/* Cột Định Giá & P&L Tại Thời Điểm Đó */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="font-semibold text-gray-800">{fmtMoney(row.marketVal)}đ</div>
                          <div className={`text-[11px] font-bold ${row.pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {row.pnl >= 0 ? '+' : ''}{fmtMoney(row.pnl)}đ ({row.pnlPct}%)
                          </div>
                        </td>

                        {/* Cột Giá Vốn TB Mới */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className="font-black text-indigo-700 text-sm">
                            {fmtMoney(row.avgCost)}đ
                          </span>
                          {row.costDiscountPct !== '0' && (
                            <span className="text-[11px] text-emerald-600 font-bold block">
                              (Hạ -{row.costDiscountPct}%)
                            </span>
                          )}
                        </td>

                        {/* Cột Mục Tiêu Về Bờ */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                            +{row.reqGainPct}%
                          </span>
                        </td>

                        {/* Cột Thao Tác */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {onNavigateBuy && (
                            <button
                              type="button"
                              onClick={() => handleGoBuyStep(row)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all shadow-xs hover:shadow-md active:scale-95 inline-flex items-center gap-1.5"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            {/* Số lượng dự kiến mua thêm */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  SL dự kiến mua thêm (cp)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickQty('50pct')}
                    className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded"
                  >
                    +50%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickQty('100pct')}
                    className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Mức giá dự kiến mua */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase">
                  Mức giá mua (x1.000đ)
                </label>
                {livePrice > 0 && (
                  <button
                    type="button"
                    onClick={() => setAddPriceK(String(livePrice / 1000))}
                    className="text-xs text-blue-600 font-bold hover:underline"
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
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-16"
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  × 1.000đ
                </span>
              </div>
              {plannedPrice > 0 && (
                <p className="text-xs text-gray-500 mt-1.5">
                  = <b className="text-gray-900">{fmtMoney(plannedPrice)}đ</b> / cp
                </p>
              )}
            </div>
          </div>

          {/* Bảng đối chiếu so sánh: Hiện Tại vs Sau Khi Mua Thêm */}
          <div className="bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50 rounded-2xl p-6 border border-indigo-100 shadow-xs space-y-5">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center gap-2">
              <span>📊</span> Kết Quả Mô Phỏng Thay Đổi Vị Thế (1 Đợt)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* Cột Hiện Tại */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-3">
                <div className="text-xs font-bold text-gray-400 uppercase">1. Hiện Tại</div>
                <div>
                  <span className="text-xs text-gray-500">Số lượng:</span>
                  <div className="font-bold text-gray-800 text-base">{currentQty.toLocaleString()} cp</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Giá vốn TB:</span>
                  <div className="font-bold text-gray-900 text-base">{fmtMoney(currentAvgCost)}đ</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Giá hòa vốn:</span>
                  <div className="font-bold text-emerald-700 text-base">{fmtMoney(currentBreakEven)}đ</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Tổng vốn đã chi:</span>
                  <div className="font-bold text-gray-700 text-base">{fmtMoney(currentTotalCost)}đ</div>
                </div>
              </div>

              {/* Cột Sau Khi Mua Thêm */}
              <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-xs space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[11px] font-black px-3 py-1 rounded-bl-xl">
                  MÔ PHỎNG
                </div>
                <div className="text-xs font-bold text-indigo-600 uppercase">2. Sau Khi Mua Thêm</div>
                <div>
                  <span className="text-xs text-gray-500">Tổng SL mới:</span>
                  <div className="font-black text-indigo-900 text-base">
                    {simulatedQty.toLocaleString()} cp{' '}
                    <span className="text-xs text-green-600 font-normal">
                      (+{plannedQty.toLocaleString()})
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Giá vốn TB mới:</span>
                  <div className="font-black text-indigo-600 text-lg">
                    {fmtMoney(simulatedAvgCost)}đ
                    {costReduction > 0 && (
                      <span className="text-xs text-green-600 font-semibold ml-2">
                        (Hạ -{costReductionPct}%)
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Giá hòa vốn mới:</span>
                  <div className="font-black text-emerald-700 text-lg">
                    {fmtMoney(simulatedBreakEven)}đ
                    {breakEvenReduction > 0 && (
                      <span className="text-xs text-green-600 font-semibold ml-2">
                        (-{fmtMoney(breakEvenReduction)}đ)
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Tổng vốn mới:</span>
                  <div className="font-black text-gray-900 text-base">{fmtMoney(simulatedTotalCost)}đ</div>
                </div>
              </div>
            </div>

            {/* Thông tin chiến lược & Nút đặt lệnh */}
            <div className="bg-white p-5 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 text-xs sm:text-sm">
                <div>
                  <span className="text-gray-500">💰 Số tiền cần chuẩn bị:</span>
                  <span className="font-black text-gray-900 text-base ml-2">
                    {fmtMoney(additionalTotalCost)}đ
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">🎯 Mục tiêu về bờ:</span>
                  <span className="font-black text-indigo-700 text-base ml-2">
                    Cần tăng +{reqGainFromPlanned}% từ giá mua
                  </span>
                </div>
              </div>

              {onNavigateBuy && (
                <button
                  type="button"
                  onClick={handleGoBuySingle}
                  disabled={plannedQty <= 0 || plannedPrice <= 0}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-md active:scale-95 flex items-center gap-2 self-start sm:self-auto"
                >
                  <span>🛒</span>
                  <span>Đi Đến Đặt Lệnh Mua Này</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
