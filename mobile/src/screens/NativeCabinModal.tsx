/**
 * NativeCabinModal — Phase 1: pipeline smoke test.
 *
 * Renders a rotating cube via expo-gl + @react-three/fiber/native to verify
 * the 3D stack boots in the mobile app. Cabin .glb porting happens in
 * Phase 2 once we've confirmed the pipeline runs end-to-end on a real
 * iPhone via TestFlight (Build 32+).
 */

import { Suspense, useRef } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import type { Mesh } from 'three';

type NativeCabinModalProps = {
  visible: boolean;
  onClose: () => void;
};

function SpinningCube() {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * 0.4;
    ref.current.rotation.y += delta * 0.6;
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#10b981" />
    </mesh>
  );
}

export default function NativeCabinModal({
  visible,
  onClose,
}: NativeCabinModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Cabin 3D (preview)</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.canvasWrap}>
          <Canvas
            camera={{ position: [3, 3, 5], fov: 45 }}
            style={styles.canvas}
          >
            <color attach="background" args={['#0a0d14']} />
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 5, 5]} intensity={1.2} />
            <Suspense fallback={null}>
              <SpinningCube />
            </Suspense>
          </Canvas>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Phase 1 pipeline test. Cabin .glb port lands next build.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0d14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
  },
  closeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  canvasWrap: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
  footer: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
});
