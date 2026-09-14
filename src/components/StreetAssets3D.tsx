import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

type Vec3 = [number, number, number];

export const StylizedTree3D = memo(function StylizedTree3D({ position, seed = 0, blossom = false, scale = 1, gameSpeed = 1 }: {
  position: Vec3; seed?: number; blossom?: boolean; scale?: number; gameSpeed?: number;
}) {
  const crown = useRef<THREE.Group>(null);
  const elapsed = useRef(seed * 1.8);
  useFrame((_, delta) => {
    elapsed.current += Math.min(delta, 0.1) * gameSpeed;
    if (crown.current) {
      crown.current.rotation.z = Math.sin(elapsed.current * 0.75) * 0.012;
      crown.current.rotation.x = Math.cos(elapsed.current * 0.6) * 0.009;
    }
  });
  const palette = blossom ? ['#b6657b', '#d893a2', '#edb4bc', '#e5a4b2']
    : seed % 3 === 0 ? ['#4e6945', '#6f8b50', '#9aaa68', '#829857']
    : ['#3e644c', '#58805a', '#90a96d', '#74965d'];
  const lobes: { position: Vec3; scale: Vec3; tone: number }[] = [
    { position: [0, 0.7, -0.2], scale: [1.2, 1.05, 1.05], tone: 0 },
    { position: [-0.85, 1.0, 0.05], scale: [0.95, 0.88, 0.9], tone: 1 },
    { position: [0.8, 1.25, -0.08], scale: [0.95, 1.0, 0.95], tone: 3 },
    { position: [0.05, 1.65, -0.3], scale: [1.0, 1.15, 0.9], tone: 1 },
    { position: [-0.35, 1.4, 0.72], scale: [0.85, 0.78, 0.72], tone: 3 },
    { position: [0.55, 1.9, 0.5], scale: [0.75, 0.75, 0.72], tone: 2 },
    { position: [-0.4, 2.35, -0.15], scale: [0.78, 0.7, 0.8], tone: 2 },
  ];
  return <group position={position} scale={[scale, scale * (0.95 + seed % 3 * 0.05), scale]}>
    <mesh position={[0, 1.45, 0]} castShadow><cylinderGeometry args={[0.13, 0.25, 2.9, 9]} /><meshStandardMaterial color="#75573d" roughness={1} /></mesh>
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * 0.28, 2.45, 0]} rotation={[0, 0, -side * 0.55]} castShadow><cylinderGeometry args={[0.07, 0.13, 1.15, 7]} /><meshStandardMaterial color="#75573d" roughness={1} /></mesh>
      <mesh position={[side * 0.18, 0.13, 0.1]} rotation={[0.3, 0, -side * 0.65]}><cylinderGeometry args={[0.11, 0.19, 0.45, 7]} /><meshStandardMaterial color="#75573d" roughness={1} /></mesh>
    </group>)}
    <group ref={crown} position={[0, 2.2, 0]} rotation={[0, seed * 0.63, 0]}>
      {lobes.map((lobe, i) => <mesh key={i} position={lobe.position} scale={lobe.scale} castShadow receiveShadow>
        <sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color={palette[lobe.tone]} roughness={0.95} />
      </mesh>)}
    </group>
  </group>;
});

const Wheel = memo(function Wheel({ position, speed, gameSpeed }: { position: Vec3; speed: number; gameSpeed: number }) {
  const wheel = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    // Angular distance is travel / tire radius, so wheels follow the vehicle speed.
    if (wheel.current) wheel.current.rotation.x += speed * 0.28 * Math.min(delta, 0.1) * gameSpeed / 0.42;
  });
  return <group ref={wheel} position={position}>
    <mesh rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.42, 0.42, 0.26, 20]} /><meshStandardMaterial color="#252b2d" roughness={0.95} /></mesh>
    <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.27, 0.27, 0.28, 16]} /><meshStandardMaterial color="#c6c9c4" metalness={0.45} roughness={0.35} /></mesh>
    {[0, Math.PI / 3, -Math.PI / 3].map(angle => <mesh key={angle} rotation={[angle, 0, 0]}><boxGeometry args={[0.29, 0.055, 0.43]} /><meshStandardMaterial color="#5e696b" metalness={0.35} roughness={0.5} /></mesh>)}
    <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.085, 0.085, 0.3, 12]} /><meshStandardMaterial color="#d7d8cf" metalness={0.5} roughness={0.35} /></mesh>
  </group>;
});

