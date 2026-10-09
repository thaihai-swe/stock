import { useState, useMemo, useEffect } from 'react';
import { fmtMoney, fmtDate, plColor, plBg, getStockColor } from '../utils/format.js';
import { computeStockPerformance } from '../utils/stockAnalytics.js';

export default function StockDetailModal({
  symbol,
  isOpen,
  onClose,
  data = {},
  marketPrices = {},
  onNavigateBuy,
  onNavigateSell,
}) {
  const { buyOrders = [], sellOrders = [], dividends = [] } = data;
  const [filterType, setFilterType] = useState('all'); // 'all' | 'BUY' | 'SELL' | 'DIVIDEND'

  // Đóng modal bằng phím ESC
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
        total: s.totalRevenue || (s.quantity * s.price),
        fee: s.fee || 0,
        tax: s.tax || 0,
        profitLoss: s.profitLoss,
        profitLossPct: s.profitLossPct,
        matchedLots: s.matchedLots || [],
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
    // Sắp xếp ngày mới nhất lên đầu
    merged.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      // Nếu cùng ngày: bán xếp trước mua
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-10 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* 1. Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/70">
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
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 leading-tight">
                  Sổ Cái Tích Luỹ {stockSummary.symbol}
                </h3>
                {stockSummary.isHolding ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    🟢 Đang giữ {stockSummary.holdingQty.toLocaleString()} cp
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                    ⚪ Đã tất toán vị thế
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Tổng hợp toàn bộ lịch sử mua, bán, cổ tức và lợi nhuận tích luỹ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center font-bold text-sm cursor-pointer"
            title="Đóng cửa sổ"
          >
            ✕
          </button>
        </div>

        {/* 2. Modal Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Hero Card: Lãi / Lỗ Tích Luỹ Toàn Thời Gian */}
          <div className={`p-4 sm:p-5 rounded-2xl border ${
            isProfit
              ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border-emerald-200/80'
              : 'bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-red-500/10 border-rose-200/80'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
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

              <div className="text-right sm:border-l sm:border-gray-200/80 sm:pl-4">
                <span className="text-[10px] font-medium text-gray-400 block uppercase">Tổng vốn mua vào</span>
                <span className="text-sm font-bold text-gray-800 block mt-0.5">
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
            <div className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-200/70">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-gray-500 uppercase">1. Lãi đã chốt</span>
                <span className="text-base">💰</span>
              </div>
              <div className={`text-base font-extrabold ${plColor(stockSummary.realizedPL)}`}>
                {stockSummary.realizedPL >= 0 ? '+' : ''}{fmtMoney(stockSummary.realizedPL)}đ
              </div>
              <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-between">
                <span>{stockSummary.sellCount} lần bán ({stockSummary.winCount} thắng)</span>
                <span className="font-bold text-gray-600">{stockSummary.winRate}%</span>
              </div>
            </div>

            {/* 2. Lãi tạm tính */}
            <div className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-200/70">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-gray-500 uppercase">2. Lãi tạm tính</span>
                <span className="text-base">📈</span>
              </div>
              {stockSummary.isHolding ? (
                <>
                  <div className={`text-base font-extrabold ${plColor(stockSummary.unrealizedPL)}`}>
                    {stockSummary.unrealizedPL >= 0 ? '+' : ''}{fmtMoney(stockSummary.unrealizedPL)}đ
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">
                    Giá vốn: <b>{fmtMoney(stockSummary.avgCost)}đ</b>
                    {stockSummary.livePrice ? (
                      <span> | TT: <b className="text-indigo-600">{fmtMoney(stockSummary.livePrice)}đ</b></span>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-base font-bold text-gray-400">—</div>
                  <div className="text-[10px] text-gray-400 mt-1">Đã chốt hết, không giữ</div>
                </>
              )}
            </div>

            {/* 3. Cổ tức tiền mặt */}
            <div className="bg-gray-50/80 rounded-2xl p-3.5 border border-gray-200/70">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-gray-500 uppercase">3. Cổ tức nhận</span>
                <span className="text-base">🎁</span>
              </div>
              <div className="text-base font-extrabold text-amber-700">
                +{fmtMoney(stockSummary.cashDividends)}đ
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                {stockSummary.stockDividends > 0 ? (
                  <span>+{stockSummary.stockDividends.toLocaleString()} CP thưởng</span>
                ) : (
                  <span>{stockSummary.divCount} đợt nhận cổ tức</span>
                )}
              </div>
            </div>
          </div>

          {/* 4. Dòng Thời Gian Giao Dịch (Timeline Section) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <span>⏱️</span> Dòng Thời Gian Giao Dịch ({timeline.length})
              </h4>

              {/* Sub-filters */}
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                    filterType === 'all' ? 'bg-white text-gray-900 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Tất cả ({timeline.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('BUY')}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                    filterType === 'BUY' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Mua ({stockSummary.buyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('SELL')}
                  className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                    filterType === 'SELL' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Bán ({stockSummary.sellCount})
                </button>
                {stockSummary.divCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterType('DIVIDEND')}
                    className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                      filterType === 'DIVIDEND' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Cổ tức ({stockSummary.divCount})
                  </button>
                )}
              </div>
            </div>

            {/* Timeline List */}
            {filteredTimeline.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-gray-100">
                Không có giao dịch nào phù hợp với bộ lọc.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTimeline.map((item, idx) => {
                  if (item.type === 'BUY') {
                    return (
                      <div
                        key={`buy-${item.id || idx}`}
                        className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/30 flex items-center justify-between text-xs hover:bg-indigo-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                            MUA
                          </span>
                          <div>
                            <div className="font-bold text-gray-800">
                              Mua {item.quantity.toLocaleString()} cp @ {fmtMoney(item.price)}đ
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                              <span>📅 {fmtDate(item.date)}</span>
                              {item.remainingQty !== undefined && (
                                <span>• Còn giữ: <b className="text-gray-600">{item.remainingQty.toLocaleString()} cp</b></span>
                              )}
                              {item.tags && item.tags.length > 0 && (
                                <span className="bg-indigo-100/80 text-indigo-700 px-1.5 py-0.2 rounded text-[9px] font-semibold">
                                  🏷️ {item.tags[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-gray-800">
                            -{fmtMoney(item.total)}đ
                          </div>
                          {item.note && (
                            <div className="text-[10px] text-gray-400 truncate max-w-[120px]" title={item.note}>
                              {item.note}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (item.type === 'SELL') {
                    const isWin = item.profitLoss >= 0;
                    return (
                      <div
                        key={`sell-${item.id || idx}`}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                          isWin
                            ? 'border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50/50'
                            : 'border-rose-100 bg-rose-50/30 hover:bg-rose-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`w-6 h-6 rounded-lg font-bold flex items-center justify-center shrink-0 text-[10px] ${
                            isWin ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            BÁN
                          </span>
                          <div>
                            <div className="font-bold text-gray-800">
                              Bán {item.quantity.toLocaleString()} cp @ {fmtMoney(item.price)}đ
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                              <span>📅 {fmtDate(item.date)}</span>
                              <span>• Thu về: <b>{fmtMoney(item.total)}đ</b></span>
                              {item.tags && item.tags.length > 0 && (
                                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded text-[9px] font-semibold">
                                  🏷️ {item.tags[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`font-extrabold ${plColor(item.profitLoss)}`}>
                            {isWin ? '+' : ''}{fmtMoney(item.profitLoss)}đ
                          </div>
                          <div className={`text-[10px] font-bold ${isWin ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isWin ? '▲ +' : '▼ '}{item.profitLossPct}%
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (item.type === 'DIVIDEND') {
                    return (
                      <div
                        key={`div-${item.id || idx}`}
                        className="p-3 rounded-xl border border-amber-100 bg-amber-50/30 flex items-center justify-between text-xs hover:bg-amber-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-[10px]">
                            {item.subType === 'CASH' ? 'T.MẶT' : 'CP'}
                          </span>
                          <div>
                            <div className="font-bold text-gray-800">
                              {item.subType === 'CASH'
                                ? `Cổ tức tiền mặt (${fmtMoney(item.amountPerShare)}đ / cp)`
                                : `Cổ phiếu thưởng / cổ tức (${item.quantity?.toLocaleString()} cp)`
                              }
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">
                              📅 {fmtDate(item.date)} {item.note ? `• ${item.note}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          {item.subType === 'CASH' ? (
                            <div className="font-bold text-amber-700">
                              +{fmtMoney(item.netAmount)}đ
                            </div>
                          ) : (
                            <div className="font-bold text-indigo-700">
                              +{item.quantity?.toLocaleString()} cp
                            </div>
                          )}
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

        {/* 3. Modal Footer (Actions) */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {onNavigateBuy && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateBuy({ symbol: stockSummary.symbol, quantity: '100', price: stockSummary.livePrice ? String(stockSummary.livePrice / 1000) : '' });
                }}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <span>🛒</span> Mua thêm
              </button>
            )}

            {onNavigateSell && stockSummary.isHolding && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateSell(stockSummary.symbol);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <span>💸</span> Bán bớt
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 font-bold text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
