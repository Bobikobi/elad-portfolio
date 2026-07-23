'use client';
import { useEffect, useState } from 'react';
import { useScene } from '@/lib/sceneStore';

/**
 * First-paint loader — a space-void screen with the signature orbit-ring, shown
 * until the WebGL scene has drawn a real frame (no black flash during init), with
 * a hard 3s ceiling so a slow GPU never holds the visitor hostage.
 */
export default function SceneLoader() {
  const ready = useScene((s) => s.sceneReady);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const ceiling = setTimeout(() => setHidden(true), 3000);
    return () => clearTimeout(ceiling);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setHidden(true), 450);
    return () => clearTimeout(t);
  }, [ready]);

  if (hidden) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-500"
      style={{ background: '#050714', opacity: ready ? 0 : 1, pointerEvents: ready ? 'none' : 'auto' }}
      aria-hidden="true"
    >
      <span className="scene-loader-ring" />
    </div>
  );
}
