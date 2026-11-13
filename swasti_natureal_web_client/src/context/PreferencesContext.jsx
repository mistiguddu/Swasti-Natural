import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getLanguage, setLanguage } from '../i18n/index.js';

export const ACCENTS = [
  { key: 'teal', label: 'Teal', swatch: 'oklch(60% 0.118 184.704)' },
  { key: 'blue', label: 'Blue', swatch: 'oklch(54.6% 0.245 262.881)' },
  { key: 'violet', label: 'Violet', swatch: 'oklch(54.1% 0.281 293.009)' },
  { key: 'rose', label: 'Rose', swatch: 'oklch(58.6% 0.253 17.585)' },
  { key: 'amber', label: 'Amber', swatch: 'oklch(66.6% 0.179 58.318)' },
];
export const MODES = ['light', 'dark', 'system'];

const PreferencesContext = createContext(null);

function read(key, allowed, fallback) {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

/** Theme mode, accent colour and language — saved per browser. */
export function PreferencesProvider({ children }) {
  const [mode, setModeState] = useState(() => read('swasti_theme_mode', MODES, 'light'));
  const [accent, setAccentState] = useState(() => read('swasti_theme_accent', ACCENTS.map((item) => item.key), 'teal'));
  const [language, setLanguageState] = useState(getLanguage);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return undefined;
    const onChange = (event) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const setMode = useCallback((value) => { localStorage.setItem('swasti_theme_mode', value); setModeState(value); }, []);
  const setAccent = useCallback((value) => { localStorage.setItem('swasti_theme_accent', value); setAccentState(value); }, []);
  const changeLanguage = useCallback((code) => { setLanguage(code); setLanguageState(code); }, []);

  const value = useMemo(() => ({
    mode, accent, language, resolvedTheme: mode === 'system' ? (systemDark ? 'dark' : 'light') : mode,
    setMode, setAccent, setLanguage: changeLanguage,
  }), [mode, accent, language, systemDark, setMode, setAccent, changeLanguage]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  return useContext(PreferencesContext);
}

/**
 * Applies the theme to <html> while `active` (signed-in screens).
 * The login page always stays in its light design.
 */
export function useApplyTheme(active) {
  const { resolvedTheme, accent } = usePreferences();
  useEffect(() => {
    const root = document.documentElement;
    if (active) {
      root.dataset.theme = resolvedTheme;
      root.dataset.accent = accent;
    } else {
      delete root.dataset.theme;
      delete root.dataset.accent;
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', active && resolvedTheme === 'dark' ? '#0f172a' : '#f0fdfa');
  }, [active, resolvedTheme, accent]);
}
