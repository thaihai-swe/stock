import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

const ThemeContext = createContext({
  themeMode: 'system', // 'light' | 'dark' | 'system'
  effectiveTheme: 'light', // 'light' | 'dark'
  isDark: false,
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  // 1. Khởi tạo themeMode từ localStorage hoặc mặc định 'system'
  const [themeMode, setThemeModeState] = useState(() => {
    try {
      const savedMode = localStorage.getItem('stock_theme_mode');
      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
        return savedMode;
      }
      const legacyTheme = localStorage.getItem('stock_theme');
      if (legacyTheme === 'light' || legacyTheme === 'dark') {
        return legacyTheme;
      }
    } catch {
      // Fallback if localStorage is inaccessible
    }
    return 'system';
  });

  // 2. State theo dõi sở thích của hệ điều hành (OS prefers-color-scheme)
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // 3. Lắng nghe thay đổi theme từ hệ điều hành theo thời gian thực
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setSystemPrefersDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // 4. Tính toán theme có hiệu lực thực tế ('light' | 'dark')
  const effectiveTheme = useMemo(() => {
    if (themeMode === 'light') return 'light';
    if (themeMode === 'dark') return 'dark';
    return systemPrefersDark ? 'dark' : 'light';
  }, [themeMode, systemPrefersDark]);

  const isDark = effectiveTheme === 'dark';

  // 5. Cập nhật DOM (classList .dark) & lưu bộ nhớ trình duyệt
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    try {
      localStorage.setItem('stock_theme_mode', themeMode);
      localStorage.setItem('stock_theme', effectiveTheme);
    } catch {
      // Ignore storage errors
    }
  }, [isDark, themeMode, effectiveTheme]);

  // 6. Hàm đổi chế độ theme (setter có kiểm tra)
  const setThemeMode = useCallback((newMode) => {
    if (newMode === 'light' || newMode === 'dark' || newMode === 'system') {
      setThemeModeState(newMode);
    }
  }, []);

  // 7. Hàm đảo nhanh theme (Toggle)
  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      if (prev === 'system') {
        return systemPrefersDark ? 'light' : 'dark';
      }
      return prev === 'dark' ? 'light' : 'dark';
    });
  }, [systemPrefersDark]);

  // 8. Hỗ trợ phím tắt bàn phím toàn cục: Ctrl + J hoặc Cmd + J
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Tránh kích hoạt khi người dùng đang gõ trong input/textarea/contenteditable
      const targetTag = e.target?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || e.target?.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        toggleTheme();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheme]);

  const value = useMemo(() => ({
    themeMode,
    effectiveTheme,
    isDark,
    setThemeMode,
    toggleTheme,
  }), [themeMode, effectiveTheme, isDark, setThemeMode, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
