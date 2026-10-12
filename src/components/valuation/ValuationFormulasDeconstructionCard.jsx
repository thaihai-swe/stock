import { useState } from 'react';
import { formatVND } from '../../utils/format.js';

export default function ValuationFormulasDeconstructionCard({
  valuation,
  financials,
  currentPrice,
  symbol
}) {
  const [selectedModelId, setSelectedModelId] = useState('all');

  const valData = valuation || financials?.valuationMultiples || {};
  const models10 = valData.models10 || [];
  const consensusDetails = valData.consensusDetails || {};

  // Trích xuất các tham số đầu vào tổng thể từ các nguồn có sẵn
  const closePrice = currentPrice || valData.close || 0;
  const bvps = valData.bvps || 0;
  const eps = valData.eps || (financials?.quarterly?.[financials.quarterly.length - 1]?.eps) || 0;
  const roe = financials?.financialRatios?.profitability?.roe ?? valData.dupont?.roe;
  
  const dcfModel = models10.find(m => m.id === 'dcf' || m.id === 'fcff');
  const dcfParams = dcfModel?.parameters || {};
  const rawWacc = dcfParams.wacc ?? valData.dcfScenarios?.wacc ?? financials?.dcfScenarios?.wacc;
  const wacc = rawWacc != null ? (rawWacc > 1 ? Number(rawWacc).toFixed(1) : (Number(rawWacc) * 100).toFixed(1)) : null;
  const rawG = dcfParams.terminalG ?? valData.dcfScenarios?.terminalG ?? financials?.dcfScenarios?.terminalG;
  const gTerm = rawG != null ? (rawG > 1 ? Number(rawG).toFixed(1) : (Number(rawG) * 100).toFixed(1)) : null;

  const filteredModels = selectedModelId === 'all'
    ? models10
    : models10.filter(m => m.id === selectedModelId);

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Giải Phẫu Định Lượng Chuyên Sâu
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Quantitative Framework
            </span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
            Giải Phẫu 10 Mô Hình Định Lượng & Cơ Chế Hội Tụ Consensus — {symbol}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Minh bạch 100% công thức toán học, từng bước thế số thực tế từ BCTC, bảng biến số tài chính và ma trận trọng số 23 phân ngành GICS.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto text-xs">
          <button
            type="button"
            onClick={() => setSelectedModelId('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${selectedModelId === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
          >
            Tất cả 10 mô hình
          </button>
        </div>
      </div>

      {/* ── 1. THANH THAM SỐ ĐẦU VÀO CỐT LÕI (MASTER INPUTS BAR) ── */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-slate-50/50 dark:from-gray-900/50 dark:to-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚙️</span> Tham Số Đầu Vào Cốt Lõi Dùng Trong Định Giá ({symbol})
          </span>
          <span className="text-[11px] text-gray-400">Nguồn: BCTC 8 Quý & TradingView Scanner</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-center text-xs">
          <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <span className="text-[10px] text-gray-400 block">Thị giá hiện tại (P₀)</span>
            <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm mt-0.5 block">{formatVND(closePrice)}</span>
          </div>
          <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <span className="text-[10px] text-gray-400 block">EPS Chuẩn hóa (EPS_norm)</span>
            <span className="font-black text-gray-900 dark:text-white text-sm mt-0.5 block">{formatVND(eps)}</span>
          </div>
          <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <span className="text-[10px] text-gray-400 block">Giá trị sổ sách (BVPS)</span>
            <span className="font-black text-gray-900 dark:text-white text-sm mt-0.5 block">{formatVND(bvps)}</span>
          </div>
          <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <span className="text-[10px] text-gray-400 block">Tỷ suất ROE (%)</span>
            <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 block">{roe != null ? `${roe}%` : '—'}</span>
          </div>
          <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <span className="text-[10px] text-gray-400 block">Chi phí vốn (WACC / CoE)</span>
            <span className="font-black text-amber-600 dark:text-amber-400 text-sm mt-0.5 block">{wacc != null ? `${wacc}%` : '—'}</span>
          </div>
          <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <span className="text-[10px] text-gray-400 block">Tăng trưởng dài hạn (g)</span>
            <span className="font-black text-teal-600 dark:text-teal-400 text-sm mt-0.5 block">{gTerm != null ? `${gTerm}%` : '—'}</span>
          </div>
        </div>
      </div>

      {/* ── 2. LƯỚI GIẢI PHẪU 10 MÔ HÌNH ĐỊNH LƯỢNG ── */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Chi Tiết 10 Mô Hình Định Lượng Độc Lập ({models10.length} mô hình)
        </h4>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredModels.map((m, idx) => {
            const targetVal = m.value ?? m.targetPrice;
            const hasVal = targetVal != null && targetVal > 0;
            const isOutlier = m.isOutlier;
            const isContributing = hasVal && !isOutlier && (m.weight || 0) > 0;
            const diff = m.diffPercent;

            return (
              <div
                key={m.id || idx}
                className={`p-5 rounded-2xl border transition-all space-y-3.5 flex flex-col justify-between ${isOutlier
                    ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                    : isContributing
                      ? 'bg-white dark:bg-gray-800/90 border-indigo-200 dark:border-indigo-700/80 shadow-xs ring-1 ring-indigo-500/15'
                      : 'bg-gray-50/50 dark:bg-gray-800/40 border-gray-200/70 dark:border-gray-700/50'
                  }`}
              >
                {/* Header Thẻ Mô Hình */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                          {idx + 1}. {m.cleanName || m.name}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md transition-all ${isContributing
                              ? 'font-bold bg-indigo-600 text-white dark:bg-indigo-500 shadow-2xs'
                              : isOutlier
                                ? 'font-medium bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 line-through border border-rose-200 dark:border-rose-800'
                                : 'font-medium bg-gray-100/70 dark:bg-gray-800/70 text-gray-400 dark:text-gray-500 border border-gray-200/60 dark:border-gray-700/60 opacity-60'
                            }`}
                          title={
                            isContributing
                              ? `Mô hình hợp lệ, đóng góp ${Math.round((m.weight || 0) * 100)}% vào Giá Trị Nội Tại Hội Tụ`
                              : isOutlier
                                ? 'Bị loại trừ do lệch quá ±60% so với median'
                                : 'Không đủ dữ liệu hoặc không áp dụng cho ngành này'
                          }
                        >
                          {isContributing ? '✓ ' : ''}Trọng số: {Math.round((m.weight || 0) * 100)}%
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 block">
                        Đặc thù ngành: {m.suitabilityNote || 'Phù hợp'}
                      </span>
                    </div>

                    {/* Target Price */}
                    <div className="text-right">
                      {hasVal ? (
                        <div>
                          <span className={`text-base font-black ${isOutlier ? 'line-through text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {formatVND(targetVal)}
                          </span>
                          <div className="mt-0.5">
                            {isOutlier ? (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                Lọc ±60% (Outlier)
                              </span>
                            ) : diff != null ? (
                              <span className={`text-[10px] font-bold ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                {diff >= 0 ? '▲ +' : '▼ '}{diff}% so với thị giá
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Không áp dụng</span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 block mt-0.5">{m.statusNote || 'Thiếu số liệu'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Khối Công Thức Toán Học */}
                  <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">Công Thức Toán Học:</span>
                      {m.id === 'graham' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          Graham Dynamic (100% Dữ Liệu Thật)
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300">
                      {m.formula || '—'}
                    </div>
                    {m.formulaDetail && (
                      <div className="text-[11px] text-gray-700 dark:text-gray-300 font-mono pt-1 border-t border-gray-100 dark:border-gray-700">
                        {m.formulaDetail}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bảng Tham Số Thế Số */}
                {m.parameters && Object.keys(m.parameters).length > 0 && (
                  <div className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60 text-[10px]">
                    <span className="text-gray-500 dark:text-gray-400 font-bold block mb-1">Các Biến Số Đầu Vào:</span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(m.parameters).map(([k, v]) => {
                        if (v == null) return null;
                        const labelMap = {
                          eps: 'EPS TTM',
                          epsAvg: 'EPS Trung bình 5Y',
                          peBase: 'P/E Cơ sở',
                          peMedian: 'P/E Trung vị (P50)',
                          peAvg: 'P/E Trung bình (Mean)',
                          targetPe: 'P/E Mục tiêu',
                          targetPb: 'P/B Mục tiêu',
                          pbMedian: 'P/B Trung vị (P50)',
                          pbAvg: 'P/B Trung bình (Mean)',
                          yearsUsed: 'Số năm lịch sử',
                          isFallback: 'Dùng mặc định ngành',
                          bvps: 'BVPS',
                          roe: 'ROE (%)',
                          coe: 'Chi phí vốn CoE',
                          terminalG: 'Tăng trưởng g_term',
                          hs: 'Hệ số nhạy cảm hs',
                          gCagr: 'Tăng trưởng g (CAGR %)',
                          constantVn: 'Hằng số VN',
                          yVn: 'Lãi suất y',
                          vn10yYield: 'Lợi suất TPCP 10Y'
                        };
                        const displayKey = labelMap[k] || k;
                        return (
                          <span key={k} className="px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-mono">
                            {displayKey}: <strong>{typeof v === 'number' ? Number(v).toLocaleString('vi-VN') : (typeof v === 'boolean' ? (v ? 'Có' : 'Không') : String(v))}</strong>
                          </span>
                        );
                      })}
                    </div>
                    {m.id === 'graham' && (
                      <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 bg-indigo-50/50 dark:bg-indigo-950/30 p-2 rounded-lg border border-indigo-100/60 dark:border-indigo-900/40 space-y-0.5">
                        <div>• <strong>P/E Cơ sở:</strong> Lấy <code>min(7.0, P/E Trung vị 5Y)</code> — Chặn trần an toàn 7.0x cho tăng trưởng 0% theo triết lý Graham VN.</div>
                        <div>• <strong>Tăng trưởng g:</strong> Chuẩn hóa 5.0% đối với ngành chu kỳ (tránh ảo giác đáy chu kỳ) hoặc CAGR LNST thực tế trần an toàn 12.0%.</div>
                        <div>• <strong>Lãi suất & Hằng số VN:</strong> Chiết khấu theo Lợi suất TPCP 10 năm thực tế từ HNX ({m.parameters?.vn10yYield || 4.47}%).</div>
                      </div>
                    )}
                    {m.id === 'pe' && (
                      <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 bg-indigo-50/50 dark:bg-indigo-950/30 p-2 rounded-lg border border-indigo-100/60 dark:border-indigo-900/40 space-y-0.5">
                        <div>• <strong>P/E Mục Tiêu:</strong> Sử dụng <strong>Trung vị P50</strong> ({m.parameters?.yearsUsed ? `${m.parameters.yearsUsed} năm` : 'chu kỳ'} = <strong>{m.parameters?.peMedian || m.parameters?.targetPe}x</strong>) thay vì Trung bình cộng ({m.parameters?.peAvg != null ? `${m.parameters.peAvg}x` : '—'}) để triệt tiêu các đột biến ngoại lai (outliers) khi EPS sụt giảm trong các đáy chu kỳ kinh doanh.</div>
                        <div>• <strong>Nguồn dữ liệu:</strong> Trích xuất từ BCTC lịch sử thực tế của doanh nghiệp; chỉ dùng bội số ngành khi doanh nghiệp hoàn toàn chưa có dữ liệu lịch sử.</div>
                      </div>
                    )}
                    {m.id === 'pb' && (
                      <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 bg-indigo-50/50 dark:bg-indigo-950/30 p-2 rounded-lg border border-indigo-100/60 dark:border-indigo-900/40 space-y-0.5">
                        <div>• <strong>P/B Mục Tiêu:</strong> Sử dụng <strong>Trung vị P50</strong> ({m.parameters?.yearsUsed ? `${m.parameters.yearsUsed} năm` : 'chu kỳ'} = <strong>{m.parameters?.pbMedian || m.parameters?.targetPb}x</strong>) {m.parameters?.pbAvg != null ? `| P/B Trung bình: ${m.parameters.pbAvg}x` : ''} hoặc Mô hình Gordon Growth chuyên biệt cho nhóm Tài chính (Ngân hàng, Chứng khoán, Bảo hiểm).</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 3. KHỐI GIẢI PHẪU CƠ CHẾ CONSENSUS & LỌC NGOẠI LAI ±60% ── */}
      <div className="p-5 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50/60 dark:from-slate-900 dark:to-indigo-950 text-gray-900 dark:text-white rounded-2xl border border-indigo-100 dark:border-indigo-900/60 space-y-4 shadow-xs dark:shadow-none transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100 dark:border-indigo-800/60 pb-3">
          <div>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider block">
              Động Cơ Đồng Thuận
            </span>
            <h4 className="text-sm font-black text-gray-900 dark:text-white mt-0.5">
              Quy Trình Lọc Ngoại Lai ±60% & Tính Giá Trị Nội Tại Hội Tụ (Consensus)
            </h4>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Giá Hội Tụ Sau Cùng:</span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {formatVND(valData.consensusFairValue || valData.fairValue)}
            </span>
          </div>
        </div>

        {/* 4 Bước Quy Trình */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white/90 dark:bg-white/5 rounded-xl border border-indigo-100/80 dark:border-white/10 space-y-1 shadow-2xs dark:shadow-none">
            <span className="text-[10px] text-indigo-600 dark:text-indigo-300 font-bold block">BƯỚC 1: TÍNH 10 MÔ HÌNH</span>
            <p className="text-[11px] text-gray-600 dark:text-gray-300">
              Tính độc lập 10 giá trị mục tiêu dựa trên BCTC 8 quý, 5 năm và TradingView Scanner.
            </p>
          </div>

          <div className="p-3 bg-white/90 dark:bg-white/5 rounded-xl border border-indigo-100/80 dark:border-white/10 space-y-1 shadow-2xs dark:shadow-none">
            <span className="text-[10px] text-indigo-600 dark:text-indigo-300 font-bold block">BƯỚC 2: XÁC ĐỊNH MEDIAN</span>
            <p className="text-[11px] text-gray-600 dark:text-gray-300">
              Tìm trung vị sơ bộ để làm tâm định vị, triệt tiêu sai lệch cực đoan ban đầu.
            </p>
          </div>

          <div className="p-3 bg-white/90 dark:bg-white/5 rounded-xl border border-indigo-100/80 dark:border-white/10 space-y-1 shadow-2xs dark:shadow-none">
            <span className="text-[10px] text-rose-600 dark:text-rose-300 font-bold block">BƯỚC 3: LỌC NGOẠI LAI ±60%</span>
            <p className="text-[11px] text-gray-600 dark:text-gray-300">
              Loại bỏ các mô hình lệch quá ±60% so với median để bảo vệ tính thận trọng.
            </p>
          </div>

          <div className="p-3 bg-white/90 dark:bg-white/5 rounded-xl border border-indigo-100/80 dark:border-white/10 space-y-1 shadow-2xs dark:shadow-none">
            <span className="text-[10px] text-emerald-600 dark:text-emerald-300 font-bold block">BƯỚC 4: TÁI CHUẨN HÓA TRỌNG SỐ</span>
            <p className="text-[11px] text-gray-600 dark:text-gray-300">
              Chuẩn hóa lại tổng trọng số các mô hình hợp lệ về đúng 100% để tính giá bình quân gia quyền.
            </p>
          </div>
        </div>

        {/* Thống kê Consensus thực tế của mã */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-indigo-100 dark:border-indigo-800/40 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-gray-500 dark:text-gray-400 text-[10px] block">Độ phân tán (Dispersion):</span>
              <span className={`font-black ${(consensusDetails.dispersionPct || 0) <= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                }`}>
                {consensusDetails.dispersionPct != null ? `${consensusDetails.dispersionPct}%` : '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 text-[10px] block">Mô hình hợp lệ:</span>
              <span className="font-black text-gray-900 dark:text-white">
                {consensusDetails.modelsUsed != null ? `${consensusDetails.modelsUsed}/10` : '—'}
              </span>
            </div>
            {consensusDetails.excludedOutliers && consensusDetails.excludedOutliers.length > 0 && (
              <div>
                <span className="text-gray-500 dark:text-gray-400 text-[10px] block">Ngoại lai bị loại trừ:</span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {consensusDetails.excludedOutliers.join(', ')}
                </span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-indigo-700 dark:text-indigo-200">
            Biên An Toàn Hội Tụ (MoS): <strong className="text-emerald-600 dark:text-emerald-400 text-sm">
              {valData.marginOfSafety != null ? `${valData.marginOfSafety}%` : '—'}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}
