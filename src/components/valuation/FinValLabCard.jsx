import React, { useState, useMemo } from 'react';

const METRIC_DEFINITIONS = [
  { key: 'eps', label: 'EPS (Thu nhập mỗi CP)', unit: 'đ', invertLogic: false },
  { key: 'bvps', label: 'BVPS (Giá trị sổ sách)', unit: 'đ', invertLogic: false },
  { key: 'pe', label: 'Hệ số P/E', unit: 'x', invertLogic: true },
  { key: 'pb', label: 'Hệ số P/B', unit: 'x', invertLogic: true },
  { key: 'roe', label: 'Tỷ suất ROE', unit: '%', invertLogic: false },
  { key: 'roa', label: 'Tỷ suất ROA', unit: '%', invertLogic: false },
  { key: 'roic', label: 'Tỷ suất ROIC', unit: '%', invertLogic: false },
  { key: 'grossMargin', label: 'Biên Lợi Nhuận Gộp', unit: '%', invertLogic: false },
  { key: 'netMargin', label: 'Biên Lợi Nhuận Ròng', unit: '%', invertLogic: false },
  { key: 'revenue', label: 'Doanh Thu Thuần', unit: 'Tỷ', invertLogic: false },
  { key: 'netIncome', label: 'Lợi Nhuận Sau Thuế', unit: 'Tỷ', invertLogic: false },
  { key: 'ebitda', label: 'Chỉ số EBITDA', unit: 'Tỷ', invertLogic: false },
  { key: 'freeCashFlow', label: 'Dòng Tiền Tự Do FCF', unit: 'Tỷ', invertLogic: false },
  { key: 'debtToEquity', label: 'Nợ / Vốn Chủ (D/E)', unit: 'x', invertLogic: true },
  { key: 'currentRatio', label: 'Hệ Số Thanh Toán Hiện Hành', unit: 'x', invertLogic: false },
  { key: 'cashRatio', label: 'Hệ Số Tiền Mặt', unit: 'x', invertLogic: false }
];

