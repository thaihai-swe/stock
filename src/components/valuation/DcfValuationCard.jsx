import React from 'react';
import { formatVND } from '../../utils/format';

export default function DcfValuationCard({ dcfAnalysis, currentPrice, symbol }) {
  if (!dcfAnalysis) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 text-center text-gray-500">
        Chưa có dữ liệu phân tích DCF cho {symbol}
      </div>
    );
  }

  const {
    sectorWacc,
    industryCategory,
    baseFcff,
    dcfScenarios = {},
    reverseDcfImpliedGrowth,
    sensitivityMatrix = {},
    alternativeMethodFlag
  } = dcfAnalysis;

  const {
    basePrice,
    bullPrice,
    bearPrice,
    wacc,
    terminalG,
    status,
    note
  } = dcfScenarios;

  const curPrice = currentPrice || 0;

  const calcDiff = (target) => {
    if (!target || !curPrice || curPrice <= 0) return null;
    return Math.round(((target - curPrice) / curPrice) * 1000) / 10;
  };

  const baseDiff = calcDiff(basePrice);
  const bullDiff = calcDiff(bullPrice);
  const bearDiff = calcDiff(bearPrice);

  const { waccList = [], gList = [], matrix = [] } = sensitivityMatrix;

  return (
    <div className="space-y-6">
      {/* ── HEADER & TỔNG QUAN ── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🌊</span>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">
                Mô Hình Chiết Khấu Dòng Tiền Tự Do DCF (FCFF) & Reverse DCF
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              WACC Ngành: {sectorWacc || 10.5}%
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Ngành: {industryCategory || 'GENERAL'}
            </span>
          </div>
        </div>

        {alternativeMethodFlag && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
            <span className="text-amber-500 text-lg">⚠️</span>
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <div className="font-bold">Cảnh Báo Dòng Tiền Tự Do (FCF0 &lt; 0):</div>
              <p className="mt-0.5">{note}</p>
            </div>
          </div>
        )}

        {/* ── 3 KỊCH BẢN DCF ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* 1. Bear Case */}
          <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400">
              <span>🐻 Kịch Bản Thận Trọng (Bear)</span>
              <span>g: 2.0% · WACC +1.0%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-rose-700 dark:text-rose-300">
                {bearPrice ? formatVND(bearPrice) : '—'}
              </span>
              {bearDiff != null && (
                <span className={`text-xs font-bold ${bearDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {bearDiff >= 0 ? '+' : ''}{bearDiff}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Tăng trưởng thấp hơn dự kiến, chi phí vốn vay chịu áp lực tăng.</p>
          </div>

          {/* 2. Base Case */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border-2 border-indigo-400 dark:border-indigo-600 space-y-2 relative shadow-xs">
            <div className="absolute -top-2.5 right-4 bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
              Kịch Bản Cơ Sở
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300">
              <span>🎯 Cơ Sở (Base Case)</span>
              <span>g: 3.0% · WACC: {wacc || 10.5}%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-indigo-800 dark:text-indigo-200">
                {basePrice ? formatVND(basePrice) : '—'}
              </span>
              {baseDiff != null && (
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-lg ${baseDiff >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'}`}>
                  {baseDiff >= 0 ? '+' : ''}{baseDiff}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-300">Kế hoạch sản xuất kinh doanh theo đúng lộ trình công bố của ban lãnh đạo.</p>
          </div>

          {/* 3. Bull Case */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <span>🚀 Kịch Bản Lạc Quan (Bull)</span>
              <span>g: 3.5% · WACC -0.5%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                {bullPrice ? formatVND(bullPrice) : '—'}
              </span>
              {bullDiff != null && (
                <span className={`text-xs font-bold ${bullDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {bullDiff >= 0 ? '+' : ''}{bullDiff}%
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Hiệu suất vận hành tối đa, thị phần gia tăng và chi phí vốn tối ưu.</p>
          </div>
        </div>
      </div>

      {/* ── REVERSE DCF & TỐC ĐỘ TĂNG TRƯỞNG NGỤ Ý ── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔄</span>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              Reverse DCF — Tốc Độ Tăng Trưởng Ngụ Ý Thị Trường Phản Ánh
            </h4>
          </div>
          {reverseDcfImpliedGrowth != null && (
            <span className={`text-sm font-black px-2.5 py-1 rounded-xl ${reverseDcfImpliedGrowth <= 6.0
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
              : reverseDcfImpliedGrowth <= 15.0
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
              }`}>
              g ngụ ý: {reverseDcfImpliedGrowth}% / năm
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs text-gray-600 dark:text-gray-300">
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40 space-y-2">
            <div className="font-bold text-gray-800 dark:text-gray-200">Ý nghĩa phương pháp Reverse DCF:</div>
            <p className="leading-relaxed">
              Giải ngược bài toán: Tại thị giá hiện tại ({formatVND(curPrice)}), thị trường đang kỳ vọng dòng tiền của {symbol} phải tăng trưởng bình quân
              <span className="font-bold text-indigo-600 dark:text-indigo-400"> {reverseDcfImpliedGrowth != null ? `${reverseDcfImpliedGrowth}%/năm` : '—'} </span>
              trong 5 năm tới để bù đắp mức định giá.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/40 space-y-2">
            <div className="font-bold text-gray-800 dark:text-gray-200">Đối chiếu với tiềm năng thực tế:</div>
            <p className="leading-relaxed">
              {reverseDcfImpliedGrowth != null && reverseDcfImpliedGrowth <= 8.0
                ? '✅ Thị trường đang định giá rất thận trọng (kỳ vọng tăng trưởng thấp hơn GDP/ngành), tạo biên an toàn hấp dẫn cho nhà đầu tư tích lũy dài hạn.'
                : reverseDcfImpliedGrowth != null && reverseDcfImpliedGrowth <= 18.0
                  ? '⚖️ Kỳ vọng tăng trưởng ở mức hợp lý tương đương tốc độ mở rộng công suất bình thường của doanh nghiệp.'
                  : '⚠️ Thị trường đang phản ánh kỳ vọng tăng trưởng rất tham vọng. Doanh nghiệp cần duy trì tăng trưởng đột phá để giữ vững thị giá.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── MA TRẬN PHÂN TÍCH ĐỘ NHẠY CẢM 2 CHIỀU (SENSITIVITY MATRIX) ── */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                Bảng Phân Tích Độ Nhạy Cảm 2 Chiều (DCF Sensitivity Matrix)
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Ma trận giá trị hợp lý trên từng cặp giả định: Chi Phí Vốn WACC (Hàng) vs Tăng Trưởng Vĩnh Viễn g (Cột)
              </p>
            </div>
          </div>
        </div>

        {matrix.length > 0 ? (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300">
                  <th className="p-3 text-left font-bold border border-gray-200 dark:border-gray-700">WACC \ g</th>
                  {gList.map((gVal, idx) => (
                    <th key={idx} className="p-3 font-bold border border-gray-200 dark:border-gray-700">
                      g = {gVal}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {waccList.map((wVal, rIdx) => (
                  <tr key={rIdx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                    <td className="p-3 text-left font-bold bg-gray-50 dark:bg-gray-700/40 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
                      WACC = {wVal}%
                    </td>
                    {matrix[rIdx]?.map((cellVal, cIdx) => {
                      const isBase = Math.abs(wVal - (sectorWacc || 10.5)) < 0.3 && gList[cIdx] === 3.0;
                      return (
                        <td
                          key={cIdx}
                          className={`p-3 font-mono font-bold border border-gray-200 dark:border-gray-700 ${isBase
                            ? 'bg-indigo-100/70 text-indigo-900 dark:bg-indigo-900/60 dark:text-indigo-200 ring-2 ring-indigo-500'
                            : cellVal && curPrice && cellVal >= curPrice
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-rose-700 dark:text-rose-300'
                            }`}
                        >
                          {cellVal ? formatVND(cellVal) : '—'}
                          {isBase && <span className="block text-[10px] text-indigo-600 dark:text-indigo-300 font-sans font-normal">(Base)</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-gray-400">
            Không đủ dữ liệu dòng tiền để sinh ma trận độ nhạy cảm.
          </div>
        )}
      </div>
    </div>
  );
}
