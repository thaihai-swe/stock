import { useState, useMemo } from 'react';
import { addDividend, deleteDividend } from '../utils/api.js';
import { fmtMoney, fmtDate, getTodayDate } from '../utils/format.js';
import { DIVIDEND_CASH_TAX_PCT } from '../utils/constants.js';

export default function DividendManager({
  dividends = [],
  portfolio = [],
  onSuccess,
  showToast,
}) {
  const [type, setType] = useState('CASH'); // 'CASH' | 'STOCK'
  const [symbol, setSymbol] = useState('');
  const [date, setDate] = useState(getTodayDate());
  const [quantity, setQuantity] = useState('');
  const [amountPerShare, setAmountPerShare] = useState('');
  const [taxPct, setTaxPct] = useState(String(DIVIDEND_CASH_TAX_PCT)); // Thuế TNCN cổ tức theo luật VN
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

  // Danh sách các mã có thể chọn từ portfolio
  const availableSymbols = useMemo(() => {
    return portfolio.map(p => p.symbol);
  }, [portfolio]);

  // Thống kê tổng hợp cổ tức
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

  // Tính trước tiền cổ tức tiền mặt thời gian thực
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
      if (onSuccess) onSuccess();
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
      if (onSuccess) onSuccess();
    } catch (err) {
      if (showToast) showToast('❌ ' + err.message, 'error');
      else alert('❌ ' + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. STAT CARDS TỔNG QUAN CỔ TỨC (3 KPI CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
          <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            💵 Tiền Cổ Tức Thực Nhận
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            +{fmtMoney(stats.totalCashNet)}đ
          </div>
          <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
            Đã trừ 5% thuế TNCN tự động
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
          <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            📈 Cổ Phiếu Thưởng Nhận Về
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">
            +{stats.totalStockBonus.toLocaleString()} cp
          </div>
          <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
            Tự động tạo lô 0đ làm hạ giá vốn
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-gray-100 dark:border-slate-800 shadow-sm transition-colors">
          <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            🎁 Tổng Số Đợt Nhận
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
            {stats.count} đợt
          </div>
          <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-1">
            Lịch sử chi trả toàn thời gian
          </div>
        </div>
      </div>

      {/* 2. FORM GHI NHẬN CỔ TỨC */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-teal-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl p-2 rounded-2xl bg-white/10 backdrop-blur-xs">🎁</span>
              <div>
                <h2 className="font-extrabold text-lg sm:text-xl tracking-tight">
                  Ghi Nhận Cổ Tức & Cổ Phiếu Thưởng
                </h2>
                <p className="text-amber-100 text-xs sm:text-sm mt-0.5 font-medium">
                  Hạch toán theo ngày GDKHQ để tự động điều chỉnh giá vốn & dòng tiền
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block text-[11px] font-bold px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs border border-white/20">
              Quyền Cổ Tức
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5">
          {/* CHỌN LOẠI CỔ TỨC (TIỀN MẶT vs CỔ PHIẾU) */}
          <div className="grid grid-cols-2 gap-2.5 p-1.5 rounded-2xl bg-gray-100 dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setType('CASH')}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                type === 'CASH'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>💵</span> Cổ Tức Tiền Mặt
            </button>
            <button
              type="button"
              onClick={() => setType('STOCK')}
              className={`py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                type === 'STOCK'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <span>📈</span> Cổ Tức Bằng Cổ Phiếu
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Mã Cổ Phiếu */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                Mã Cổ Phiếu <span className="text-red-500">*</span>
              </label>
              {availableSymbols.length > 0 ? (
                <select
                  value={symbol}
                  onChange={e => handleSelectSymbol(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-extrabold uppercase text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
                >
                  <option value="">— Chọn mã CP —</option>
                  {availableSymbols.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <input
                  value={symbol}
                  onChange={e => setSymbol(e.target.value.toUpperCase())}
                  placeholder="VD: HPG, VNM..."
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm uppercase font-extrabold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              )}
            </div>

            {/* Ngày Giao Dịch Không Hưởng Quyền (GDKHQ) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                Ngày GDKHQ <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>

            {/* Số Lượng Cổ Phiếu */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                {type === 'CASH' ? 'SL Hưởng Quyền' : 'SL Thưởng Về'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="VD: 1000"
                className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-extrabold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>
          </div>

          {/* NẾU LÀ CỔ TỨC TIỀN MẶT */}
          {type === 'CASH' && (
            <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 mb-1.5">
                    Tiền Cổ Tức / 1 Cổ Phiếu (VNĐ) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    value={amountPerShare}
                    onChange={e => setAmountPerShare(e.target.value)}
                    placeholder="VD: 1000 (= 1.000đ/cp)"
                    className="w-full bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-extrabold text-amber-900 dark:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 mb-1.5">
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
                      className="w-24 bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-extrabold text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-xs text-gray-500 dark:text-slate-400">
                      (Luật Thuế TNCN cổ tức ở VN là 5%)
                    </span>
                  </div>
                </div>
              </div>

              {previewCash && previewCash.gross > 0 && (
                <div className="bg-white dark:bg-slate-800/90 p-3.5 rounded-2xl border border-amber-200/80 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-slate-400">Tổng tiền gộp:</span>
                    <b className="text-gray-800 dark:text-slate-200 ml-1.5">{fmtMoney(previewCash.gross)}đ</b>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-slate-400">Thuế TNCN ({taxPct}%):</span>
                    <b className="text-rose-600 dark:text-rose-400 ml-1.5">-{fmtMoney(previewCash.taxAmt)}đ</b>
                  </div>
                  <div>
                    <span className="text-emerald-800 dark:text-emerald-300 font-bold">Thực nhận về TK:</span>
                    <b className="text-emerald-600 dark:text-emerald-400 text-sm sm:text-base ml-1.5 font-extrabold">
                      +{fmtMoney(previewCash.net)}đ
                    </b>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* NẾU LÀ CỔ TỨC BẰNG CỔ PHIẾU */}
          {type === 'STOCK' && (
            <div className="p-4 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/60 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-3">
              <span className="text-xl">💡</span>
              <p className="leading-relaxed">
                Hệ thống sẽ <b>tự động tạo một lô cổ phiếu giá 0đ</b> trong danh mục. Nhờ đó, tổng số lượng cổ phiếu của bạn sẽ tăng lên và <b>giá vốn bình quân sẽ tự động giảm xuống</b> một cách chính xác theo đúng cơ chế điều chỉnh giá của sàn HOSE.
              </p>
            </div>
          )}

          {/* GHI CHÚ */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
              Ghi Chú Đợt Chi Trả
            </label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="VD: Cổ tức đợt 1 năm 2024, tỷ lệ 10:1..."
              className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-slate-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            />
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-shake">
              <span>❌</span> {error}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold px-8 py-3.5 rounded-2xl transition-all shadow-md shadow-amber-500/20 text-sm cursor-pointer"
            >
              {loading ? 'Đang lưu...' : '+ Ghi Nhận Cổ Tức'}
            </button>
          </div>
        </form>
      </div>

      {/* 3. LỊCH SỬ CỔ TỨC (RESPONSIVE: DESKTOP TABLE + MOBILE CARD VIEW) */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden transition-colors">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-extrabold text-gray-900 dark:text-slate-100 text-sm sm:text-base flex items-center gap-2">
            <span>📋</span> Lịch Sử Nhận Cổ Tức ({dividends.length})
          </h3>
        </div>

        {dividends.length === 0 ? (
          <div className="py-12 text-center text-gray-400 dark:text-slate-500">
            <p className="text-4xl mb-2">🎁</p>
            <p className="font-bold text-gray-700 dark:text-slate-300 text-sm">Chưa có bản ghi cổ tức nào</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">Ghi nhận các đợt nhận tiền mặt hoặc cổ phiếu thưởng ở khung phía trên</p>
          </div>
        ) : (
          <div>
            {/* CHẾ ĐỘ THẺ TRÊN MOBILE (<768px) */}
            <div className="block md:hidden p-4 space-y-3">
              {dividends.map(item => {
                const isCash = item.type === 'CASH';
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-gray-50/80 dark:bg-slate-800/60 border border-gray-200/80 dark:border-slate-700 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm px-2.5 py-1 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                          {item.symbol}
                        </span>
                        {isCash ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                            💵 Tiền mặt
                          </span>
                        ) : (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400">
                            📈 Thưởng CP
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 dark:text-slate-500">
                        {fmtDate(item.date)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-200/40 dark:border-slate-700/50">
                      <span className="text-gray-500 dark:text-slate-400">Số lượng:</span>
                      <b className="text-gray-800 dark:text-slate-200">{item.quantity?.toLocaleString()} cp</b>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-slate-400">Thực nhận:</span>
                      {isCash ? (
                        <div className="text-right">
                          <b className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                            +{fmtMoney(item.netAmount)}đ
                          </b>
                          <span className="text-[10px] text-gray-400 dark:text-slate-500 block">
                            ({fmtMoney(item.amountPerShare)}đ/cp - thuế {item.taxPct}%)
                          </span>
                        </div>
                      ) : (
                        <b className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                          +{item.quantity?.toLocaleString()} cp (Lô 0đ)
                        </b>
                      )}
                    </div>

                    {item.note && (
                      <p className="text-[11px] text-gray-500 dark:text-slate-400 italic">
                        "{item.note}"
                      </p>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleDelete(item.id, item.symbol)}
                        disabled={deletingId === item.id}
                        className="text-rose-500 hover:text-rose-700 text-xs font-bold px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 transition-colors"
                      >
                        {deletingId === item.id ? 'Đang xóa...' : '🗑️ Xóa bản ghi'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CHẾ ĐỘ BẢNG TRÊN DESKTOP (≥768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
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
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {dividends.map(item => {
                    const isCash = item.type === 'CASH';
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Mã CP */}
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-extrabold bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                            {item.symbol}
                          </span>
                        </td>

                        {/* Loại */}
                        <td className="px-4 py-4">
                          {isCash ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                              💵 Tiền mặt
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-400">
                              📈 Thưởng CP
                            </span>
                          )}
                        </td>

                        {/* Ngày nhận */}
                        <td className="px-4 py-4 text-xs text-gray-600 dark:text-slate-300 whitespace-nowrap">
                          {fmtDate(item.date)}
                        </td>

                        {/* Số lượng */}
                        <td className="px-4 py-4 text-right font-bold text-gray-800 dark:text-slate-200">
                          {item.quantity?.toLocaleString()} cp
                        </td>

                        {/* Thực nhận */}
                        <td className="px-5 py-4 text-right">
                          {isCash ? (
                            <div>
                              <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                                +{fmtMoney(item.netAmount)}đ
                              </div>
                              <div className="text-[11px] text-gray-400 dark:text-slate-500">
                                ({fmtMoney(item.amountPerShare)}đ/cp - thuế {item.taxPct}%)
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-extrabold text-indigo-600 dark:text-indigo-400 text-sm">
                                +{item.quantity?.toLocaleString()} cp
                              </div>
                              <div className="text-[11px] text-gray-400 dark:text-slate-500">
                                (Lô 0đ hạ giá vốn)
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Ghi chú */}
                        <td className="px-5 py-4 text-gray-600 dark:text-slate-300 text-xs max-w-xs truncate">
                          {item.note || '—'}
                        </td>

                        {/* Thao tác */}
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDelete(item.id, item.symbol)}
                            disabled={deletingId === item.id}
                            className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2.5 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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
          </div>
        )}
      </div>
    </div>
  );
}
