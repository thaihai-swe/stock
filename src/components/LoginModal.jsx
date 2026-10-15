import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import Modal from './common/Modal.jsx';

export default function LoginModal({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onSwitchToDemo,
  hasGoogleClientId,
}) {
  const [testUsername, setTestUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  async function handleGoogleSuccess(credentialResponse) {
    setErrorMsg('');
    setLoading(true);
    try {
      if (!credentialResponse?.credential) {
        throw new Error('Không nhận được mã xác thực từ Google.');
      }
      await onLoginSuccess(credentialResponse.credential);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Đăng nhập Google thất bại.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleError() {
    setErrorMsg('Đăng nhập Google thất bại hoặc bạn đã đóng cửa sổ.');
  }

  async function handleTestLogin(e) {
    e.preventDefault();
    const cleanId = (testUsername || 'test-user').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanId) return;

    setErrorMsg('');
    setLoading(true);
    try {
      await onLoginSuccess(`test-${cleanId}`);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Đăng nhập thử nghiệm thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6 text-slate-900 dark:text-slate-100">

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-2xs">
            🔐
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Đăng Nhập Tài Khoản
          </h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Quản lý danh mục đầu tư độc lập và bảo mật riêng tư cho bạn.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-rose-950/60 border border-red-200 dark:border-rose-800 rounded-xl text-red-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Lựa chọn 1: Đăng nhập Google */}
          <div className="p-4 bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700 rounded-2xl flex flex-col items-center text-center">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2.5">
              Đăng nhập an toàn bằng tài khoản Google
            </span>

            {hasGoogleClientId ? (
              <div className="w-full flex justify-center py-1">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  theme="outline"
                  shape="rectangular"
                  size="large"
                  text="signin_with"
                  locale="vi"
                />
              </div>
            ) : (
              <div className="text-left w-full bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">💡 Chưa cấu hình Google OAuth Client ID</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                  Để đăng nhập Google thật, thêm <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-amber-900 dark:text-amber-200">GOOGLE_CLIENT_ID</code> vào file <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-amber-900 dark:text-amber-200">.env</code> hoặc cấu hình trên Vercel.
                </p>
              </div>
            )}
          </div>

          {/* Phân cách */}
          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">Hoặc</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
          </div>

          {/* Lựa chọn 2: Tiếp tục với tài khoản Demo */}
          <button
            type="button"
            onClick={() => {
              onSwitchToDemo();
              onClose();
            }}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
              currentUser?.isDemo
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 shadow-2xs'
                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-700'
            }`}
          >
            <span>👀</span>
            <span>Tiếp tục dùng Tài khoản Demo (Xem trước)</span>
            {currentUser?.isDemo && <span className="text-[10px] bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 px-1.5 py-0.5 rounded-full ml-1">Đang dùng</span>}
          </button>

          {/* Lựa chọn 3: Chế độ thử nghiệm Multi-tenant (Dành cho Dev / Local Test) */}
          <form onSubmit={handleTestLogin} className="p-3 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                🧪 Tài khoản thử nghiệm (Test User)
              </label>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">Dành cho kiểm thử</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="VD: user1, alice, tuan..."
                value={testUsername}
                onChange={(e) => setTestUsername(e.target.value)}
                className="flex-1 text-xs px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors disabled:opacity-50"
              >
                Vào thử
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-relaxed">
            Dữ liệu của tài khoản Demo là công khai. Dữ liệu khi bạn đăng nhập tài khoản riêng được lưu tách biệt 100%.
          </p>
        </div>
      </div>
    </Modal>
  );
}
