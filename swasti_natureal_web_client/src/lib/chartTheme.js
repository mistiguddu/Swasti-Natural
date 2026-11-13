/**
 * Chart colours. Categorical slots are assigned in this fixed order (never cycled) and
 * follow the entity, not its rank. Values are CSS variables (index.css) so charts follow
 * the light/dark theme (validated light and dark steps) and the brand accent.
 */
export const SERIES = Array.from({ length: 8 }, (_, index) => `var(--series-${index + 1})`);
export const BRAND = 'var(--color-teal-600)';
export const BRAND_SOFT = 'var(--color-teal-200)';
export const MUTED_SERIES = 'var(--color-slate-400)';

/** Fixed colour per order status so it never changes with filters. */
export const ORDER_STATUS_COLORS = {
  pending: SERIES[3],
  confirmed: SERIES[0],
  processing: SERIES[6],
  shipped: SERIES[2],
  delivered: SERIES[5],
  cancelled: SERIES[7],
  returned: SERIES[4],
};

export const axisProps = {
  tick: { fill: 'var(--color-slate-500)', fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: 'var(--color-slate-200)' },
};

export const gridProps = { stroke: 'var(--color-slate-100)', vertical: false };
