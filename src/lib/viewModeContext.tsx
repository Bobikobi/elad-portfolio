'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWebGLAvailable } from '@/hooks/useWebGLAvailable';
import { useMotionDisabled } from '@/hooks/useMotionDisabled';
import {
  DEFAULT_VIEW_MODE,
  VIEW_MODE_COOKIE,
  parseViewMode,
  viewModeCookie,
  type ViewMode,
} from './viewMode';

interface ViewModeValue {
  /** The mode in force right now. */
  mode: ViewMode;
  /** True once a mode has been recorded - by the visitor, or adopted on their behalf. */
  chosen: boolean;
  /** Record a mode and re-render the server tree in it. */
  setMode: (mode: ViewMode) => void;
  /** WebGL is missing or motion is off, so cosmic is not on offer whatever the cookie says. */
  cosmicUnavailable: boolean;
}

const Ctx = createContext<ViewModeValue | null>(null);

/**
 * Owns the view mode for the whole client tree.
 *
 * Two things it does that are easy to get wrong:
 *
 * 1. `setMode` writes the cookie and then calls `router.refresh()`. The mode changes which
 *    children the SERVER renders on the five section routes, so flipping local state alone
 *    would leave a classic navbar over a cosmic page until the next full navigation.
 *
 * 2. When nothing has been chosen and the browser cannot show the cosmos - no WebGL, or
 *    reduced motion - it ADOPTS classic rather than offering a link. Those visitors used
 *    to land on a scene overlay with no scene behind it (measured on /projects: two ring
 *    segments around a planet that is never drawn). The adoption writes the cookie, so it
 *    happens once per visitor and every later request is server-rendered correctly.
 */
export function ViewModeProvider({
  children,
  initialMode = DEFAULT_VIEW_MODE,
  initiallyChosen = false,
}: {
  children: React.ReactNode;
  initialMode?: ViewMode;
  initiallyChosen?: boolean;
}) {
  const router = useRouter();
  const webgl = useWebGLAvailable();
  const motionDisabled = useMotionDisabled();
  const [mode, setModeState] = useState<ViewMode>(initialMode);
  const [chosen, setChosen] = useState(initiallyChosen);
  // Adoption must fire at most once even though its inputs (the reduced-motion media
  // query, the accessibility widget's class) can change again later.
  const adopted = useRef(false);

  const record = useCallback(
    (next: ViewMode) => {
      try {
        document.cookie = viewModeCookie(next);
        localStorage.setItem(VIEW_MODE_COOKIE, next);
      } catch {
        /* private mode - the in-memory mode below still applies for this page */
      }
      setModeState(next);
      setChosen(true);
      router.refresh();
    },
    [router]
  );

  const cosmicUnavailable = !webgl || motionDisabled;

  useEffect(() => {
    if (chosen || adopted.current || !cosmicUnavailable) return;
    adopted.current = true;
    record('classic');
  }, [chosen, cosmicUnavailable, record]);

  // A cookie set in another tab, or a stale prerender, should not win over storage the
  // visitor last wrote. Cookie first; storage only fills a gap.
  useEffect(() => {
    if (initiallyChosen) return;
    const stored = parseViewMode(localStorage.getItem(VIEW_MODE_COOKIE));
    if (stored && stored !== mode) record(stored);
    // Runs once on mount: a later change comes through setMode, which already re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<ViewModeValue>(
    () => ({ mode, chosen, setMode: record, cosmicUnavailable }),
    [mode, chosen, record, cosmicUnavailable]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useViewMode(): ViewModeValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useViewMode must be used inside ViewModeProvider');
  return v;
}
