import React, { useState, useMemo } from 'react';

function formatBn(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number(val).toLocaleString('vi-VN') + ' tỷ';
}

export default function FinancialRatiosView({ financialRatios }) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!financialRatios) return null;

  // Cấu hình 5 nhóm tỷ số tài chính
  const groups = [
    {
      id: 'valuation',
      title: '1. Nhóm Chỉ Số Định Giá (Multiples)',
      icon: '🎯',
      color: 'text-indigo-600 dark:text-indigo-400',
      items: [
        { label: 'P/E (Giá / Thu nhập)', value: financialRatios.valuation?.pe, unit: 'x', highlight: true },
        { label: 'P/B (Giá / Sổ sách)', value: financialRatios.valuation?.pb, unit: 'x', highlight: true },
        { label: 'P/S (Giá / Doanh thu)', value: financialRatios.valuation?.ps, unit: 'x' },
        { label: 'P/CF (Giá / Dòng tiền CFO)', value: financialRatios.valuation?.pCf, unit: 'x', color: 'text-indigo-600 dark:text-indigo-400' },
        { label: 'EV / EBITDA', value: financialRatios.valuation?.evEbitda, unit: 'x', color: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Tỷ suất cổ tức (Dividend Yield)', value: financialRatios.valuation?.dividendYield, unit: '%', color: 'text-indigo-600 dark:text-indigo-400' },
      ],
    },
    {
      id: 'profitability',
      title: '2. Khả Năng Sinh Lời (Profitability)',
      icon: '📈',
      color: 'text-emerald-600 dark:text-emerald-400',
      items: [
        { label: 'ROE (Lợi nhuận / Vốn CSH)', value: financialRatios.profitability?.roe, unit: '%', color: 'text-emerald-600 dark:text-emerald-400', highlight: true },
        { label: 'ROA (Lợi nhuận / Tổng TS)', value: financialRatios.profitability?.roa, unit: '%' },
        { label: 'ROIC (Lợi nhuận / Vốn đầu tư)', value: financialRatios.profitability?.roic, unit: '%', color: 'text-indigo-600 dark:text-indigo-400' },
        { label: 'Biên lợi nhuận gộp (Gross Margin)', value: financialRatios.profitability?.grossMargin, unit: '%' },
        { label: 'Biên lợi nhuận ròng (Net Margin)', value: financialRatios.profitability?.netMargin, unit: '%', highlight: true },
        { label: 'EBITDA 4 Quý', value: formatBn(financialRatios.profitability?.ebitda), unit: '', color: 'text-emerald-700 dark:text-emerald-300' },
      ],
    },
    {
      id: 'liquidity',
      title: '3. Khả Năng Thanh Khoản (Liquidity)',
      icon: '💧',
      color: 'text-blue-600 dark:text-blue-400',
      items: [
        { label: 'Thanh toán hiện hành (Current Ratio)', value: financialRatios.liquidity?.currentRatio, unit: 'x' },
        { label: 'Thanh toán nhanh (Quick Ratio)', value: financialRatios.liquidity?.quickRatio, unit: 'x' },
        { label: 'Thanh toán tiền mặt (Cash Ratio)', value: financialRatios.liquidity?.cashRatio, unit: 'x' },
        { label: 'Nợ ngắn hạn / Tổng nợ', value: financialRatios.liquidity?.shortTermDebtToTotalDebt, unit: '%' },
      ],
    },
    {
      id: 'efficiency',
      title: '4. Hiệu Quả Hoạt Động (Efficiency)',
      icon: '⚙️',
      color: 'text-amber-600 dark:text-amber-400',
      items: [
        { label: 'Vòng quay khoản phải thu', value: financialRatios.efficiency?.receivablesTurnover, unit: 'x' },
        { label: 'Vòng quay hàng tồn kho', value: financialRatios.efficiency?.inventoryTurnover, unit: 'x' },
        { label: 'Vòng quay tài sản (Asset Turnover)', value: financialRatios.efficiency?.assetTurnover, unit: 'x' },
        { label: 'Vòng quay vốn CSH (Equity Turnover)', value: financialRatios.efficiency?.equityTurnover, unit: 'x' },
        { label: 'Chu kỳ chuyển đổi tiền mặt (CCC)', value: financialRatios.efficiency?.ccc, unit: ' ngày', color: 'text-indigo-600 dark:text-indigo-400' },
      ],
    },
    {
      id: 'leverage',
      title: '5. Đòn Bẩy Tài Chính & Cơ Cấu Nợ (Leverage)',
      icon: '⚖️',
      color: 'text-rose-600 dark:text-rose-400',
      items: [
        { label: 'Tổng nợ / Vốn CSH (Debt / Equity)', value: financialRatios.leverage?.debtToEquity, unit: 'x', color: 'text-rose-600 dark:text-rose-400', highlight: true },
        { label: 'Vay nợ / Vốn CSH (Borrowings/Equity)', value: financialRatios.leverage?.borrowingsToEquity, unit: 'x' },
        { label: 'Đòn bẩy tài chính (Equity Multiplier)', value: financialRatios.leverage?.financialLeverage, unit: 'x' },
        { label: 'Nợ vay ròng (Net Debt)', value: formatBn(financialRatios.leverage?.netDebt), unit: '' },
      ],
    },
  ];

  // Lọc theo từ khóa tìm kiếm
  const filteredGroups = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return groups;

    return groups
      .map((g) => {
        const matchingItems = g.items.filter((item) =>
          item.label.toLowerCase().includes(term) || g.title.toLowerCase().includes(term)
        );
        return {
          ...g,
          items: matchingItems,
        };
      })
      .filter((g) => g.items.length > 0);
  }, [searchTerm, financialRatios]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Bộ 54 Chỉ Số Tài Chính Toàn Diện
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-0.5 flex items-center gap-2">
            <span>📊</span> Phân Tích Đa Chiều Sức Khỏe & Hiệu Quả Hoạt Động Doanh Nghiệp
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Dữ liệu trượt 4 quý gần nhất (TTM) kết hợp chuẩn hóa BCTC kiểm toán
          </p>
        </div>

        {/* Ô Tìm kiếm tức thì */}
        <div className="relative w-full sm:w-64 shrink-0">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm chỉ số (ROE, P/E, Nợ, Vòng quay...)"
            className="w-full pl-8 pr-7 py-2 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400"
          />
          <span className="absolute left-2.5 top-2.5 text-xs text-gray-400">🔍</span>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="p-8 text-center bg-gray-50/60 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-xs text-gray-500">
          Không tìm thấy chỉ số tài chính phù hợp với từ khóa "{searchTerm}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGroups.map((g) => (
            <div
              key={g.id}
              className="p-4 sm:p-5 bg-gray-50/80 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3"
            >
              <div className={`text-xs font-bold uppercase tracking-wider ${g.color} flex items-center gap-1.5`}>
                <span>{g.icon}</span> {g.title}
              </div>
              <div className="space-y-2 text-xs">
                {g.items.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex justify-between py-1 ${
                      idx < g.items.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''
                    }`}
                  >
                    <span className="text-gray-500 dark:text-gray-400">{item.label}</span>
                    <span
                      className={`font-mono ${
                        item.highlight ? 'font-black' : 'font-bold'
                      } ${item.color || 'text-gray-900 dark:text-white'}`}
                    >
                      {item.value != null ? `${item.value}${item.unit || ''}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
