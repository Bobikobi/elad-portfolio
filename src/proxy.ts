import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { localeForPath } from '@/lib/sections';

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
  // server and the client cannot drift; null means the route serves every language from
  // one URL (/privacy, /terms, /accessibility), and the server has to pick a default it
  // can render before it knows the visitor — the client corrects those after hydration.
  const locale = localeForPath(request.nextUrl.pathname) ?? 'en';

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-locale', locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)',
  ],
};
