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
import { useTheme } from '../context/ThemeContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Modal from './common/Modal.jsx';

export default function Settings({ data, currentUser, onSuccess }) {
  const { showToast } = useToast();
  const { themeMode, effectiveTheme, isDark, setThemeMode } = useTheme();

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
    lastSyncedCadence: null,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [selectedCadence, setSelectedCadence] = useState('all');
  const [syncElapsedSeconds, setSyncElapsedSeconds] = useState(0);
  const [syncLogOutput, setSyncLogOutput] = useState('');
  const [isLogOpen, setIsLogOpen] = useState(false);

  // Xác định môi trường thực thi: Nút bấm chỉ xuất hiện khi chạy ở Local
  const isLocalEnvironment =
    (typeof window !== 'undefined' &&
      ['localhost', '127.0.0.1'].includes(window.location.hostname)) ||
    sysInfo?.isLocal === true ||
    sysInfo?.environment === 'local';

  useEffect(() => {
    fetchHealth()
      .then(info => setSysInfo(info))
      .catch(() => {});

    fetchSupportedStocks()
      .then(cfg => { if (cfg && cfg.symbols) setSyncConfig(cfg); })
      .catch(() => {});
  }, []);

  async function handleTriggerSync(cadenceToRun = selectedCadence) {
    if (!isLocalEnvironment) {
      showToast('🛡️ Chức năng đồng bộ dữ liệu pipeline chỉ có thể thực thi trên máy Local.', 'warning');
      return;
    }

    setIsSyncing(true);
    setSyncMsg('');
    setSyncLogOutput('');
    setSyncElapsedSeconds(0);

    const timer = setInterval(() => {
      setSyncElapsedSeconds(s => s + 1);
    }, 1000);

    try {
      const res = await triggerFundamentalsSync(cadenceToRun);
      clearInterval(timer);
      const msg = res.message || `Đã hoàn tất đồng bộ Pipeline [${cadenceToRun.toUpperCase()}] thành công!`;
      setSyncMsg(msg);
      if (res.output) {
        setSyncLogOutput(res.output);
        setIsLogOpen(true);
      }
      showToast(msg, 'success');
      const refreshed = await fetchSupportedStocks();
      if (refreshed) setSyncConfig(refreshed);
    } catch (err) {
      clearInterval(timer);
      const errMsg = err.message || 'Không thể thực thi Python pipeline';
      setSyncMsg('❌ Lỗi đồng bộ: ' + errMsg);
      showToast('❌ ' + errMsg, 'error');
    } finally {
      clearInterval(timer);
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
      showToast('❌ Không thể tải file backup: ' + err.message, 'error');
    }
  }

  // Handle Restore file
  async function handleFileRestore(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (currentUser?.isDemo) {
      showToast('🛡️ Tài khoản Demo mặc định được bảo vệ. Vui lòng đăng nhập Google.', 'error');
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
      showToast('Khôi phục danh mục từ file backup thành công!', 'success');
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
      showToast('Đã xoá toàn bộ dữ liệu cá nhân thành công!', 'success');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setResetError('❌ ' + (err.message || 'Không thể xoá dữ liệu'));
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 0. Thiết Lập Giao Diện (Theme & Appearance) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span>🎨</span> Thiết Lập Giao Diện (Theme & Appearance)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Chuyển đổi giao diện Sáng / Tối hoặc Tự động đồng bộ theo hệ thống. Phím tắt: <kbd className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono text-[10px] border border-gray-200 dark:border-gray-600">Ctrl + J</kbd>
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 self-start sm:self-auto">
            {effectiveTheme === 'dark' ? '🌙 Chế độ Tối đang bật' : '☀️ Chế độ Sáng đang bật'}
          </span>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Sáng */}
            <button
              type="button"
              onClick={() => setThemeMode('light')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                themeMode === 'light'
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-400/30 text-indigo-900 dark:text-indigo-200 font-bold shadow-xs'
                  : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="text-2xl p-2 rounded-lg bg-amber-100/70 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">☀️</span>
              <div>
                <div className="text-sm font-bold">Chế độ Sáng</div>
                <div className="text-[11px] opacity-75">Nền sáng dịu mắt, độ tương phản cao</div>
              </div>
            </button>

            {/* Tối */}
            <button
              type="button"
              onClick={() => setThemeMode('dark')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                themeMode === 'dark'
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-400/30 text-indigo-900 dark:text-indigo-200 font-bold shadow-xs'
                  : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="text-2xl p-2 rounded-lg bg-indigo-100/70 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">🌙</span>
              <div>
                <div className="text-sm font-bold">Chế độ Tối</div>
                <div className="text-[11px] opacity-75">Nền trầm chuyên sâu phong cách Bloomberg</div>
              </div>
            </button>

            {/* Hệ thống */}
            <button
              type="button"
              onClick={() => setThemeMode('system')}
              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                themeMode === 'system'
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-400/30 text-indigo-900 dark:text-indigo-200 font-bold shadow-xs'
                  : 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span className="text-2xl p-2 rounded-lg bg-cyan-100/70 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300">💻</span>
              <div>
                <div className="text-sm font-bold">Hệ Thống (Auto)</div>
                <div className="text-[11px] opacity-75">Tự đổi theo cài đặt macOS / Windows</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 1. Sao Lưu & Khôi Phục Dữ Liệu */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <span>💾</span> Sao Lưu & Khôi Phục Dữ Liệu (Backup & Restore)
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">
            Lưu trữ an toàn toàn bộ dữ liệu giao dịch dưới dạng file JSON về máy tính của bạn
          </p>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Tải về backup */}
            <button
              onClick={handleDownloadBackup}
              className="w-full sm:w-auto bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
                  showToast('🛡️ Tài khoản Demo mặc định được bảo vệ. Vui lòng đăng nhập Google.', 'error');
                  return;
                }
                fileInputRef.current?.click();
              }}
              disabled={restoreLoading}
              className="w-full sm:w-auto bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>⬆️</span> {restoreLoading ? 'Đang khôi phục...' : 'Khôi Phục Từ File JSON'}
            </button>
          </div>

          {restoreMsg && (
            <div className={`text-xs p-3 rounded-lg mt-4 ${restoreMsg.startsWith('✅') ? 'bg-green-50 dark:bg-emerald-950/30 text-green-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-rose-950/30 text-red-700 dark:text-rose-300'}`}>
              {restoreMsg}
            </div>
          )}
        </div>
      </div>

      {/* 3. Đồng Bộ Dữ Liệu Định Giá Cơ Bản Chạy Nền (Background Sync & GitHub Actions) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-50/70 dark:from-indigo-950/30 via-blue-50/40 dark:via-gray-800 to-white dark:to-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span>⚡</span> Đồng Bộ Dữ Liệu Định Giá Chạy Nền (Background Sync & GitHub Actions)
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Tải trước 50+ chỉ số định giá (P/E, ROE, Yield, 52w) vào bộ nhớ cache để ứng dụng mở tức thì (0ms) mà không tốn tài nguyên
            </p>
          </div>

          {isLocalEnvironment ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Bộ chọn chu kỳ đồng bộ */}
              <select
                value={selectedCadence}
                onChange={(e) => setSelectedCadence(e.target.value)}
                disabled={isSyncing}
                className="px-3 py-2 rounded-xl bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 text-xs font-bold text-indigo-900 dark:text-indigo-200 shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title="Chọn chu kỳ đồng bộ dữ liệu"
              >
                <option value="all">🚀 Toàn Bộ (All - Khuyến nghị)</option>
                <option value="daily">☀️ Hằng Ngày (Daily EOD)</option>
                <option value="weekly">📅 Hàng Tuần (Weekly Macro & AI)</option>
                <option value="quarterly">📑 Hàng Quý (Quarterly BCTC & DCF)</option>
              </select>

              {/* Nút bấm ĐỒNG BỘ DỮ LIỆU ĐỊNH GIÁ CHẠY NỀN */}
              <button
                type="button"
                onClick={() => handleTriggerSync(selectedCadence)}
                disabled={isSyncing}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Kích hoạt bộ điều phối run_pipeline.py chạy toàn bộ dữ liệu nền và AI local"
              >
                <span className={isSyncing ? 'animate-spin' : ''}>{isSyncing ? '🔄' : '⚡'}</span>
                <span>
                  {isSyncing
                    ? `Đang đồng bộ [${selectedCadence.toUpperCase()}] (${syncElapsedSeconds}s)...`
                    : 'Đồng Bộ Dữ Liệu Định Giá Chạy Nền'}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5" title="Chạy script Python nền chỉ khả dụng trên máy Local">
                <span>☁️</span> Chế Độ Cloud (Auto Sync GitHub Actions)
              </span>
            </div>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Trạng thái tóm tắt */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Số mã đã lưu dữ liệu</span>
              <span className="text-base font-extrabold text-indigo-700 dark:text-indigo-400 block mt-0.5">
                {syncConfig.syncedCount || (syncConfig.symbols || []).length} mã
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Lần đồng bộ gần nhất</span>
              <span className="text-base font-bold text-gray-800 dark:text-gray-200 block mt-0.5">
                {syncConfig.lastSyncedAt ? new Date(syncConfig.lastSyncedAt).toLocaleString('vi-VN') : 'Chưa có'}
              </span>
              {syncConfig.lastSyncedCadence && (
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mt-0.5">
                  Chu kỳ: {syncConfig.lastSyncedCadence}
                </span>
              )}
            </div>
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-bold text-gray-400 uppercase block">Trạng thái môi trường</span>
              <span className={`text-base font-bold block mt-0.5 ${isLocalEnvironment ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {isLocalEnvironment ? '💻 Local (Python .venv Sẵn Sàng)' : '☁️ 18:00 T2 - T6 (GitHub Actions)'}
              </span>
            </div>
          </div>

          {syncMsg && (
            <div className={`text-xs p-3 rounded-xl border ${
              syncMsg.startsWith('❌') ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/40' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40'
            }`}>
              {syncMsg}
            </div>
          )}

          {/* Hộp xem log dòng lệnh Terminal (Collapsible Log Drawer) */}
          {syncLogOutput && (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-950 text-gray-100 shadow-md">
              <div
                onClick={() => setIsLogOpen(!isLogOpen)}
                className="px-4 py-2.5 bg-gray-900/90 flex items-center justify-between cursor-pointer hover:bg-gray-900 transition-colors"
              >
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                  <span>📟</span>
                  <span>Nhật Ký Thực Thi Pipeline ({selectedCadence.toUpperCase()})</span>
                  <span className="text-gray-400 text-[10px] font-normal">
                    {syncElapsedSeconds > 0 ? `(${syncElapsedSeconds}s)` : '(Hoàn tất)'}
                  </span>
                </div>
                <span className="text-xs text-gray-400 font-mono">{isLogOpen ? 'Thu gọn ▲' : 'Xem chi tiết ▼'}</span>
              </div>
              {isLogOpen && (
                <div className="p-4 max-h-96 overflow-y-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-gray-300 border-t border-gray-800 selection:bg-indigo-500 selection:text-white">
                  {syncLogOutput}
                </div>
              )}
            </div>
          )}

          {/* Danh sách mã cổ phiếu hỗ trợ (Chỉ đọc - Quản lý trong source code) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-1.5">
                  <span>🔒</span> Danh sách mã cổ phiếu hỗ trợ ({syncConfig.symbols?.length || 0} mã)
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  Chỉ đọc (Read-only)
                </span>
              </div>
              <span className="text-[11px] text-gray-400">
                Cấu hình tại: <code className="text-indigo-600 dark:text-indigo-400 font-mono text-[10px] bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900 font-bold">data/supported_stocks.json</code>
              </span>
            </div>

            {/* Thông báo phân quyền quản trị */}
            <div className="flex items-start gap-2.5 p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
              <span className="shrink-0 text-base">🛡️</span>
              <div>
                <p className="font-semibold text-blue-950 dark:text-blue-100">Quản lý tập trung trong source code:</p>
                <p className="text-blue-800 dark:text-blue-300 text-[11px] mt-0.5">
                  Để đảm bảo an toàn tài nguyên máy chủ và hiệu suất quét nền, giao diện web không cho phép người dùng tự ý thêm, xoá hoặc sửa danh sách mã. Chỉ quản trị viên mới có quyền thay đổi bằng cách cập nhật file <code className="font-mono font-bold bg-white/80 dark:bg-gray-800 px-1 py-0.5 rounded text-blue-900 dark:text-blue-200">data/supported_stocks.json</code> trong mã nguồn dự án.
                </p>
              </div>
            </div>

            {/* Danh sách Chips mã (Chỉ đọc) */}
            <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-3.5 bg-gray-50/80 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
              {(syncConfig.symbols || []).length > 0 ? (
                (syncConfig.symbols || []).map(sym => (
                  <span
                    key={sym}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-2xs select-none hover:border-indigo-300 dark:hover:border-indigo-500 transition-colors"
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
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl p-4 border border-indigo-100/70 dark:border-indigo-900/30 text-xs space-y-2">
            <div className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <span>🐍</span> Tự Động Hóa Với Python & Bộ Điều Phối Pipeline:
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Hệ thống sử dụng bộ điều phối thống nhất <b>Python 3</b> (<code className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-400 font-mono text-[11px] border border-gray-200 dark:border-gray-700">scripts/run_pipeline.py</code>) để tải và chuẩn hóa 50+ chỉ số, 122+ chỉ tiêu BCTC và sinh toàn bộ dữ liệu phân tích AI local.
            </p>
            <div className="flex flex-wrap gap-4 text-[11px] text-gray-500 dark:text-gray-400 pt-1">
              <div>• <b>Toàn bộ:</b> <code className="font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200 font-bold border border-gray-200 dark:border-gray-700">python3 scripts/run_pipeline.py --cadence all</code></div>
              <div>• <b>Hằng ngày (EOD):</b> <code className="font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200 font-bold border border-gray-200 dark:border-gray-700">python3 scripts/run_pipeline.py --cadence daily</code></div>
              <div>• <b>Hàng tuần (Vĩ mô):</b> <code className="font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200 font-bold border border-gray-200 dark:border-gray-700">python3 scripts/run_pipeline.py --cadence weekly</code></div>
              <div>• <b>Hàng quý (BCTC):</b> <code className="font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200 font-bold border border-gray-200 dark:border-gray-700">python3 scripts/run_pipeline.py --cadence quarterly</code></div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Vùng Nguy Hiểm (Danger Zone) - Xoá Toàn Bộ Dữ Liệu */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-red-100 dark:border-rose-900/40 overflow-hidden">
        <div className="px-6 py-4 border-b border-red-100 dark:border-rose-900/40 bg-red-50/40 dark:bg-rose-950/20 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-red-800 dark:text-rose-300 flex items-center gap-2">
              <span>⚠️</span> Vùng Nguy Hiểm (Danger Zone)
            </h3>
            <p className="text-xs text-red-600/80 dark:text-rose-400 mt-0.5">
              Khởi tạo lại danh mục đầu tư về trạng thái ban đầu (Reset to zero)
            </p>
          </div>
          {currentUser?.isDemo && (
            <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-[11px] font-bold rounded-lg border border-amber-200 dark:border-amber-800">
              🛡️ Tài khoản Demo (Được bảo vệ)
            </span>
          )}
        </div>

        <div className="p-6">
          {currentUser?.isDemo ? (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <span className="text-2xl shrink-0">🛡️</span>
              <div>
                <h4 className="font-bold text-amber-950 dark:text-amber-100 text-sm mb-1">
                  Tài khoản Demo mặc định được bảo vệ
                </h4>
                <p className="leading-relaxed text-amber-800 dark:text-amber-300">
                  Dữ liệu mẫu của tài khoản Demo được bảo vệ để khách tham quan trải nghiệm đầy đủ các tính năng. Bạn không thể xóa hoặc reset tài khoản này.
                </p>
                <p className="leading-relaxed text-amber-800 dark:text-amber-300 mt-1">
                  Để sở hữu danh mục đầu tư riêng và tự do thêm/xóa/reset dữ liệu, hãy <b>Đăng nhập bằng tài khoản Google</b>.
                </p>
                <div className="mt-3">
                  <button
                    disabled
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-bold rounded-xl text-xs cursor-not-allowed border border-gray-200 dark:border-gray-700 flex items-center gap-2"
                  >
                    <span>🗑️</span> Xoá toàn bộ dữ liệu (Đã khoá trên Demo)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Xoá toàn bộ dữ liệu danh mục cá nhân</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xl leading-relaxed">
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
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => !resetLoading && setIsResetModalOpen(false)}
        size="md"
      >
        <div className="p-6">
          <div className="w-12 h-12 bg-red-100 dark:bg-rose-950/60 text-red-600 dark:text-rose-400 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">
            ⚠️
          </div>

          <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 text-center mb-1">
            Xác Nhận Xoá Toàn Bộ Dữ Liệu?
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4 leading-relaxed">
            Hành động này <span className="font-bold text-red-600 dark:text-rose-400">KHÔNG THỂ hoàn tác</span>. Toàn bộ danh mục đầu tư của tài khoản <b>{currentUser?.email || currentUser?.name}</b> sẽ được đưa về số 0.
          </p>

          <div className="bg-red-50 dark:bg-rose-950/30 border border-red-200/80 dark:border-rose-900/40 rounded-xl p-3.5 mb-4 text-xs text-red-800 dark:text-rose-200 space-y-1.5">
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
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Vui lòng nhập chữ <span className="font-mono font-bold text-red-600 dark:text-rose-400 px-1.5 py-0.5 bg-red-100 dark:bg-rose-950/60 rounded">XOA</span> vào ô dưới để xác nhận:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Nhập XOA"
              className="w-full px-3.5 py-2.5 text-sm border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:border-red-500 font-mono font-bold text-center tracking-wider"
              disabled={resetLoading}
              autoFocus
            />
          </div>

          {resetError && (
            <div className="mb-4 text-xs p-2.5 rounded-lg bg-red-50 dark:bg-rose-950/30 text-red-700 dark:text-rose-300 border border-red-200 dark:border-rose-900/40">
              {resetError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(false)}
              disabled={resetLoading}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
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
      </Modal>

      {/* 4. Thông Tin Môi Trường & Hạ Tầng (Environment & Connection Status) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <span>🔌</span> Môi Trường Kết Nối (Environment & Data Source)
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-400 mt-0.5">
              Phân biệt kết nối API và cơ sở dữ liệu giữa máy cục bộ (Local) và máy chủ (Vercel)
            </p>
          </div>
          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
            sysInfo?.environment === 'production'
              ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
          }`}>
            {sysInfo?.environment === 'production' ? '☁️ Vercel Cloud' : '💻 Local Development'}
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-400 uppercase font-semibold">API Server</p>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-1">
              {sysInfo?.label || (sysInfo?.environment === 'production' ? 'Vercel Serverless API' : 'Local Express (Port 3001)')}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {sysInfo?.environment === 'production' ? 'Tự động mở rộng không giới hạn' : 'Proxy qua http://localhost:3001'}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-400 uppercase font-semibold">Cơ Sở Dữ Liệu (Database)</p>
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-1">
              {sysInfo?.database?.label || 'SQLite'}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate" title={sysInfo?.database?.url}>
              {sysInfo?.database?.isTurso ? 'Đám mây Turso Cloud' : 'File nội bộ máy tính (data/stock.db)'}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-400 uppercase font-semibold">Trạng Thái Kết Nối</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Đang hoạt động tốt</span>
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

