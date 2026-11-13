import bn from './bn.js';

/**
 * Lightweight i18n. English text is the key; `t()` returns the Bangla translation when
 * the language is `bn` and falls back to the English text otherwise.
 * The app re-renders on language change (PreferencesProvider keys <App> by language),
 * so `t()` can be called anywhere without a hook.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', locale: 'en' },
  { code: 'bn', label: 'বাংলা', short: 'বাং', locale: 'bn-BD' },
];

const STORAGE_KEY = 'swasti_lang';
let current = (() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return LANGUAGES.some((lang) => lang.code === saved) ? saved : 'en';
  } catch {
    return 'en';
  }
})();

export const getLanguage = () => current;
export const getLocale = () => LANGUAGES.find((lang) => lang.code === current)?.locale ?? 'en';

export function setLanguage(code) {
  current = LANGUAGES.some((lang) => lang.code === code) ? code : 'en';
  try { localStorage.setItem(STORAGE_KEY, current); } catch { /* private mode */ }
  document.documentElement.lang = current;
}

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
/** Converts 0-9 to Bangla digits when Bangla is active. */
export function digits(value) {
  const text = String(value);
  return current === 'bn' ? text.replace(/\d/g, (digit) => BN_DIGITS[digit]) : text;
}

function interpolate(text, vars) {
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? digits(vars[name]) : match));
}

/**
 * Translate. `t('Save changes')`, or with variables: `t('{count} selected', { count: 3 })`.
 * Non-string values (React nodes, numbers) are returned unchanged.
 */
export function t(text, vars) {
  if (typeof text !== 'string' || !text) return text;
  const translated = current === 'bn' ? (bn[text] ?? text) : text;
  return vars ? interpolate(translated, vars) : translated;
}

document.documentElement.lang = current;
