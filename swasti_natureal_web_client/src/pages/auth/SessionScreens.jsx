import { HeartPulse, LogOut, ShieldX } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';

function Shell({ icon: Icon, tone, title, message, note, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-white to-sky-50 px-4 font-body text-slate-800">
      <div role="alert" className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-xl shadow-teal-900/10 ring-1 ring-slate-900/5">
        <span className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl ring-1 ${tone}`}><Icon size={22} /></span>
        <h1 className="mt-5 font-display text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{message}</p>
        {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
        <div className="mt-6 flex gap-3">{children}</div>
      </div>
    </main>
  );
}

export function SessionErrorScreen({ message, onRetry, onLogout }) {
  return (
    <Shell icon={HeartPulse} tone="bg-amber-50 text-amber-500 ring-amber-100" title="We couldn’t load your account" message={message} note="You’re still signed in.">
      <Button variant="secondary" className="flex-1" onClick={onLogout}>Sign out</Button>
      <Button className="flex-1" onClick={onRetry}>Try again</Button>
    </Shell>
  );
}

export function NoAccessScreen({ user, onLogout }) {
  return (
    <Shell icon={ShieldX} tone="bg-rose-50 text-rose-500 ring-rose-100" title="No admin access" message={`${user?.email ?? 'This account'} is a customer account and can’t open the admin dashboard.`} note="Ask a super administrator for access.">
      <Button className="flex-1" icon={LogOut} onClick={onLogout}>Sign out</Button>
    </Shell>
  );
}
