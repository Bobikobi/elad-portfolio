import { sectionForPath } from './sections';

/**
 * Is this route one the live cosmos belongs to? Home, and the five world routes - nothing
 * else.
 *
 * `sectionForPath` answers a different question: it maps a path to the SECTION it belongs
 * to, and it does that by its first segment, so `/services/nextjs-development` is part of
 * the services section and correctly returns Jupiter. Reading that as "mount the scene
 * here" put the whole three.js bundle on every service detail page - measured on the
 * preview at 660KB of JS and 391ms of blocking time to show a page of text, against 235KB
 * and 0ms once the test became exact.
 *
 * So this is deliberately a different test, not a fix to that one: the path must be the
 * section's own route, with nothing after it.
 */
export function isCosmicRoute(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean);
  const rest = parts[0] === 'en' || parts[0] === 'ru' ? parts.slice(1) : parts;
  if (rest.length === 0) return true; // home, in any locale
  return rest.length === 1 && sectionForPath(pathname) !== null;
}