export const RoundedCarBody3D = memo(function RoundedCarBody3D({ color, isTaxi = false, isNight, speed, gameSpeed }: {
  color: string; isTaxi?: boolean; isNight: boolean; speed: number; gameSpeed: number;
}) {
  const paint = useMemo(() => new THREE.Color(isTaxi ? '#d9ad4c' : color).lerp(new THREE.Color('#82837d'), 0.18), [color, isTaxi]);
  const wagon = speed % 3 === 0 && !isTaxi;
  const roof = isTaxi || wagon ? paint : '#e6dfcf';
  return <group>
    <mesh position={[0, 0.048, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.3, 2.2, 1]}>
      <circleGeometry args={[1, 24]} /><meshBasicMaterial color="#101c20" transparent opacity={0.16} depthWrite={false} />
    </mesh>
    <RoundedBox args={[2.05, 0.26, 4.1]} radius={0.1} smoothness={2} bevelSegments={2} position={[0, 0.66, 0]} castShadow>
      <meshStandardMaterial color="#384443" roughness={0.7} />
    </RoundedBox>
    <RoundedBox args={[2.14, 0.72, 4.35]} radius={0.22} smoothness={2} bevelSegments={2} position={[0, 1.04, 0]} castShadow receiveShadow>
      <meshStandardMaterial color={paint} metalness={0.18} roughness={0.32} />
    </RoundedBox>
    {/* A single glazed cabin is capped by a contrasting roof and narrow pillars. */}
    <RoundedBox args={[1.78, 0.74, wagon ? 2.7 : 2.25]} radius={0.2} smoothness={2} bevelSegments={2} position={[0, 1.66, wagon ? -0.4 : -0.25]} castShadow>
      <meshStandardMaterial color="#557880" metalness={0.25} roughness={0.22} />
    </RoundedBox>
    <RoundedBox args={[1.81, 0.16, wagon ? 2.55 : 2.08]} radius={0.07} smoothness={2} bevelSegments={2} position={[0, 2.02, wagon ? -0.4 : -0.25]} castShadow>
      <meshStandardMaterial color={roof} metalness={0.12} roughness={0.35} />
    </RoundedBox>
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[side * 0.9, 1.66, -0.35]}><boxGeometry args={[0.035, 0.61, 0.12]} /><meshStandardMaterial color={paint} roughness={0.4} /></mesh>
      <mesh position={[side * 1.071, 1.07, -0.55]}><boxGeometry args={[0.028, 0.055, 0.26]} /><meshStandardMaterial color="#e1dbca" metalness={0.4} roughness={0.4} /></mesh>
      <mesh position={[side * 1.02, 1.48, 0.62]} scale={[1, 0.6, 1.1]} castShadow><sphereGeometry args={[0.13, 10, 8]} /><meshStandardMaterial color={paint} roughness={0.4} /></mesh>
      <RoundedBox args={[0.42, 0.22, 0.13]} radius={0.06} smoothness={2} bevelSegments={1} position={[side * 0.69, 1.1, 2.13]}>
        <meshStandardMaterial color="#fff1cd" emissive="#ffe1a2" emissiveIntensity={isNight ? 2 : 0.15} roughness={0.35} />
      </RoundedBox>
      <mesh position={[side * 0.72, 1.08, -2.145]}><boxGeometry args={[0.35, 0.16, 0.08]} /><meshStandardMaterial color="#ac4240" emissive="#ed4d39" emissiveIntensity={isNight ? 1.2 : 0.1} /></mesh>
      {[-1.3, 1.3].map(z => <Wheel key={z} position={[side * 1.05, 0.44, z]} speed={speed} gameSpeed={gameSpeed} />)}
      {isTaxi && <mesh position={[side * 1.074, 1.12, 0.2]}><boxGeometry args={[0.025, 0.14, 1.0]} /><meshStandardMaterial color="#39413d" /></mesh>}
    </group>)}
    <mesh position={[0, 0.91, 2.18]}><boxGeometry args={[0.65, 0.16, 0.035]} /><meshStandardMaterial color="#344445" roughness={0.6} /></mesh>
    {[-1, 1].map(end => <group key={end}>
      <mesh position={[0, 0.78, end * 2.12]}><boxGeometry args={[1.65, 0.1, 0.16]} /><meshStandardMaterial color="#d2d5ca" metalness={0.35} roughness={0.45} /></mesh>
      <mesh position={[0, 0.77, end * 2.21]}><boxGeometry args={[0.35, 0.13, 0.025]} /><meshStandardMaterial color="#eee9d5" /></mesh>
    </group>)}
    {isTaxi && <RoundedBox args={[0.7, 0.23, 0.35]} radius={0.05} smoothness={2} bevelSegments={1} position={[0, 2.2, -0.2]}>
      <meshStandardMaterial color="#fff1c6" emissive="#ffd378" emissiveIntensity={isNight ? 1 : 0.1} />
    </RoundedBox>}
    {wagon && [-0.64, 0.64].map(x => <mesh key={x} position={[x, 2.16, -0.4]}><boxGeometry args={[0.045, 0.08, 1.95]} /><meshStandardMaterial color="#c0c7c2" metalness={0.5} roughness={0.4} /></mesh>)}
  </group>;
});
