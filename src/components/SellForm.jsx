import { useEffect, useMemo, useState } from 'react';
import { addSellOrder } from '../utils/api.js';
import { DEFAULT_TAGS, DISCIPLINE_TAGS, fmtDate, fmtMoney, getTodayDate, plBg, plColor } from '../utils/format.js';
import { DEFAULT_TRADE_FEE_PCT } from '../utils/constants.js';

export default function SellForm({
  onSuccess,
  portfolio = [],
  initialSymbol = '',
  initialQuantity = null,
}) {
  const [form, setForm] = useState({
    symbol: initialSymbol || '',
    quantity: initialQuantity ? String(initialQuantity) : '100',
    price: '',
    feePct: '0.1',
    note: '',
    date: getTodayDate(),
    matchMethod: 'lowest', // 'lowest' | 'highest' | 'fifo'
  });

  useEffect(() => {
    if (initialSymbol) {
      setForm(f => ({ ...f, symbol: initialSymbol.toUpperCase() }));
    }
  }, [initialSymbol]);

  useEffect(() => {
    if (initialQuantity) {
      setForm(f => ({ ...f, quantity: String(initialQuantity) }));
    }
  }, [initialQuantity]);

  const [selectedTag, setSelectedTag] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // kết quả lãi/lỗ sau khi bán

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === 'symbol' ? value.toUpperCase() : value }));
    setResult(null);
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

  // Tìm số lượng khả dụng và các lô trong portfolio
  const available = portfolio.find(p => p.symbol === form.symbol.toUpperCase());
  const maxQty = available ? available.totalQty : 0;

  // Tính toán trước GIÁ VỐN GỐC theo thuật toán khớp lệnh được chọn
  const costPreview = useMemo(() => {
    if (!available || !available.lots || !form.quantity) return null;
    const requestedQty = Number(form.quantity);
    if (isNaN(requestedQty) || requestedQty <= 0 || requestedQty > available.totalQty) return null;

    // Sắp xếp các lô theo phương thức khớp lệnh
    const sortedLots = [...available.lots].sort((a, b) => {
      const costA = a.costPerShare || a.price;
      const costB = b.costPerShare || b.price;
      if (form.matchMethod === 'highest') {
        // Giá cao nhất trước
        return costB - costA;
      } else if (form.matchMethod === 'fifo') {
        // Mua trước bán trước theo ngày
        return new Date(a.date) - new Date(b.date);
      }
      // Mặc định: Giá thấp nhất trước
      return costA - costB;
    });

    let remaining = requestedQty;
    let totalCost = 0;
    const matched = [];

    for (const lot of sortedLots) {
      if (remaining <= 0) break;
      const used = Math.min(lot.qty, remaining);
      const unitCost = lot.costPerShare || lot.price;
      totalCost += used * unitCost;
      matched.push({
        used,
        price: lot.price,
        unitCost,
        date: lot.date,
      });
      remaining -= used;
    }

    const avgCost = totalCost / requestedQty;
    const sellPrice = form.price && !isNaN(Number(form.price)) ? Number(form.price) * 1000 : null;
    const feePercent = form.feePct !== '' && !isNaN(Number(form.feePct)) ? Number(form.feePct) : 0.1;

    let grossRevenue = 0;
    let fee = 0;
    let netRevenue = 0;
    let estPL = 0;
    let estPLPct = 0;

    if (sellPrice) {
      grossRevenue = requestedQty * sellPrice;
      fee = grossRevenue * (feePercent / 100);
      netRevenue = grossRevenue - fee;
      estPL = netRevenue - totalCost;
      estPLPct = totalCost > 0 ? ((estPL / totalCost) * 100).toFixed(2) : 0;
    }

    return {
      requestedQty,
      avgCost,
      totalCost,
      matched,
      sellPrice,
      grossRevenue,
      fee,
      netRevenue,
      estPL,
      estPLPct,
    };
  }, [available, form.quantity, form.price, form.feePct, form.matchMethod]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!form.symbol || !form.quantity || !form.price) {
      setError('Vui lòng điền đầy đủ mã CP, số lượng và giá bán.');
      return;
    }
    if (Number(form.quantity) <= 0) {
      setError('Số lượng cổ phiếu bán phải lớn hơn 0.');
      return;
    }
    if (maxQty > 0 && Number(form.quantity) > maxQty) {
      setError(`Số lượng bán vượt quá số khả dụng (${maxQty.toLocaleString()} cp).`);
      return;
    }
    setLoading(true);
    try {
      const order = await addSellOrder({
        symbol: form.symbol,
        quantity: Number(form.quantity),
        price: Number(form.price) * 1000,
        feePct: form.feePct !== '' ? Number(form.feePct) : 0.1,
        note: form.note,
        date: form.date || getTodayDate(),
        tags: [selectedTag, selectedDiscipline].filter(Boolean),
        matchMethod: form.matchMethod || 'lowest',
      });
      setResult(order);
      setForm({ symbol: '', quantity: '100', price: '', feePct: '0.1', note: '', date: getTodayDate(), matchMethod: form.matchMethod || 'lowest' });
      setSelectedTag('');
      setSelectedDiscipline('');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* 1. KHỐI FORM NHẬP LỆNH BÁN */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
        {/* Header Form Bán */}
        <div className="bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl p-2 rounded-2xl bg-white/10 backdrop-blur-xs">💸</span>
              <div>
                <h2 className="font-extrabold text-lg sm:text-xl tracking-tight">
                  Nhập Lệnh Bán Cổ Phiếu
                </h2>
                <p className="text-rose-100 text-xs sm:text-sm mt-0.5 font-medium">
                  Chốt lời, cơ cấu danh mục & bảo toàn vốn theo kỷ luật
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs border border-white/20">
              Khớp Lô Tự Động
            </span>
          </div>
        </div>

        <form noValidate onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5">
          {/* Quick chips chọn mã nếu có portfolio */}
          {portfolio.filter(p => p.totalQty > 0).length > 0 && (
            <div className="lg:hidden p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-gray-500 dark:text-slate-400 block">
                ⚡ Chọn nhanh mã trong tài khoản:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {portfolio.filter(p => p.totalQty > 0).map(p => (
                  <button
                    key={p.symbol}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, symbol: p.symbol, quantity: String(p.totalQty) }))}
                    className={`text-xs px-2.5 py-1 rounded-xl font-bold border transition-all cursor-pointer ${
                      form.symbol === p.symbol
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                        : 'bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-600 hover:border-rose-400'
                    }`}
                  >
                    {p.symbol} ({p.totalQty.toLocaleString()})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SYMBOL + QUANTITY */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mã Cổ Phiếu */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                Mã Cần Bán <span className="text-red-500">*</span>
              </label>
              <select
                name="symbol"
                value={form.symbol}
                onChange={handleChange}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-extrabold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all cursor-pointer"
              >
                <option value="">
                  {portfolio.length === 0 ? '— Chưa có CP trong danh mục —' : '— Chọn cổ phiếu cần bán —'}
                </option>
                {portfolio.filter(p => p.totalQty > 0).map(p => (
                  <option key={p.symbol} value={p.symbol}>
                    {p.symbol} (Khả dụng: {p.totalQty.toLocaleString()} cp - Vốn TB: {fmtMoney(p.avgCost)}đ)
                  </option>
                ))}
              </select>

              {form.symbol && (
                <div className="mt-1.5 text-xs font-semibold">
                  {maxQty > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ✓ Khả dụng: <b>{maxQty.toLocaleString()}</b> cp (Vốn TB: {fmtMoney(available?.avgCost)}đ)
                    </span>
                  ) : (
                    <span className="text-rose-500 dark:text-rose-400">
                      ✕ Mã này không còn số lượng khả dụng
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Số Lượng Bán */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                  Số Lượng Bán (cp) <span className="text-red-500">*</span>
                </label>
                {maxQty > 0 && (
                  <div className="flex items-center gap-1">
                    {maxQty >= 200 && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, quantity: String(Math.floor(maxQty * 0.25)) }))}
                        className="text-[10px] font-bold bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 px-1.5 py-0.5 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors cursor-pointer"
                      >
                        25%
                      </button>
                    )}
                    {maxQty >= 200 && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, quantity: String(Math.floor(maxQty * 0.5)) }))}
                        className="text-[10px] font-bold bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 px-1.5 py-0.5 rounded-lg border border-gray-200 dark:border-slate-700 transition-colors cursor-pointer"
                      >
                        50%
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, quantity: String(maxQty) }))}
                      className="text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                    >
                      Tất cả
                    </button>
                  </div>
                )}
              </div>
              <input
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                inputMode="numeric"
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setForm(f => ({ ...f, quantity: String(Math.min(maxQty || 999999, (Number(f.quantity) || 0) + 100)) }));
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setForm(f => ({ ...f, quantity: String(Math.max(1, (Number(f.quantity) || 0) - 100)) }));
                  }
                }}
                type="number"
                min="0"
                step="100"
                max={maxQty || undefined}
                placeholder="100"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-extrabold text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
              />
            </div>
          </div>

          {/* GIÁ BÁN (x1.000đ) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                Giá Bán (x1.000đ) <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
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
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-extrabold text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all pr-24"
              />
              <span className="absolute right-3 top-2.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-950 px-2.5 py-1 rounded-xl">
                × 1.000đ
              </span>
            </div>

            {/* Cảnh báo nhập giá nhầm */}
            {form.price && Number(form.price) >= 1000 && (
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

          {/* 3 PHƯƠNG THỨC ƯU TIÊN KHỚP LÔ MUA */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                🎯 Phương Thức Khớp Lô Mua Gốc
              </label>
              <span className="text-[11px] text-gray-400 dark:text-slate-500">
                Tự động đối chiếu sổ lệnh
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 1. Giá thấp nhất */}
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, matchMethod: 'lowest' }))}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  (form.matchMethod || 'lowest') === 'lowest'
                    ? 'bg-rose-50/80 dark:bg-rose-950/50 border-rose-500 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/20 shadow-xs'
                    : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold flex items-center gap-1.5">
                    <span>📉</span> Giá thấp nhất
                  </span>
                  {(form.matchMethod || 'lowest') === 'lowest' && (
                    <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                      Đang chọn
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-tight">
                  Khớp lô mua rẻ trước, tối đa hóa lãi chốt ngay
                </p>
              </button>

              {/* 2. Giá cao nhất */}
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, matchMethod: 'highest' }))}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  form.matchMethod === 'highest'
                    ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 text-indigo-950 dark:text-indigo-100 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold flex items-center gap-1.5">
                    <span>📈</span> Giá cao nhất
                  </span>
                  {form.matchMethod === 'highest' && (
                    <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                      Đang chọn
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-tight">
                  Khớp lô mua đắt trước, hạ giá vốn CP còn lại
                </p>
              </button>

              {/* 3. FIFO */}
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, matchMethod: 'fifo' }))}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                  form.matchMethod === 'fifo'
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-500 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold flex items-center gap-1.5">
                    <span>⏱️</span> Theo ngày (FIFO)
                  </span>
                  {form.matchMethod === 'fifo' && (
                    <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-full font-bold">
                      Đang chọn
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-1 leading-tight">
                  Khớp lô mua sớm nhất trước theo chuẩn kế toán
                </p>
              </button>
            </div>
          </div>

          {/* MÔ PHỎNG GIÁ VỐN GỐC & LÃI/LỖ TRƯỚC KHI BÁN (LIVE P/L SIMULATOR) */}
          {costPreview && (
            <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-3.5 transition-all">
              <div className="flex items-center justify-between border-b border-amber-200/80 dark:border-amber-900/50 pb-2.5">
                <span className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5 text-xs sm:text-sm">
                  <span>🔍</span> Bóc Tách Giá Vốn Gốc Sẽ Khớp
                </span>
                <span className="text-[11px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-bold">
                  {costPreview.matched.length} lô ({
                    form.matchMethod === 'highest' ? '📈 Giá cao nhất' :
                    form.matchMethod === 'fifo' ? '⏱️ FIFO Mua sớm nhất' : '📉 Giá thấp nhất'
                  })
                </span>
              </div>

              {/* 2 Thống kê vốn */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-2xl border border-amber-100 dark:border-slate-700">
                  <span className="text-gray-500 dark:text-slate-400 text-[11px] block">Giá vốn gốc TB:</span>
                  <span className="text-base font-extrabold text-amber-900 dark:text-amber-300 mt-0.5 block">
                    {fmtMoney(costPreview.avgCost)}đ
                  </span>
                </div>
                <div className="bg-white/90 dark:bg-slate-800/90 p-3 rounded-2xl border border-amber-100 dark:border-slate-700">
                  <span className="text-gray-500 dark:text-slate-400 text-[11px] block">Tổng tiền vốn gốc:</span>
                  <span className="text-base font-extrabold text-gray-800 dark:text-slate-200 mt-0.5 block">
                    {fmtMoney(costPreview.totalCost)}đ
                  </span>
                </div>
              </div>

              {/* Danh sách các lô bị cắn trừ */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-amber-900 dark:text-amber-300 block">
                  Chi tiết các lô mua được sử dụng:
                </span>
                <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                  {costPreview.matched.map((m, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-white/80 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl text-[11px] border border-amber-100/60 dark:border-slate-700/60"
                    >
                      <span className="text-gray-600 dark:text-slate-300">
                        • Lô ngày {fmtDate(m.date)}: <b>{m.used.toLocaleString()} cp</b>
                      </span>
                      <span className="font-bold text-amber-800 dark:text-amber-300">
                        @{fmtMoney(m.unitCost)}đ
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* So sánh giá bán vs Vốn & Tính Lãi/Lỗ */}
              {costPreview.sellPrice && (
                <div className="pt-3 border-t border-amber-200/80 dark:border-amber-900/50 bg-white dark:bg-slate-800/90 p-3.5 rounded-2xl space-y-2 border border-amber-100 dark:border-slate-700">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-slate-400">So sánh đơn giá:</span>
                    <span className="font-bold text-gray-800 dark:text-slate-200">
                      Bán: <b className="text-rose-600 dark:text-rose-400">{fmtMoney(costPreview.sellPrice)}đ</b>
                      {' vs '}
                      Vốn: <b className="text-amber-700 dark:text-amber-300">{fmtMoney(costPreview.avgCost)}đ</b>
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-slate-400">Chênh lệch giá (chưa phí):</span>
                    <span className={`font-bold ${costPreview.sellPrice >= costPreview.avgCost ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {costPreview.sellPrice >= costPreview.avgCost ? '+' : ''}
                      {fmtMoney(costPreview.sellPrice - costPreview.avgCost)}đ / cp
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center text-xs sm:text-sm">
                    <span className="font-bold text-gray-700 dark:text-slate-300">
                      Dự kiến Lãi/Lỗ ròng (sau phí {form.feePct || DEFAULT_TRADE_FEE_PCT}%):
                    </span>
                    <span className={`font-extrabold text-sm sm:text-base ${plColor(costPreview.estPL)}`}>
                      {costPreview.estPL >= 0 ? '+' : ''}{fmtMoney(costPreview.estPL)}đ
                      {' '}({costPreview.estPLPct >= 0 ? '+' : ''}{costPreview.estPLPct}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PHÍ BÁN & NGÀY GIAO DỊCH */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                Phí Bán (%)
              </label>
              <div className="relative">
                <input
                  name="feePct"
                  value={form.feePct}
                  onChange={handleChange}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={String(DEFAULT_TRADE_FEE_PCT)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-extrabold text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 pr-9 transition-all"
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
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
              />
            </div>
          </div>

          {/* THẺ CHIẾN LƯỢC / LÝ DO BÁN */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                🏷️ Lý Do Bán / Chiến Lược <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">(Chọn 1 thẻ)</span>
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
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs ring-2 ring-rose-500/20'
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
                  className="text-xs px-3 py-1.5 rounded-xl font-bold bg-rose-600 text-white border-rose-600 shadow-2xs ring-2 ring-rose-500/20 cursor-pointer"
                >
                  ✓ {selectedTag}
                </button>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Nhập lý do khác..."
                className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
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

          {/* ĐÁNH GIÁ TÂM LÝ & KỶ LUẬT (TRADE REVIEW JOURNAL) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300">
                🧠 Đánh Giá Tâm Lý & Kỷ Luật <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">(Tự soi xét)</span>
              </label>
              {selectedDiscipline && (
                <button
                  type="button"
                  onClick={() => setSelectedDiscipline('')}
                  className="text-[11px] text-rose-500 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                >
                  ✕ Bỏ chọn
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Array.isArray(DISCIPLINE_TAGS) ? DISCIPLINE_TAGS : Object.values(DISCIPLINE_TAGS || {})).map(item => {
                const isSelected = selectedDiscipline === item.label;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setSelectedDiscipline(prev => (prev === item.label ? '' : item.label))}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? `${item.color} shadow-2xs font-extrabold ring-2 ring-indigo-500/30 border-current`
                        : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 text-gray-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold leading-tight">
                      {isSelected ? '✓ ' : ''}{item.label}
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {item.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* GHI CHÚ GIAO DỊCH */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
              Ghi Chú Giao Dịch
            </label>
            <input
              name="note"
              value={form.note}
              onChange={handleChange}
              placeholder="VD: Chốt lời kháng cự, cơ cấu danh mục..."
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 transition-all"
            />
          </div>

          {/* THÔNG BÁO LỖI */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-shake">
              <span>❌</span> {error}
            </div>
          )}

          {/* 🌟 THẺ TỔNG HỢP LÃI/LỖ THỜI GIAN THỰC (LIVE P/L HERO CARD) */}
          {costPreview && costPreview.sellPrice && (
            <div className={`p-4 sm:p-5 rounded-3xl border-2 transition-all shadow-sm ${
              costPreview.estPL >= 0
                ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500/60 text-emerald-950 dark:text-emerald-100 ring-4 ring-emerald-500/10'
                : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-500/60 text-rose-950 dark:text-rose-100 ring-4 ring-rose-500/10'
            }`}>
              {/* Header: Trạng thái & ROI % */}
              <div className="flex items-center justify-between pb-3 border-b border-current/15">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">{costPreview.estPL >= 0 ? '🎉' : '📉'}</span>
                  <div>
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider block">
                      {costPreview.estPL >= 0 ? 'Dự Kiến Chốt Lời Thành Công' : 'Dự Kiến Cắt Lỗ Bảo Toàn Vốn'}
                    </span>
                    <span className="text-[11px] opacity-75">
                      Khớp theo {form.matchMethod === 'highest' ? 'Giá vốn cao nhất' : form.matchMethod === 'fifo' ? 'FIFO Mua trước' : 'Giá vốn thấp nhất'}
                    </span>
                  </div>
                </div>
                <span className={`text-xs sm:text-sm font-black px-3 py-1 rounded-full ${
                  costPreview.estPL >= 0
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-rose-600 text-white shadow-xs'
                }`}>
                  {costPreview.estPLPct >= 0 ? '+' : ''}{costPreview.estPLPct}%
                </span>
              </div>

              {/* Con số Lãi/Lỗ trung tâm cực đại */}
              <div className="py-3 sm:py-4 text-center">
                <span className="text-[11px] sm:text-xs opacity-75 font-semibold block mb-0.5">
                  Lãi / Lỗ Ròng Dự Kiến (Sau phí {form.feePct || 0.1}%):
                </span>
                <span className={`text-2xl sm:text-4xl font-black tracking-tight ${
                  costPreview.estPL >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                }`}>
                  {costPreview.estPL >= 0 ? '+' : ''}{fmtMoney(costPreview.estPL)} <span className="text-base sm:text-xl font-bold">đồng</span>
                </span>
              </div>

              {/* 3 Trụ cột tài chính */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-current/15 text-center">
                <div className="bg-white/70 dark:bg-slate-800/70 p-2 sm:p-2.5 rounded-2xl border border-current/10">
                  <span className="text-[10px] sm:text-[11px] opacity-75 block font-medium">Tiền Thực Nhận</span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 block truncate">
                    {fmtMoney(costPreview.netRevenue)}đ
                  </span>
                </div>
                <div className="bg-white/70 dark:bg-slate-800/70 p-2 sm:p-2.5 rounded-2xl border border-current/10">
                  <span className="text-[10px] sm:text-[11px] opacity-75 block font-medium">Vốn Gốc Khớp</span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-0.5 block truncate">
                    {fmtMoney(costPreview.totalCost)}đ
                  </span>
                </div>
                <div className="bg-white/70 dark:bg-slate-800/70 p-2 sm:p-2.5 rounded-2xl border border-current/10">
                  <span className="text-[10px] sm:text-[11px] opacity-75 block font-medium">Chênh Lệch / CP</span>
                  <span className={`text-xs sm:text-sm font-extrabold mt-0.5 block truncate ${
                    costPreview.sellPrice >= costPreview.avgCost ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                  }`}>
                    {costPreview.sellPrice >= costPreview.avgCost ? '+' : ''}{fmtMoney(costPreview.sellPrice - costPreview.avgCost)}đ
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Gợi ý khi đã chọn mã & SL nhưng chưa nhập giá */}
          {costPreview && !costPreview.sellPrice && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-lg shrink-0">💡</span>
                <div className="truncate">
                  <span className="font-extrabold block">Đã chọn {Number(form.quantity).toLocaleString()} cp {form.symbol}</span>
                  <span className="text-indigo-600/80 dark:text-indigo-300/80 text-[11px] block mt-0.5">
                    Giá vốn TB: <b>{fmtMoney(costPreview.avgCost)}đ</b> · Nhập giá bán để xem Lãi/Lỗ ngay
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, price: String((costPreview.avgCost / 1000).toFixed(2)) }))}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold shrink-0 cursor-pointer shadow-xs transition-colors"
                title="Lấy giá vốn làm giá bán tham khảo (Hòa vốn)"
              >
                Lấy Giá Vốn
              </button>
            </div>
          )}

          {/* NÚT SUBMIT */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-700 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold py-3.5 rounded-2xl transition-all shadow-md shadow-rose-600/20 text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span> Đang xử lý lệnh bán...
              </>
            ) : (
              <>
                <span>💸</span>{' '}
                {form.symbol && Number(form.quantity) > 0
                  ? `Xác Nhận Bán ${Number(form.quantity).toLocaleString()} ${form.symbol}`
                  : 'Xác Nhận Bán'}
              </>
            )}
          </button>
        </form>
      </div>

      {/* 2. BIÊN BẢN KẾT QUẢ KHỚP LỆNH SAU KHI BÁN THÀNH CÔNG */}
      {result && (
        <div className={`rounded-3xl shadow-sm border p-5 sm:p-7 space-y-4 transition-all animate-fadeIn ${
          result.profitLoss >= 0
            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
            : 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
        }`}>
          <div className="flex items-center justify-between border-b border-gray-200/60 dark:border-slate-700/60 pb-3">
            <div>
              <h3 className={`font-extrabold text-base sm:text-lg ${result.profitLoss >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'}`}>
                {result.profitLoss >= 0 ? '🎉 Giao Dịch Bán Có Lãi!' : '📉 Giao Dịch Bán Cắt Lỗ'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Đã ghi nhận vào lịch sử giao dịch và cập nhật số dư
              </p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-extrabold ${plBg(result.profitLoss)}`}>
              {result.profitLossPct >= 0 ? '+' : ''}{result.profitLossPct}%
            </span>
          </div>

          {/* So sánh giá bán vs Vốn */}
          <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-gray-100 dark:border-slate-700">
              <span className="text-gray-500 dark:text-slate-400 text-xs block">💵 Giá bán thực tế</span>
              <span className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-slate-100 mt-0.5 block">
                {fmtMoney(result.price)}đ / cp
              </span>
              <span className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 block">
                Doanh thu: {fmtMoney(result.grossRevenue || result.quantity * result.price)}đ
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 border border-amber-200 dark:border-amber-900/60">
              <span className="text-amber-800 dark:text-amber-300 text-xs block">🏷️ Giá vốn gốc TB</span>
              <span className="text-base sm:text-lg font-extrabold text-amber-900 dark:text-amber-200 mt-0.5 block">
                {fmtMoney(result.totalCost / result.quantity)}đ / cp
              </span>
              <span className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 block">
                Tổng vốn gốc: {fmtMoney(result.totalCost)}đ
              </span>
            </div>
          </div>

          {/* Chi tiết tài chính */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-gray-100 dark:border-slate-700 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-slate-400">Khớp mã / Số lượng:</span>
              <span className="font-extrabold text-gray-800 dark:text-slate-100">{result.symbol} × {result.quantity.toLocaleString()} cp</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-slate-400">Phí giao dịch bán ({result.feePct}%):</span>
              <span className="text-gray-700 dark:text-slate-300">-{fmtMoney(result.fee || 0)}đ</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-slate-400">Tiền thực nhận sau phí:</span>
              <span className="font-extrabold text-indigo-700 dark:text-indigo-300">{fmtMoney(result.totalRevenue)}đ</span>
            </div>
            <div className="pt-2 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <span className="font-extrabold text-gray-800 dark:text-slate-200">Lãi / Lỗ thực hiện ròng:</span>
              <span className={`text-base sm:text-xl font-extrabold ${plColor(result.profitLoss)}`}>
                {result.profitLoss >= 0 ? '+' : ''}{fmtMoney(result.profitLoss)}đ
                <span className="text-xs sm:text-sm ml-1.5 font-bold">({result.profitLossPct >= 0 ? '+' : ''}{result.profitLossPct}%)</span>
              </span>
            </div>
          </div>

          {/* Danh sách các lô đã khớp */}
          {result.matchedLots && result.matchedLots.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-slate-400 block">
                📋 Danh sách {result.matchedLots.length} lô mua gốc đã khớp:
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {result.matchedLots.map((m, i) => {
                  const lotUnitCost = m.unitCost || m.buyPrice;
                  return (
                    <div
                      key={i}
                      className="flex justify-between items-center text-xs bg-white dark:bg-slate-800 rounded-xl p-2.5 border border-gray-100 dark:border-slate-700"
                    >
                      <div>
                        <span className="font-bold text-gray-800 dark:text-slate-100">
                          Lô {i + 1}: {m.quantityUsed.toLocaleString()} cp
                        </span>
                        {m.buyDate && (
                          <span className="text-gray-400 dark:text-slate-500 text-[11px] ml-2">
                            (Ngày: {fmtDate(m.buyDate)})
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-amber-800 dark:text-amber-300">
                          Giá vốn: {fmtMoney(lotUnitCost)}đ
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
