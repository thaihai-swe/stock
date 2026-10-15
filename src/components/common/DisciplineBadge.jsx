import React from 'react';
import { getDisciplineTagInfo } from '../../utils/format.js';

/**
 * DisciplineBadge - Unified Trade Journal Discipline & Strategy Badge
 *
 * Hiển thị thẻ kỷ luật hoặc chiến lược giao dịch với màu sắc quy chuẩn:
 * - Tự động đối chiếu với danh mục DISCIPLINE_TAGS (Đạt mục tiêu, Cắt lỗ, Chốt non, v.v.)
 * - Hỗ trợ các thẻ chiến lược tùy chỉnh khác (Tích sản, Bắt đáy, DCA, v.v.)
 * - Kích cỡ: 'xs' (mặc định), 'sm', 'md'
 */
export default function DisciplineBadge({
  tag,
  size = 'xs',
  showIcon = true,
  className = '',
}) {
  if (!tag) return null;

  const info = getDisciplineTagInfo(tag);

  const sizeClasses = {
    xs: 'text-[10px] px-2 py-0.5 rounded-md font-bold',
    sm: 'text-xs px-2.5 py-1 rounded-lg font-bold',
    md: 'text-sm px-3 py-1.5 rounded-xl font-bold',
  }[size] || 'text-[10px] px-2 py-0.5 rounded-md font-bold';

  // Nếu là thẻ kỷ luật đã được định nghĩa trong hệ thống
  if (info && info.color) {
    return (
      <span
        title={info.desc || tag}
        className={`inline-flex items-center gap-1 border shrink-0 ${sizeClasses} ${info.color} ${className}`}
      >
        <span>{info.shortLabel || info.label || tag}</span>
      </span>
    );
  }

  // Thẻ tùy chỉnh thông thường (Mặc định dùng tông màu Indigo nhã nhặn)
  return (
    <span
      title={tag}
      className={`inline-flex items-center gap-1 border border-indigo-200/80 dark:border-indigo-800/80 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 shrink-0 ${sizeClasses} ${className}`}
    >
      <span>🏷️</span>
      <span>{tag}</span>
    </span>
  );
}
