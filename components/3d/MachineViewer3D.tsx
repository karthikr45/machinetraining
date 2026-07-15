'use client';

import * as React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Group } from 'three';

const HIGHLIGHT = '#F97316';

function material(active: string | null, id: string, base: string) {
  const on = active === id;
  return {
    color: on ? HIGHLIGHT : base,
    emissive: on ? HIGHLIGHT : '#000000',
    emissiveIntensity: on ? 0.45 : 0,
    metalness: 0.35,
    roughness: 0.5,
  };
}

/** A stylised rotary tablet press built from primitive meshes. */
function TabletPress({ active }: { active: string | null }) {
  const group = React.useRef<Group>(null);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.3;
  });

  return (
    <group ref={group} position={[0, -0.2, 0]}>
      {/* Base */}
      <mesh position={[0, -1.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.6, 3]} />
        <meshStandardMaterial {...material(active, 'base', '#94A3B8')} />
      </mesh>

      {/* Support columns */}
      {(
        [
          [1, -0.6, 1],
          [-1, -0.6, 1],
          [1, -0.6, -1],
          [-1, -0.6, -1],
        ] as [number, number, number][]
      ).map((pos, i) => (
        <mesh key={i} position={pos} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 2.4, 20]} />
          <meshStandardMaterial color="#64748B" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}

      {/* Turret table */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[1.15, 1.15, 0.55, 40]} />
        <meshStandardMaterial {...material(active, 'turret', '#0066CC')} />
      </mesh>

      {/* Compression zone — ring of rollers around the turret */}
      <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.3, 0.12, 16, 48]} />
        <meshStandardMaterial {...material(active, 'compression', '#0D9488')} />
      </mesh>
      {(
        [
          [1.3, 0.5, 0],
          [-1.3, 0.5, 0],
        ] as [number, number, number][]
      ).map((pos, i) => (
        <mesh key={i} position={pos}>
          <cylinderGeometry args={[0.22, 0.22, 0.5, 24]} />
          <meshStandardMaterial {...material(active, 'compression', '#0D9488')} />
        </mesh>
      ))}

      {/* Neck between turret and hopper */}
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 0.6, 24]} />
        <meshStandardMaterial color="#CBD5E1" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Hopper — inverted cone funnel */}
      <mesh position={[0, 1.9, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[0.95, 1.3, 32, 1, true]} />
        <meshStandardMaterial {...material(active, 'hopper', '#7C3AED')} side={2} />
      </mesh>

      {/* Control panel on a stand */}
      <mesh position={[2.1, -0.9, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 1.6, 16]} />
        <meshStandardMaterial color="#64748B" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[2.1, 0.1, 0]} rotation={[0, -0.5, 0]}>
        <boxGeometry args={[0.9, 1.2, 0.14]} />
        <meshStandardMaterial {...material(active, 'control', '#1E293B')} />
      </mesh>
      <mesh position={[2.16, 0.1, 0]} rotation={[0, -0.5, 0]}>
        <boxGeometry args={[0.72, 0.9, 0.02]} />
        <meshStandardMaterial
          color={active === 'control' ? HIGHLIGHT : '#38BDF8'}
          emissive={active === 'control' ? HIGHLIGHT : '#0EA5E9'}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

export default function MachineViewer3D({ activeHotspot = null }: { activeHotspot?: string | null }) {
  return (
    <Canvas
      shadows
      camera={{ position: [4.5, 2.5, 5.5], fov: 45 }}
      dpr={[1, 2]}
      className="rounded-xl"
    >
      <color attach="background" args={['#0F172A']} />
      <ambientLight intensity={0.55} />
      <hemisphereLight intensity={0.4} groundColor="#1E293B" />
      <directionalLight position={[6, 9, 5]} intensity={1.1} castShadow />
      <pointLight position={[-6, 3, -4]} intensity={0.6} />
      <TabletPress active={activeHotspot} />
      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={12}
        maxPolarAngle={Math.PI / 1.9}
      />
    </Canvas>
  );
}
