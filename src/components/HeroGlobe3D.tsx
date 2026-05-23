'use client';

/**
 * HeroGlobe3D — slowly rotating globe behind the home-page hero.
 *
 * Background-layer only: pointer-events disabled so the search wizard /
 * stats / CTA stay fully interactive. The canvas sits absolutely behind
 * the hero content (z-0 vs hero content at z-1).
 *
 * Visual brief: calm + premium. Wireframe icosphere in muted blue at low
 * opacity, six glowing dots at the same cities as the quick-pill row
 * (Barcelona / Dubai / Tenerife / Palma / Antalya / London). Slow
 * auto-rotate so the eye catches motion without distraction.
 *
 * Mobile is hidden via parent `hidden md:block` — globe paint cost on
 * slow mobile devices isn't worth the visual delta in a 480px-tall hero.
 */

import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';

const GLOBE_RADIUS = 1.6;
const DOT_RADIUS = 0.035;

const DESTINATIONS: { name: string; lat: number; lng: number }[] = [
  { name: 'London', lat: 51.51, lng: -0.13 },
  { name: 'Barcelona', lat: 41.39, lng: 2.17 },
  { name: 'Dubai', lat: 25.2, lng: 55.27 },
  { name: 'Tenerife', lat: 28.29, lng: -16.62 },
  { name: 'Palma', lat: 39.57, lng: 2.65 },
  { name: 'Antalya', lat: 36.9, lng: 30.71 },
];

/* ─────────────────────────── Lat/lng → 3D vector ─────────────────────── */

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/* ─────────────────────────── Globe + markers group ───────────────────── */

function Globe() {
  const groupRef = useRef<THREE.Group>(null);

  const markers = useMemo(
    () =>
      DESTINATIONS.map((d) => ({
        ...d,
        pos: latLngToVec3(d.lat, d.lng, GLOBE_RADIUS + 0.01),
      })),
    [],
  );

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    // Very slow Y-axis spin — eye registers motion, doesn't get distracted.
    groupRef.current.rotation.y += delta * 0.08;
  });

  return (
    <group ref={groupRef}>
      {/* Wireframe icosphere — the "globe" silhouette */}
      <mesh>
        <icosahedronGeometry args={[GLOBE_RADIUS, 3]} />
        <meshBasicMaterial
          color={0x6aa9ff}
          wireframe
          transparent
          opacity={0.28}
        />
      </mesh>

      {/* Filled inner sphere — soft translucent fill gives the globe weight */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS * 0.99, 32, 32]} />
        <meshBasicMaterial
          color={0x0a1f44}
          transparent
          opacity={0.55}
        />
      </mesh>

      {/* Destination markers — small emissive dots at lat/lng */}
      {markers.map((m) => (
        <mesh key={m.name} position={m.pos.toArray()}>
          <sphereGeometry args={[DOT_RADIUS, 12, 12]} />
          <meshBasicMaterial color={0xffb066} transparent opacity={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/* ─────────────────────────── Public component ─────────────────────────── */

export default function HeroGlobe3D() {
  return (
    <div
      // Absolutely positioned background layer. Pointer events off so the
      // hero search wizard / stats / pills stay fully clickable.
      className="absolute inset-0 pointer-events-none hidden md:block"
      aria-hidden
    >
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 5], fov: 35, near: 0.1, far: 100 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 3, 5]} intensity={0.8} />
        <Suspense fallback={null}>
          <Globe />
        </Suspense>
      </Canvas>
    </div>
  );
}
