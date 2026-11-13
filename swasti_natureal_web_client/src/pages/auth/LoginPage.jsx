import { useState } from 'react';
import {
  ArrowRight, Eye, EyeOff, Heart, HeartPulse, Leaf, LockKeyhole, Mail, ShieldCheck, Smile, Sparkles, Stethoscope,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { digits, LANGUAGES, t } from '../../i18n/index.js';
import { usePreferences } from '../../context/PreferencesContext.jsx';
import { LogoFull, LogoMark } from '../../components/ui/Logo.jsx';
import { useBranding } from '../../context/BrandingContext.jsx';

/** EN / বাংলা switch for the sign-in screen. */
function LanguageSwitch() {
  const { language, setLanguage } = usePreferences();
  return (
    <div className="absolute top-4 right-4 flex rounded-full bg-slate-100 p-0.5 text-xs font-semibold ring-1 ring-slate-200 sm:top-6 sm:right-6" role="radiogroup" aria-label="Language / ভাষা">
      {LANGUAGES.map((item) => (
        <button
          key={item.code}
          type="button"
          role="radio"
          aria-checked={language === item.code}
          lang={item.code}
          onClick={() => setLanguage(item.code)}
          className={`cursor-pointer rounded-full px-3 py-1.5 transition ${language === item.code ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default function LoginPage() {
  const { signIn } = useAuth();
  const { storeName, tagline } = useBranding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputWrap =
    'group flex h-13 items-center rounded-2xl border border-slate-200 bg-slate-50/70 transition ' +
    'focus-within:border-teal-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-teal-500/15';
  const inputBase =
    'h-full w-full min-w-0 bg-transparent px-3 text-[15px] text-slate-800 outline-none placeholder:text-slate-400';

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-teal-50 via-white to-sky-50 font-body text-slate-800 selection:bg-teal-200">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-200/40 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-sky-200/50 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute right-1/3 top-10 h-56 w-56 rounded-full bg-emerald-100/60 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid w-full overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-teal-900/10 ring-1 ring-slate-900/5 motion-safe:animate-fade-up lg:grid-cols-[1.05fr_1fr]">

          {/* Left: care panel */}
          <section aria-label={storeName} className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500 p-10 text-white lg:flex xl:p-12">
            <svg aria-hidden="true" className="absolute inset-0 h-full w-full opacity-[0.07]">
              <defs>
                <pattern id="cross" width="56" height="56" patternUnits="userSpaceOnUse">
                  <path d="M24 16h8v8h8v8h-8v8h-8v-8h-8v-8h8z" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cross)" />
            </svg>
            <div aria-hidden="true" className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
            <div aria-hidden="true" className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-emerald-300/20" />

            <div className="relative flex items-center gap-3">
              <LogoMark size="h-12 w-12" />
              <span className="font-display text-lg font-extrabold leading-tight">
                {storeName}
                <span className="block text-[11px] font-semibold tracking-[0.18em] text-teal-100">{tagline || t('HEALTH & WELLNESS')}</span>
              </span>
            </div>

            <div className="relative my-12">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold tracking-wide ring-1 ring-white/25 backdrop-blur">
                <Sparkles size={14} /> {t('Caring for you, naturally')}
              </span>
              <h1 className="mt-6 font-display text-4xl font-bold leading-[1.1] xl:text-5xl">
                {t('Your health,')}<br />
                <span className="text-emerald-100">{t('in caring hands.')}</span>
              </h1>
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-teal-50/90">
                {t('Sign in to your personal wellness space — where natural care meets a calm, trusted experience.')}
              </p>

              <div className="mt-8 flex items-center gap-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-rose-500 shadow-md">
                  <HeartPulse size={22} className="motion-safe:animate-soft-pulse" />
                </span>
                <svg viewBox="0 0 300 60" className="h-12 w-full" aria-hidden="true">
                  <path
                    d="M0 30 H70 L82 30 L92 10 L104 52 L116 18 L126 30 H180 L190 30 L198 22 L206 30 H300"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="600"
                    className="motion-safe:animate-ecg"
                  />
                </svg>
              </div>

              <ul className="mt-8 space-y-3.5 text-sm">
                {[
                  [Stethoscope, 'Wellness care, made personal'],
                  [Leaf, 'Rooted in natural, holistic living'],
                  [ShieldCheck, 'Private, secure account access'],
                ].map(([Icon, text]) => (
                  <li key={text} className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 ring-1 ring-white/20">
                      <Icon size={16} />
                    </span>
                    <span className="text-teal-50">{t(text)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative flex items-center gap-3 rounded-2xl bg-white p-4 text-slate-700 shadow-xl shadow-teal-900/20 motion-safe:animate-float">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-amber-100 text-amber-500">
                <Smile size={22} />
              </span>
              <p className="text-sm leading-snug">
                <strong className="block font-display text-slate-900">{t('Feel good, every day.')}</strong>
                {t('Small healthy steps make a big, happy difference.')}
              </p>
            </div>
          </section>

          {/* Right: sign-in form */}
          <section className="relative flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-14 xl:px-16">
            <LanguageSwitch />
            <div className="mx-auto mb-6 w-full max-w-sm">
              <LogoFull className="h-24 w-auto sm:h-28" />
            </div>

            <div className="mx-auto w-full max-w-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {t('Patient & member portal')}
              </span>
              <h2 className="mt-5 font-display text-3xl font-bold text-slate-900 sm:text-4xl">
                {t('Welcome back')} <span className="inline-block origin-[70%_70%] motion-safe:animate-wave">👋</span>
              </h2>
              <p className="mt-2.5 text-[15px] text-slate-500">
                {t('We’re happy to see you again. Please sign in to continue.')}
              </p>

              <form className="mt-8 space-y-5" onSubmit={submit}>
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">{t('Email address')}</label>
                  <div className={inputWrap}>
                    <Mail size={18} aria-hidden="true" className="ml-4 shrink-0 text-slate-400 transition group-focus-within:text-teal-600" />
                    <input
                      id="email"
                      type="email"
                      name="email"
                      autoComplete="username"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      className={inputBase}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700">{t('Password')}</label>
                  <div className={inputWrap}>
                    <LockKeyhole size={18} aria-hidden="true" className="ml-4 shrink-0 text-slate-400 transition group-focus-within:text-teal-600" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="current-password"
                      placeholder={t('Enter your password')}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      className={inputBase}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      className="mr-2 grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl text-slate-400 transition hover:bg-teal-50 hover:text-teal-600 focus-visible:outline-2 focus-visible:outline-teal-500"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="group flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-500 font-semibold text-white shadow-lg shadow-teal-600/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-600/35 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-teal-500 active:translate-y-0 disabled:cursor-wait disabled:opacity-80 disabled:hover:translate-y-0"
                >
                  {submitting ? (
                    <span className="motion-safe:animate-pulse">{t('Signing you in…')}</span>
                  ) : (
                    <>
                      {t('Sign in')}
                      <ArrowRight size={18} className="transition group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 flex items-center gap-3 rounded-2xl bg-emerald-50/70 p-4 ring-1 ring-emerald-100">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-emerald-600 shadow-sm">
                  <ShieldCheck size={18} />
                </span>
                <p className="text-xs leading-relaxed text-slate-600">
                  {t('Secure sign-in. Your session is kept only in this browser tab and ends when you close it.')}
                </p>
              </div>

              <p className="mt-10 text-center text-xs text-slate-400">
                © {digits(new Date().getFullYear())} {storeName} · {t('Care, in every detail')}{' '}
                <Heart size={11} className="-mt-0.5 inline fill-rose-400 text-rose-400" />
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
