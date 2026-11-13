import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { FLAT_NAVIGATION } from './navigation.js';
import { t } from '../../i18n/index.js';

/** Auto-derives the trail from the navigation when `items` is not given. Items: [{ label, to? }] */
export default function Breadcrumb({ items }) {
  const { pathname } = useLocation();
  let trail = items;
  if (!trail) {
    const match = [...FLAT_NAVIGATION].filter((entry) => entry.to !== '/' && pathname.startsWith(entry.to)).sort((a, b) => b.to.length - a.to.length)[0];
    trail = match ? [...(match.section ? [{ label: match.section }] : []), { label: match.label }] : [];
  }
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
        <li><Link to="/" className="inline-flex items-center gap-1 rounded hover:text-teal-700"><Home size={13} /> <span className="sr-only sm:not-sr-only">{t('Dashboard')}</span></Link></li>
        {trail.map((item, index) => (
          <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1.5">
            <ChevronRight size={12} className="text-slate-300" />
            {item.to && index < trail.length - 1 ? (
              <Link to={item.to} className="rounded hover:text-teal-700">{t(item.label)}</Link>
            ) : (
              <span className={index === trail.length - 1 ? 'max-w-56 truncate font-semibold text-slate-700' : ''} aria-current={index === trail.length - 1 ? 'page' : undefined}>{t(item.label)}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
