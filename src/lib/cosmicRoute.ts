import { localeForPath, sectionForPath } from './sections';

/**
 * Is this route one the live cosmos belongs to? Home, and the five world routes - nothing
 * else.
 *
 * `sectionForPath` answers a different question: it maps a path to the SECTION it belongs
 * to, by its first segment, so `/services/nextjs-development` is part of the services
 * section and correctly returns Jupiter. Reading that as "mount the scene here" put the
 * whole three.js bundle on every service detail page, every guide and every legal page -
 * measured on production at 658KB of JS and 411ms of blocking time to show a page of text.
 *
 * So this is a different test, not a fix to that one: the first-segment behaviour is
 * load-bearing for the navbar's active state and for the section metadata. The path has to
 * be the section's own route, with nothing after it. The locale prefix is stripped through
 * `localeForPath` rather than a list of its own, so the answer follows the routing scheme
 * instead of a second copy of it going stale.
 */
export function isCosmicRoute(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  // Is the FIRST SEGMENT a locale prefix? `localeForPath` answers a different question -
  // which locale the route RENDERS IN - and returns 'en' for an unprefixed English route
  // like /services/nextjs-development. Reading that as "there is a prefix here" ate the
  // 'services' segment and put the canvas straight back on the page this exists to clear.
  // The prefix is there only when the locale it reports IS the first segment.
  const prefixed = parts.length > 0 && parts[0] === localeForPath(pathname);
  const rest = parts.slice(prefixed ? 1 : 0);
  if (rest.length === 0) return true; // home, in any locale
  return rest.length === 1 && sectionForPath(pathname) !== null;
}
