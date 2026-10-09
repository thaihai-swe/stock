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
  if (value > 0) return 'text-green-600';
  if (value < 0) return 'text-red-500';
  return 'text-gray-500';
}

export function plBg(value) {
  if (value > 0) return 'bg-green-50 text-green-700';
  if (value < 0) return 'bg-red-50 text-red-600';
  return 'bg-gray-100 text-gray-600';
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

// Lấy màu đồng bộ theo thứ tự mã trong danh mục
export function getStockColor(symbol, portfolio = []) {
  const index = portfolio.findIndex(p => p.symbol === symbol);
  if (index === -1) return PORTFOLIO_COLORS[0];
  return PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length];
}

// 8. Định dạng phân tầng màu sắc theo mốc Tỷ Trọng (%)
export function getAllocationTier(pct) {
  const val = typeof pct === 'number' ? pct : parseFloat(pct) || 0;
  if (val >= 50) {
    return {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-300',
      bar: 'bg-red-500',
      label: 'Cực cao (>50%)',
      isWarning: true,
    };
  }
  if (val >= 40) {
    return {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      bar: 'bg-amber-500',
      label: 'Rất cao (40-50%)',
      isWarning: false,
    };
  }
  if (val >= 25) {
    return {
      bg: 'bg-indigo-50',
      text: 'text-indigo-700',
      border: 'border-indigo-200',
      bar: 'bg-indigo-600',
      label: 'Chủ lực (25-40%)',
      isWarning: false,
    };
  }
  if (val >= 10) {
    return {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      bar: 'bg-blue-500',
      label: 'Vừa phải (10-25%)',
      isWarning: false,
    };
  }
  return {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    bar: 'bg-slate-400',
    label: 'Thấp (<10%)',
    isWarning: false,
  };
}

// 9. So sánh Giá vốn TB với Giá thị trường
export function compareAvgCostWithMarket(avgCost, marketPrice) {
  if (!avgCost || avgCost <= 0 || !marketPrice || marketPrice <= 0) {
    return {
      textColor: 'text-gray-900',
      badgeClass: 'bg-gray-100 text-gray-500 border-gray-200',
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
      textColor: 'text-emerald-600',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
      textColor: 'text-red-600',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
      diffPct,
      diffAmount: Math.abs(diffAmount),
      label: `Cao hơn TT ${diffPct}%`,
      shortLabel: `+${diffPct}%`,
      status: 'loss',
    };
  }

  return {
    textColor: 'text-yellow-600',
    badgeClass: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    diffPct: 0,
    diffAmount: 0,
    label: 'Bằng giá TT',
    shortLabel: 'Hòa',
    status: 'even',
  };
}
