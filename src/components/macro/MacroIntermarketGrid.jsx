export default function MacroIntermarketGrid({ macro = {} }) {
  const items = [
    {
      label: 'TPCP VN 10Y',
      val: `${macro.vn10yYield || '---'}%`,
      desc: 'Lợi suất trái phiếu',
      icon: '🏛️',
    },
    {
      label: 'LS Tái Cấp Vốn',
      val: `${macro.sbvRefinancingRate || '---'}%`,
      desc: 'Lãi suất điều hành SBV',
      icon: '🏦',
    },
    {
      label: 'LS Liên Ngân Hàng',
      val: `${macro.interbankOvernight || '---'}%`,
      desc: 'Kỳ hạn qua đêm',
      icon: '⚡',
    },
    {
      label: 'Tỷ Giá USD/VND',
      val: macro.usdVndRate ? Number(macro.usdVndRate).toLocaleString('vi-VN') : '---',
      desc: 'Tỷ giá liên ngân hàng',
      icon: '💵',
    },
    {
      label: 'Vàng Thế Giới',
      val: macro.goldWorld ? `$${Number(macro.goldWorld).toLocaleString('vi-VN')}` : '---',
      desc: 'USD / ounce',
      icon: '🟡',
    },
    {
      label: 'Dầu Thô Brent',
      val: macro.oilBrent ? `$${macro.oilBrent}` : '---',
      desc: 'USD / thùng',
      icon: '🛢️',
    },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider px-1">
        <span>🌐 Chỉ Số Liên Thị Trường & Tài Sản Thực (Intermarket)</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {items.map((m, i) => (
          <div
            key={i}
            className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-1 transition-colors"
          >
            <div className="text-[10px] sm:text-[11px] font-extrabold text-gray-400 dark:text-slate-500 uppercase flex items-center gap-1 truncate">
              <span>{m.icon}</span>
              <span className="truncate">{m.label}</span>
            </div>
            <div className="text-base sm:text-lg font-black text-gray-900 dark:text-slate-100 mt-1 truncate">
              {m.val}
            </div>
            <div className="text-[10px] sm:text-[11px] text-gray-400 dark:text-slate-500 truncate">
              {m.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
