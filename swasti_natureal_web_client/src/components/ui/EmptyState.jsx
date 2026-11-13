import { AlertTriangle, Inbox, RotateCw } from 'lucide-react';
import { Button } from './Button.jsx';
import { t } from '../../i18n/index.js';

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', message, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-200"><Icon size={24} /></span>
      <h3 className="mt-4 font-display text-base font-bold text-slate-800">{t(title)}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{t(message)}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className = '' }) {
  return (
    <div role="alert" className={`flex flex-col items-center justify-center px-6 py-14 text-center ${className}`}>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500 ring-1 ring-rose-100"><AlertTriangle size={24} /></span>
      <h3 className="mt-4 font-display text-base font-bold text-slate-800">{t('Couldn’t load this')}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{t(error?.message ?? 'Something went wrong.')}</p>
      {onRetry && <Button variant="secondary" size="sm" icon={RotateCw} className="mt-5" onClick={onRetry}>{t('Try again')}</Button>}
    </div>
  );
}
