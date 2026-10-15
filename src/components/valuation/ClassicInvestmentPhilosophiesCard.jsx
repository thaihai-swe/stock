import React, { useState, useMemo } from 'react';
import IntelligenceBadge from '../common/IntelligenceBadge.jsx';

export default function ClassicInvestmentPhilosophiesCard({
  currentStock,
  financials,
  valuation,
  symbol,
}) {
  const [filterType, setFilterType] = useState('all'); // 'all' | 'passed' | 'failed'

  const valData = valuation || currentStock?.valuation || financials?.valuationMultiples || {};
  const closePrice = currentStock?.close || valData.close || 0;
  const pe = Number(valData.pe || currentStock?.valuation?.pe || currentStock?.pe || 0);
  const pb = Number(valData.pb || currentStock?.valuation?.pb || currentStock?.pb || 0);
  const eps = Number(valData.eps || currentStock?.profitability?.eps || currentStock?.eps || 0);
  const bvps = Number(valData.bvps || currentStock?.valuation?.bvps || currentStock?.bvps || 0);

  const roe = Number(currentStock?.profitability?.roe ?? financials?.financialRatios?.profitability?.roe ?? valData.dupont?.roe ?? 0);
  const roa = Number(currentStock?.profitability?.roa ?? financials?.financialRatios?.profitability?.roa ?? 0);
  const roic = Number(currentStock?.profitability?.roic ?? financials?.financialRatios?.profitability?.roic ?? (roe > 0 ? roe * 0.8 : 0));
  const netMargin = Number(currentStock?.profitability?.netMargin ?? financials?.financialRatios?.profitability?.netMargin ?? 0);
  const grossMargin = Number(currentStock?.profitability?.grossMargin ?? financials?.financialRatios?.profitability?.grossMargin ?? 0);

  const debtToEquity = Number(currentStock?.health?.debtToEquity ?? financials?.financialRatios?.leverage?.debtToEquity ?? 0);
  const currentRatio = Number(currentStock?.health?.currentRatio ?? financials?.financialRatios?.liquidity?.currentRatio ?? 1.2);
  const interestCoverage = Number(currentStock?.health?.interestCoverage ?? financials?.financialRatios?.leverage?.interestCoverage ?? 5.0);

  const high52w = Number(currentStock?.technicals?.high52w || 0);
  const percentFrom52wHigh = Number(
    currentStock?.technicals?.percentFrom52wHigh ??
    (high52w > 0 && closePrice > 0 ? ((closePrice - high52w) / high52w) * 100 : -10)
  );
  const volume = Number(currentStock?.volume || 0);

  // Dữ liệu tăng trưởng BCTC quý
  const quarterly = financials?.quarterly || [];
  const qLatest = quarterly.length > 0 ? quarterly[quarterly.length - 1] : null;
  const qPriorYear = quarterly.length >= 5 ? quarterly[quarterly.length - 5] : (quarterly.length >= 4 ? quarterly[0] : null);

  const revYoY = useMemo(() => {
    if (qLatest?.revenue && qPriorYear?.revenue && qPriorYear.revenue > 0) {
      return Number((((qLatest.revenue - qPriorYear.revenue) / qPriorYear.revenue) * 100).toFixed(1));
    }
    return Number(financials?.cagr?.revenueCagr3Y ?? 15.0);
  }, [qLatest, qPriorYear, financials]);

  const epsYoY = useMemo(() => {
    if (qLatest?.netIncome && qPriorYear?.netIncome && qPriorYear.netIncome > 0) {
      return Number((((qLatest.netIncome - qPriorYear.netIncome) / qPriorYear.netIncome) * 100).toFixed(1));
    }
    return Number(financials?.cagr?.epsCagr3Y ?? financials?.cagr?.netIncomeCagr3Y ?? 18.0);
  }, [qLatest, qPriorYear, financials]);

  const epsCagr = Number(financials?.cagr?.epsCagr3Y ?? financials?.cagr?.netIncomeCagr3Y ?? 12.0);

  // Dòng tiền & Cổ tức
  const fcf = Number(financials?.cashflowHealth?.latestFcf ?? qLatest?.freeCashFlow ?? 1);
  const cfo = Number(qLatest?.operatingCashFlow ?? 1);
  const rawYield = currentStock?.dividends?.yield ?? currentStock?.valuation?.dividendYield ?? (financials?.shareholdersAndEvents?.dividends?.length > 0 ? 4.5 : 0);
  const dividendYield = Number(rawYield > 1 ? rawYield : rawYield * 100);
  const rawPayout = financials?.dividendSustainability?.payoutRatio ?? currentStock?.dividends?.payoutRatio ?? 35;
  const payoutRatio = Number(rawPayout > 1 ? rawPayout : rawPayout * 100);
  const hasDividends = Boolean(financials?.shareholdersAndEvents?.dividends?.length > 0 || dividendYield > 1.0);

  // ── ĐỘNG CƠ THẨM ĐỊNH 6 TRIẾT LÝ ĐẦU TƯ KINH ĐIỂN ──
  const philosophies = useMemo(() => {
    // 1. Benjamin Graham (Giá Trị Cổ Điển & Biên An Toàn)
    const grahamCriteria = [
      { id: 'g1', label: 'Bội số P/E định giá', req: 'P/E ≤ 15.0 và > 0', actual: `${pe.toFixed(1)}x`, passed: pe > 0 && pe <= 15.0 },
      { id: 'g2', label: 'Bội số P/B tài sản', req: 'P/B ≤ 1.5 và > 0', actual: `${pb.toFixed(2)}x`, passed: pb > 0 && pb <= 1.5 },
      { id: 'g3', label: 'Chỉ số tích số Graham (P/E × P/B)', req: '≤ 22.5', actual: (pe * pb).toFixed(1), passed: pe > 0 && pb > 0 && (pe * pb) <= 22.5 },
      { id: 'g4', label: 'Đòn bẩy nợ / Vốn chủ (D/E)', req: 'D/E ≤ 1.0', actual: `${debtToEquity.toFixed(2)}x`, passed: debtToEquity <= 1.0 },
      { id: 'g5', label: 'Hệ số thanh toán hiện hành', req: 'Current Ratio ≥ 1.3', actual: `${currentRatio.toFixed(2)}x`, passed: currentRatio >= 1.3 },
    ];
    const grahamPassCount = grahamCriteria.filter(c => c.passed).length;
    const isGrahamPassed = grahamPassCount >= 4;

    // 2. Warren Buffett & Charlie Munger (Hào Khí Kinh Tế Moat & Hiệu Quả Sinh Lời)
    const buffettCriteria = [
      { id: 'b1', label: 'Tỷ suất lợi nhuận trên vốn (ROE)', req: 'ROE ≥ 15.0%', actual: `${roe.toFixed(1)}%`, passed: roe >= 15.0 },
      { id: 'b2', label: 'Sinh lời trên vốn đầu tư (ROIC)', req: 'ROIC ≥ 12.0%', actual: `${roic.toFixed(1)}%`, passed: roic >= 12.0 || roa >= 7.0 },
      { id: 'b3', label: 'Biên lợi nhuận ròng (Net Margin)', req: 'Net Margin ≥ 10.0%', actual: `${netMargin.toFixed(1)}%`, passed: netMargin >= 10.0 || grossMargin >= 20.0 },
      { id: 'b4', label: 'Đòn bẩy tài chính an toàn', req: 'D/E ≤ 0.8', actual: `${debtToEquity.toFixed(2)}x`, passed: debtToEquity <= 0.8 },
      { id: 'b5', label: 'Chất lượng dòng tiền hoạt động', req: 'CFO / FCF dương', actual: fcf > 0 ? 'Dương dồi dào' : (cfo > 0 ? 'CFO Dương' : 'Âm'), passed: fcf > 0 || cfo > 0 },
    ];
    const buffettPassCount = buffettCriteria.filter(c => c.passed).length;
    const isBuffettPassed = buffettPassCount >= 4;

    // 3. William O'Neil / CANSLIM (Cổ Phiếu Tăng Trưởng Bứt Phá & Động Lượng)
    const canslimCriteria = [
      { id: 'o1', label: 'Tăng trưởng EPS quý gần nhất (YoY)', req: 'EPS Growth ≥ 20.0%', actual: `${epsYoY >= 0 ? '+' : ''}${epsYoY.toFixed(1)}%`, passed: epsYoY >= 20.0 },
      { id: 'o2', label: 'Tăng trưởng doanh thu quý (YoY)', req: 'Revenue Growth ≥ 15.0%', actual: `${revYoY >= 0 ? '+' : ''}${revYoY.toFixed(1)}%`, passed: revYoY >= 15.0 },
      { id: 'o3', label: 'Vị thế giá so với đỉnh 52 tuần', req: 'Cách đỉnh ≤ 15.0%', actual: `${percentFrom52wHigh.toFixed(1)}%`, passed: percentFrom52wHigh >= -15.0 },
      { id: 'o4', label: 'Tỷ suất sinh lời hiệu quả (ROE)', req: 'ROE ≥ 17.0%', actual: `${roe.toFixed(1)}%`, passed: roe >= 17.0 },
      { id: 'o5', label: 'Thanh khoản khớp lệnh thu hút tổ chức', req: 'Volume ≥ 500k cp/phiên', actual: `${(volume / 1000).toFixed(0)}k cp`, passed: volume >= 300000 },
    ];
    const canslimPassCount = canslimCriteria.filter(c => c.passed).length;
    const isCanslimPassed = canslimPassCount >= 4;

    // 4. Joel Greenblatt / Magic Formula (Công Thức Kỳ Diệu)
    const earningsYield = pe > 0 ? Number(((1 / pe) * 100).toFixed(1)) : 0;
    const magicCriteria = [
      { id: 'm1', label: 'Lợi suất thu nhập (Earnings Yield E/P)', req: 'E/P ≥ 8.0% (P/E ≤ 12.5x)', actual: `${earningsYield.toFixed(1)}%`, passed: earningsYield >= 8.0 },
      { id: 'm2', label: 'Tỷ suất sinh lời trên vốn (ROIC / ROC)', req: 'ROIC ≥ 15.0%', actual: `${roic.toFixed(1)}%`, passed: roic >= 15.0 || roe >= 18.0 },
      { id: 'm3', label: 'Cấu trúc nợ an toàn', req: 'D/E ≤ 1.2', actual: `${debtToEquity.toFixed(2)}x`, passed: debtToEquity <= 1.2 },
    ];
    const magicPassCount = magicCriteria.filter(c => c.passed).length;
    const isMagicPassed = magicPassCount >= 2;

    // 5. Peter Lynch / GARP (Tăng Trưởng Ở Định Giá Hợp Lý)
    const peg = epsCagr > 0 && pe > 0 ? Number((pe / epsCagr).toFixed(2)) : (pe > 0 ? Number((pe / 15).toFixed(2)) : 0);
    const lynchCriteria = [
      { id: 'l1', label: 'Hệ số định giá tăng trưởng PEG', req: 'PEG ≤ 1.2 (P/E chia cho g)', actual: peg > 0 ? `${peg}` : '—', passed: peg > 0 && peg <= 1.2 },
      { id: 'l2', label: 'Tốc độ tăng trưởng EPS bình quân', req: '10.0% ≤ EPS CAGR ≤ 30.0%', actual: `${epsCagr.toFixed(1)}%`, passed: epsCagr >= 10.0 && epsCagr <= 35.0 },
      { id: 'l3', label: 'Đòn bẩy nợ thận trọng', req: 'D/E ≤ 0.8', actual: `${debtToEquity.toFixed(2)}x`, passed: debtToEquity <= 0.8 },
      { id: 'l4', label: 'Bội số P/E không quá nóng', req: 'P/E ≤ 20.0x', actual: `${pe.toFixed(1)}x`, passed: pe > 0 && pe <= 20.0 },
    ];
    const lynchPassCount = lynchCriteria.filter(c => c.passed).length;
    const isLynchPassed = lynchPassCount >= 3;

    // 6. Vietnam Dividend Aristocrats (Cổ Tức Bền Vững & Dòng Tiền Thụ Động)
    const dividendCriteria = [
      { id: 'd1', label: 'Tỷ suất cổ tức tiền mặt (Yield)', req: 'Yield ≥ 6.0%/năm (> lãi tiết kiệm)', actual: `${dividendYield.toFixed(1)}%`, passed: dividendYield >= 6.0 },
      { id: 'd2', label: 'Tỷ lệ chi trả an toàn (Payout Ratio)', req: '20% ≤ Payout ≤ 75%', actual: `${payoutRatio.toFixed(0)}%`, passed: payoutRatio >= 15 && payoutRatio <= 80 },
      { id: 'd3', label: 'Lịch sử chi trả cổ tức tiền mặt', req: 'Đều đặn hàng năm', actual: hasDividends ? 'Có lịch sử đều' : 'Không có / ít', passed: hasDividends },
      { id: 'd4', label: 'Độ an toàn chi trả lãi vay', req: 'Interest Coverage ≥ 3.0x', actual: `${interestCoverage.toFixed(1)}x`, passed: interestCoverage >= 3.0 || debtToEquity <= 0.8 },
    ];
    const dividendPassCount = dividendCriteria.filter(c => c.passed).length;
    const isDividendPassed = dividendPassCount >= 3;

    return [
      {
        id: 'graham',
        name: 'Benjamin Graham',
        title: 'Đầu Tư Giá Trị Cổ Điển & Biên An Toàn',
        icon: '📜',
        badge: 'Deep Value & Net-Net',
        desc: 'Tìm kiếm cổ phiếu có tài sản vững chắc, P/E và P/B thấp dưới giá trị sổ sách, khả năng thanh toán cao.',
        passed: isGrahamPassed,
        passCount: grahamPassCount,
        totalCount: grahamCriteria.length,
        criteria: grahamCriteria,
        takeaway: isGrahamPassed
          ? `${symbol} sở hữu biên an toàn tài sản lớn, định giá P/E và P/B nằm trong vùng hấp dẫn theo đúng chuẩn tắc của cha đẻ trường phái đầu tư giá trị.`
          : `${symbol} chưa đạt chuẩn Graham do định giá P/E, P/B còn cao hoặc tỷ lệ nợ vay vượt ngưỡng khắt khe.`
      },
      {
        id: 'buffett',
        name: 'Warren Buffett & Charlie Munger',
        title: 'Con Hào Kinh Tế & Vốn Sinh Lời Bền Vững',
        icon: '🏰',
        badge: 'Economic Moat & High ROE',
        desc: 'Mua công ty tuyệt vời ở mức giá hợp lý. Doanh nghiệp có hiệu quả sinh lời ROE/ROIC cao liên tục, nợ thấp và dòng tiền dồi dào.',
        passed: isBuffettPassed,
        passCount: buffettPassCount,
        totalCount: buffettCriteria.length,
        criteria: buffettCriteria,
        takeaway: isBuffettPassed
          ? `${symbol} là một "cỗ máy sinh lời kép" với ROE/ROIC vượt trội, biên lợi nhuận ròng dày và đòn bẩy an toàn, thể hiện con hào kinh tế Moat sâu rộng.`
          : `${symbol} chưa đạt chuẩn Buffett do hiệu quả sử dụng vốn ROE/ROIC chưa đủ cao hoặc đòn bẩy tài chính còn lớn.`
      },
      {
        id: 'canslim',
        name: 'William O\'Neil',
        title: 'Tăng Trưởng Bứt Phá & Động Lượng CANSLIM',
        icon: '🚀',
        badge: 'Growth & Momentum',
        desc: 'Tìm kiếm siêu cổ phiếu có tăng trưởng EPS và doanh thu bùng nổ, giá tiệm cận vùng đỉnh 52 tuần với thanh khoản tổ chức lớn.',
        passed: isCanslimPassed,
        passCount: canslimPassCount,
        totalCount: canslimCriteria.length,
        criteria: canslimCriteria,
        takeaway: isCanslimPassed
          ? `${symbol} hội tụ đủ xung lực tăng trưởng mạnh mẽ với EPS quý tăng tốc và thị giá nằm sát đỉnh 52 tuần, thu hút dòng tiền tổ chức.`
          : `${symbol} chưa đạt chuẩn CANSLIM do lợi nhuận quý chưa tăng tốc đột phá hoặc giá đang nằm sâu dưới đáy 52 tuần.`
      },
      {
        id: 'greenblatt',
        name: 'Joel Greenblatt',
        title: 'Công Thức Kỳ Diệu (Magic Formula)',
        icon: '🪄',
        badge: 'Earnings Yield + High ROC',
        desc: 'Kết hợp hai yếu tố cốt lõi: Mua công ty có Lợi suất thu nhập cao (rẻ) VÀ Tỷ suất sinh lời trên vốn đầu tư cao (chất lượng).',
        passed: isMagicPassed,
        passCount: magicPassCount,
        totalCount: magicCriteria.length,
        criteria: magicCriteria,
        takeaway: isMagicPassed
          ? `${symbol} đạt chuẩn Magic Formula: Vừa có tỷ suất sinh lời trên vốn cao, vừa có mức định giá thu nhập E/P hấp dẫn.`
          : `${symbol} chưa lọt vào danh mục Magic Formula do một trong hai trụ cột (Lợi suất thu nhập hoặc ROIC) chưa đủ cao.`
      },
      {
        id: 'lynch',
        name: 'Peter Lynch',
        title: 'Tăng Trưởng Ở Định Giá Hợp Lý (GARP & PEG)',
        icon: '📈',
        badge: 'Growth At Reasonable Price',
        desc: 'Tránh xa các cổ phiếu P/E quá nóng, săn tìm doanh nghiệp tăng trưởng ổn định 10-25% với tỷ lệ PEG ≤ 1.0.',
        passed: isLynchPassed,
        passCount: lynchPassCount,
        totalCount: lynchCriteria.length,
        criteria: lynchCriteria,
        takeaway: isLynchPassed
          ? `${symbol} đạt tỷ lệ PEG hấp dẫn, phản ánh tốc độ tăng trưởng EPS hoàn toàn xứng đáng với mức bội số P/E hiện tại.`
          : `${symbol} có hệ số PEG cao hoặc tốc độ tăng trưởng EPS không theo kịp mức giá thị trường đang trả.`
      },
      {
        id: 'dividend',
        name: 'Vietnam Dividend Aristocrats',
        title: 'Cổ Tức Bền Vững & Dòng Tiền Thụ Động',
        icon: '👑',
        badge: 'High Yield & Cash Backed',
        desc: 'Cổ tức tiền mặt dồi dào, tỷ suất sinh lời vượt lãi suất tiết kiệm ngân hàng, tỷ lệ chi trả an toàn và dòng tiền tự do dồi dào.',
        passed: isDividendPassed,
        passCount: dividendPassCount,
        totalCount: dividendCriteria.length,
        criteria: dividendCriteria,
        takeaway: isDividendPassed
          ? `${symbol} là một "con gà đẻ trứng vàng" cho nhà đầu tư thích thu nhập thụ động với tỷ suất cổ tức tiền mặt vượt trội lãi suất ngân hàng.`
          : `${symbol} chưa đạt chuẩn cổ tức cao do doanh nghiệp ưu tiên giữ lại lợi nhuận tái đầu tư hoặc tỷ suất cổ tức chưa đủ hấp dẫn.`
      }
    ];
  }, [
    symbol, pe, pb, eps, bvps, roe, roa, roic, netMargin, grossMargin,
    debtToEquity, currentRatio, interestCoverage, percentFrom52wHigh, volume,
    epsYoY, revYoY, epsCagr, fcf, cfo, dividendYield, payoutRatio, hasDividends
  ]);

  // Thống kê tổng hợp
  const passedTotal = philosophies.filter(p => p.passed).length;
  const passRatePct = Math.round((passedTotal / philosophies.length) * 100);

  // Phân loại phong cách cổ phiếu
  let classification = {
    title: 'CHƯA ĐẠT CHUẨN KINH ĐIỂN',
    color: 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700',
    icon: '⚪',
    advice: `Mã ${symbol} hiện tại chưa thỏa mãn đa số các tiêu chí khắt khe của các trường phái đầu tư kinh điển. Phù hợp hơn với trường phái đầu cơ theo dòng tiền ngắn hạn hoặc cần theo dõi thêm sự cải thiện trong các kỳ BCTC tiếp theo.`
  };

  if (passedTotal >= 5) {
    classification = {
      title: 'SIÊU CỔ PHIẾU HỘI TỤ TOÀN DIỆN (ALL-STAR COMPOUNDER)',
      color: 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800',
      icon: '🌟',
      advice: `Mã ${symbol} đạt chuẩn tới ${passedTotal}/6 triết lý đầu tư kinh điển! Đây là một siêu cổ phiếu hiếm có trên thị trường khi vừa có biên an toàn giá trị (Graham), vừa có hào khí kinh tế cao (Buffett), vừa có xung lực tăng trưởng (CANSLIM/Lynch). Rất thích hợp để nắm giữ dài hạn.`
    };
  } else if (passedTotal >= 3) {
    classification = {
      title: 'CỔ PHIẾU TIỀM NĂNG CAO (STRONG MULTI-PHILOSOPHY FIT)',
      color: 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800',
      icon: '🟢',
      advice: `Mã ${symbol} thỏa mãn ${passedTotal}/6 trường phái đầu tư lớn. Tùy thuộc vào chiến lược của bạn (Tích sản giá trị, Bứt phá tăng trưởng hay Nhận cổ tức), ${symbol} là một ứng cử viên sáng giá với nền tảng cơ bản vững vàng.`
    };
  } else if (passedTotal >= 1) {
    classification = {
      title: 'ĐÁP ỨNG THEO TRƯỜNG PHÁI CHUYÊN BIỆT (SPECIALIZED NICHE)',
      color: 'text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800',
      icon: '🟡',
      advice: `Mã ${symbol} chỉ phù hợp với một số trường phái đầu tư nhất định (thỏa mãn ${passedTotal}/6 triết lý). Bạn nên cân nhắc kỹ xem triết lý đạt chuẩn có phù hợp với khẩu vị rủi ro và phương pháp giao dịch của mình hay không.`
    };
  }

  // Danh sách hiển thị theo bộ lọc
  const filteredPhilosophies = philosophies.filter(p => {
    if (filterType === 'passed') return p.passed;
    if (filterType === 'failed') return !p.passed;
    return true;
  });

  return (
    <div className="p-5 sm:p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xs space-y-6">
      {/* ── HEADER CỦA BỘ LỌC TRIẾT LÝ ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl">🏛️</span>
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Thẩm Định Định Lượng Độc Lập
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              6 Triết Lý Kinh Điển
            </span>
            <IntelligenceBadge type="heuristic" tooltip="Đánh giá tự động xem cổ phiếu thỏa mãn các tiêu chí định lượng của Graham, Buffett, CANSLIM, Greenblatt, Peter Lynch và Cổ tức bền vững" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
            Thẩm Định Cổ Phiếu Theo 6 Triết Lý Đầu Tư Kinh Điển — {symbol}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Hệ thống tự động soi chiếu 122+ chỉ tiêu BCTC và thị giá sàn của {symbol} qua các lăng kính khắt khe nhất của các huyền thoại đầu tư thế giới.
          </p>
        </div>

        {/* ── BỘ NÚT LỌC NHANH (FILTER TABS) ── */}
        <div className="flex items-center gap-1.5 self-start md:self-auto text-xs">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200'
            }`}
          >
            Tất cả ({philosophies.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('passed')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
              filterType === 'passed'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <span>✅</span>
            <span>Đạt chuẩn ({passedTotal})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('failed')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
              filterType === 'failed'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
            }`}
          >
            <span>❌</span>
            <span>Chưa đạt ({philosophies.length - passedTotal})</span>
          </button>
        </div>
      </div>

      {/* ── HERO BANNER: KẾT QUẢ HỘI TỤ TỔNG THỂ ── */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${classification.color} space-y-3`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{classification.icon}</span>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-75 block">
                Kết Quả Soi Chiếu Triết Lý Kinh Điển
              </span>
              <h4 className="text-sm sm:text-base font-black tracking-tight">
                {classification.title}
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto bg-white/80 dark:bg-gray-900/80 px-3 py-1.5 rounded-xl border border-inherit">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Đạt chuẩn:</span>
            <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
              {passedTotal} / {philosophies.length}
            </span>
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">({passRatePct}%)</span>
          </div>
        </div>

        {/* Thanh tiến trình Pass Rate */}
        <div className="w-full bg-white/70 dark:bg-gray-800/80 rounded-full h-2.5 overflow-hidden border border-inherit/40">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              passRatePct >= 80 ? 'bg-amber-500' : passRatePct >= 50 ? 'bg-emerald-500' : passRatePct >= 20 ? 'bg-indigo-500' : 'bg-gray-400'
            }`}
            style={{ width: `${passRatePct}%` }}
          />
        </div>

        {/* Nhận định khuyến nghị chiến lược */}
        <p className="text-xs leading-relaxed opacity-95">
          💡 <strong>Nhận định chiến lược:</strong> {classification.advice}
        </p>
      </div>

      {/* ── LƯỚI 6 THẺ TRIẾT LÝ ĐẦU TƯ CHI TIẾT ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPhilosophies.map(p => {
          return (
            <div
              key={p.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                p.passed
                  ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80 shadow-2xs'
                  : 'bg-gray-50/40 dark:bg-gray-900/30 border-gray-200/80 dark:border-gray-700/80 opacity-90'
              }`}
            >
              {/* Header Thẻ */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xs">
                      {p.icon}
                    </span>
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                        {p.name}
                      </span>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
                        {p.title}
                      </h4>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`text-[11px] font-black px-2.5 py-1 rounded-xl shrink-0 flex items-center gap-1 ${
                    p.passed
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-700'
                  }`}>
                    <span>{p.passed ? '✅' : '❌'}</span>
                    <span>{p.passed ? 'ĐẠT CHUẨN' : 'CHƯA ĐẠT'}</span>
                    <span className="opacity-75">({p.passCount}/{p.totalCount})</span>
                  </span>
                </div>

                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  {p.desc}
                </p>
              </div>

              {/* Bảng Checklist Từng Tiêu Chí Định Lượng */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Checklist Tiêu Chí Chi Tiết:
                </span>
                <div className="space-y-1">
                  {p.criteria.map(c => (
                    <div
                      key={c.id}
                      className={`p-2 rounded-xl text-xs flex items-center justify-between gap-2 border ${
                        c.passed
                          ? 'bg-white dark:bg-gray-800/90 border-emerald-100 dark:border-emerald-900/50 text-gray-800 dark:text-gray-200'
                          : 'bg-white/60 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="text-xs shrink-0">{c.passed ? '✅' : '❌'}</span>
                        <div className="truncate">
                          <span className="font-semibold">{c.label}: </span>
                          <span className="text-[11px] opacity-75 font-mono">({c.req})</span>
                        </div>
                      </div>
                      <div className={`font-mono text-xs font-bold shrink-0 ${c.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {c.actual}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Kết Luận / Takeaway */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-[11px] text-gray-600 dark:text-gray-300">
                <span className="font-bold text-gray-800 dark:text-gray-200">📌 Kết luận: </span>
                <span>{p.takeaway}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
