import React, { useState, useEffect, useMemo } from 'react';

/**
 * Lấy chuỗi ngày YYYY-MM-DD theo giờ địa phương của người dùng (GMT+7)
 */
export function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Định dạng ngày DD/MM/YYYY hiển thị thân thiện
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Tính toán mốc ngày bắt đầu và kết thúc chuẩn xác theo preset
 * @param {'all' | 'ytd' | '1y' | 'mtd' | 'custom'} preset
 * @param {string} [customStart=''] YYYY-MM-DD
 * @param {string} [customEnd=''] YYYY-MM-DD
 * @returns {{ preset: string, startDate: string, endDate: string, label: string, isFiltered: boolean }}
 */
export function calculateDateRange(preset = 'all', customStart = '', customEnd = '') {
  const now = new Date();
  const todayStr = getLocalDateString(now);

  switch (preset) {
    case 'ytd': {
      const start = `${now.getFullYear()}-01-01`;
      return {
        preset: 'ytd',
        startDate: start,
        endDate: todayStr,
        label: `Năm ${now.getFullYear()} (YTD)`,
        isFiltered: true,
      };
    }
    case '1y': {
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      return {
        preset: '1y',
        startDate: getLocalDateString(oneYearAgo),
        endDate: todayStr,
        label: '1 Năm Gần Nhất',
        isFiltered: true,
      };
    }
    case 'mtd': {
      const monthStr = String(now.getMonth() + 1).padStart(2, '0');
      const start = `${now.getFullYear()}-${monthStr}-01`;
      return {
        preset: 'mtd',
        startDate: start,
        endDate: todayStr,
        label: `Tháng ${monthStr}/${now.getFullYear()} (MTD)`,
        isFiltered: true,
      };
    }
    case 'custom': {
      let label = 'Tùy chỉnh';
      if (customStart && customEnd) {
        label = `${formatDisplayDate(customStart)} → ${formatDisplayDate(customEnd)}`;
      } else if (customStart) {
        label = `Từ ${formatDisplayDate(customStart)}`;
      } else if (customEnd) {
        label = `Đến ${formatDisplayDate(customEnd)}`;
      }
      return {
        preset: 'custom',
        startDate: customStart || '',
        endDate: customEnd || '',
        label,
        isFiltered: Boolean(customStart || customEnd),
      };
    }
    case 'all':
    default:
      return {
        preset: 'all',
        startDate: '',
        endDate: '',
        label: 'Toàn thời gian',
        isFiltered: false,
      };
  }
}

/**
 * Component Bộ Lọc Chu Kỳ Thời Gian & Khoảng Ngày Dùng Chung (TimeHorizonFilter)
 * Kết hợp dải nút Segments Pill (Toàn thời gian, YTD, 1Y, MTD) và Custom Date Range Picker
 *
 * @param {Object} props
 * @param {'all' | 'ytd' | '1y' | 'mtd' | 'custom'} [props.preset='all']
 * @param {string} [props.startDate=''] YYYY-MM-DD
 * @param {string} [props.endDate=''] YYYY-MM-DD
 * @param {Function} props.onChange ({ preset, startDate, endDate, label, isFiltered }) => void
 * @param {string} [props.customLabel='Khoảng Ngày:']
 * @param {boolean} [props.showCustomToggle=true] Có hiển thị nút "Tùy chỉnh" hay không
 * @param {boolean} [props.allowExpand=true] Cho phép mở rộng 2 ô input ngày
 * @param {boolean} [props.showSummaryBadge=false] Hiển thị badge tóm tắt nhãn đang chọn
 * @param {string} [props.className='']
 */
