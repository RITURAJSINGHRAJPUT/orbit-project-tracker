'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Starts at the server-rendered default so the first client render matches the
  // HTML; the effect below reconciles with localStorage after hydration.
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('orbit-theme') as Theme | null;
    if (saved) setThemeState(saved);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(theme);
    localStorage.setItem('orbit-theme', theme);

    // Keep the OS status bar in step with the in-app theme. The static
    // viewport.themeColor can't do this because the theme comes from
    // localStorage, not prefers-color-scheme.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#F1F5F9' : '#0F172A');
  }, [theme, mounted]);

  const toggleTheme = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));
  const setTheme = (t: Theme) => setThemeState(t);

  // Always render children. Returning null before mount leaves the server HTML
  // body empty, so any client-side hiccup shows a blank screen with no fallback.
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
