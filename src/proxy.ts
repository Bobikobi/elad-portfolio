import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { localeForPath } from '@/lib/sections';
import { LOCALE_COOKIE, parseLocale } from '@/lib/localePref';

export function proxy(request: NextRequest) {
  const host = request.headers.get('host');

  if (host === 'eladsaadon.dev') {
    const url = request.nextUrl.clone();
    url.host = 'www.eladsaadon.dev';
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  // Resolve locale from the route so the server layout can render the correct language,
  // <html lang> and dir on the initial SSR pass. The rule lives in lib/sections so the
  // server and the client cannot drift.
  //
  // F3.2 — when the route pins nothing (/privacy, /terms, /accessibility serve every
  // language from one URL), the visitor's own preference decides, and the COOKIE is how
  // the server gets to see it. Letting the client correct this after hydration is what
  // measured CLS 0.279 on /privacy: English LTR painted first, then the whole document
  // flipped to Hebrew RTL.
  const locale =
    localeForPath(request.nextUrl.pathname) ??
    parseLocale(request.cookies.get(LOCALE_COOKIE)?.value) ??
    'en';

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-locale', locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)',
  ],
};
