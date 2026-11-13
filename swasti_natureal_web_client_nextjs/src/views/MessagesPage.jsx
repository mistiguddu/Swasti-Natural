'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useOutletContext, useSearchParams } from '@/router';
import {
  ArrowLeft, ArrowUp, BellRing, Check, CheckCheck, CheckCircle2, Globe, Inbox, Mail, MessagesSquare, Phone, RotateCcw, Search, Trash2,
  UserRound, Volume2, VolumeX, Zap,
} from 'lucide-react';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { useChatRealtime } from '../context/ChatRealtimeContext.jsx';
import { PageHeader } from '../components/ui/Card.jsx';
import { Button, IconButton } from '../components/ui/Button.jsx';
import { ConfirmationModal } from '../components/ui/Modal.jsx';
import { EmptyState, ErrorState } from '../components/ui/EmptyState.jsx';
import { dateTime, relativeTime } from '../lib/format.js';
import { t } from '../i18n/index.js';

// Polling is only a safety net; live updates arrive over the stream.
const POLL = { live: { list: 60000, thread: 30000 }, offline: { list: 10000, thread: 4000 } };
const TYPING_MS = 4500;
const FILTERS = [
  { key: '', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Resolved' },
];
const CANNED = [
  'Thanks for reaching out! Let me check that for you.',
  'Could you share your order number, please?',
  'Your order is on the way and should arrive within 2–3 days.',
  'Is there anything else I can help you with?',
];

const time = (value) => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
function dayLabel(value) {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(value, today)) return 'Today';
  if (sameDay(value, yesterday)) return 'Yesterday';
  return new Date(value).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

const TONES = ['bg-teal-100 text-teal-700', 'bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-emerald-100 text-emerald-700'];
function Initials({ name, className = 'h-10 w-10 text-sm' }) {
  const letters = (name || '?').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const tone = TONES[[...(name || '?')].reduce((sum, char) => sum + char.charCodeAt(0), 0) % TONES.length];
  return <span className={`grid shrink-0 place-items-center rounded-full font-bold ${tone} ${className}`}>{letters}</span>;
}

function TypingDots({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-hidden="true">
      {[0, 150, 300].map((delay) => <span key={delay} className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: `${delay}ms` }} />)}
    </span>
  );
}

/** Tracks "is typing" signals per conversation; each expires after a few seconds. */
function useTyping() {
  const [typing, setTyping] = useState({});
  const timers = useRef({});
  const mark = useCallback((id, on = true) => {
    clearTimeout(timers.current[id]);
    setTyping((current) => ({ ...current, [id]: on }));
    if (on) timers.current[id] = setTimeout(() => setTyping((current) => ({ ...current, [id]: false })), TYPING_MS);
  }, []);
  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);
  return [typing, mark];
}

