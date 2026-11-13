'use client';

import { useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate, useParams } from '@/router';
import {
  Heart, KeyRound, LayoutDashboard, LogOut, MapPin, Package, PackageSearch, Pencil, Plus, ShoppingBag, Star, Trash2, UserRound,
} from 'lucide-react';
import { storeApi } from '../api.js';
import { useApi } from '../../hooks/useApi.js';
import { useCustomer } from '../context/CustomerAuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ConfirmationModal } from '../../components/ui/Modal.jsx';
import { DIVISIONS, DIVISION_NAMES } from '../data/bangladesh.js';
import OrderView, { OrderRow } from '../components/OrderView.jsx';
import { WishlistItems } from './WishlistPage.jsx';
import { Container, EmptyBlock, ErrorBlock, SelectField, Skel, TextAreaField, TextField, apiFieldErrors, btn } from '../components/ui.jsx';
import { usePageMeta } from '../lib/helpers.js';
import { date } from '../../lib/format.js';

const NAV = [
  { to: '/account', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/account/profile', label: 'My profile', icon: UserRound },
  { to: '/account/orders', label: 'My orders', icon: Package },
  { to: '/track-order', label: 'Track order', icon: PackageSearch },
  { to: '/account/wishlist', label: 'My wishlist', icon: Heart },
  { to: '/account/addresses', label: 'My addresses', icon: MapPin },
  { to: '/account/password', label: 'Change password', icon: KeyRound },
];

/** Redirects to sign-in for guests; renders children for customers. */
export function RequireCustomer({ children }) {
  const { status } = useCustomer();
  const location = useLocation();
  if (status === 'loading') return <Container className="py-20"><Skel className="h-96 rounded-3xl" /></Container>;
  if (status !== 'signed-in') return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
}

export function AccountLayout() {
  const { user, signOut } = useCustomer();
  const navigate = useNavigate();
  return (
    <RequireCustomer>
      <div className="bg-stone-50/70">
        <Container className="grid gap-8 py-10 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-32 lg:self-start">
            <div className="rounded-3xl bg-white p-5 ring-1 ring-stone-200/80">
              <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-800 font-serif text-xl text-white">{user?.name?.charAt(0).toUpperCase()}</span>
                <div className="min-w-0"><p className="truncate font-semibold text-stone-900">{user?.name}</p><p className="truncate text-xs text-stone-500">{user?.email}</p></div>
              </div>
              <nav className="mt-3 flex gap-1 overflow-x-auto lg:flex-col" aria-label="Account">
                {NAV.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-emerald-50 text-emerald-900' : 'text-stone-700 hover:bg-stone-50'}`}>
                    <Icon size={17} /> {label}
                  </NavLink>
                ))}
                <button type="button" onClick={() => { signOut(); navigate('/'); }} className="flex shrink-0 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-700 hover:bg-rose-50"><LogOut size={17} /> Log out</button>
              </nav>
            </div>
          </aside>
          <div className="min-w-0"><Outlet /></div>
        </Container>
      </div>
    </RequireCustomer>
  );
}

function Panel({ title, action, children }) {
  return (
    <section className="rounded-3xl bg-white ring-1 ring-stone-200/80">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-6 py-5"><h1 className="font-serif text-2xl font-semibold text-emerald-950">{title}</h1>{action}</div>
      <div className="p-6">{children}</div>
    </section>
  );
}

