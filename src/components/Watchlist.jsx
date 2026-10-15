import { useCallback, useEffect, useState } from 'react';
import { addWatchlist, deleteWatchlist, fetchPrices } from '../utils/api.js';
import { fmtDate, fmtMoney } from '../utils/format.js';
import { useToast } from '../context/ToastContext.jsx';
import EmptyState from './common/EmptyState.jsx';
import StockSymbolInput from './common/StockSymbolInput.jsx';

export default function Watchlist({ watchlist = [], portfolio = [], onSuccess, onSelectBuy, onSelectSell, refreshKey }) {
  const { showToast } = useToast();
  const [symbol, setSymbol] = useState('');
  const [targetBuyPrice, setTargetBuyPrice] = useState('');
  const [targetSellPrice, setTargetSellPrice] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [mobileViewMode, setMobileViewMode] = useState('card'); // 'card' | 'table'

  // Live prices state
  const [pricesData, setPricesData] = useState({ session: null, prices: {} });
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');

  const loadMarketPrices = useCallback(async (force = false) => {
    if (!watchlist || watchlist.length === 0) return;
    const symbols = watchlist.map(w => w.symbol);
    setLoadingPrices(true);
    try {
      const resPrices = await fetchPrices(symbols, force);
      if (resPrices?.prices) {
        setPricesData(resPrices);
        setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
      }
    } catch (e) {
      console.error('Không thể lấy giá cho watchlist:', e);
    } finally {
      setLoadingPrices(false);
    }
  }, [watchlist]);

  useEffect(() => {
    loadMarketPrices(Boolean(refreshKey));
  }, [loadMarketPrices, refreshKey]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    if (!symbol.trim()) {
      setError('Vui lòng nhập mã cổ phiếu.');
      return;
    }
    setLoading(true);
    try {
      const buyP = targetBuyPrice && !isNaN(Number(targetBuyPrice)) ? Number(targetBuyPrice) * 1000 : null;
      const sellP = targetSellPrice && !isNaN(Number(targetSellPrice)) ? Number(targetSellPrice) * 1000 : null;

      await addWatchlist({
        symbol: symbol.trim(),
        targetBuyPrice: buyP,
        targetSellPrice: sellP,
        targetPrice: buyP, // backward compatibility
        note,
      });
      showToast(`✅ Đã thêm mã ${symbol.trim().toUpperCase()} vào watchlist`, 'success');
      setSymbol('');
      setTargetBuyPrice('');
      setTargetSellPrice('');
      setNote('');
      onSuccess();
    } catch (err) {
      setError(err.message);
      showToast('❌ ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, sym) {
    if (!confirm(`Xóa ${sym} khỏi danh sách theo dõi?`)) return;
    setDeletingId(id);
    try {
      await deleteWatchlist(id);
      showToast(`✅ Đã xóa mã ${sym} khỏi watchlist`, 'success');
      onSuccess();
    } catch (err) {
      showToast('❌ ' + err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6 w-full">
      {/* Form thêm mã mới */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-5 text-white">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <span>👁️</span> Danh Sách Theo Dõi (Mua & Bán Kỳ Vọng)
          </h2>
          <p className="text-blue-100 text-sm mt-0.5">
            Thiết lập điểm mua kỳ vọng (canh giải ngân) và điểm bán kỳ vọng (canh chốt lời/cắt lỗ) để đối chiếu trực tiếp với giá thị trường
          </p>
        </div>

        <form onSubmit={handleAdd} className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Mã CP */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase mb-1">
                Mã cổ phiếu <span className="text-red-500">*</span>
              </label>
              <StockSymbolInput
                value={symbol}
                onChange={setSymbol}
                placeholder="VD: SSI, FPT..."
                size="sm"
                colorTheme="blue"
                required
              />
            </div>

            {/* Mua kỳ vọng */}
            <div>
              <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase mb-1">
                Điểm mua kỳ vọng (x1.000đ)
              </label>
              <div className="relative">
                <input
                  value={targetBuyPrice}
                  onChange={e => setTargetBuyPrice(e.target.value)}
                  type="number"
                  step="any"
                  placeholder="VD: 34.5 (= 34.500đ)"
                  className="w-full bg-emerald-50/20 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 pr-16"
                />
                <span className="absolute right-2 top-2 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                  × 1.000đ
                </span>
              </div>
              {targetBuyPrice && !isNaN(Number(targetBuyPrice)) && (
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                  = <b className="text-emerald-700 dark:text-emerald-400">{fmtMoney(Number(targetBuyPrice) * 1000)}đ</b>
                </p>
              )}
            </div>

            {/* Bán kỳ vọng */}
            <div>
              <label className="block text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase mb-1">
                Điểm bán kỳ vọng (x1.000đ)
              </label>
              <div className="relative">
                <input
                  value={targetSellPrice}
                  onChange={e => setTargetSellPrice(e.target.value)}
                  type="number"
                  step="any"
                  placeholder="VD: 42.0 (= 42.000đ)"
                  className="w-full bg-purple-50/20 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 pr-16"
                />
                <span className="absolute right-2 top-2 text-[10px] font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950 px-1.5 py-0.5 rounded">
                  × 1.000đ
                </span>
              </div>
              {targetSellPrice && !isNaN(Number(targetSellPrice)) && (
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1">
                  = <b className="text-purple-700 dark:text-purple-400">{fmtMoney(Number(targetSellPrice) * 1000)}đ</b>
                </p>
              )}
            </div>

            {/* Ghi chú */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300 uppercase mb-1">
                Ghi chú lý do theo dõi
              </label>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="VD: Canh MA20, chốt đỉnh cũ..."
                className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-lg px-3 py-2 mt-3">
              ❌ {error}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors shadow-xs cursor-pointer"
            >
              {loading ? 'Đang thêm...' : '+ Thêm Vào Watchlist'}
            </button>
          </div>
        </form>
      </div>

      {/* Danh sách theo dõi */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-800 dark:text-slate-100">📋 Cổ Phiếu Đang Quan Tâm ({watchlist.length})</h3>
            {pricesData?.session && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${pricesData.session.isOpen ? 'bg-green-100 dark:bg-emerald-950/60 text-green-800 dark:text-emerald-300 border border-green-200 dark:border-emerald-800/50' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700'
                }`}>
                {pricesData.session.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            {/* Chuyển đổi Thẻ / Bảng trên Mobile */}
            <div className="flex sm:hidden items-center bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg border border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setMobileViewMode('card')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${mobileViewMode === 'card'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
              >
                📱 Thẻ
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode('table')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${mobileViewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
              >
                📊 Bảng
              </button>
            </div>

            {lastUpdated && (
              <span className="text-gray-400 dark:text-slate-500 hidden xs:inline text-[11px]">Vừa cập nhật: {lastUpdated}</span>
            )}
            <button
              onClick={() => loadMarketPrices(true)}
              disabled={loadingPrices}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200 font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-2xs text-xs"
              title="Lấy thị giá khớp lệnh thời gian thực từ sàn HOSE (Bỏ qua bộ đệm 1h)"
            >
              <span>{loadingPrices ? '⏳' : '⚡'}</span>
              <span>{loadingPrices ? 'Đang tải giá...' : 'Cập nhật giá sàn'}</span>
            </button>
          </div>
        </div>

        {watchlist.length === 0 ? (
          <EmptyState
            icon="🔭"
            title="Chưa có mã nào trong danh sách theo dõi"
            description="Thêm các mã cổ phiếu bạn quan tâm ở khung bên trên để nhận cảnh báo khi thị giá chạm vùng gom mua / chốt lời."
          />
        ) : (
          <>
            {/* 1. Chế độ xem Thẻ (Mobile Card View) */}
            <div className={`p-3.5 space-y-3 ${mobileViewMode === 'card' ? 'block sm:hidden' : 'hidden'}`}>
              {watchlist.map(item => {
                const quote = pricesData?.prices?.[item.symbol];
                const curPrice = quote?.price || null;
                const changePct = quote?.changePct || 0;

                const buyTarget = item.targetBuyPrice || item.targetPrice || null;
                let isBuyReached = false;
                let diffBuyAmount = 0;
                let gapBuyPct = 0;
                if (curPrice && buyTarget) {
                  isBuyReached = curPrice <= buyTarget;
                  diffBuyAmount = curPrice - buyTarget;
                  gapBuyPct = curPrice > 0 ? parseFloat(((Math.abs(diffBuyAmount) / curPrice) * 100).toFixed(1)) : 0;
                }

                const sellTarget = item.targetSellPrice || null;
                let isSellReached = false;
                let diffSellAmount = 0;
                let gapSellPct = 0;
                if (curPrice && sellTarget) {
                  isSellReached = curPrice >= sellTarget;
                  diffSellAmount = sellTarget - curPrice;
                  gapSellPct = curPrice > 0 ? parseFloat(((Math.abs(diffSellAmount) / curPrice) * 100).toFixed(1)) : 0;
                }

                const holding = (portfolio || []).find(p => p.symbol === item.symbol && p.totalQty > 0);

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl p-3.5 shadow-2xs space-y-2.5 transition-all border ${isBuyReached
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/25 border-emerald-300 dark:border-emerald-700/70 shadow-sm shadow-emerald-500/10'
                      : isSellReached
                        ? 'bg-purple-50/50 dark:bg-purple-950/25 border-purple-300 dark:border-purple-700/70 shadow-sm shadow-purple-500/10'
                        : 'bg-gray-50/80 dark:bg-slate-800/80 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-200/80 dark:border-slate-800'
                      }`}
                  >
                    {/* Header Thẻ: Mã CP & Giá thị trường */}
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 dark:border-slate-700/60">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 shadow-2xs">
                          {item.symbol}
                        </span>
                        {holding && (
                          <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 font-semibold px-2 py-0.5 rounded-full">
                            Giữ: {holding.totalQty.toLocaleString()} cp
                          </span>
                        )}
                      </div>

                      {/* Giá thị trường */}
                      <div className="text-right">
                        {curPrice ? (
                          <div className="flex items-baseline justify-end gap-1.5">
                            <span className="text-sm font-extrabold text-gray-900 dark:text-slate-100">{fmtMoney(curPrice)}đ</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${changePct > 0
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                                : changePct < 0
                                  ? 'bg-red-50 dark:bg-rose-950/60 text-red-600 dark:text-rose-300 border-red-200 dark:border-rose-800/50'
                                  : 'bg-yellow-50 dark:bg-amber-950/60 text-yellow-700 dark:text-amber-300 border-yellow-200 dark:border-amber-800/50'
                                }`}
                            >
                              {changePct > 0 ? '▲ +' : changePct < 0 ? '▼ ' : '■ '}{changePct}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-slate-500">Đang cập nhật</span>
                        )}
                      </div>
                    </div>

                    {/* Lưới 2 cột: Mua kỳ vọng & Bán kỳ vọng */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Cột Mua kỳ vọng */}
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/60 p-2.5 rounded-xl flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-800/80 dark:text-emerald-400 block mb-0.5">
                            🎯 Mua kỳ vọng
                          </span>
                          {buyTarget ? (
                            <div className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm">
                              {fmtMoney(buyTarget)}đ
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500 text-xs">Chưa đặt</span>
                          )}
                        </div>
                        <div className="mt-1.5">
                          {curPrice && buyTarget ? (
                            isBuyReached ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-extrabold bg-emerald-600 text-white shadow-2xs animate-pulse">
                                🎯 VÀO VÙNG MUA (-{gapBuyPct}%)
                              </span>
                            ) : gapBuyPct <= 3 ? (
                              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                                ⏳ Sắp chạm (còn -{gapBuyPct}%)
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">
                                Cần giảm -{gapBuyPct}% (-{fmtMoney(diffBuyAmount)}đ)
                              </span>
                            )
                          ) : null}
                        </div>
                      </div>

                      {/* Cột Bán kỳ vọng */}
                      <div className="bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800/60 p-2.5 rounded-xl flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-purple-800/80 dark:text-purple-400 block mb-0.5">
                            🚀 Bán kỳ vọng
                          </span>
                          {sellTarget ? (
                            <div className="font-extrabold text-purple-700 dark:text-purple-300 text-sm">
                              {fmtMoney(sellTarget)}đ
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500 text-xs">Chưa đặt</span>
                          )}
                        </div>
                        <div className="mt-1.5">
                          {curPrice && sellTarget ? (
                            isSellReached ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-extrabold bg-purple-600 text-white shadow-2xs animate-pulse">
                                🚀 CHẠM VÙNG BÁN (+{gapSellPct}%)
                              </span>
                            ) : gapSellPct <= 3 ? (
                              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-purple-100 dark:bg-purple-950 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-800">
                                ⏳ Sắp đạt (còn +{gapSellPct}%)
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-purple-800 dark:text-purple-300">
                                Cần tăng +{gapSellPct}% (+{fmtMoney(diffSellAmount)}đ)
                              </span>
                            )
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Ghi chú */}
                    {item.note && (
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-slate-700">
                        💬 {item.note}
                      </p>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-gray-400 dark:text-slate-500">Thêm: {fmtDate(item.createdAt)}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            const buyPrice = (item.currentPrice || item.targetBuyPrice) ? String((item.currentPrice || item.targetBuyPrice) / 1000) : '';
                            onSelectBuy(item.symbol, '', buyPrice);
                          }}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${isBuyReached
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-200 dark:hover:bg-emerald-900'
                            }`}
                        >
                          🛒 Mua
                        </button>
                        {onSelectSell && (
                          <button
                            onClick={() => {
                              const sellPrice = (item.currentPrice || holding?.avgCost) ? String((item.currentPrice || holding?.avgCost) / 1000) : '';
                              onSelectSell({
                                symbol: item.symbol,
                                quantity: holding ? String(holding.totalQty) : '',
                                price: sellPrice,
                              });
                            }}
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${isSellReached
                              ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                              : holding
                                ? 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-900'
                                : 'bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-slate-300'
                              }`}
                          >
                            💸 Bán
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id, item.symbol)}
                          disabled={deletingId === item.id}
                          className="text-red-400 hover:text-red-600 dark:hover:text-red-300 text-xs p-1 rounded-lg cursor-pointer"
                          title="Xóa khỏi watchlist"
                        >
                          {deletingId === item.id ? '...' : '🗑️'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. Chế độ xem Bảng (Desktop mặc định / Mobile khi chọn Bảng) */}
            <div className={`overflow-x-auto ${mobileViewMode === 'card' ? 'hidden sm:block' : 'block'}`}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-slate-800 font-semibold">
                  <tr>
                    <th className="text-left px-5 py-3.5">Mã CP</th>
                    <th className="text-right px-4 py-3.5 bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">Giá thị trường</th>
                    <th className="text-right px-4 py-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300">Mua kỳ vọng</th>
                    <th className="text-right px-4 py-3.5 bg-purple-50/40 dark:bg-purple-950/20 text-purple-900 dark:text-purple-300">Bán kỳ vọng</th>
                    <th className="text-left px-4 py-3.5">Ghi chú</th>
                    <th className="text-left px-4 py-3.5">Ngày thêm</th>
                    <th className="text-right px-5 py-3.5">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {watchlist.map(item => {
                    const quote = pricesData?.prices?.[item.symbol];
                    const curPrice = quote?.price || null;
                    const changePct = quote?.changePct || 0;

                    const buyTarget = item.targetBuyPrice || item.targetPrice || null;
                    let isBuyReached = false;
                    let diffBuyAmount = 0;
                    let gapBuyPct = 0;

                    if (curPrice && buyTarget) {
                      isBuyReached = curPrice <= buyTarget;
                      diffBuyAmount = curPrice - buyTarget;
                      gapBuyPct = curPrice > 0 ? parseFloat(((Math.abs(diffBuyAmount) / curPrice) * 100).toFixed(1)) : 0;
                    }

                    const sellTarget = item.targetSellPrice || null;
                    let isSellReached = false;
                    let diffSellAmount = 0;
                    let gapSellPct = 0;

                    if (curPrice && sellTarget) {
                      isSellReached = curPrice >= sellTarget;
                      diffSellAmount = sellTarget - curPrice;
                      gapSellPct = curPrice > 0 ? parseFloat(((Math.abs(diffSellAmount) / curPrice) * 100).toFixed(1)) : 0;
                    }

                    const holding = (portfolio || []).find(p => p.symbol === item.symbol && p.totalQty > 0);

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${isBuyReached
                          ? 'bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30'
                          : isSellReached
                            ? 'bg-purple-50/30 dark:bg-purple-950/20 hover:bg-purple-50/50 dark:hover:bg-purple-950/30'
                            : 'hover:bg-gray-50/80 dark:hover:bg-slate-800/40'
                          }`}
                      >
                        {/* Mã CP */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 shadow-2xs">
                              {item.symbol}
                            </span>
                            {holding && (
                              <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 font-semibold px-2 py-0.5 rounded-full" title={`Đang giữ ${holding.totalQty} cp (Vốn: ${fmtMoney(holding.avgCost)}đ)`}>
                                Giữ: {holding.totalQty.toLocaleString()} cp
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Giá thị trường hiện tại */}
                        <td className="px-4 py-4 text-right bg-blue-50/20 dark:bg-blue-950/10">
                          {curPrice ? (
                            <div>
                              <div className="font-extrabold text-gray-900 dark:text-slate-100 text-base tracking-tight">
                                {fmtMoney(curPrice)}đ
                              </div>
                              <div className="text-[11px] flex items-center justify-end gap-1.5 mt-0.5">
                                <span
                                  className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${changePct > 0
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                                    : changePct < 0
                                      ? 'bg-red-50 dark:bg-rose-950/60 text-red-600 dark:text-rose-300 border-red-200 dark:border-rose-800/50'
                                      : 'bg-yellow-50 dark:bg-amber-950/60 text-yellow-700 dark:text-amber-300 border-yellow-200 dark:border-amber-800/50'
                                    }`}
                                >
                                  {changePct > 0 ? '▲ +' : changePct < 0 ? '▼ ' : '■ '}{changePct}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 dark:text-slate-500">{loadingPrices ? 'Đang lấy giá...' : '—'}</span>
                          )}
                        </td>

                        {/* Mua kỳ vọng + Tín hiệu */}
                        <td className="px-4 py-4 text-right bg-emerald-50/15 dark:bg-emerald-950/10">
                          {buyTarget ? (
                            <div>
                              <div className="font-extrabold text-emerald-700 dark:text-emerald-300 text-sm sm:text-base">
                                {fmtMoney(buyTarget)}đ
                              </div>
                              <div className="mt-1">
                                {curPrice ? (
                                  isBuyReached ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-emerald-600 text-white shadow-2xs animate-pulse">
                                      <span>🎯</span> VÀO VÙNG MUA (-{gapBuyPct}%)
                                    </span>
                                  ) : gapBuyPct <= 3 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 shadow-2xs">
                                      <span>⏳</span> Sắp chạm (-{gapBuyPct}%)
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                                      Cần giảm -{gapBuyPct}% <span className="text-gray-400 dark:text-slate-500 font-normal">(-{fmtMoney(diffBuyAmount)}đ)</span>
                                    </span>
                                  )
                                ) : (
                                  <span className="text-xs text-gray-300 dark:text-slate-600">—</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600 text-xs">—</span>
                          )}
                        </td>

                        {/* Bán kỳ vọng + Tín hiệu */}
                        <td className="px-4 py-4 text-right bg-purple-50/15 dark:bg-purple-950/10">
                          {sellTarget ? (
                            <div>
                              <div className="font-extrabold text-purple-700 dark:text-purple-300 text-sm sm:text-base">
                                {fmtMoney(sellTarget)}đ

                              </div>
                              <div className="mt-1">
                                {curPrice ? (
                                  isSellReached ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-purple-600 text-white shadow-2xs animate-pulse">
                                      <span>🚀</span> CHẠM VÙNG BÁN (+{gapSellPct}%)
                                    </span>
                                  ) : gapSellPct <= 3 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-200 border border-purple-200 dark:border-purple-800 shadow-2xs">
                                      <span>⏳</span> Sắp đạt (+{gapSellPct}%)
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-semibold text-purple-800 dark:text-purple-300">
                                      Cần tăng +{gapSellPct}% <span className="text-gray-400 dark:text-slate-500 font-normal">(+{fmtMoney(diffSellAmount)}đ)</span>
                                    </span>
                                  )
                                ) : (
                                  <span className="text-xs text-gray-300 dark:text-slate-600">—</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600 text-xs">—</span>
                          )}
                        </td>

                        {/* Ghi chú */}
                        <td className="px-4 py-4 text-gray-600 dark:text-slate-300 max-w-xs text-xs">{item.note || '—'}</td>

                        {/* Ngày thêm */}
                        <td className="px-4 py-4 text-gray-400 dark:text-slate-500 text-xs whitespace-nowrap">{fmtDate(item.createdAt)}</td>

                        {/* Hành động */}
                        <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => {
                              const buyPrice = (item.currentPrice || item.targetBuyPrice) ? String((item.currentPrice || item.targetBuyPrice) / 1000) : '';
                              onSelectBuy(item.symbol, '', buyPrice);
                            }}
                            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${isBuyReached
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                              }`}
                            title="Tạo lệnh mua ngay với mã này"
                          >
                            🛒 Mua
                          </button>
                          {onSelectSell && (
                            <button
                              onClick={() => {
                                const sellPrice = (item.currentPrice || holding?.avgCost) ? String((item.currentPrice || holding?.avgCost) / 1000) : '';
                                onSelectSell({
                                  symbol: item.symbol,
                                  quantity: holding ? String(holding.totalQty) : '',
                                  price: sellPrice,
                                });
                              }}
                              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${isSellReached
                                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                                : holding
                                  ? 'bg-orange-50 dark:bg-orange-950/60 hover:bg-orange-100 dark:hover:bg-orange-900 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50'
                                  : 'bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300'
                                }`}
                              title={holding ? `Bán mã này (Có sẵn ${holding.totalQty} cp)` : 'Chuyển sang màn hình Bán'}
                            >
                              💸 Bán
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(item.id, item.symbol)}
                            disabled={deletingId === item.id}
                            className="text-red-400 hover:text-red-600 dark:hover:text-red-300 text-xs p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="Xóa khỏi watchlist"
                          >
                            {deletingId === item.id ? '...' : '🗑️'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
