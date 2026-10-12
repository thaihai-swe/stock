import React from 'react';

// Format tiền VND
function formatVND(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number(val).toLocaleString('vi-VN') + ' đ';
}

// % Chênh lệch giữa giá định giá và thị giá
function calcPriceDiff(fairPrice, currentPrice) {
  if (!fairPrice || !currentPrice || currentPrice <= 0) return null;
  const diff = ((fairPrice - currentPrice) / currentPrice) * 100;
  return Math.round(diff * 10) / 10;
}

export default function StockCockpitHeader({
  currentStock,
  financials,
  selectedSymbol,
  inputSymbol,
  setInputSymbol,
  lookingUp,
  syncingSingle,
  handleLookupSymbol,
  handleSyncSingleFinancials,
  setIsReportModalOpen,
  lastSyncedAt,
}) {
  if (!currentStock) return null;

  const closePrice = currentStock.close;
  const consensusFair =
    currentStock.valuation?.fairValue ||
    financials?.valuationMultiples?.consensusFairValue;

  const upsideValue =
    currentStock.valuation?.upside != null
      ? currentStock.valuation.upside
      : financials?.valuationMultiples?.upside != null
        ? financials.valuationMultiples.upside
        : calcPriceDiff(consensusFair, closePrice);

  const mosValue =
    currentStock.valuation?.marginOfSafetyFairValue != null
      ? currentStock.valuation.marginOfSafetyFairValue
      : financials?.valuationMultiples?.marginOfSafety != null
        ? financials.valuationMultiples.marginOfSafety
        : consensusFair && closePrice
          ? Math.round(((consensusFair - closePrice) / consensusFair) * 100)
          : null;

  let valRatingText = currentStock.valuation?.valuationRatingText;
  let valRatingBadge = currentStock.valuation?.valuationRatingBadge;
  if (!valRatingText && mosValue != null) {
    if (mosValue >= 20) {
      valRatingText = 'Rất Rẻ (MoS > 20%)';
      valRatingBadge =
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
    } else if (mosValue >= 5) {
      valRatingText = 'Hấp Dẫn (Vùng Mua 5 - 20%)';
      valRatingBadge =
        'bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300 border border-green-200 dark:border-green-800';
    } else if (mosValue >= -5) {
      valRatingText = 'Hợp Lý (Cân Bằng)';
      valRatingBadge =
        'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
    } else if (mosValue >= -20) {
      valRatingText = 'Định Giá Cao (-5% đến -20%)';
      valRatingBadge =
        'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
    } else {
      valRatingText = 'Rất Đắt / Rủi Ro (MoS < -20%)';
      valRatingBadge =
        'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
    }
  }
  if (!valRatingText) {
    valRatingText = 'Định giá hợp lý';
    valRatingBadge =
      'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800';
  }

  const consensusDetails =
    currentStock.valuation?.consensusDetails ||
    financials?.valuationMultiples?.consensusDetails;

  const models10 =
    currentStock.valuation?.models10 && currentStock.valuation.models10.length > 0
      ? currentStock.valuation.models10
      : financials?.valuationMultiples?.models10 &&
        financials.valuationMultiples.models10.length > 0
        ? financials.valuationMultiples.models10
        : null;

  return (
    <div className="space-y-4">
      {/* ── 1. THANH ĐIỀU KHIỂN & TRA CỨU CỔ PHIẾU ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Thông tin mã & Ngành nghề */}
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-black text-xl shadow-2xs">
            {selectedSymbol}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                {currentStock.description || selectedSymbol}
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                {currentStock.exchange || 'HOSE'}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                {currentStock.sector || 'Khác'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {currentStock.industry ? `Ngành: ${currentStock.industry}` : ''}
              {lastSyncedAt && (
                <span className="ml-2 pl-2 border-l border-gray-200 dark:border-gray-700 text-[11px] text-gray-400">
                  Cập nhật: {new Date(lastSyncedAt).toLocaleTimeString('vi-VN')}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Khung tìm kiếm & Thao tác hành động */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookupSymbol();
            }}
            className="flex items-center gap-1.5 flex-1 sm:flex-initial"
          >
            <div className="relative w-full sm:w-56">
              <input
                type="text"
                value={inputSymbol}
                onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
                placeholder="Tra mã (VNM, MBB, SSI...)"
                className="w-full pl-3 pr-7 py-2 bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase shadow-2xs"
                disabled={lookingUp}
              />
              {inputSymbol && (
                <button
                  type="button"
                  onClick={() => setInputSymbol('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!inputSymbol.trim() || lookingUp}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1 whitespace-nowrap active:scale-95"
            >
              <span className={lookingUp ? 'animate-spin' : ''}>🔍</span>
              <span className="hidden sm:inline">{lookingUp ? 'Đang nạp...' : 'Tra Cứu'}</span>
            </button>
          </form>

          {/* Nút Master Dossier 10 Chương */}
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 active:scale-95"
            title="Mở Báo Cáo Phân Tích Toàn Diện Master Dossier (10 Chương Nghiên Cứu)"
          >
            <span>📑</span>
            <span className="hidden md:inline">Hồ Sơ Master Dossier</span>
          </button>

          {/* Nút Refresh BCTC */}
          <button
            type="button"
            onClick={handleSyncSingleFinancials}
            disabled={syncingSingle}
            className="p-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-600 dark:text-gray-300 text-xs transition cursor-pointer shadow-2xs disabled:opacity-50 active:scale-95"
            title={`Tải lại BCTC và Định giá cho ${selectedSymbol} (~3-5s)`}
          >
            <span className={syncingSingle ? 'inline-block animate-spin' : ''}>🔄</span>
          </button>
        </div>
      </div>

      {/* ── 2. HERO CARD: GIÁ TRỊ HỘI TỤ CONSENSUS & LƯỚI 10 MÔ HÌNH ── */}
      <div className="p-5 sm:p-6 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50/60 dark:from-indigo-900 dark:via-indigo-950 dark:to-slate-900 text-gray-900 dark:text-white rounded-3xl shadow-sm dark:shadow-xl border border-indigo-100 dark:border-indigo-800/40 space-y-4 transition-colors">
        {/* Hàng trên: Giá Hội Tụ, Thị Giá, Upside, MoS */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-indigo-100 dark:border-indigo-800/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider block">
                🎯 Giá Trị Nội Tại Hội Tụ (Consensus Fair Value)
              </span>

            </div>
            <div className="flex flex-wrap items-baseline gap-3 mt-1">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                {formatVND(consensusFair)}
              </span>
              <span className="text-xs text-gray-500 dark:text-indigo-200 font-medium">
                (Hội tụ 10 mô hình định lượng & Lọc ngoại lai ±60%)
              </span>
            </div>

            {/* Chi tiết độ phân tán & mô hình hợp lệ */}
            {consensusDetails && (
              <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-indigo-100 dark:border-indigo-800/60 text-[11px] text-gray-600 dark:text-indigo-200">
                {consensusDetails.dispersion != null && (
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 font-semibold border border-gray-200/60 dark:border-white/5">
                    Độ phân tán: <strong className={consensusDetails.dispersion <= 20 ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300'}>{consensusDetails.dispersion}%</strong>
                  </span>
                )}
                {consensusDetails.validCount != null && (
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 border border-gray-200/60 dark:border-white/5">
                    Mô hình hợp lệ: <strong>{consensusDetails.validCount}/10</strong>
                    {consensusDetails.outliersCount > 0 && (
                      <span className="text-rose-600 dark:text-rose-300 ml-1">({consensusDetails.outliersCount} ngoại lai đã lọc)</span>
                    )}
                  </span>
                )}
                {consensusDetails.weightedPrice != null && (
                  <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 border border-gray-200/60 dark:border-white/5">
                    Gia quyền: <strong>{formatVND(consensusDetails.weightedPrice)}</strong>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 3 Trụ Cột: Thị Giá, Upside %, Biên An Toàn MoS % */}
          <div className="flex flex-wrap items-center lg:justify-end gap-4 sm:gap-6 pt-2 lg:pt-0">
            {/* Thị Giá Hiện Tại */}
            <div>
              <span className="text-[11px] text-gray-500 dark:text-indigo-300 font-semibold block uppercase tracking-wide">
                Thị Giá Hiện Tại
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  {formatVND(closePrice)}
                </span>
                <span
                  className={`text-xs font-bold ${(currentStock.change || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                >
                  {(currentStock.change || 0) >= 0 ? '+' : ''}
                  {currentStock.change}%
                </span>
              </div>
            </div>

            {/* Upside % */}
            <div className="border-l border-indigo-100 dark:border-indigo-800/80 pl-4 sm:pl-6">
              <span className="text-[11px] text-gray-500 dark:text-indigo-300 font-semibold block uppercase tracking-wide">
                Tiềm Năng Upside
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-2xl font-black ${(upsideValue || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                >
                  {upsideValue != null ? `${upsideValue >= 0 ? '+' : ''}${upsideValue}%` : '—'}
                </span>
                <span className="text-[10px] text-gray-400 dark:text-indigo-200 font-medium">
                  {(upsideValue || 0) >= 0 ? '(Tăng)' : '(Giảm)'}
                </span>
              </div>
            </div>

            {/* Biên An Toàn Graham MoS */}
            <div className="border-l border-indigo-100 dark:border-indigo-800/80 pl-4 sm:pl-6">
              <span className="text-[11px] text-gray-500 dark:text-gray-300 font-medium block">
                Biên An Toàn (MoS)
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-xl font-black ${(mosValue || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                >
                  {mosValue != null ? `${mosValue >= 0 ? '+' : ''}${mosValue}%` : '—'}
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${valRatingBadge}`}>
                  {valRatingText}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lưới 10 Mô Hình Định Lượng Tinh Gọn */}
        {Array.isArray(models10) && models10.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1">
            {models10.map((m, idx) => {
              const targetVal = m.value ?? m.targetPrice;
              const hasVal = targetVal != null && targetVal > 0;
              const isOutlier = m.isOutlier;
              const isContributing = hasVal && !isOutlier && (m.weight || 0) > 0;
              const diff =
                m.diffPercent ??
                (hasVal && closePrice ? calcPriceDiff(targetVal, closePrice) : null);
              const cleanName = (m.cleanName || m.name || '').replace(/^\d+\.\s*/, '');
              return (
                <div
                  key={m.id || idx}
                  className={`p-3 rounded-2xl border text-center flex flex-col justify-between transition-all ${isOutlier
                      ? 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40 opacity-70'
                      : isContributing
                        ? 'bg-white/95 dark:bg-white/12 border-indigo-200/90 dark:border-indigo-600/40 hover:bg-white dark:hover:bg-white/18 shadow-2xs dark:shadow-none ring-1 ring-indigo-500/15'
                        : 'bg-white/70 dark:bg-white/5 border-gray-200/70 dark:border-white/10'
                    }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`text-[10px] uppercase truncate ${isContributing
                            ? 'text-indigo-700 dark:text-indigo-200 font-black'
                            : 'text-gray-700 dark:text-gray-300 font-bold'
                          }`}
                        title={m.fullName || m.name || cleanName}
                      >
                        {idx + 1}. {cleanName}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-all ${isContributing
                            ? 'font-black bg-indigo-600 text-white dark:bg-indigo-500 shadow-2xs'
                            : isOutlier
                              ? 'font-medium bg-rose-100 text-rose-500 dark:bg-rose-950/40 dark:text-rose-400 line-through border border-rose-200/60 dark:border-rose-900/40'
                              : 'font-medium bg-gray-100/70 text-gray-400 dark:bg-white/5 dark:text-gray-500 opacity-60'
                          }`}
                        title={
                          isContributing
                            ? `Được tính vào Giá Trị Nội Tại (Trọng số ${Math.round((m.weight || 0) * 100)}%)`
                            : isOutlier
                              ? 'Bị loại trừ do lệch quá ±60% so với median'
                              : 'Chưa đủ dữ liệu tài chính hoặc miễn trừ theo ngành'
                        }
                      >
                        w: {Math.round((m.weight || 0) * 100)}%
                      </span>
                    </div>

                    <div
                      className={`text-sm font-black mt-1 ${isOutlier
                          ? 'line-through text-rose-600 dark:text-rose-300'
                          : hasVal
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-500 dark:text-gray-400 font-medium text-xs'
                        }`}
                    >
                      {hasVal ? formatVND(targetVal) : m.statusNote || '—'}
                    </div>
                  </div>

                  <div className="mt-1.5 flex flex-col items-center gap-1">
                    {isOutlier ? (
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30">
                        Lọc ±60% (Outlier)
                      </span>
                    ) : diff != null ? (
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5 ${diff >= 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                          }`}
                        title={`Chênh lệch so với thị giá (${formatVND(closePrice)}): ${diff >= 0 ? '+' : ''
                          }${diff}%`}
                      >
                        <span>{diff >= 0 ? '▲' : '▼'}</span>
                        <span>
                          {diff >= 0 ? '+' : ''}
                          {diff}%
                        </span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400 dark:text-indigo-300/50">—</span>
                    )}

                    <div
                      className="text-[9px] text-gray-500 dark:text-indigo-300/80 truncate w-full"
                      title={m.formulaDetail || m.formula || m.desc || m.note}
                    >
                      {m.formulaDetail || m.formula || m.desc || m.note || '—'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* ── 3. THƯỚC ĐO VỊ THẾ 52 TUẦN & 7 CHU KỲ HIỆU SUẤT ── */}
      <div className="p-4 sm:p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-3">
        {/* Slider 52 Tuần */}
        {currentStock.performance?.low52w != null && currentStock.performance?.high52w != null && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <span>🎯</span> Vị Trí Thị Giá Trong Chu Kỳ 52 Tuần
              </span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {currentStock.performance.range52wPercent != null
                  ? `${currentStock.performance.range52wPercent}% từ đáy 52W`
                  : ''}
              </span>
            </div>

            <div className="relative pt-1 pb-1">
              <div className="h-2.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex relative">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(4, Math.min(96, currentStock.performance.range52wPercent || 0))}%`,
                  }}
                />
              </div>

              <div className="flex justify-between items-center text-xs mt-1.5 text-gray-500 dark:text-gray-400">
                <div>
                  <span className="text-[10px] text-gray-400 block">Đáy 52 tuần</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatVND(currentStock.performance.low52w)}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] text-gray-400 block">Thị giá hiện tại</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                    {formatVND(closePrice)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block">Đỉnh 52 tuần</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    {formatVND(currentStock.performance.high52w)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7 Chu Kỳ Hiệu Suất Giá */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
          {[
            { label: '1 Tuần', val: currentStock.performance?.w1 },
            { label: '1 Tháng', val: currentStock.performance?.m1 },
            { label: '3 Tháng', val: currentStock.performance?.m3 },
            { label: '6 Tháng', val: currentStock.performance?.m6 },
            { label: 'Đầu năm', val: currentStock.performance?.ytd },
            { label: '1 Năm', val: currentStock.performance?.y1 },
            { label: '5 Năm', val: currentStock.performance?.y5 },
          ].map((cycle, i) => (
            <div
              key={i}
              className="p-2 rounded-xl bg-gray-50/80 dark:bg-gray-700/40 border border-gray-100 dark:border-gray-700 text-center"
            >
              <span className="text-[10px] text-gray-400 font-bold block">{cycle.label}</span>
              <span
                className={`text-xs font-black block mt-0.5 ${(cycle.val || 0) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                  }`}
              >
                {cycle.val != null ? `${cycle.val >= 0 ? '+' : ''}${cycle.val}%` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
