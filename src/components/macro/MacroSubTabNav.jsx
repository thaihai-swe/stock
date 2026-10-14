export default function MacroSubTabNav({ activeTab = 'regime', onTabChange }) {
  const tabs = [
    {
      id: 'regime',
      icon: '🌀',
      label: 'Chu Kỳ 5 Pha & Radar',
      fullTitle: 'Chu Kỳ 5 Pha & Radar Tín Hiệu Dẫn Dắt',
    },
    {
      id: 'yield_curve',
      icon: '📉',
      label: 'Đường Cong Lợi Suất',
      fullTitle: 'Đường Cong Lợi Suất 17 Dòng TPCP (VN vs US)',
    },
    {
      id: 'allocation',
      icon: '⚖️',
      label: 'Phân Bổ & Giá Vàng',
      fullTitle: 'Phân Bổ 4 Tài Sản, Giá Vàng SJC/PNJ & Liên Thị Trường',
    },
    {
      id: 'indicators',
      icon: '📑',
      label: '95 Chỉ Số Vĩ Mô',
      fullTitle: '95 Chỉ Số Kinh Tế TradingEconomics',
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