function ConversationRow({ item, active, typing, onSelect }) {
  const unread = item.unread > 0;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item.id)}
        aria-current={active ? 'true' : undefined}
        className={`flex w-full cursor-pointer items-start gap-3 border-l-[3px] px-4 py-3 text-left transition ${active ? 'border-teal-600 bg-teal-50/70' : unread ? 'border-transparent bg-teal-50/30 hover:bg-slate-50' : 'border-transparent hover:bg-slate-50'}`}
      >
        <span className="relative">
          <Initials name={item.name} />
          <span className={`absolute right-0 bottom-0 h-3 w-3 rounded-full ring-2 ring-surface ${item.online ? 'bg-emerald-500' : 'bg-slate-300'}`} title={item.online ? t('Online now') : t('Offline')} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`truncate text-sm ${unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>{item.name}</span>
            <span className={`shrink-0 rounded px-1.5 py-px text-[10px] font-semibold uppercase ${item.isGuest ? 'bg-slate-100 text-slate-500' : 'bg-teal-100 text-teal-700'}`}>{item.isGuest ? t('Guest') : t('Customer')}</span>
            <span className={`ml-auto shrink-0 text-[11px] ${unread ? 'font-semibold text-teal-700' : 'text-slate-400'}`} title={dateTime(item.lastMessageAt)}>{relativeTime(item.lastMessageAt)}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            {typing ? (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-teal-700"><TypingDots /> {t('typing…')}</span>
            ) : (
              <span className={`truncate text-[13px] ${unread ? 'font-medium text-slate-800' : 'text-slate-500'}`}>
                {item.lastSender === 'admin' && <span className="text-slate-400">{t('You')}: </span>}{item.lastMessagePreview}
              </span>
            )}
            {unread && <span className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-teal-600 px-1.5 text-[11px] font-bold text-white">{item.unread}</span>}
            {!unread && item.status === 'closed' && <CheckCircle2 size={14} className="ml-auto shrink-0 text-slate-300" aria-label={t('Resolved')} />}
          </span>
        </span>
      </button>
    </li>
  );
}

function Thread({ id, typing, onBack, onChanged, onDeleted }) {
  const toast = useToast();
  const { connected, subscribe } = useChatRealtime();
  const [state, setState] = useState({ conversation: null, messages: [], loading: true, error: null });
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const lastAt = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const stick = useRef(true);
  const lastTypingSent = useRef(0);
  const readTimer = useRef(null);

  const addMessages = useCallback((incoming, conversation) => {
    if (incoming.length) {
      const newest = incoming.at(-1).createdAt;
      if (!lastAt.current || new Date(newest) > new Date(lastAt.current)) lastAt.current = newest;
    }
    setState((current) => {
      const known = new Set(current.messages.map((message) => message.id));
      const fresh = incoming.filter((message) => !known.has(message.id));
      return { ...current, ...(conversation ? { conversation: { ...current.conversation, ...conversation } } : {}), messages: fresh.length ? [...current.messages, ...fresh] : current.messages };
    });
  }, []);

  const load = useCallback(async (full) => {
    const data = await api.get(`/chats/${id}`, !full && lastAt.current ? { after: lastAt.current } : undefined);
    if (full) {
      lastAt.current = data.messages.at(-1)?.createdAt ?? null;
      setState({ conversation: data.conversation, messages: data.messages, loading: false, error: null });
    } else {
      addMessages(data.messages, data.conversation);
    }
    return data;
  }, [id, addMessages]);

  // Initial load + safety-net polling (slow while the live stream is connected).
  useEffect(() => {
    let stopped = false;
    let timer;
    const interval = connected ? POLL.live.thread : POLL.offline.thread;
    const tick = async () => {
      if (!document.hidden) { try { await load(false); } catch { /* keep going */ } }
      if (!stopped) timer = setTimeout(tick, interval);
    };
    timer = setTimeout(tick, interval);
    return () => { stopped = true; clearTimeout(timer); };
  }, [load, connected]);

  useEffect(() => {
    let active = true;
    lastAt.current = null;
    stick.current = true;
    setState({ conversation: null, messages: [], loading: true, error: null });
    setDraft('');
    load(true).then(() => onChanged?.()).catch((error) => active && setState((current) => ({ ...current, loading: false, error })));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Live events for this conversation.
  useEffect(() => subscribe((event) => {
    const forMe = (event.conversation?.id ?? event.conversationId) === id;
    if (!forMe) return;
    if (event.type === 'message') {
      addMessages([event.message], event.conversation);
      if (event.message.sender === 'customer') {
        clearTimeout(readTimer.current);
        readTimer.current = setTimeout(() => api.post(`/chats/${id}/read`).catch(() => {}), 600);
      }
    } else if (event.type === 'seen') {
      setState((current) => ({ ...current, messages: current.messages.map((message) => (message.sender === 'admin' && !message.readAt ? { ...message, readAt: event.at } : message)) }));
    } else if (event.type === 'presence') {
      setState((current) => (current.conversation ? { ...current, conversation: { ...current.conversation, online: event.online } } : current));
    } else if (event.type === 'status') {
      setState((current) => ({ ...current, conversation: { ...current.conversation, ...event.conversation } }));
    } else if (event.type === 'deleted') {
      toast.info?.('This conversation was deleted');
      onDeleted?.();
    }
  }), [id, subscribe, addMessages, onDeleted, toast]);

  useEffect(() => () => clearTimeout(readTimer.current), []);

  useEffect(() => {
    if (listRef.current && stick.current) listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.messages, typing]);

  function signalTyping() {
    const now = Date.now();
    if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    api.post(`/chats/${id}/typing`).catch(() => {});
  }

  async function send(event) {
    event?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const result = await api.post(`/chats/${id}/messages`, { body });
      stick.current = true;
      addMessages([result.message], result.conversation);
      setDraft('');
      lastTypingSent.current = 0;
      if (inputRef.current) inputRef.current.style.height = '';
      onChanged?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function setStatus(status) {
    setBusy(true);
    try {
      const conversation = await api.patch(`/chats/${id}`, { status });
      setState((current) => ({ ...current, conversation }));
      toast.success(status === 'closed' ? 'Conversation marked as resolved' : 'Conversation reopened');
      onChanged?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/chats/${id}`);
      toast.success('Conversation deleted');
      setConfirmDelete(false);
      onDeleted?.();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  const { conversation, messages, loading, error } = state;
  if (error) return <div className="grid flex-1 place-items-center p-6"><ErrorState error={error} onRetry={() => load(true).catch(() => {})} /></div>;
  if (loading || !conversation) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-6" aria-label="Loading conversation">
        <div className="h-12 w-1/2 animate-pulse rounded-xl bg-slate-100" />
        {['w-2/5', 'ml-auto w-1/3', 'w-1/2', 'ml-auto w-2/5'].map((width, i) => <div key={i} className={`h-12 animate-pulse rounded-2xl bg-slate-100 ${width}`} />)}
      </div>
    );
  }

  const closed = conversation.status === 'closed';
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <IconButton icon={ArrowLeft} label="Back to conversations" onClick={onBack} className="lg:hidden" />
        <span className="relative">
          <Initials name={conversation.name} className="h-11 w-11 text-sm" />
          <span className={`absolute right-0 bottom-0 h-3 w-3 rounded-full ring-2 ring-surface ${conversation.online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-slate-900">{conversation.name}</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${closed ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>{closed ? t('Resolved') : t('Open')}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
            <span className={`inline-flex items-center gap-1 font-medium ${typing ? 'text-teal-700' : conversation.online ? 'text-emerald-600' : 'text-slate-400'}`}>
              {typing ? <><TypingDots /> {t('typing…')}</> : conversation.online ? t('Online now') : t('Offline')}
            </span>
            {conversation.email && <a href={`mailto:${conversation.email}`} className="inline-flex items-center gap-1 hover:text-teal-700"><Mail size={12} /> {conversation.email}</a>}
            {conversation.phone && <a href={`tel:${conversation.phone}`} className="inline-flex items-center gap-1 hover:text-teal-700"><Phone size={12} /> {conversation.phone}</a>}
            {conversation.customer && <Link to={`/customers/${conversation.customer.id}`} className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline"><UserRound size={12} /> {t('View customer')}</Link>}
            {conversation.pageUrl && <span className="hidden items-center gap-1 xl:inline-flex" title={t('Page the chat started on')}><Globe size={12} /> {conversation.pageUrl}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {closed
            ? <Button variant="secondary" size="sm" icon={RotateCcw} busy={busy} onClick={() => setStatus('open')}>Reopen</Button>
            : <Button variant="soft" size="sm" icon={CheckCircle2} busy={busy} onClick={() => setStatus('closed')}>Resolve</Button>}
          <IconButton icon={Trash2} label="Delete conversation" variant="danger-ghost" onClick={() => setConfirmDelete(true)} />
        </div>
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        onScroll={(event) => { const el = event.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
        className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-4 py-4 sm:px-6"
      >
        {messages.map((message, i) => {
          const previous = messages[i - 1];
          const newDay = !previous || !sameDay(previous.createdAt, message.createdAt);
          const grouped = !newDay && previous.sender === message.sender && new Date(message.createdAt) - new Date(previous.createdAt) < 5 * 60 * 1000;
          const mine = message.sender === 'admin';
          return (
            <div key={message.id} className="motion-safe:animate-fade-in">
              {newDay && <div className="my-4 flex items-center gap-3 text-[11px] font-medium text-slate-400"><span className="h-px flex-1 bg-slate-200" />{dayLabel(message.createdAt)}<span className="h-px flex-1 bg-slate-200" /></div>}
              <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-1' : 'mt-3'}`}>
                {!mine && (grouped ? <span className="w-8 shrink-0" /> : <Initials name={conversation.name} className="h-8 w-8 text-[11px]" />)}
                <div className={`flex max-w-[78%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  {mine && !grouped && <span className="mr-1 mb-1 text-[11px] font-medium text-slate-400">{message.senderName}</span>}
                  <div className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-sm ${mine ? 'rounded-br-md bg-teal-600 text-white' : 'rounded-bl-md bg-surface text-slate-800 ring-1 ring-slate-200'}`}>{message.body}</div>
                  <span className="mt-1 flex items-center gap-1 px-1 text-[10.5px] text-slate-400" title={dateTime(message.createdAt)}>
                    {time(message.createdAt)}
                    {mine && (message.readAt
                      ? <span className="inline-flex items-center gap-0.5 text-teal-600"><CheckCheck size={13} /> {t('Seen')}</span>
                      : <Check size={13} aria-label="Delivered" />)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        {typing && (
          <div className="mt-3 flex items-end gap-2" aria-live="polite">
            <Initials name={conversation.name} className="h-8 w-8 text-[11px]" />
            <div className="rounded-2xl rounded-bl-md bg-surface px-4 py-3 text-slate-400 shadow-sm ring-1 ring-slate-200"><TypingDots /></div>
          </div>
        )}
      </div>

      {/* Composer */}
      <form onSubmit={send} className="border-t border-slate-100 bg-surface px-4 pt-3 pb-4 sm:px-5">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase"><Zap size={12} /> {t('Quick')}</span>
          {CANNED.map((reply) => (
            <button key={reply} type="button" onClick={() => { setDraft(reply); inputRef.current?.focus(); }} className="shrink-0 cursor-pointer rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 transition hover:bg-teal-50 hover:text-teal-700">
              {reply.length > 34 ? `${reply.slice(0, 34)}…` : reply}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 pl-3.5 transition focus-within:border-teal-500 focus-within:bg-surface focus-within:ring-4 focus-within:ring-teal-500/10">
          <textarea
            ref={inputRef}
            value={draft}
            rows={1}
            maxLength={2000}
            placeholder={closed ? t('Reply to reopen this conversation…') : t('Type your reply…')}
            aria-label="Reply"
            onChange={(event) => {
              setDraft(event.target.value);
              if (event.target.value.trim()) signalTyping();
              event.target.style.height = '';
              event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) send(event); }}
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent py-2 text-sm leading-5 text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button type="submit" disabled={!draft.trim() || sending} aria-label="Send reply" className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl bg-teal-600 text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300">
            <ArrowUp size={18} />
          </button>
        </div>
        <p className="mt-1.5 hidden text-[11px] text-slate-400 sm:block">{t('Enter to send · Shift + Enter for a new line')}</p>
      </form>

      <ConfirmationModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
        busy={busy}
        title="Delete this conversation?"
        message="All messages in this conversation will be permanently deleted. The customer will no longer see them."
      />
    </div>
  );
}

/** Live-chat inbox: conversations with guests and customers from the storefront. */
export default function MessagesPage() {
  const { refreshBadges } = useOutletContext() ?? {};
  const { connected, subscribe, sound, setSound } = useChatRealtime();
  const [searchParams, setSearchParams] = useSearchParams();
  const selected = searchParams.get('c');
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [list, setList] = useState({ items: [], counts: { open: 0, closed: 0, unread: 0 }, loading: true, error: null });
  const [typing, markTyping] = useTyping();
  const [alerts, setAlerts] = useState(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission));
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const reloadTimer = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadList = useCallback(async () => {
    const params = { limit: 100, ...(query ? { q: query } : {}), ...(filter === 'unread' ? { unread: 'true' } : filter ? { status: filter } : {}) };
    try {
      const data = await api.get('/chats', params);
      setList({ items: data.items, counts: data.counts, loading: false, error: null });
    } catch (error) {
      setList((current) => ({ ...current, loading: false, error }));
    }
  }, [filter, query]);
  const reloadSoon = useCallback(() => {
    clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(loadList, 700);
  }, [loadList]);

  useEffect(() => {
    let stopped = false;
    let timer;
    const interval = connected ? POLL.live.list : POLL.offline.list;
    const tick = async () => {
      if (!document.hidden) await loadList();
      if (!stopped) timer = setTimeout(tick, interval);
    };
    tick();
    return () => { stopped = true; clearTimeout(timer); clearTimeout(reloadTimer.current); };
  }, [loadList, connected]);

  // Live list updates: new messages jump to the top instantly; counts are re-synced right after.
  useEffect(() => subscribe((event) => {
    const id = event.conversation?.id ?? event.conversationId;
    if (event.type === 'typing') { markTyping(id); return; }
    if (event.type === 'message') {
      if (event.message.sender === 'customer') markTyping(id, false);
      const viewing = selectedRef.current === id;
      setList((current) => {
        const existing = current.items.find((item) => item.id === id);
        const updated = { ...existing, ...event.conversation, unread: viewing ? 0 : event.conversation.unread };
        return { ...current, items: [updated, ...current.items.filter((item) => item.id !== id)] };
      });
      reloadSoon();
    } else if (event.type === 'read') {
      setList((current) => ({ ...current, items: current.items.map((item) => (item.id === id ? { ...item, unread: 0 } : item)) }));
      reloadSoon();
    } else if (event.type === 'presence') {
      setList((current) => ({ ...current, items: current.items.map((item) => (item.id === id ? { ...item, online: event.online } : item)) }));
    } else if (event.type === 'status' || event.type === 'deleted') {
      reloadSoon();
    }
  }), [subscribe, markTyping, reloadSoon]);

  const select = (id) => setSearchParams((current) => {
    const next = new URLSearchParams(current);
    if (id) next.set('c', id); else next.delete('c');
    return next;
  }, { replace: true });

  const changed = useCallback(() => { reloadSoon(); refreshBadges?.(); }, [reloadSoon, refreshBadges]);
  const deleted = useCallback(() => { select(null); changed(); }, [changed]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = list.counts;
  const countFor = { '': counts.open + counts.closed, unread: counts.unread, open: counts.open, closed: counts.closed };

  async function enableAlerts() {
    const permission = await Notification.requestPermission();
    setAlerts(permission);
  }

  return (
    <>
      <PageHeader
        title="Messages"
        description="Live chat with shoppers and customers from your storefront."
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold ring-1 ${connected ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' : 'bg-amber-50 text-amber-700 ring-amber-100'}`}>
              <span className="relative flex h-2 w-2">
                {connected && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </span>
              {connected ? t('Live') : t('Reconnecting…')}
            </span>
            <IconButton icon={sound ? Volume2 : VolumeX} label={sound ? 'Mute new-message sound' : 'Turn on new-message sound'} variant="secondary" onClick={() => setSound(!sound)} className="h-10 w-10" />
            {alerts === 'default' && <Button variant="secondary" icon={BellRing} onClick={enableAlerts}>Desktop alerts</Button>}
          </div>
        )}
      />
      <div className="flex h-[calc(100dvh-13rem)] min-h-[520px] overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-slate-200/80">
        {/* Conversation list */}
        <aside className={`w-full shrink-0 flex-col border-r border-slate-100 lg:flex lg:w-[340px] xl:w-[370px] ${selected ? 'hidden' : 'flex'}`}>
          <div className="space-y-3 border-b border-slate-100 p-3">
            <label className="relative block">
              <span className="sr-only">{t('Search conversations')}</span>
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Search name, email, phone…')} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-9 text-sm text-slate-800 outline-none focus:border-teal-500 focus:bg-surface focus:ring-4 focus:ring-teal-500/10" />
            </label>
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
              {FILTERS.map((item) => (
                <button key={item.key} type="button" role="tab" aria-selected={filter === item.key} onClick={() => setFilter(item.key)} className={`flex cursor-pointer items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs font-semibold transition ${filter === item.key ? 'bg-surface text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                  {t(item.label)}
                  {countFor[item.key] > 0 && <span className={`rounded-full px-1.5 text-[10px] ${item.key === 'unread' ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{countFor[item.key]}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {list.loading ? (
              <ul aria-label="Loading conversations">{Array.from({ length: 6 }, (_, i) => <li key={i} className="flex gap-3 px-4 py-3"><span className="h-10 w-10 animate-pulse rounded-full bg-slate-100" /><span className="flex-1 space-y-2"><span className="block h-3.5 w-2/3 animate-pulse rounded bg-slate-100" /><span className="block h-3 w-full animate-pulse rounded bg-slate-100" /></span></li>)}</ul>
            ) : list.error ? (
              <ErrorState error={list.error} onRetry={loadList} />
            ) : !list.items.length ? (
              <EmptyState icon={Inbox} title={query || filter ? 'No matching conversations' : 'No messages yet'} message={query || filter ? 'Try a different search or filter.' : 'When shoppers use the chat on your store, their messages appear here instantly.'} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {list.items.map((item) => <ConversationRow key={item.id} item={item} active={item.id === selected} typing={typing[item.id]} onSelect={select} />)}
              </ul>
            )}
          </div>
        </aside>

        {/* Thread */}
        <section className={`min-w-0 flex-1 flex-col ${selected ? 'flex' : 'hidden lg:flex'}`}>
          {selected ? (
            <Thread key={selected} id={selected} typing={Boolean(typing[selected])} onBack={() => select(null)} onChanged={changed} onDeleted={deleted} />
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <div>
                <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-teal-50 text-teal-600"><MessagesSquare size={28} /></span>
                <p className="mt-4 font-semibold text-slate-900">{t('Select a conversation')}</p>
                <p className="mt-1 max-w-xs text-sm text-slate-500">{t('Choose a chat from the list to read and reply. New messages appear instantly.')}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
