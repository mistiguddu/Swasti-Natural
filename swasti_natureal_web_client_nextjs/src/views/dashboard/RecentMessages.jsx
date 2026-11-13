'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@/router';
import { ArrowRight, Inbox, MessagesSquare } from 'lucide-react';
import { api } from '../../api.js';
import { useChatRealtime } from '../../context/ChatRealtimeContext.jsx';
import { Card, CardHeader } from '../../components/ui/Card.jsx';
import { relativeTime } from '../../lib/format.js';
import { t } from '../../i18n/index.js';

const TONES = ['bg-teal-100 text-teal-700', 'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700'];
const initials = (name) => (name || '?').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const tone = (name) => TONES[[...(name || '?')].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TONES.length];

/** Dashboard card: latest customer chats, updated live as messages arrive. */
export default function RecentMessages() {
  const { connected, subscribe } = useChatRealtime();
  const [data, setData] = useState(null);
  const [flash, setFlash] = useState(null);
  const timer = useRef(null);

  const load = useCallback(() => api.get('/chats', { limit: 4 }).then(setData).catch(() => setData((current) => current ?? { items: [], counts: {} })), []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => subscribe((event) => {
    if (!['message', 'read', 'status', 'deleted', 'presence'].includes(event.type)) return;
    if (event.type === 'message' && event.message.sender === 'customer') {
      setFlash(event.conversation.id);
      setTimeout(() => setFlash(null), 2500);
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(load, 400);
  }), [subscribe, load]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const counts = data?.counts ?? {};
  return (
    <Card>
      <CardHeader
        icon={MessagesSquare}
        title="Customer messages"
        description="Live chats from your storefront"
        actions={(
          <>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500 motion-safe:animate-pulse' : 'bg-slate-400'}`} /> {connected ? t('Live') : t('Offline')}
            </span>
            <Link to="/messages" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">{t('Open inbox')} <ArrowRight size={13} /></Link>
          </>
        )}
      />
      <div className="grid gap-4 p-5 lg:grid-cols-[200px_minmax(0,1fr)]">
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
          {[
            ['Unread chats', counts.unread ?? 0, 'text-teal-700 bg-teal-50 ring-teal-100'],
            ['Open', counts.open ?? 0, 'text-emerald-700 bg-emerald-50 ring-emerald-100'],
            ['Resolved', counts.closed ?? 0, 'text-slate-600 bg-slate-50 ring-slate-200'],
          ].map(([label, value, style]) => (
            <div key={label} className={`rounded-xl px-3 py-2.5 ring-1 ${style}`}>
              <p className="text-[11px] font-semibold uppercase opacity-80">{t(label)}</p>
              <p className="font-display text-xl font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>

        {!data ? (
          <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />)}</div>
        ) : !data.items.length ? (
          <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 p-6 text-center">
            <div><Inbox size={22} className="mx-auto text-slate-300" /><p className="mt-2 text-sm text-slate-500">{t('No messages yet. New chats will appear here instantly.')}</p></div>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.items.map((item) => (
              <li key={item.id}>
                <Link to={`/messages?c=${item.id}`} className={`flex h-full items-start gap-3 rounded-xl p-3 ring-1 transition hover:bg-slate-50 hover:ring-teal-200 ${flash === item.id ? 'bg-teal-50 ring-teal-300' : item.unread ? 'ring-teal-100' : 'ring-slate-200/70'}`}>
                  <span className="relative">
                    <span className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold ${tone(item.name)}`}>{initials(item.name)}</span>
                    {item.online && <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-surface" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={`truncate text-sm ${item.unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>{item.name}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-slate-400">{relativeTime(item.lastMessageAt)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className={`line-clamp-1 text-xs ${item.unread ? 'text-slate-700' : 'text-slate-500'}`}>{item.lastSender === 'admin' && `${t('You')}: `}{item.lastMessagePreview}</span>
                      {item.unread > 0 && <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-teal-600 px-1.5 text-[10px] font-bold text-white">{item.unread}</span>}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
