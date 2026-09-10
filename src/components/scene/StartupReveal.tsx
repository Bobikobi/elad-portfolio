'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Mount now, draw later. Children construct and subscribe to the scene clock immediately,
 * preserving their exact animation phase, while first GPU upload/draw is spread over frames.
 */
export default function StartupReveal({
  after,
  children,
}: {
  after: number;
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const frame = useRef(0);

  useFrame(() => {
    frame.current += 1;
    if (group.current) group.current.visible = frame.current > after;
  }, -1);

  // Start visible so the existing first-frame gl.compile traversal still sees every material.
  // The frame subscriber runs before Effects draws and hides stages that are not due yet.
  return <group ref={group}>{children}</group>;
}
