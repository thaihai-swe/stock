import React, { useState, useEffect, useMemo } from 'react';
import {
  TIMEFRAME_IDS,
  calculateDateRange,
  getLocalDateString,
  formatDisplayDate,
  normalizeTimeframeId,
  TIMEFRAME_PRESETS,
  getTimeframePresetList,
} from '../../utils/timeframe.js';

// Re-export để đảm bảo tương thích ngược 100% với các component đang import từ TimeHorizonFilter
export { calculateDateRange, getLocalDateString, formatDisplayDate };

/**
 * Component Bộ Lọc Chu Kỳ Thời Gian & Khoảng Ngày Dùng Chung (TimeHorizonFilter)
 * Kết hợp dải nút Segments Pill (Toàn thời gian, YTD, 1Y, MTD, hoặc bất kỳ danh sách presets nào) và Custom Date Range Picker
 *
 * @param {Object} props
 * @param {string} [props.preset='ALL']
 * @param {string} [props.startDate=''] YYYY-MM-DD
 * @param {string} [props.endDate=''] YYYY-MM-DD
 * @param {Function} props.onChange ({ preset, startDate, endDate, label, isFiltered }) => void
 * @param {Array<Object|string>} [props.presets] Danh sách nút preset tùy biến (mặc định: TIMEFRAME_PRESETS.PORTFOLIO)
 * @param {string} [props.customLabel='Khoảng Ngày:']
 * @param {boolean} [props.showCustomToggle=true] Có hiển thị nút "Tùy chỉnh" hay không
 * @param {boolean} [props.allowExpand=true] Cho phép mở rộng 2 ô input ngày
 * @param {boolean} [props.showSummaryBadge=false] Hiển thị badge tóm tắt nhãn đang chọn
 * @param {string} [props.className='']
 */
export default function TimeHorizonFilter({
  preset = TIMEFRAME_IDS.ALL,
  startDate = '',
  endDate = '',
  onChange,
  presets = null,
  customLabel = 'Khoảng Ngày:',
  showCustomToggle = true,
  allowExpand = true,
  showSummaryBadge = false,
  className = '',
}) {
  const [internalPreset, setInternalPreset] = useState(preset || TIMEFRAME_IDS.ALL);
  const [customStart, setCustomStart] = useState(startDate || '');
  const [customEnd, setCustomEnd] = useState(endDate || '');
  const [isCustomExpanded, setIsCustomExpanded] = useState(preset === TIMEFRAME_IDS.CUSTOM || Boolean(startDate || endDate));

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

  // Danh sách các presets được cấu hình
  const PRESET_BUTTONS = useMemo(() => {
    if (presets) return getTimeframePresetList(presets);
    return TIMEFRAME_PRESETS.PORTFOLIO;
  }, [presets]);

  // Xử lý khi bấm nút Preset
  const handlePresetClick = (pId) => {
    setInternalPreset(pId);
    if (pId === TIMEFRAME_IDS.CUSTOM) {
      setIsCustomExpanded(true);
      const res = calculateDateRange(TIMEFRAME_IDS.CUSTOM, customStart, customEnd);
      if (onChange) onChange(res);
      return;
    }

    // Nếu chọn preset chuẩn (ALL, YTD, 1Y, MTD, 1M, 3M, 6M...)
    setIsCustomExpanded(false);
    const res = calculateDateRange(pId);
    setCustomStart(res.startDate);
    setCustomEnd(res.endDate);
    if (onChange) onChange(res);
  };

  // Bật/tắt ô chọn ngày tùy chỉnh
  const handleToggleCustom = () => {
    if (isCustomExpanded && internalPreset === TIMEFRAME_IDS.CUSTOM) {
      // Đang mở custom mà bấm lại -> quay về ALL
      handlePresetClick(TIMEFRAME_IDS.ALL);
    } else {
      setIsCustomExpanded(true);
      setInternalPreset(TIMEFRAME_IDS.CUSTOM);
      const res = calculateDateRange(TIMEFRAME_IDS.CUSTOM, customStart, customEnd);
      if (onChange) onChange(res);
    }
  };

  // Xử lý khi thay đổi input ngày bắt đầu
  const handleStartDateChange = (val) => {
    setCustomStart(val);
    setInternalPreset(TIMEFRAME_IDS.CUSTOM);
    const res = calculateDateRange(TIMEFRAME_IDS.CUSTOM, val, customEnd);
    if (onChange) onChange(res);
  };

  // Xử lý khi thay đổi input ngày kết thúc
  const handleEndDateChange = (val) => {
    setCustomEnd(val);
    setInternalPreset(TIMEFRAME_IDS.CUSTOM);
    const res = calculateDateRange(TIMEFRAME_IDS.CUSTOM, customStart, val);
    if (onChange) onChange(res);
  };

  // Đặt lại về Toàn thời gian
  const handleResetToAll = () => {
    setInternalPreset(TIMEFRAME_IDS.ALL);
    setCustomStart('');
    setCustomEnd('');
    setIsCustomExpanded(false);
    const res = calculateDateRange(TIMEFRAME_IDS.ALL);
    if (onChange) onChange(res);
  };

  const currentInfo = useMemo(() => {
    return calculateDateRange(internalPreset, customStart, customEnd);
  }, [internalPreset, customStart, customEnd]);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* ── 1. HÀNG NÚT BẤM PILL SEGMENTS ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 rounded-xl text-xs border border-slate-200/50 dark:border-slate-700">
          {PRESET_BUTTONS.map((item) => {
            const isActive = internalPreset === item.id && (item.id !== TIMEFRAME_IDS.ALL || (!customStart && !customEnd));
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
                internalPreset === TIMEFRAME_IDS.CUSTOM
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
        <div className="p-2.5 sm:p-3 bg-slate-50/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-2.5 text-xs animate-in fade-in duration-200 shadow-2xs">
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
