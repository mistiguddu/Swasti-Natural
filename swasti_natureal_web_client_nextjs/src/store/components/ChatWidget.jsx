'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from '@/router';
import { AlertCircle, ArrowUp, Check, CheckCheck, ChevronDown, Clock, Lock, LogIn, MessageCircle, RotateCw, X } from 'lucide-react';
import { getChatToken, getCustomerToken, setChatToken, storeApi } from '../api.js';
import { openEventStream, playChime } from '../../lib/eventStream.js';
import { useCustomer } from '../context/CustomerAuthContext.jsx';
import { useBranding } from '../../context/BrandingContext.jsx';

/** Open the chat from anywhere: `openChat()` or `openChat('prefilled text')`. */
export const OPEN_CHAT_EVENT = 'swasti:open-chat';
export const openChat = (text) => window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT, { detail: { text } }));

const QUICK_TOPICS = ['Where is my order?', 'I have a question about a product', 'Delivery & payment options'];
// Polling is a safety net; replies normally arrive instantly over the live stream.
const POLL = { live: { open: 30000, closed: 60000 }, offline: { open: 4000, closed: 30000 } };
const TYPING_MS = 4500;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9\s-]{7,20}$/;

const time = (value) => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
function dayLabel(value) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

/** Short, human reason a message couldn't be sent. */
function sendErrorText(error) {
  if (error.status === 0) return 'You’re offline — check your connection.';
  if (error.status === 404) return 'Chat is unavailable right now. Please try again shortly.';
  if (error.status === 429) return 'Too many messages — please wait a moment.';
  if (error.status >= 500) return 'Server problem — please try again.';
  return error.message;
}

/** Adds server messages that aren't on screen yet, keeping unsent (pending/failed) ones last. */
function mergeMessages(current, incoming) {
  if (!incoming.length) return current;
  const known = new Set(current.map((message) => message.id));
  const fresh = incoming.filter((message) => !known.has(message.id));
  if (!fresh.length) return current;
  const confirmed = [...current.filter((message) => !message.local), ...fresh].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  return [...confirmed, ...current.filter((message) => message.local)];
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      {[0, 150, 300].map((delay) => <span key={delay} className="h-1.5 w-1.5 animate-bounce rounded-full bg-stone-400" style={{ animationDelay: `${delay}ms` }} />)}
    </span>
  );
}

function Avatar({ src, name, className = '' }) {
  return src
    ? <img src={src} alt="" className={`shrink-0 rounded-full bg-white object-contain p-0.5 ring-1 ring-emerald-900/10 ${className}`} />
    : <span className={`grid shrink-0 place-items-center rounded-full bg-emerald-700 font-semibold text-white ${className}`}>{(name || '?').charAt(0).toUpperCase()}</span>;
}

