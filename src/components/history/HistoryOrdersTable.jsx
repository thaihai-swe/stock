import { Fragment } from 'react';
import { fmtDate, fmtMoney, getDisciplineTagInfo, getStockColor, plBg, plColor, getMatchMethodInfo } from '../../utils/format.js';
import DisciplineBadge from '../common/DisciplineBadge.jsx';
import EmptyState from '../common/EmptyState.jsx';

export default function HistoryOrdersTable({
  sortedOrders = [],
  allTxCount = 0,
  sortField = 'date',
  sortDirection = 'desc',
  handleSort,
  renderSortIcon,
  mobileViewMode = 'card',
  onSelectSymbol,
  onOpenLotInspector,
  handleDelete,
  deletingId,
  setTagFilter,
  handleResetFilters,
  hasFilterActive = false,
}) {
  if (sortedOrders.length === 0) {
    return (
      <EmptyState
        icon="🔍"
        title="Không tìm thấy giao dịch nào phù hợp"
        description="Thử thay đổi từ khóa tìm kiếm, bỏ bớt bộ lọc mã cổ phiếu hoặc mở rộng khoảng ngày giao dịch."
        actionLabel={hasFilterActive ? '✕ Xóa Tất Cả Bộ Lọc' : undefined}
        onAction={handleResetFilters}
      />
    );
  }

  // Thống kê nhanh footer
  const displayedBuys = sortedOrders.filter(t => t.type === 'BUY');
  const displayedSells = sortedOrders.filter(t => t.type === 'SELL');
  const totalDisplayedBuyCost = displayedBuys.reduce((s, o) => s + (o.totalCost || o.quantity * o.price), 0);
  const totalDisplayedSellRevenue = displayedSells.reduce((s, o) => s + (o.netRevenue ?? o.totalRevenue ?? (o.quantity * o.price)), 0);
  const totalDisplayedRealizedPL = displayedSells.reduce((s, o) => s + (o.profitLoss || 0), 0);

  return (
    <div className="card-base rounded-3xl overflow-hidden">
      {/* 1. CHẾ ĐỘ XEM THẺ (MOBILE CARD VIEW) */}
      <div className={`p-4 space-y-3 ${mobileViewMode === 'card' ? 'block sm:hidden' : 'hidden'}`}>
        {sortedOrders.map((tx) => {
          const isBuy = tx.type === 'BUY';
          const netSellRevenue = !isBuy ? (tx.netRevenue ?? tx.totalRevenue ?? (tx.grossRevenue ? tx.grossRevenue - (tx.fee || 0) : tx.quantity * tx.price)) : 0;
          const netSellPrice = !isBuy ? (tx.netPrice || (tx.quantity > 0 ? (netSellRevenue / tx.quantity) : tx.price)) : tx.price;
          const total = isBuy
            ? (tx.totalCost || (tx.quantity * tx.price))
            : netSellRevenue;
          const avgCost = !isBuy && tx.totalCost && tx.quantity > 0 ? (tx.totalCost / tx.quantity) : 0;
          const diffPerShare = !isBuy && avgCost > 0 ? (netSellPrice - avgCost) : 0;
          const stockColor = getStockColor(tx.symbol);

          return (
            <div
              key={tx.id}
              className="bg-gray-50/70 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700/60 rounded-2xl p-4 transition-all shadow-xs space-y-3"
            >
              {/* Header Thẻ: Loại Lệnh + Mã CP + Ngày & Lãi/Lỗ */}
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-200/60 dark:border-slate-700/60 gap-2">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black shrink-0 ${
                      isBuy
                        ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60'
                        : 'bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60'
                    }`}
                  >
                    {isBuy ? '🛒 MUA' : '💸 BÁN'}
                  </span>

                  <button
                    type="button"
                    onClick={() => onSelectSymbol && onSelectSymbol(tx.symbol)}
                    className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-black border shadow-2xs cursor-pointer shrink-0"
                    style={{
                      backgroundColor: `${stockColor}15`,
                      borderColor: `${stockColor}40`,
                      color: stockColor,
                    }}
                    title={`Xem sổ cái tích luỹ ${tx.symbol}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0" style={{ backgroundColor: stockColor }} />
                    {tx.symbol}
                  </button>

                  <span className="text-[11px] text-gray-400 dark:text-slate-500 font-medium shrink-0">
                    {fmtDate(tx.date)}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  {!isBuy ? (
                    <div>
                      <div className={`text-sm font-black ${plColor(tx.profitLoss)}`}>
                        {tx.profitLoss >= 0 ? '+' : ''}{fmtMoney(tx.profitLoss)}đ
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full inline-block ${plBg(tx.profitLoss)}`}>
                        {tx.profitLossPct >= 0 ? '▲ +' : '▼ '}{tx.profitLossPct}%
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-extrabold text-gray-900 dark:text-slate-100">
                        {fmtMoney(total)}đ
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">Vốn bỏ ra</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lưới 2x2 Thông Số Khớp Lệnh */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                <div>
                  <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Khối lượng</span>
                  <span className="font-bold text-gray-800 dark:text-slate-200 text-sm mt-0.5 block">
                    {tx.quantity.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">cp</span>
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                    {isBuy ? 'Giá mua khớp' : 'Giá bán thực nhận'}
                  </span>
                  <span className="font-bold text-gray-800 dark:text-slate-200 text-sm mt-0.5 block">
                    {fmtMoney(isBuy ? tx.price : netSellPrice)}đ
                  </span>
                  {!isBuy && Math.round(tx.price) !== Math.round(netSellPrice) && (
                    <span className="text-[10px] text-gray-400 dark:text-slate-500 block">
                      Khớp: {fmtMoney(tx.price)}đ
                    </span>
                  )}
                </div>

                {isBuy ? (
                  <>
                    <div>
                      <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Giá vốn/CP (sau phí)</span>
                      <span className="font-bold text-gray-700 dark:text-slate-300 text-xs mt-0.5 block">
                        {fmtMoney(tx.costPerShare || tx.price)}đ
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Phí giao dịch</span>
                      <span className="font-medium text-gray-600 dark:text-slate-400 text-xs mt-0.5 block">
                        {tx.feePct !== undefined ? `${tx.feePct}%` : '0%'} {tx.fee ? `(${fmtMoney(tx.fee)}đ)` : ''}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Giá vốn TB gốc</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400 text-xs mt-0.5 block">
                        {fmtMoney(avgCost)}đ
                        {diffPerShare !== 0 && (
                          <span className={`ml-1 text-[10px] ${diffPerShare > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                            ({diffPerShare > 0 ? '+' : ''}{fmtMoney(diffPerShare)}đ)
                          </span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Thu thực nhận</span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-400 text-xs mt-0.5 block">
                        {fmtMoney(total)}đ
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Ghi Chú & Thẻ Kỷ Luật */}
              {(tx.note || (tx.tags && tx.tags.length > 0)) && (
                <div className="space-y-1.5 pt-0.5">
                  {tx.note && (
                    <div className="text-xs text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-900/60 px-2.5 py-1.5 rounded-xl border border-gray-100 dark:border-slate-800 flex items-start gap-1.5">
                      <span className="text-[11px]">📝</span>
                      <span className="italic">{tx.note}</span>
                    </div>
                  )}
                  {tx.tags && tx.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tx.tags.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTagFilter && setTagFilter(t)}
                          className="cursor-pointer transition-opacity hover:opacity-80"
                        >
                          <DisciplineBadge tag={t} size="xs" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Hàng Thao Tác: Xem Lô Khớp & Xóa Lệnh */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-slate-700/60 text-xs">
                <div>
                  {!isBuy && tx.matchedLots && tx.matchedLots.length > 0 && (() => {
                    const methodInfo = getMatchMethodInfo(tx.matchMethod, tx.matchedLots);
                    return (
                      <button
                        type="button"
                        onClick={() => onOpenLotInspector && onOpenLotInspector(tx)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors border flex items-center gap-1.5 cursor-pointer active:scale-95 ${methodInfo.buttonBg}`}
                        title={`Chiến lược khớp: ${methodInfo.label}`}
                      >
                        <span>{methodInfo.icon}</span>
                        <span>Giải Phẫu {tx.matchedLots.length} {methodInfo.shortLabel}</span>
                      </button>
                    );
                  })()}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete && handleDelete(tx)}
                  disabled={deletingId === tx.id}
                  className="px-2.5 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 ml-auto active:scale-95 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40"
                >
                  <span>🗑️</span>
                  <span>{deletingId === tx.id ? 'Đang xóa...' : 'Xóa'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. CHẾ ĐỘ XEM BẢNG (DESKTOP TABLE VIEW) */}
      <div className={`overflow-x-auto ${mobileViewMode === 'card' ? 'hidden sm:block' : 'block'}`}>
        {mobileViewMode === 'table' && (
          <p className="sm:hidden text-[11px] text-indigo-700 dark:text-indigo-300 px-4 py-2 bg-indigo-50/60 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center gap-1 font-semibold">
            <span>👉</span> Vuốt ngang để xem toàn bộ thông số lệnh giao dịch
          </p>
        )}

        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50/90 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100 dark:border-slate-800 select-none">
            <tr>
              {/* Mã CP - Sticky Left */}
              <th
                onClick={() => handleSort('symbol')}
                className="px-5 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group sticky left-0 bg-slate-50 dark:bg-slate-950 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]"
              >
                <div className="inline-flex items-center">
                  <span className={sortField === 'symbol' ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''}>Mã CP</span>
                  {renderSortIcon('symbol')}
                </div>
              </th>

              {/* Loại */}
              <th
                onClick={() => handleSort('type')}
                className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="inline-flex items-center">
                  <span className={sortField === 'type' ? 'text-indigo-600 dark:text-indigo-400 font-black' : ''}>Loại</span>
                  {renderSortIcon('type')}
                </div>
              </th>

              {/* Khối Lượng */}
              <th
                onClick={() => handleSort('quantity')}
                className="text-right px-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="inline-flex items-center justify-end w-full">
                  <span>SL {renderSortIcon('quantity')}</span>
                </div>
              </th>

              {/* Giá Khớp & Vốn Gốc TB */}
              <th
                onClick={() => handleSort('price')}
                className="text-right px-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="inline-flex items-center justify-end w-full">
                  <span>Giá Khớp / Giá Vốn {renderSortIcon('price')}</span>
                </div>
              </th>

              {/* Tổng Tiền & Vốn Gốc */}
              <th
                onClick={() => handleSort('total')}
                className="text-right px-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="inline-flex items-center justify-end w-full">
                  <span>Tổng Tiền / Vốn Gốc {renderSortIcon('total')}</span>
                </div>
              </th>

              {/* Lãi / Lỗ */}
              <th
                onClick={() => handleSort('profitLoss')}
                className="text-right px-5 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group bg-indigo-50/40 dark:bg-slate-800/40"
              >
                <div className="inline-flex items-center justify-end w-full font-black text-indigo-900 dark:text-indigo-300">
                  <span>🎯 Lãi / Lỗ {renderSortIcon('profitLoss')}</span>
                </div>
              </th>

              {/* Ngày Khớp */}
              <th
                onClick={() => handleSort('date')}
                className="px-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
              >
                <div className="inline-flex items-center">
                  <span>Ngày Khớp {renderSortIcon('date')}</span>
                </div>
              </th>

              {/* Ghi chú & Thẻ */}
              <th className="px-4 py-3.5 font-semibold text-slate-400 dark:text-slate-500">
                Ghi Chú & Thẻ
              </th>

              {/* Hành Động */}
              <th className="px-4 py-3.5 text-right font-normal text-slate-400 dark:text-slate-500">
                Thao Tác
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {sortedOrders.map((tx) => {
              const isBuy = tx.type === 'BUY';
              const netSellRevenue = !isBuy ? (tx.netRevenue ?? tx.totalRevenue ?? (tx.grossRevenue ? tx.grossRevenue - (tx.fee || 0) : tx.quantity * tx.price)) : 0;
              const netSellPrice = !isBuy ? (tx.netPrice || (tx.quantity > 0 ? (netSellRevenue / tx.quantity) : tx.price)) : tx.price;
              const total = isBuy
                ? (tx.totalCost || (tx.quantity * tx.price))
                : netSellRevenue;
              const avgCost = !isBuy && tx.totalCost && tx.quantity > 0 ? (tx.totalCost / tx.quantity) : 0;
              const diffPerShare = !isBuy && avgCost > 0 ? (netSellPrice - avgCost) : 0;
              const stockColor = getStockColor(tx.symbol);

              return (
                <tr
                  key={tx.id}
                  className="table-row-hover group"
                >
                  {/* Mã CP - Sticky Left */}
                  <td className="px-5 py-3.5 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                    <button
                      type="button"
                      onClick={() => onSelectSymbol && onSelectSymbol(tx.symbol)}
                      className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs border transition-transform group-hover:scale-105 cursor-pointer"
                      style={{
                        backgroundColor: `${stockColor}15`,
                        borderColor: `${stockColor}40`,
                        color: stockColor,
                      }}
                      title={`Xem sổ cái tích luỹ ${tx.symbol}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0" style={{ backgroundColor: stockColor }} />
                      {tx.symbol}
                    </button>
                  </td>

                  {/* Loại Lệnh */}
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isBuy
                          ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300'
                          : 'bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300'
                      }`}
                    >
                      {isBuy ? '🛒 MUA' : '💸 BÁN'}
                    </span>
                  </td>

                  {/* Số Lượng */}
                  <td className="px-4 py-3.5 text-right font-bold text-gray-800 dark:text-slate-200">
                    {tx.quantity.toLocaleString()}
                  </td>

                  {/* Giá Khớp & Giá Vốn TB Gốc */}
                  <td className="px-4 py-3.5 text-right">
                    {isBuy ? (
                      <span className="font-bold text-gray-800 dark:text-slate-200">
                        {fmtMoney(tx.price)}đ
                      </span>
                    ) : (
                      <div>
                        <div className="font-bold text-gray-900 dark:text-slate-100">
                          Bán: {fmtMoney(netSellPrice)}đ
                        </div>
                        {Math.round(tx.price) !== Math.round(netSellPrice) && (
                          <div className="text-[10px] text-gray-400 dark:text-slate-500">
                            Khớp: {fmtMoney(tx.price)}đ
                          </div>
                        )}
                        <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                          Vốn gốc: {fmtMoney(avgCost)}đ
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Tổng Tiền & Vốn Gốc */}
                  <td className="px-4 py-3.5 text-right">
                    {isBuy ? (
                      <div>
                        <span className="font-bold text-gray-900 dark:text-slate-100">
                          {fmtMoney(total)}đ
                        </span>
                        <div className="text-[10px] text-gray-400 dark:text-slate-500">
                          Phí: {tx.feePct !== undefined ? `${tx.feePct}%` : '0%'}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="font-bold text-indigo-700 dark:text-indigo-400">
                          Thu: {fmtMoney(total)}đ
                        </span>
                        <div className="text-[10px] text-gray-400 dark:text-slate-500">
                          Vốn gốc: {fmtMoney(tx.totalCost)}đ
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Lãi / Lỗ */}
                  <td className="px-5 py-3.5 text-right bg-indigo-50/20 dark:bg-slate-800/20">
                    {!isBuy ? (
                      <div>
                        <span className={`font-black text-xs ${plColor(tx.profitLoss)}`}>
                          {tx.profitLoss >= 0 ? '+' : ''}{fmtMoney(tx.profitLoss)}đ
                        </span>
                        <br />
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full inline-block mt-0.5 ${plBg(tx.profitLoss)}`}>
                          {tx.profitLossPct >= 0 ? '▲ +' : '▼ '}{tx.profitLossPct}%
                        </span>
                        {diffPerShare !== 0 && (
                          <div className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                            {diffPerShare >= 0 ? '+' : ''}{fmtMoney(diffPerShare)}đ/cp
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300 dark:text-slate-600">—</span>
                    )}
                  </td>

                  {/* Ngày Khớp */}
                  <td className="px-4 py-3.5 text-gray-500 dark:text-slate-400 whitespace-nowrap">
                    {fmtDate(tx.date)}
                  </td>

                  {/* Ghi Chú & Thẻ */}
                  <td className="px-4 py-3.5 max-w-[180px]">
                    {tx.note && (
                      <div className="text-gray-700 dark:text-slate-300 text-xs truncate italic">
                        {tx.note}
                      </div>
                    )}
                    {tx.tags && tx.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tx.tags.map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTagFilter && setTagFilter(t)}
                            className="cursor-pointer transition-opacity hover:opacity-80"
                          >
                            <DisciplineBadge tag={t} size="xs" />
                          </button>
                        ))}
                      </div>
                    )}
                    {!tx.note && (!tx.tags || tx.tags.length === 0) && (
                      <span className="text-gray-300 dark:text-slate-600">—</span>
                    )}
                  </td>

                  {/* Thao Tác: Lô Gốc & Xóa */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {!isBuy && tx.matchedLots && tx.matchedLots.length > 0 && (() => {
                        const methodInfo = getMatchMethodInfo(tx.matchMethod, tx.matchedLots);
                        return (
                          <button
                            type="button"
                            onClick={() => onOpenLotInspector && onOpenLotInspector(tx)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors border flex items-center gap-1 cursor-pointer active:scale-95 ${methodInfo.buttonBg}`}
                            title={`Xem chi tiết các lô mua gốc (${methodInfo.label})`}
                          >
                            <span>{methodInfo.icon}</span>
                            <span className="hidden sm:inline">{methodInfo.shortLabel}</span>
                          </button>
                        );
                      })()}

                      <button
                        type="button"
                        onClick={() => handleDelete && handleDelete(tx)}
                        disabled={deletingId === tx.id}
                        className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-500 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 active:scale-95"
                        title="Xóa lệnh giao dịch này"
                      >
                        {deletingId === tx.id ? '...' : '🗑️'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. FOOTER TỔNG KẾT BẢNG */}
      <div className="px-5 sm:px-6 py-3.5 bg-gray-50/90 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap text-gray-500 dark:text-slate-400">
          <span>
            Đang hiển thị <b>{sortedOrders.length}</b> / {allTxCount} giao dịch
          </span>
          <span>•</span>
          <span>Vốn mua: <b className="text-gray-800 dark:text-slate-200">{fmtMoney(totalDisplayedBuyCost)}đ</b></span>
          <span>•</span>
          <span>Thu về: <b className="text-emerald-600 dark:text-emerald-400">{fmtMoney(totalDisplayedSellRevenue)}đ</b></span>
        </div>

        {displayedSells.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-slate-400">Tổng Lãi/Lỗ đã chốt:</span>
            <span className={`font-black text-sm ${plColor(totalDisplayedRealizedPL)}`}>
              {totalDisplayedRealizedPL >= 0 ? '+' : ''}{fmtMoney(totalDisplayedRealizedPL)}đ
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
