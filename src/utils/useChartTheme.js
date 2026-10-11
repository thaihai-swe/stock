import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';

export function useChartTheme() {
  const { isDark, effectiveTheme } = useTheme();

  return useMemo(() => {
    return {
      isDark,
      effectiveTheme,

      // Màu chữ hiển thị trên trục toạ độ
      textColor: isDark ? '#94a3b8' : '#475569',
      textMuted: isDark ? '#64748b' : '#94a3b8',

      // Màu lưới toạ độ (CartesianGrid)
      gridColor: isDark ? 'rgba(51, 65, 85, 0.4)' : '#e2e8f0',

      // Màu đường trục toạ độ (XAxis / YAxis line)
      axisColor: isDark ? '#334155' : '#cbd5e1',

      // Màu hộp chú giải Tooltip
      tooltipBg: isDark ? '#0f172a' : '#ffffff',
      tooltipBorder: isDark ? '#1e293b' : '#e2e8f0',
      tooltipText: isDark ? '#f8fafc' : '#0f172a',
      tooltipMuted: isDark ? '#94a3b8' : '#64748b',

      // Đường đồ thị chính & phụ (Lines / Areas)
      primaryLine: isDark ? '#818cf8' : '#4f46e5',
      secondaryLine: isDark ? '#38bdf8' : '#0284c7',

      // Trạng thái tài chính FinTech (Lãi / Lỗ / Cảnh báo)
      successColor: isDark ? '#34d399' : '#059669',
      dangerColor: isDark ? '#fb7185' : '#e11d48',
      warningColor: isDark ? '#fbbf24' : '#d97706',

      // Thẻ Card nền & viền
      cardBg: isDark ? '#111827' : '#ffffff',
      cardBorder: isDark ? '#1e293b' : '#e2e8f0',
    };
  }, [isDark, effectiveTheme]);
}
