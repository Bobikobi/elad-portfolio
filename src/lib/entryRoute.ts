import { sectionForPath } from './sections';

/**
 * Which route this DOCUMENT was loaded at.
 *
 * The home experience has to tell a FRESH arrival (play the galaxy dive — it is the
 * signature) from an IN-SESSION return out of a world (land straight in the solar
 * overview; a visitor who has already flown does not want the intro again). That was
 * decided by a module-level "have I mounted before" flag on the home component, and the
 * flag cannot see the difference in the one case that matters: a deep link.
 *
 * Land on /projects from a search result and press Escape, and the home component mounts
 * for the FIRST time in that document — so it reported a fresh visit and replayed the
 * entire dive, even though `useWorldExit` had just written `seen-intro` for exactly the
 * opposite reason. Measured on the alias: Escape from all five worlds left the scene in
 * the galaxy act.
 *
 * A module evaluated during hydration of the initial document CAN see it, because it runs
 * before any client-side navigation. This module is imported by CosmicStage, which lives
 * in the root layout and is therefore in every route's first client bundle — so the value
 * below is always captured at the real entry, never after a navigation has rewritten the
 * URL.
 */
const ENTRY_PATH = typeof window === 'undefined' ? null : window.location.pathname;

/** True when this document was opened directly on a world route rather than on home. */
export const ENTERED_ON_A_WORLD = ENTRY_PATH !== null && sectionForPath(ENTRY_PATH) !== null;
