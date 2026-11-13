import { useEffect, useMemo, useState } from 'react';
import { Eye, Globe, ImageIcon, RotateCcw, Save, Sparkles, X } from 'lucide-react';
import { api, toFormData } from '../../api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { DEFAULT_LOGO, DEFAULT_LOGO_MARK, useBranding } from '../../context/BrandingContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { FormInput, FormSection, fieldErrors } from '../../components/ui/Form.jsx';
import { ImageUploader } from '../../components/ui/ImageUploader.jsx';
import { LogoFull, LogoMark } from '../../components/ui/Logo.jsx';
import { t } from '../../i18n/index.js';

const EMPTY_FILE = { file: null, removed: false };

/** Object URL for a newly chosen file (revoked when it changes). */
function usePreviewUrl(file) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
  return url;
}

function resolve(slot, saved, previewUrl, fallback) {
  if (previewUrl) return previewUrl;
  if (slot.removed || !saved) return fallback;
  return saved;
}

function SourceBadge({ custom }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${custom ? 'bg-teal-50 text-teal-700 ring-teal-100' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
      {custom ? t('Custom') : t('Default')}
    </span>
  );
}

/** Sidebar header mock in a fixed light or dark palette. */
function SidebarPreview({ name, markUrl, dark }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ${dark ? 'bg-[#0f172a] ring-white/10' : 'bg-white ring-[#e2e8f0]'}`}>
      <LogoMark src={markUrl} />
      <div className="min-w-0 leading-tight">
        <p className={`truncate font-display text-[15px] font-extrabold ${dark ? 'text-white' : 'text-[#0f172a]'}`}>{name || '—'}</p>
        <p className="text-[10px] font-semibold tracking-[0.18em] text-teal-500">{t('ADMIN CONSOLE')}</p>
      </div>
    </div>
  );
}

export default function BrandingSettings() {
  const branding = useBranding();
  const { refreshSettings } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ storeName: branding.storeName, tagline: branding.tagline });
  const [logo, setLogo] = useState(EMPTY_FILE);
  const [mark, setMark] = useState(EMPTY_FILE);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Load the latest saved values once (cache may be stale).
  useEffect(() => {
    branding.refresh().then((data) => setForm({ storeName: data.storeName, tagline: data.tagline })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoPreview = usePreviewUrl(logo.file);
  const markPreview = usePreviewUrl(mark.file);
  const previewLogo = resolve(logo, branding.logo, logoPreview, DEFAULT_LOGO);
  const previewMark = resolve(mark, branding.logoMark, markPreview, DEFAULT_LOGO_MARK);
  const customLogo = Boolean(logoPreview || (branding.logo && !logo.removed));
  const customMark = Boolean(markPreview || (branding.logoMark && !mark.removed));

  const dirty = form.storeName !== branding.storeName || form.tagline !== branding.tagline || logo.file || logo.removed || mark.file || mark.removed;

  function reset() {
    setForm({ storeName: branding.storeName, tagline: branding.tagline });
    setLogo(EMPTY_FILE);
    setMark(EMPTY_FILE);
    setErrors({});
  }

  async function submit(event) {
    event.preventDefault();
    if (form.storeName.trim().length < 2) {
      setErrors({ storeName: 'Name must be at least 2 characters' });
      return;
    }
    setSaving(true);
    try {
      const body = toFormData(
        { storeName: form.storeName.trim(), tagline: form.tagline.trim(), removeLogo: logo.removed, removeLogoMark: mark.removed },
        { logo: logo.file, logoMark: mark.file },
      );
      const saved = await api.put('/settings/branding', body);
      branding.setBranding(saved);
      setForm({ storeName: saved.storeName, tagline: saved.tagline });
      setLogo(EMPTY_FILE);
      setMark(EMPTY_FILE);
      setErrors({});
      refreshSettings?.().catch(() => {});
      toast.success('Branding updated');
    } catch (error) {
      setErrors(fieldErrors(error));
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  const name = form.storeName.trim() || branding.storeName;

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0 space-y-6">
        <FormSection title="Project identity" description="The name shown in the sidebar, the browser tab and on the sign-in page.">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormInput
              label="Project name"
              required
              maxLength={120}
              value={form.storeName}
              onChange={(event) => { setForm((current) => ({ ...current, storeName: event.target.value })); setErrors({}); }}
              error={errors.storeName}
              hint={`${form.storeName.length}/120`}
            />
            <FormInput
              label="Tagline"
              maxLength={200}
              value={form.tagline}
              onChange={(event) => setForm((current) => ({ ...current, tagline: event.target.value }))}
              placeholder="e.g. Natural Wellness"
              hint={`${form.tagline.length}/200`}
            />
          </div>
        </FormSection>

        <FormSection title="Logo" description="PNG with a transparent background looks best. JPG and WEBP also work (max 5 MB).">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-slate-700">{t('Full logo')}</p>
                <SourceBadge custom={customLogo} />
              </div>
              <ImageUploader existing={branding.logo} {...logo} onChange={setLogo} aspect="aspect-[4/3]" fit="contain" hint="Shown on the sign-in page. Wide or round logos both work." />
              {!customLogo && <p className="mt-2 text-xs text-slate-500">{t('Using the default logo. Upload an image to replace it.')}</p>}
              {customLogo && branding.logo && !logo.file && (
                <Button variant="ghost" size="sm" icon={RotateCcw} className="mt-2" onClick={() => setLogo({ file: null, removed: true })}>Use default logo</Button>
              )}
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-slate-700">{t('Icon')}</p>
                <SourceBadge custom={customMark} />
              </div>
              <ImageUploader existing={branding.logoMark} {...mark} onChange={setMark} aspect="aspect-square" fit="contain" hint="Square image, at least 256 × 256 px. Used in the sidebar and as the browser tab icon." />
              {!customMark && <p className="mt-2 text-xs text-slate-500">{t('Using the default icon. Upload an image to replace it.')}</p>}
              {customMark && branding.logoMark && !mark.file && (
                <Button variant="ghost" size="sm" icon={RotateCcw} className="mt-2" onClick={() => setMark({ file: null, removed: true })}>Use default icon</Button>
              )}
            </div>
          </div>
        </FormSection>

        <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl bg-surface px-5 py-4 shadow-sm ring-1 ring-slate-200/70">
          {dirty && <span className="mr-auto inline-flex items-center gap-1.5 text-xs font-medium text-amber-700"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {t('Unsaved changes')}</span>}
          <Button variant="secondary" icon={X} disabled={!dirty || saving} onClick={reset}>Discard</Button>
          <Button type="submit" icon={Save} disabled={!dirty} busy={saving} busyLabel="Saving…">Save branding</Button>
        </div>
      </div>

      {/* Live preview */}
      <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
        <Card>
          <CardHeader title="Live preview" description="How your brand appears across the admin." icon={Eye} />
          <div className="space-y-5 p-5">
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase"><Globe size={12} /> {t('Browser tab')}</p>
              <div className="rounded-xl bg-slate-100 p-2 pb-0 ring-1 ring-slate-200">
                <div className="flex w-64 max-w-full items-center gap-2 rounded-t-lg bg-surface px-3 py-2 shadow-sm">
                  <img src={previewMark} alt="" className="h-4 w-4 shrink-0 rounded-sm object-contain" />
                  <span className="truncate text-xs font-medium text-slate-700">{name} | Admin</span>
                  <X size={12} className="ml-auto shrink-0 text-slate-400" />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase"><ImageIcon size={12} /> {t('Sidebar · light & dark')}</p>
              <div className="space-y-2">
                <SidebarPreview name={name} markUrl={previewMark} />
                <SidebarPreview name={name} markUrl={previewMark} dark />
              </div>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase"><Sparkles size={12} /> {t('Sign-in page')}</p>
              <div className="rounded-xl bg-white p-5 ring-1 ring-[#e2e8f0]">
                <LogoFull src={previewLogo} className="h-20 w-auto" alt={name} />
                {form.tagline.trim() && <p className="mt-2 text-xs font-semibold tracking-wide text-teal-600 uppercase">{form.tagline.trim()}</p>}
                <p className="mt-3 font-display text-lg font-bold text-[#0f172a]">{t('Welcome back')} 👋</p>
                <p className="text-xs text-[#64748b]">{t('We’re happy to see you again. Please sign in to continue.')}</p>
                <div className="mt-3 h-8 rounded-lg bg-[#f1f5f9]" />
                <div className="mt-2 h-8 rounded-lg bg-gradient-to-r from-teal-600 to-accent2-500" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </form>
  );
}
