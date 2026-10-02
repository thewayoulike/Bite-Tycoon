import { memo, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getCarModel, getTreeModel } from '../graphics/streetModels';
import type { Vec3 } from '../graphics/modelParts';

const barkMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
const leafMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, side: THREE.DoubleSide });
const trimMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .4, metalness: .36 });
const glassMaterial = new THREE.MeshStandardMaterial({ color: '#294b5b', roughness: .17, metalness: .42 });

export const StylizedTree3D = memo(function StylizedTree3D({ position, seed = 0, blossom = false, scale = 1, gameSpeed = 1 }: {
  position: Vec3; seed?: number; blossom?: boolean; scale?: number; gameSpeed?: number;
}) {
  const crown = useRef<THREE.Group>(null), elapsed = useRef(seed * 1.8);
  const model = useMemo(() => getTreeModel(seed, blossom), [seed, blossom]);
  useFrame((_, delta) => {
    if (!crown.current || gameSpeed === 0) return;
    elapsed.current += Math.min(delta, .06) * gameSpeed;
    crown.current.rotation.z = Math.sin(elapsed.current * .75) * .008;
    crown.current.rotation.x = Math.cos(elapsed.current * .6) * .006;
  });
  return <group position={position} scale={[scale, scale * (.95 + seed % 3 * .05), scale]} rotation={[0,seed*.63,0]} name="street-tree" dispose={null}>
    <mesh geometry={model.bark} material={barkMaterial} castShadow receiveShadow />
    <group ref={crown} position={[0,1.8,0]}>
      <mesh geometry={model.leaves} material={leafMaterial} castShadow receiveShadow />
    </group>
  </group>;
});

export const RoundedCarBody3D = memo(function RoundedCarBody3D({ color, isTaxi = false, isNight, speed, gameSpeed }: {
  color: string; isTaxi?: boolean; isNight: boolean; speed: number; gameSpeed: number;
}) {
  const wheels = useRef<THREE.Group>(null);
  const wagon = speed % 3 === 0 && !isTaxi;
  const model = useMemo(() => getCarModel(wagon), [wagon]);
  const paint = useMemo(() => new THREE.Color(isTaxi ? '#e6b647' : color).lerp(new THREE.Color('#7e8584'), .14), [color,isTaxi]);
  useFrame((_, delta) => {
    if (!wheels.current || gameSpeed === 0) return;
    const angle = speed * .28 * Math.min(delta,.06) * gameSpeed / .428;
    wheels.current.children.forEach(wheel => { wheel.rotation.x += angle; });
  });
  return <group name="street-car">
    <mesh geometry={model.body} castShadow receiveShadow dispose={null}>
      <meshStandardMaterial color={paint} roughness={.28} metalness={.36} />
    </mesh>
    <mesh geometry={model.roof} castShadow dispose={null}>
      <meshStandardMaterial color={isTaxi || wagon ? paint : '#d8dcd7'} roughness={.28} metalness={.36} />
    </mesh>
    <mesh geometry={model.cabin} material={glassMaterial} dispose={null} />
    <mesh geometry={model.trim} material={trimMaterial} castShadow dispose={null} />
    <group ref={wheels}>
      {[-1,1].flatMap(side => [-1.36,1.36].map(z => <mesh key={`${side}:${z}`} position={[side*.97,.43,z]}
        geometry={model.wheel} material={trimMaterial} castShadow dispose={null} />))}
    </group>
    <mesh geometry={model.headlights} dispose={null}><meshStandardMaterial vertexColors emissive="#ecf6e9" emissiveIntensity={isNight ? 1.8 : .16} roughness={.25} /></mesh>
    <mesh geometry={model.taillights} dispose={null}><meshStandardMaterial vertexColors emissive="#e13d2f" emissiveIntensity={isNight ? 1.2 : .18} roughness={.35} /></mesh>
    {isTaxi && <group position={[0,1.98,-.22]}>
      <mesh><boxGeometry args={[.65,.19,.27]} /><meshStandardMaterial color="#f1e9ca" emissive="#ffce73" emissiveIntensity={isNight ? .7 : .05} /></mesh>
      <mesh position={[0,0,.142]}><boxGeometry args={[.4,.04,.012]} /><meshStandardMaterial color="#29373b" /></mesh>
    </group>}
  </group>;
});
