'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from '@/router';
import { MessageCircle, X } from 'lucide-react';
import { SESSION_KEY } from '../api.js';
import { openEventStream, playChime } from '../lib/eventStream.js';
import { t } from '../i18n/index.js';

const ChatRealtimeContext = createContext({ connected: false, subscribe: () => () => {}, sound: true, setSound: () => {} });
const SOUND_KEY = 'swasti_chat_sound';
const POPUP_MS = 9000;

function Initials({ name }) {
  const letters = (name || '?').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">{letters}</span>;
}

/**
 * Admin-wide live chat connection: one SSE stream for the whole console. Shows a pop-up,
 * plays a chime and (when the tab is hidden) a desktop notification for every new
 * customer message, and lets pages (inbox, dashboard) subscribe to live events.
 */
export function ChatRealtimeProvider({ enabled, onActivity, children }) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [popups, setPopups] = useState([]);
  const [sound, setSoundState] = useState(() => localStorage.getItem(SOUND_KEY) !== '0');
  const listeners = useRef(new Set());
  const where = useRef({ pathname, search });
  where.current = { pathname, search };
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const activityRef = useRef(onActivity);
  activityRef.current = onActivity;
  const hiddenCount = useRef(0);
  const baseTitle = useRef('');

  const setSound = useCallback((value) => {
    localStorage.setItem(SOUND_KEY, value ? '1' : '0');
    setSoundState(value);
  }, []);

  const subscribe = useCallback((listener) => {
    listeners.current.add(listener);
    return () => listeners.current.delete(listener);
  }, []);

  const dismiss = useCallback((id) => setPopups((current) => current.filter((popup) => popup.id !== id)), []);

  // Unread count in the browser tab title while the console is in the background.
  useEffect(() => {
    const onVisible = () => {
      if (document.hidden) return;
      hiddenCount.current = 0;
      if (baseTitle.current) { document.title = baseTitle.current; baseTitle.current = ''; }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    const handle = (event) => {
      listeners.current.forEach((listener) => { try { listener(event); } catch (error) { console.error(error); } });
      if (['message', 'read', 'deleted', 'status'].includes(event.type)) activityRef.current?.();
      if (event.type !== 'message' || event.message?.sender !== 'customer') return;

      const conversationId = event.conversation.id;
      const viewing = where.current.pathname === '/messages' && new URLSearchParams(where.current.search).get('c') === conversationId;
      if (viewing && !document.hidden) return; // already on screen

      if (soundRef.current) playChime();
      if (!viewing) {
        setPopups((current) => [
          { id: `${conversationId}-${event.message.id}`, conversationId, name: event.conversation.name, body: event.message.body, isNew: event.isNew, isGuest: event.conversation.isGuest },
          ...current.filter((popup) => popup.conversationId !== conversationId),
        ].slice(0, 3));
      }
      if (document.hidden) {
        hiddenCount.current += 1;
        baseTitle.current ||= document.title.replace(/^\(\d+\)\s*/, '');
        document.title = `(${hiddenCount.current}) ${t('New message')} · ${baseTitle.current}`;
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const notification = new Notification(`${event.conversation.name}`, { body: event.message.body.slice(0, 140), tag: conversationId });
            notification.onclick = () => { window.focus(); navigate(`/messages?c=${conversationId}`); notification.close(); };
          } catch { /* not supported */ }
        }
      }
    };
    return openEventStream('/api/v1/chats/stream', {
      headers: () => ({ Authorization: `Bearer ${sessionStorage.getItem(SESSION_KEY) ?? ''}` }),
      onEvent: handle,
      onStatus: setConnected,
    });
  }, [enabled, navigate]);

  // Auto-dismiss pop-ups.
  useEffect(() => {
    if (!popups.length) return undefined;
    const timer = setTimeout(() => setPopups((current) => current.slice(0, -1)), POPUP_MS);
    return () => clearTimeout(timer);
  }, [popups]);

  const value = useMemo(() => ({ connected, subscribe, sound, setSound }), [connected, subscribe, sound, setSound]);

  return (
    <ChatRealtimeContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed top-4 right-4 z-[75] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2.5">
        {popups.map((popup) => (
          <div key={popup.id} className="pointer-events-auto overflow-hidden rounded-2xl bg-surface shadow-2xl shadow-slate-900/15 ring-1 ring-slate-200 motion-safe:animate-slide-in">
            <div className="flex items-start gap-3 p-3.5">
              <span className="relative">
                <Initials name={popup.name} />
                <span className="absolute -right-1 -bottom-1 grid h-5 w-5 place-items-center rounded-full bg-teal-600 text-white ring-2 ring-surface"><MessageCircle size={11} /></span>
              </span>
              <button type="button" onClick={() => { dismiss(popup.id); navigate(`/messages?c=${popup.conversationId}`); }} className="min-w-0 flex-1 cursor-pointer text-left">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-slate-900">{popup.name}</span>
                  <span className="shrink-0 rounded bg-teal-50 px-1.5 py-px text-[10px] font-semibold text-teal-700 uppercase">{popup.isNew ? t('New chat') : t('Message')}</span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-[13px] text-slate-600">{popup.body}</span>
                <span className="mt-1.5 inline-block text-xs font-semibold text-teal-700">{t('Reply now')} →</span>
              </button>
              <button type="button" onClick={() => dismiss(popup.id)} aria-label={t('Dismiss')} className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={15} /></button>
            </div>
            <div className="h-0.5 bg-teal-100"><div className="h-full origin-left bg-teal-500 motion-safe:animate-[slide-progress_9s_linear_both]" /></div>
          </div>
        ))}
      </div>
    </ChatRealtimeContext.Provider>
  );
}

export const useChatRealtime = () => useContext(ChatRealtimeContext);
