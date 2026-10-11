import React from 'react';

function formatBn(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number(val).toLocaleString('vi-VN') + ' tỷ';
}

function formatPercent(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
}

export default function FinancialStatementsView({
  financials,
  financialPeriod,
  setFinancialPeriod,
  financialTab,
  setFinancialTab,
  handleSyncSingleFinancials,
  syncingSingle,
  selectedSymbol,
}) {
  if (!financials) return null;

  const lastQ = financials.quarterly?.[financials.quarterly.length - 1] || {};
  const fcfVal = financials.cashflowHealth?.latestFcf ?? lastQ.freeCashFlow;
  const cfoRatio = financials.cashflowHealth?.cfoVsNetIncomeRatio ?? lastQ.cfoToNetIncome;
  let cfoQuality = financials.cashflowHealth?.qualityAssessment;
  if (!cfoQuality && cfoRatio != null) {
    cfoQuality =
      cfoRatio >= 1.0
        ? 'Chất lượng tiền mặt xuất sắc (CFO > LNST)'
        : cfoRatio >= 0.7
        ? 'Tốt (Dòng tiền kinh doanh dương)'
        : 'Cần theo dõi (Dòng tiền yếu)';
  }
  if (!cfoQuality) cfoQuality = 'Đang phân tích dòng tiền';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-6">
      {/* ── HEADER BÁO CÁO TÀI CHÍNH ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
        <div>
          <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Báo Cáo Tài Chính Chuẩn VAS TT200
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-0.5 flex items-center gap-2">
            <span>📊</span> Ba Báo Cáo Tài Chính Cốt Lõi — {financials._meta?.companyName || selectedSymbol} ({selectedSymbol})
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {financials._meta?.unit} · Nguồn: {financials._meta?.source}
          </p>
        </div>

        {/* Nút thao tác BCTC & chuyển đổi Quý / Năm / TTM */}
        <div className="flex flex-wrap items-center gap-2">
          {handleSyncSingleFinancials && (
            <button
              type="button"
              onClick={handleSyncSingleFinancials}
              disabled={syncingSingle}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer disabled:opacity-50"
              title={`Kích hoạt tải lại BCTC cho ${selectedSymbol}`}
            >
              <span className={syncingSingle ? 'inline-block animate-spin' : ''}>🔄</span>
              <span>{syncingSingle ? `Đang nạp...` : `Tải lại BCTC`}</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setFinancialPeriod('quarterly')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                financialPeriod === 'quarterly'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
              }`}
            >
              {financials.quarterly?.length ? `${financials.quarterly.length} Quý` : 'Quý'}
            </button>
            <button
              type="button"
              onClick={() => setFinancialPeriod('yearly')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                financialPeriod === 'yearly'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
              }`}
            >
              {financials.yearly?.length ? `${financials.yearly.length} Năm` : 'Năm'}
            </button>
            {financials?.ttmSeries?.length > 0 && (
              <button
                type="button"
                onClick={() => setFinancialPeriod('ttm')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  financialPeriod === 'ttm'
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
                }`}
              >
                TTM Trượt 4Q
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 THẺ TĂNG TRƯỞNG & DÒNG TIỀN ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-gray-50/80 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="text-[10px] text-gray-400 font-semibold uppercase">CAGR Doanh Thu 3Y</div>
          <div className="text-lg font-black text-gray-900 dark:text-white mt-1">
            {formatPercent(financials.cagr?.cagr3YRevenue)}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Tăng trưởng quy mô</div>
        </div>

        <div className="p-3.5 bg-gray-50/80 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="text-[10px] text-gray-400 font-semibold uppercase">CAGR LNST 3Y</div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatPercent(financials.cagr?.cagr3YNetIncome)}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">Tăng trưởng lợi nhuận</div>
        </div>

        <div className="p-3.5 bg-gray-50/80 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="text-[10px] text-gray-400 font-semibold uppercase">Dòng Tiền Tự Do (FCF)</div>
          <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {formatBn(fcfVal)}
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">FCF = CFO - CapEx</div>
        </div>

        <div className="p-3.5 bg-gray-50/80 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div className="text-[10px] text-gray-400 font-semibold uppercase">Chất Lượng CFO / LNST</div>
          <div className="text-lg font-black text-gray-900 dark:text-white mt-1">
            {cfoRatio != null ? `${cfoRatio}x` : '—'}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate mt-0.5" title={cfoQuality}>
            {cfoQuality}
          </div>
        </div>
      </div>

      {/* ── BẢNG DỮ LIỆU TÀI CHÍNH ── */}
      <div className="space-y-4">
        {/* Bộ chọn phân loại BCTC (chỉ hiển thị khi period !== 'ttm') */}
        {financialPeriod !== 'ttm' && (
          <div className="flex flex-wrap items-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => setFinancialTab('income')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                financialTab === 'income'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
              }`}
            >
              1. Kết Quả Kinh Doanh (Income Statement)
            </button>
            <button
              type="button"
              onClick={() => setFinancialTab('balance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                financialTab === 'balance'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
              }`}
            >
              2. Cân Đối Kế Toán (Balance Sheet)
            </button>
            <button
              type="button"
              onClick={() => setFinancialTab('cashflow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                financialTab === 'cashflow'
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
              }`}
            >
              3. Lưu Chuyển Tiền Tệ (Cash Flow & FCF)
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          {financialPeriod === 'ttm' ? (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-[11px] uppercase">
                  <th className="pb-3 pl-2">Kỳ TTM (12 Tháng Gần Nhất)</th>
                  <th className="pb-3 text-right">Doanh Thu Thuần</th>
                  <th className="pb-3 text-right">LNST Cổ Đông Mẹ</th>
                  <th className="pb-3 text-right">Biên Ròng (%)</th>
                  <th className="pb-3 text-right">Dòng Tiền HĐKD (CFO)</th>
                  <th className="pb-3 text-right">Dòng Tiền Tự Do (FCF)</th>
                  <th className="pb-3 text-right">Tăng Trưởng YoY (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {financials.ttmSeries?.map((t) => (
                  <tr key={t.endPeriod} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                    <td className="py-2.5 pl-2 font-bold text-gray-900 dark:text-white">{t.period}</td>
                    <td className="py-2.5 text-right font-semibold text-gray-800 dark:text-gray-200">{formatBn(t.revenue)}</td>
                    <td className="py-2.5 text-right font-bold text-indigo-600 dark:text-indigo-400">{formatBn(t.netIncome)}</td>
                    <td className="py-2.5 text-right font-medium text-gray-700 dark:text-gray-300">{t.netMargin}%</td>
                    <td className="py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">{formatBn(t.cfo)}</td>
                    <td className="py-2.5 text-right font-black text-indigo-700 dark:text-indigo-300">{formatBn(t.freeCashFlow)}</td>
                    <td className="py-2.5 text-right font-bold">
                      {t.revenueGrowthYoY != null ? (
                        <span className={t.revenueGrowthYoY >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {t.revenueGrowthYoY >= 0 ? '+' : ''}{t.revenueGrowthYoY}%
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : financialPeriod === 'quarterly' ? (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-[11px] uppercase">
                  <th className="pb-3 pl-2">Chỉ Tiêu Tài Chính</th>
                  {financials.quarterly?.map((q) => (
                    <th key={q.period} className="pb-3 text-right">{q.period}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {financialTab === 'income' && (
                  <>
                    <tr>
                      <td className="py-2.5 pl-2 font-bold text-gray-900 dark:text-white">Doanh thu thuần</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right font-semibold text-gray-800 dark:text-gray-200">
                          {formatBn(q.revenue)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pl-2 text-gray-500">Giá vốn hàng bán (COGS)</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right text-gray-500">
                          {formatBn(q.costOfGoodsSold)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pl-2 font-semibold text-gray-700 dark:text-gray-300">Lợi nhuận gộp</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right font-semibold text-gray-700 dark:text-gray-300">
                          {formatBn(q.grossProfit)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pl-2 text-amber-700 dark:text-amber-400">Chi phí tài chính (Lãi vay)</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right font-medium text-amber-700 dark:text-amber-400">
                          {formatBn(q.interestExpense)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-emerald-50/50 dark:bg-emerald-950/20">
                      <td className="py-2.5 pl-2 font-bold text-emerald-800 dark:text-emerald-300">LNST Cổ đông công ty mẹ</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right font-black text-emerald-700 dark:text-emerald-300">
                          {formatBn(q.netIncome)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pl-2 text-gray-500">Biên lợi nhuận ròng (Net Margin)</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right font-medium text-gray-700 dark:text-gray-300">
                          {q.netMargin ? `${q.netMargin}%` : '—'}
                        </td>
                      ))}
                    </tr>
                  </>
                )}

                {financialTab === 'balance' && (
                  <>
                    <tr>
                      <td className="py-2.5 pl-2 text-gray-800 dark:text-gray-200">Tiền & Tương đương tiền</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right text-gray-800 dark:text-gray-200">
                          {formatBn(q.cashAndCashEquivalents)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pl-2 text-gray-500">Các khoản phải thu ngắn hạn</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right text-gray-500">
                          {formatBn(q.shortTermReceivables)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pl-2 text-gray-500">Hàng tồn kho ròng</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right text-gray-500">
                          {formatBn(q.inventory)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pl-2 font-semibold text-gray-700 dark:text-gray-300">Tài sản ngắn hạn</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right font-semibold text-gray-700 dark:text-gray-300">
                          {formatBn(q.currentAssets)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-indigo-50/30 dark:bg-indigo-950/20">
                      <td className="py-2.5 pl-2 font-bold text-indigo-700 dark:text-indigo-300">Chi phí XDCB dở dang (Dự án mở rộng)</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right font-bold text-indigo-700 dark:text-indigo-300">
                          {formatBn(q.constructionInProgress)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-50/60 dark:bg-gray-700/30">
                      <td className="py-2.5 pl-2 font-black text-gray-900 dark:text-white">TỔNG TÀI SẢN</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right font-black text-gray-900 dark:text-white">
                          {formatBn(q.totalAssets)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pl-2 text-rose-600 dark:text-rose-400">Vay & nợ ngắn hạn</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right text-rose-600 dark:text-rose-400">
                          {formatBn(q.shortTermDebt)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pl-2 text-rose-600 dark:text-rose-400">Vay & nợ dài hạn</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right text-rose-600 dark:text-rose-400">
                          {formatBn(q.longTermDebt)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pl-2 text-rose-600 dark:text-rose-400 font-bold">Tổng nợ phải trả</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right text-rose-600 dark:text-rose-400 font-bold">
                          {formatBn(q.totalDebt)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-indigo-50/40 dark:bg-indigo-950/20">
                      <td className="py-2.5 pl-2 font-bold text-indigo-800 dark:text-indigo-300">VỐN CHỦ SỞ HỮU</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right font-black text-indigo-700 dark:text-indigo-300">
                          {formatBn(q.equity)}
                        </td>
                      ))}
                    </tr>
                  </>
                )}

                {financialTab === 'cashflow' && (
                  <>
                    <tr>
                      <td className="py-2.5 pl-2 text-gray-500">Khấu hao tài sản cố định</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right text-gray-500">
                          {formatBn(q.depreciation)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-emerald-50/40 dark:bg-emerald-950/20">
                      <td className="py-2.5 pl-2 font-bold text-emerald-800 dark:text-emerald-300">Dòng tiền HĐKD (CFO)</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right font-black text-emerald-700 dark:text-emerald-300">
                          {formatBn(q.cfo)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pl-2 text-rose-600 dark:text-rose-400">Chi mua sắm TSCĐ (CapEx)</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right text-rose-600 dark:text-rose-400 font-medium">
                          {formatBn(q.capex)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pl-2 text-gray-500">Lưu chuyển từ HĐ Đầu tư (CFI)</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right text-gray-500 font-medium">
                          {formatBn(q.cfi)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pl-2 text-amber-700 dark:text-amber-400">Cổ tức tiền mặt đã chi trả</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right text-amber-700 dark:text-amber-400 font-medium">
                          {q.dividendsPaid ? formatBn(q.dividendsPaid) : '—'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pl-2 text-gray-500">Lưu chuyển từ HĐ Tài chính (CFF)</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right text-gray-500 font-medium">
                          {formatBn(q.cff)}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-indigo-50/50 dark:bg-indigo-950/30">
                      <td className="py-2.5 pl-2 font-black text-indigo-800 dark:text-indigo-300">DÒNG TIỀN TỰ DO (FCF = CFO - CapEx)</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right font-black text-indigo-600 dark:text-indigo-400">
                          {formatBn(q.freeCashFlow)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 pl-2 text-gray-500">Tỷ lệ CFO / LNST</td>
                      {financials.quarterly?.map((q) => (
                        <td key={q.period} className="py-2.5 text-right text-gray-700 dark:text-gray-300 font-medium">
                          {q.cfoToNetIncome ? `${q.cfoToNetIncome}x` : '—'}
                        </td>
                      ))}
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          ) : (
            /* Bảng theo Năm */
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-[11px] uppercase">
                  <th className="pb-3 pl-2">Chỉ Tiêu Hàng Năm</th>
                  {financials.yearly?.map((y) => (
                    <th key={y.year} className="pb-3 text-right">Năm {y.year}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                <tr>
                  <td className="py-2.5 pl-2 font-bold text-gray-900 dark:text-white">Doanh thu thuần</td>
                  {financials.yearly?.map((y) => (
                    <td key={y.year} className="py-2.5 text-right font-semibold text-gray-800 dark:text-gray-200">
                      {formatBn(y.revenue)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pl-2 text-gray-500">Giá vốn hàng bán</td>
                  {financials.yearly?.map((y) => (
                    <td key={y.year} className="py-2.5 text-right text-gray-500">
                      {formatBn(y.costOfGoodsSold)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pl-2 font-semibold text-gray-700 dark:text-gray-300">Lợi nhuận gộp</td>
                  {financials.yearly?.map((y) => (
                    <td key={y.year} className="py-2.5 text-right font-semibold text-gray-700 dark:text-gray-300">
                      {formatBn(y.grossProfit)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pl-2 text-amber-700 dark:text-amber-400">Chi phí lãi vay</td>
                  {financials.yearly?.map((y) => (
                    <td key={y.year} className="py-2.5 text-right font-medium text-amber-700 dark:text-amber-400">
                      {formatBn(y.interestExpense)}
                    </td>
                  ))}
                </tr>
                <tr className="bg-emerald-50/40 dark:bg-emerald-950/20">
                  <td className="py-2.5 pl-2 font-bold text-emerald-800 dark:text-emerald-300">Lợi nhuận sau thuế (LNST)</td>
                  {financials.yearly?.map((y) => (
                    <td key={y.year} className="py-2.5 text-right font-black text-emerald-700 dark:text-emerald-300">
                      {formatBn(y.netIncome)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pl-2 text-gray-600 dark:text-gray-300">Chi phí XDCB dở dang</td>
                  {financials.yearly?.map((y) => (
                    <td key={y.year} className="py-2.5 text-right text-gray-600 dark:text-gray-300">
                      {formatBn(y.constructionInProgress)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pl-2 text-gray-600 dark:text-gray-300">Tổng tài sản</td>
                  {financials.yearly?.map((y) => (
                    <td key={y.year} className="py-2.5 text-right text-gray-600 dark:text-gray-300">
                      {formatBn(y.totalAssets)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pl-2 text-indigo-700 dark:text-indigo-300 font-bold">Vốn chủ sở hữu</td>
                  {financials.yearly?.map((y) => (
                    <td key={y.year} className="py-2.5 text-right font-bold text-indigo-700 dark:text-indigo-300">
                      {formatBn(y.equity)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pl-2 text-emerald-600 dark:text-emerald-400 font-semibold">Dòng tiền HĐKD (CFO)</td>
                  {financials.yearly?.map((y) => (
                    <td key={y.year} className="py-2.5 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatBn(y.cfo)}
                    </td>
                  ))}
                </tr>
                <tr className="bg-indigo-50/40 dark:bg-indigo-950/20">
                  <td className="py-2.5 pl-2 font-black text-indigo-800 dark:text-indigo-300">Dòng tiền tự do (FCF)</td>
                  {financials.yearly?.map((y) => (
                    <td key={y.year} className="py-2.5 text-right font-black text-indigo-600 dark:text-indigo-400">
                      {formatBn(y.freeCashFlow)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pl-2 text-gray-500">Tỷ suất ROE (%)</td>
                  {financials.yearly?.map((y) => (
                    <td key={y.year} className="py-2.5 text-right font-medium text-gray-700 dark:text-gray-300">
                      {y.roe ? `${y.roe}%` : '—'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
