'use client';

import { Canvas } from '@react-three/fiber';
import { Bounds, OrbitControls, useGLTF } from '@react-three/drei';
import { Suspense, useEffect } from 'react';
import * as THREE from 'three';

const SHELL_NAME_RE = /^(cabin|shell|fuselage|body)$/i;

function CabinModel() {
  const { scene } = useGLTF('/3d/cabin-interior.glb');

  useEffect(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (!SHELL_NAME_RE.test(m.name)) return;
      const glass = new THREE.MeshPhysicalMaterial({
        color: 0xaadcff,
        transparent: true,
        opacity: 0.15,
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

type Cabin3DProps = {
  className?: string;
  autoRotate?: boolean;
  enableControls?: boolean;
  background?: string;
  cameraPosition?: [number, number, number];
  fov?: number;
  boundsMargin?: number;
};

export default function Cabin3D({
  className = '',
  autoRotate = false,
  enableControls = true,
  background = '#0a0d14',
  cameraPosition = [8, 4, 12],
  fov = 50,
  boundsMargin = 1.2,
}: Cabin3DProps) {
  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: cameraPosition, fov, near: 0.1, far: 200 }}
      >
        <color attach="background" args={[background]} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />
        <directionalLight position={[-10, -5, -5]} intensity={0.3} />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={boundsMargin}>
            <CabinModel />
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

useGLTF.preload('/3d/cabin-interior.glb');
