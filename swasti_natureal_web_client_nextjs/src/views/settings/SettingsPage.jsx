'use client';

import { useEffect, useState } from 'react';
import { NavLink, useParams } from '@/router';
import { KeyRound, Save, ShieldCheck, Store, UserRound, Wrench, Sparkles } from 'lucide-react';
import { api } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { PageHeader } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { FormInput, FormSection, TextArea, Toggle, fieldErrors } from '../../components/ui/Form.jsx';
import { FormSkeleton } from '../../components/ui/Skeleton.jsx';
import { dateTime, ROLE_LABELS } from '../../lib/format.js';
import NotFoundPage from '../NotFoundPage.jsx';
import { t } from '../../i18n/index.js';
import BrandingSettings from './BrandingSettings.jsx';
import { useBranding } from '../../context/BrandingContext.jsx';

const SECTIONS = [
  { key: 'branding', label: 'Branding', icon: Sparkles, permission: 'settings.manage', description: 'Project name, tagline, logo and icon used across the admin.' },
  { key: 'general', label: 'General Settings', icon: Wrench, permission: 'settings.manage', description: 'Store identity and contact details.' },
  { key: 'store', label: 'Store Settings', icon: Store, permission: 'settings.manage', description: 'Currency, tax, stock alerts, orders and reviews.' },
  { key: 'profile', label: 'Profile Settings', icon: UserRound, description: 'Your name, phone and address.' },
  { key: 'security', label: 'Security Settings', icon: ShieldCheck, description: 'Password and session.' },
];

function useSave() {
  const toast = useToast();
  const [state, setState] = useState({ saving: false, errors: {} });
  const run = async (request, message) => {
    setState({ saving: true, errors: {} });
    try {
      const result = await request();
      toast.success(message);
      setState({ saving: false, errors: {} });
      return result;
    } catch (error) {
      toast.error(error.message);
      setState({ saving: false, errors: fieldErrors(error) });
      return null;
    }
  };
  return [state, run];
}

function SaveBar({ saving, dirty = true }) {
  return <div className="flex justify-end"><Button type="submit" icon={Save} busy={saving} busyLabel="Saving…" disabled={!dirty}>{t('Save changes')}</Button></div>;
}

function GeneralSettings() {
  const { settings, refreshSettings } = useAuth();
  const branding = useBranding();
  const [form, setForm] = useState(null);
  const [{ saving, errors }, save] = useSave();
  useEffect(() => { if (settings) setForm(settings.general); }, [settings]);
  if (!form) return <FormSkeleton sections={1} fields={6} />;
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  return (
    <form className="space-y-6" onSubmit={async (event) => { event.preventDefault(); if (await save(() => api.put('/settings/general', form), 'General settings saved')) { refreshSettings(); branding.refresh().catch(() => {}); } }}>
      <FormSection title="Store identity">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormInput label="Store name" required value={form.storeName} onChange={set('storeName')} error={errors.storeName} />
          <FormInput label="Tagline" value={form.tagline} onChange={set('tagline')} />
          <FormInput label="Website" value={form.website} onChange={set('website')} placeholder="https://" />
        </div>
      </FormSection>
      <FormSection title="Contact">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormInput label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} />
          <FormInput label="Phone" value={form.phone} onChange={set('phone')} />
          <TextArea label="Address" rows={3} value={form.address} onChange={set('address')} className="sm:col-span-2" />
        </div>
      </FormSection>
      <FormSection title="Social media" description="Shown in the website footer. Leave empty to hide.">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormInput label="Facebook page" value={form.facebook ?? ''} onChange={set('facebook')} error={errors.facebook} placeholder="https://facebook.com/…" />
          <FormInput label="Instagram" value={form.instagram ?? ''} onChange={set('instagram')} error={errors.instagram} placeholder="https://instagram.com/…" />
          <FormInput label="YouTube" value={form.youtube ?? ''} onChange={set('youtube')} error={errors.youtube} placeholder="https://youtube.com/@…" />
          <FormInput label="WhatsApp number" value={form.whatsapp ?? ''} onChange={set('whatsapp')} error={errors.whatsapp} placeholder="8801XXXXXXXXX" />
        </div>
      </FormSection>
      <SaveBar saving={saving} />
    </form>
  );
}

function StoreSettings() {
  const { settings, refreshSettings } = useAuth();
  const [form, setForm] = useState(null);
  const [{ saving, errors }, save] = useSave();
  useEffect(() => { if (settings) setForm(settings.store); }, [settings]);
  if (!form) return <FormSkeleton sections={2} />;
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event?.target ? event.target.value : event }));
  return (
    <form className="space-y-6" onSubmit={async (event) => { event.preventDefault(); if (await save(() => api.put('/settings/store', form), 'Store settings saved')) refreshSettings(); }}>
      <FormSection title="Currency & tax" description="Used for new products, orders and every amount shown in the dashboard.">
        <div className="grid gap-5 sm:grid-cols-3">
          <FormInput label="Currency code" required maxLength={3} value={form.currency} onChange={(event) => set('currency')(event.target.value.toUpperCase())} error={errors.currency} hint="e.g. BDT, USD" />
          <FormInput label="Currency symbol" maxLength={5} value={form.currencySymbol} onChange={set('currencySymbol')} />
          <FormInput label="Default tax rate" type="number" min="0" max="100" step="0.01" suffix="%" value={form.taxRate} onChange={set('taxRate')} error={errors.taxRate} hint="Used when a product has no tax of its own." />
        </div>
      </FormSection>
      <FormSection title="Orders & inventory">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormInput label="Order number prefix" required maxLength={6} value={form.orderPrefix} onChange={(event) => set('orderPrefix')(event.target.value.toUpperCase())} error={errors.orderPrefix} hint={`Next orders look like ${form.orderPrefix || 'SN'}-000123`} />
          <FormInput label="Default minimum stock alert" type="number" min="0" value={form.defaultLowStockThreshold} onChange={set('defaultLowStockThreshold')} hint="Pre-filled on new products." />
        </div>
      </FormSection>
      <FormSection title="Reviews">
        <div className="space-y-4">
          <Toggle checked={form.autoApproveReviews} onChange={set('autoApproveReviews')} label="Auto-approve reviews" description="Publish new reviews without moderation." />
          <Toggle checked={form.allowGuestReviews} onChange={set('allowGuestReviews')} label="Allow guest reviews" description="Saved for the storefront; reviews currently require a signed-in customer." />
        </div>
      </FormSection>
      <SaveBar saving={saving} />
    </form>
  );
}

