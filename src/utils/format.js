// Format tiền VNĐ
export function fmtMoney(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('vi-VN').format(Math.round(value));
}

// Lấy ngày hôm nay định dạng YYYY-MM-DD
export function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format ngày: DD/MM/YYYY (không có giờ)
export function fmtDate(dateString) {
  if (!dateString) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(dateString)) {
    const [year, month, day] = dateString.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

// Màu lãi/lỗ
export function plColor(value) {
  if (value > 0) return 'text-green-600 dark:text-emerald-400';
  if (value < 0) return 'text-red-500 dark:text-rose-400';
  return 'text-gray-500 dark:text-slate-400';
}

export function plBg(value) {
  if (value > 0) return 'bg-green-50 text-green-700 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60';
  if (value < 0) return 'bg-red-50 text-red-600 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60';
  return 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
}

// Tags gợi ý mặc định
export const DEFAULT_TAGS = [
  'Dài hạn',
  'Lướt sóng',
  'Bắt đáy',
  'Cơ bản',
  'Kỹ thuật',
  'Theo sóng ngành',
  'Cổ tức',
];

// Danh sách thẻ tâm lý & kỷ luật đánh giá giao dịch bán (Trade Review Journal)
export const DISCIPLINE_TAGS = [
  { id: 'target', label: '🎯 Đạt mục tiêu', shortLabel: 'Đạt mục tiêu', desc: 'Chốt lời chuẩn kế hoạch đã định', type: 'disciplined', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' },
  { id: 'stoploss', label: '🛑 Cắt lỗ chuẩn', shortLabel: 'Cắt lỗ chuẩn', desc: 'Cắt lỗ dứt khoát theo kỷ luật, bảo vệ vốn', type: 'disciplined', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' },
  { id: 'early', label: '🏃 Chốt non', shortLabel: 'Chốt non', desc: 'Bán vội khi vừa chớm lời, sợ mất lãi', type: 'emotional', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' },
  { id: 'late', label: '😰 Cắt lỗ trễ', shortLabel: 'Cắt lỗ trễ', desc: 'Chần chừ để lỗ sâu (gồng lỗ) mới bán', type: 'emotional', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800' },
  { id: 'panic', label: '⚡ Bán hoảng / FOMO', shortLabel: 'Bán hoảng', desc: 'Bị tâm lý đám đông hoặc bảng điện chi phối', type: 'emotional', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800' },
  { id: 'rebalance', label: '🔄 Đảo hàng / Cơ cấu', shortLabel: 'Đảo hàng', desc: 'Bán để tái phân bổ vốn sang mã khác tốt hơn', type: 'neutral', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' },
];

export function getDisciplineTagInfo(tagName) {
  if (!tagName) return null;
  return DISCIPLINE_TAGS.find(d => d.label === tagName || d.shortLabel === tagName || tagName.includes(d.shortLabel) || tagName.includes(d.id)) || null;
}

// Tính giá hòa vốn (mặc định sau phí bán 0.1%)
export function calcBreakEvenPrice(avgCost, feePct = 0.1) {
  if (!avgCost || avgCost <= 0) return 0;
  const factor = 1 - feePct / 100;
  return factor > 0 ? Math.round(avgCost / factor) : avgCost;
}

// Bảng màu phân bổ vốn danh mục (Portfolio Allocation Colors)
export const PORTFOLIO_COLORS = [
  '#4f46e5', // indigo
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#3b82f6', // blue
  '#14b8a6', // teal
];

// Lấy màu đồng bộ theo thứ tự mã trong danh mục hoặc hash cố định theo mã
export function getStockColor(symbol, portfolio = []) {
  if (!symbol) return PORTFOLIO_COLORS[0];
  if (Array.isArray(portfolio) && portfolio.length > 0) {
    const index = portfolio.findIndex(p => (typeof p === 'string' ? p : p?.symbol) === symbol);
    if (index !== -1) {
      return PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length];
    }
  }
  // Hash code theo mã CP để màu luôn cố định và đẹp mắt
  let hash = 0;
  const str = String(symbol);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return PORTFOLIO_COLORS[Math.abs(hash) % PORTFOLIO_COLORS.length];
}

// 8. Định dạng phân tầng màu sắc theo mốc Tỷ Trọng (%)
export function getAllocationTier(pct) {
  const val = typeof pct === 'number' ? pct : parseFloat(pct) || 0;
  if (val >= 50) {
    return {
      bg: 'bg-red-50 dark:bg-rose-950/70',
      text: 'text-red-700 dark:text-rose-300',
      border: 'border-red-300 dark:border-rose-800/60',
      bar: 'bg-red-500',
      label: 'Cực cao (>50%)',
      isWarning: true,
    };
  }
  if (val >= 40) {
    return {
      bg: 'bg-amber-50 dark:bg-amber-950/70',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-300 dark:border-amber-800/60',
      bar: 'bg-amber-500',
      label: 'Rất cao (40-50%)',
      isWarning: false,
    };
  }
  if (val >= 25) {
    return {
      bg: 'bg-indigo-50 dark:bg-indigo-950/70',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800/60',
      bar: 'bg-indigo-600',
      label: 'Chủ lực (25-40%)',
      isWarning: false,
    };
  }
  if (val >= 10) {
    return {
      bg: 'bg-blue-50 dark:bg-blue-950/70',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800/60',
      bar: 'bg-blue-500',
      label: 'Vừa phải (10-25%)',
      isWarning: false,
    };
  }
  return {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    bar: 'bg-slate-400',
    label: 'Thấp (<10%)',
    isWarning: false,
  };
}

// 9. So sánh Giá vốn TB với Giá thị trường
export function compareAvgCostWithMarket(avgCost, marketPrice) {
  if (!avgCost || avgCost <= 0 || !marketPrice || marketPrice <= 0) {
    return {
      textColor: 'text-gray-900 dark:text-slate-200',
      badgeClass: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      diffPct: null,
      diffAmount: 0,
      label: '—',
      status: 'neutral',
    };
  }

  const diffAmount = marketPrice - avgCost;
  const diffPct = parseFloat(((Math.abs(diffAmount) / avgCost) * 100).toFixed(1));

  if (diffAmount > 0) {
    // Giá TT cao hơn giá vốn -> Vốn thấp hơn TT (Vị thế đang có lãi)
    return {
      textColor: 'text-emerald-600 dark:text-emerald-400',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60',
      diffPct,
      diffAmount,
      label: `Thấp hơn TT ${diffPct}%`,
      shortLabel: `-${diffPct}%`,
      status: 'profit',
    };
  }

  if (diffAmount < 0) {
    // Giá TT thấp hơn giá vốn -> Vốn cao hơn TT (Vị thế đang chịu lỗ)
    return {
      textColor: 'text-red-600 dark:text-rose-400',
      badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60',
      diffPct,
      diffAmount: Math.abs(diffAmount),
      label: `Cao hơn TT ${diffPct}%`,
      shortLabel: `+${diffPct}%`,
      status: 'loss',
    };
  }

  return {
    textColor: 'text-yellow-600 dark:text-amber-400',
    badgeClass: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800/60',
    diffPct: 0,
    diffAmount: 0,
    label: 'Bằng giá TT',
    shortLabel: 'Hòa',
    status: 'even',
  };
}

// 10. Format quy mô tiền tỷ / nghìn tỷ cho doanh nghiệp
export function fmtBillion(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const val = Number(value);
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1e12) {
    return `${sign}${(abs / 1e12).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} nghìn tỷ`;
  }
  if (abs >= 1e9) {
    return `${sign}${(abs / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
  }
  if (abs >= 1e6) {
    return `${sign}${(abs / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  }
  return fmtMoney(val) + ' đ';
}

// 11. Format số lượng cổ phiếu rút gọn
export function fmtShares(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const val = Number(value);
  if (val >= 1e9) {
    return `${(val / 1e9).toFixed(2)} tỷ CP`;
  }
  if (val >= 1e6) {
    return `${(val / 1e6).toFixed(1)} tr CP`;
  }
  return `${val.toLocaleString('vi-VN')} CP`;
}

// 12. Format phần trăm an toàn
export function fmtPercent(value, withSign = false) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  const num = Number(value);
  const sign = withSign && num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}%`;
}

// 13. Format số thập phân an toàn
export function fmtDecimal(value, digits = 2) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return Number(value).toFixed(digits);
}
