/**
 * Server-Sent Events over fetch() so auth headers can be sent (EventSource can't).
 * Reconnects with backoff. Returns a function that closes the stream.
 *
 *   const close = openEventStream('/api/v1/chats/stream', {
 *     headers: () => ({ Authorization: `Bearer ${token}` }),
 *     onEvent: (event) => …, onStatus: (connected) => …,
 *   });
 */
export function openEventStream(url, { headers, onEvent, onStatus, onNoContent }) {
  let controller = null;
  let closed = false;
  let attempt = 0;
  let timer = null;

  const setStatus = (value) => { try { onStatus?.(value); } catch { /* ignore */ } };

  async function connect() {
    if (closed) return;
    controller = new AbortController();
    try {
      const response = await fetch(url, {
        headers: { Accept: 'text/event-stream', ...(typeof headers === 'function' ? headers() : headers) },
        signal: controller.signal,
        cache: 'no-store',
      });
      if (response.status === 204) { setStatus(false); onNoContent?.(); return; }
      if (!response.ok || !response.body) throw new Error(`Stream failed (${response.status})`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = buffer.search(/\r?\n\r?\n/)) !== -1) {
          const chunk = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary).replace(/^\r?\n\r?\n/, '');
          const data = chunk.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n');
          if (!data) continue;
          let event;
          try { event = JSON.parse(data); } catch { continue; }
          if (event.type === 'ready') { attempt = 0; setStatus(true); continue; }
          onEvent?.(event);
        }
      }
      throw new Error('Stream ended');
    } catch (error) {
      if (closed || error.name === 'AbortError') return;
      setStatus(false);
      attempt += 1;
      const delay = Math.min(30000, 1000 * 2 ** Math.min(attempt, 5)) + Math.random() * 500;
      timer = setTimeout(connect, delay);
    }
  }

  connect();
  return () => {
    closed = true;
    clearTimeout(timer);
    controller?.abort();
    setStatus(false);
  };
}

/** Short, soft two-tone chime for new messages (Web Audio, no asset needed). */
let audioContext = null;
export function playChime() {
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const now = audioContext.currentTime;
    [[880, 0], [1320, 0.12]].forEach(([frequency, offset]) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.12, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.35);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.4);
    });
  } catch { /* audio not available */ }
}
