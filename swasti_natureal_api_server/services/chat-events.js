import { EventEmitter } from 'node:events';

/**
 * In-process real-time bus for live chat, delivered to browsers with Server-Sent Events.
 * Channels: `admin` (every open admin inbox) and `conv:<id>` (the shopper's open chat windows).
 * Note: single-process only. When running several API instances, swap this for Redis pub/sub.
 */
const bus = new EventEmitter();
bus.setMaxListeners(0);

const presence = new Map(); // conversationId → open shopper streams
let teamStreams = 0; // open admin inboxes

export const emitAdmin = (event) => bus.emit('admin', event);
export const emitShopper = (conversationId, event) => bus.emit(`conv:${conversationId}`, event);
export const isOnline = (conversationId) => (presence.get(String(conversationId)) ?? 0) > 0;
export const isTeamOnline = () => teamStreams > 0;

function trackPresence(conversationId, delta) {
  const id = String(conversationId);
  const before = presence.get(id) ?? 0;
  const after = Math.max(0, before + delta);
  if (after) presence.set(id, after); else presence.delete(id);
  if (!before !== !after) emitAdmin({ type: 'presence', conversationId: id, online: after > 0 });
}

/** Opens an SSE response and pipes events from `channel` into it until the client disconnects. */
export function streamChannel(req, res, channel, { conversationId } = {}) {
  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // nginx: don't buffer the stream
  });
  res.flushHeaders?.();
  res.write('retry: 3000\n\n');
  res.write(`data: ${JSON.stringify({ type: 'ready' })}\n\n`);

  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);
  bus.on(channel, send);
  if (conversationId) trackPresence(conversationId, 1);
  if (channel === 'admin') teamStreams += 1;

  req.on('close', () => {
    clearInterval(heartbeat);
    bus.off(channel, send);
    if (conversationId) trackPresence(conversationId, -1);
    if (channel === 'admin') teamStreams = Math.max(0, teamStreams - 1);
  });
}
