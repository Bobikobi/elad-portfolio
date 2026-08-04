'use client';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useViewMode } from '@/lib/viewModeContext';
import { useScene } from '@/lib/sceneStore';
import { isImmersiveRoute, sectionForPath } from '@/lib/sections';
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
  // TWO conditions, and both are load-bearing. The mode is the visitor's (already demoted
  // by the provider if the browser cannot honour it) and the route decides whether this
  // page is a scene at all. Dropping the route half is what put the galaxy behind the
  // privacy policy and left every guide and legal page paying for a running canvas.
  const { mode } = useViewMode();
  // The canvas belongs to home and the five worlds and to nowhere else. It used to mount
  // on every route in cosmic mode, so a guide, a service detail page or a legal page each
  // pulled the whole three.js bundle and blocked the main thread to show a paragraph -
  // measured at 2011KB of JS on /privacy against 750KB now.
  const immersive = mode === 'cosmic' && isImmersiveRoute(pathname);

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
