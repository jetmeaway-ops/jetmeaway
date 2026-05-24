'use client';

/**
 * HeroGlobe3D — Earth behind the home hero that matches the VISITOR'S local
 * time of day: daytime Blue Marble while it's daytime on their clock, glowing
 * night city-lights after sunset.
 *
 * Background-layer only: pointer-events disabled so the search wizard / stats
 * / CTA stay fully interactive. Canvas sits absolutely behind the hero content
 * (hero content is z-[1]).
 *
 * Textures are NASA Blue Marble (day) + Earth-at-night city lights (night),
 * public domain, optimised to 2K WebP in /public/textures. Only the relevant
 * one is downloaded — we pick from the local hour at mount, so a daytime
 * visitor never fetches the night texture and vice-versa. Faint blue
 * atmosphere rim, Earth-like axial tilt, slow auto-rotate, six quick-pill
 * cities as warm markers.
 *
 * (A real-time day/night-terminator variant is kept at
 * HeroGlobe3D.daynight.tsx.bak.)
 *
 * Shown on mobile too. Kept cheap by the load-on-engagement gate (loader),
 * a capped device-pixel-ratio, the small texture, and the WebGL error
 * boundary so weak GPUs that fail just fall back to the plain hero.
 */

import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';

const GLOBE_RADIUS = 1.6;
const CITY_DOT_RADIUS = 0.028;
const AXIAL_TILT = 0.41; // ~23.4°

const DESTINATIONS: { name: string; lat: number; lng: number }[] = [
  { name: 'London', lat: 51.51, lng: -0.13 },
  { name: 'Barcelona', lat: 41.39, lng: 2.17 },
  { name: 'Dubai', lat: 25.2, lng: 55.27 },
  { name: 'Tenerife', lat: 28.29, lng: -16.62 },
  { name: 'Palma', lat: 39.57, lng: 2.65 },
  { name: 'Antalya', lat: 36.9, lng: 30.71 },
];

/** Daytime if the visitor's local clock is roughly 7am–7pm. */
function isLocalDaytime(): boolean {
  const h = new Date().getHours();
  return h >= 7 && h < 19;
}

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/* ─────────────────────────── Atmosphere shader ───────────────────────── */

const atmosphereVertex = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragment = /* glsl */ `
  uniform float uStrength;
  varying vec3 vNormal;
  void main() {
    float rim = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 3.0);
    gl_FragColor = vec4(vec3(0.30, 0.55, 1.0) * rim, rim * uStrength);
  }
`;

/* ─────────────────────────── Globe group ─────────────────────────────── */

function Globe({ day }: { day: boolean }) {
  const spinRef = useRef<THREE.Group>(null);

  const tex = useLoader(
    THREE.TextureLoader,
    day ? '/textures/earth-day.webp' : '/textures/earth-night.webp',
  );
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
  }, [tex]);

  const atmosUniforms = useMemo(
    () => ({ uStrength: { value: day ? 0.9 : 0.55 } }),
    [day],
  );

  const markers = useMemo(
    () =>
      DESTINATIONS.map((d) => ({
        ...d,
        pos: latLngToVec3(d.lat, d.lng, GLOBE_RADIUS + 0.012).toArray(),
      })),
    [],
  );

  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.06;
  });

  return (
    <group rotation={[0, 0, AXIAL_TILT]}>
      {/* Day needs lighting for dimension; night is self-lit city lights. */}
      {day && (
        <>
          <ambientLight intensity={1.15} />
          <directionalLight position={[3, 1.5, 4]} intensity={0.9} />
        </>
      )}

      <group ref={spinRef}>
        <mesh>
          <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
          {day ? (
            <meshStandardMaterial
              map={tex}
              roughness={1}
              metalness={0}
              emissiveMap={tex}
              emissive={0xffffff}
              emissiveIntensity={0.18}
            />
          ) : (
            // Unlit so the city lights glow at full brightness on the dark
            // oceans, regardless of scene lighting.
            <meshBasicMaterial map={tex} />
          )}
        </mesh>

        {/* Destination markers — warm pins for the brand cities */}
        {markers.map((m) => (
          <mesh key={m.name} position={m.pos as [number, number, number]}>
            <sphereGeometry args={[CITY_DOT_RADIUS, 12, 12]} />
            <meshBasicMaterial color={0xffd27a} transparent opacity={0.95} />
          </mesh>
        ))}
      </group>

      {/* Atmosphere rim */}
      <mesh scale={1.045}>
        <sphereGeometry args={[GLOBE_RADIUS, 48, 48]} />
        <shaderMaterial
          vertexShader={atmosphereVertex}
          fragmentShader={atmosphereFragment}
          uniforms={atmosUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ─────────────────────────── Public component ─────────────────────────── */

export default function HeroGlobe3D() {
  // Decided once at mount from the visitor's clock.
  const day = useMemo(() => isLocalDaytime(), []);

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden
    >
      <Canvas
        dpr={[1, 1.25]}
        camera={{ position: [0, 0, 5], fov: 35, near: 0.1, far: 100 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Globe day={day} />
        </Suspense>
      </Canvas>
    </div>
  );
}
