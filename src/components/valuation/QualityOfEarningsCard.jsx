import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { useChartTheme } from '../../utils/useChartTheme.js';
import { formatBn, formatPercent } from '../../utils/format.js';
import IntelligenceBadge from '../common/IntelligenceBadge.jsx';

/**
 * QualityOfEarningsCard.jsx
 * Phân hệ Pháp Y BCTC: Thước Đo Chất Lượng Lợi Nhuận & Hệ Số Dồn Tích Sloan
 * - Quality of Earnings (QoE Ratio = CFO / Net Income)
 * - Richard Sloan Accrual Ratio (Sloan 1996: (Net Income - CFO) / Avg Total Assets)
 * - Earnings-Cash Gap (Net Income - CFO in Billions VND)
 * - Red Flags Detection: Receivables vs Revenue, Inventory vs COGS, Cash disconnect
 * - Multi-period Historical Analysis (Yearly 5Y vs Quarterly 6-8Q)
 */
export default function QualityOfEarningsCard({ financials, stockItem, symbol }) {
  const [periodMode, setPeriodMode] = useState('yearly'); // 'yearly' | 'quarterly'
  const chartTheme = useChartTheme();

  // Nhận diện khối ngành Tài chính / Ngân hàng
  const isBank = useMemo(() => {
    const ind = (stockItem?.industry || stockItem?.sector || '').toLowerCase();
    const sym = (symbol || '').toUpperCase();
    const bankSymbols = ['VCB', 'MBB', 'ACB', 'SHB', 'TCB', 'VPB', 'BID', 'CTG', 'HDB', 'STB', 'TPB', 'VIB', 'MSB', 'LPB', 'EIB', 'OCB', 'SSB'];
    return ind.includes('ngân hàng') || ind.includes('tài chính') || ind.includes('bảo hiểm') || bankSymbols.includes(sym);
  }, [stockItem, symbol]);

  // Chuỗi số liệu theo chế độ Năm hoặc Quý
  const seriesData = useMemo(() => {
    const rawList = periodMode === 'yearly' ? (financials?.yearly || []) : (financials?.quarterly || []);
    if (!rawList || rawList.length === 0) return [];

    // Lấy tối đa 7 kỳ gần nhất
    const list = rawList.slice(-7);

    return list.map((item, idx) => {
      const periodLabel = item.year ? `Năm ${item.year}` : (item.period || `Kỳ ${idx + 1}`);
      const netIncome = Number(item.netIncome ?? item.netIncomeParent ?? 0);
      const cfo = Number(item.cfo ?? item.operatingCashFlow ?? 0);
      const totalAssets = Number(item.totalAssets || 0);
      const accountsReceivable = Number(item.accountsReceivable || 0);
      const inventory = Number(item.inventory || 0);
      const revenue = Number(item.revenue || 0);
      const cogs = Number(item.costOfGoodsSold || 0);
      const fcf = Number(item.freeCashFlow ?? (cfo - Number(item.capex || 0)));

      const prev = idx > 0 ? list[idx - 1] : null;
      const prevAssets = prev ? Number(prev.totalAssets || 0) : totalAssets;
      const avgAssets = prevAssets > 0 && totalAssets > 0 ? (totalAssets + prevAssets) / 2 : (totalAssets || 1);

      // Chênh lệch Lợi nhuận vs Dòng tiền (Tỷ VNĐ)
      const gap = netIncome - cfo;

      // Tỷ lệ chuyển đổi tiền CFO / Net Income
      let cfoToNi = 0;
      if (netIncome > 0) {
        cfoToNi = Number((cfo / netIncome).toFixed(2));
      } else if (netIncome < 0 && cfo > 0) {
        cfoToNi = 2.0; // Rất tốt, lỗ sổ sách nhưng tiền dương
      } else if (netIncome < 0 && cfo < 0) {
        cfoToNi = Number((cfo / netIncome).toFixed(2));
      } else {
        cfoToNi = cfo > 0 ? 1.5 : 0;
      }

      // Hệ số dồn tích Sloan Accrual Ratio (%)
      // Công thức: ((Net Income - CFO) / Avg Assets) * 100
      const sloanAccrual = avgAssets > 0 ? Number((((netIncome - cfo) / avgAssets) * 100).toFixed(2)) : 0;

      // Biến động Phải thu vs Doanh thu
      const prevRev = prev ? Number(prev.revenue || 0) : 0;
      const prevAr = prev ? Number(prev.accountsReceivable || 0) : 0;
      const deltaRev = revenue - prevRev;
      const deltaAr = accountsReceivable - prevAr;
      const revGrowth = prevRev > 0 ? ((revenue - prevRev) / prevRev) * 100 : 0;
      const arGrowth = prevAr > 0 ? ((accountsReceivable - prevAr) / prevAr) * 100 : 0;

      // Biến động Tồn kho vs Giá vốn
      const prevCogs = prev ? Number(prev.costOfGoodsSold || 0) : 0;
      const prevInv = prev ? Number(prev.inventory || 0) : 0;
      const deltaCogs = cogs - prevCogs;
      const deltaInv = inventory - prevInv;
      const cogsGrowth = prevCogs > 0 ? ((cogs - prevCogs) / prevCogs) * 100 : 0;
      const invGrowth = prevInv > 0 ? ((inventory - prevInv) / prevInv) * 100 : 0;

      // Đánh giá trạng thái kỳ
      let status = 'HEALTHY';
      let statusLabel = 'Đạt Chuẩn';
      let statusBadge = 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';

      if (sloanAccrual <= -3.0 && cfoToNi >= 1.0) {
        status = 'EXCELLENT';
        statusLabel = 'Tiền Tươi Thóc Thật';
        statusBadge = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
      } else if (sloanAccrual > 10.0 || (netIncome > 0 && cfo < 0)) {
        status = 'WARNING';
        statusLabel = 'Dồn Tích Cao / Tiền Âm';
        statusBadge = 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300';
      } else if (sloanAccrual > 5.0 || cfoToNi < 0.7) {
        status = 'WATCH';
        statusLabel = 'Cần Giám Sát';
        statusBadge = 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
      }

      return {
        periodLabel,
        rawPeriod: item.year || item.period,
        revenue,
        netIncome,
        cfo,
        fcf,
        gap,
        cfoToNi,
        sloanAccrual,
        totalAssets,
        accountsReceivable,
        inventory,
        deltaRev,
        deltaAr,
        revGrowth,
        arGrowth,
        deltaCogs,
        deltaInv,
        cogsGrowth,
        invGrowth,
        status,
        statusLabel,
        statusBadge,
      };
    });
  }, [financials, periodMode]);

  // Kỳ gần nhất & các chỉ số tổng hợp
  const metrics = useMemo(() => {
    if (seriesData.length === 0) {
      return {
        latest: null,
        score: 50,
        grade: 'Chưa đủ dữ liệu',
        gradeBadge: 'bg-gray-100 text-gray-600',
        cfoNiWinRate: 50,
        redFlags: [],
      };
    }

    const latest = seriesData[seriesData.length - 1];
    const prev = seriesData.length >= 2 ? seriesData[seriesData.length - 2] : null;

    // Tần suất CFO >= 90% Net Income
    const winCount = seriesData.filter(d => d.cfo >= d.netIncome * 0.9).length;
    const cfoNiWinRate = Math.round((winCount / seriesData.length) * 100);

    // Tính điểm tổng hợp Quality of Earnings Score (0 - 100)
    let score = 0;

    // 1. Tỷ lệ chuyển đổi tiền CFO / LNST kỳ mới nhất (Tối đa 25 điểm)
    if (latest.cfoToNi >= 1.2) score += 25;
    else if (latest.cfoToNi >= 1.0) score += 22;
    else if (latest.cfoToNi >= 0.7) score += 16;
    else if (latest.cfoToNi >= 0.3) score += 10;
    else score += 4;

    // 2. Hệ số dồn tích Sloan Accrual Ratio (Tối đa 25 điểm)
    if (latest.sloanAccrual <= -3.0) score += 25;
    else if (latest.sloanAccrual <= 0.0) score += 22;
    else if (latest.sloanAccrual <= 3.0) score += 18;
    else if (latest.sloanAccrual <= 6.0) score += 12;
    else if (latest.sloanAccrual <= 10.0) score += 6;
    else score += 0;

    // 3. Tần suất dòng tiền đồng thuận trong lịch sử (Tối đa 20 điểm)
    score += Math.round((cfoNiWinRate / 100) * 20);

    // 4. Kiểm định Khoản phải thu vs Doanh thu (Tối đa 15 điểm)
    if (isBank) {
      score += 15;
    } else if (latest.arGrowth <= latest.revGrowth + 5 || latest.deltaAr <= 0) {
      score += 15;
    } else if (latest.arGrowth <= latest.revGrowth + 15) {
      score += 10;
    } else {
      score += 3;
    }

    // 5. Kiểm định Hàng tồn kho vs Giá vốn (Tối đa 15 điểm)
    if (isBank || latest.inventory === 0) {
      score += 15;
    } else if (latest.invGrowth <= latest.cogsGrowth + 5 || latest.deltaInv <= 0) {
      score += 15;
    } else if (latest.invGrowth <= latest.cogsGrowth + 15) {
      score += 10;
    } else {
      score += 3;
    }

    score = Math.min(100, Math.max(0, score));

    // Xếp hạng (Grade)
    let grade = 'Hạng A: Kim Cương (Tiền Tươi Thóc Thật)';
    let gradeBadge = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
    let gradeDesc = 'Doanh nghiệp sở hữu chất lượng lợi nhuận vượt trội, dòng tiền kinh doanh dồi dào và bảo chứng hoàn hảo cho lợi nhuận kế toán. Nguy cơ dồn tích ảo cực thấp.';

    if (score < 50) {
      grade = 'Hạng D: Cảnh Báo (Lợi Nhuận Trên Giấy / Dồn Tích Cao)';
      gradeBadge = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300 dark:border-rose-700';
      gradeDesc = 'Lợi nhuận kế toán có độ vênh lớn so với tiền mặt thực tế hoặc dòng tiền kinh doanh âm kéo dài. Cần cảnh giác rủi ro trích lập dự phòng và suy giảm lợi nhuận trong tương lai.';
    } else if (score < 68) {
      grade = 'Hạng C: Cần Giám Sát (Dồn Tích Vừa Phải)';
      gradeBadge = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      gradeDesc = 'Chất lượng lợi nhuận ở mức chấp nhận được nhưng có dấu hiệu dồn tích vốn lưu động tăng cao hoặc dòng tiền chưa thực sự ổn định qua các chu kỳ.';
    } else if (score < 80) {
      grade = 'Hạng B: Lành Mạnh (Đạt Chuẩn Tiền Mặt)';
      gradeBadge = 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      gradeDesc = 'Dòng tiền từ hoạt động kinh doanh bám sát tốt kết quả kinh doanh. Kế toán dồn tích nằm trong ngưỡng kiểm soát an toàn của chuẩn mực kế toán.';
    }

    // Quét 4 Bẫy Kế Toán Dồn Tích (Red Flags)
    const redFlags = [];

    if (!isBank && latest.arGrowth > latest.revGrowth + 12 && latest.deltaAr > 100) {
      redFlags.push({
        id: 'ar-surge',
        severity: 'high',
        icon: '⚠️',
        title: 'Bán chịu kích cầu (Khoản phải thu tăng nóng)',
        desc: `Khoản phải thu tăng ${latest.arGrowth.toFixed(1)}%, vượt trội tốc độ tăng doanh thu (${latest.revGrowth.toFixed(1)}%). Doanh nghiệp có dấu hiệu nới lỏng chính sách thanh toán để kéo doanh số.`,
      });
    }

    if (!isBank && latest.inventory > 0 && latest.invGrowth > latest.cogsGrowth + 12 && latest.deltaInv > 100) {
      redFlags.push({
        id: 'inv-surge',
        severity: 'medium',
        icon: '📦',
        title: 'Tồn kho phình to nhanh hơn giá vốn',
        desc: `Hàng tồn kho tăng ${latest.invGrowth.toFixed(1)}% trong khi giá vốn chỉ tăng ${latest.cogsGrowth.toFixed(1)}%. Cần chú ý nguy cơ ứ đọng hàng hoặc áp lực trích lập giảm giá tồn kho.`,
      });
    }

    if (latest.netIncome > 0 && latest.cfo < 0) {
      redFlags.push({
        id: 'cash-disconnect',
        severity: 'critical',
        icon: '🚨',
        title: 'Lệch pha tiền mặt nghiêm trọng (CFO Âm trong khi Báo Lãi)',
        desc: `Kỳ này ghi nhận LNST dương (${formatBn(latest.netIncome)}) nhưng dòng tiền kinh doanh lại âm (${formatBn(latest.cfo)}). Lợi nhuận hoàn toàn nằm trên sổ sách chưa thu được tiền.`,
      });
    }

    if (latest.sloanAccrual > 10.0) {
      redFlags.push({
        id: 'sloan-alert',
        severity: 'critical',
        icon: '⚡',
        title: 'Hệ số dồn tích Sloan vượt ngưỡng nguy hiểm (+10%)',
        desc: `Sloan Accrual Ratio đạt ${latest.sloanAccrual.toFixed(1)}% (> +10.0%). Theo nghiên cứu của Richard Sloan, cổ phiếu có dồn tích cao thường có xác suất đảo chiều giảm giá trong các năm sau.`,
      });
    }

    return {
      latest,
      prev,
      score,
      grade,
      gradeBadge,
      gradeDesc,
      cfoNiWinRate,
      redFlags,
    };
  }, [seriesData, isBank]);

  if (!financials || seriesData.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs text-center space-y-3">
        <div className="text-3xl">💎</div>
        <h4 className="text-base font-bold text-gray-900 dark:text-white">
          Thước Đo Chất Lượng Lợi Nhuận (Quality of Earnings & Sloan Accrual)
        </h4>
        <p className="text-xs text-gray-400 max-w-md mx-auto">
          Dữ liệu BCTC lưu chuyển tiền tệ chi tiết cho mã {symbol} đang được đồng bộ.
        </p>
      </div>
    );
  }

  const { latest, score, grade, gradeBadge, gradeDesc, cfoNiWinRate, redFlags } = metrics;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/60 shadow-xs space-y-6">
      {/* ── HEADER & TIÊU ĐỀ ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
        <div>
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
            <span>💎</span>
            <span>Pháp Y Kế Toán & Dòng Tiền Thuần</span>
            <IntelligenceBadge type="heuristic" tooltip="Mô hình Richard Sloan Accrual 1996 & Tỷ lệ chuyển đổi dòng tiền kinh doanh CFO / Net Income" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">
            Thước Đo Chất Lượng Lợi Nhuận & Hệ Số Dồn Tích Sloan
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Bóc trần "lợi nhuận trên giấy", đo lường tỷ lệ tiền tươi thóc thật và phát hiện sớm rủi ro đảo chiều lợi nhuận theo GS. Richard Sloan.
          </p>
        </div>

        {/* Chuyển đổi Năm / Quý */}
        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPeriodMode('yearly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              periodMode === 'yearly'
                ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
            }`}
          >
            📅 Theo Năm (5-7 Năm)
          </button>
          <button
            type="button"
            onClick={() => setPeriodMode('quarterly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              periodMode === 'quarterly'
                ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-300'
            }`}
          >
            ⏱️ Theo Quý (6-7 Quý)
          </button>
        </div>
      </div>

      {/* ── GHI CHÚ ĐẶC THÙ NGÂN HÀNG NẾU CÓ ── */}
      {isBank && (
        <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-800/40 text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2.5">
          <span className="text-base shrink-0">🏛️</span>
          <div>
            <strong>Lưu ý đặc thù ngành Ngân hàng / Tài chính:</strong> Dòng tiền kinh doanh (CFO) của ngân hàng bao gồm biến động tiền gửi khách hàng và cho vay ròng, không giống mô hình vốn lưu động thông thường của doanh nghiệp phi tài chính. Hàng tồn kho và Phải thu khách hàng được chuẩn hóa tự động.
          </div>
        </div>
      )}

      {/* ── THẺ HERO SCORECARD (ĐIỂM TỔNG HỢP & 4 KPI TRỤ CỘT) ── */}
      <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-gradient-to-br from-gray-50/80 via-white to-gray-50/40 dark:from-gray-800/80 dark:via-gray-800/40 dark:to-gray-900/60 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Xếp Hạng Tín Nhiệm Lợi Nhuận
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${gradeBadge}`}>
                {grade}
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 max-w-2xl leading-relaxed">
              {gradeDesc}
            </p>
          </div>

          {/* Big Number Score */}
          <div className="text-right shrink-0 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs">
            <div className="text-[10px] text-gray-400 font-semibold uppercase">Điểm Chất Lượng Lợi Nhuận</div>
            <div className={`text-4xl font-black mt-0.5 ${
              score >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
              score >= 65 ? 'text-blue-600 dark:text-blue-400' :
              score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {score}<span className="text-lg font-bold text-gray-400">/100</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              Tần suất CFO &gt; LNST: <strong className="text-gray-700 dark:text-gray-300">{cfoNiWinRate}%</strong> các kỳ
            </div>
          </div>
        </div>

        {/* 4 Thẻ KPI Trụ Cột Kỳ Mới Nhất */}
        {latest && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {/* KPI 1: Tỷ Lệ CFO / LNST */}
            <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                1. Tỷ Lệ Chuyển Đổi Tiền (CFO / LNST)
              </div>
              <div className={`text-2xl font-black mt-1 ${
                latest.cfoToNi >= 1.0 ? 'text-emerald-600 dark:text-emerald-400' :
                latest.cfoToNi >= 0.7 ? 'text-blue-600 dark:text-blue-400' :
                latest.cfoToNi > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {latest.cfoToNi.toFixed(2)}x
              </div>
              <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                <span>Chuẩn an toàn: &ge; 1.0x</span>
                <span className="font-semibold text-gray-600 dark:text-gray-300">
                  {latest.cfoToNi >= 1.0 ? '✓ Tiền dồi dào' : (latest.cfoToNi >= 0.7 ? 'Khá' : '⚠️ Tiền hụt')}
                </span>
              </div>
            </div>

            {/* KPI 2: Hệ Số Dồn Tích Sloan Accrual */}
            <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                2. Hệ Số Dồn Tích Sloan Accrual
              </div>
              <div className={`text-2xl font-black mt-1 ${
                latest.sloanAccrual <= -3.0 ? 'text-emerald-600 dark:text-emerald-400' :
                latest.sloanAccrual <= 5.0 ? 'text-blue-600 dark:text-blue-400' :
                latest.sloanAccrual <= 10.0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {latest.sloanAccrual > 0 ? `+${latest.sloanAccrual.toFixed(2)}%` : `${latest.sloanAccrual.toFixed(2)}%`}
              </div>
              <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                <span>(LNST - CFO) / TTS</span>
                <span className="font-semibold text-gray-600 dark:text-gray-300">
                  {latest.sloanAccrual <= 0 ? '✓ Tiền > Sổ sách' : (latest.sloanAccrual <= 5.0 ? 'Bình thường' : '⚠️ Dồn tích cao')}
                </span>
              </div>
            </div>

            {/* KPI 3: Earnings-Cash Gap */}
            <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                3. Độ Lệch LNST - CFO (Gap)
              </div>
              <div className={`text-2xl font-black mt-1 ${
                latest.gap <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {latest.gap > 0 ? `+${formatBn(latest.gap)}` : formatBn(latest.gap)}
              </div>
              <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                <span>{latest.gap <= 0 ? 'Thặng dư tiền mặt' : 'Tiền chưa thu về'}</span>
                <span className="font-semibold text-gray-600 dark:text-gray-300">
                  {latest.periodLabel}
                </span>
              </div>
            </div>

            {/* KPI 4: Tăng Trưởng Phải Thu vs Doanh Thu */}
            <div className="p-3.5 bg-white dark:bg-gray-800/90 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                4. Phải Thu vs Doanh Thu (YoY)
              </div>
              <div className={`text-2xl font-black mt-1 ${
                isBank ? 'text-gray-500' :
                latest.arGrowth <= latest.revGrowth ? 'text-emerald-600 dark:text-emerald-400' :
                latest.arGrowth <= latest.revGrowth + 10 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {isBank ? 'Đặc thù NH' : `${latest.arGrowth >= 0 ? '+' : ''}${latest.arGrowth.toFixed(1)}%`}
              </div>
              <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                <span>Tăng DT: {isBank ? '—' : `${latest.revGrowth >= 0 ? '+' : ''}${latest.revGrowth.toFixed(1)}%`}</span>
                <span className="font-semibold text-gray-600 dark:text-gray-300">
                  {isBank ? 'Kiểm soát tốt' : (latest.arGrowth <= latest.revGrowth ? '✓ Thu tiền tốt' : '⚠️ Bán chịu')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BỘ CẢNH BÁO BẪY SỐ LIỆU KẾ TOÁN DỒN TÍCH (RED FLAGS) NẾU CÓ ── */}
      {redFlags.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>🚨</span>
            <span>Các Cảnh Báo Bẫy Số Liệu Cần Lưu Ý ({redFlags.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {redFlags.map(rf => (
              <div
                key={rf.id}
                className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-1 ${
                  rf.severity === 'critical'
                    ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                    : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  <span>{rf.icon}</span>
                  <span>{rf.title}</span>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-300 pl-5">
                  {rf.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BIỂU ĐỒ TRỰC QUAN HÓA KẾT HỢP RECHARTS (COMPOSED CHART) ── */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
            <span>📊</span>
            <span>Tương Quan Dòng Tiền Kinh Doanh (CFO) vs Lợi Nhuận Sau Thuế (LNST) & Hệ Số Sloan</span>
          </div>
          <div className="text-[11px] text-gray-400">
            Cột Trái: <strong>Tỷ VNĐ</strong> · Trục Phải: <strong>Sloan Accruals (%)</strong>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={seriesData}
              margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} opacity={0.6} />
              <XAxis
                dataKey="periodLabel"
                stroke={chartTheme.textColor}
                tick={{ fill: chartTheme.textColor, fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                stroke={chartTheme.textColor}
                tick={{ fill: chartTheme.textColor, fontSize: 11 }}
                tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke={chartTheme.textColor}
                tick={{ fill: chartTheme.textColor, fontSize: 11 }}
                tickFormatter={(val) => `${val}%`}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartTheme.tooltipBg,
                  borderColor: chartTheme.tooltipBorder,
                  borderRadius: '16px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                  fontSize: '12px',
                }}
                formatter={(value, name) => {
                  if (name === 'Sloan Accrual Ratio') return [`${Number(value).toFixed(2)}%`, name];
                  return [formatBn(value), name];
                }}
                labelStyle={{ fontWeight: 'bold', color: chartTheme.tooltipText, marginBottom: '4px' }}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                iconType="circle"
              />
              <ReferenceLine yAxisId="right" y={0} stroke={chartTheme.axisColor} strokeDasharray="2 2" />
              <ReferenceLine yAxisId="right" y={10} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Ngưỡng Rủi Ro +10%', fill: '#ef4444', fontSize: 10, position: 'right' }} />
              <ReferenceLine yAxisId="right" y={-3} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Vùng Tiền Tươi <-3%', fill: '#10b981', fontSize: 10, position: 'right' }} />

              {/* Cột CFO: Xanh ngọc */}
              <Bar
                yAxisId="left"
                dataKey="cfo"
                name="Dòng Tiền Kinh Doanh (CFO)"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />

              {/* Cột LNST: Tím Indigo */}
              <Bar
                yAxisId="left"
                dataKey="netIncome"
                name="Lợi Nhuận Sau Thuế (LNST)"
                fill="#6366f1"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />

              {/* Đường Line: Hệ Số Sloan Accrual */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="sloanAccrual"
                name="Sloan Accrual Ratio"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#ffffff' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── BẢNG ĐỐI SOÁT PHÁP Y CHI TIẾT TỪNG KỲ ── */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span>📑</span>
            <span>Bảng Giải Phẫu Chi Tiết Chuỗi Thời Gian ({seriesData.length} Kỳ)</span>
          </div>
          <span className="text-[11px] text-gray-400 font-normal">Đơn vị: Tỷ VNĐ</span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700/80">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 uppercase font-bold text-[10px] tracking-wider border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="py-3 px-3.5">Kỳ BCTC</th>
                <th className="py-3 px-3 text-right">Doanh Thu</th>
                <th className="py-3 px-3 text-right">LNST (NI)</th>
                <th className="py-3 px-3 text-right">CFO (Tiền Thực)</th>
                <th className="py-3 px-3 text-right">CFO / LNST</th>
                <th className="py-3 px-3 text-right">Sloan Accrual</th>
                <th className="py-3 px-3 text-right">Độ Lệch (Gap)</th>
                <th className="py-3 px-3 text-right">Phải Thu</th>
                <th className="py-3 px-3 text-right">Tồn Kho</th>
                <th className="py-3 px-3.5 text-center">Đánh Giá</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-medium">
              {seriesData.map((row, idx) => (
                <tr
                  key={row.periodLabel}
                  className={`hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors ${
                    idx === seriesData.length - 1 ? 'bg-indigo-50/20 dark:bg-indigo-950/10 font-bold' : ''
                  }`}
                >
                  <td className="py-3 px-3.5 text-gray-900 dark:text-white flex items-center gap-1.5">
                    {idx === seriesData.length - 1 && <span className="text-[10px] px-1.5 py-0.2 bg-indigo-600 text-white rounded">Mới</span>}
                    <span>{row.periodLabel}</span>
                  </td>
                  <td className="py-3 px-3 text-right text-gray-700 dark:text-gray-300">
                    {formatBn(row.revenue)}
                  </td>
                  <td className="py-3 px-3 text-right text-indigo-600 dark:text-indigo-400 font-bold">
                    {formatBn(row.netIncome)}
                  </td>
                  <td className={`py-3 px-3 text-right font-bold ${
                    row.cfo >= row.netIncome ? 'text-emerald-600 dark:text-emerald-400' :
                    row.cfo > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {formatBn(row.cfo)}
                  </td>
                  <td className={`py-3 px-3 text-right font-bold ${
                    row.cfoToNi >= 1.0 ? 'text-emerald-600 dark:text-emerald-400' :
                    row.cfoToNi >= 0.7 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {row.cfoToNi.toFixed(2)}x
                  </td>
                  <td className={`py-3 px-3 text-right font-bold ${
                    row.sloanAccrual <= -3.0 ? 'text-emerald-600 dark:text-emerald-400' :
                    row.sloanAccrual <= 5.0 ? 'text-blue-600 dark:text-blue-400' :
                    row.sloanAccrual <= 10.0 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {row.sloanAccrual > 0 ? `+${row.sloanAccrual.toFixed(2)}%` : `${row.sloanAccrual.toFixed(2)}%`}
                  </td>
                  <td className={`py-3 px-3 text-right ${row.gap <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {row.gap > 0 ? `+${formatBn(row.gap)}` : formatBn(row.gap)}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-600 dark:text-gray-400">
                    {isBank ? '—' : formatBn(row.accountsReceivable)}
                  </td>
                  <td className="py-3 px-3 text-right text-gray-600 dark:text-gray-400">
                    {isBank || row.inventory === 0 ? '—' : formatBn(row.inventory)}
                  </td>
                  <td className="py-3 px-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.statusBadge}`}>
                      {row.statusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Ý NGHĨA THỰC CHIẾN & LỜI KHUYÊN ĐẦU TƯ THEO RICHARD SLOAN ── */}
      <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/40 text-xs text-gray-600 dark:text-gray-300 leading-relaxed space-y-2">
        <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
          <span>💡</span>
          <span>Bí Quyết Thực Chiến: Hiện Tượng Bất Thường Dồn Tích (Sloan Accrual Anomaly)</span>
        </div>
        <p>
          Trong nghiên cứu kinh điển công bố năm 1996 trên <em>The Accounting Review</em>, Giáo sư Richard Sloan (Đại học Michigan) đã chứng minh rằng: <strong>Các cổ phiếu có tỷ lệ dồn tích thấp (Accrual &lt; 0%, CFO &gt; Net Income) liên tục mang lại tỷ suất sinh lời vượt trội thị trường</strong> trong dài hạn. Ngược lại, các công ty có dồn tích cao (&gt; +10%) thường phải đối mặt với các đợt sụt giảm định giá nặng nề do sự đảo chiều tất yếu của dòng tiền và chi phí trích lập dự phòng.
        </p>
      </div>
    </div>
  );
}
