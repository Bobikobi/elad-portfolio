'use client';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useMotionDisabled } from '@/hooks/useMotionDisabled';
import { useWebGLAvailable } from '@/hooks/useWebGLAvailable';
import { useScene } from '@/lib/sceneStore';
import { sectionForPath } from '@/lib/sections';
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
 * lets the dive driver own the galaxy. Reduced-motion / no-WebGL → renders nothing
 * (every route's content is real DOM, so the site stays fully usable).
 */
export default function CosmicStage() {
  const pathname = usePathname();
  const webgl = useWebGLAvailable();
  const motionDisabled = useMotionDisabled();
  const immersive = webgl && !motionDisabled;

  // Bridge: URL is the source of truth for which world the camera is in.
  useEffect(() => {
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
