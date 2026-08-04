'use client';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useViewMode } from '@/lib/viewModeContext';
import { useScene } from '@/lib/sceneStore';
import { sectionForPath } from '@/lib/sections';
import { captureEntryRoute } from '@/lib/entryRoute';
import SceneBoundary from '@/components/scene/SceneBoundary';
import SceneLoader from '@/components/scene/SceneLoader';

// The WebGL scene is client-only — never server-rendered.
const SceneRoot = dynamic(() => import('@/components/scene/SceneRoot'), { ssr: false });

const GALAXY_POSTER = '/images/galaxy/poster.webp';

/**
 * The single, PERSISTENT WebGL canvas — mounted once in the root layout so it
 * survives client-side route transitions (navigating /about → /projects flies the
 * camera without ever tearing down the GL context). Also the route→camera bridge:
 * a section route focuses its planet in the solar act; home clears the focus and
 * lets the dive driver own the galaxy. Classic view (which reduced-motion and no-WebGL
 * visitors are moved into automatically, F2) → renders nothing, and the three.js chunk
 * is never requested because this returns before the dynamic import is reached.
 */
export default function CosmicStage() {
  const pathname = usePathname();
  // One decision, made once, in ViewModeProvider. This used to re-derive it from the two
  // capability hooks, which meant the canvas and the layout each answered "is this
  // immersive?" separately - and the layout's answer was route-aware while this one was
  // not, so a classic route could still be paying for a mounted scene.
  const { mode } = useViewMode();
  const immersive = mode === 'cosmic';

  // Bridge: URL is the source of truth for which world the camera is in.
  useEffect(() => {
    // First run of this effect in this document = the route it was opened at (B11). Only
    // the first call counts; every later navigation is a no-op.
    captureEntryRoute(pathname);
    const scene = useScene.getState();
    const section = sectionForPath(pathname);
    if (section) {
      scene.setAct('solar');
      scene.setFocusedPlanet(section.focus);
    } else {
      // Home route: just clear the focus. GalaxyHome owns the act decision (fresh
      // load → galaxy dive; in-session return → solar overview).
      scene.setFocusedPlanet(null);
    }
  }, [pathname]);

  if (!immersive) return null;

  return (
    <>
      <SceneBoundary poster={GALAXY_POSTER}>
        <SceneRoot />
      </SceneBoundary>
      <SceneLoader />
    </>
  );
}
