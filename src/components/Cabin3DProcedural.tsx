'use client';

import { Canvas } from '@react-three/fiber';
import { Bounds, OrbitControls, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { Seat3DPosition } from '@/lib/cabin3d-mapping';
import { SHELL_METRICS } from '@/lib/cabin3d-mapping';
import type { SeatTier } from './SeatMapModal';

/* ─────────────────────────── Seat geometry constants ────────────────────
   cabin-seat-instance.glb: bbox X[-0.71,-0.27] Y[0.99,1.78] Z[-0.67,0.04].
   To place a seat's bbox bottom-centre at the transform origin, shift the
   cloned mesh by (+0.49, -0.99, +0.315).
   ───────────────────────────────────────────────────────────────────────── */

const SEAT_ORIGIN_OFFSET: [number, number, number] = [0.49, -0.99, 0.315];

/* ─────────────────────────── Materials per state ────────────────────────
   Memoised once at module level — Three.js reuses materials across meshes
   so 200 seats with the same state share one GPU upload.
   ───────────────────────────────────────────────────────────────────────── */

function makeSeatMaterial(color: number, opacity = 1, emissive = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: emissive ? 0.4 : 0,
    transparent: opacity < 1,
    opacity,
    roughness: 0.5,
    metalness: 0.1,
  });
}

const MATERIALS = {
  // Unavailable: muted grey, dim
  unavailable: makeSeatMaterial(0x4a5060, 0.65),
  // Available + standard: clean off-white
  standard: makeSeatMaterial(0xe8ecf4),
  // Available + extra legroom: champagne gold
  extra_legroom: makeSeatMaterial(0xd4b77b),
  // Available + preferred: sky blue
  preferred: makeSeatMaterial(0x7cb6e8),
  // Available + emergency exit: amber
  emergency_exit: makeSeatMaterial(0xeab958),
  // Selected: emerald, slight glow
  selected: makeSeatMaterial(0x10b981, 1, 0x10b981),
  // Hovered: white-blue glow
  hovered: makeSeatMaterial(0x60a5fa, 1, 0x60a5fa),
} as const;

function pickMaterial(opts: {
  available: boolean;
  tier: SeatTier;
  selected: boolean;
  hovered: boolean;
}): THREE.MeshStandardMaterial {
  if (opts.hovered && opts.available) return MATERIALS.hovered;
  if (opts.selected) return MATERIALS.selected;
  if (!opts.available) return MATERIALS.unavailable;
  return MATERIALS[opts.tier] ?? MATERIALS.standard;
}

/* ─────────────────────────── Shell (glass fuselage) ───────────────────── */

function Shell() {
  const { scene } = useGLTF('/3d/cabin-shell.glb');

  useEffect(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const glass = new THREE.MeshPhysicalMaterial({
        color: 0xaadcff,
        transparent: true,
        opacity: 0.12,
        roughness: 0.08,
        metalness: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const old = m.material;
      if (Array.isArray(old)) old.forEach((mat) => mat.dispose());
      else old.dispose();
      m.material = glass;
      m.renderOrder = 1;
    });
  }, [scene]);

  return <primitive object={scene} />;
}

/* ─────────────────────────── Single interactive seat ──────────────────── */

type SeatNodeProps = {
  seat: Seat3DPosition;
  selected: boolean;
  onSelect: (designator: string) => void;
};

function SeatNode({ seat, selected, onSelect }: SeatNodeProps) {
  const { scene: seatScene } = useGLTF('/3d/cabin-seat-instance.glb');
  const [hovered, setHovered] = useState(false);

  // Each seat needs its own deep clone so we can swap material per-instance
  // without affecting siblings. scene.clone(true) shares geometry but
  // duplicates the node hierarchy + lets us assign per-clone material.
  const clone = useMemo(() => seatScene.clone(true), [seatScene]);

  // Apply state-driven material on every state change
  useEffect(() => {
    const mat = pickMaterial({
      available: seat.available,
      tier: seat.tier,
      selected,
      hovered,
    });
    clone.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.material = mat;
    });
  }, [clone, seat.available, seat.tier, selected, hovered]);

  const interactive = seat.available || selected;

  return (
    <group
      position={[seat.x, SHELL_METRICS.floorY, seat.z]}
      onPointerOver={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = '';
      }}
      onClick={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        onSelect(seat.designator);
      }}
    >
      <primitive object={clone} position={SEAT_ORIGIN_OFFSET} />
    </group>
  );
}

/* ─────────────────────────── Seats container ──────────────────────────── */

type SeatsProps = {
  seats: Seat3DPosition[];
  selectedDesignator: string | null;
  onSeatClick: (designator: string) => void;
};

function Seats({ seats, selectedDesignator, onSeatClick }: SeatsProps) {
  return (
    <group>
      {seats.map((seat) => (
        <SeatNode
          key={seat.designator}
          seat={seat}
          selected={selectedDesignator === seat.designator}
          onSelect={onSeatClick}
        />
      ))}
    </group>
  );
}

/* ─────────────────────────── Public component ─────────────────────────── */

type Cabin3DProceduralProps = {
  seats: Seat3DPosition[];
  selectedDesignator: string | null;
  onSeatClick: (designator: string) => void;
  className?: string;
  autoRotate?: boolean;
  enableControls?: boolean;
  background?: string;
  cameraPosition?: [number, number, number];
  fov?: number;
  boundsMargin?: number;
};

export default function Cabin3DProcedural({
  seats,
  selectedDesignator,
  onSeatClick,
  className = '',
  autoRotate = false,
  enableControls = true,
  background = '#0a0d14',
  cameraPosition = [0, 4, 14],
  fov = 22,
  boundsMargin = 0.55,
}: Cabin3DProceduralProps) {
  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: cameraPosition, fov, near: 0.1, far: 200 }}
      >
        <color attach="background" args={[background]} />
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={1.1} />
        <directionalLight position={[-10, -5, -5]} intensity={0.3} />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={boundsMargin}>
            <Shell />
            <Seats
              seats={seats}
              selectedDesignator={selectedDesignator}
              onSeatClick={onSeatClick}
            />
          </Bounds>
        </Suspense>
        <OrbitControls
          makeDefault
          enableDamping
          enabled={enableControls}
          autoRotate={autoRotate}
          autoRotateSpeed={0.6}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload('/3d/cabin-shell.glb');
useGLTF.preload('/3d/cabin-seat-instance.glb');
