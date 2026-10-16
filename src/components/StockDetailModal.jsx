import { useState, useMemo } from 'react';
import { fmtMoney, fmtDate, plColor, plBg, getStockColor, getMatchMethodInfo } from '../utils/format.js';
import { computeStockPerformance } from '../utils/stockAnalytics.js';
import Modal from './common/Modal.jsx';

export default function StockDetailModal({
  symbol,
  isOpen,
  onClose,
  data = {},
  marketPrices = {},
  onNavigateBuy,
  onNavigateSell,
  onSwitchTab,
}) {
  const { buyOrders = [], sellOrders = [], dividends = [] } = data;
  const [filterType, setFilterType] = useState('all'); // 'all' | 'BUY' | 'SELL' | 'DIVIDEND'

  // Tính toán chỉ số tích luỹ của mã này
  const stockSummary = useMemo(() => {
    if (!symbol) return null;
    const res = computeStockPerformance(buyOrders, sellOrders, dividends, marketPrices);
    return res.stockList.find(s => s.symbol === symbol.toUpperCase()) || null;
  }, [symbol, buyOrders, sellOrders, dividends, marketPrices]);

  // Gom toàn bộ dòng thời gian giao dịch của riêng mã này
  const timeline = useMemo(() => {
    if (!symbol) return [];
    const sym = symbol.toUpperCase();

    const buys = buyOrders
      .filter(b => b.symbol?.toUpperCase() === sym)
      .map(b => ({
        id: b.id,
        type: 'BUY',
        date: b.date || '',
        quantity: b.quantity,
        price: b.price,
        total: b.totalCost || (b.quantity * b.price),
        fee: b.fee || 0,
        remainingQty: b.remainingQty,
        note: b.note || '',
        tags: b.tags || [],
      }));

    const sells = sellOrders
      .filter(s => s.symbol?.toUpperCase() === sym)
      .map(s => ({
        id: s.id,
        type: 'SELL',
        date: s.date || '',
        quantity: s.quantity,
        price: s.price,
        netPrice: s.netPrice || (s.quantity > 0 ? (s.netRevenue ?? s.totalRevenue ?? (s.grossRevenue ? s.grossRevenue - (s.fee || 0) : s.quantity * s.price)) / s.quantity : s.price),
        total: s.netRevenue ?? s.totalRevenue ?? (s.grossRevenue ? s.grossRevenue - (s.fee || 0) : s.quantity * s.price),
        fee: s.fee || 0,
        tax: s.tax || 0,
        costBasis: s.totalCost ?? s.costBasis,
        profitLoss: s.profitLoss,
        profitLossPct: s.profitLossPct,
        matchedLots: s.matchedLots || [],
        matchMethod: s.matchMethod || s.match_method,
        note: s.note || '',
        tags: s.tags || [],
      }));

    const divs = dividends
      .filter(d => d.symbol?.toUpperCase() === sym)
      .map(d => ({
        id: d.id,
        type: 'DIVIDEND',
        subType: d.type, // 'CASH' | 'STOCK'
        date: d.date || '',
        quantity: d.quantity,
        amountPerShare: d.amountPerShare || 0,
        total: d.type === 'CASH' ? (d.netAmount || 0) : d.quantity,
        netAmount: d.netAmount || 0,
        grossAmount: d.grossAmount || 0,
        taxAmount: d.taxAmount || 0,
        note: d.note || '',
      }));

    const merged = [...buys, ...sells, ...divs];
    merged.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      if (a.type !== b.type) return a.type === 'SELL' ? -1 : 1;
      return 0;
    });

    return merged;
  }, [symbol, buyOrders, sellOrders, dividends]);

  const filteredTimeline = useMemo(() => {
    if (filterType === 'all') return timeline;
    return timeline.filter(t => t.type === filterType);
  }, [timeline, filterType]);

  if (!isOpen || !symbol || !stockSummary) return null;

  const stockColor = getStockColor(stockSummary.symbol);
  const isProfit = stockSummary.cumulativePL >= 0;

  const header = (
    <div className="flex items-center gap-3">
      <span
        className="inline-flex items-center px-3 py-1.5 rounded-2xl text-sm font-extrabold shadow-2xs border"
        style={{
          backgroundColor: `${stockColor}18`,
          borderColor: `${stockColor}50`,
          color: stockColor,
        }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full mr-2 shrink-0 shadow-2xs"
          style={{ backgroundColor: stockColor }}
        />
        {stockSummary.symbol}
      </span>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
            Sổ Cái Lãi/Lỗ — {stockSummary.symbol}
          </h3>
          {stockSummary.isHolding ? (
            <span className="badge-gain text-[10px]">
              🟢 Đang giữ {stockSummary.holdingQty.toLocaleString()} cp
            </span>
          ) : (
            <span className="badge-neutral text-[10px]">
              ⚪ Đã tất toán vị thế
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Toàn bộ lịch sử giao dịch Mua / Bán / Nhận cổ tức và tổng kết lãi lỗ
        </p>
      </div>
    </div>
  );

  const footer = (
    <div className="flex flex-wrap items-center justify-between gap-2.5">
      <div className="flex items-center gap-2">
        {onNavigateBuy && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigateBuy({ symbol: stockSummary.symbol, quantity: '100', price: stockSummary.livePrice ? String(stockSummary.livePrice / 1000) : '' });
            }}
            className="btn-primary !text-xs !px-3.5 !py-1.5 flex items-center gap-1 shadow-2xs"
          >
            <span>🛒</span> Mua thêm
          </button>
        )}

        {onNavigateSell && stockSummary.isHolding && (
          <button
            type="button"
            onClick={() => {
              onClose();
              const sellPrice = stockSummary.livePrice ? String(stockSummary.livePrice / 1000) : (stockSummary.avgCost ? String(stockSummary.avgCost / 1000) : '');
              onNavigateSell({
                symbol: stockSummary.symbol,
                quantity: String(stockSummary.holdingQty),
                price: sellPrice,
              });
            }}
            className="btn-danger !text-xs !px-3.5 !py-1.5 flex items-center gap-1 shadow-2xs"
          >
            <span>💸</span> Bán bớt
          </button>
        )}

        {onSwitchTab && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onSwitchTab('valuation', stockSummary.symbol);
            }}
            className="btn-secondary !text-xs !px-3.5 !py-1.5 !bg-indigo-50 dark:!bg-indigo-950/60 !text-indigo-700 dark:!text-indigo-300 !border-indigo-200 dark:!border-indigo-800 hover:!bg-indigo-100 flex items-center gap-1"
          >
            <span>🎯</span> Sang Tab Định Giá
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="btn-secondary !text-xs !px-4 !py-1.5"
      >
        Đóng
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      headerContent={header}
      footer={footer}
    >
      <div className="p-5 sm:p-6 space-y-5">
        {/* Hero Card: Lãi / Lỗ Tích Luỹ Toàn Thời Gian */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${
            isProfit
              ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border-emerald-200/80 dark:border-emerald-800'
              : 'bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-red-500/10 border-rose-200/80 dark:border-rose-800'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block mb-1">
                  🎯 Tổng Lãi / Lỗ Tích Luỹ Toàn Thời Gian
                </span>
                <div className="flex items-baseline gap-2.5">
                  <span className={`text-2xl sm:text-3xl font-extrabold ${plColor(stockSummary.cumulativePL)}`}>
                    {isProfit ? '+' : ''}{fmtMoney(stockSummary.cumulativePL)}đ
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${plBg(stockSummary.cumulativePL)}`}>
                    {isProfit ? '▲ +' : '▼ '}{stockSummary.roiPct}% ROI
                  </span>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-gray-200/80 dark:sm:border-gray-700 sm:pl-4">
                <span className="text-[10px] font-medium text-gray-400 block uppercase">Tổng vốn mua vào</span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200 block mt-0.5">
                  {fmtMoney(stockSummary.totalInvested)}đ
                </span>
                <span className="text-[10px] text-gray-400 block mt-0.5">
                  {stockSummary.totalTrades} giao dịch ({fmtDate(stockSummary.firstTradeDate)} → {fmtDate(stockSummary.lastTradeDate)})
                </span>
              </div>
            </div>
          </div>

          {/* 3 Trụ Cột Thành Phần (Breakdown Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Lãi đã chốt */}
            <div className="card-nested p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                1. Lãi / Lỗ Đã Chốt
              </span>
              <div className={`text-lg font-bold mt-1 ${plColor(stockSummary.realizedPL)}`}>
                {stockSummary.realizedPL >= 0 ? '+' : ''}{fmtMoney(stockSummary.realizedPL)}đ
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Từ các lệnh đã bán ra
              </span>
            </div>

            {/* 2. Lãi chưa chốt */}
            <div className="card-nested p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                2. Lãi / Lỗ Tạm Tính
              </span>
              <div className={`text-lg font-bold mt-1 ${plColor(stockSummary.unrealizedPL)}`}>
                {stockSummary.unrealizedPL >= 0 ? '+' : ''}{fmtMoney(stockSummary.unrealizedPL)}đ
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Vị thế đang nắm giữ ({stockSummary.holdingQty.toLocaleString()} cp)
              </span>
            </div>

            {/* 3. Cổ tức đã nhận */}
            <div className="card-nested p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                3. Cổ Tức Đã Nhận
              </span>
              <div className="text-lg font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                +{fmtMoney(stockSummary.totalDividends)}đ
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Cổ tức tiền mặt thực tế
              </span>
            </div>
          </div>

          {/* Vị Thế Nắm Giữ Hiện Tại */}
          {stockSummary.isHolding && (
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-800">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Giá Vốn Bình Quân:</span>
                  <span className="font-extrabold text-gray-900 dark:text-white text-sm">
                    {fmtMoney(stockSummary.avgCost)}đ
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Giá Thị Trường:</span>
                  <span className="font-extrabold text-gray-900 dark:text-white text-sm">
                    {fmtMoney(stockSummary.livePrice)}đ
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Giá Trị Thị Trường:</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                    {fmtMoney(stockSummary.marketValue)}đ
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block text-[11px]">Tỷ Suất Tạm Tính:</span>
                  <span className={`font-black text-sm ${plColor(stockSummary.unrealizedPL)}`}>
                    {stockSummary.unrealizedPL >= 0 ? '+' : ''}{stockSummary.unrealizedPLPct}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Dòng Thời Gian Lịch Sử Giao Dịch */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <span>📋</span> Lịch Sử Giao Dịch ({timeline.length})
              </h4>

              {/* Bộ lọc loại giao dịch */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl text-[11px]">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    filterType === 'all'
                      ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('BUY')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    filterType === 'BUY'
                      ? 'bg-white dark:bg-gray-800 text-emerald-600 shadow-2xs'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Mua
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('SELL')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    filterType === 'SELL'
                      ? 'bg-white dark:bg-gray-800 text-rose-600 shadow-2xs'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Bán
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('DIVIDEND')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    filterType === 'DIVIDEND'
                      ? 'bg-white dark:bg-gray-800 text-indigo-600 shadow-2xs'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  Cổ tức
                </button>
              </div>
            </div>

            {filteredTimeline.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs">
                Không có giao dịch nào khớp với bộ lọc.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                {filteredTimeline.map((item, idx) => {
                  if (item.type === 'BUY') {
                    return (
                      <div key={item.id || idx} className="p-3.5 bg-white dark:bg-gray-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold flex items-center justify-center text-[10px]">
                            M
                          </span>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">
                              Mua {item.quantity?.toLocaleString()} cp @ {fmtMoney(item.price)}đ
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {fmtDate(item.date)} {item.note ? `• ${item.note}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {fmtMoney(item.total)}đ
                          </div>
                          {item.fee > 0 && (
                            <div className="text-[10px] text-gray-400">
                              Phí: {fmtMoney(item.fee)}đ
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (item.type === 'SELL') {
                    const isSellProfit = (item.profitLoss || 0) >= 0;
                    const methodInfo = item.matchedLots?.length > 0 ? getMatchMethodInfo(item.matchMethod, item.matchedLots) : null;
                    return (
                      <div key={item.id || idx} className="p-3.5 bg-white dark:bg-gray-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-extrabold flex items-center justify-center text-[10px]">
                            B
                          </span>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 flex-wrap">
                              <span>
                                Bán {item.quantity?.toLocaleString()} cp @ khớp {fmtMoney(item.price)}đ
                                {Math.round(item.price) !== Math.round(item.netPrice || item.price) && (
                                  <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 ml-1">
                                    (thực nhận {fmtMoney(item.netPrice || item.price)}đ/cp)
                                  </span>
                                )}
                              </span>
                              {methodInfo && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${methodInfo.badgeBg}`} title={`Khớp theo chiến lược: ${methodInfo.label}`}>
                                  {methodInfo.shortLabel}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {fmtDate(item.date)} {item.note ? `• ${item.note}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold ${plColor(item.profitLoss)}`}>
                            {isSellProfit ? '+' : ''}{fmtMoney(item.profitLoss)}đ ({item.profitLossPct}%)
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-slate-400 font-medium">
                            Thu về: {fmtMoney(item.total)}đ
                          </div>
                          {item.fee > 0 && (
                            <div className="text-[10px] text-gray-400 dark:text-slate-500">
                              Khớp: {fmtMoney(item.quantity * item.price)}đ • <span className="text-rose-500">-{fmtMoney(item.fee)}đ phí</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (item.type === 'DIVIDEND') {
                    return (
                      <div key={item.id || idx} className="p-3.5 bg-white dark:bg-gray-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold flex items-center justify-center text-[10px]">
                            T
                          </span>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">
                              {item.subType === 'CASH' ? 'Cổ tức tiền mặt' : 'Cổ tức cổ phiếu'}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {fmtDate(item.date)} {item.note ? `• ${item.note}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-600 dark:text-emerald-400">
                            {item.subType === 'CASH' ? `+${fmtMoney(item.netAmount)}đ` : `+${item.quantity?.toLocaleString()} cp`}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>
      </div>
    </Modal>
  );
}