function ProfileSettings() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, phone: user.phone ?? '', address: { line1: '', line2: '', city: '', state: '', postalCode: '', country: '', ...user.address } });
  const [{ saving, errors }, save] = useSave();
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const setAddress = (field) => (event) => setForm((current) => ({ ...current, address: { ...current.address, [field]: event.target.value } }));
  return (
    <form className="space-y-6" onSubmit={async (event) => { event.preventDefault(); const result = await save(() => api.put('/auth/me', form), 'Profile updated'); if (result) setUser(result.user); }}>
      <FormSection title="Your profile" description={`${user.email} · ${ROLE_LABELS[user.role]}`}>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormInput label="Full name" required value={form.name} onChange={set('name')} error={errors.name} />
          <FormInput label="Phone" value={form.phone} onChange={set('phone')} />
          <FormInput label="Email" value={user.email} disabled hint="Ask a super administrator to change your email." className="sm:col-span-2" />
        </div>
      </FormSection>
      <FormSection title="Address">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormInput label="Address line 1" value={form.address.line1} onChange={setAddress('line1')} className="sm:col-span-2" />
          <FormInput label="City" value={form.address.city} onChange={setAddress('city')} />
          <FormInput label="Country" value={form.address.country} onChange={setAddress('country')} />
        </div>
      </FormSection>
      <SaveBar saving={saving} />
    </form>
  );
}

function SecuritySettings() {
  const { user, signOut } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [{ saving, errors }, save] = useSave();
  const [local, setLocal] = useState({});
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    const next = {};
    if (form.newPassword.length < 8) next.newPassword = 'At least 8 characters';
    if (form.newPassword !== form.confirm) next.confirm = 'Passwords don’t match';
    setLocal(next);
    if (Object.keys(next).length) return;
    if (await save(() => api.put('/auth/password', { currentPassword: form.currentPassword, newPassword: form.newPassword }), 'Password changed')) {
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-6">
        <FormSection title="Change password" description="Use at least 8 characters. A long passphrase is best.">
          <div className="grid max-w-md gap-5">
            <FormInput label="Current password" type="password" required autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
            <FormInput label="New password" type="password" required autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} error={local.newPassword ?? errors.newPassword} />
            <FormInput label="Confirm new password" type="password" required autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={local.confirm} />
          </div>
        </FormSection>
        <div className="flex justify-end"><Button type="submit" icon={KeyRound} busy={saving} busyLabel="Updating…">{t('Update password')}</Button></div>
      </form>
      <FormSection title="Session">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div><dt className="text-xs font-semibold text-slate-400 uppercase">{t('Last sign-in')}</dt><dd className="mt-1 text-slate-800">{user.lastLoginAt ? dateTime(user.lastLoginAt) : '—'}</dd></div>
          <div><dt className="text-xs font-semibold text-slate-400 uppercase">{t('Session storage')}</dt><dd className="mt-1 text-slate-800">This browser tab only; it ends when the tab closes or the token expires.</dd></div>
        </dl>
        <Button variant="danger-ghost" className="mt-5" onClick={signOut}>{t('Sign out now')}</Button>
      </FormSection>
    </div>
  );
}

const VIEWS = { branding: BrandingSettings, general: GeneralSettings, store: StoreSettings, profile: ProfileSettings, security: SecuritySettings };

export default function SettingsPage() {
  const { section } = useParams();
  const { can } = useAuth();
  const current = SECTIONS.find((item) => item.key === section);
  if (!current) return <NotFoundPage />;
  if (current.permission && !can(current.permission)) return <NotFoundPage forbidden />;
  const View = VIEWS[section];
  const visible = SECTIONS.filter((item) => !item.permission || can(item.permission));

  return (
    <>
      <PageHeader breadcrumb={[{ label: 'Settings' }, { label: current.label }]} title={current.label} description={current.description} />
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto lg:flex-col">
          {visible.map((item) => (
            <NavLink key={item.key} to={`/settings/${item.key}`} className={({ isActive }) => `inline-flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-surface text-teal-700 shadow-sm ring-1 ring-slate-200' : 'text-slate-600 hover:bg-surface/70'}`}>
              <item.icon size={16} /> {t(item.label)}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0"><View key={section} /></div>
      </div>
    </>
  );
}
