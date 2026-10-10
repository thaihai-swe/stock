import { useState, useEffect, useCallback } from 'react';
import { addWatchlist, deleteWatchlist, fetchPrices, fetchFundamentals } from '../utils/api.js';
import { fmtMoney, fmtDate } from '../utils/format.js';

export default function Watchlist({ watchlist = [], portfolio = [], onSuccess, onSelectBuy, onSelectSell, refreshKey }) {
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
  const [fundamentalsMap, setFundamentalsMap] = useState({});

  const loadMarketPrices = useCallback(async (force = false) => {
    if (!watchlist || watchlist.length === 0) return;
    const symbols = watchlist.map(w => w.symbol);
    setLoadingPrices(true);
    try {
      const [resPrices, resFund] = await Promise.allSettled([
        fetchPrices(symbols, force),
        fetchFundamentals(symbols, force),
      ]);
      if (resPrices.status === 'fulfilled') {
        setPricesData(resPrices.value);
        setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
      }
      if (resFund.status === 'fulfilled' && resFund.value) {
        setFundamentalsMap(resFund.value);
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
      setSymbol('');
      setTargetBuyPrice('');
      setTargetSellPrice('');
      setNote('');
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, sym) {
    if (!confirm(`Xóa ${sym} khỏi danh sách theo dõi?`)) return;
    setDeletingId(id);
    try {
      await deleteWatchlist(id);
      onSuccess();
    } catch (err) {
      alert('❌ ' + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6 w-full">
      {/* Form thêm mã mới */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                Mã cổ phiếu <span className="text-red-500">*</span>
              </label>
              <input
                value={symbol}
                onChange={e => setSymbol(e.target.value.toUpperCase())}
                placeholder="VD: SSI, FPT..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Mua kỳ vọng */}
            <div>
              <label className="block text-xs font-semibold text-emerald-700 uppercase mb-1">
                Điểm mua kỳ vọng (x1.000đ)
              </label>
              <div className="relative">
                <input
                  value={targetBuyPrice}
                  onChange={e => setTargetBuyPrice(e.target.value)}
                  type="number"
                  step="any"
                  placeholder="VD: 34.5 (= 34.500đ)"
                  className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 pr-16 bg-emerald-50/20"
                />
                <span className="absolute right-2 top-2 text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                  × 1.000đ
                </span>
              </div>
              {targetBuyPrice && !isNaN(Number(targetBuyPrice)) && (
                <p className="text-[11px] text-gray-500 mt-1">
                  = <b className="text-emerald-700">{fmtMoney(Number(targetBuyPrice) * 1000)}đ</b>
                </p>
              )}
            </div>

            {/* Bán kỳ vọng */}
            <div>
              <label className="block text-xs font-semibold text-purple-700 uppercase mb-1">
                Điểm bán kỳ vọng (x1.000đ)
              </label>
              <div className="relative">
                <input
                  value={targetSellPrice}
                  onChange={e => setTargetSellPrice(e.target.value)}
                  type="number"
                  step="any"
                  placeholder="VD: 42.0 (= 42.000đ)"
                  className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 pr-16 bg-purple-50/20"
                />
                <span className="absolute right-2 top-2 text-[10px] font-medium text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                  × 1.000đ
                </span>
              </div>
              {targetSellPrice && !isNaN(Number(targetSellPrice)) && (
                <p className="text-[11px] text-gray-500 mt-1">
                  = <b className="text-purple-700">{fmtMoney(Number(targetSellPrice) * 1000)}đ</b>
                </p>
              )}
            </div>

            {/* Ghi chú */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                Ghi chú lý do theo dõi
              </label>
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="VD: Canh MA20, chốt đỉnh cũ..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 mt-3">
              ❌ {error}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors shadow-xs"
            >
              {loading ? 'Đang thêm...' : '+ Thêm Vào Watchlist'}
            </button>
          </div>
        </form>
      </div>

      {/* Danh sách theo dõi */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-800">📋 Cổ Phiếu Đang Quan Tâm ({watchlist.length})</h3>
            {pricesData?.session && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                pricesData.session.isOpen ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {pricesData.session.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            {/* Chuyển đổi Thẻ / Bảng trên Mobile */}
            <div className="flex sm:hidden items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
              <button
                type="button"
                onClick={() => setMobileViewMode('card')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                  mobileViewMode === 'card'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📱 Thẻ
              </button>
              <button
                type="button"
                onClick={() => setMobileViewMode('table')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all ${
                  mobileViewMode === 'table'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📊 Bảng
              </button>
            </div>

            {lastUpdated && (
              <span className="text-gray-400 hidden xs:inline">Cập nhật: {lastUpdated}</span>
            )}
            <button
              onClick={() => loadMarketPrices(true)}
              disabled={loadingPrices}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium transition-colors disabled:opacity-50"
              title="Làm mới giá thị trường"
            >
              <span>{loadingPrices ? '⏳' : '🔄'}</span>
              <span>{loadingPrices ? 'Đang tải...' : 'Cập nhật giá'}</span>
            </button>
          </div>
        </div>

        {watchlist.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-4xl mb-2">🔭</p>
            <p className="font-medium text-gray-600">Chưa có mã nào trong danh sách theo dõi</p>
            <p className="text-xs text-gray-400 mt-1">Thêm các mã bạn quan tâm ở khung bên trên</p>
          </div>
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
                let diffBuyPct = 0;
                let diffBuyAmount = 0;
                if (curPrice && buyTarget) {
                  diffBuyAmount = curPrice - buyTarget;
                  diffBuyPct = parseFloat(((Math.abs(diffBuyAmount) / buyTarget) * 100).toFixed(1));
                  isBuyReached = curPrice <= buyTarget;
                }

                const sellTarget = item.targetSellPrice || null;
                let isSellReached = false;
                let diffSellPct = 0;
                let diffSellAmount = 0;
                if (curPrice && sellTarget) {
                  diffSellAmount = curPrice - sellTarget;
                  diffSellPct = parseFloat(((Math.abs(diffSellAmount) / sellTarget) * 100).toFixed(1));
                  isSellReached = curPrice >= sellTarget;
                }

                const holding = (portfolio || []).find(p => p.symbol === item.symbol && p.totalQty > 0);

                return (
                  <div key={item.id} className="bg-gray-50/80 hover:bg-gray-50 border border-gray-200/80 rounded-2xl p-3.5 shadow-2xs space-y-2.5 transition-all">
                    {/* Header Thẻ: Mã CP & Giá thị trường */}
                    <div className="flex items-center justify-between pb-2 border-b border-gray-200/60">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 shadow-2xs">
                          {item.symbol}
                        </span>
                        {holding && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                            Giữ: {holding.totalQty.toLocaleString()} cp
                          </span>
                        )}
                      </div>

                      {/* Giá thị trường */}
                      <div className="text-right">
                        {curPrice ? (
                          <div className="flex items-baseline justify-end gap-1.5">
                            <span className="text-sm font-extrabold text-gray-900">{fmtMoney(curPrice)}đ</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
                                changePct > 0
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : changePct < 0
                                  ? 'bg-red-50 text-red-600 border-red-200'
                                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              }`}
                            >
                              {changePct > 0 ? '▲ +' : changePct < 0 ? '▼ ' : '■ '}{changePct}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Đang cập nhật</span>
                        )}
                      </div>
                    </div>

                    {/* Lưới 2 cột: Mua kỳ vọng & Bán kỳ vọng */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Cột Mua kỳ vọng */}
                      <div className="bg-emerald-50/40 border border-emerald-100/80 p-2.5 rounded-xl flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-emerald-800/80 block mb-0.5">
                            🎯 Mua kỳ vọng
                          </span>
                          {buyTarget ? (
                            <div className="font-extrabold text-emerald-700 text-sm">
                              {fmtMoney(buyTarget)}đ
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Chưa đặt</span>
                          )}
                        </div>
                        <div className="mt-1.5">
                          {curPrice && buyTarget ? (
                            isBuyReached ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-extrabold bg-emerald-200 text-emerald-900 shadow-2xs animate-pulse">
                                ĐẠT (-{diffBuyPct}%)
                              </span>
                            ) : diffBuyPct <= 5 ? (
                              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-amber-100 text-amber-900">
                                Sắp chạm (+{diffBuyPct}%)
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-blue-700">
                                +{diffBuyPct}% (+{fmtMoney(diffBuyAmount)}đ)
                              </span>
                            )
                          ) : null}
                        </div>
                      </div>

                      {/* Cột Bán kỳ vọng */}
                      <div className="bg-purple-50/40 border border-purple-100/80 p-2.5 rounded-xl flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-purple-800/80 block mb-0.5">
                            🚀 Bán kỳ vọng
                          </span>
                          {sellTarget ? (
                            <div className="font-extrabold text-purple-700 text-sm">
                              {fmtMoney(sellTarget)}đ
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Chưa đặt</span>
                          )}
                        </div>
                        <div className="mt-1.5">
                          {curPrice && sellTarget ? (
                            isSellReached ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md font-extrabold bg-purple-200 text-purple-900 shadow-2xs animate-pulse">
                                ĐẠT (+{diffSellPct}%)
                              </span>
                            ) : diffSellPct <= 5 ? (
                              <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-purple-100 text-purple-900">
                                Sắp đạt (-{diffSellPct}%)
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-indigo-700">
                                Còn -{diffSellPct}% (-{fmtMoney(Math.abs(diffSellAmount))}đ)
                              </span>
                            )
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Ghi chú */}
                    {item.note && (
                      <p className="text-[11px] text-gray-500 bg-white/80 px-2.5 py-1 rounded-lg border border-gray-100">
                        💬 {item.note}
                      </p>
                    )}

                    {/* Chỉ số cơ bản doanh nghiệp */}
                    {fundamentalsMap[item.symbol] && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] bg-indigo-50/50 p-2 rounded-xl border border-indigo-100/60">
                        <span className="px-1.5 py-0.5 rounded bg-white font-bold text-indigo-900 shadow-2xs">
                          P/E: {fundamentalsMap[item.symbol].valuation?.pe != null ? `${fundamentalsMap[item.symbol].valuation.pe}x` : '—'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white font-bold text-emerald-800 shadow-2xs">
                          ROE: {fundamentalsMap[item.symbol].profitability?.roe != null ? `${fundamentalsMap[item.symbol].profitability.roe}%` : '—'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white font-bold text-amber-800 shadow-2xs">
                          Yield: {fundamentalsMap[item.symbol].dividends?.yield != null ? `${fundamentalsMap[item.symbol].dividends.yield}%` : '—'}
                        </span>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-gray-400">Thêm: {fmtDate(item.createdAt)}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => onSelectBuy(item.symbol)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
                            isBuyReached
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          }`}
                        >
                          🛒 Mua
                        </button>
                        {onSelectSell && (
                          <button
                            onClick={() => onSelectSell(item.symbol)}
                            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all ${
                              isSellReached
                                ? 'bg-purple-600 text-white shadow-xs'
                                : holding
                                ? 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            💸 Bán
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id, item.symbol)}
                          disabled={deletingId === item.id}
                          className="text-red-400 hover:text-red-600 text-xs p-1 rounded-lg"
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
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100 font-semibold">
                  <tr>
                    <th className="text-left px-5 py-3.5">Mã CP</th>
                    <th className="text-right px-4 py-3.5 bg-blue-50/40 text-blue-900">Giá thị trường</th>
                    <th className="text-right px-4 py-3.5 bg-indigo-50/40 text-indigo-950">Chỉ số cơ bản</th>
                    <th className="text-right px-4 py-3.5 bg-emerald-50/40 text-emerald-900">Mua kỳ vọng</th>
                    <th className="text-right px-4 py-3.5 bg-purple-50/40 text-purple-900">Bán kỳ vọng</th>
                    <th className="text-left px-4 py-3.5">Ghi chú</th>
                    <th className="text-left px-4 py-3.5">Ngày thêm</th>
                    <th className="text-right px-5 py-3.5">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {watchlist.map(item => {
                    const quote = pricesData?.prices?.[item.symbol];
                    const curPrice = quote?.price || null;
                    const changePct = quote?.changePct || 0;

                    // Điểm mua kỳ vọng (hỗ trợ cả targetBuyPrice và targetPrice cũ)
                    const buyTarget = item.targetBuyPrice || item.targetPrice || null;
                    let isBuyReached = false;
                    let diffBuyPct = 0;
                    let diffBuyAmount = 0;

                    if (curPrice && buyTarget) {
                      diffBuyAmount = curPrice - buyTarget;
                      diffBuyPct = parseFloat(((Math.abs(diffBuyAmount) / buyTarget) * 100).toFixed(1));
                      isBuyReached = curPrice <= buyTarget;
                    }

                    // Điểm bán kỳ vọng
                    const sellTarget = item.targetSellPrice || null;
                    let isSellReached = false;
                    let diffSellPct = 0;
                    let diffSellAmount = 0;

                    if (curPrice && sellTarget) {
                      diffSellAmount = curPrice - sellTarget;
                      diffSellPct = parseFloat(((Math.abs(diffSellAmount) / sellTarget) * 100).toFixed(1));
                      isSellReached = curPrice >= sellTarget;
                    }

                    // Kiểm tra xem cổ phiếu này có đang nằm trong portfolio không
                    const holding = (portfolio || []).find(p => p.symbol === item.symbol && p.totalQty > 0);

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* Mã CP */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 shadow-2xs">
                              {item.symbol}
                            </span>
                            {holding && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full" title={`Đang giữ ${holding.totalQty} cp (Vốn: ${fmtMoney(holding.avgCost)}đ)`}>
                                Giữ: {holding.totalQty.toLocaleString()} cp
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Giá thị trường hiện tại */}
                        <td className="px-4 py-4 text-right bg-blue-50/20">
                          {curPrice ? (
                            <div>
                              <div className="font-extrabold text-gray-900 text-base tracking-tight">
                                {fmtMoney(curPrice)}đ
                              </div>
                              <div className="text-[11px] flex items-center justify-end gap-1.5 mt-0.5">
                                <span className="text-gray-400">({(curPrice / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })})</span>
                                <span
                                  className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.2 rounded-full border ${
                                    changePct > 0
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : changePct < 0
                                      ? 'bg-red-50 text-red-600 border-red-200'
                                      : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                  }`}
                                >
                                  {changePct > 0 ? '▲ +' : changePct < 0 ? '▼ ' : '■ '}{changePct}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">{loadingPrices ? 'Đang lấy giá...' : '—'}</span>
                          )}
                        </td>

                        {/* Chỉ số Cơ bản */}
                        <td className="px-4 py-4 text-right bg-indigo-50/15">
                          {fundamentalsMap[item.symbol] ? (
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold text-gray-900 flex items-center justify-end gap-1.5">
                                <span>P/E: <b className="text-indigo-600">{fundamentalsMap[item.symbol].valuation?.pe != null ? `${fundamentalsMap[item.symbol].valuation.pe}x` : '—'}</b></span>
                                <span>•</span>
                                <span>ROE: <b className={fundamentalsMap[item.symbol].profitability?.roe >= 15 ? 'text-emerald-600' : 'text-gray-700'}>{fundamentalsMap[item.symbol].profitability?.roe != null ? `${fundamentalsMap[item.symbol].profitability.roe}%` : '—'}</b></span>
                              </div>
                              <div className="text-[11px] text-gray-500 flex items-center justify-end gap-1.5">
                                <span>Cổ tức: <b className="text-amber-700">{fundamentalsMap[item.symbol].dividends?.yield != null ? `${fundamentalsMap[item.symbol].dividends.yield}%` : '—'}</b></span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>

                        {/* Mua kỳ vọng + Tín hiệu */}
                        <td className="px-4 py-4 text-right bg-emerald-50/15">
                          {buyTarget ? (
                            <div>
                              <div className="font-extrabold text-emerald-700 text-sm sm:text-base">
                                {fmtMoney(buyTarget)}đ
                                <span className="text-[10px] text-emerald-600/90 font-semibold bg-emerald-100/70 border border-emerald-200/80 px-1.5 py-0.2 rounded ml-1">
                                  {(buyTarget / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="mt-1">
                                {curPrice ? (
                                  isBuyReached ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs animate-pulse">
                                      <span>🎯</span> ĐẠT ĐIỂM MUA (-{diffBuyPct}%)
                                    </span>
                                  ) : diffBuyPct <= 5 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
                                      <span>⏳</span> Sắp chạm (+{diffBuyPct}%)
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-semibold text-blue-700">
                                      Cao hơn +{diffBuyPct}% <span className="text-gray-400 font-normal">(+{fmtMoney(diffBuyAmount)}đ)</span>
                                    </span>
                                  )
                                ) : (
                                  <span className="text-xs text-gray-300">—</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>

                        {/* Bán kỳ vọng + Tín hiệu */}
                        <td className="px-4 py-4 text-right bg-purple-50/15">
                          {sellTarget ? (
                            <div>
                              <div className="font-extrabold text-purple-700 text-sm sm:text-base">
                                {fmtMoney(sellTarget)}đ
                                <span className="text-[10px] text-purple-600/90 font-semibold bg-purple-100/70 border border-purple-200/80 px-1.5 py-0.2 rounded ml-1">
                                  {(sellTarget / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="mt-1">
                                {curPrice ? (
                                  isSellReached ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-purple-100 text-purple-800 border border-purple-300 shadow-2xs animate-pulse">
                                      <span>🚀</span> ĐẠT ĐIỂM BÁN (+{diffSellPct}%)
                                    </span>
                                  ) : diffSellPct <= 5 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
                                      <span>⏳</span> Sắp đạt (-{diffSellPct}%)
                                    </span>
                                  ) : (
                                    <span className="text-[11px] font-semibold text-indigo-700">
                                      Còn thiếu -{diffSellPct}% <span className="text-gray-400 font-normal">(-{fmtMoney(Math.abs(diffSellAmount))}đ)</span>
                                    </span>
                                  )
                                ) : (
                                  <span className="text-xs text-gray-300">—</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>

                        {/* Ghi chú */}
                        <td className="px-4 py-4 text-gray-600 max-w-xs text-xs">{item.note || '—'}</td>

                        {/* Ngày thêm */}
                        <td className="px-4 py-4 text-gray-400 text-xs whitespace-nowrap">{fmtDate(item.createdAt)}</td>

                        {/* Hành động */}
                        <td className="px-5 py-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => onSelectBuy(item.symbol)}
                            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                              isBuyReached
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                            }`}
                            title="Tạo lệnh mua ngay với mã này"
                          >
                            🛒 Mua
                          </button>
                          {onSelectSell && (
                            <button
                              onClick={() => onSelectSell(item.symbol)}
                              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all ${
                                isSellReached
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                                  : holding
                                  ? 'bg-orange-50 hover:bg-orange-100 text-orange-700'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                              }`}
                              title={holding ? `Bán mã này (Có sẵn ${holding.totalQty} cp)` : 'Chuyển sang màn hình Bán'}
                            >
                              💸 Bán
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(item.id, item.symbol)}
                            disabled={deletingId === item.id}
                            className="text-red-400 hover:text-red-600 text-xs p-1.5 rounded-lg transition-colors"
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
