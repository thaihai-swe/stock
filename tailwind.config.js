import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Chuẩn hoá hệ màu trung tính: Map gray sang slate để triệt tiêu 100% lệch màu giữa các component
        gray: colors.slate,
        gain: colors.emerald,
        loss: colors.rose,
        theme: {
          app: 'var(--bg-app)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          subtle: 'var(--bg-subtle)',
          border: 'var(--border-subtle)',
          'border-strong': 'var(--border-strong)',
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        }
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'xs': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
