import { useState, useMemo } from 'react';
import { fmtMoney, plColor, getStockColor } from '../../utils/format.js';
import { evaluatePortfolioProtections } from '../../utils/riskRewardAdvisor.js';

export default function SmartProfitProtectionAdvisor({
  portfolio = [],
  marketPrices = {},
  fundamentalsMap = {},
  watchlist = [],
  onSelectSymbolModal,
}) {
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'loss' | 'profit'
  const [showExplanation, setShowExplanation] = useState(false);
  const [expandedGrids, setExpandedGrids] = useState({});

  const toggleGrid = (symbol) => {
    setExpandedGrids(prev => ({
      ...prev,
      [symbol]: !prev[symbol],
    }));
  };

  // Tính toán toàn bộ thông số quản trị vị thế
  const { items = [], summary = {} } = useMemo(() => {
    return evaluatePortfolioProtections({
      portfolio,
      marketPrices,
      fundamentalsMap,
      watchlist,
    });
  }, [portfolio, marketPrices, fundamentalsMap, watchlist]);

  if (!portfolio || portfolio.length === 0) return null;

  // Lọc danh sách theo tab
  const filteredItems = items.filter((item) => {
    if (filterMode === 'loss') return item.currentPLPct <= 0;
    if (filterMode === 'profit') return item.currentPLPct > 0;
    return true;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 p-5 sm:p-6 space-y-5 transition-colors">
      {/* ── 1. HEADER: TIÊU ĐỀ & NÚT HƯỚNG DẪN ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-slate-800 dark:text-slate-100 text-base sm:text-lg flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">🛡️</span>
              Cố Vấn Kỷ Luật: Điểm Cắt Lỗ & Mốc Chặn Lãi (Trailing Stop)
            </h3>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Quản Trị Rủi Ro Danh Mục
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tự động tính mốc <b>Cắt Lỗ Kỷ Luật (-7%)</b> khi đang âm vốn và mốc <b>Chặn Lãi (Trailing Stop)</b> khi có lãi để bảo toàn thành quả.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowExplanation(!showExplanation)}
          className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto shrink-0 bg-indigo-50/70 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40"
        >
          <span>{showExplanation ? 'Ẩn Giải Thích' : '❓ Cách Hoạt Động'}</span>
        </button>
      </div>

      {/* GIẢI THÍCH DỄ HIỂU (BÌNH DÂN, KHÔNG DÙNG THUẬT NGỮ RƯỜM RÀ) */}
      {showExplanation && (
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2.5 animate-in fade-in duration-200">
          <div className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span>💡</span> Nguyên tắc hoạt động cực kỳ đơn giản:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-black text-rose-600 dark:text-rose-400 block">1. Khi Đang Lỗ / Mới Mua (&lt; +6%):</span>
              <p>Canh <b>Mức Cắt Lỗ Kỷ Luật (-7%)</b> để bảo vệ vốn gốc, tuyệt đối không gồng lỗ sâu.</p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-black text-blue-600 dark:text-blue-400 block">2. Khi Lãi Từ +6% Trở Lên:</span>
              <p>Mốc chặn lãi dời lên <b>Hòa Vốn (Free Trade)</b>, sau đó khóa tối thiểu <b>≥ +8% lãi</b>.</p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-black text-purple-600 dark:text-purple-400 block">3. Lưới Chốt Lời 3 Tầng (Tránh Bán Non):</span>
              <p>Bán 30% ở đệm lãi (+15%), 40% ở Giá Trị Hợp Lý (Fair Value), và giữ 30% gồng theo Trailing Stop.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. 4 THẺ THỐNG KÊ RÕ RÀNG, CHÂN THẬT ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Thẻ 1: Tiền lãi đã khóa bảo vệ */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block flex items-center gap-1">
            <span>🔒</span> Tiền Lãi Đã Khóa
          </span>
          <div className={`text-lg sm:text-xl font-black font-mono ${summary.totalLockedProfit > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
            {summary.totalLockedProfit > 0 ? `+${fmtMoney(summary.totalLockedProfit)}đ` : '0đ'}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
            {summary.totalLockedProfit > 0
              ? `${summary.lockedCount} vị thế đã khóa lãi an toàn`
              : 'Chưa có mã nào đủ điều kiện khóa lãi (Cần lãi ≥ +6%)'}
          </span>
        </div>

        {/* Thẻ 2: Lãi / Lỗ tạm tính hiện tại */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block flex items-center gap-1">
            <span>📈</span> Lãi / Lỗ Danh Mục Live
          </span>
          <div className={`text-lg sm:text-xl font-black font-mono ${plColor(summary.totalCurrentUnrealizedPL)}`}>
            {summary.totalCurrentUnrealizedPL >= 0 ? '+' : ''}{fmtMoney(summary.totalCurrentUnrealizedPL)}đ
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            {summary.profitableCount} / {summary.totalHoldings} mã đang có lãi
          </span>
        </div>

        {/* Thẻ 3: Tỷ Lệ Thưởng / Rủi Ro (R:R) */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block flex items-center gap-1">
            <span>⚖️</span> Tỷ Lệ Thưởng / Rủi Ro (R:R)
          </span>
          <div className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
            {summary.avgPortfolioRR}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 block">
            Tiềm năng tăng vs Rủi ro cắt lỗ
          </span>
        </div>

        {/* Thẻ 4: Tín hiệu hành động */}
        <div className={`p-3.5 sm:p-4 rounded-2xl border space-y-1 ${
          summary.hasActionRequired
            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
            : summary.warningCount > 0
            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
            : 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40'
        }`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block flex items-center gap-1">
            <span>🚦</span> Tín Hiệu Kỷ Luật
          </span>
          <div className={`text-sm sm:text-base font-black ${
            summary.hasActionRequired
              ? 'text-rose-600 dark:text-rose-400'
              : summary.warningCount > 0
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {summary.hasActionRequired
              ? `🚨 ${summary.triggeredCount} mã chạm mức dừng!`
              : summary.warningCount > 0
              ? `⚠️ ${summary.warningCount} mã gần chạm mức dừng`
              : '🟢 Tất cả vị thế an toàn'}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
            {summary.safeCount} vị thế chưa chạm mức dừng
          </span>
        </div>
      </div>

      {/* ── 3. BỘ LỌC TABS ── */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700 text-xs w-fit">
        <button
          type="button"
          onClick={() => setFilterMode('all')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
            filterMode === 'all'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Tất cả ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('loss')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
            filterMode === 'loss'
              ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Đang Lỗ / Canh Cắt Lỗ ({items.filter(i => i.currentPLPct <= 0).length})
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('profit')}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
            filterMode === 'profit'
              ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Đang Lãi / Canh Chặn Lãi ({items.filter(i => i.currentPLPct > 0).length})
        </button>
      </div>

      {/* ── 4. DANH SÁCH CHI TIẾT TỪNG MÃ CỔ PHIẾU ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4">
        {filteredItems.map((item) => {
          const stockColor = getStockColor(item.symbol, portfolio);
          const isLoss = item.currentPLPct < 0;

          return (
            <div
              key={item.symbol}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                item.isTriggered
                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 ring-1 ring-rose-400/40'
                  : item.isWarning
                  ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                  : 'bg-slate-50/40 dark:bg-slate-850/60 border-slate-200/70 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-slate-700'
              }`}
            >
              <div>
                {/* HÀNG 1: MÃ CP & CHẾ ĐỘ QUẢN TRỊ */}
                <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectSymbolModal && onSelectSymbolModal(item.symbol)}
                      className="px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs border transition-transform hover:scale-105 cursor-pointer flex items-center gap-1.5"
                      style={{
                        backgroundColor: `${stockColor}15`,
                        borderColor: `${stockColor}40`,
                        color: stockColor,
                      }}
                      title="Xem sổ cái chi tiết mã này"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stockColor }} />
                      {item.symbol}
                    </button>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${item.modeBadge}`}>
                      {item.modeLabel}
                    </span>
                  </div>

                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${item.badgeBg}`}>
                    {item.statusText}
                  </span>
                </div>

                {/* HÀNG 2: GIÁ VỐN, THỊ GIÁ LIVE & LÃI/LỖ */}
                <div className="grid grid-cols-2 gap-2 py-2.5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Giá Vốn TB</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">
                      {fmtMoney(item.avgCost)}đ
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      SL: {item.totalQty.toLocaleString()} cp
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Thị Giá Hiện Tại</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                      {fmtMoney(item.marketPrice)}đ
                    </span>
                    <span className={`text-[11px] font-black inline-block mt-0.5 ${plColor(item.currentPLPct)}`}>
                      {item.currentPLPct >= 0 ? '+' : ''}{item.currentPLPct}% ({item.currentUnrealizedPL >= 0 ? '+' : ''}{fmtMoney(item.currentUnrealizedPL)}đ)
                    </span>
                  </div>
                </div>

                {/* HÀNG 3: MỐC DỪNG KỶ LUẬT (CẮT LỖ HOẶC CHẶN LÃI) */}
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
                      <span>{item.mode === 'STOP_LOSS' ? '🛑 Mức Cắt Lỗ Kỷ Luật:' : '🛡️ Mốc Chặn Lãi:'}</span>
                    </span>
                    <span className={`font-mono font-black text-sm ${item.mode === 'STOP_LOSS' ? 'text-slate-800 dark:text-slate-200' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {fmtMoney(item.stopPrice)}đ
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Khoảng cách tới mức dừng:</span>
                    <span className={`font-mono font-bold ${item.distancePct <= 2.5 ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-slate-600 dark:text-slate-300'}`}>
                      {item.distancePct >= 0 ? `Còn +${item.distancePct}%` : `Đã thủng -${Math.abs(item.distancePct)}%`}
                    </span>
                  </div>

                  {item.lockedTotalAmount > 0 && (
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-dashed border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400">Tiền lãi đã khóa chắc:</span>
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                        +{fmtMoney(item.lockedTotalAmount)}đ
                      </span>
                    </div>
                  )}
                </div>

                {/* HÀNG 4: THƯỚC ĐO TỶ LỆ THƯỞNG / RỦI RO (R:R) */}
                <div className="flex items-center justify-between gap-2 pt-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold text-[10px] uppercase">R:R:</span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${item.rr.bg} ${item.rr.color} ${item.rr.border}`}>
                      {item.rr.ratioString}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 text-right truncate">
                    Mục tiêu: {fmtMoney(item.targetPrice)}đ
                  </span>
                </div>

                {/* HÀNG 5: LƯỚI CHỐT LỜI KHOA HỌC 3 TẦNG (CẤU HÌNH ĐỘNG, KHÔNG FIX CỨNG) */}
                {item.takeProfitGrid && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleGrid(item.symbol)}
                      className="w-full flex items-center justify-between text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors py-1 cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>📐</span>
                        <span>Lưới Chốt Lời 3 Tầng</span>
                        <span className="text-[10px] font-normal text-slate-400">
                          ({item.takeProfitGrid.tiers[0].suggestedRatioPct}% · {item.takeProfitGrid.tiers[1].suggestedRatioPct}% · {item.takeProfitGrid.tiers[2].suggestedRatioPct}%)
                        </span>
                      </span>
                      <span className="text-xs transition-transform font-mono">
                        {expandedGrids[item.symbol] ? '▲ Thu gọn' : '▼ Chi tiết'}
                      </span>
                    </button>

                    {/* MẶC ĐỊNH THU GỌN: HIỂN THỊ DÒNG TÓM TẮT MỤC TIÊU KẾ TIẾP */}
                    {!expandedGrids[item.symbol] && (
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/40 px-2 py-1 rounded-lg">
                        <span>🎯 Mục tiêu Tầng 1:</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                          {fmtMoney(item.takeProfitGrid.tiers[0].targetPrice)}đ (+{item.takeProfitGrid.tiers[0].targetGainPct}%)
                        </span>
                      </div>
                    )}

                    {/* MỞ RỘNG: HIỂN THỊ 3 BẬC THANG CHỐT LỜI KHOA HỌC */}
                    {expandedGrids[item.symbol] && (
                      <div className="mt-2 space-y-1.5 bg-slate-50/70 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/50 animate-in fade-in duration-150">
                        {item.takeProfitGrid.tiers.map((tier) => (
                          <div
                            key={tier.tier}
                            className={`p-2 rounded-lg border text-[11px] flex items-center justify-between gap-2 ${
                              tier.isReached
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold'
                                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${tier.badge}`}>
                                  {tier.name} ({tier.suggestedRatioPct}%)
                                </span>
                                <span className="font-mono font-bold text-xs truncate">
                                  {fmtMoney(tier.targetPrice)}đ
                                </span>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                  +{tier.targetGainPct}%
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {tier.label}: Bán <b>{tier.suggestedQty.toLocaleString()}</b> cp ({tier.suggestedRatioPct}%)
                              </div>
                            </div>

                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold shrink-0 ${
                              tier.isReached
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}>
                              {tier.isReached ? '✅ Đã Đạt' : `Còn +${tier.distancePct}%`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
