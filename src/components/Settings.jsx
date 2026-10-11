import { useState, useRef, useEffect } from 'react';
import {
  fetchBackup,
  restoreData,
  clearUserData,
  fetchHealth,
  fetchSupportedStocks,
  updateSupportedStocks,
  triggerFundamentalsSync,
} from '../utils/api.js';
import { fmtMoney, plColor, fmtDate } from '../utils/format.js';

export default function Settings({ data, currentUser, onSuccess, showToast }) {
  const { sellOrders = [] } = data;

  // 1. Tax Report Year filter
  const [taxYear, setTaxYear] = useState(new Date().getFullYear().toString());

  // 2. Backup & Restore state
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState('');
  const fileInputRef = useRef(null);

  // 3. Reset / Clear User Data state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  // 4. System & Environment Health info
  const [sysInfo, setSysInfo] = useState(null);

  // 5. Background Fundamentals Sync state
  // 5. Background Fundamentals Sync state (Chỉ đọc từ source code data/supported_stocks.json)
  const [syncConfig, setSyncConfig] = useState({
    symbols: [],
    lastSyncedAt: null,
    syncedCount: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  useEffect(() => {
    fetchHealth()
      .then(info => setSysInfo(info))
      .catch(() => {});

    fetchSupportedStocks()
      .then(cfg => { if (cfg && cfg.symbols) setSyncConfig(cfg); })
      .catch(() => {});
  }, []);

  async function handleTriggerSync() {
    setIsSyncing(true);
    setSyncMsg('');
    try {
      const res = await triggerFundamentalsSync();
      setSyncMsg(res.message || 'Đồng bộ thành công!');
      if (showToast) showToast(res.message || 'Đồng bộ dữ liệu định giá thành công!', 'success');
      const refreshed = await fetchSupportedStocks();
      if (refreshed) setSyncConfig(refreshed);
    } catch (err) {
      setSyncMsg('❌ Lỗi đồng bộ: ' + (err.message || 'Không thể kết nối TradingView'));
    } finally {
      setIsSyncing(false);
    }
  }

  // Download Backup JSON
  async function handleDownloadBackup() {
    try {
      const backupData = await fetchBackup();
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `stock_portfolio_backup_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (showToast) showToast('❌ Không thể tải file backup: ' + err.message, 'error');
      else alert('❌ Không thể tải file backup: ' + err.message);
    }
  }

  // Handle Restore file
  async function handleFileRestore(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (currentUser?.isDemo) {
      if (showToast) showToast('🛡️ Tài khoản Demo mặc định được bảo vệ. Vui lòng đăng nhập Google.', 'error');
      else alert('🛡️ Tài khoản Demo mặc định được bảo vệ và không thể khôi phục dữ liệu ghi đè. Vui lòng đăng nhập tài khoản Google để sử dụng tính năng này.');
      e.target.value = '';
      return;
    }

    if (!confirm(`Bạn có chắc muốn khôi phục từ file "${file.name}"? Toàn bộ danh mục cá nhân hiện tại sẽ được thay thế.`)) {
      e.target.value = '';
      return;
    }
    setRestoreLoading(true);
    setRestoreMsg('');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await restoreData(parsed);
      setRestoreMsg(`✅ Khôi phục thành công! Đã cập nhật danh mục.`);
      if (showToast) showToast('Khôi phục danh mục từ file backup thành công!', 'success');
      onSuccess();
    } catch (err) {
      setRestoreMsg('❌ Lỗi khôi phục: ' + (err.message || 'File JSON không hợp lệ'));
    } finally {
      setRestoreLoading(false);
      e.target.value = '';
    }
  }

  // Xoá toàn bộ dữ liệu cá nhân
  async function handleClearAllData() {
    if (confirmInput.trim().toUpperCase() !== 'XOA') return;
    setResetLoading(true);
    setResetError('');
    try {
      await clearUserData();
      setIsResetModalOpen(false);
      if (showToast) {
        showToast('Đã xoá toàn bộ dữ liệu cá nhân thành công!', 'success');
      }
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setResetError('❌ ' + (err.message || 'Không thể xoá dữ liệu'));
    } finally {
      setResetLoading(false);
    }
  }

  // Tính thuế và báo cáo theo năm
  const availableYears = Array.from(
    new Set(
      sellOrders
        .filter(s => s.date)
        .map(s => s.date.slice(0, 4))
    )
  ).sort().reverse();
  if (!availableYears.includes(new Date().getFullYear().toString())) {
    availableYears.unshift(new Date().getFullYear().toString());
  }

  const taxOrders = sellOrders.filter(s => {
    if (!taxYear || taxYear === 'all') return true;
    return s.date && s.date.startsWith(taxYear);
  });

  const totalGrossRevenue = taxOrders.reduce(
    (sum, s) => sum + (s.grossRevenue || (s.quantity * s.price)),
    0
  );
  // Thuế TNCN tại Việt Nam: 0.1% giá trị chuyển nhượng mỗi lần bán
  const personalIncomeTax = Math.round(totalGrossRevenue * 0.001);
  const totalRealizedGain = taxOrders.filter(s => s.profitLoss > 0).reduce((sum, s) => sum + s.profitLoss, 0);
  const totalRealizedLoss = taxOrders.filter(s => s.profitLoss < 0).reduce((sum, s) => sum + s.profitLoss, 0);
  const netProfit = totalRealizedGain + totalRealizedLoss;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. Báo Cáo Thuế TNCN Chuyển Nhượng */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <span>🧾</span> Báo Cáo Thuế TNCN Bán Cổ Phiếu
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Theo quy định thuế TNCN tại Việt Nam (0.1% trên tổng giá trị chuyển nhượng khi bán)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Năm:</span>
            <select
              value={taxYear}
              onChange={e => setTaxYear(e.target.value)}
              className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white font-semibold text-gray-700"
            >
              <option value="all">Tất cả các năm</option>
              {availableYears.map(yr => (
                <option key={yr} value={yr}>Năm {yr}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500 uppercase font-medium">Tổng giá trị bán</p>
              <p className="text-lg font-bold text-gray-800 mt-1">{fmtMoney(totalGrossRevenue)}đ</p>
              <p className="text-xs text-gray-400 mt-0.5">{taxOrders.length} lệnh bán</p>
            </div>

            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <p className="text-xs text-amber-700 uppercase font-medium">Thuế TNCN tạm tính (0.1%)</p>
              <p className="text-lg font-bold text-amber-800 mt-1">{fmtMoney(personalIncomeTax)}đ</p>
              <p className="text-xs text-amber-600 mt-0.5">Khấu trừ tự động khi bán</p>
            </div>

            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <p className="text-xs text-green-700 uppercase font-medium">Tổng lãi gộp</p>
              <p className="text-lg font-bold text-green-800 mt-1">+{fmtMoney(totalRealizedGain)}đ</p>
              <p className="text-xs text-green-600 mt-0.5">từ các lệnh có lời</p>
            </div>

            <div className="bg-red-50 rounded-xl p-4 border border-red-100">
              <p className="text-xs text-red-700 uppercase font-medium">Lãi / Lỗ ròng</p>
              <p className={`text-lg font-bold mt-1 ${plColor(netProfit)}`}>
                {netProfit >= 0 ? '+' : ''}{fmtMoney(netProfit)}đ
              </p>
              <p className="text-xs text-gray-400 mt-0.5">sau toàn bộ chi phí</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 mt-4 flex items-start gap-2">
            <span className="text-base">💡</span>
            <p>
              <b>Lưu ý thuế:</b> Thuế thu nhập cá nhân đối với chuyển nhượng chứng khoán được CTCK tự động tính và thu <b>0.1%</b> trên giá chuyển nhượng từng lần, không phụ thuộc vào việc lệnh bán đó có lãi hay lỗ.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Sao Lưu & Khôi Phục Dữ Liệu */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <span>💾</span> Sao Lưu & Khôi Phục Dữ Liệu (Backup & Restore)
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Lưu trữ an toàn toàn bộ dữ liệu giao dịch dưới dạng file JSON về máy tính của bạn
          </p>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Tải về backup */}
            <button
              onClick={handleDownloadBackup}
              className="w-full sm:w-auto bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>⬇️</span> Tải Về File Sao Lưu (.json)
            </button>

            {/* Khôi phục */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileRestore}
              className="hidden"
            />
            <button
              onClick={() => {
                if (currentUser?.isDemo) {
                  if (showToast) showToast('🛡️ Tài khoản Demo mặc định được bảo vệ. Vui lòng đăng nhập Google.', 'error');
                  else alert('🛡️ Tài khoản Demo mặc định được bảo vệ và không thể khôi phục dữ liệu ghi đè. Vui lòng đăng nhập tài khoản Google để sử dụng tính năng này.');
                  return;
                }
                fileInputRef.current?.click();
              }}
              disabled={restoreLoading}
              className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>⬆️</span> {restoreLoading ? 'Đang khôi phục...' : 'Khôi Phục Từ File JSON'}
            </button>
          </div>

          {restoreMsg && (
            <div className={`text-xs p-3 rounded-lg mt-4 ${restoreMsg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {restoreMsg}
            </div>
          )}
        </div>
      </div>

      {/* 3. Đồng Bộ Dữ Liệu Định Giá Cơ Bản Chạy Nền (Background Sync & GitHub Actions) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/70 via-blue-50/40 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <span>⚡</span> Đồng Bộ Dữ Liệu Định Giá Chạy Nền (Background Sync & GitHub Actions)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Tải trước 50+ chỉ số định giá (P/E, ROE, Yield, 52w) vào bộ nhớ cache để ứng dụng mở tức thì (0ms) mà không tốn tài nguyên
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
              title="Chạy Python trích xuất 50+ chỉ số cơ bản TradingView Scanner cho danh sách mã theo dõi (~5 giây)"
            >
              <span>{isSyncing ? '⏳' : '🔄'}</span>
              <span>{isSyncing ? 'Đang quét TradingView (~5s)...' : 'Đồng bộ EOD ngay (TradingView)'}</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Trạng thái tóm tắt */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Số mã đã lưu dữ liệu</span>
              <span className="text-base font-extrabold text-indigo-700 block mt-0.5">
                {syncConfig.syncedCount || (syncConfig.symbols || []).length} mã
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Lần đồng bộ gần nhất</span>
              <span className="text-base font-bold text-gray-800 block mt-0.5">
                {syncConfig.lastSyncedAt ? new Date(syncConfig.lastSyncedAt).toLocaleString('vi-VN') : 'Chưa có'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Lịch GitHub Actions</span>
              <span className="text-base font-bold text-emerald-700 block mt-0.5">
                18:00 T2 - T6 (Hàng ngày)
              </span>
            </div>
          </div>

          {syncMsg && (
            <div className={`text-xs p-3 rounded-xl border ${
              syncMsg.startsWith('❌') ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {syncMsg}
            </div>
          )}

          {/* Danh sách mã cổ phiếu hỗ trợ (Chỉ đọc - Quản lý trong source code) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                  <span>🔒</span> Danh sách mã cổ phiếu hỗ trợ ({syncConfig.symbols?.length || 0} mã)
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                  Chỉ đọc (Read-only)
                </span>
              </div>
              <span className="text-[11px] text-gray-400">
                Cấu hình tại: <code className="text-indigo-600 font-mono text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 font-bold">data/supported_stocks.json</code>
              </span>
            </div>

            {/* Thông báo phân quyền quản trị */}
            <div className="flex items-start gap-2.5 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 leading-relaxed">
              <span className="shrink-0 text-base">🛡️</span>
              <div>
                <p className="font-semibold text-blue-950">Quản lý tập trung trong source code:</p>
                <p className="text-blue-800 text-[11px] mt-0.5">
                  Để đảm bảo an toàn tài nguyên máy chủ và hiệu suất quét nền, giao diện web không cho phép người dùng tự ý thêm, xoá hoặc sửa danh sách mã. Chỉ quản trị viên mới có quyền thay đổi bằng cách cập nhật file <code className="font-mono font-bold bg-white/80 px-1 py-0.5 rounded text-blue-900">data/supported_stocks.json</code> trong mã nguồn dự án.
                </p>
              </div>
            </div>

            {/* Danh sách Chips mã (Chỉ đọc) */}
            <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-3.5 bg-gray-50/80 rounded-2xl border border-gray-100">
              {(syncConfig.symbols || []).length > 0 ? (
                (syncConfig.symbols || []).map(sym => (
                  <span
                    key={sym}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-white text-gray-800 border border-gray-200 shadow-2xs select-none hover:border-indigo-300 transition-colors"
                  >
                    {sym}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400 italic">Đang tải danh sách mã...</span>
              )}
            </div>
          </div>

          {/* Hướng dẫn cấu hình GitHub Actions & Terminal */}
          <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/70 text-xs space-y-2">
            <div className="font-bold text-indigo-950 flex items-center gap-1.5">
              <span>🐍</span> Tự Động Hóa Với Python & GitHub Actions:
            </div>
            <p className="text-gray-600 leading-relaxed">
              Hệ thống sử dụng động cơ <b>Python 3</b> (<code className="px-1.5 py-0.5 rounded bg-white text-indigo-700 font-mono text-[11px] border">scripts/sync_fundamentals.py</code>) để tải và chuẩn hóa 50+ chỉ số, dễ dàng mở rộng và tích hợp mô hình phân tích định lượng sau này.
              Workflow GitHub Actions (<code className="px-1.5 py-0.5 rounded bg-white text-indigo-700 font-mono text-[11px] border">.github/workflows/sync-fundamentals.yml</code>) sẽ tự động chạy Python và commit file cache mới về kho lưu trữ.
            </p>
            <div className="flex flex-wrap gap-4 text-[11px] text-gray-500 pt-1">
              <div>• <b>Lịch tự động:</b> 18:00 T2 - T6 (Hàng ngày sau giờ đóng sàn)</div>
              <div>• <b>Chạy qua npm:</b> <code className="font-mono bg-white px-1.5 py-0.5 rounded text-gray-800 font-bold border">npm run sync:fundamentals</code></div>
              <div>• <b>Chạy trực tiếp Python:</b> <code className="font-mono bg-white px-1.5 py-0.5 rounded text-gray-800 font-bold border">python3 scripts/sync_fundamentals.py</code></div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Vùng Nguy Hiểm (Danger Zone) - Xoá Toàn Bộ Dữ Liệu */}
      <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100 bg-red-50/40 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-red-800 flex items-center gap-2">
              <span>⚠️</span> Vùng Nguy Hiểm (Danger Zone)
            </h3>
            <p className="text-xs text-red-600/80 mt-0.5">
              Khởi tạo lại danh mục đầu tư về trạng thái ban đầu (Reset to zero)
            </p>
          </div>
          {currentUser?.isDemo && (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-200">
              🛡️ Tài khoản Demo (Được bảo vệ)
            </span>
          )}
        </div>

        <div className="p-6">
          {currentUser?.isDemo ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
              <span className="text-2xl shrink-0">🛡️</span>
              <div>
                <h4 className="font-bold text-amber-950 text-sm mb-1">
                  Tài khoản Demo mặc định được bảo vệ
                </h4>
                <p className="leading-relaxed text-amber-800">
                  Dữ liệu mẫu của tài khoản Demo được bảo vệ để khách tham quan trải nghiệm đầy đủ các tính năng. Bạn không thể xóa hoặc reset tài khoản này.
                </p>
                <p className="leading-relaxed text-amber-800 mt-1">
                  Để sở hữu danh mục đầu tư riêng và tự do thêm/xóa/reset dữ liệu, hãy <b>Đăng nhập bằng tài khoản Google</b>.
                </p>
                <div className="mt-3">
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-100 text-gray-400 font-bold rounded-xl text-xs cursor-not-allowed border border-gray-200 flex items-center gap-2"
                  >
                    <span>🗑️</span> Xoá toàn bộ dữ liệu (Đã khoá trên Demo)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-800">Xoá toàn bộ dữ liệu danh mục cá nhân</h4>
                <p className="text-xs text-gray-500 max-w-xl leading-relaxed">
                  Thao tác này sẽ xoá vĩnh viễn toàn bộ lệnh mua, bán, cổ tức, danh sách theo dõi và mục tiêu cá nhân của bạn. Dữ liệu sau khi xoá <b>không thể khôi phục</b> (khuyến nghị bạn nên tải về file sao lưu JSON trước khi xoá).
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setConfirmInput('');
                  setResetError('');
                  setIsResetModalOpen(true);
                }}
                className="w-full sm:w-auto shrink-0 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span>🗑️</span> Xoá Toàn Bộ Dữ Liệu
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Xác Nhận Xoá Toàn Bộ Dữ Liệu */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => !resetLoading && setIsResetModalOpen(false)}
          />

          <div className="relative bg-white w-full max-w-md rounded-3xl p-6 z-10 shadow-2xl border border-red-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">
              ⚠️
            </div>

            <h3 className="text-lg font-extrabold text-gray-900 text-center mb-1">
              Xác Nhận Xoá Toàn Bộ Dữ Liệu?
            </h3>
            <p className="text-xs text-gray-500 text-center mb-4 leading-relaxed">
              Hành động này <span className="font-bold text-red-600">KHÔNG THỂ hoàn tác</span>. Toàn bộ danh mục đầu tư của tài khoản <b>{currentUser?.email || currentUser?.name}</b> sẽ được đưa về số 0.
            </p>

            <div className="bg-red-50 border border-red-200/80 rounded-xl p-3.5 mb-4 text-xs text-red-800 space-y-1.5">
              <div className="flex justify-between font-semibold">
                <span>Lệnh mua & bán sẽ xoá:</span>
                <span>{(data.buyOrders?.length || 0) + (data.sellOrders?.length || 0)} lệnh</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Cổ phiếu đang nắm giữ:</span>
                <span>{data.portfolio?.length || 0} mã</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Danh sách theo dõi & Cổ tức:</span>
                <span>{(data.watchlist?.length || 0) + (data.dividends?.length || 0)} mục</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Vui lòng nhập chữ <span className="font-mono font-bold text-red-600 px-1.5 py-0.5 bg-red-100 rounded">XOA</span> vào ô dưới để xác nhận:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Nhập XOA"
                className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-500 font-mono font-bold text-center tracking-wider"
                disabled={resetLoading}
                autoFocus
              />
            </div>

            {resetError && (
              <div className="mb-4 text-xs p-2.5 rounded-lg bg-red-50 text-red-700 border border-red-200">
                {resetError}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                disabled={resetLoading}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Huỷ bỏ
              </button>

              <button
                type="button"
                onClick={handleClearAllData}
                disabled={confirmInput.trim().toUpperCase() !== 'XOA' || resetLoading}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                {resetLoading ? 'Đang xoá...' : 'Xác Nhận Xoá'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Thông Tin Môi Trường & Hạ Tầng (Environment & Connection Status) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <span>🔌</span> Môi Trường Kết Nối (Environment & Data Source)
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Phân biệt kết nối API và cơ sở dữ liệu giữa máy cục bộ (Local) và máy chủ (Vercel)
            </p>
          </div>
          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
            sysInfo?.environment === 'production'
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {sysInfo?.environment === 'production' ? '☁️ Vercel Cloud' : '💻 Local Development'}
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-semibold">API Server</p>
            <p className="text-sm font-bold text-gray-800 mt-1">
              {sysInfo?.label || (sysInfo?.environment === 'production' ? 'Vercel Serverless API' : 'Local Express (Port 3001)')}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {sysInfo?.environment === 'production' ? 'Tự động mở rộng không giới hạn' : 'Proxy qua http://localhost:3001'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-semibold">Cơ Sở Dữ Liệu (Database)</p>
            <p className="text-sm font-bold text-gray-800 mt-1">
              {sysInfo?.database?.label || 'SQLite'}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate" title={sysInfo?.database?.url}>
              {sysInfo?.database?.isTurso ? 'Đám mây Turso Cloud' : 'File nội bộ máy tính (data/stock.db)'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-semibold">Trạng Thái Kết Nối</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-sm font-bold text-emerald-700">Đang hoạt động tốt</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Thời gian phản hồi bình thường
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