export default function TimeHorizonFilter({
  preset = 'all',
  startDate = '',
  endDate = '',
  onChange,
  customLabel = 'Khoảng Ngày:',
  showCustomToggle = true,
  allowExpand = true,
  showSummaryBadge = false,
  className = '',
}) {
  const [internalPreset, setInternalPreset] = useState(preset || 'all');
  const [customStart, setCustomStart] = useState(startDate || '');
  const [customEnd, setCustomEnd] = useState(endDate || '');
  const [isCustomExpanded, setIsCustomExpanded] = useState(preset === 'custom' || Boolean(startDate || endDate));

  // Đồng bộ props từ ngoài vào nếu có thay đổi
  useEffect(() => {
    if (preset !== undefined) setInternalPreset(preset);
  }, [preset]);

  useEffect(() => {
    if (startDate !== undefined) setCustomStart(startDate);
  }, [startDate]);

  useEffect(() => {
    if (endDate !== undefined) setCustomEnd(endDate);
  }, [endDate]);

  useEffect(() => {
    if (internalPreset === 'custom' || customStart || customEnd) {
      setIsCustomExpanded(true);
    }
  }, [internalPreset, customStart, customEnd]);

  // Danh sách các presets tiêu chuẩn
  const PRESET_BUTTONS = useMemo(() => [
    { id: 'all', label: 'Toàn thời gian', shortLabel: 'Tất cả' },
    { id: 'ytd', label: 'YTD', shortLabel: 'YTD' },
    { id: '1y', label: '1Y', shortLabel: '1Y' },
    { id: 'mtd', label: 'MTD', shortLabel: 'MTD' },
  ], []);

  // Xử lý khi bấm nút Preset
  const handlePresetClick = (pId) => {
    setInternalPreset(pId);
    if (pId === 'custom') {
      setIsCustomExpanded(true);
      const res = calculateDateRange('custom', customStart, customEnd);
      if (onChange) onChange(res);
      return;
    }

    // Nếu chọn all, ytd, 1y, mtd
    setIsCustomExpanded(false);
    const res = calculateDateRange(pId);
    setCustomStart(res.startDate);
    setCustomEnd(res.endDate);
    if (onChange) onChange(res);
  };

  // Bật/tắt ô chọn ngày tùy chỉnh
  const handleToggleCustom = () => {
    if (isCustomExpanded && internalPreset === 'custom') {
      // Đang mở custom mà bấm lại -> quay về 'all'
      handlePresetClick('all');
    } else {
      setIsCustomExpanded(true);
      setInternalPreset('custom');
      const res = calculateDateRange('custom', customStart, customEnd);
      if (onChange) onChange(res);
    }
  };

  // Xử lý khi thay đổi input ngày bắt đầu
  const handleStartDateChange = (val) => {
    setCustomStart(val);
    setInternalPreset('custom');
    const res = calculateDateRange('custom', val, customEnd);
    if (onChange) onChange(res);
  };

  // Xử lý khi thay đổi input ngày kết thúc
  const handleEndDateChange = (val) => {
    setCustomEnd(val);
    setInternalPreset('custom');
    const res = calculateDateRange('custom', customStart, val);
    if (onChange) onChange(res);
  };

  // Đặt lại về Toàn thời gian
  const handleResetToAll = () => {
    setInternalPreset('all');
    setCustomStart('');
    setCustomEnd('');
    setIsCustomExpanded(false);
    const res = calculateDateRange('all');
    if (onChange) onChange(res);
  };

  const currentInfo = useMemo(() => {
    return calculateDateRange(internalPreset, customStart, customEnd);
  }, [internalPreset, customStart, customEnd]);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* ── 1. HÀNG NÚT BẤM PILL SEGMENTS ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl text-xs border border-slate-200/50 dark:border-slate-750">
          {PRESET_BUTTONS.map((item) => {
            const isActive = internalPreset === item.id && (item.id !== 'all' || (!customStart && !customEnd));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePresetClick(item.id)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                }`}
                title={`Lọc dữ liệu ${item.label}`}
              >
                <span className="sm:hidden">{item.shortLabel}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            );
          })}

          {showCustomToggle && (
            <button
              type="button"
              onClick={handleToggleCustom}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                internalPreset === 'custom'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
              }`}
              title="Chọn khoảng ngày khớp lệnh tùy chỉnh"
            >
              <span>📅</span>
              <span className="hidden sm:inline">Tùy chỉnh</span>
            </button>
          )}
        </div>

        {/* Badge Tóm Tắt (Tùy chọn) */}
        {showSummaryBadge && currentInfo.isFiltered && (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/50 flex items-center gap-1.5 animate-in fade-in duration-200">
            <span>⏱️</span>
            <span>{currentInfo.label}</span>
          </span>
        )}

        {/* Nút Xóa Nhanh nếu đang áp dụng bộ lọc */}
        {currentInfo.isFiltered && (
          <button
            type="button"
            onClick={handleResetToAll}
            className="text-[11px] font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Xóa bộ lọc thời gian, quay về Toàn thời gian"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── 2. KHU VỰC CHỌN NGÀY TÙY CHỈNH (EXPANDABLE DATE PICKER) ── */}
      {allowExpand && isCustomExpanded && (
        <div className="p-2.5 sm:p-3 bg-slate-50/90 dark:bg-slate-850/80 rounded-xl border border-slate-200/70 dark:border-slate-750 flex flex-col sm:flex-row sm:items-center gap-2.5 text-xs animate-in fade-in duration-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 shrink-0 flex items-center gap-1">
            <span>🗓️</span> {customLabel}
          </span>

          <div className="flex items-center gap-1.5 w-full sm:w-auto flex-1">
            <input
              type="date"
              value={customStart}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-1/2 sm:w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              title="Ngày bắt đầu (Từ ngày)"
            />
            <span className="text-slate-400 font-bold shrink-0">→</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="w-1/2 sm:w-36 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              title="Ngày kết thúc (Đến ngày)"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
            {(customStart || customEnd) && (
              <button
                type="button"
                onClick={handleResetToAll}
                className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 px-2 py-1 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Đặt lại
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCustomExpanded(false)}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-1 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Thu gọn bộ chọn ngày"
            >
              ▲ Thu gọn
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
