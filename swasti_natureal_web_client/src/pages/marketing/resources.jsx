import { GalleryHorizontalEnd, ImageIcon, Percent, TicketPercent, Truck } from 'lucide-react';
import { Thumb } from '../../components/ui/DataTable.jsx';
import { date, money, number } from '../../lib/format.js';

const toInputDate = (value) => (value ? new Date(value).toLocaleDateString('en-CA') : '');

function schedule(row, startKey, endKey) {
  const now = Date.now();
  if (row.status !== 'active') return { status: 'inactive' };
  if (row[startKey] && new Date(row[startKey]).getTime() > now) return { status: 'scheduled', label: 'Scheduled' };
  if (row[endKey] && new Date(row[endKey]).getTime() < now) return { status: 'expired', label: 'Expired' };
  return { status: 'active' };
}

const bannerFields = [
  { name: 'title', label: 'Title', type: 'text', required: true, span: 2 },
  { name: 'subtitle', label: 'Subtitle', type: 'textarea', span: 2 },
  { name: 'image', label: 'Image', type: 'image', span: 2 },
  { name: 'link', label: 'Link URL', type: 'text', placeholder: '/collections/oils or https://…', span: 2 },
  { name: 'buttonText', label: 'Button text', type: 'text' },
  { name: 'position', label: 'Position', type: 'text', placeholder: 'home' },
  { name: 'displayOrder', label: 'Display order', type: 'number' },
  { name: 'startsAt', label: 'Starts', type: 'date' },
  { name: 'endsAt', label: 'Ends', type: 'date' },
];

const bannerColumns = [
  { key: 'image', header: 'Image', render: (row) => <Thumb src={row.image} size="h-12 w-20" icon={ImageIcon} /> },
  { key: 'title', header: 'Title', sortKey: 'title', render: (row) => <div className="min-w-40"><p className="font-semibold text-slate-900">{row.title}</p><p className="max-w-64 truncate text-xs text-slate-400">{row.subtitle}</p></div> },
  { key: 'position', header: 'Position', render: (row) => row.position },
  { key: 'displayOrder', header: 'Order', sortKey: 'displayOrder', className: 'tabular-nums' },
  { key: 'schedule', header: 'Schedule', className: 'text-xs whitespace-nowrap text-slate-500', render: (row) => (row.startsAt || row.endsAt ? `${row.startsAt ? date(row.startsAt) : '…'} → ${row.endsAt ? date(row.endsAt) : '…'}` : 'Always') },
];

