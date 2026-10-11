// Format tiền VNĐ
export function fmtMoney(value) {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('vi-VN').format(Math.round(value));
}

export function formatVND(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return Number(value).toLocaleString('vi-VN') + ' đ';
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

// Màu lãi/lỗ chuẩn FinTech (Emerald / Rose / Slate)
export function plColor(value) {
  if (value > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (value < 0) return 'text-rose-600 dark:text-rose-400';
  return 'text-slate-500 dark:text-slate-400';
}

export function plBg(value) {
  if (value > 0) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/60';
  if (value < 0) return 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800/60';
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
}

// Tags gợi ý mặc định
export const DEFAULT_TAGS = [
  'Dài hạn',
  'Lướt sóng',
  'Bắt đáy',
  'Cơ bản',
  'Kỹ thuật',
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

// 14. Bảng màu và Phân loại nhóm ngành chuẩn GICS Việt Nam
export const SECTOR_COLORS = {
  'Ngân hàng': '#2563eb', // blue
  'Bất động sản': '#ea580c', // orange
  'Chứng khoán & Tài chính': '#0284c7', // sky
  'Nguyên vật liệu & Thép': '#78716c', // stone
  'Công nghệ thông tin': '#4f46e5', // indigo
  'Bán lẻ & Tiêu dùng': '#10b981', // emerald
  'Năng lượng & Tiện ích': '#f59e0b', // amber
  'Xây dựng & Công nghiệp': '#8b5cf6', // purple
  'Y tế & Dược phẩm': '#ec4899', // pink
  'Quỹ ETF': '#06b6d4', // cyan
  'Khác': '#64748b', // slate
};

export function getStockSector(symbol, fundamentalsMap = {}) {
  const sym = (symbol || '').toUpperCase().trim();
  if (!sym) return { name: 'Khác', icon: '📦', color: SECTOR_COLORS['Khác'] };

  // 1. Nhận diện ETF
  if (sym.startsWith('FU') || sym.startsWith('E1')) {
    return { name: 'Quỹ ETF', icon: '💎', color: SECTOR_COLORS['Quỹ ETF'] };
  }

  const fund = fundamentalsMap[sym];
  const sector = (fund?.sector || '').toLowerCase();
  const industry = (fund?.industry || '').toLowerCase();

  // 2. Tra cứu qua sector / industry từ API
  if (industry.includes('bank') || industry.includes('ngân hàng')) {
    return { name: 'Ngân hàng', icon: '🏦', color: SECTOR_COLORS['Ngân hàng'] };
  }
  if (industry.includes('real estate') || industry.includes('bất động sản') || industry.includes('property')) {
    return { name: 'Bất động sản', icon: '🏢', color: SECTOR_COLORS['Bất động sản'] };
  }
  if (industry.includes('broker') || industry.includes('securities') || industry.includes('chứng khoán') || industry.includes('investment trust') || industry.includes('fund')) {
    if (industry.includes('investment trust') && (sym.startsWith('E1') || sym.startsWith('FU'))) {
      return { name: 'Quỹ ETF', icon: '💎', color: SECTOR_COLORS['Quỹ ETF'] };
    }
    return { name: 'Chứng khoán & Tài chính', icon: '📈', color: SECTOR_COLORS['Chứng khoán & Tài chính'] };
  }
  if (industry.includes('steel') || sector.includes('mineral') || sector.includes('material') || industry.includes('chemical') || industry.includes('thép')) {
    return { name: 'Nguyên vật liệu & Thép', icon: '⛏️', color: SECTOR_COLORS['Nguyên vật liệu & Thép'] };
  }
  if (sector.includes('tech') || industry.includes('software') || industry.includes('computer') || industry.includes('công nghệ')) {
    return { name: 'Công nghệ thông tin', icon: '💻', color: SECTOR_COLORS['Công nghệ thông tin'] };
  }
  if (sector.includes('consumer') || sector.includes('retail') || industry.includes('retail') || industry.includes('food') || industry.includes('beverage')) {
    return { name: 'Bán lẻ & Tiêu dùng', icon: '🛒', color: SECTOR_COLORS['Bán lẻ & Tiêu dùng'] };
  }
  if (sector.includes('energy') || sector.includes('utility') || industry.includes('oil') || industry.includes('gas') || industry.includes('electric')) {
    return { name: 'Năng lượng & Tiện ích', icon: '⚡', color: SECTOR_COLORS['Năng lượng & Tiện ích'] };
  }
  if (sector.includes('industrial') || industry.includes('construction') || industry.includes('transport') || industry.includes('logistics')) {
    return { name: 'Xây dựng & Công nghiệp', icon: '🏗️', color: SECTOR_COLORS['Xây dựng & Công nghiệp'] };
  }
  if (sector.includes('health') || industry.includes('pharmaceutical') || industry.includes('drug')) {
    return { name: 'Y tế & Dược phẩm', icon: '💊', color: SECTOR_COLORS['Y tế & Dược phẩm'] };
  }

  // 3. Fallback theo từ điển mã quen thuộc tại VN
  const BANK_SYMS = ['VCB', 'BID', 'CTG', 'TCB', 'MBB', 'ACB', 'VPB', 'HDB', 'STB', 'SHB', 'VIB', 'TPB', 'MSB', 'OCB', 'LPB', 'SSB', 'EIB', 'BAB', 'NAB', 'BVB', 'KLB', 'PGB', 'ABB', 'VBB'];
  if (BANK_SYMS.includes(sym)) return { name: 'Ngân hàng', icon: '🏦', color: SECTOR_COLORS['Ngân hàng'] };

  const REAL_ESTATE_SYMS = ['VHM', 'VIC', 'VRE', 'NVL', 'KDH', 'NLG', 'DXG', 'PDR', 'DIG', 'CEO', 'KBC', 'IDC', 'SZC', 'BCM', 'VGC', 'ITA', 'HDG', 'TCH', 'NTL', 'DXS', 'IJC', 'KHG', 'AGG', 'SCR'];
  if (REAL_ESTATE_SYMS.includes(sym)) return { name: 'Bất động sản', icon: '🏢', color: SECTOR_COLORS['Bất động sản'] };

  const SEC_SYMS = ['SSI', 'VND', 'VCI', 'HCM', 'SHS', 'MBS', 'FTS', 'BSI', 'CTS', 'AGR', 'VIX', 'ORS', 'TVS', 'EVS', 'APG', 'VDS'];
  if (SEC_SYMS.includes(sym)) return { name: 'Chứng khoán & Tài chính', icon: '📈', color: SECTOR_COLORS['Chứng khoán & Tài chính'] };

  const MAT_SYMS = ['HPG', 'HSG', 'NKG', 'DGC', 'DCM', 'DPM', 'GVR', 'PHR', 'DPR', 'CSV', 'LAS', 'BFC', 'HT1', 'BCC', 'VCS'];
  if (MAT_SYMS.includes(sym)) return { name: 'Nguyên vật liệu & Thép', icon: '⛏️', color: SECTOR_COLORS['Nguyên vật liệu & Thép'] };

  const TECH_SYMS = ['FPT', 'CMG', 'ELC', 'SAM', 'FOX', 'ITD'];
  if (TECH_SYMS.includes(sym)) return { name: 'Công nghệ thông tin', icon: '💻', color: SECTOR_COLORS['Công nghệ thông tin'] };

  const RETAIL_SYMS = ['MWG', 'MSN', 'PNJ', 'FRT', 'VNM', 'SAB', 'MCH', 'DGW', 'PET', 'KDC', 'QNS', 'VHC', 'ANV', 'FMC', 'IDI', 'BAF', 'DBC'];
  if (RETAIL_SYMS.includes(sym)) return { name: 'Bán lẻ & Tiêu dùng', icon: '🛒', color: SECTOR_COLORS['Bán lẻ & Tiêu dùng'] };

  const ENERGY_SYMS = ['GAS', 'PLX', 'PVD', 'PVS', 'BSR', 'POW', 'REE', 'GEG', 'NT2', 'PPC', 'HND', 'VSH', 'PC1', 'TV2', 'PVB', 'PVC'];
  if (ENERGY_SYMS.includes(sym)) return { name: 'Năng lượng & Tiện ích', icon: '⚡', color: SECTOR_COLORS['Năng lượng & Tiện ích'] };

  const IND_SYMS = ['HAH', 'GMD', 'VOS', 'PVT', 'VCG', 'HHV', 'CII', 'FCN', 'LCG', 'CTD', 'HBC', 'BMP', 'NTP', 'ACV', 'VJC', 'HVN'];
  if (IND_SYMS.includes(sym)) return { name: 'Xây dựng & Công nghiệp', icon: '🏗️', color: SECTOR_COLORS['Xây dựng & Công nghiệp'] };

  const HEALTH_SYMS = ['DHG', 'DVN', 'IMP', 'TRA', 'DBD', 'DMC', 'VMD'];
  if (HEALTH_SYMS.includes(sym)) return { name: 'Y tế & Dược phẩm', icon: '💊', color: SECTOR_COLORS['Y tế & Dược phẩm'] };

  return { name: fund?.sector || 'Khác', icon: '📦', color: SECTOR_COLORS['Khác'] };
}

// Format tỷ VNĐ (viết tắt Bn VND)
export function formatBn(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return Number(val).toLocaleString('vi-VN') + ' tỷ';
}

// Format phần trăm có dấu (+ / -)
export function formatPercent(val) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const num = Number(val);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(1)}%`;
}

/**
 * Định dạng & suy luận chiến lược khớp lệnh bán (Sell Lot Matching Strategy)
 * Hỗ trợ 3 chiến lược:
 * - 'lowest': Khớp lô mua giá thấp nhất trước (Tối đa hóa lợi nhuận chốt ngay)
 * - 'highest': Khớp lô mua giá cao nhất trước (Hạ giá vốn cổ phiếu còn lại / Tối ưu thuế)
 * - 'fifo': Mua trước bán trước theo thứ tự thời gian (First-In First-Out)
 */
export function getMatchMethodInfo(matchMethod, matchedLots = []) {
  let method = matchMethod;

  // Tương thích ngược: Suy luận phương thức khớp nếu chưa được lưu trong DB
  if (!method && Array.isArray(matchedLots) && matchedLots.length > 1) {
    const isCostAsc = matchedLots.every((lot, i) => i === 0 || (lot.unitCost || lot.buyPrice) >= (matchedLots[i - 1].unitCost || matchedLots[i - 1].buyPrice));
    const isCostDesc = matchedLots.every((lot, i) => i === 0 || (lot.unitCost || lot.buyPrice) <= (matchedLots[i - 1].unitCost || matchedLots[i - 1].buyPrice));
    const isDateAsc = matchedLots.every((lot, i) => i === 0 || new Date(lot.buyDate) >= new Date(matchedLots[i - 1].buyDate));

    if (isCostAsc && !isCostDesc) method = 'lowest';
    else if (isCostDesc && !isCostAsc) method = 'highest';
    else if (isDateAsc) method = 'fifo';
  }

  // Mặc định chuẩn của hệ thống là 'lowest'
  method = method || 'lowest';

  switch (method) {
    case 'highest':
      return {
        key: 'highest',
        label: 'Giá vốn cao nhất',
        shortLabel: 'Lô Giá Cao',
        badge: '📈 Max Cost (Hạ vốn)',
        color: 'indigo',
        icon: '📈',
        badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        buttonBg: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40',
        description: 'Khớp các lô mua đắt nhất trước, giúp hạ giá vốn các cổ phiếu còn lại trong danh mục',
      };
    case 'fifo':
      return {
        key: 'fifo',
        label: 'Mua trước bán trước (FIFO)',
        shortLabel: 'Lô FIFO',
        badge: '⏱️ FIFO (Mua sớm)',
        color: 'emerald',
        icon: '⏱️',
        badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        buttonBg: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40',
        description: 'Khớp các lô mua sớm nhất trước theo thứ tự thời gian (First-In First-Out)',
      };
    case 'lowest':
    default:
      return {
        key: 'lowest',
        label: 'Giá vốn thấp nhất',
        shortLabel: 'Lô Giá Thấp',
        badge: '📉 Min Cost (Max lãi)',
        color: 'orange',
        icon: '📉',
        badgeBg: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        buttonBg: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40',
        description: 'Khớp các lô mua rẻ nhất trước để tối đa hóa lợi nhuận chốt lời ngay lập tức',
      };
  }
}

