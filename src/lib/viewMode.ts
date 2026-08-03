/**
 * F2 - the view mode: the live WebGL cosmos, or a plain document.
 *
 * The choice has to be readable on the SERVER, because the two modes render different
 * children on the section routes - a scene overlay versus an ordinary page. A choice kept
 * only in localStorage would mean every reload paints the cosmic markup first and swaps
 * after hydration, which is the flash this stage exists to avoid. So the cookie is the
 * source of truth and localStorage is a mirror, not the other way round.
 *
 * No cookie means COSMIC. That is what a crawler gets, and it is what a first-time
 * visitor gets. The client may then adopt classic on its own - see ViewModeProvider - but
 * the server never guesses at capabilities it cannot see.
 */
export type ViewMode = 'cosmic' | 'classic';

export const VIEW_MODE_COOKIE = 'viewMode';
export const DEFAULT_VIEW_MODE: ViewMode = 'cosmic';

/** A year. The mode is a preference, not a session. */
export const VIEW_MODE_MAX_AGE = 60 * 60 * 24 * 365;

/** Narrow an untrusted cookie / storage value. `null` means "nothing was chosen". */
export function parseViewMode(raw: string | null | undefined): ViewMode | null {
  return raw === 'classic' || raw === 'cosmic' ? raw : null;
}

/** The `document.cookie` string that records a choice. */
export function viewModeCookie(mode: ViewMode): string {
  return `${VIEW_MODE_COOKIE}=${mode}; path=/; max-age=${VIEW_MODE_MAX_AGE}; samesite=lax`;
}
