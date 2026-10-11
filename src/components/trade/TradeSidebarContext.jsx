import { useState, useMemo } from 'react';
import { fmtMoney, fmtDate } from '../../utils/format.js';

export default function TradeSidebarContext({
  activeType = 'buy',
  portfolio = [],
  watchlist = [],
  dividends = [],
  onSelectBuy,
  onSelectSell,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Lọc danh mục theo tìm kiếm
  const filteredPortfolio = useMemo(() => {
    if (!searchTerm.trim()) return portfolio;
    const term = searchTerm.trim().toUpperCase();
    return portfolio.filter(p => p.symbol.includes(term));
  }, [portfolio, searchTerm]);

  // Cổ phiếu khả dụng để bán (totalQty > 0)
  const availableHoldings = useMemo(() => {
    return filteredPortfolio.filter(p => p.totalQty > 0);
  }, [filteredPortfolio]);

  // Thống kê nhanh cổ tức
  const dividendStats = useMemo(() => {
    let cash = 0;
    let stock = 0;
    for (const d of dividends) {
      if (d.type === 'CASH') cash += (d.netAmount || 0);
      if (d.type === 'STOCK') stock += (d.quantity || 0);
    }
    return { cash, stock, count: dividends.length };
  }, [dividends]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-gray-100 dark:border-slate-800 shadow-sm space-y-4">
      {/* 1. NGỮ CẢNH CHO TAB MUA VÀO */}
      {activeType === 'buy' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-slate-100 text-sm sm:text-base flex items-center gap-2">
                <span>📋</span> Danh Mục Đang Nắm Giữ
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                Chọn mã để tích lũy thêm hoặc bình quân giá
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {portfolio.length} mã
            </span>
          </div>

          {/* Ô tìm kiếm nhanh nếu có nhiều mã */}
          {portfolio.length > 4 && (
            <div className="relative">
              <input
                type="text"
                placeholder="Tìm mã cổ phiếu..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-gray-800 dark:text-slate-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Danh sách các mã trong danh mục */}
          {filteredPortfolio.length === 0 ? (
            <div className="py-6 text-center text-gray-400 dark:text-slate-500 text-xs">
              {portfolio.length === 0
                ? 'Chưa có cổ phiếu nào. Hãy mở vị thế đầu tiên!'
                : 'Không tìm thấy mã phù hợp.'}
            </div>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredPortfolio.map(stock => (
                <div
                  key={stock.symbol}
                  className="group flex items-center justify-between p-2.5 rounded-2xl bg-gray-50/80 dark:bg-slate-800/50 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 border border-gray-100/80 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-sm text-gray-900 dark:text-slate-100">
                        {stock.symbol}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-500 dark:text-slate-400">
                        {stock.totalQty.toLocaleString()} cp
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 dark:text-slate-500 truncate mt-0.5">
                      Vốn TB: <span className="font-medium text-gray-700 dark:text-slate-300">{fmtMoney(stock.avgCost)}đ</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectBuy && onSelectBuy(stock.symbol)}
                    className="shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                    title={`Điền mã ${stock.symbol} vào form mua`}
                  >
                    <span>+ Mua</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Danh sách theo dõi (Watchlist) */}
          {watchlist.length > 0 && (
            <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-700 dark:text-slate-300 flex items-center gap-1">
                  <span>⭐</span> Mã Theo Dõi (Watchlist)
                </span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500">
                  {watchlist.length} mã
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {watchlist.map(item => (
                  <button
                    key={item.symbol}
                    type="button"
                    onClick={() => onSelectBuy && onSelectBuy(
                      item.symbol,
                      item.targetBuyPrice ? item.targetBuyPrice / 1000 : undefined
                    )}
                    className="text-xs px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-gray-700 dark:text-slate-300 hover:text-emerald-800 dark:hover:text-emerald-300 font-bold border border-gray-200/60 dark:border-slate-700 transition-all cursor-pointer flex items-center gap-1"
                    title={`Điền mã ${item.symbol} ${item.targetBuyPrice ? `(Giá mục tiêu: ${fmtMoney(item.targetBuyPrice)}đ)` : ''}`}
                  >
                    <span>{item.symbol}</span>
                    {item.targetBuyPrice > 0 && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                        @{fmtMoney(item.targetBuyPrice)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mẹo giao dịch */}
          <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 text-[11px] text-emerald-900 dark:text-emerald-300 space-y-1">
            <p className="font-bold flex items-center gap-1">
              <span>💡</span> Quy tắc lô giao dịch:
            </p>
            <p className="text-emerald-800/80 dark:text-emerald-400 leading-relaxed">
              Sàn HOSE áp dụng lô chẵn <b>100 cổ phiếu</b>. Giá nhập quy ước nhân 1.000đ (VD: nhập <b>26.5</b> = 26.500đ).
            </p>
          </div>
        </div>
      )}

      {/* 2. NGỮ CẢNH CHO TAB BÁN RA */}
      {activeType === 'sell' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-slate-100 text-sm sm:text-base flex items-center gap-2">
                <span>💼</span> Cổ Phiếu Khả Dụng Để Bán
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                Chỉ hiển thị cổ phiếu đang còn số lượng
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              {availableHoldings.length} mã
            </span>
          </div>

          {availableHoldings.length === 0 ? (
            <div className="py-8 text-center text-gray-400 dark:text-slate-500 text-xs">
              <span className="text-3xl block mb-2">🏖️</span>
              Không có cổ phiếu nào khả dụng để bán.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {availableHoldings.map(stock => (
                <div
                  key={stock.symbol}
                  className="p-3 rounded-2xl bg-gray-50/80 dark:bg-slate-800/50 hover:bg-rose-50/40 dark:hover:bg-rose-950/20 border border-gray-100 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-gray-900 dark:text-slate-100">
                      {stock.symbol}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                      {stock.totalQty.toLocaleString()} cp
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500 dark:text-slate-400 pt-1 border-t border-gray-200/40 dark:border-slate-700/50">
                    <div>
                      <span>Vốn TB: </span>
                      <b className="text-gray-700 dark:text-slate-200">{fmtMoney(stock.avgCost)}đ</b>
                    </div>
                    <div className="text-right">
                      <span>Hòa vốn: </span>
                      <b className="text-amber-600 dark:text-amber-400">{fmtMoney(stock.breakEvenPrice || stock.avgCost)}đ</b>
                    </div>
                  </div>

                  {/* Nút hành động nhanh */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {stock.totalQty >= 200 && (
                      <button
                        type="button"
                        onClick={() => onSelectSell && onSelectSell(stock.symbol, Math.floor(stock.totalQty / 2))}
                        className="flex-1 text-[11px] font-bold py-1 px-2 rounded-xl bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-600 transition-colors shadow-2xs cursor-pointer"
                        title={`Bán 50% số lượng (${Math.floor(stock.totalQty / 2).toLocaleString()} cp)`}
                      >
                        Bán 50%
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectSell && onSelectSell(stock.symbol, stock.totalQty)}
                      className="flex-1 text-[11px] font-bold py-1 px-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-2xs cursor-pointer"
                      title={`Bán tất cả ${stock.totalQty.toLocaleString()} cp`}
                    >
                      Bán Tất Cả
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mẹo phương thức khớp lệnh */}
          <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 text-[11px] text-rose-900 dark:text-rose-300 space-y-1">
            <p className="font-bold flex items-center gap-1">
              <span>🎯</span> 3 Chiến lược khớp lô mua:
            </p>
            <p className="text-rose-800/80 dark:text-rose-400 leading-relaxed">
              • <b>Giá thấp nhất:</b> Chốt tối đa lãi ngay.<br/>
              • <b>Giá cao nhất:</b> Giảm giá vốn số CP giữ lại.<br/>
              • <b>FIFO (Theo ngày):</b> Chuẩn kế toán thời gian.
            </p>
          </div>
        </div>
      )}

      {/* 3. NGỮ CẢNH CHO TAB CỔ TỨC */}
      {activeType === 'dividend' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-slate-100 text-sm sm:text-base flex items-center gap-2">
                <span>🎁</span> Cẩm Nang Quyền Cổ Tức
              </h3>
              <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">
                Cơ chế hạch toán & điều chỉnh giá vốn
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              {dividendStats.count} đợt
            </span>
          </div>

          {/* Thống kê thu hoạch */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/50">
              <span className="text-[10px] text-gray-500 dark:text-slate-400 block">Tiền mặt thực nhận:</span>
              <span className="font-extrabold text-amber-700 dark:text-amber-300 text-sm mt-0.5 block">
                +{fmtMoney(dividendStats.cash)}đ
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/50">
              <span className="text-[10px] text-gray-500 dark:text-slate-400 block">Cổ phiếu thưởng:</span>
              <span className="font-extrabold text-indigo-700 dark:text-indigo-300 text-sm mt-0.5 block">
                +{dividendStats.stock.toLocaleString()} cp
              </span>
            </div>
          </div>

          {/* Kiến thức thực chiến */}
          <div className="space-y-2 text-xs text-gray-600 dark:text-slate-300">
            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-1">
              <span className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>📅</span> Ngày GDKHQ là gì?
              </span>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                Là ngày giao dịch mà người mua cổ phiếu <b>sẽ KHÔNG được hưởng</b> quyền cổ tức của đợt đó. Nhà đầu tư phải sở hữu cổ phiếu trước ngày này.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-1">
              <span className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>⚖️</span> Thuế TNCN 5%
              </span>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                Theo Luật thuế Việt Nam, cổ tức tiền mặt tự động khấu trừ <b>5% thuế TNCN</b> trước khi về tài khoản chứng khoán.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 space-y-1">
              <span className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>📉</span> Cơ chế hạ giá vốn (CP Thưởng)
              </span>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 leading-relaxed">
                Hệ thống tự động thêm <b>lô cổ phiếu giá 0đ</b>, tăng số lượng và làm giảm giá vốn bình quân đúng như sàn điều chỉnh giá.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
