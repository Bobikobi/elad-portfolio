import { sectionForPath } from './sections';

/**
 * Which route this DOCUMENT was opened at.
 *
 * The home experience has to tell a FRESH arrival (play the galaxy dive — it is the
 * signature) from an IN-SESSION return out of a world (land straight in the solar
 * overview; a visitor who has already flown does not want the intro again). That was
 * decided by a module-level "have I mounted before" flag on the home component, and the
 * flag cannot see the one case that matters: a deep link. Land on /projects from a search
 * result and press Escape, and the home component mounts for the FIRST time in that
 * document — so it reported a fresh visit and replayed the entire dive, ignoring the
 * `seen-intro` that useWorldExit had written one tick earlier for the opposite reason.
 *
 * Capturing it in module scope (`const ENTRY = location.pathname` at import time) was the
 * first attempt and it was subtly wrong: the module was pulled in for its side effect
 * alone, and a side-effect-only import is exactly the kind a bundler may drop or defer.
 * Whether it evaluated before or after the navigation then depended on whether the home
 * chunk happened to be prefetched — which measured as four worlds returning to the
 * overview and the fifth replaying the dive, from identical code.
 *
 * So it is a CALL, from an effect on the one client component every route mounts. Effects
 * run after the first render of the initial document and before any user navigation, so
 * the first call always carries the real entry route, and nothing can tree-shake away a
 * function someone invokes.
 */
let entryPath: string | null = null;

/** Record where this document started. Idempotent — only the first call counts. */
export function captureEntryRoute(pathname: string): void {
  if (entryPath === null) entryPath = pathname;
}

/**
 * True when this document was opened directly on a world route rather than on home.
 *
 * Note the ordering this relies on: React runs a page's effects before its layout's, so
 * on a genuine load of home the home component asks this BEFORE the capture has happened
 * and correctly gets `false` — a fresh arrival, play the dive.
 */
export function enteredOnAWorld(): boolean {
  return entryPath !== null && sectionForPath(entryPath) !== null;
}
