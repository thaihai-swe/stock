import { fmtMoney, getAllocationTier, getStockColor, plBg, plColor } from '../../utils/format.js';
import { calculateSmartTrailingStop } from '../../utils/riskRewardAdvisor.js';

export default function DashboardHoldingsTable({
  portfolio = [],
  displayedPortfolio = [],
  pricesData = {},
  holdingCost = 0,
  symbolFilter = '',
  setSymbolFilter,
  statusFilter = 'all',
  setStatusFilter,
  filterCounts = { profit: 0, loss: 0 },
  sortField = 'totalCost',
  sortDirection = 'desc',
  handleSort,
  renderSortIcon,
  mobileViewMode = 'card',
  setMobileViewMode,
  displayedHoldingQty = 0,
  displayedHoldingCost = 0,
  displayedMarketValue = 0,
  displayedUnrealizedPL = 0,
  displayedUnrealizedPLPct = 0,
  onSelectSymbol,
  onNavigateBuy,
  onNavigateSell,
  onNavigateDca,
}) {
  return (
    <div className="card-base rounded-3xl overflow-hidden">
      {/* 1. HEADER: TIÊU ĐỀ & TOOLBAR ĐIỀU HƯỚNG */}
      <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/60 to-white dark:from-slate-900 dark:to-slate-900">
        <div className="flex items-center justify-between gap-2 flex-wrap w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <h2 className="font-extrabold text-slate-800 dark:text-slate-100 text-base sm:text-lg flex items-center gap-2">
              <span>📂</span> Sổ Cái Danh Mục Đang Nắm Giữ
            </h2>
            <span className="badge-indigo">
              {portfolio.length} mã
            </span>
          </div>

          {/* Toggle dạng Thẻ / Bảng trên mobile */}
          {portfolio.length > 0 && (
            <div className="sm:hidden flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setMobileViewMode('card')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${mobileViewMode === 'card'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                  }`}
              >
                📱 Thẻ
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode('table')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${mobileViewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                  }`}
              >
                📊 Bảng
              </button>
            </div>
          )}
        </div>

        {/* Ô Tìm Kiếm Nhanh & Nút Kế Hoạch DCA */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <input
              type="text"
              value={symbolFilter}
              onChange={e => setSymbolFilter(e.target.value.toUpperCase())}
              placeholder="🔍 Lọc mã CP..."
              className="input-base uppercase font-semibold"
            />
            {symbolFilter && (
              <button
                type="button"
                onClick={() => setSymbolFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {onNavigateDca && (
            <button
              type="button"
              onClick={onNavigateDca}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Mở bảng tính toán DCA tích sản"
            >
              <span>🧮</span>
              <span className="hidden sm:inline">DCA</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. THANH BỘ LỌC 1-CLICK TRẠNG THÁI P/L */}
      {portfolio.length > 0 && (
        <div className="px-5 sm:px-6 py-2.5 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-gray-500 dark:text-slate-400 uppercase text-[11px] mr-1">Bộ lọc:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${statusFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
            >
              Tất cả ({portfolio.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('profit')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${statusFilter === 'profit'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
            >
              <span>🟢</span> Đang Lãi ({filterCounts.profit})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('loss')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1 ${statusFilter === 'loss'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
            >
              <span>🔴</span> Đang Lỗ ({filterCounts.loss})
            </button>
          </div>

          <div className="text-[11px] text-gray-400 dark:text-slate-500">
            Hiển thị <b>{displayedPortfolio.length}</b> / {portfolio.length} mã
          </div>
        </div>
      )}

      {/* 3. NỘI DUNG DANH MỤC */}
      {portfolio.length === 0 ? (
        <div className="py-16 text-center text-gray-400 dark:text-slate-500">
          <p className="text-4xl mb-2">📭</p>
          <p className="font-bold text-gray-700 dark:text-slate-300 text-base">Danh mục hiện đang trống</p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Chuyển sang tab "Nhật Ký" để bắt đầu tích lũy cổ phiếu</p>
        </div>
      ) : displayedPortfolio.length === 0 ? (
        <div className="py-12 text-center text-gray-400 dark:text-slate-500">
          <p className="text-3xl mb-1">🔍</p>
          <p className="font-semibold text-gray-700 dark:text-slate-300 text-sm">Không tìm thấy cổ phiếu phù hợp</p>
          <p className="text-xs text-gray-400 mt-1">Thử thay đổi từ khóa hoặc bộ lọc trạng thái</p>
        </div>
      ) : (
        <>
          {/* CHẾ ĐỘ XEM THẺ (MOBILE CARD VIEW) */}
          <div className={`p-4 space-y-3 ${mobileViewMode === 'card' ? 'block sm:hidden' : 'hidden'}`}>
            {displayedPortfolio.map((p) => {
              const allocationPct = holdingCost > 0 ? ((p.totalCost / holdingCost) * 100).toFixed(1) : 0;
              const quote = pricesData?.prices?.[p.symbol];
              const marketPrice = quote?.price || null;
              const marketVal = marketPrice ? p.totalQty * marketPrice : p.totalCost;
              const changePct = quote?.changePct || 0;
              const unrealizedPL = marketPrice ? (marketVal - p.totalCost) : null;
              const unrealizedPLPct = (unrealizedPL !== null && p.totalCost > 0)
                ? parseFloat(((unrealizedPL / p.totalCost) * 100).toFixed(2))
                : 0;
              const stockColor = getStockColor(p.symbol, portfolio);
              const allocTier = getAllocationTier(allocationPct);
              const trailingInfo = marketPrice
                ? calculateSmartTrailingStop({ avgCost: p.avgCost, marketPrice, breakEvenPrice: p.breakEvenPrice })
                : null;

              return (
                <div
                  key={p.symbol}
                  onClick={() => onSelectSymbol && onSelectSymbol(p.symbol)}
                  className="bg-gray-50/80 dark:bg-slate-800/60 hover:bg-gray-100/80 dark:hover:bg-slate-800 border border-gray-200/80 dark:border-slate-700/60 rounded-2xl p-4 transition-all shadow-xs cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-gray-200/60 dark:border-slate-700/60 gap-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs border shrink-0"
                        style={{
                          backgroundColor: `${stockColor}15`,
                          borderColor: `${stockColor}40`,
                          color: stockColor,
                        }}
                      >
                        <span className="w-2 h-2 rounded-full mr-1.5 shrink-0" style={{ backgroundColor: stockColor }} />
                        {p.symbol}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${allocTier.bg} ${allocTier.text} ${allocTier.border}`}>
                        {allocTier.label} ({allocationPct}%)
                      </span>
                    </div>

                    {marketPrice ? (
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-sm text-gray-900 dark:text-slate-100">
                          {fmtMoney(marketPrice)}đ
                        </span>
                        <span className={`text-[10px] font-bold ml-1.5 px-1.5 py-0.2 rounded inline-block ${changePct > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                            changePct < 0 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                          {changePct > 0 ? '+' : ''}{changePct}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 shrink-0">Đang cập nhật...</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                    <div>
                      <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Khối lượng</span>
                      <span className="font-bold text-gray-800 dark:text-slate-200 text-sm mt-0.5 block">
                        {p.totalQty.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">cp</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Giá vốn TB</span>
                      <span className="font-bold text-gray-800 dark:text-slate-200 text-sm mt-0.5 block">
                        {fmtMoney(p.avgCost)}đ
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Giá trị vốn</span>
                      <span className="font-bold text-gray-700 dark:text-slate-300 mt-0.5 block">
                        {fmtMoney(p.totalCost)}đ
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Giá trị thị trường</span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-400 mt-0.5 block">
                        {fmtMoney(marketVal)}đ
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-gray-400 font-semibold">Lãi / Lỗ tạm tính:</span>
                    {marketPrice ? (
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className={`text-base font-black ${plColor(unrealizedPL)}`}>
                            {unrealizedPL >= 0 ? '+' : ''}{fmtMoney(unrealizedPL)}đ
                          </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${plBg(unrealizedPL)}`}>
                            {unrealizedPL >= 0 ? '▲ +' : '▼ '}{unrealizedPLPct}%
                          </span>
                        </div>
                        {trailingInfo && (
                          <div className="mt-1 flex items-center justify-end gap-1 text-[10px]" title={trailingInfo.tierRationale}>
                            <span className="text-slate-400">Stop:</span>
                            <span className={`font-mono font-bold px-1.5 py-0.2 rounded border ${trailingInfo.badgeBg}`}>
                              🛡️ {fmtMoney(trailingInfo.trailingStopPrice)}đ
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* CHẾ ĐỘ XEM BẢNG (DESKTOP MẶC ĐỊNH / MOBILE TABLE MODE) */}
          <div className={`overflow-x-auto ${mobileViewMode === 'card' ? 'hidden sm:block' : 'block'}`}>
            {mobileViewMode === 'table' && (
              <p className="sm:hidden text-[11px] text-indigo-700 dark:text-indigo-300 px-4 py-2 bg-indigo-50/60 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center gap-1 font-semibold">
                <span>👉</span> Vuốt ngang để xem toàn bộ thông số danh mục
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

                  <th onClick={() => handleSort('totalQty')} className="text-right px-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                    <span className="inline-flex items-center justify-end w-full">SL {renderSortIcon('totalQty')}</span>
                  </th>

                  <th onClick={() => handleSort('allocation')} className="text-right px-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                    <span className="inline-flex items-center justify-end w-full">Tỷ trọng {renderSortIcon('allocation')}</span>
                  </th>

                  <th onClick={() => handleSort('avgCost')} className="text-right px-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                    <span className="inline-flex items-center justify-end w-full">Giá vốn TB {renderSortIcon('avgCost')}</span>
                  </th>

                  <th onClick={() => handleSort('totalCost')} className="text-right px-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                    <span className="inline-flex items-center justify-end w-full">Giá trị vốn {renderSortIcon('totalCost')}</span>
                  </th>

                  <th onClick={() => handleSort('marketPrice')} className="text-right px-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                    <span className="inline-flex items-center justify-end w-full">Thị giá Live {renderSortIcon('marketPrice')}</span>
                  </th>

                  <th onClick={() => handleSort('marketVal')} className="text-right px-4 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                    <span className="inline-flex items-center justify-end w-full">Giá trị TT {renderSortIcon('marketVal')}</span>
                  </th>

                  <th onClick={() => handleSort('profitLoss')} className="text-right px-5 py-3.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group bg-indigo-50/40 dark:bg-slate-800/40">
                    <span className="inline-flex items-center justify-end w-full font-black text-indigo-900 dark:text-indigo-300">
                      🎯 Lãi / Lỗ {renderSortIcon('profitLoss')}
                    </span>
                  </th>

                  <th className="text-center px-4 py-3.5 text-slate-400 dark:text-slate-500 font-normal">
                    Thao tác
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedPortfolio.map((p) => {
                  const allocationPct = holdingCost > 0 ? ((p.totalCost / holdingCost) * 100).toFixed(1) : 0;
                  const quote = pricesData?.prices?.[p.symbol];
                  const marketPrice = quote?.price || null;
                  const marketVal = marketPrice ? p.totalQty * marketPrice : p.totalCost;
                  const changePct = quote?.changePct || 0;
                  const unrealizedPL = marketPrice ? (marketVal - p.totalCost) : null;
                  const unrealizedPLPct = (unrealizedPL !== null && p.totalCost > 0)
                    ? parseFloat(((unrealizedPL / p.totalCost) * 100).toFixed(2))
                    : 0;
                  const stockColor = getStockColor(p.symbol, portfolio);
                  const allocTier = getAllocationTier(allocationPct);
                  const trailingInfo = marketPrice
                    ? calculateSmartTrailingStop({ avgCost: p.avgCost, marketPrice, breakEvenPrice: p.breakEvenPrice })
                    : null;

                  return (
                    <tr
                      key={p.symbol}
                      className="table-row-hover group"
                    >
                      {/* Mã CP - Sticky Column */}
                      <td className="px-5 py-4 sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.08)]">
                        <button
                          type="button"
                          onClick={() => onSelectSymbol && onSelectSymbol(p.symbol)}
                          className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs border transition-transform group-hover:scale-105 cursor-pointer"
                          style={{
                            backgroundColor: `${stockColor}15`,
                            borderColor: `${stockColor}40`,
                            color: stockColor,
                          }}
                          title={`Xem sổ cái tích luỹ ${p.symbol}`}
                        >
                          <span className="w-2 h-2 rounded-full mr-1.5 shrink-0" style={{ backgroundColor: stockColor }} />
                          {p.symbol}
                        </button>
                      </td>

                      {/* Số lượng */}
                      <td className="px-4 py-4 text-right font-bold text-gray-800 dark:text-slate-200">
                        {p.totalQty.toLocaleString()}
                      </td>

                      {/* Tỷ trọng */}
                      <td className="px-4 py-4 text-right">
                        <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-bold border ${allocTier.bg} ${allocTier.text} ${allocTier.border}`}>
                          {allocationPct}%
                        </span>
                      </td>

                      {/* Giá vốn TB */}
                      <td className="px-4 py-4 text-right font-semibold text-gray-800 dark:text-slate-200">
                        {fmtMoney(p.avgCost)}đ
                      </td>

                      {/* Giá trị vốn */}
                      <td className="px-4 py-4 text-right font-bold text-gray-900 dark:text-slate-100">
                        {fmtMoney(p.totalCost)}đ
                      </td>

                      {/* Thị giá Live */}
                      <td className="px-4 py-4 text-right">
                        {marketPrice ? (
                          <div>
                            <span className="font-extrabold text-gray-900 dark:text-slate-100">
                              {fmtMoney(marketPrice)}đ
                            </span>
                            <span className={`text-[10px] font-bold ml-1.5 px-1 py-0.2 rounded ${changePct > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                                changePct < 0 ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-gray-100 text-gray-600'
                              }`}>
                              {changePct > 0 ? '+' : ''}{changePct}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Giá trị TT */}
                      <td className="px-4 py-4 text-right font-extrabold text-indigo-700 dark:text-indigo-400">
                        {fmtMoney(marketVal)}đ
                      </td>

                      {/* Lãi / Lỗ tạm tính */}
                      <td className="px-5 py-4 text-right bg-indigo-50/20 dark:bg-slate-800/20">
                        {marketPrice ? (
                          <div>
                            <div className={`font-black text-xs ${plColor(unrealizedPL)}`}>
                              {unrealizedPL >= 0 ? '+' : ''}{fmtMoney(unrealizedPL)}đ
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full inline-block mt-0.5 ${plBg(unrealizedPL)}`}>
                              {unrealizedPL >= 0 ? '▲ +' : '▼ '}{unrealizedPLPct}%
                            </span>
                            {trailingInfo && (
                              <div className="mt-1" title={trailingInfo.tierRationale}>
                                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded border ${trailingInfo.badgeBg}`}>
                                  <span>🛡️</span>
                                  <span>{fmtMoney(trailingInfo.trailingStopPrice)}đ</span>
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="px-3 sm:px-4 py-3 sm:py-4 text-center">
                        <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const buyPrice = (marketPrice || p.avgCost) ? String((marketPrice || p.avgCost) / 1000) : '';
                              onNavigateBuy && onNavigateBuy(p.symbol, '', buyPrice);
                            }}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-bold cursor-pointer transition-colors border border-emerald-200/60 dark:border-emerald-800/40 active:scale-95 shrink-0"
                            title={`Mua thêm ${p.symbol}`}
                          >
                            + Mua
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const sellPrice = (marketPrice || p.avgCost) ? String((marketPrice || p.avgCost) / 1000) : '';
                              onNavigateSell && onNavigateSell({
                                symbol: p.symbol,
                                quantity: String(p.totalQty),
                                price: sellPrice,
                              });
                            }}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-lg text-xs font-bold cursor-pointer transition-colors border border-rose-200/60 dark:border-rose-800/40 active:scale-95 shrink-0"
                            title={`Bán chốt ${p.symbol}`}
                          >
                            - Bán
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 4. FOOTER TỔNG KẾT DANH MỤC */}
          <div className="px-5 sm:px-6 py-3.5 bg-slate-50/90 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
              <span>Đang giữ: <b className="text-slate-800 dark:text-slate-200">{displayedHoldingQty.toLocaleString()} cp</b></span>
              <span>•</span>
              <span>Tổng vốn gốc: <b className="text-slate-800 dark:text-slate-200">{fmtMoney(displayedHoldingCost)}đ</b></span>
              <span>•</span>
              <span>Tổng thị giá: <b className="text-indigo-600 dark:text-indigo-400">{fmtMoney(displayedMarketValue)}đ</b></span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">Lãi/Lỗ tạm tính:</span>
              <span className={`font-black text-sm ${plColor(displayedUnrealizedPL)}`}>
                {displayedUnrealizedPL >= 0 ? '+' : ''}{fmtMoney(displayedUnrealizedPL)}đ ({displayedUnrealizedPLPct >= 0 ? '+' : ''}{displayedUnrealizedPLPct}%)
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
