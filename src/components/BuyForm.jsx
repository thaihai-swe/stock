import { useEffect, useState, useMemo } from 'react';
import { addBuyOrder } from '../utils/api.js';
import { DEFAULT_TAGS, fmtMoney, getTodayDate } from '../utils/format.js';
import { PRESET_FEE_PCTS } from '../utils/constants.js';

export default function BuyForm({
  onSuccess,
  initialSymbol = '',
  initialQuantity = '',
  initialPrice = '',
  portfolio = [],
  watchlist = [],
}) {
  const [form, setForm] = useState({
    symbol: initialSymbol || '',
    quantity: initialQuantity ? String(initialQuantity) : '100',
    price: initialPrice ? String(initialPrice) : '',
    feePct: '0',
    note: '',
    date: getTodayDate(),
  });
  const [selectedTag, setSelectedTag] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (initialSymbol) {
      setForm(f => ({ ...f, symbol: initialSymbol.toUpperCase() }));
    }
    if (initialQuantity) {
      setForm(f => ({ ...f, quantity: String(initialQuantity) }));
    }
    if (initialPrice) {
      setForm(f => ({ ...f, price: String(initialPrice) }));
    }
  }, [initialSymbol, initialQuantity, initialPrice]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({
      ...f,
      [name]: name === 'symbol' ? value.toUpperCase() : value,
    }));
    setError('');
  }

  function selectTag(tag) {
    setSelectedTag(prev => (prev === tag ? '' : tag));
  }

  function handleAddCustomTag(e) {
    e.preventDefault();
    const trimmed = customTag.trim();
    if (trimmed) {
      setSelectedTag(trimmed);
      setCustomTag('');
    }
  }

  // Tính toán thời gian thực giá trị đặt mua & phí
  const calculation = useMemo(() => {
    const rawPrice = Number(form.price);
    const rawQty = Number(form.quantity);
    const rawFeePct = Number(form.feePct) || 0;

    if (!form.price || isNaN(rawPrice) || rawPrice <= 0 || !form.quantity || isNaN(rawQty) || rawQty <= 0) {
      return null;
    }

    const actualPricePerShare = rawPrice * 1000;
    const stockValue = actualPricePerShare * rawQty;
    const feeAmount = stockValue * (rawFeePct / 100);
    const totalCost = stockValue + feeAmount;

    return {
      actualPricePerShare,
      stockValue,
      feeAmount,
      totalCost,
      isPriceOverLimit: rawPrice >= 1000,
    };
  }, [form.price, form.quantity, form.feePct]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.symbol || !form.quantity || !form.price) {
      setError('Vui lòng điền đầy đủ mã CP, số lượng và giá.');
      return;
    }
    if (Number(form.quantity) <= 0) {
      setError('Số lượng cổ phiếu phải lớn hơn 0.');
      return;
    }
    setLoading(true);
    try {
      const order = await addBuyOrder({
        symbol: form.symbol.trim().toUpperCase(),
        quantity: Number(form.quantity),
        price: Number(form.price) * 1000,
        feePct: form.feePct !== '' ? Number(form.feePct) : 0,
        note: form.note,
        date: form.date || getTodayDate(),
        tags: selectedTag ? [selectedTag] : [],
      });
      setSuccess(`✅ Đã thêm lệnh mua ${order.quantity.toLocaleString()} cp ${order.symbol} @ ${fmtMoney(order.price)}đ (Phí: ${order.feePct}%)`);
      setForm({ symbol: '', quantity: '100', price: '', feePct: '0', note: '', date: getTodayDate() });
      setSelectedTag('');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
      {/* 1. HEADER FORM MUA */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-2 rounded-2xl bg-white/10 backdrop-blur-xs">🛒</span>
            <div>
              <h2 className="font-extrabold text-lg sm:text-xl tracking-tight">
                Nhập Lệnh Mua Cổ Phiếu
              </h2>
              <p className="text-emerald-100 text-xs sm:text-sm mt-0.5 font-medium">
                Ghi nhận giao dịch mua tích lũy & phân bổ danh mục
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs border border-white/20">
            Lô chẵn 100 cp
          </span>
        </div>
      </div>

      <form noValidate onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5">
        {/* Quick stock chips if portfolio or watchlist has stocks (useful on mobile) */}
        {(portfolio.length > 0 || watchlist.length > 0) && (
          <div className="lg:hidden p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block">
              ⚡ Chọn nhanh mã để mua:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {portfolio.slice(0, 6).map(p => (
                <button
                  key={p.symbol}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, symbol: p.symbol }))}
                  className={`text-xs px-2.5 py-1 rounded-xl font-bold border transition-all cursor-pointer ${
                    form.symbol === p.symbol
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-600 hover:border-emerald-400'
                  }`}
                >
                  {p.symbol}
                </button>
              ))}
              {watchlist.slice(0, 4).map(w => (
                <button
                  key={w.symbol}
                  type="button"
                  onClick={() => setForm(f => ({
                    ...f,
                    symbol: w.symbol,
                    price: w.targetBuyPrice ? String(w.targetBuyPrice / 1000) : f.price
                  }))}
                  className={`text-xs px-2.5 py-1 rounded-xl font-bold border transition-all cursor-pointer ${
                    form.symbol === w.symbol
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  ⭐ {w.symbol}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. SYMBOL + QUANTITY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mã Cổ Phiếu */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
              Mã Cổ Phiếu <span className="text-red-500">*</span>
            </label>
            <input
              name="symbol"
              value={form.symbol}
              onChange={handleChange}
              placeholder="VD: VNM, HPG, FPT..."
              autoCapitalize="characters"
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm uppercase font-extrabold text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Số Lượng */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                Số Lượng (cp) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, quantity: String((Number(f.quantity) || 0) + 100) }))}
                  className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                  title="Cộng thêm 100 cổ phiếu"
                >
                  +100
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, quantity: String((Number(f.quantity) || 0) + 500) }))}
                  className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                  title="Cộng thêm 500 cổ phiếu"
                >
                  +500
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, quantity: String((Number(f.quantity) || 0) + 1000) }))}
                  className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                  title="Cộng thêm 1.000 cổ phiếu"
                >
                  +1K
                </button>
              </div>
            </div>
            <input
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              inputMode="numeric"
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setForm(f => ({ ...f, quantity: String(Math.max(1, (Number(f.quantity) || 0) + 100)) }));
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setForm(f => ({ ...f, quantity: String(Math.max(1, (Number(f.quantity) || 0) - 100)) }));
                }
              }}
              type="number"
              min="0"
              step="100"
              placeholder="100"
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-extrabold text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* 3. GIÁ MUA (x1.000đ) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
              Giá Mua (x1.000đ) <span className="text-red-500">*</span>
            </label>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Đơn vị: Nghìn đồng (VNĐ)
            </span>
          </div>
          <div className="relative">
            <input
              name="price"
              value={form.price}
              onChange={handleChange}
              inputMode="decimal"
              type="number"
              step="any"
              min="0.001"
              placeholder="VD: 26.5 (= 26.500đ)"
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-extrabold text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all pr-24"
            />
            <span className="absolute right-3 top-2.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950 px-2.5 py-1 rounded-xl">
              × 1.000đ
            </span>
          </div>

          {/* Cảnh báo nếu nhập giá nguyên chưa chia 1000 */}
          {calculation?.isPriceOverLimit && (
            <div className="mt-2 text-xs bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
              <div>
                ⚠️ Bạn đang nhập <b>{form.price}</b> (Hệ thống sẽ nhân thành <b>{fmtMoney(Number(form.price) * 1000)}đ</b>).
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, price: String(Number(f.price) / 1000) }))}
                className="shrink-0 font-bold px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
              >
                Sửa thành {Number(form.price) / 1000}
              </button>
            </div>
          )}
        </div>

        {/* 4. CARD TÍNH TOÁN GIÁ TRỊ ĐẶT MUA (LIVE CALCULATION BREAKDOWN) */}
        {calculation && (
          <div className="p-4 rounded-3xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/80 space-y-3 transition-all animate-fadeIn">
            <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-800/60 pb-2">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                <span>📊</span> Chi Tiết Giá Trị Lệnh Mua
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                Đơn giá: {fmtMoney(calculation.actualPricePerShare)}đ / cp
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-emerald-100 dark:border-slate-700">
                <span className="text-[11px] text-gray-500 dark:text-slate-400 block">Tiền mua cổ phiếu:</span>
                <span className="font-extrabold text-sm text-gray-800 dark:text-slate-100 mt-0.5 block">
                  {fmtMoney(calculation.stockValue)}đ
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-2xl border border-emerald-100 dark:border-slate-700">
                <span className="text-[11px] text-gray-500 dark:text-slate-400 block">Phí giao dịch ({form.feePct}%):</span>
                <span className="font-bold text-sm text-gray-600 dark:text-slate-300 mt-0.5 block">
                  +{fmtMoney(calculation.feeAmount)}đ
                </span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-600 text-white flex items-center justify-between shadow-xs">
              <span className="text-xs font-medium">TỔNG TIỀN PHẢI THANH TOÁN:</span>
              <span className="text-base sm:text-lg font-extrabold tracking-tight">
                {fmtMoney(calculation.totalCost)}đ
              </span>
            </div>
          </div>
        )}

        {/* 5. PHÍ MUA & NGÀY GIAO DỊCH */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                Phí Mua (%)
              </label>
              <div className="flex items-center gap-1">
                {(Array.isArray(PRESET_FEE_PCTS) ? PRESET_FEE_PCTS : ['0', '0.1', '0.15']).map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, feePct: pct }))}
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg border transition-all cursor-pointer ${
                      form.feePct === pct
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <input
                name="feePct"
                value={form.feePct}
                onChange={handleChange}
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-extrabold text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-9 transition-all"
              />
              <span className="absolute right-3.5 top-3 text-gray-400 text-xs font-bold">%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
              Ngày Giao Dịch
            </label>
            <input
              name="date"
              value={form.date}
              onChange={handleChange}
              type="date"
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* 6. CHIẾN LƯỢC ĐẦU TƯ (INVESTMENT STRATEGY JOURNAL TAGS) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
              🏷️ Chiến Lược Đầu Tư <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">(Chọn 1 thẻ)</span>
            </label>
            {selectedTag && (
              <button
                type="button"
                onClick={() => setSelectedTag('')}
                className="text-[11px] text-rose-500 hover:text-rose-600 font-bold transition-colors cursor-pointer"
              >
                ✕ Bỏ chọn
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_TAGS.map(t => {
              const isSelected = selectedTag === t;
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() => selectTag(t)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs ring-2 ring-emerald-500/20'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200/80 dark:border-slate-700 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {isSelected ? '✓ ' : ''}{t}
                </button>
              );
            })}
            {selectedTag && !DEFAULT_TAGS.includes(selectedTag) && (
              <button
                type="button"
                onClick={() => setSelectedTag('')}
                className="text-xs px-3 py-1.5 rounded-xl font-bold bg-emerald-600 text-white border-emerald-600 shadow-2xs ring-2 ring-emerald-500/20 cursor-pointer"
              >
                ✓ {selectedTag}
              </button>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="Nhập chiến lược khác..."
              className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomTag(e);
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddCustomTag}
              className="text-xs bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 px-3 py-2 rounded-xl font-bold border border-gray-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              + Thêm
            </button>
          </div>
        </div>

        {/* 7. GHI CHÚ */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
            Ghi Chú Giao Dịch
          </label>
          <input
            name="note"
            value={form.note}
            onChange={handleChange}
            placeholder="VD: Mua test nền giá hỗ trợ, KQKD khả quan..."
            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* 8. THÔNG BÁO LỖI / THÀNH CÔNG */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-shake">
            <span>❌</span> {error}
          </div>
        )}
        {success && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
            <span>{success}</span>
          </div>
        )}

        {/* 9. NÚT SUBMIT */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold py-3.5 rounded-2xl transition-all shadow-md shadow-emerald-600/20 text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span> Đang lưu lệnh mua...
            </>
          ) : (
            <>
              <span>🛒</span> Xác Nhận Thêm Lệnh Mua
            </>
          )}
        </button>
      </form>
    </div>
  );
}
