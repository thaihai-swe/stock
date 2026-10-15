import React, { useState, useMemo } from 'react';
import IntelligenceBadge from '../common/IntelligenceBadge.jsx';
import { formatBn } from '../../utils/format.js';

// Các phân loại danh mục thuyết minh BCTC chuẩn VAS TT200
const NOTE_CATEGORIES = [
  { id: 'all', label: 'Tất cả thuyết minh', icon: '📑' },
  { id: 'construction', label: 'Tài sản dở dang & Dự án', icon: '🏗️' },
  { id: 'debt', label: 'Vay nợ & Chi phí lãi vay', icon: '🏦' },
  { id: 'receivables', label: 'Khoản phải thu & Tín dụng', icon: '💵' },
  { id: 'inventory', label: 'Hàng tồn kho & Dự phòng', icon: '📦' },
  { id: 'shareholders', label: 'Cơ cấu cổ đông & Ban lãnh đạo', icon: '👑' },
  { id: 'dividends', label: 'Cổ tức & Phân phối lợi nhuận', icon: '💰' },
];

export default function SmartStatementNotesCard({ financials, stockItem, symbol }) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Trích xuất tự động các điểm thuyết minh then chốt từ BCTC có sẵn (VAS TT200 Footnotes)
  const autoInsights = useMemo(() => {
    if (!financials) return [];

    const insights = [];
    const quarterly = financials.quarterly || [];
    const yearly = financials.yearly || [];
    const qLatest = quarterly.length > 0 ? quarterly[quarterly.length - 1] : {};
    const yLatest = yearly.length > 0 ? yearly[yearly.length - 1] : {};

    // 1. Dự án Xây Dựng Dở Dang
    const cipVal = Number(
      financials.fcfInflection?.constructionInProgress ??
      qLatest.constructionInProgress ??
      yLatest.constructionInProgress ?? 0
    );
    const totalAssets = Number(qLatest.totalAssets ?? yLatest.totalAssets ?? 1);
    const cipRatio = Number(
      financials.fcfInflection?.cipRatio ??
      (totalAssets > 0 ? ((cipVal / totalAssets) * 100).toFixed(1) : 0)
    );

    if (cipVal > 0) {
      insights.push({
        id: 'cip',
        category: 'construction',
        categoryLabel: 'Tài sản dở dang & Dự án',
        categoryIcon: '🏗️',
        title: `Đại Dự Án Xây Dựng Dở Dang Dài Hạn: ${formatBn(cipVal)}`,
        vasCode: 'Mã 242 - Tài sản dở dang dài hạn',
        period: qLatest.period || yLatest.year || 'Kỳ gần nhất',
        numericValue: cipVal,
        status: cipRatio >= 15 ? 'OPPORTUNITY' : 'NORMAL',
        statusLabel: cipRatio >= 15 ? 'Điểm Uốn Công Suất' : 'Bình Thường',
        statusBadge: cipRatio >= 15 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        content: `Doanh nghiệp đang ghi nhận ${formatBn(cipVal)} tài sản dở dang, chiếm ${cipRatio}% tổng tài sản. Đây là hạt nhân tạo ra điểm uốn công suất và doanh thu mới khi đại công trình được khánh thành và đưa vào vận hành thương mại.`,
        keyTakeaway: `Theo dõi tiến độ nghiệm thu và giải ngân vốn CapEx. Khi CapEx đạt đỉnh và chuyển sang ghi nhận doanh thu mới, cổ phiếu thường bước vào sóng tái định giá mạnh (Multiple Re-rating).`,
      });
    }

    // 2. Cấu Trúc Vay Nợ & Chi Phí Lãi Vay
    const stDebt = Number(qLatest.shortTermDebt ?? yLatest.shortTermDebt ?? 0);
    const ltDebt = Number(qLatest.longTermDebt ?? yLatest.longTermDebt ?? 0);
    const totalDebt = Number(qLatest.totalDebt ?? yLatest.totalDebt ?? (stDebt + ltDebt));
    const equity = Number(qLatest.equity ?? yLatest.equity ?? 1);
    const dToE = Number((totalDebt / equity).toFixed(2));
    const interestExpense = Number(qLatest.interestExpense ?? yLatest.interestExpense ?? 0);

    if (totalDebt > 0) {
      const isHighDebt = dToE > 1.2;
      insights.push({
        id: 'debt',
        category: 'debt',
        categoryLabel: 'Vay nợ & Chi phí lãi vay',
        categoryIcon: '🏦',
        title: `Cấu Trúc Nợ Vay & Đòn Bẩy: ${formatBn(totalDebt)} (D/E = ${dToE}x)`,
        vasCode: 'Mã 320 (Vay ngắn hạn) & Mã 338 (Vay dài hạn)',
        period: qLatest.period || yLatest.year || 'Kỳ gần nhất',
        numericValue: totalDebt,
        status: isHighDebt ? 'WARNING' : 'HEALTHY',
        statusLabel: isHighDebt ? 'Đòn Bẩy Cao' : 'Kiểm Soát Tốt',
        statusBadge: isHighDebt ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        content: `Nợ vay ngắn hạn: ${formatBn(stDebt)} (${stDebt > 0 ? ((stDebt / totalDebt) * 100).toFixed(0) : 0}%), Nợ vay dài hạn: ${formatBn(ltDebt)}. Chi phí lãi vay phát sinh ${formatBn(interestExpense)} trong kỳ. Tỷ lệ Nợ vay / Vốn chủ sở hữu đạt ${dToE}x.`,
        keyTakeaway: isHighDebt
          ? 'Đòn bẩy nợ cao khiến lợi nhuận nhạy cảm với biến động lãi suất SBV và tỷ giá ngoại tệ. Cần kiểm tra lịch đáo hạn trái phiếu và các khoản vay hợp vốn ngân hàng.'
          : 'Cơ cấu vốn an toàn, đòn bẩy nợ thận trọng giúp doanh nghiệp vững vàng vượt qua các chu kỳ siết chặt tín dụng.',
      });
    }

    // 3. Khoản Phải Thu Khách Hàng
    const arVal = Number(qLatest.accountsReceivable ?? yLatest.accountsReceivable ?? 0);
    const revVal = Number(qLatest.revenue ?? yLatest.revenue ?? 1);
    const arRatio = Number(((arVal / revVal) * 100).toFixed(1));

    if (arVal > 0) {
      const isArHigh = arRatio > 45;
      insights.push({
        id: 'ar',
        category: 'receivables',
        categoryLabel: 'Khoản phải thu & Tín dụng',
        categoryIcon: '💵',
        title: `Khoản Phải Thu Khách Hàng: ${formatBn(arVal)} (${arRatio}% Doanh Thu)`,
        vasCode: 'Mã 131 - Phải thu ngắn hạn khách hàng',
        period: qLatest.period || yLatest.year || 'Kỳ gần nhất',
        numericValue: arVal,
        status: isArHigh ? 'WARNING' : 'NORMAL',
        statusLabel: isArHigh ? 'Cần Đối Soát Thu Tiền' : 'Thu Tiền Bình Thường',
        statusBadge: isArHigh ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        content: `Khoản phải thu ngắn hạn đạt ${formatBn(arVal)}, chiếm ${arRatio}% doanh thu kỳ đối chiếu. Cần rà soát danh sách đối tác nợ lớn và thời hạn nợ trong bản thuyết minh kiểm toán để phòng ngừa rủi ro nợ khó đòi.`,
        keyTakeaway: isArHigh
          ? 'Tỷ lệ phải thu cao so với doanh số phản ánh doanh nghiệp đang nới lỏng chính sách thanh toán để thúc đẩy bán hàng, tiềm ẩn nguy cơ trích lập dự phòng.'
          : 'Dòng tiền thu hồi từ khách hàng lành mạnh, vòng quay khoản phải thu ổn định.',
      });
    }

    // 4. Hàng Tồn Kho
    const invVal = Number(qLatest.inventory ?? yLatest.inventory ?? 0);
    const stAssets = Number(qLatest.shortTermAssets ?? yLatest.shortTermAssets ?? 1);
    const invRatio = Number(((invVal / stAssets) * 100).toFixed(1));

    if (invVal > 0) {
      insights.push({
        id: 'inv',
        category: 'inventory',
        categoryLabel: 'Hàng tồn kho & Dự phòng',
        categoryIcon: '📦',
        title: `Hàng Tồn Kho & Dự Phòng Giảm Giá: ${formatBn(invVal)}`,
        vasCode: 'Mã 140 - Hàng tồn kho (VAS TT200)',
        period: qLatest.period || yLatest.year || 'Kỳ gần nhất',
        numericValue: invVal,
        status: 'NORMAL',
        statusLabel: 'Theo Dõi Chu Kỳ',
        statusBadge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        content: `Giá trị tồn kho ghi nhận ${formatBn(invVal)}, chiếm ${invRatio}% tài sản ngắn hạn. Đối với các doanh nghiệp sản xuất và thương mại, cần theo dõi cơ cấu giữa nguyên vật liệu, bán thành phẩm và thành phẩm sẵn sàng tiêu thụ.`,
        keyTakeaway: 'Đối chiếu biến động giá cả hàng hóa đầu vào (thép cuộn, sữa bột, dầu thô, chip bán dẫn) để dự phóng biên lợi nhuận gộp trong các quý tới.',
      });
    }

    // 5. Cơ Cấu Cổ Đông Lớn
    const shareholders = financials.shareholdersAndEvents?.shareholders || financials.shareholders || [];
    if (shareholders.length > 0) {
      const topSh = shareholders[0];
      const topPct = (topSh.ownershipPercentage || topSh.percentage || 0).toFixed(1);
      insights.push({
        id: 'sh',
        category: 'shareholders',
        categoryLabel: 'Cơ cấu cổ đông & Ban lãnh đạo',
        categoryIcon: '👑',
        title: `Cổ Đông Lớn Nhất: ${topSh.name || 'Cổ đông sáng lập'} (${topPct}%)`,
        vasCode: 'Mẫu B 09 - Thuyết minh Vốn chủ sở hữu',
        period: 'Cập nhật mới nhất',
        numericValue: 0,
        status: 'HEALTHY',
        statusLabel: 'Quản Trị Chiến Lược',
        statusBadge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        content: `Cổ đông lớn nhất đang nắm giữ ${topPct}% vốn điều lệ. Tổng số cổ đông lớn và tổ chức chiến lược tạo nên sự ổn định cho cơ cấu biểu quyết và định hướng dài hạn của ban lãnh đạo.`,
        keyTakeaway: 'Sự hiện diện của các quỹ ngoại hoặc ban lãnh đạo nắm tỷ lệ lớn là yếu tố củng cố niềm tin và kỷ luật phân bổ vốn cho cổ đông nhỏ lẻ.',
      });
    }

    // 6. Cổ Tức & Phân Phối Lợi Nhuận
    const dividends = financials.shareholdersAndEvents?.dividends || [];
    const divYield = Number(financials.valuationMultiples?.dividendYield ?? stockItem?.dividends?.yield ?? 0);
    const divYieldPct = divYield > 1 ? divYield : divYield * 100;
    const payoutRatio = Number(financials.dividendSustainability?.payoutRatio ?? stockItem?.dividends?.payoutRatio ?? 35);

    if (dividends.length > 0 || divYieldPct > 0) {
      insights.push({
        id: 'div',
        category: 'dividends',
        categoryLabel: 'Cổ tức & Phân phối lợi nhuận',
        categoryIcon: '💰',
        title: `Chính Sách Cổ Tức: Lợi Suất ${divYieldPct.toFixed(1)}% (Payout: ${payoutRatio.toFixed(0)}%)`,
        vasCode: 'Mẫu B 09 - Thuyết minh Phân phối lợi nhuận sau thuế',
        period: 'Lịch sử chi trả',
        numericValue: 0,
        status: divYieldPct >= 5 ? 'OPPORTUNITY' : 'NORMAL',
        statusLabel: divYieldPct >= 5 ? 'Lợi Suất Cao' : 'Ổn Định',
        statusBadge: divYieldPct >= 5 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        content: `Doanh nghiệp có tỷ suất cổ tức tiền mặt ước đạt ${divYieldPct.toFixed(1)}%/năm với tỷ lệ chi trả ${payoutRatio.toFixed(0)}% lợi nhuận sau thuế. Lịch sử chi trả tiền mặt đều đặn phản ánh chất lượng dòng tiền thực tế vững vàng.`,
        keyTakeaway: 'Cổ tức tiền mặt là bằng chứng xác thực nhất chứng minh lợi nhuận trên báo cáo kết quả kinh doanh là tiền thật thay vì lợi nhuận trên giấy.',
      });
    }

    return insights;
  }, [financials, stockItem]);

  // Lọc theo danh mục
  const filteredInsights = useMemo(() => {
    if (selectedCategory === 'all') return autoInsights;
    return autoInsights.filter((item) => item.category === selectedCategory);
  }, [autoInsights, selectedCategory]);

  if (!financials || autoInsights.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs text-center space-y-3">
        <div className="text-3xl">📑</div>
        <h4 className="text-base font-bold text-gray-900 dark:text-white">
          Bản Thuyết Minh Báo Cáo Tài Chính — {symbol}
        </h4>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          Dữ liệu thuyết minh chi tiết cho mã {symbol} đang được đồng bộ từ kho lưu trữ BCTC chuẩn VAS TT200.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-6">
      {/* ── HEADER BẢN THUYẾT MINH BCTC THỨ 4 ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
        <div>
          <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
            <span>📑</span>
            <span>Bản Thuyết Minh Thứ 4 Chuẩn VAS TT200</span>
            <IntelligenceBadge type="heuristic" tooltip="Tự động bóc tách các khoản mục trọng yếu: Tài sản dở dang, công nợ, hàng tồn kho, nợ vay và cổ đông" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-0.5 flex items-center gap-2">
            Thuyết Minh Báo Cáo Tài Chính Trọng Yếu — {financials._meta?.companyName || symbol} ({symbol})
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Bóc trần các chi tiết cốt lõi ẩn sau 3 bảng báo cáo chính: tiến độ đại dự án, cơ cấu công nợ, hàng tồn kho và nghĩa vụ nợ vay.
          </p>
        </div>

        {/* Tổng số điểm thuyết minh */}
        <div className="self-start sm:self-auto shrink-0 bg-indigo-50 dark:bg-indigo-950/40 px-3.5 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800 text-xs font-bold text-indigo-700 dark:text-indigo-300">
          ✨ {autoInsights.length} Khoản Mục Thuyết Minh Trọng Yếu
        </div>
      </div>

      {/* ── BỘ LỌC DANH MỤC THUYẾT MINH (TABS) ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {NOTE_CATEGORIES.map((c) => {
          const count = c.id === 'all' ? autoInsights.length : autoInsights.filter((i) => i.category === c.id).length;
          if (c.id !== 'all' && count === 0) return null;

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === c.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedCategory === c.id ? 'bg-indigo-700 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── LƯỚI CÁC THẺ THUYẾT MINH BCTC TRỌNG YẾU (2-COLUMN GRID) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredInsights.map((item) => (
          <div
            key={item.id}
            className="p-5 bg-gradient-to-br from-gray-50/70 via-white to-gray-50/40 dark:from-gray-800/80 dark:via-gray-800/50 dark:to-gray-800/30 rounded-2xl border border-gray-200/80 dark:border-gray-700 space-y-3.5 shadow-2xs hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Thẻ Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-base">{item.categoryIcon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {item.categoryLabel}
                  </span>
                  {item.period && (
                    <span className="text-[10px] px-2 py-0.2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md font-medium">
                      {item.period}
                    </span>
                  )}
                </div>

                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${item.statusBadge}`}>
                  {item.statusLabel}
                </span>
              </div>

              {/* Tiêu đề & Mã chỉ tiêu VAS TT200 */}
              <h5 className="text-base font-bold text-gray-900 dark:text-white mt-2 leading-snug">
                {item.title}
              </h5>

              <div className="text-[11px] text-gray-400 mt-0.5 font-medium flex items-center gap-1">
                <span>📌</span>
                <span>{item.vasCode}</span>
              </div>

              {/* Số tiền nổi bật nếu có */}
              {item.numericValue > 0 && (
                <div className="mt-2.5 inline-block">
                  <span className="text-xs font-black px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-2xs">
                    Quy mô: {formatBn(item.numericValue)}
                  </span>
                </div>
              )}

              {/* Nội dung thuyết minh */}
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-2.5 leading-relaxed">
                {item.content}
              </p>
            </div>

            {/* Khối Điểm Nhà Đầu Tư Cần Lưu Ý (Key Takeaway) */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700/80 bg-indigo-50/30 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100/60 dark:border-indigo-900/30">
              <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1 mb-1">
                <span>💡</span>
                <span>Điểm cốt lõi cần theo dõi:</span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                {item.keyTakeaway}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
