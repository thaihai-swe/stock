import { useEffect, useMemo, useState } from 'react';
import { addSellOrder } from '../utils/api.js';
import { DEFAULT_TAGS, DISCIPLINE_TAGS, fmtDate, fmtMoney, getTodayDate, plBg, plColor } from '../utils/format.js';

export default function SellForm({ onSuccess, portfolio = [], initialSymbol = '' }) {
  const [form, setForm] = useState({
    symbol: initialSymbol || '',
    quantity: '100',
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
  }, [available, form.quantity, form.price, form.feePct]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    if (!form.symbol || !form.quantity || !form.price) {
      setError('Vui lòng điền đầy đủ mã CP, số lượng và giá.');
      return;
    }
    if (Number(form.quantity) <= 0) {
      setError('Số lượng cổ phiếu bán phải lớn hơn 0.');
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
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Form Nhập Lệnh */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-orange-500 px-6 py-5">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <span>💸</span> Nhập Lệnh Bán Cổ Phiếu
          </h2>
          <p className="text-orange-100 text-sm mt-0.5">
            Tùy chọn khớp linh hoạt theo giá thấp nhất, giá cao nhất hoặc FIFO
          </p>
        </div>

        <form noValidate onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Symbol + Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã cổ phiếu cần bán <span className="text-red-500">*</span>
              </label>
              <select
                name="symbol"
                value={form.symbol}
                onChange={handleChange}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              >
                <option value="">
                  {portfolio.length === 0
                    ? '— Chưa có CP trong danh mục —'
                    : '— Chọn cổ phiếu cần bán —'}
                </option>
                {portfolio.filter(p => p.totalQty > 0).map(p => (
                  <option key={p.symbol} value={p.symbol}>
                    {p.symbol} (Có sẵn: {p.totalQty.toLocaleString()} cp - Vốn TB: {fmtMoney(p.avgCost)}đ)
                  </option>
                ))}
              </select>
              {form.symbol && (
                <p className="text-xs mt-1">
                  {maxQty > 0 ? (
                    <span className="text-green-600">
                      Có thể bán: <b>{maxQty.toLocaleString()}</b> cp (vốn TB: {fmtMoney(available.avgCost)}đ)
                    </span>
                  ) : (
                    <span className="text-red-500">Mã này không còn số lượng khả dụng để bán</span>
                  )}
                </p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Số lượng bán <span className="text-red-500">*</span>
                </label>
                {maxQty > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, quantity: String(maxQty) }))}
                      className="text-[11px] bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded transition-colors border border-orange-200"
                      title="Bán tất cả số lượng đang có"
                    >
                      Tất cả ({maxQty.toLocaleString()})
                    </button>
                    {maxQty >= 200 && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, quantity: String(Math.floor(maxQty / 2)) }))}
                        className="text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-1.5 py-0.5 rounded transition-colors"
                      >
                        50%
                      </button>
                    )}
                  </div>
                )}
              </div>
              <input
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
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
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giá bán (x1.000đ) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                name="price"
                value={form.price}
                onChange={handleChange}
                type="number"
                step="any"
                min="0.001"
                placeholder="VD: 26.5 (= 26.500đ)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 pr-20"
              />
              <span className="absolute right-2.5 top-2 text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                × 1.000đ
              </span>
            </div>
            {form.price && !isNaN(Number(form.price)) && (
              <div className="mt-1 text-xs space-y-0.5">
                <p className="text-gray-600 font-medium">
                  💵 Giá bán quy đổi: <span className="text-orange-600 font-bold">{fmtMoney(Number(form.price) * 1000)}đ</span> / cổ phiếu
                </p>
                {Number(form.price) >= 1000 && (
                  <p className="text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                    ⚠️ Bạn đang nhập <b>{form.price}</b>. Hệ thống tự động nhân 1.000đ thành <b>{fmtMoney(Number(form.price) * 1000)}đ</b>. Nếu giá bán thực tế là {fmtMoney(Number(form.price))}đ, bạn chỉ cần nhập <b>{Number(form.price) / 1000}</b>.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Phương Thức Ưu Tiên Khớp Lô Mua */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center justify-between">
              <span>Phương thức ưu tiên khớp lô mua:</span>
              <span className="text-[11px] text-gray-400 font-normal">Tự động đối chiếu lô gốc</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* 1. Giá thấp nhất */}
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, matchMethod: 'lowest' }))}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${(form.matchMethod || 'lowest') === 'lowest'
                  ? 'bg-orange-50/80 border-orange-400 text-orange-950 ring-2 ring-orange-400/20 shadow-2xs'
                  : 'bg-white border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <span>📉</span> Giá thấp nhất
                  </span>
                  {(form.matchMethod || 'lowest') === 'lowest' && (
                    <span className="text-[10px] bg-orange-600 text-white px-1.5 py-0.2 rounded-full font-bold">✓ Đang chọn</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-1 leading-tight">
                  Khớp lô mua rẻ trước, tối đa hóa lợi nhuận chốt ngay
                </p>
              </button>

              {/* 2. Giá cao nhất */}
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, matchMethod: 'highest' }))}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${form.matchMethod === 'highest'
                  ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 ring-2 ring-indigo-400/20 shadow-2xs'
                  : 'bg-white border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <span>📈</span> Giá cao nhất
                  </span>
                  {form.matchMethod === 'highest' && (
                    <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded-full font-bold">✓ Đang chọn</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-1 leading-tight">
                  Khớp lô mua đắt trước, giúp hạ giá vốn CP còn lại
                </p>
              </button>

              {/* 3. FIFO */}
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, matchMethod: 'fifo' }))}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${form.matchMethod === 'fifo'
                  ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 ring-2 ring-emerald-400/20 shadow-2xs'
                  : 'bg-white border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <span>⏱️</span> Theo ngày (FIFO)
                  </span>
                  {form.matchMethod === 'fifo' && (
                    <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2 rounded-full font-bold">✓ Đang chọn</span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-1 leading-tight">
                  Khớp lô mua sớm nhất trước theo thứ tự thời gian
                </p>
              </button>
            </div>
          </div>

          {/* BẢNG XEM TRƯỚC GIÁ VỐN GỐC (Trực quan trước khi bán) */}
          {costPreview && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                <span className="font-bold text-amber-900 flex items-center gap-1.5 text-sm">
                  <span>🔍</span> Thông Tin Giá Vốn Gốc Sẽ Khớp
                </span>
                <span className="text-[11px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-semibold">
                  {costPreview.matched.length} lô ({
                    form.matchMethod === 'highest' ? '📈 Giá cao nhất' :
                      form.matchMethod === 'fifo' ? '⏱️ Mua sớm nhất (FIFO)' : '📉 Giá thấp nhất'
                  })
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-gray-700">
                <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                  <p className="text-gray-500 text-[11px]">Giá vốn gốc trung bình:</p>
                  <p className="text-base font-bold text-amber-900 mt-0.5">
                    {fmtMoney(costPreview.avgCost)}đ

                  </p>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                  <p className="text-gray-500 text-[11px]">Tổng tiền vốn gốc đã bỏ ra:</p>
                  <p className="text-base font-bold text-gray-800 mt-0.5">
                    {fmtMoney(costPreview.totalCost)}đ
                  </p>
                </div>
              </div>

              {/* Chi tiết từng lô khớp */}
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-amber-900">Chi tiết các lô mua được sử dụng:</p>
                {costPreview.matched.map((m, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white/80 px-2.5 py-1 rounded text-[11px]">
                    <span className="text-gray-600">
                      • Lô ngày {fmtDate(m.date)}: <b>{m.used.toLocaleString()} cp</b>
                    </span>

                  </div>
                ))}
              </div>

              {/* So sánh trực tiếp Giá Bán vs Giá Vốn */}
              {costPreview.sellPrice && (
                <div className="pt-2 border-t border-amber-200/80 bg-white p-3 rounded-lg flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">So sánh giá mỗi cổ phiếu:</span>
                    <span className="font-semibold text-gray-800">
                      Bán: <b className="text-orange-600">{fmtMoney(costPreview.sellPrice)}đ</b>
                      {' vs '}
                      Vốn: <b className="text-amber-700">{fmtMoney(costPreview.avgCost)}đ</b>
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Chênh lệch giá (chưa phí):</span>
                    <span className={`font-bold ${costPreview.sellPrice >= costPreview.avgCost ? 'text-green-600' : 'text-red-500'}`}>
                      {costPreview.sellPrice >= costPreview.avgCost ? '+' : ''}
                      {fmtMoney(costPreview.sellPrice - costPreview.avgCost)}đ/cp
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-100">
                    <span className="font-semibold text-gray-700">Dự kiến Lãi / Lỗ thực nhận (sau phí {form.feePct || 0.1}%):</span>
                    <span className={`font-bold text-sm ${plColor(costPreview.estPL)}`}>
                      {costPreview.estPL >= 0 ? '+' : ''}{fmtMoney(costPreview.estPL)}đ
                      {' '}({costPreview.estPLPct >= 0 ? '+' : ''}{costPreview.estPLPct}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fee + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phí bán (%)
              </label>
              <div className="relative">
                <input
                  name="feePct"
                  value={form.feePct}
                  onChange={handleChange}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.1"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 pr-8"
                />
                <span className="absolute right-3 top-2 text-gray-400 text-sm">%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Mặc định: 0.1%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày giao dịch</label>
              <input
                name="date"
                value={form.date}
                onChange={handleChange}
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <p className="text-xs text-gray-400 mt-1">Mặc định là hôm nay</p>
            </div>
          </div>

          {/* Tags Selector (Trading Strategy Journal) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                🏷️ Thẻ lý do bán / chiến lược <span className="text-xs text-orange-600 font-semibold">(Chọn 1 chiến lược)</span>
              </label>
              {selectedTag && (
                <button
                  type="button"
                  onClick={() => setSelectedTag('')}
                  className="text-[11px] text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                >
                  ✕ Bỏ chọn
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-2">
              Chọn duy nhất 1 chiến lược để đo lường hiệu suất và tỷ lệ thắng chuẩn xác nhất
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {DEFAULT_TAGS.map(t => {
                const isSelected = selectedTag === t;
                return (
                  <button
                    type="button"
                    key={t}
                    onClick={() => selectTag(t)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all cursor-pointer ${isSelected
                      ? 'bg-orange-600 text-white shadow-xs font-bold ring-2 ring-orange-400/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
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
                  className="text-xs px-2.5 py-1 rounded-full font-bold bg-orange-600 text-white shadow-xs ring-2 ring-orange-400/30 cursor-pointer"
                >
                  ✓ {selectedTag}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Nhập lý do / chiến lược khác..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
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
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium cursor-pointer"
              >
                + Chọn
              </button>
            </div>
          </div>

          {/* Psychological Review & Discipline Assessment */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                🧠 Đánh giá tâm lý & kỷ luật <span className="text-xs text-indigo-600 font-semibold">(Tự soi xét bản thân)</span>
              </label>
              {selectedDiscipline && (
                <button
                  type="button"
                  onClick={() => setSelectedDiscipline('')}
                  className="text-[11px] text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                >
                  ✕ Bỏ chọn
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mb-2">
              Ghi nhận tâm lý khi chốt lệnh bán để rèn luyện kỷ luật và tránh mắc lỗi lặp lại
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DISCIPLINE_TAGS.map(item => {
                const isSelected = selectedDiscipline === item.label;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setSelectedDiscipline(prev => (prev === item.label ? '' : item.label))}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${isSelected
                      ? `${item.color} shadow-xs font-semibold ring-2 ring-indigo-400/40 border-current`
                      : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 text-gray-700 dark:text-slate-300'
                      }`}
                  >
                    <div className="text-xs font-medium leading-tight">
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

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú giao dịch</label>
            <input
              name="note"
              value={form.note}
              onChange={handleChange}
              placeholder="VD: Chốt lời kháng cự, cơ cấu danh mục..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-base shadow-sm"
          >
            {loading ? '⏳ Đang xử lý...' : '💸 Xác Nhận Bán & Tính Lãi/Lỗ'}
          </button>
        </form>
      </div>

      {/* Kết quả sau khi bán - HIỂN THỊ RÕ GIÁ VỐN GỐC & GIÁ BÁN */}
      {result && (
        <div className={`rounded-2xl shadow-sm border p-6 ${result.profitLoss >= 0 ? 'bg-green-50/80 border-green-200' : 'bg-red-50/80 border-red-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-bold text-lg ${result.profitLoss >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {result.profitLoss >= 0 ? '🎉 Giao dịch có lãi!' : '📉 Giao dịch lỗ'}
            </h3>
            <span className={`text-xs px-3 py-1 rounded-full font-bold ${plBg(result.profitLoss)}`}>
              {result.profitLossPct >= 0 ? '+' : ''}{result.profitLossPct}%
            </span>
          </div>

          {/* Khối so sánh Giá Bán vs Giá Vốn Gốc */}
          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
            <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-2xs">
              <p className="text-gray-500 text-xs font-medium">💵 Giá bán thực tế</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">
                {fmtMoney(result.price)}đ/cp
              </p>

              <p className="text-[11px] text-gray-400 mt-1">
                Tổng doanh thu: {fmtMoney(result.grossRevenue || result.quantity * result.price)}đ
              </p>
            </div>

            <div className="bg-white rounded-xl p-3 border border-amber-200 shadow-2xs">
              <p className="text-amber-800 text-xs font-medium">🏷️ Giá vốn gốc trung bình</p>
              <p className="text-lg font-bold text-amber-900 mt-0.5">
                {fmtMoney(result.totalCost / result.quantity)}đ/cp
              </p>

              <p className="text-[11px] text-gray-400 mt-1">
                Tổng tiền vốn gốc: {fmtMoney(result.totalCost)}đ
              </p>
            </div>
          </div>

          {/* Khối kết quả tài chính */}
          <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-2 text-sm shadow-2xs mb-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Mã / Số lượng khớp:</span>
              <span className="font-bold text-gray-800">{result.symbol} × {result.quantity.toLocaleString()} cp</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Chênh lệch giá bán vs vốn gốc:</span>
              <span className={`font-semibold ${result.price >= (result.totalCost / result.quantity) ? 'text-green-600' : 'text-red-500'}`}>
                {result.price >= (result.totalCost / result.quantity) ? '+' : ''}
                {fmtMoney(result.price - (result.totalCost / result.quantity))}đ/cp
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Phí giao dịch bán ({result.feePct}%):</span>
              <span className="text-gray-700">-{fmtMoney(result.fee || 0)}đ</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Tiền thực nhận sau phí:</span>
              <span className="font-semibold text-indigo-700">{fmtMoney(result.totalRevenue)}đ</span>
            </div>
            <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
              <span className="font-bold text-gray-700">Lãi / Lỗ thực hiện ròng:</span>
              <span className={`text-xl font-bold ${plColor(result.profitLoss)}`}>
                {result.profitLoss >= 0 ? '+' : ''}{fmtMoney(result.profitLoss)}đ
                <span className="text-sm ml-1.5 font-semibold">({result.profitLossPct >= 0 ? '+' : ''}{result.profitLossPct}%)</span>
              </span>
            </div>
          </div>

          {/* Chi tiết từng lô mua gốc đã khớp */}
          <div>
            <p className="text-xs font-bold text-gray-700 uppercase mb-2">
              📋 Danh sách các lô mua gốc đã khớp ({
                result.matchMethod === 'highest' ? 'giá cao nhất trước' :
                  result.matchMethod === 'fifo' ? 'theo ngày mua FIFO' : 'giá thấp nhất trước'
              })
            </p>
            <div className="space-y-1.5">
              {result.matchedLots.map((m, i) => {
                const lotUnitCost = m.unitCost || m.buyPrice;
                return (
                  <div key={i} className="flex justify-between items-center text-xs bg-white rounded-lg p-2.5 border border-gray-100">
                    <div>
                      <span className="font-semibold text-gray-800">Lô {i + 1}: {m.quantityUsed.toLocaleString()} cp</span>
                      {m.buyDate && <span className="text-gray-400 text-[11px] ml-2">(Ngày mua: {fmtDate(m.buyDate)})</span>}
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-900">
                        Giá gốc: {fmtMoney(lotUnitCost)}đ/cp
                      </div>
                      <div className="text-[11px] text-gray-400">
                        Thành tiền vốn: {fmtMoney(m.quantityUsed * lotUnitCost)}đ
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
