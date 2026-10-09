import {memo, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {Detailed} from '@react-three/drei';
import * as THREE from 'three';
import {WeatherMotionContext} from './Weather3D';
import {CharacterQualityContext} from './RealCharacter3D';
import {StylizedTree3D as FallbackTree, RoundedCarBody3D as FallbackCar} from './StreetAssetsFallback3D';
import {chooseVehicleStyle, createVehicleInstance, getTreeParts, loadStreetLibrary, streetLibraries, treeLeafMaterial, type StreetLibrary} from '../graphics/streetAssetLibrary';
import type {Vec3} from '../graphics/modelParts';

export function useStreetLibrary(kind: StreetLibrary) {
  const [library, setLibrary] = useState(() => streetLibraries[kind] ?? null);
  useEffect(() => {
    let mounted = true;
    void loadStreetLibrary(kind).then(result => { if (mounted && result) setLibrary(result); });
    return () => { mounted = false; };
  }, [kind]);
  return library;
}

type TreeProps = {position: Vec3; seed?: number; blossom?: boolean; scale?: number; gameSpeed?: number};
function TreeDetail({library, species, lod, blossom, phase, wind, animationSpeed, shadows}: {
  library: THREE.Group; species: string; lod: number; blossom: boolean; phase: number; wind: number; animationSpeed: number; shadows: boolean;
}) {
  const crown = useRef<THREE.Group>(null), elapsed = useRef(phase);
  const {bark, leaves} = useMemo(() => getTreeParts(library, species, lod), [library, species, lod]);
  useFrame((_, delta) => {
    if (!crown.current || animationSpeed === 0) return;
    elapsed.current += Math.min(delta, .06) * animationSpeed;
    crown.current.rotation.z = Math.sin(elapsed.current * .75) * .009 * wind;
    crown.current.rotation.x = Math.cos(elapsed.current * .6) * .006 * wind;
  });
  return <group dispose={null}>
    <mesh geometry={bark.geometry} material={bark.material} castShadow={shadows} receiveShadow />
    <group ref={crown} position={[0, 1.8, 0]}>
      <mesh position={[0, -1.8, 0]} geometry={leaves.geometry} material={treeLeafMaterial(leaves.material, blossom)} castShadow={shadows} receiveShadow />
    </group>
  </group>;
}

export const StylizedTree3D = memo(function StylizedTree3D(props: TreeProps) {
  const {position, seed = 0, blossom = false, scale = 1, gameSpeed = 1} = props;
  const library = useStreetLibrary('trees'), fast = useContext(CharacterQualityContext), weather = useContext(WeatherMotionContext);
  const variant = Math.abs(Math.floor(seed)), species = blossom ? 'oak' : ['oak', 'aspen', 'ash'][variant % 3];
  if (!library) return <FallbackTree {...props} />;
  const detail = {library, species, blossom, phase: seed * 1.8, wind: weather ? weather.wind / 8 : 1, animationSpeed: weather?.speed ?? gameSpeed};
  return <group name="street-tree" position={position} scale={[scale, scale * (.96 + variant % 3 * .04), scale]} rotation={[0, seed * .63, 0]} dispose={null}>
    {fast ? <TreeDetail {...detail} lod={1} shadows={false} /> : <Detailed distances={[0, 42]} hysteresis={.12}>
      <TreeDetail {...detail} lod={0} shadows />
      <TreeDetail {...detail} lod={1} shadows />
    </Detailed>}
  </group>;
});

type CarProps = {color: string; isTaxi?: boolean; isNight: boolean; speed: number; gameSpeed: number};
function ModelCar({library, color, isTaxi = false, isNight, speed, gameSpeed}: CarProps & {library: THREE.Group}) {
  const style = chooseVehicleStyle(color, speed, isTaxi), fast = useContext(CharacterQualityContext);
  const car = useMemo(() => createVehicleInstance(library, style, isTaxi ? '#dba62c' : color, isNight), [library, style, color, isTaxi, isNight]);
  useEffect(() => { car.root.traverse(node => { if ((node as THREE.Mesh).isMesh) node.castShadow = !fast; }); }, [car, fast]);
  useFrame((_, delta) => {
    if (!gameSpeed || !speed) return;
    const angle = speed * .28 * Math.min(delta, .06) * gameSpeed / car.radius;
    for (const wheel of car.wheels) wheel.rotateOnWorldAxis(X_AXIS, angle);
  });
  return <group name={`street-car-${style}`} dispose={null}>
    <primitive object={car.root} />
    {isTaxi && <group position={[0, 1.60, -.18]}>
      <mesh><boxGeometry args={[.57, .17, .25]} /><meshStandardMaterial color="#f1e9ca" emissive="#ffce73" emissiveIntensity={isNight ? .7 : .05} /></mesh>
      <mesh position={[0, 0, .132]}><boxGeometry args={[.37, .035, .012]} /><meshStandardMaterial color="#29373b" /></mesh>
    </group>}
  </group>;
}
const X_AXIS = new THREE.Vector3(1, 0, 0);
export const RoundedCarBody3D = memo(function RoundedCarBody3D(props: CarProps) {
  const library = useStreetLibrary('vehicles');
  return library ? <ModelCar {...props} library={library} /> : <FallbackCar {...props} />;
});
