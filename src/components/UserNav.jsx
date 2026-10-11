import React, { useState, useRef, useEffect } from 'react';

export default function UserNav({
  user,
  onOpenLogin,
  onSwitchToDemo,
  onLogout,
  onCloneDemo,
  isCloning,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user || user.isDemo) {
    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Nút Demo badge */}
        <button
          onClick={onOpenLogin}
          className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200/90 dark:border-amber-800/80 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          title="Bạn đang ở tài khoản Demo. Bấm để đăng nhập."
        >
          <span className="text-sm leading-none">👀</span>
          <span className="hidden xs:inline">Bản Demo</span>
          <span className="xs:hidden">Demo</span>
        </button>

        {/* Nút Đăng nhập nổi bật */}
        <button
          onClick={onOpenLogin}
          className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <span>🔑</span>
          <span className="hidden sm:inline">Đăng nhập</span>
        </button>
      </div>
    );
  }

  // Người dùng đã đăng nhập (Google hoặc Test user)
  const initial = (user.name || user.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-full sm:rounded-xl bg-white dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs text-left"
        aria-label="Thông tin tài khoản"
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
          {initial}
        </div>
        <div className="hidden sm:block leading-tight pr-1">
          <div className="text-xs font-bold text-gray-800 dark:text-slate-100 max-w-[120px] truncate">
            {user.name || user.email}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            Cá nhân
          </div>
        </div>
        <span className="text-gray-400 dark:text-slate-500 text-xs hidden sm:inline">▾</span>
      </button>

      {/* Menu dropdown */}
      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-3 border-b border-gray-100 dark:border-gray-800 mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                {initial}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-extrabold text-gray-900 dark:text-white truncate">
                  {user.name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-gray-400 truncate">
                  {user.email || 'Tài khoản cá nhân'}
                </div>
              </div>
            </div>
            <div className="mt-2 text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 px-2 py-0.5 rounded-md inline-block font-semibold">
              🔒 Danh mục bảo mật riêng tư
            </div>
          </div>

          <div className="space-y-0.5">
            {/* Sao chép dữ liệu mẫu Demo */}
            <button
              onClick={() => {
                setDropdownOpen(false);
                onCloneDemo();
              }}
              disabled={isCloning}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>📋</span>
              <div className="flex-1">
                <div>Sao chép dữ liệu Demo</div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500">Lấy 4 lệnh mẫu từ tài khoản demo</div>
              </div>
            </button>

            {/* Chuyển sang tài khoản Demo */}
            <button
              onClick={() => {
                setDropdownOpen(false);
                onSwitchToDemo();
              }}
              className="w-full text-left px-3 py-2 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>👀</span>
              <div className="flex-1">
                <div>Xem tài khoản Demo</div>
                <div className="text-[10px] text-amber-600/80 dark:text-amber-500/80">Chuyển sang chế độ xem mẫu</div>
              </div>
            </button>

            {/* Đổi tài khoản khác */}
            <button
              onClick={() => {
                setDropdownOpen(false);
                onOpenLogin();
              }}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>🔄</span>
              <div>Đổi tài khoản khác</div>
            </button>

            <div className="h-px bg-gray-100 dark:bg-gray-800 my-1"></div>

            {/* Đăng xuất */}
            <button
              onClick={() => {
                setDropdownOpen(false);
                onLogout();
              }}
              className="w-full text-left px-3 py-2 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-semibold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>🚪</span>
              <div>Đăng xuất</div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