/** Config-driven CRUD resources. `toForm` maps an API row to form values; `defaults` seeds new items. */
export const RESOURCES = {
  coupons: {
    title: 'Coupons', singular: 'Coupon', endpoint: '/coupons', icon: TicketPercent,
    description: 'Codes customers enter at checkout. Usage is counted on every order.',
    defaults: { code: '', description: '', type: 'percentage', value: '', minOrderAmount: '', maxDiscountAmount: '', usageLimit: '', startsAt: '', expiresAt: '', status: 'active' },
    fields: [
      { name: 'code', label: 'Coupon code', type: 'text', required: true, transform: (value) => value.toUpperCase().replace(/\s+/g, '') },
      { name: 'type', label: 'Type', type: 'select', options: [{ value: 'percentage', label: 'Percentage' }, { value: 'fixed', label: 'Fixed amount' }] },
      { name: 'value', label: 'Value', type: 'number', required: true },
      { name: 'minOrderAmount', label: 'Minimum order', type: 'number', hint: '0 = no minimum' },
      { name: 'maxDiscountAmount', label: 'Maximum discount', type: 'number', hint: '0 = no cap' },
      { name: 'usageLimit', label: 'Usage limit', type: 'number', hint: '0 = unlimited' },
      { name: 'startsAt', label: 'Starts', type: 'date' },
      { name: 'expiresAt', label: 'Expires', type: 'date' },
      { name: 'description', label: 'Description', type: 'textarea', span: 2 },
    ],
    toForm: (row) => ({ ...row, startsAt: toInputDate(row.startsAt), expiresAt: toInputDate(row.expiresAt) }),
    filters: [{ name: 'type', label: 'Type', options: [{ value: 'percentage', label: 'Percentage' }, { value: 'fixed', label: 'Fixed' }] }],
    columns: [
      { key: 'code', header: 'Code', sortKey: 'code', render: (row) => <div><code className="rounded-md bg-teal-50 px-2 py-0.5 text-sm font-bold text-teal-800 ring-1 ring-teal-100">{row.code}</code>{row.description && <p className="mt-1 max-w-56 truncate text-xs text-slate-400">{row.description}</p>}</div> },
      { key: 'value', header: 'Discount', sortKey: 'value', className: 'font-semibold tabular-nums', render: (row) => (row.type === 'percentage' ? `${row.value}%` : money(row.value)) },
      { key: 'rules', header: 'Rules', className: 'text-xs text-slate-500', render: (row) => [row.minOrderAmount ? `Min ${money(row.minOrderAmount)}` : null, row.maxDiscountAmount ? `Max ${money(row.maxDiscountAmount)}` : null].filter(Boolean).join(' · ') || '—' },
      { key: 'usage', header: 'Used', sortKey: 'usedCount', className: 'tabular-nums', render: (row) => `${number(row.usedCount)}${row.usageLimit ? ` / ${number(row.usageLimit)}` : ''}` },
      { key: 'expiresAt', header: 'Valid', sortKey: 'expiresAt', className: 'text-xs whitespace-nowrap text-slate-500', render: (row) => `${row.startsAt ? date(row.startsAt) : 'Now'} → ${row.expiresAt ? date(row.expiresAt) : 'No expiry'}` },
    ],
    schedule: (row) => schedule(row, 'startsAt', 'expiresAt'),
  },
  discounts: {
    title: 'Discounts', singular: 'Discount', endpoint: '/discounts', icon: Percent,
    description: 'Automatic price reductions applied to orders. The best matching discount wins per item.',
    defaults: { name: '', description: '', type: 'percentage', value: '', appliesTo: 'all', categories: [], products: [], startsAt: '', endsAt: '', status: 'active' },
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, span: 2 },
      { name: 'type', label: 'Type', type: 'select', options: [{ value: 'percentage', label: 'Percentage' }, { value: 'fixed', label: 'Fixed amount per item' }] },
      { name: 'value', label: 'Value', type: 'number', required: true },
      { name: 'appliesTo', label: 'Applies to', type: 'select', span: 2, options: [{ value: 'all', label: 'All products' }, { value: 'category', label: 'Specific categories' }, { value: 'product', label: 'Specific products' }] },
      { name: 'categories', label: 'Categories', type: 'multiselect', source: 'categories', span: 2, visible: (values) => values.appliesTo === 'category' },
      { name: 'products', label: 'Products', type: 'multiselect', source: 'products', span: 2, visible: (values) => values.appliesTo === 'product' },
      { name: 'startsAt', label: 'Starts', type: 'date' },
      { name: 'endsAt', label: 'Ends', type: 'date' },
      { name: 'description', label: 'Description', type: 'textarea', span: 2 },
    ],
    toForm: (row) => ({ ...row, categories: row.categories.map((item) => item.id ?? item), products: row.products.map((item) => item.id ?? item), startsAt: toInputDate(row.startsAt), endsAt: toInputDate(row.endsAt) }),
    filters: [{ name: 'appliesTo', label: 'Applies to', options: [{ value: 'all', label: 'All products' }, { value: 'category', label: 'Categories' }, { value: 'product', label: 'Products' }] }],
    columns: [
      { key: 'name', header: 'Name', sortKey: 'name', render: (row) => <div><p className="font-semibold text-slate-900">{row.name}</p>{row.description && <p className="max-w-56 truncate text-xs text-slate-400">{row.description}</p>}</div> },
      { key: 'value', header: 'Discount', sortKey: 'value', className: 'font-semibold tabular-nums', render: (row) => (row.type === 'percentage' ? `${row.value}%` : `${money(row.value)} / item`) },
      { key: 'appliesTo', header: 'Applies to', render: (row) => <span className="text-xs text-slate-600">{row.appliesTo === 'all' ? 'All products' : row.appliesTo === 'category' ? row.categories.map((item) => item.name).join(', ') : `${row.products.length} product(s)`}</span> },
      { key: 'endsAt', header: 'Valid', sortKey: 'endsAt', className: 'text-xs whitespace-nowrap text-slate-500', render: (row) => `${row.startsAt ? date(row.startsAt) : 'Now'} → ${row.endsAt ? date(row.endsAt) : 'No end'}` },
    ],
    schedule: (row) => schedule(row, 'startsAt', 'endsAt'),
  },
  banners: {
    title: 'Banners', singular: 'Banner', endpoint: '/banners', icon: ImageIcon, multipart: true,
    description: 'Promotional banners for your storefront.',
    defaults: { title: '', subtitle: '', link: '', buttonText: '', position: 'home', displayOrder: 0, startsAt: '', endsAt: '', status: 'active' },
    fields: bannerFields,
    toForm: (row) => ({ ...row, startsAt: toInputDate(row.startsAt), endsAt: toInputDate(row.endsAt) }),
    columns: bannerColumns,
    defaultSort: { sortBy: 'displayOrder', sortOrder: 'asc' },
    schedule: (row) => schedule(row, 'startsAt', 'endsAt'),
  },
  sliders: {
    title: 'Sliders', singular: 'Slide', endpoint: '/sliders', icon: GalleryHorizontalEnd, multipart: true,
    description: 'Hero slider slides shown on the home page, in display order.',
    defaults: { title: '', subtitle: '', link: '', buttonText: 'Shop now', position: 'home', displayOrder: 0, startsAt: '', endsAt: '', status: 'active' },
    fields: bannerFields,
    toForm: (row) => ({ ...row, startsAt: toInputDate(row.startsAt), endsAt: toInputDate(row.endsAt) }),
    columns: bannerColumns,
    defaultSort: { sortBy: 'displayOrder', sortOrder: 'asc' },
    schedule: (row) => schedule(row, 'startsAt', 'endsAt'),
  },
  shipping: {
    title: 'Shipping Management', singular: 'Shipping method', endpoint: '/shipping-methods', icon: Truck,
    description: 'Delivery options and charges offered at checkout and on manual orders.',
    defaults: { name: '', description: '', zone: '', charge: '', freeShippingThreshold: '', estimatedDelivery: '', displayOrder: 0, status: 'active' },
    fields: [
      { name: 'name', label: 'Method name', type: 'text', required: true, span: 2, placeholder: 'e.g. Inside Dhaka' },
      { name: 'zone', label: 'Zone / area', type: 'text' },
      { name: 'estimatedDelivery', label: 'Estimated delivery', type: 'text', placeholder: '1–2 days' },
      { name: 'charge', label: 'Charge', type: 'number', required: true },
      { name: 'freeShippingThreshold', label: 'Free shipping over', type: 'number', hint: '0 = never free' },
      { name: 'displayOrder', label: 'Display order', type: 'number' },
      { name: 'description', label: 'Description', type: 'textarea', span: 2 },
    ],
    toForm: (row) => row,
    columns: [
      { key: 'name', header: 'Method', sortKey: 'name', render: (row) => <div><p className="font-semibold text-slate-900">{row.name}</p><p className="text-xs text-slate-400">{row.zone || 'All areas'}</p></div> },
      { key: 'charge', header: 'Charge', sortKey: 'charge', className: 'font-semibold tabular-nums', render: (row) => (row.charge ? money(row.charge) : 'Free') },
      { key: 'free', header: 'Free over', className: 'tabular-nums', render: (row) => (row.freeShippingThreshold ? money(row.freeShippingThreshold) : '—') },
      { key: 'estimatedDelivery', header: 'Delivery', render: (row) => row.estimatedDelivery || '—' },
      { key: 'displayOrder', header: 'Order', sortKey: 'displayOrder', className: 'tabular-nums' },
    ],
    defaultSort: { sortBy: 'displayOrder', sortOrder: 'asc' },
  },
};
