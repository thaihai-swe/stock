import { useState, useMemo } from 'react';
import { addDividend, deleteDividend } from '../utils/api.js';
import { fmtMoney, fmtDate, getTodayDate } from '../utils/format.js';

export default function DividendManager({ dividends = [], portfolio = [], onSuccess, showToast }) {
  const [type, setType] = useState('CASH'); // 'CASH' | 'STOCK'
  const [symbol, setSymbol] = useState('');
  const [date, setDate] = useState(getTodayDate());
  const [quantity, setQuantity] = useState('');
  const [amountPerShare, setAmountPerShare] = useState('');
  const [taxPct, setTaxPct] = useState('5'); // 5% thuế TNCN cổ tức ở VN
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Khi đổi mã CP, tự động điền số lượng đang nắm giữ (nếu có)
  function handleSelectSymbol(sym) {
    setSymbol(sym);
    const found = portfolio.find(p => p.symbol === sym);
    if (found && found.totalQty > 0) {
      setQuantity(String(found.totalQty));
    }
  }

  // Danh sách các mã có thể chọn
  const availableSymbols = useMemo(() => {
    return portfolio.map(p => p.symbol);
  }, [portfolio]);

  // Thống kê tổng hợp
  const stats = useMemo(() => {
    let totalCashNet = 0;
    let totalStockBonus = 0;
    for (const d of dividends) {
      if (d.type === 'CASH') totalCashNet += (d.netAmount || 0);
      if (d.type === 'STOCK') totalStockBonus += (d.quantity || 0);
    }
    return {
      totalCashNet,
      totalStockBonus,
      count: dividends.length,
    };
  }, [dividends]);

  // Tính trước tiền cổ tức tiền mặt
  const previewCash = useMemo(() => {
    if (type !== 'CASH') return null;
    const qty = parseInt(quantity) || 0;
    const amt = parseFloat(amountPerShare) || 0;
    const tax = parseFloat(taxPct) || 0;
    const gross = qty * amt;
    const taxAmt = Math.round(gross * (tax / 100));
    const net = gross - taxAmt;
    return { gross, taxAmt, net };
  }, [type, quantity, amountPerShare, taxPct]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!symbol.trim()) {
      setError('Vui lòng chọn hoặc nhập mã cổ phiếu.');
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      setError('Số lượng cổ phiếu phải lớn hơn 0.');
      return;
    }
    if (type === 'CASH' && (!amountPerShare || parseFloat(amountPerShare) <= 0)) {
      setError('Vui lòng nhập số tiền cổ tức trên mỗi cổ phiếu.');
      return;
    }

    setLoading(true);
    try {
      await addDividend({
        type,
        symbol: symbol.trim().toUpperCase(),
        date,
        quantity: parseInt(quantity),
        amountPerShare: type === 'CASH' ? parseFloat(amountPerShare) : 0,
        taxPct: type === 'CASH' ? parseFloat(taxPct) : 0,
        note,
      });

      // Reset form
      setQuantity('');
      setAmountPerShare('');
      setNote('');
      if (showToast) showToast(`✅ Đã thêm cổ tức mã ${symbol.trim().toUpperCase()}`, 'success');
      onSuccess();
    } catch (err) {
      setError(err.message);
      if (showToast) showToast('❌ ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, sym) {
    if (!confirm(`Bạn có chắc muốn xóa bản ghi cổ tức của mã ${sym}?`)) return;
    setDeletingId(id);
    try {
      await deleteDividend(id);
      if (showToast) showToast(`✅ Đã xóa bản ghi cổ tức mã ${sym}`, 'success');
      onSuccess();
    } catch (err) {
      if (showToast) showToast('❌ ' + err.message, 'error');
      else alert('❌ ' + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6 w-full">
      {/* Stat Cards Tổng Quan Cổ Tức */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            💵 Tổng Tiền Cổ Tức Thực Nhận
          </p>
          <div className="text-2xl font-bold text-emerald-600">
            +{fmtMoney(stats.totalCashNet)}đ
          </div>
          <div className="text-xs text-gray-400 mt-1">Đã khấu trừ thuế TNCN 5%</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            📈 Tổng Cổ Phiếu Thưởng Nhận Về
          </p>
          <div className="text-2xl font-bold text-indigo-600">
            +{stats.totalStockBonus.toLocaleString()} cp
          </div>
          <div className="text-xs text-gray-400 mt-1">Tự động cộng lô 0đ làm hạ giá vốn</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            🎁 Tổng Số Đợt Nhận Cổ Tức
          </p>
          <div className="text-2xl font-bold text-gray-800">
            {stats.count} đợt
          </div>
          <div className="text-xs text-gray-400 mt-1">Toàn bộ lịch sử chi trả</div>
        </div>
      </div>

      {/* Form Ghi Nhận Cổ Tức */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <span>🎁</span> Ghi Nhận Cổ Tức & Cổ Phiếu Thưởng
          </h2>
          <p className="text-emerald-100 text-sm mt-0.5">
            Ghi nhận theo Ngày GDKHQ để tự động điều chỉnh giá vốn và dòng tiền khớp với thị trường
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Chọn Loại Cổ Tức */}
          <div className="flex items-center gap-2 border-b border-gray-100 pb-4">
            <button
              type="button"
              onClick={() => setType('CASH')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                type === 'CASH'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>💵</span> Cổ Tức Tiền Mặt
            </button>
            <button
              type="button"
              onClick={() => setType('STOCK')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                type === 'STOCK'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>📈</span> Cổ Tức Bằng Cổ Phiếu / Thưởng
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Mã Cổ Phiếu */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                Mã Cổ Phiếu <span className="text-red-500">*</span>
              </label>
              {availableSymbols.length > 0 ? (
                <div className="space-y-1">
                  <select
                    value={symbol}
                    onChange={e => handleSelectSymbol(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                  >
                    <option value="">— Chọn mã CP —</option>
                    {availableSymbols.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <input
                  value={symbol}
                  onChange={e => setSymbol(e.target.value.toUpperCase())}
                  placeholder="VD: HPG, VNM..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm uppercase font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              )}
            </div>

            {/* Ngày Giao Dịch Không Hưởng Quyền (GDKHQ) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-600 uppercase">
                  Ngày GDKHQ <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                  Mặc định tính thực nhận
                </span>
              </div>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Ngày GD không hưởng quyền (Mặc định là ngày nhận & điều chỉnh giá vốn)
              </p>
            </div>

            {/* Số Lượng Cổ Phiếu */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                {type === 'CASH' ? 'SL Cổ Phiếu Hưởng Quyền' : 'SL Cổ Phiếu Thưởng Về'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="VD: 1000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>

          {/* Nếu là Cổ Tức Tiền Mặt */}
          {type === 'CASH' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100">
              <div>
                <label className="block text-xs font-semibold text-emerald-900 uppercase mb-1">
                  Tiền Cổ Tức / 1 Cổ Phiếu (VNĐ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={amountPerShare}
                  onChange={e => setAmountPerShare(e.target.value)}
                  placeholder="VD: 1000 (= 1.000đ/cp)"
                  className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-900 uppercase mb-1">
                  Thuế TNCN (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={taxPct}
                    onChange={e => setTaxPct(e.target.value)}
                    placeholder="5"
                    className="w-24 bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm font-semibold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                  <span className="text-xs text-gray-500">(Theo luật Thuế TNCN tại Việt Nam là 5%)</span>
                </div>
              </div>

              {previewCash && previewCash.gross > 0 && (
                <div className="sm:col-span-2 bg-white p-3 rounded-xl border border-emerald-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Tổng tiền gộp:</span>
                    <b className="text-gray-800 ml-1">{fmtMoney(previewCash.gross)}đ</b>
                  </div>
                  <div>
                    <span className="text-gray-500">Thuế TNCN ({taxPct}%):</span>
                    <b className="text-red-500 ml-1">-{fmtMoney(previewCash.taxAmt)}đ</b>
                  </div>
                  <div className="text-sm">
                    <span className="text-emerald-800 font-semibold">Thực nhận về TK:</span>
                    <b className="text-emerald-600 text-base ml-1">+{fmtMoney(previewCash.net)}đ</b>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nếu là Cổ Tức Cổ Phiếu */}
          {type === 'STOCK' && (
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2.5">
              <span className="text-lg">💡</span>
              <p className="leading-relaxed">
                Khi ghi nhận, hệ thống sẽ <b>tự động thêm một lô cổ phiếu 0đ</b> vào danh mục nắm giữ. Nhờ đó, tổng số lượng cổ phiếu sẽ tăng lên và <b>giá vốn trung bình sẽ tự động giảm xuống</b> một cách chính xác theo đúng cơ chế điều chỉnh giá của sàn HOSE/HNX.
              </p>
            </div>
          )}

          {/* Ghi Chú */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
              Ghi Chú Đợt Chi Trả
            </label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="VD: Cổ tức đợt 1 năm 2024, tỷ lệ 10:1..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-4 py-2.5">
              ❌ {error}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors shadow-xs"
            >
              {loading ? 'Đang lưu...' : '+ Ghi Nhận Cổ Tức'}
            </button>
          </div>
        </form>
      </div>

      {/* Danh Sách Cổ Tức Đã Nhận */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <span>📋</span> Lịch Sử Nhận Cổ Tức ({dividends.length})
          </h3>
        </div>

        {dividends.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-4xl mb-2">🎁</p>
            <p className="font-medium text-gray-600">Chưa có bản ghi cổ tức nào</p>
            <p className="text-xs text-gray-400 mt-1">Ghi nhận các đợt nhận tiền mặt hoặc cổ phiếu thưởng ở khung phía trên</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3.5">Mã CP</th>
                  <th className="text-left px-4 py-3.5">Loại Cổ Tức</th>
                  <th className="text-left px-4 py-3.5">Ngày GDKHQ</th>
                  <th className="text-right px-4 py-3.5">Số Lượng</th>
                  <th className="text-right px-5 py-3.5">Giá Trị / Thực Nhận</th>
                  <th className="text-left px-5 py-3.5">Ghi Chú</th>
                  <th className="text-right px-5 py-3.5">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dividends.map(item => {
                  const isCash = item.type === 'CASH';
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      {/* Mã CP */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 shadow-2xs">
                          {item.symbol}
                        </span>
                      </td>

                      {/* Loại */}
                      <td className="px-4 py-4">
                        {isCash ? (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                            💵 Tiền mặt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800">
                            📈 Cổ phiếu thưởng
                          </span>
                        )}
                      </td>

                      {/* Ngày nhận */}
                      <td className="px-4 py-4 text-xs text-gray-600 whitespace-nowrap">
                        {fmtDate(item.date)}
                      </td>

                      {/* Số lượng */}
                      <td className="px-4 py-4 text-right font-semibold text-gray-800">
                        {item.quantity?.toLocaleString()} cp
                      </td>

                      {/* Thực nhận */}
                      <td className="px-5 py-4 text-right">
                        {isCash ? (
                          <div>
                            <div className="font-bold text-emerald-600 text-base">
                              +{fmtMoney(item.netAmount)}đ
                            </div>
                            <div className="text-[11px] text-gray-400">
                              ({fmtMoney(item.amountPerShare)}đ/cp - thuế {item.taxPct}%)
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-indigo-700 text-base">
                              +{item.quantity?.toLocaleString()} cp
                            </div>
                            <div className="text-[11px] text-gray-400">
                              (Lô 0đ hạ giá vốn)
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Ghi chú */}
                      <td className="px-5 py-4 text-gray-600 text-xs max-w-xs">
                        {item.note || '—'}
                      </td>

                      {/* Thao tác */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(item.id, item.symbol)}
                          disabled={deletingId === item.id}
                          className="text-red-400 hover:text-red-600 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
                          title="Xóa bản ghi cổ tức"
                        >
                          {deletingId === item.id ? '...' : '🗑️ Xóa'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
