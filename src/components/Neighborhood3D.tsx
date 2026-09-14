import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { StylizedTree3D } from './StreetAssets3D';
import { PedestrianCrowd3D } from './PedestrianCrowd3D';

type Vec3 = [number, number, number];
type Block = { position: Vec3; size: Vec3; color: string };

// Repeated windows, pavers and trim share one geometry/material and draw call.
const Blocks = memo(function Blocks({ items, glow = false }: { items: Block[]; glow?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const transform = new THREE.Object3D();
    const color = new THREE.Color();
    items.forEach((item, i) => {
      transform.position.set(...item.position);
      transform.scale.set(...item.size);
      transform.updateMatrix();
      mesh.setMatrixAt(i, transform.matrix);
      mesh.setColorAt(i, color.set(item.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return <instancedMesh ref={ref} args={[undefined, undefined, items.length]} receiveShadow>
    <boxGeometry />
    <meshStandardMaterial roughness={glow ? 0.45 : 0.85} emissive={glow ? '#ffe0a3' : '#000000'} emissiveIntensity={glow ? 0.25 : 0} />
  </instancedMesh>;
});

const FACADES = ['#b8755b', '#d4bd94', '#819b98', '#cfac91', '#8e949f', '#a29b73'];
const SHOP_COLORS = ['#355d51', '#8e4c49', '#354d65', '#a77943', '#526957', '#66586f'];
const SHOP_NAMES = ['CORNER BOOKS', 'PETAL & STEM', 'DAILY MARKET', 'GOLDEN CRUST', 'RECORD ROOM', 'ATELIER', 'THE ROASTERY', 'CITY CYCLES'];

const ShopBuilding = memo(function ShopBuilding({ position, rotation, seed, isNight }: {
  position: Vec3; rotation: number; seed: number; isNight: boolean;
}) {
  const floors = 2 + seed % 3;
  const height = 4.5 + floors * 3.5;
  const facade = FACADES[seed % FACADES.length];
  const shop = SHOP_COLORS[seed % SHOP_COLORS.length];
  const details = useMemo(() => {
    const trim: Block[] = [];
    const windows: Block[] = [];
    for (let floor = 0; floor < floors; floor++) {
      const y = 6.2 + floor * 3.5;
      trim.push({ position: [0, y - 1.5, 6.08], size: [14.1, 0.13, 0.22], color: '#dfd6c4' });
      for (let column = 0; column < 4; column++) {
        const x = -5.1 + column * 3.4;
        trim.push({ position: [x, y, 6.05], size: [2.1, 2.65, 0.15], color: '#e9dfce' });
        trim.push({ position: [x, y - 1.35, 6.2], size: [2.3, 0.14, 0.42], color: '#e9dfce' });
        windows.push({ position: [x, y, 6.15], size: [1.75, 2.25, 0.08], color: isNight && (seed + floor * 3 + column) % 3 !== 0 ? '#e6bd7b' : '#354e59' });
        trim.push({ position: [x, y, 6.22], size: [0.07, 2.25, 0.06], color: '#c5c3b7' });
        trim.push({ position: [x, y, 6.22], size: [1.75, 0.08, 0.06], color: '#c5c3b7' });
        trim.push({ position: [x, y, -6.05], size: [2.05, 2.6, 0.12], color: '#d3c8b6' });
        windows.push({ position: [x, y, -6.14], size: [1.7, 2.2, 0.08], color: isNight && (seed + column + floor) % 4 === 0 ? '#d8b17a' : '#405963' });
        trim.push({ position: [x, y, -6.21], size: [0.07, 2.2, 0.05], color: '#d3c8b6' });
      }
      for (const side of [-1, 1]) for (const z of [-3.7, 0, 3.7]) {
        trim.push({ position: [side * 7.05, y, z], size: [0.12, 2.6, 2.05], color: '#d3c8b6' });
        windows.push({ position: [side * 7.14, y, z], size: [0.08, 2.2, 1.7], color: isNight && (seed + floor) % 3 === 0 ? '#e6bd7b' : '#405963' });
        trim.push({ position: [side * 7.21, y, z], size: [0.05, 2.2, 0.07], color: '#d3c8b6' });
      }
      if (seed % 3 === 0) for (const x of [-5.1, 5.1]) {
        trim.push({ position: [x, y - 1.35, 6.65], size: [2.5, 0.16, 1.2], color: '#d1c7b5' });
        trim.push({ position: [x, y - 0.55, 7.2], size: [2.5, 0.06, 0.06], color: '#384746' });
        for (let j = 0; j < 6; j++) trim.push({ position: [x - 1.2 + j * 0.48, y - 0.95, 7.2], size: [0.035, 0.8, 0.035], color: '#384746' });
      }
    }
    // Horizontal masonry courses break up the broad side walls, too.
    for (let y = 4.6; y < height; y += 0.85) {
      trim.push({ position: [0, y, 6.01], size: [14, 0.025, 0.025], color: '#ad9984' });
      for (const side of [-1, 1]) trim.push({ position: [side * 7.01, y, 0], size: [0.025, 0.025, 12], color: '#ad9984' });
    }
    for (const x of [-4.4, 4.4]) {
      trim.push({ position: [x, 1.9, 6.12], size: [4.6, 2.75, 0.18], color: '#e8dec9' });
      windows.push({ position: [x, 1.9, 6.24], size: [4.2, 2.4, 0.08], color: isNight ? '#cba978' : '#789a9f' });
    }
    for (let x = -6.2; x < 6.5; x += 1.1) {
      trim.push({ position: [x, 3.65, 7.25], size: [0.55, 0.32, 0.06], color: '#efe4cb' });
    }
    return { trim, windows };
  }, [floors, height, seed, isNight]);
  return <group position={position} rotation={[0, rotation, 0]}>
    <mesh position={[0, height / 2, 0]} castShadow receiveShadow><boxGeometry args={[14, height, 12]} /><meshStandardMaterial color={facade} roughness={0.95} /></mesh>
    <mesh position={[0, 2, 6.04]}><boxGeometry args={[14.15, 4, 0.12]} /><meshStandardMaterial color={shop} roughness={0.8} /></mesh>
    <Blocks items={details.trim} />
    <Blocks items={details.windows} glow={isNight} />
    <mesh position={[0, 1.55, 6.2]}><boxGeometry args={[1.65, 3.1, 0.18]} /><meshStandardMaterial color="#263b3d" /></mesh>
    <mesh position={[0.5, 1.4, 6.32]}><boxGeometry args={[0.07, 0.45, 0.05]} /><meshStandardMaterial color="#c6a86d" metalness={0.5} roughness={0.4} /></mesh>
    <mesh position={[0, 3.75, 6.5]} rotation={[0.15, 0, 0]} castShadow><boxGeometry args={[13.4, 0.18, 1.6]} /><meshStandardMaterial color={shop} roughness={0.9} /></mesh>
    <mesh position={[0, 4.25, 6.2]}><boxGeometry args={[11.8, 0.7, 0.25]} /><meshStandardMaterial color={shop} /></mesh>
    <Text position={[0, 4.25, 6.35]} fontSize={0.4} letterSpacing={0.08} color="#fff1d4" maxWidth={11}>{SHOP_NAMES[seed % SHOP_NAMES.length]}</Text>
    <mesh position={[0, height + 0.1, 0]} castShadow><boxGeometry args={[14.6, 0.4, 12.6]} /><meshStandardMaterial color="#e1d5bf" roughness={0.85} /></mesh>
    <mesh position={[0, height + 0.32, 0]}><boxGeometry args={[13.8, 0.06, 11.8]} /><meshStandardMaterial color="#536164" roughness={1} /></mesh>
    <mesh position={[-3, height + 0.75, -1]}><boxGeometry args={[2.4, 0.8, 1.7]} /><meshStandardMaterial color="#899493" roughness={0.65} /></mesh>
    {seed % 2 === 0 && <mesh position={[4, height + 1.2, -3]} castShadow><boxGeometry args={[0.9, 1.8, 0.9]} /><meshStandardMaterial color={facade} /></mesh>}
  </group>;
});

const StreetTree = memo(function StreetTree({ position, seed, gameSpeed }: { position: Vec3; seed: number; gameSpeed: number }) {
  return <group position={position}>
    <mesh position={[0, 0.1, 0]} receiveShadow><boxGeometry args={[2, 0.2, 2]} /><meshStandardMaterial color="#b6ad96" /></mesh>
    <mesh position={[0, 0.21, 0]}><boxGeometry args={[1.7, 0.04, 1.7]} /><meshStandardMaterial color="#554e35" roughness={1} /></mesh>
    <StylizedTree3D position={[0, 0.2, 0]} seed={seed} scale={0.92} gameSpeed={gameSpeed} />
  </group>;
});

const StreetBench = memo(function StreetBench({ position, rotation = 0 }: { position: Vec3; rotation?: number }) {
  return <group position={position} rotation={[0, rotation, 0]}>
    {[-0.8, 0.8].map(x => <mesh key={x} position={[x, 0.32, 0]} castShadow><boxGeometry args={[0.1, 0.6, 0.65]} /><meshStandardMaterial color="#344541" /></mesh>)}
    {[0, 1, 2].map(i => <group key={i}>
      <mesh position={[0, 0.64, -0.22 + i * 0.22]} castShadow><boxGeometry args={[2.2, 0.09, 0.18]} /><meshStandardMaterial color="#ae8056" roughness={0.9} /></mesh>
      <mesh position={[0, 0.88 + i * 0.17, -0.32]} castShadow><boxGeometry args={[2.2, 0.12, 0.08]} /><meshStandardMaterial color="#ae8056" roughness={0.9} /></mesh>
    </group>)}
  </group>;
});

const NeighborhoodLamp = memo(function NeighborhoodLamp({ position, isNight }: { position: Vec3; isNight: boolean }) {
  return <group position={position}>
    <mesh position={[0, 2.2, 0]} castShadow><cylinderGeometry args={[0.06, 0.11, 4.4, 8]} /><meshStandardMaterial color="#3c514b" roughness={0.65} /></mesh>
    <mesh position={[0, 4.45, 0]}><boxGeometry args={[0.6, 0.15, 0.6]} /><meshStandardMaterial color="#3c514b" /></mesh>
    <mesh position={[0, 4.2, 0]}><sphereGeometry args={[0.22, 10, 8]} /><meshStandardMaterial color="#f5e6c4" emissive="#ffd394" emissiveIntensity={isNight ? 1.8 : 0} /></mesh>
    {isNight && <pointLight position={[0, 4.1, 0]} color="#ffd394" intensity={18} distance={13} decay={2} />}
  </group>;
});

type Point = [number, number];
const INNER_ROUTE: Point[] = [[-17.4, 18], [17.4, 18], [17.4, -17.4], [-17.4, -17.4]];
const NORTH_ROUTE: Point[] = [[-16, -33.4], [16, -33.4], [16, -35], [-16, -35]];
const WEST_ROUTE: Point[] = [[-33.4, -16], [-33.4, 16], [-35, 16], [-35, -16]];
const EAST_ROUTE: Point[] = WEST_ROUTE.map(([x, z]) => [-x, z]);
const PARK_ROUTE: Point[] = [[-16, 34], [16, 34], [16, 38], [-16, 38]];
const ROUTES = [INNER_ROUTE, NORTH_ROUTE, WEST_ROUTE, EAST_ROUTE, PARK_ROUTE];
export const Neighborhood3D = memo(function Neighborhood3D({ isNight, gameSpeed }: { isNight: boolean; gameSpeed: number }) {
  const paving = useMemo(() => {
    const blocks: Block[] = [];
    const strip = (cx: number, cz: number, width: number, depth: number) => {
      for (let x = -width / 2 + 1; x < width / 2; x += 2) for (let z = -depth / 2 + 1; z < depth / 2; z += 2) {
        blocks.push({ position: [cx + x, 0.045, cz + z], size: [1.97, 0.08, 1.97], color: (Math.round(x + z) % 3 === 0) ? '#b1b2a7' : '#c7c5b6' });
      }
    };
    strip(0, 17, 30, 4); strip(0, -17, 30, 4);
    strip(-17, 0, 4, 38); strip(17, 0, 4, 38);
    for (const z of [-34, 34]) {
      strip(0, z, 38, 6); strip(-65, z, 68, 6); strip(65, z, 68, 6);
    }
    strip(-34, 0, 6, 38); strip(34, 0, 6, 38);
    strip(0, 38, 36, 4);
    return blocks;
  }, []);
  return <group>
    <Blocks items={paving} />
    {[-76, -60, -44, -9, 9, 44, 60, 76].map((x, i) => <ShopBuilding key={`north-${x}`} position={[x, 0, -43]} rotation={0} seed={i} isNight={isNight} />)}
    {[-76, -60, -44, 44, 60, 76].map((x, i) => <ShopBuilding key={`south-${x}`} position={[x, 0, 43]} rotation={Math.PI} seed={i + 9} isNight={isNight} />)}
    {[-9, 9].map((z, i) => <group key={z}>
      <ShopBuilding position={[-43, 0, z]} rotation={Math.PI / 2} seed={i + 16} isNight={isNight} />
      <ShopBuilding position={[43, 0, z]} rotation={-Math.PI / 2} seed={i + 20} isNight={isNight} />
    </group>)}
    {[-72, -52, -12, 12, 52, 72].map((x, i) => <group key={x}>
      <StreetTree position={[x, 0.08, -32.2]} seed={i} gameSpeed={gameSpeed} />
      <StreetTree position={[x, 0.08, 32.2]} seed={i + 2} gameSpeed={gameSpeed} />
    </group>)}
    {[-12, 12].map(z => <group key={z}>
      <StreetTree position={[-32.2, 0.08, z]} seed={1} gameSpeed={gameSpeed} />
      <StreetTree position={[32.2, 0.08, z]} seed={2} gameSpeed={gameSpeed} />
    </group>)}
    <StreetBench position={[-6, 0.1, -32.2]} rotation={Math.PI} />
    <StreetBench position={[6, 0.1, 32.2]} />
    <StreetBench position={[-10, 0.1, 39.5]} />
    <StreetBench position={[10, 0.1, 39.5]} />
    <NeighborhoodLamp position={[0, 0.1, -32.1]} isNight={isNight} />
    <NeighborhoodLamp position={[0, 0.1, 32.1]} isNight={isNight} />
    <NeighborhoodLamp position={[-32.1, 0.1, 0]} isNight={isNight} />
    <NeighborhoodLamp position={[32.1, 0.1, 0]} isNight={isNight} />
    {[-1, 1].map(side => <group key={side} position={[side * 14.8, 0.1, 35.8]}>
      <mesh position={[0, 0.5, 0]} castShadow><cylinderGeometry args={[0.28, 0.24, 1, 10]} /><meshStandardMaterial color="#425b50" roughness={0.8} /></mesh>
      <mesh position={[0, 1.02, 0]}><cylinderGeometry args={[0.31, 0.31, 0.09, 10]} /><meshStandardMaterial color="#b8b7a6" /></mesh>
    </group>)}
    <PedestrianCrowd3D routes={ROUTES} gameSpeed={gameSpeed} />
  </group>;
});
