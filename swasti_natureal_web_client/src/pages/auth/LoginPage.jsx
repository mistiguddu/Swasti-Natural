import { useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { digits, LANGUAGES, t } from '../../i18n/index.js';
import { usePreferences } from '../../context/PreferencesContext.jsx';
import { LogoFull } from '../../components/ui/Logo.jsx';
import { useBranding } from '../../context/BrandingContext.jsx';

/** EN / বাংলা switch (glass pill on the dark background). */
function LanguageSwitch() {
  const { language, setLanguage } = usePreferences();
  return (
    <div className="flex rounded-full bg-white/10 p-1 text-xs font-semibold ring-1 ring-white/15 backdrop-blur-md" role="radiogroup" aria-label="Language / ভাষা">
      {LANGUAGES.map((item) => (
        <button
          key={item.code}
          type="button"
          role="radio"
          aria-checked={language === item.code}
          lang={item.code}
          onClick={() => setLanguage(item.code)}
          className={`cursor-pointer rounded-full px-3.5 py-1.5 transition ${language === item.code ? 'bg-white text-teal-900 shadow-sm' : 'text-white/75 hover:text-white'}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default function LoginPage() {
  const { signIn } = useAuth();
  const { storeName } = useBranding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const year = digits(new Date().getFullYear());

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

  const detectCaps = (event) => setCapsLock(Boolean(event.getModifierState?.('CapsLock')));
  const field = 'group flex h-12 items-center rounded-xl border bg-white transition focus-within:border-teal-600 focus-within:ring-4 focus-within:ring-teal-600/15';
  const input = 'h-full w-full min-w-0 bg-transparent px-3 text-[15px] text-slate-900 outline-none placeholder:text-slate-400';

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#04201d] font-body text-slate-800 selection:bg-teal-200">
      {/* ── Background: gradient mesh, glows, dot pattern ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_15%_10%,rgba(20,184,166,0.45),transparent_60%),radial-gradient(ellipse_70%_60%_at_90%_90%,rgba(16,185,129,0.35),transparent_60%),radial-gradient(ellipse_60%_50%_at_85%_10%,rgba(14,116,144,0.35),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        <div className="absolute top-[12%] left-[8%] h-72 w-72 rounded-full bg-teal-400/20 blur-3xl motion-safe:animate-float" />
        <div className="absolute right-[6%] bottom-[10%] h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl motion-safe:animate-float [animation-delay:-3s]" />
        {/* Thin rings for depth */}
        <div className="absolute top-1/2 left-1/2 h-[720px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.06]" />
        <div className="absolute top-1/2 left-1/2 h-[980px] w-[980px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.04]" />
      </div>

      {/* ── Centered glass card ── */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[440px] motion-safe:animate-fade-up">
          {/* glow behind the card */}
          <div aria-hidden="true" className="absolute inset-x-10 top-10 bottom-10 -z-0 rounded-[2rem] bg-teal-400/20 blur-2xl" />

          <div className="relative rounded-[1.75rem] bg-white/[0.97] p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)] ring-1 ring-white/60 backdrop-blur-xl sm:p-9">
            <div className="flex flex-col items-center text-center">
              <LogoFull className="h-24 w-auto sm:h-28" />
              <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-teal-800 ring-1 ring-teal-100">
                <ShieldCheck size={13} /> {t('Admin console')}
              </p>
              <h1 className="mt-4 font-display text-[26px] leading-tight font-bold tracking-tight text-slate-900">{t('Welcome back')}</h1>
              <p className="mt-1.5 text-sm text-slate-500">{t('Sign in to manage {name}.', { name: storeName })}</p>
            </div>

            <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-slate-700">{t('Email address')}</label>
                <div className={`${field} ${error ? 'border-rose-300' : 'border-slate-200'}`}>
                  <Mail size={17} aria-hidden="true" className="ml-3.5 shrink-0 text-slate-400 group-focus-within:text-teal-700" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="username"
                    autoFocus
                    placeholder="name@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    className={input}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-[13px] font-semibold text-slate-700">{t('Password')}</label>
                <div className={`${field} ${error ? 'border-rose-300' : 'border-slate-200'}`}>
                  <KeyRound size={17} aria-hidden="true" className="ml-3.5 shrink-0 text-slate-400 group-focus-within:text-teal-700" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="current-password"
                    placeholder={t('Enter your password')}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    onKeyDown={detectCaps}
                    onKeyUp={detectCaps}
                    onBlur={() => setCapsLock(false)}
                    required
                    className={input}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={t(showPassword ? 'Hide password' : 'Show password')}
                    title={t(showPassword ? 'Hide password' : 'Show password')}
                    className="mr-1.5 grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-teal-600"
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {capsLock && <p className="mt-1.5 text-xs font-medium text-amber-700">{t('Caps Lock is on')}</p>}
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <span>{t(error)}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="group mt-2 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 text-[15px] font-semibold text-white shadow-lg shadow-teal-700/30 transition hover:brightness-110 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-teal-600 active:brightness-95 disabled:cursor-wait disabled:opacity-80"
              >
                {submitting ? (
                  <span className="motion-safe:animate-pulse">{t('Signing you in…')}</span>
                ) : (
                  <>
                    {t('Sign in')}
                    <ArrowRight size={17} className="transition group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-7 flex items-center gap-3 text-[11px] text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="inline-flex items-center gap-1.5 font-medium"><LockKeyhole size={12} /> {t('Authorized personnel only')}</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
              {t('Forgot your password? Ask a super administrator to reset it.')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="relative flex flex-col items-center justify-between gap-3 px-6 pb-6 text-xs text-white/60 sm:flex-row sm:px-10">
        <LanguageSwitch />
        <span>© {year} {storeName} · {t('Secure session — ends when you close this tab')}</span>
      </footer>
    </main>
  );
}
