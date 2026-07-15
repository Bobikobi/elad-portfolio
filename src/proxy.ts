import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PREFIXED_LOCALES = ['en', 'ru'] as const;

export function proxy(request: NextRequest) {
  const host = request.headers.get('host');

  if (host === 'eladsaadon.dev') {
    const url = request.nextUrl.clone();
    url.host = 'www.eladsaadon.dev';
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  // Resolve locale from the route so the server layout can render the correct
  // language, <html lang> and dir on the initial SSR pass (Hebrew is the default,
  // served at the un-prefixed root).
  const segment = request.nextUrl.pathname.split('/')[1];
  const locale = (PREFIXED_LOCALES as readonly string[]).includes(segment) ? segment : 'he';

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-locale', locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)',
  ],
};
