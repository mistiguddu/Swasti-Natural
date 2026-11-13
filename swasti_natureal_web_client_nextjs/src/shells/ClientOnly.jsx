'use client';

import { useEffect, useState } from 'react';

/**
 * Renders children only in the browser. The original app was a client-only SPA whose
 * state (tokens, cart, theme, language) lives in localStorage/sessionStorage, so the
 * interactive tree mounts after hydration — exactly like the old blank boot screen —
 * which avoids any server/client hydration mismatch.
 */
export default function ClientOnly({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div role="status" aria-label="Loading" className="min-h-screen bg-white" />;
  return children;
}
