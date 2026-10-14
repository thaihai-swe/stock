export default function MarketSubTabNav({ activeTab = 'indices', onTabChange }) {
  const tabs = [
    {
      id: 'indices',
      icon: '📈',
      label: 'Chỉ Số & Biểu Đồ',
      fullTitle: 'Chỉ Số & Biểu Đồ Thời Gian Thực (VNINDEX, VN30, HNX, UPCoM)',
    },
    {
      id: 'valuation',
      icon: '🌡️',
      label: 'Định Giá & 25 Năm',
      fullTitle: 'Nhiệt Kế Định Giá 4 Cửa Sổ & Lịch Sử 25 Năm Vietstock',
    },
    {
      id: 'styles',
      icon: '💎',
      label: 'Phân Khúc Vốn Hóa',
      fullTitle: 'So Sánh 4 Phân Khúc: VN30, VN Diamond, VN Midcap & VN-Index',
    },
    {
      id: 'sectors',
      icon: '🗺️',
      label: 'Bản Đồ 10 Ngành',
      fullTitle: 'Bản Đồ Nhiệt & Luân Chuyển Dòng Tiền 10 Nhóm Ngành GICS',
    },
  ];

  return (
    <div className="w-full bg-gray-100 dark:bg-slate-900/90 rounded-2xl sm:rounded-3xl border border-gray-200/60 dark:border-slate-800 p-1.5 transition-colors overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange && onTabChange(t.id)}
              title={t.fullTitle}
              className={`w-full min-w-0 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-2.5 rounded-xl sm:rounded-2xl text-xs font-extrabold transition-all cursor-pointer text-center ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <span className="text-sm shrink-0">{t.icon}</span>
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
