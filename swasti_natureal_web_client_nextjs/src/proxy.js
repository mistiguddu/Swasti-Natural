import { NextResponse } from 'next/server';

/**
 * Forwards /api/* and /uploads/* to the Swasti Natural API (same as the old Vite dev proxy).
 * The browser sees these paths as same-origin, so CORS is not needed. The Origin header is
 * dropped so the API never rejects proxied requests, whether the site is opened via
 * localhost, 127.0.0.1 or a LAN IP. The target is server-side config only.
 */
const target = (process.env.API_PROXY_TARGET || 'http://127.0.0.1:4000').replace(/\/$/, '');

export function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const headers = new Headers(request.headers);
  headers.delete('origin');
  return NextResponse.rewrite(new URL(`${target}${pathname}${search}`), { request: { headers } });
}

export const config = {
  matcher: ['/api/:path*', '/uploads/:path*'],
};