function Bubble({ message, grouped, logo, onRetry }) {
  const mine = message.sender === 'customer';
  return (
    <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-1' : 'mt-3'}`}>
      {!mine && (grouped ? <span className="w-7 shrink-0" /> : <Avatar src={logo} name={message.senderName} className="h-7 w-7 text-xs" />)}
      <div className={`flex max-w-[80%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
        {!mine && !grouped && message.senderName && <span className="mb-1 ml-1 text-[11px] font-medium text-stone-500">{message.senderName}</span>}
        <div
          className={`rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed break-words whitespace-pre-wrap shadow-sm ${mine
            ? `rounded-br-md bg-emerald-800 text-white ${message.failed ? 'bg-rose-700' : ''} ${message.pending ? 'opacity-70' : ''}`
            : 'rounded-bl-md bg-white text-stone-800 ring-1 ring-stone-200/80'}`}
        >
          {message.body}
        </div>
        <span className="mt-1 flex items-center gap-1 px-1 text-[10.5px] text-stone-400">
          {message.failed ? (
            <span className="flex max-w-full flex-col items-end gap-0.5 text-right">
              {message.error && <span className="text-rose-600">{message.error}</span>}
              <button type="button" onClick={() => onRetry(message)} className="inline-flex cursor-pointer items-center gap-1 font-medium text-rose-600 hover:underline"><AlertCircle size={12} /> Not sent · Tap to retry</button>
            </span>
          ) : (
            <>
              {time(message.createdAt)}
              {mine && (message.pending ? <Clock size={12} aria-label="Sending" /> : message.readAt ? <CheckCheck size={13} className="text-emerald-600" aria-label="Seen" /> : <Check size={13} aria-label="Sent" />)}
            </>
          )}
        </span>
      </div>
    </div>
  );
}

/**
 * Floating live-chat with the store team. Works for guests (name + email/phone, identified by a
 * browser token) and signed-in customers (linked to their account, history on every device).
 */
export default function ChatWidget() {
  const { pathname } = useLocation();
  const { isSignedIn, status: authStatus, user } = useCustomer();
  const { logoMarkUrl, storeName } = useBranding();

  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [guest, setGuest] = useState({ name: '', contact: '' });
  const [guestErrors, setGuestErrors] = useState({});
  const [hasToken, setHasToken] = useState(() => Boolean(getChatToken()));
  const [teaser, setTeaser] = useState(false);
  const [live, setLive] = useState(false);
  const [teamOnline, setTeamOnline] = useState(false);
  const [staffTyping, setStaffTyping] = useState(null);
  const [peek, setPeek] = useState(null);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);
  const openRef = useRef(open);
  openRef.current = open;

  const lastAt = useRef(null);
  const loaded = useRef(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const stickToBottom = useRef(true);
  const identity = isSignedIn ? `user:${user?.id}` : 'guest';
  const identityRef = useRef(identity);

  // Different person → different conversation.
  useEffect(() => {
    identityRef.current = identity;
    lastAt.current = null;
    loaded.current = false;
    setConversation(null);
    setMessages([]);
  }, [identity]);

  const fetchChat = useCallback(async () => {
    const asked = identityRef.current;
    const full = !loaded.current;
    const data = await storeApi.get('/store/chat', full || !lastAt.current ? undefined : { after: lastAt.current });
    if (identityRef.current !== asked) return;
    loaded.current = true;
    setConversation(data.conversation);
    setTeamOnline(Boolean(data.teamOnline));
    if (data.messages.length) lastAt.current = data.messages.at(-1).createdAt;
    setMessages((current) => (full ? [...data.messages, ...current.filter((message) => message.local)] : mergeMessages(current, data.messages)));
    // A guest conversation now belongs to the signed-in account: the guest token is no longer needed.
    if (data.conversation && !data.conversation.isGuest && getChatToken()) { setChatToken(null); setHasToken(false); }
  }, []);

  // Poll for replies: quickly while the chat is open, slowly (for the unread badge) when closed.
  // Guests without a chat yet are only checked while the window is open (for the team's online status).
  const canHaveChat = authStatus !== 'loading' && (isSignedIn || hasToken || open);
  useEffect(() => {
    if (!canHaveChat) return undefined;
    let stopped = false;
    let timer;
    const tick = async () => {
      if (!document.hidden) {
        if (open && !loaded.current) setLoading(true);
        try { await fetchChat(); } catch { /* offline: try again next tick */ }
        if (!stopped) setLoading(false);
      }
      const rate = live ? POLL.live : POLL.offline;
      if (!stopped) timer = setTimeout(tick, open ? rate.open : rate.closed);
    };
    tick();
    const onVisible = () => { if (!document.hidden) { clearTimeout(timer); tick(); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stopped = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [canHaveChat, open, identity, fetchChat, live]);

  // Live stream for this conversation: replies, typing, seen receipts — no waiting for a poll.
  const conversationId = conversation?.id;
  useEffect(() => {
    if (!conversationId) return undefined;
    const showTyping = (name) => {
      clearTimeout(typingTimer.current);
      setStaffTyping(name);
      if (name) typingTimer.current = setTimeout(() => setStaffTyping(null), TYPING_MS);
    };
    const close = openEventStream('/api/v1/store/chat/stream', {
      headers: () => {
        const headers = {};
        const customerToken = getCustomerToken();
        const chatToken = getChatToken();
        if (customerToken) headers.Authorization = `Bearer ${customerToken}`;
        if (chatToken) headers['X-Chat-Token'] = chatToken;
        return headers;
      },
      onStatus: setLive,
      onEvent: (event) => {
        if (event.type === 'message') {
          const { message } = event;
          if (!lastAt.current || new Date(message.createdAt) > new Date(lastAt.current)) lastAt.current = message.createdAt;
          setMessages((current) => mergeMessages(
            // Our own message echoed back from another tab/device, or racing the send response.
            message.sender === 'customer' ? current.filter((item) => !(item.local && item.pending && item.body === message.body)) : current,
            [message],
          ));
          setConversation((current) => ({ ...current, ...event.conversation }));
          if (message.sender === 'admin') {
            showTyping(null);
            setTeamOnline(true);
            if (!openRef.current) { setPeek({ name: message.senderName, body: message.body }); playChime(); }
          }
        } else if (event.type === 'typing') {
          showTyping(event.name || 'Support');
          setTeamOnline(true);
        } else if (event.type === 'seen') {
          setMessages((current) => current.map((item) => (item.sender === 'customer' && !item.local && !item.readAt ? { ...item, readAt: event.at } : item)));
        } else if (event.type === 'status') {
          setConversation((current) => ({ ...current, ...event.conversation }));
        } else if (event.type === 'deleted') {
          loaded.current = false;
          lastAt.current = null;
          setConversation(null);
          setMessages([]);
          if (getChatToken()) { setChatToken(null); setHasToken(false); }
        }
      },
    });
    return () => { close(); clearTimeout(typingTimer.current); };
  }, [conversationId, identity]);

  useEffect(() => { if (open) setPeek(null); }, [open]);

  // Seen receipts for the store team's replies.
  useEffect(() => {
    if (!open || !conversation?.unread) return;
    setConversation((current) => (current ? { ...current, unread: 0 } : current));
    storeApi.post('/store/chat/read').catch(() => {});
  }, [open, conversation?.unread]);

  // Open from elsewhere on the site (e.g. "Chat with us" buttons).
  useEffect(() => {
    const onOpen = (event) => {
      setOpen(true);
      setTeaser(false);
      if (event.detail?.text) setDraft(event.detail.text);
    };
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, []);

  // A gentle one-time greeting on larger screens.
  useEffect(() => {
    if (sessionStorage.getItem('swasti_chat_teaser') || window.innerWidth < 640) return undefined;
    const timer = setTimeout(() => setTeaser(true), 9000);
    return () => clearTimeout(timer);
  }, []);
  const dismissTeaser = () => { setTeaser(false); sessionStorage.setItem('swasti_chat_teaser', '1'); };

  // Full-screen on phones: stop the page behind from scrolling; Escape closes.
  useEffect(() => {
    if (!open) return undefined;
    const small = window.innerWidth < 640;
    const previous = document.body.style.overflow;
    if (small) document.body.style.overflow = 'hidden';
    const onKey = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 150);
    return () => { if (small) document.body.style.overflow = previous; window.removeEventListener('keydown', onKey); };
  }, [open]);

  // Keep the newest message in view unless the shopper scrolled up to read history.
  useEffect(() => {
    const list = listRef.current;
    if (open && list && stickToBottom.current) list.scrollTop = list.scrollHeight;
  }, [messages, open, loading, staffTyping]);

  const needsGuestDetails = !isSignedIn && !conversation;

  function signalTyping() {
    if (!conversation) return;
    const now = Date.now();
    if (now - lastTypingSent.current < 2500) return;
    lastTypingSent.current = now;
    storeApi.post('/store/chat/typing').catch(() => {});
  }

  function validateGuest() {
    const errors = {};
    if (guest.name.trim().length < 2) errors.name = 'Please enter your name';
    const contact = guest.contact.trim();
    if (!EMAIL.test(contact) && !PHONE.test(contact)) errors.contact = 'Enter a valid email or mobile number';
    setGuestErrors(errors);
    return !Object.keys(errors).length;
  }

  async function deliver(local) {
    const payload = { body: local.body, pageUrl: pathname };
    if (needsGuestDetails) {
      const contact = guest.contact.trim();
      Object.assign(payload, { name: guest.name.trim(), ...(EMAIL.test(contact) ? { email: contact } : { phone: contact }) });
    }
    try {
      const result = await storeApi.post('/store/chat/messages', payload);
      if (result.token) { setChatToken(result.token); setHasToken(true); }
      loaded.current = true;
      setConversation(result.conversation);
      setMessages((current) => {
        const rest = current.filter((message) => message.id !== local.id);
        return mergeMessages(rest, [result.message]);
      });
    } catch (error) {
      setMessages((current) => current.map((message) => (message.id === local.id ? { ...message, pending: false, failed: true, error: sendErrorText(error) } : message)));
    }
  }

  function send(text = draft) {
    const body = text.trim();
    if (!body) return;
    if (needsGuestDetails && !validateGuest()) return;
    const local = { id: `local-${Date.now()}`, local: true, pending: true, sender: 'customer', body, createdAt: new Date().toISOString() };
    stickToBottom.current = true;
    setMessages((current) => [...current, local]);
    setDraft('');
    lastTypingSent.current = 0;
    if (inputRef.current) inputRef.current.style.height = '';
    deliver(local);
  }

  function retry(message) {
    setMessages((current) => current.map((item) => (item.id === message.id ? { ...item, pending: true, failed: false } : item)));
    deliver(message);
  }

  const unread = conversation?.unread ?? 0;
  const firstName = isSignedIn ? (user?.name ?? '').split(' ')[0] : '';
  const raised = pathname.startsWith('/product/');
  const hasHistory = messages.length > 0;

  return (
    <>
      {/* Greeting teaser */}
      {teaser && !open && !peek && (
        <div className={`fixed right-5 z-[55] hidden w-72 rounded-2xl bg-white p-4 pr-9 shadow-2xl shadow-emerald-950/15 ring-1 ring-stone-200 motion-safe:animate-fade-up sm:block ${raised ? 'bottom-44 lg:bottom-24' : 'bottom-24'}`}>
          <button type="button" onClick={dismissTeaser} aria-label="Dismiss" className="absolute top-2 right-2 grid h-7 w-7 cursor-pointer place-items-center rounded-full text-stone-400 hover:bg-stone-100"><X size={15} /></button>
          <button type="button" onClick={() => { dismissTeaser(); setOpen(true); }} className="flex cursor-pointer items-start gap-3 text-left">
            <Avatar src={logoMarkUrl} name={storeName} className="h-9 w-9" />
            <span>
              <span className="block text-sm font-semibold text-stone-900">Need a hand?</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-stone-600">Chat with our team about products, orders or delivery.</span>
            </span>
          </button>
        </div>
      )}

      {/* New reply preview while the chat is closed */}
      {peek && !open && (
        <div className={`fixed right-4 z-[55] w-[min(320px,calc(100vw-2rem))] motion-safe:animate-fade-up sm:right-5 ${raised ? 'bottom-44 lg:bottom-24' : 'bottom-24'}`}>
          <div className="relative rounded-2xl bg-white p-3.5 pr-9 shadow-2xl shadow-emerald-950/20 ring-1 ring-stone-200">
            <button type="button" onClick={() => setPeek(null)} aria-label="Dismiss" className="absolute top-2 right-2 grid h-7 w-7 cursor-pointer place-items-center rounded-full text-stone-400 hover:bg-stone-100"><X size={15} /></button>
            <button type="button" onClick={() => setOpen(true)} className="flex w-full cursor-pointer items-start gap-3 text-left">
              <Avatar src={logoMarkUrl} name={storeName} className="h-9 w-9" />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-emerald-800">{peek.name || storeName} replied</span>
                <span className="mt-0.5 line-clamp-3 block text-[13px] leading-snug text-stone-700">{peek.body}</span>
                <span className="mt-1.5 inline-block text-xs font-semibold text-emerald-800">Open chat →</span>
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Launcher */}
      <button
        type="button"
        onClick={() => { setOpen((value) => !value); dismissTeaser(); }}
        aria-label={open ? 'Close chat' : `Chat with us${unread ? ` (${unread} new)` : ''}`}
        aria-expanded={open}
        className={`fixed right-4 z-[55] grid h-14 w-14 cursor-pointer place-items-center rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 text-white shadow-xl shadow-emerald-900/30 ring-4 ring-white transition hover:scale-105 active:scale-95 sm:right-5 ${raised ? 'bottom-24 lg:bottom-5' : 'bottom-4 sm:bottom-5'} ${open ? 'max-sm:hidden' : ''}`}
      >
        <span className={`absolute transition duration-300 ${open ? 'scale-50 rotate-90 opacity-0' : 'scale-100 opacity-100'}`}><MessageCircle size={24} /></span>
        <span className={`absolute transition duration-300 ${open ? 'scale-100 opacity-100' : 'scale-50 -rotate-90 opacity-0'}`}><ChevronDown size={26} /></span>
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 grid h-6 min-w-6 place-items-center rounded-full bg-amber-400 px-1.5 text-xs font-bold text-emerald-950 ring-2 ring-white motion-safe:animate-soft-pulse">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <section
          role="dialog"
          aria-label={`Chat with ${storeName}`}
          className="fixed inset-0 z-[65] flex h-dvh flex-col overflow-hidden bg-stone-50 motion-safe:animate-chat-in sm:inset-auto sm:right-5 sm:bottom-24 sm:h-[min(640px,calc(100dvh-8rem))] sm:w-[390px] sm:rounded-3xl sm:shadow-2xl sm:shadow-emerald-950/25 sm:ring-1 sm:ring-stone-200"
        >
          {/* Header */}
          <header className="relative shrink-0 overflow-hidden bg-gradient-to-br from-emerald-800 via-emerald-900 to-emerald-950 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 text-white">
            <div aria-hidden="true" className="absolute -top-16 -right-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <span className="relative">
                <Avatar src={logoMarkUrl} name={storeName} className="h-11 w-11" />
                <span className={`absolute right-0 bottom-0 h-3 w-3 rounded-full ring-2 ring-emerald-900 ${teamOnline ? 'bg-lime-400' : 'bg-stone-400'}`} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{storeName} Support</p>
                <p className="flex items-center gap-1.5 truncate text-xs text-emerald-100/85">
                  {staffTyping
                    ? <>{staffTyping} is typing…</>
                    : teamOnline ? <>Online now · we usually reply in minutes</> : <>We usually reply within a few hours</>}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-white/10 transition hover:bg-white/20"><X size={19} /></button>
            </div>
          </header>

          {/* Messages */}
          <div
            ref={listRef}
            onScroll={(event) => {
              const el = event.currentTarget;
              stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
            className="flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-4"
            aria-live="polite"
          >
            {loading && !hasHistory ? (
              <div className="space-y-3 pt-4" aria-label="Loading messages">
                {['w-3/5', 'ml-auto w-1/2', 'w-2/3'].map((width) => <div key={width} className={`h-10 animate-pulse rounded-2xl bg-stone-200/70 ${width}`} />)}
              </div>
            ) : (
              <>
                {/* Welcome */}
                <div className="flex items-end gap-2 pt-3">
                  <Avatar src={logoMarkUrl} name={storeName} className="h-7 w-7 text-xs" />
                  <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-stone-800 shadow-sm ring-1 ring-stone-200/80">
                    Hi{firstName ? ` ${firstName}` : ' there'} 👋 Welcome to {storeName}! Ask us anything about products, orders or delivery — we’re happy to help.
                  </div>
                </div>

                {!hasHistory && (
                  <div className="mt-4 flex flex-wrap gap-2 pl-9">
                    {QUICK_TOPICS.map((topic) => (
                      <button key={topic} type="button" onClick={() => { setDraft(topic); inputRef.current?.focus(); }} className="cursor-pointer rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-50">
                        {topic}
                      </button>
                    ))}
                  </div>
                )}

                {conversation?.status === 'closed' && hasHistory && (
                  <p className="my-3 rounded-xl bg-white px-3 py-2 text-center text-xs text-stone-500 ring-1 ring-stone-200/80">This conversation was marked as resolved. Send a message any time to reopen it.</p>
                )}

                {messages.map((message, i) => {
                  const previous = messages[i - 1];
                  const newDay = !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
                  const grouped = !newDay && previous?.sender === message.sender && new Date(message.createdAt) - new Date(previous.createdAt) < 5 * 60 * 1000;
                  return (
                    <div key={message.id}>
                      {newDay && (
                        <div className="my-4 flex items-center gap-3 text-[11px] font-medium text-stone-400">
                          <span className="h-px flex-1 bg-stone-200" />{dayLabel(message.createdAt)}<span className="h-px flex-1 bg-stone-200" />
                        </div>
                      )}
                      <Bubble message={message} grouped={grouped} logo={logoMarkUrl} onRetry={retry} />
                    </div>
                  );
                })}
                {staffTyping && (
                  <div className="mt-3 flex items-end gap-2" aria-live="polite">
                    <Avatar src={logoMarkUrl} name={storeName} className="h-7 w-7 text-xs" />
                    <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200/80"><TypingDots /><span className="sr-only">{staffTyping} is typing</span></div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Guest details (first message only) */}
          {needsGuestDetails && (
            <div className="shrink-0 border-t border-stone-200/80 bg-white px-4 pt-3 pb-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-stone-700">Chat as a guest</p>
                <Link to={`/login?next=${encodeURIComponent(pathname)}`} onClick={() => setOpen(false)} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:underline"><LogIn size={13} /> Sign in instead</Link>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="sr-only">Your name</span>
                  <input value={guest.name} onChange={(event) => setGuest((value) => ({ ...value, name: event.target.value }))} placeholder="Your name" autoComplete="name" maxLength={100} aria-invalid={Boolean(guestErrors.name)} className={`h-10 w-full rounded-xl border bg-stone-50 px-3 text-sm outline-none focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-700/10 ${guestErrors.name ? 'border-rose-400' : 'border-stone-200'}`} />
                </label>
                <label className="block">
                  <span className="sr-only">Email or mobile number</span>
                  <input value={guest.contact} onChange={(event) => setGuest((value) => ({ ...value, contact: event.target.value }))} placeholder="Email or mobile" autoComplete="email" maxLength={254} aria-invalid={Boolean(guestErrors.contact)} className={`h-10 w-full rounded-xl border bg-stone-50 px-3 text-sm outline-none focus:border-emerald-700 focus:bg-white focus:ring-4 focus:ring-emerald-700/10 ${guestErrors.contact ? 'border-rose-400' : 'border-stone-200'}`} />
                </label>
              </div>
              {(guestErrors.name || guestErrors.contact) && <p className="mt-1.5 text-xs text-rose-600">{guestErrors.name || guestErrors.contact}</p>}
            </div>
          )}

          {/* Composer */}
          <form
            onSubmit={(event) => { event.preventDefault(); send(); }}
            className={`shrink-0 bg-white px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] ${needsGuestDetails ? '' : 'border-t border-stone-200/80'}`}
          >
            <div className="flex items-end gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-1.5 pl-3.5 transition focus-within:border-emerald-700 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-700/10">
              <textarea
                ref={inputRef}
                value={draft}
                rows={1}
                maxLength={2000}
                placeholder="Write a message…"
                aria-label="Message"
                onChange={(event) => {
                  setDraft(event.target.value);
                  if (event.target.value.trim()) signalTyping();
                  event.target.style.height = '';
                  event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(); }
                }}
                className="max-h-[120px] min-h-9 flex-1 resize-none bg-transparent py-2 text-[15px] leading-5 outline-none placeholder:text-stone-400"
              />
              <button type="submit" disabled={!draft.trim()} aria-label="Send message" className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl bg-emerald-800 text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-300">
                <ArrowUp size={18} />
              </button>
            </div>
            <p className="mt-1.5 flex items-center justify-center gap-1 text-[10.5px] text-stone-400">
              {isSignedIn
                ? <><Lock size={10} /> Signed in as {user?.name} · your chat is saved to your account</>
                : conversation
                  ? <><RotateCw size={10} /> Saved on this device · <Link to={`/login?next=${encodeURIComponent(pathname)}`} onClick={() => setOpen(false)} className="font-medium text-emerald-700 hover:underline">sign in</Link> to keep it everywhere</>
                  : <><Lock size={10} /> We only use your details to reply to you</>}
            </p>
          </form>
        </section>
      )}
    </>
  );
}