export default function FinValLabCard({ finvalLab, symbol, financials, currentStock }) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'improved' | 'worse'

  // Reconciliation layer: Kết hợp dữ liệu từ finvalLab, financials và currentStock
  const items = useMemo(() => {
    const rawItemsMap = {};
    if (finvalLab?.items && Array.isArray(finvalLab.items)) {
      finvalLab.items.forEach(it => {
        if (it?.key) rawItemsMap[it.key] = it;
      });
    }

    const yearlyDocs = financials?.yearly || [];
    const ratios = financials?.financialRatios || {};
    const close = currentStock?.close || financials?.quarterly?.[financials?.quarterly?.length - 1]?.close;

    return METRIC_DEFINITIONS.map(def => {
      const existing = rawItemsMap[def.key] || {};
      let currentVal = existing.current;
      let smaVal = existing.sma5y;

      // 1. Fallback nếu currentVal bị null
      if (currentVal == null) {
        if (def.key === 'eps') {
          currentVal = currentStock?.profitability?.eps || ratios?.valuation?.eps || existing.eps;
        } else if (def.key === 'bvps') {
          currentVal = currentStock?.valuation?.bvps || existing.bvps;
        } else if (def.key === 'pe') {
          currentVal = ratios?.valuation?.pe || currentStock?.valuation?.pe || (close && existing.current ? Math.round((close / existing.current) * 100) / 100 : null);
        } else if (def.key === 'pb') {
          currentVal = ratios?.valuation?.pb || currentStock?.valuation?.pb;
        } else if (def.key === 'roe') {
          currentVal = ratios?.profitability?.roe || currentStock?.profitability?.roe;
        } else if (def.key === 'roa') {
          currentVal = ratios?.profitability?.roa;
        } else if (def.key === 'roic') {
          currentVal = ratios?.profitability?.roic;
        } else if (def.key === 'grossMargin') {
          currentVal = ratios?.profitability?.grossMargin;
        } else if (def.key === 'netMargin') {
          currentVal = ratios?.profitability?.netMargin || currentStock?.profitability?.netMargin;
        } else if (def.key === 'revenue') {
          const rev = currentStock?.scale?.revenue || (yearlyDocs[yearlyDocs.length - 1]?.revenue);
          currentVal = rev > 1e8 ? rev / 1e9 : rev;
        } else if (def.key === 'netIncome') {
          const ni = currentStock?.scale?.netIncome || (yearlyDocs[yearlyDocs.length - 1]?.netIncome);
          currentVal = ni > 1e8 ? ni / 1e9 : ni;
        } else if (def.key === 'ebitda') {
          const eb = ratios?.profitability?.ebitda || currentStock?.health?.ebitda || (yearlyDocs[yearlyDocs.length - 1]?.ebitda);
          currentVal = eb > 1e8 ? eb / 1e9 : eb;
        } else if (def.key === 'freeCashFlow') {
          const fcf = financials?.cashflowHealth?.latestFcf || (yearlyDocs[yearlyDocs.length - 1]?.freeCashFlow);
          currentVal = fcf > 1e8 ? fcf / 1e9 : fcf;
        } else if (def.key === 'debtToEquity') {
          currentVal = ratios?.leverage?.debtToEquity || currentStock?.health?.debtToEquity;
        } else if (def.key === 'currentRatio') {
          currentVal = ratios?.liquidity?.currentRatio;
        } else if (def.key === 'cashRatio') {
          currentVal = ratios?.liquidity?.cashRatio;
        }
      }

      // 2. Fallback nếu smaVal bị null mà có lịch sử yearlyDocs
      if (smaVal == null && yearlyDocs.length > 0) {
        const histVals = yearlyDocs
          .map(y => {
            const v = y[def.key];
            if (v != null && !isNaN(v)) {
              return (def.unit === 'Tỷ' && Math.abs(v) > 1e8) ? v / 1e9 : Number(v);
            }
            return null;
          })
          .filter(v => v != null);

        if (histVals.length > 0) {
          smaVal = histVals.reduce((acc, curr) => acc + curr, 0) / histVals.length;
        }
      }

      // 3. Chuẩn hóa tỷ lệ biến động deltaPct và đánh giá chu kỳ
      let deltaPct = existing.deltaPct;
      let status = existing.status || (smaVal == null ? 'Chưa đủ dữ liệu LS' : 'Ổn định');
      let badgeColor = existing.badgeColor || 'text-gray-400';

      if (deltaPct == null && currentVal != null && smaVal != null && smaVal !== 0) {
        deltaPct = Math.round(((Number(currentVal) - Number(smaVal)) / Math.abs(Number(smaVal))) * 1000) / 10;
        const isBetter = def.invertLogic ? deltaPct <= -15.0 : deltaPct >= 15.0;
        const isWorse = def.invertLogic ? deltaPct >= 15.0 : deltaPct <= -15.0;

        if (isBetter) {
          status = 'Cải thiện rõ rệt';
          badgeColor = 'text-emerald-500 font-semibold';
        } else if (isWorse) {
          status = 'Suy giảm so với TB';
          badgeColor = 'text-rose-400 font-semibold';
        }
      }

      return {
        key: def.key,
        label: existing.label || def.label,
        unit: existing.unit || def.unit,
        current: currentVal != null ? (def.unit === 'Tỷ' ? Math.round(Number(currentVal) * 10) / 10 : (def.unit === 'đ' ? Math.round(Number(currentVal)) : Math.round(Number(currentVal) * 100) / 100)) : null,
        sma5y: smaVal != null ? (def.unit === 'Tỷ' ? Math.round(Number(smaVal) * 10) / 10 : (def.unit === 'đ' ? Math.round(Number(smaVal)) : Math.round(Number(smaVal) * 100) / 100)) : null,
        deltaPct,
        status,
        badgeColor,
        invertLogic: def.invertLogic
      };
    });
  }, [finvalLab, financials, currentStock]);

  if (!items || items.length === 0) {
    return null;
  }

  // Thống kê nhanh
  const improvedCount = items.filter(it => it.status === 'Cải thiện rõ rệt').length;
  const worseCount = items.filter(it => it.status === 'Suy giảm so với TB').length;
  const stableCount = items.filter(it => it.status === 'Ổn định').length;
  const unratedCount = items.filter(it => it.status === 'Chưa đủ dữ liệu LS').length;

  const filteredItems = items.filter(it => {
    if (filterType === 'improved') return it.status === 'Cải thiện rõ rệt';
    if (filterType === 'worse') return it.status === 'Suy giảm so với TB';
    return true;
  });

  return (
    <div className="p-5 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs space-y-5">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Phân Tích Thống Kê Chu Kỳ
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              FinVal Lab: Hiện Tại vs SMA 5 Năm
            </span>
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1">
            Phòng Thí Nghiệm Tài Chính FinVal Lab — {symbol}
          </h3>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            Tất cả ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('improved')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterType === 'improved'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
            }`}
          >
            <span>▲ Cải thiện</span>
            <span className="text-[10px] opacity-80">({improvedCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('worse')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterType === 'worse'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
            }`}
          >
            <span>▼ Suy giảm</span>
            <span className="text-[10px] opacity-80">({worseCount})</span>
          </button>
        </div>
      </div>

      {/* ── KPI HIGHLIGHTS ── */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">Cải Thiện Rõ Rệt (&gt;15%)</span>
          <span className="text-xl font-black text-emerald-800 dark:text-emerald-300 mt-0.5 block">{improvedCount} chỉ số</span>
        </div>
        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800">
          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase block">Duy Trì Ổn Định (±15%)</span>
          <span className="text-xl font-black text-gray-800 dark:text-gray-200 mt-0.5 block">{stableCount} chỉ số</span>
          {unratedCount > 0 && <span className="text-[10px] text-gray-400 block mt-0.5 font-medium">({unratedCount} chưa đủ LS)</span>}
        </div>
        <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60">
          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase block">Suy Giảm Đáng Kể (&lt;-15%)</span>
          <span className="text-xl font-black text-rose-800 dark:text-rose-300 mt-0.5 block">{worseCount} chỉ số</span>
        </div>
      </div>

      {/* ── BẢNG THỐNG KÊ CHI TIẾT ── */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 text-gray-400 text-[10px] uppercase font-bold tracking-wider">
              <th className="pb-3 pl-2">Chỉ Tiêu Tài Chính</th>
              <th className="pb-3 text-center">Đơn Vị</th>
              <th className="pb-3 text-right">Hiện Tại (TTM)</th>
              <th className="pb-3 text-right">Trung Bình 5Y (SMA)</th>
              <th className="pb-3 text-right">Biến Động (Δ%)</th>
              <th className="pb-3 text-right pr-2">Đánh Giá Chu Kỳ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredItems.map((item, idx) => {
              const delta = item.deltaPct;
              const hasDelta = delta != null;
              const isImproved = item.status === 'Cải thiện rõ rệt';
              const isWorse = item.status === 'Suy giảm so với TB';

              return (
                <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="py-2.5 pl-2 font-medium text-gray-900 dark:text-white">
                    {item.label}
                    {item.invertLogic && (
                      <span className="text-[9px] text-gray-400 ml-1.5 font-normal" title="Chỉ tiêu đòn bẩy hoặc chi phí: Giá trị giảm là tích cực">
                        (Đảo chiều)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-center text-gray-400 font-mono text-[11px]">
                    {item.unit}
                  </td>
                  <td className="py-2.5 text-right font-black text-gray-900 dark:text-white">
                    {item.current != null ? Number(item.current).toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="py-2.5 text-right text-gray-500 dark:text-gray-400">
                    {item.sma5y != null ? Number(item.sma5y).toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="py-2.5 text-right">
                    {hasDelta ? (
                      <span className={`font-black inline-flex items-center gap-0.5 ${
                        isImproved
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isWorse
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        <span>{delta > 0 ? '+' : ''}{delta}%</span>
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right pr-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase inline-block ${
                      isImproved
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : isWorse
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