export function AccountOverview() {
  usePageMeta('My account');
  const { user } = useCustomer();
  const { data, loading, error, reload } = useApi(() => storeApi.get('/store/account/summary'), []);
  const stats = data ? [
    { label: 'Total orders', value: data.totalOrders, icon: ShoppingBag, to: '/account/orders' },
    { label: 'In progress', value: data.activeOrders, icon: Package, to: '/account/orders' },
    { label: 'Delivered', value: data.delivered, icon: Star, to: '/account/orders?status=delivered' },
    { label: 'Wishlist', value: data.wishlistCount, icon: Heart, to: '/account/wishlist' },
  ] : [];
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-emerald-800 to-emerald-950 p-7 text-white">
        <p className="text-sm text-emerald-100/80">Welcome back</p>
        <h1 className="mt-1 font-serif text-3xl font-semibold">Hello, {user?.name?.split(' ')[0]}</h1>
        <p className="mt-2 max-w-lg text-sm text-emerald-50/80">Manage your orders, saved addresses and account details here.</p>
      </div>
      {error ? <ErrorBlock error={error} onRetry={reload} /> : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {loading && !data ? Array.from({ length: 4 }, (_, i) => <Skel key={i} className="h-28 rounded-3xl" />) : stats.map(({ label, value, icon: Icon, to }) => (
            <Link key={label} to={to} className="rounded-3xl bg-white p-5 ring-1 ring-stone-200/80 transition hover:shadow-md">
              <Icon size={20} className="text-emerald-700" />
              <p className="mt-3 font-serif text-3xl font-semibold text-emerald-950">{value}</p>
              <p className="text-sm text-stone-600">{label}</p>
            </Link>
          ))}
        </div>
      )}
      <Panel title="Recent orders" action={<Link to="/account/orders" className="text-sm font-semibold text-emerald-800 hover:underline">View all</Link>}>
        {loading && !data ? <Skel className="h-24" /> : !data?.recentOrders?.length ? (
          <div className="text-center"><p className="text-stone-600">You haven’t placed any orders yet.</p><Link to="/products" className={`${btn.primary} mt-4 h-11 text-sm`}>Start shopping</Link></div>
        ) : <ul className="-m-6 divide-y divide-stone-100">{data.recentOrders.map((order) => <OrderRow key={order.id} order={order} />)}</ul>}
      </Panel>
    </div>
  );
}

