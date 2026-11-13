/**
 * Chart colours. Categorical slots are assigned in this fixed order (never cycled) and
 * follow the entity, not its rank. Single-series charts use the brand teal.
 * Palette validated with the dataviz validator for the light surface.
 */
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
export const BRAND = '#0d9488';
export const BRAND_SOFT = '#99f6e4';
export const MUTED_SERIES = '#94a3b8';

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
  tick: { fill: '#64748b', fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: '#e2e8f0' },
};

export const gridProps = { stroke: '#f1f5f9', vertical: false };
