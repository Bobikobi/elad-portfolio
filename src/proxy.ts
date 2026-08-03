import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// F3 — English is the default locale and owns the un-prefixed URL space, so only the
// two non-default languages carry a path prefix.
const PREFIXED_LOCALES = ['he', 'ru'] as const;

// Hand-written Hebrew-only subtrees. They have no English or Russian counterpart, so
// they keep their indexed un-prefixed URLs and are pinned to Hebrew rather than
// inheriting the new English default — otherwise Hebrew articles would be served
// under lang="en" dir="ltr".
const HEBREW_ONLY_PREFIXES = ['/guides'];

export function proxy(request: NextRequest) {
  const host = request.headers.get('host');

  if (host === 'eladsaadon.dev') {
    const url = request.nextUrl.clone();
    url.host = 'www.eladsaadon.dev';
    url.protocol = 'https:';
    return NextResponse.redirect(url, 308);
  }

  // Resolve locale from the route so the server layout can render the correct
  // language, <html lang> and dir on the initial SSR pass (English is the default,
  // served at the un-prefixed root; Hebrew and Russian are prefixed).
  const { pathname } = request.nextUrl;
  const segment = pathname.split('/')[1];
  const locale = (PREFIXED_LOCALES as readonly string[]).includes(segment)
    ? segment
    : HEBREW_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
      ? 'he'
      : 'en';

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-locale', locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)',
  ],
};
