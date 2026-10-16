import { fmtDate, fmtMoney, plColor, plBg, getStockColor, getMatchMethodInfo } from '../../utils/format.js';
import Modal from '../common/Modal.jsx';

export default function HistoryLotInspectorModal({
  selectedSellOrder = null,
  isOpen = false,
  onClose,
}) {
  if (!isOpen || !selectedSellOrder) return null;

  const tx = selectedSellOrder;
  const netRevenue = tx.netRevenue ?? tx.totalRevenue ?? (tx.grossRevenue ? tx.grossRevenue - (tx.fee || 0) : tx.quantity * tx.price);
  const netSellPrice = tx.netPrice || (tx.quantity > 0 ? (netRevenue / tx.quantity) : tx.price);
  const avgCost = tx.quantity > 0 && tx.totalCost ? (tx.totalCost / tx.quantity) : 0;
  const diffPerShare = avgCost > 0 ? (netSellPrice - avgCost) : 0;
  const stockColor = getStockColor(tx.symbol);
  const matchedLots = tx.matchedLots || [];
  const methodInfo = getMatchMethodInfo(tx.matchMethod, matchedLots);

  const header = (
    <div className="flex items-center gap-2.5">
      <span
        className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs border"
        style={{
          backgroundColor: `${stockColor}15`,
          borderColor: `${stockColor}40`,
          color: stockColor,
        }}
      >
        <span className="w-2 h-2 rounded-full mr-1.5 shrink-0" style={{ backgroundColor: stockColor }} />
        {tx.symbol}
      </span>
      <div>
        <h3 className="font-extrabold text-gray-800 dark:text-slate-100 text-sm sm:text-base flex items-center gap-1.5">
          <span>{methodInfo.icon}</span> Giải Phẫu Khớp Lệnh: {methodInfo.label}
        </h3>
        <p className="text-[11px] text-gray-500 dark:text-slate-400">
          Lệnh bán ngày {fmtDate(tx.date)} · Khối lượng: {tx.quantity.toLocaleString()} cp · Thu ròng: <span className="font-semibold text-gray-800 dark:text-slate-200">{fmtMoney(netRevenue)}đ</span>
          {(tx.fee > 0 || (tx.grossRevenue && tx.grossRevenue !== netRevenue)) && (
            <span className="text-gray-400 dark:text-slate-500"> (Khớp {fmtMoney(tx.grossRevenue || tx.quantity * tx.price)}đ - {fmtMoney(tx.fee || ((tx.grossRevenue || tx.quantity * tx.price) - netRevenue))}đ phí)</span>
          )}
        </p>
      </div>
    </div>
  );

  const footer = (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onClose}
        className="px-5 py-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
      >
        Đóng Cửa Sổ
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      headerContent={header}
      footer={footer}
    >
      <div className="p-4 sm:p-5 space-y-3.5">
        {/* TỔNG KẾT HIỆU SUẤT LỆNH BÁN */}
        <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-gray-50/80 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 shrink-0 text-xs">
          <div>
            <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Giá khớp sàn</span>
            <span className="font-extrabold text-gray-900 dark:text-slate-100 text-sm sm:text-base mt-0.5 block truncate">
              {fmtMoney(tx.price)}đ
            </span>
            {Math.round(tx.price) !== Math.round(netSellPrice) && (
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block">
                Thực nhận: {fmtMoney(netSellPrice)}đ/cp
              </span>
            )}
          </div>

          <div>
            <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Giá vốn TB gốc</span>
            <span className="font-extrabold text-amber-700 dark:text-amber-400 text-sm sm:text-base mt-0.5 block truncate">
              {fmtMoney(avgCost)}đ
            </span>
            {diffPerShare !== 0 && (
              <span className={`text-[10px] font-semibold block ${plColor(diffPerShare)}`}>
                {diffPerShare >= 0 ? '+' : ''}{fmtMoney(diffPerShare)}đ/cp
              </span>
            )}
          </div>

          <div>
            <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Lãi / Lỗ ròng</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`font-black text-sm sm:text-base truncate ${plColor(tx.profitLoss)}`}>
                {tx.profitLoss >= 0 ? '+' : ''}{fmtMoney(tx.profitLoss)}đ
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full hidden sm:inline ${plBg(tx.profitLoss)}`}>
                {tx.profitLossPct >= 0 ? '▲ +' : '▼ '}{tx.profitLossPct}%
              </span>
            </div>
          </div>
        </div>

        {/* DANH SÁCH CÁC LÔ MUA GỐC (CUỘN ĐƯỢC) */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          <div className="pb-1 space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
              <span className="font-bold flex items-center gap-1.5">
                <span>📦</span> {matchedLots.length} Lô Mua Gốc Khớp Theo {methodInfo.label}
              </span>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${methodInfo.badgeBg}`}>
                {methodInfo.badge}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-slate-500">
              💡 {methodInfo.description}
            </p>
          </div>

          {matchedLots.length === 0 ? (
            <div className="py-8 text-center text-gray-400 dark:text-slate-500 text-xs">
              Không có dữ liệu chi tiết các lô khớp gốc.
            </div>
          ) : (
            matchedLots.map((lot, idx) => {
              const lotUnit = lot.unitCost || lot.buyPrice;
              const lotTotalCost = lot.quantityUsed * lotUnit;
              const diff = netSellPrice - lotUnit;
              const lotRoiPct = lotUnit > 0 ? parseFloat(((diff / lotUnit) * 100).toFixed(2)) : 0;
              const lotTotalPL = diff * lot.quantityUsed;

              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-gray-200/80 dark:border-slate-700/80 shadow-2xs space-y-2 hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors"
                >
                  {/* Header Lô */}
                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px] flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-gray-800 dark:text-slate-200">
                        Mua ngày {fmtDate(lot.buyDate)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`font-black text-xs ${plColor(lotTotalPL)}`}>
                        {lotTotalPL >= 0 ? '+' : ''}{fmtMoney(lotTotalPL)}đ
                      </span>
                      <span className={`text-[10px] font-bold ml-1.5 px-1.5 py-0.2 rounded-full ${plBg(lotTotalPL)}`}>
                        {lotRoiPct >= 0 ? '▲ +' : '▼ '}{lotRoiPct}%
                      </span>
                    </div>
                  </div>

                  {/* Lưới thông số của Lô */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-gray-50 dark:bg-slate-800/50 p-2 rounded-xl">
                      <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Khối lượng khớp</span>
                      <span className="font-bold text-gray-800 dark:text-slate-200 mt-0.5 block">
                        {lot.quantityUsed.toLocaleString()} <span className="text-[10px] font-normal text-gray-400">cp</span>
                      </span>
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-800/50 p-2 rounded-xl">
                      <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Giá mua gốc</span>
                      <span className="font-bold text-gray-800 dark:text-slate-200 mt-0.5 block">
                        {fmtMoney(lot.buyPrice)}đ
                      </span>
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-800/50 p-2 rounded-xl">
                      <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Giá vốn/CP (sau phí)</span>
                      <span className="font-bold text-amber-700 dark:text-amber-400 mt-0.5 block">
                        {fmtMoney(lotUnit)}đ
                      </span>
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-800/50 p-2 rounded-xl">
                      <span className="text-gray-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">Chênh lệch / CP</span>
                      <span className={`font-black mt-0.5 block ${plColor(diff)}`}>
                        {diff >= 0 ? '+' : ''}{fmtMoney(diff)}đ
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