const ORDER_FILTERS = ['', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export function OrdersPage() {
  usePageMeta('My orders');
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const status = params.get('status') ?? '';
  const page = Number(params.get('page')) || 1;
  const { data, loading, error, reload } = useApi(() => storeApi.get('/store/account/orders', { status: status || undefined, page, limit: 10 }), [status, page]);
  const setQuery = (next) => navigate({ search: new URLSearchParams(Object.entries(next).filter(([, v]) => v)).toString() });
  return (
    <Panel title="My orders">
      <div className="-mx-6 -mt-6 mb-4 flex gap-1 overflow-x-auto border-b border-stone-100 px-4 [scrollbar-width:none]" role="tablist">
        {ORDER_FILTERS.map((value) => (
          <button key={value || 'all'} type="button" role="tab" aria-selected={status === value} onClick={() => setQuery({ status: value })} className={`-mb-px shrink-0 cursor-pointer border-b-2 px-4 py-3 text-sm font-semibold capitalize ${status === value ? 'border-emerald-800 text-emerald-900' : 'border-transparent text-stone-500 hover:text-stone-900'}`}>{value || 'All'}</button>
        ))}
      </div>
      {error ? <ErrorBlock error={error} onRetry={reload} /> : loading && !data ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skel key={i} className="h-20 rounded-2xl" />)}</div> : !data.items.length ? (
        <EmptyBlock icon={Package} title={status ? `No ${status} orders` : 'No orders yet'} message="When you place an order, it will appear here." action={<Link to="/products" className={`${btn.primary} h-11`}>Start shopping</Link>} />
      ) : (
        <>
          <ul className="-mx-6 divide-y divide-stone-100">{data.items.map((order) => <OrderRow key={order.id} order={order} />)}</ul>
          {data.pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3 text-sm">
              <button type="button" disabled={page <= 1} onClick={() => setQuery({ status, page: String(page - 1) })} className={`${btn.secondary} h-10`}>Previous</button>
              <span className="text-stone-600">Page {page} of {data.pagination.totalPages}</span>
              <button type="button" disabled={page >= data.pagination.totalPages} onClick={() => setQuery({ status, page: String(page + 1) })} className={`${btn.secondary} h-10`}>Next</button>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

export function OrderDetailsPage() {
  const { orderNumber } = useParams();
  usePageMeta(`Order ${orderNumber}`);
  const { data, loading, error, reload } = useApi(() => storeApi.get(`/store/account/orders/${encodeURIComponent(orderNumber)}`), [orderNumber]);
  return (
    <div>
      <Link to="/account/orders" className="mb-4 inline-flex text-sm font-semibold text-emerald-800 hover:underline">← Back to my orders</Link>
      {loading && !data ? <Skel className="h-96 rounded-3xl" /> : error ? (error.status === 404 ? <EmptyBlock icon={Package} title="Order not found" message="We couldn’t find this order in your account." /> : <ErrorBlock error={error} onRetry={reload} />) : <OrderView order={data} />}
    </div>
  );
}

export function ProfilePage() {
  usePageMeta('My profile');
  const { user, setUser } = useCustomer();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, phone: user.phone ?? '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await storeApi.put('/auth/me', { name: form.name.trim(), phone: form.phone.trim() });
      setUser(result.user);
      setErrors({});
      toast.success('Profile updated');
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title="My profile">
      <form onSubmit={submit} className="grid max-w-xl gap-5" noValidate>
        <TextField label="Full name" name="name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} error={errors.name} />
        <TextField label="Mobile number" name="phone" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} error={errors.phone} />
        <TextField label="Email" name="email" value={user.email} disabled hint="Contact us if you need to change your email." />
        <p className="text-sm text-stone-500">Member since {date(user.createdAt)}</p>
        <div><button type="submit" disabled={busy} className={`${btn.primary} h-12`}>{busy ? 'Saving…' : 'Save changes'}</button></div>
      </form>
    </Panel>
  );
}

export function PasswordPage() {
  usePageMeta('Change password');
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (form.newPassword.length < 8) { setError('Use at least 8 characters for the new password'); return; }
    if (form.newPassword !== form.confirm) { setError('New passwords don’t match'); return; }
    setError('');
    setBusy(true);
    try {
      await storeApi.put('/auth/password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Panel title="Change password">
      <form onSubmit={submit} className="grid max-w-md gap-5" noValidate>
        <TextField label="Current password" name="currentPassword" type="password" autoComplete="current-password" required value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} />
        <TextField label="New password" name="newPassword" type="password" autoComplete="new-password" required hint="At least 8 characters." value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} />
        <TextField label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} />
        {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-100">{error}</p>}
        <div><button type="submit" disabled={busy} className={`${btn.primary} h-12`}>{busy ? 'Updating…' : 'Update password'}</button></div>
      </form>
    </Panel>
  );
}

export function AccountWishlistPage() {
  usePageMeta('My wishlist');
  return <Panel title="My wishlist"><WishlistItems /></Panel>;
}

const EMPTY = { label: 'Home', name: '', phone: '', division: '', district: '', area: '', line1: '', postalCode: '', isDefault: false };

export function AddressesPage() {
  usePageMeta('My addresses');
  const { user, setUser } = useCustomer();
  const toast = useToast();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const addresses = user.addresses ?? [];
  const idOf = (address) => address.id ?? address._id;

  const open = (address) => { setEditing(address ? idOf(address) : 'new'); setForm(address ? { ...EMPTY, ...address } : { ...EMPTY, name: user.name, phone: user.phone ?? '', isDefault: !addresses.length }); setErrors({}); };
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value, ...(field === 'division' ? { district: '' } : {}) }));

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = { label: form.label, name: form.name, phone: form.phone, division: form.division, district: form.district, area: form.area, line1: form.line1, postalCode: form.postalCode, isDefault: form.isDefault };
      const list = editing === 'new' ? await storeApi.post('/store/account/addresses', payload) : await storeApi.put(`/store/account/addresses/${editing}`, payload);
      setUser({ ...user, addresses: list });
      setEditing(null);
      toast.success('Address saved');
    } catch (error) {
      setErrors(apiFieldErrors(error));
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }
  async function makeDefault(address) {
    try {
      const list = await storeApi.put(`/store/account/addresses/${idOf(address)}`, { ...address, isDefault: true });
      setUser({ ...user, addresses: list });
    } catch (error) { toast.error(error.message); }
  }
  async function remove() {
    try {
      const list = await storeApi.delete(`/store/account/addresses/${idOf(confirm)}`);
      setUser({ ...user, addresses: list });
      toast.success('Address deleted');
    } catch (error) { toast.error(error.message); }
    setConfirm(null);
  }

  return (
    <Panel title="My addresses" action={!editing && addresses.length < 10 && <button type="button" onClick={() => open(null)} className={`${btn.primary} h-10 text-sm`}><Plus size={16} /> Add address</button>}>
      {editing ? (
        <form onSubmit={save} className="grid gap-5 sm:grid-cols-2" noValidate>
          <TextField label="Label" name="label" placeholder="Home, Office…" value={form.label} onChange={set('label')} />
          <TextField label="Recipient name" name="name" required value={form.name} onChange={set('name')} error={errors.name} />
          <TextField label="Mobile number" name="phone" type="tel" required value={form.phone} onChange={set('phone')} error={errors.phone} />
          <SelectField label="Division" name="division" required placeholder="Select division" options={DIVISION_NAMES} value={form.division} onChange={set('division')} error={errors.division} />
          <SelectField label="District" name="district" required placeholder={form.division ? 'Select district' : 'Select a division first'} options={form.division ? DIVISIONS[form.division] : []} disabled={!form.division} value={form.district} onChange={set('district')} error={errors.district} />
          <TextField label="Upazila / Area" name="area" value={form.area} onChange={set('area')} />
          <TextAreaField label="Full address" name="line1" required rows={2} value={form.line1} onChange={set('line1')} error={errors.line1} className="sm:col-span-2" />
          <TextField label="Postal code" name="postalCode" value={form.postalCode} onChange={set('postalCode')} />
          <label className="flex cursor-pointer items-center gap-2.5 self-end pb-3 text-sm text-stone-700"><input type="checkbox" checked={form.isDefault} onChange={set('isDefault')} className="h-4 w-4 accent-emerald-700" /> Use as default address</label>
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={busy} className={`${btn.primary} h-11`}>{busy ? 'Saving…' : 'Save address'}</button>
            <button type="button" onClick={() => setEditing(null)} className={`${btn.secondary} h-11`}>Cancel</button>
          </div>
        </form>
      ) : !addresses.length ? (
        <EmptyBlock icon={MapPin} title="No saved addresses" message="Save an address to check out faster." action={<button type="button" onClick={() => open(null)} className={`${btn.primary} h-11`}><Plus size={16} /> Add address</button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <div key={idOf(address)} className={`rounded-2xl p-5 text-sm ring-1 ${address.isDefault ? 'bg-emerald-50/60 ring-emerald-200' : 'ring-stone-200'}`}>
              <p className="flex items-center gap-2 font-semibold text-stone-900">{address.label}{address.isDefault && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-800">Default</span>}</p>
              <p className="mt-2 text-stone-800">{address.name} · {address.phone}</p>
              <p className="text-stone-600">{[address.line1, address.area, address.district, address.division, address.postalCode].filter(Boolean).join(', ')}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => open(address)} className={`${btn.ghost} h-9 px-3 text-xs`}><Pencil size={14} /> Edit</button>
                {!address.isDefault && <button type="button" onClick={() => makeDefault(address)} className={`${btn.ghost} h-9 px-3 text-xs`}>Set as default</button>}
                <button type="button" onClick={() => setConfirm(address)} className={`${btn.ghost} h-9 px-3 text-xs text-rose-700 hover:bg-rose-50`}><Trash2 size={14} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmationModal open={Boolean(confirm)} onClose={() => setConfirm(null)} onConfirm={remove} title="Delete this address?" message="It will be removed from your saved addresses." />
    </Panel>
  );
}
