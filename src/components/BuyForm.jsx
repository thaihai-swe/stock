import { useEffect, useState } from 'react';
import { addBuyOrder } from '../utils/api.js';
import { DEFAULT_TAGS, fmtMoney, getTodayDate } from '../utils/format.js';

export default function BuyForm({ onSuccess, initialSymbol = '', initialQuantity = '', initialPrice = '' }) {
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
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
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
        symbol: form.symbol,
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
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-indigo-600 px-6 py-5">
          <h2 className="text-white font-semibold text-lg">🛒 Nhập Lệnh Mua</h2>
          <p className="text-indigo-200 text-sm mt-0.5">Ghi nhận giao dịch mua cổ phiếu</p>
        </div>

        <form noValidate onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Symbol + Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã cổ phiếu <span className="text-red-500">*</span>
              </label>
              <input
                name="symbol"
                value={form.symbol}
                onChange={handleChange}
                placeholder="VD: VNM, HPG..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Số lượng <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, quantity: String((Number(f.quantity) || 0) + 100) }))}
                    className="text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded transition-colors"
                    title="Cộng thêm 100 cổ phiếu"
                  >
                    +100
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, quantity: String((Number(f.quantity) || 0) + 500) }))}
                    className="text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded transition-colors"
                    title="Cộng thêm 500 cổ phiếu"
                  >
                    +500
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, quantity: String((Number(f.quantity) || 0) + 1000) }))}
                    className="text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded transition-colors"
                    title="Cộng thêm 1.000 cổ phiếu"
                  >
                    +1.000
                  </button>
                </div>
              </div>
              <input
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
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
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giá mua (x1.000đ) <span className="text-red-500">*</span>
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
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-20"
              />
              <span className="absolute right-2.5 top-2 text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                × 1.000đ
              </span>
            </div>
            {form.price && !isNaN(Number(form.price)) && (
              <div className="mt-1 text-xs space-y-0.5">
                <p className="text-gray-600 font-medium">
                  💵 Quy đổi: <span className="text-indigo-600 font-bold">{fmtMoney(Number(form.price) * 1000)}đ</span> / cổ phiếu
                </p>
                {form.quantity && (
                  <>
                    <p className="text-indigo-600 font-medium">
                      Tiền mua cổ phiếu: {(Number(form.price) * 1000 * Number(form.quantity)).toLocaleString('vi-VN')}đ
                    </p>
                    {Number(form.feePct || 0) > 0 && (
                      <p className="text-gray-500">
                        Phí mua ({form.feePct}%): +{fmtMoney(Number(form.price) * 1000 * Number(form.quantity) * (Number(form.feePct) / 100))}đ
                        {' → '}
                        <b className="text-gray-800">Tổng thanh toán: {fmtMoney(Number(form.price) * 1000 * Number(form.quantity) * (1 + Number(form.feePct) / 100))}đ</b>
                      </p>
                    )}
                  </>
                )}
                {Number(form.price) >= 1000 && (
                  <p className="text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                    ⚠️ Bạn đang nhập <b>{form.price}</b>. Hệ thống tự động nhân 1.000đ thành <b>{fmtMoney(Number(form.price) * 1000)}đ</b>. Nếu giá mua thực tế là {fmtMoney(Number(form.price))}đ, bạn chỉ cần nhập <b>{Number(form.price) / 1000}</b>.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Fee + Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phí mua (%)
              </label>
              <div className="relative">
                <input
                  name="feePct"
                  value={form.feePct}
                  onChange={handleChange}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 pr-8"
                />
                <span className="absolute right-3 top-2 text-gray-400 text-sm">%</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Mặc định: 0%</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ngày giao dịch</label>
              <input
                name="date"
                value={form.date}
                onChange={handleChange}
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <p className="text-xs text-gray-400 mt-1">Mặc định là hôm nay</p>
            </div>
          </div>

          {/* Tags Selector (Trading Strategy Journal) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                🏷️ Chiến lược đầu tư <span className="text-xs text-indigo-600 font-semibold">(Chọn 1 chiến lược)</span>
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
              Chọn duy nhất 1 chiến lược cho mỗi lệnh để thống kê tỷ lệ thắng và hiệu suất danh mục chính xác nhất
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
                      ? 'bg-indigo-600 text-white shadow-xs font-bold ring-2 ring-indigo-400/30'
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
                  className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400/30 cursor-pointer"
                >
                  ✓ {selectedTag}
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Nhập chiến lược khác..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
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

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú chiến lược</label>
            <input
              name="note"
              value={form.note}
              onChange={handleChange}
              placeholder="VD: Mua test nền giá, KQKD Q3 khả quan..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Error / Success */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              ❌ {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            {loading ? '⏳ Đang lưu...' : '+ Thêm Lệnh Mua'}
          </button>
        </form>
      </div>
    </div>
  );
}
