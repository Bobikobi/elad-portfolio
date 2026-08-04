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
  const rest = parts.slice(localeForPath(pathname) === null ? 0 : 1);
  if (rest.length === 0) return true; // home, in any locale
  return rest.length === 1 && sectionForPath(pathname) !== null;
}
