'use client';

import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from '@/router';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { storeApi } from '../api.js';
import { useCustomer } from '../context/CustomerAuthContext.jsx';
import { useBranding } from '../../context/BrandingContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { TextField, apiFieldErrors, btn } from '../components/ui.jsx';
import { usePageMeta } from '../lib/helpers.js';

/** Only allow in-site redirects after sign-in. */
const safeNext = (value) => (value && value.startsWith('/') && !value.startsWith('//') ? value : '/account');

function AuthShell({ title, subtitle, children, footer }) {
  const { logoMarkUrl, storeName } = useBranding();
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50/50 py-12 sm:py-20">
      <div aria-hidden="true" className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="relative mx-auto w-full max-w-md px-4">
        <div className="rounded-[2rem] bg-white p-7 shadow-xl shadow-emerald-900/5 ring-1 ring-stone-200/80 sm:p-10">
          <div className="text-center">
            <img src={logoMarkUrl} alt={storeName} className="mx-auto h-16 w-16 rounded-full bg-white object-contain ring-1 ring-emerald-900/10" />
            <h1 className="mt-5 font-serif text-3xl font-semibold text-emerald-950">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-stone-600">{subtitle}</p>}
          </div>
          <div className="mt-8">{children}</div>
        </div>
        {footer && <p className="mt-6 text-center text-sm text-stone-600">{footer}</p>}
      </div>
    </div>
  );
}

function PasswordField({ label = 'Password', name = 'password', value, onChange, error, autoComplete, hint }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold text-stone-700">{label} <span className="text-rose-600">*</span></label>
      <div className="relative">
        <input id={name} name={name} type={show ? 'text' : 'password'} required value={value} onChange={onChange} autoComplete={autoComplete} aria-invalid={Boolean(error)} className={`h-12 w-full rounded-xl border bg-white pr-12 pl-4 text-[15px] outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-700/10 ${error ? 'border-rose-300' : 'border-stone-200'}`} />
        <button type="button" onClick={() => setShow((value) => !value)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute top-1.5 right-1.5 grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
      </div>
      {error ? <p className="mt-1.5 text-xs text-rose-600">{error}</p> : hint && <p className="mt-1.5 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

const Alert = ({ children, tone = 'error' }) => (
  <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm ring-1 ${tone === 'error' ? 'bg-rose-50 text-rose-800 ring-rose-100' : 'bg-emerald-50 text-emerald-900 ring-emerald-100'}`}>
    {tone === 'error' ? <AlertCircle size={17} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={17} className="mt-0.5 shrink-0" />}<span>{children}</span>
  </div>
);

export function LoginPage() {
  usePageMeta('Sign in');
  const { signIn, isSignedIn } = useCustomer();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (isSignedIn) return <Navigate to={next} replace />;

  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn({ email: form.email.trim(), password: form.password });
      navigate(next, { replace: true });
    } catch (signInError) {
      setError(signInError.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your account to track orders and check out faster." footer={<>New here? <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-emerald-800 hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <TextField label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <PasswordField value={form.password} autoComplete="current-password" onChange={(event) => setForm({ ...form, password: event.target.value })} />
        <div className="flex justify-end"><Link to="/forgot-password" className="text-sm font-semibold text-emerald-800 hover:underline">Forgot password?</Link></div>
        {error && <Alert>{error}</Alert>}
        <button type="submit" disabled={busy} className={`${btn.primary} h-12 w-full`}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  usePageMeta('Create account');
  const { register, isSignedIn } = useCustomer();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (isSignedIn) return <Navigate to={next} replace />;
  const set = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  async function submit(event) {
    event.preventDefault();
    const local = {};
    if (form.name.trim().length < 2) local.name = 'Please enter your name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) local.email = 'Enter a valid email';
    if (form.phone && !/^\+?[0-9\s-]{7,20}$/.test(form.phone)) local.phone = 'Enter a valid mobile number';
    if (form.password.length < 8) local.password = 'Use at least 8 characters';
    if (form.password !== form.confirm) local.confirm = 'Passwords don’t match';
    setErrors(local);
    if (Object.keys(local).length) return;
    setError('');
    setBusy(true);
    try {
      await register({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password });
      toast.success('Welcome! Your account has been created.');
      navigate(next, { replace: true });
    } catch (registerError) {
      setErrors(apiFieldErrors(registerError));
      setError(registerError.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell title="Create your account" subtitle="Save your details, track orders and keep a wishlist." footer={<>Already have an account? <Link to={`/login${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-emerald-800 hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <TextField label="Full name" name="name" autoComplete="name" required value={form.name} onChange={set('name')} error={errors.name} />
        <TextField label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} error={errors.email} />
        <TextField label="Mobile number" name="phone" type="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={set('phone')} error={errors.phone} hint="Optional — used for delivery updates." />
        <PasswordField value={form.password} autoComplete="new-password" onChange={set('password')} error={errors.password} hint="At least 8 characters." />
        <PasswordField label="Confirm password" name="confirm" value={form.confirm} autoComplete="new-password" onChange={set('confirm')} error={errors.confirm} />
        {error && !Object.keys(errors).length && <Alert>{error}</Alert>}
        <button type="submit" disabled={busy} className={`${btn.primary} h-12 w-full`}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  usePageMeta('Forgot password');
  const [email, setEmail] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      setResult(await storeApi.post('/auth/forgot-password', { email: email.trim() }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your email and we’ll send you a link to reset it." footer={<Link to="/login" className="font-semibold text-emerald-800 hover:underline">Back to sign in</Link>}>
      {result ? (
        <div className="space-y-4">
          <Alert tone="success">{result.message}</Alert>
          {result.devResetUrl && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-900 ring-1 ring-amber-200">
              <strong>Development mode:</strong> email isn’t configured, so here is the link: <Link to={new URL(result.devResetUrl).pathname + new URL(result.devResetUrl).search} className="font-semibold break-all underline">reset password</Link>
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5" noValidate>
          <TextField label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          {error && <Alert>{error}</Alert>}
          <button type="submit" disabled={busy || !email} className={`${btn.primary} h-12 w-full`}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  usePageMeta('Reset password');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const token = params.get('token') ?? '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (form.password.length < 8) { setError('Use at least 8 characters'); return; }
    if (form.password !== form.confirm) { setError('Passwords don’t match'); return; }
    setError('');
    setBusy(true);
    try {
      await storeApi.post('/auth/reset-password', { token, password: form.password });
      toast.success('Password updated — please sign in.');
      navigate('/login', { replace: true });
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setBusy(false);
    }
  }
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return <AuthShell title="Invalid link" subtitle="This password reset link is incomplete or invalid."><Link to="/forgot-password" className={`${btn.primary} h-12 w-full`}>Request a new link</Link></AuthShell>;
  }
  return (
    <AuthShell title="Choose a new password" footer={<Link to="/login" className="font-semibold text-emerald-800 hover:underline">Back to sign in</Link>}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <PasswordField label="New password" value={form.password} autoComplete="new-password" onChange={(event) => setForm({ ...form, password: event.target.value })} hint="At least 8 characters." />
        <PasswordField label="Confirm new password" name="confirm" value={form.confirm} autoComplete="new-password" onChange={(event) => setForm({ ...form, confirm: event.target.value })} />
        {error && <Alert>{error}</Alert>}
        <button type="submit" disabled={busy} className={`${btn.primary} h-12 w-full`}>{busy ? 'Updating…' : 'Update password'}</button>
      </form>
    </AuthShell>
  );
}

