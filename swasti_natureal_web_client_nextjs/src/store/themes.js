/**
 * Storefront colour themes. The admin picks one in Settings → Branding; it is saved on the
 * server and every customer sees it. Separate from the admin dashboard's own accent colours.
 * The storefront UI is written with `emerald-*` classes; a theme re-points that palette
 * (see [data-store-theme] in globals.css). Keys must match STORE_THEMES in the API.
 */
export const STORE_THEMES = [
  { key: 'forest', label: 'Forest Green', colors: ['#065f46', '#10b981', '#d1fae5'], meta: '#f0fdfa' },
  { key: 'lagoon', label: 'Lagoon Teal', colors: ['#115e59', '#14b8a6', '#ccfbf1'], meta: '#f0fdfa' },
  { key: 'ocean', label: 'Ocean Blue', colors: ['#1e40af', '#3b82f6', '#dbeafe'], meta: '#eff6ff' },
  { key: 'royal', label: 'Royal Indigo', colors: ['#3730a3', '#6366f1', '#e0e7ff'], meta: '#eef2ff' },
  { key: 'plum', label: 'Plum Violet', colors: ['#5b21b6', '#8b5cf6', '#ede9fe'], meta: '#f5f3ff' },
  { key: 'berry', label: 'Berry Pink', colors: ['#9d174d', '#ec4899', '#fce7f3'], meta: '#fdf2f8' },
  { key: 'sunset', label: 'Sunset Orange', colors: ['#9a3412', '#f97316', '#ffedd5'], meta: '#fff7ed' },
  { key: 'charcoal', label: 'Charcoal', colors: ['#1e293b', '#64748b', '#e2e8f0'], meta: '#f8fafc' },
];

export const DEFAULT_STORE_THEME = 'forest';

export function storeThemeOf(key) {
  return STORE_THEMES.find((theme) => theme.key === key) ?? STORE_THEMES[0];
}
