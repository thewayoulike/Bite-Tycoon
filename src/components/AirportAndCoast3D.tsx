import {memo, useEffect, useMemo, useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html, Text} from '@react-three/drei';
import * as THREE from 'three';
import {buildAirport, buildAirliner, buildCoast, buildFishingBoat, buildLeisureBoat, cityGroundGeometry, flightPose} from '../graphics/airportAndCoast';
import {getSurfaceMaterial} from '../graphics/surfaceMaterials';
import {coastalWaterVertex, coastalWaterFragment, createCoastalSkyReflection, createWaterRippleMap, createWaterSurface} from '../graphics/coastalWater';
import {SnowSurfaceMaterial} from './SnowSurfaceMaterial';
import {useStreetLibrary} from './StreetAssets3D';
import {OuterCars3D, OuterTrees3D} from './OuterStreetAssets3D';
import {RealCharacter3D} from './RealCharacter3D';
import {PedestrianCrowd3D} from './PedestrianCrowd3D';
import {AirportPassengers3D} from './AirportPassengers3D';
import type {OuterCarPlacement, OuterTreePlacement} from '../graphics/outerCity';

const TREES:OuterTreePlacement[]=[
  ...Array.from({length:20},(_,i)=>({x:-230+i*24,z:273,seed:900+i,scale:.95})),
  ...Array.from({length:12},(_,i)=>({x:535,z:-100+i*15,seed:950+i,scale:.85})),
];
const CARS:OuterCarPlacement[]=Array.from({length:12},(_,i)=>({x:466+(i%6)*6.4,z:44+Math.floor(i/6)*20,color:['#7c9aaf','#dfd4b9','#6c8274','#b78366'][i%4],style:i%4===0?'suv':'sedan'}));
const buildYacht=()=>buildLeisureBoat(false),buildSloop=()=>buildLeisureBoat(true);
const WALK_ROUTE:[number,number][][]=[[[-220,285],[110,285]]];
function useScenery<T extends Record<string,THREE.BufferGeometry>>(build:()=>T) {
  const model=useMemo(build,[]);
  useEffect(()=>()=>Object.values(model).forEach(g=>g.dispose()),[model]);
  return model;
}
export const CoastalGround3D=memo(function CoastalGround3D({snow=0}:{snow?:number}) {
  const geometry=useMemo(cityGroundGeometry,[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh name="coastal-city-terrain" geometry={geometry} receiveShadow material={getSurfaceMaterial('grass',snow?'#d8dedf':'#868679',190,140)}/>;
});
function CoastalWater({isNight}:{isNight:boolean}) {
  const material=useRef<THREE.ShaderMaterial>(null),elapsed=useRef(0);
  const rippleMap=useMemo(createWaterRippleMap,[]),geometry=useMemo(createWaterSurface,[]);
  useEffect(()=>()=>{rippleMap.dispose();geometry.dispose();},[rippleMap,geometry]);
  const uniforms=useMemo(()=>THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{
    time:{value:0},night:{value:0},wakes:{value:[new THREE.Vector4(),new THREE.Vector4(),new THREE.Vector4()]}
  }]),[]);
  // Attach the owned texture after merging: UniformsUtils would clone it.
  uniforms.rippleMap={value:rippleMap};
  useFrame((_,delta)=>{
    elapsed.current+=Math.min(delta,.1);
    if(material.current){
      material.current.uniforms.time.value=elapsed.current;
      material.current.uniforms.night.value=isNight?1:0;
      [[-13,410,6],[83,426,7],[-122,431,8]].forEach(([x,z,index],i)=>{
        const a=(elapsed.current+index*2)*.035,dx=Math.cos(a)*32,dz=-Math.sin(a)*22,n=Math.hypot(dx,dz);
        uniforms.wakes.value[i].set(x+Math.sin(a)*32,z+Math.cos(a)*22,dx/n,dz/n);
      });
    }
  });
  return <mesh name="animated-coastal-water" position={[0,-.2,0]} geometry={geometry}>
    <shaderMaterial ref={material} uniforms={uniforms} fog vertexShader={coastalWaterVertex} fragmentShader={coastalWaterFragment}/>
  </mesh>;
}
type PlaneModel=ReturnType<typeof buildAirliner>;
function PlaneMeshes({model,isNight}:{model:PlaneModel;isNight:boolean}){
  return <><mesh geometry={model.shell} castShadow><meshStandardMaterial vertexColors roughness={.42} metalness={.25}/></mesh><mesh geometry={model.glass}><meshStandardMaterial vertexColors roughness={.18} metalness={.5}/></mesh><mesh geometry={model.metal}><meshStandardMaterial vertexColors roughness={.55} metalness={.35}/></mesh><mesh geometry={model.lights}><meshStandardMaterial vertexColors emissive="#ffe5ba" emissiveIntensity={isNight?1.5:.25}/></mesh></>;
}
function FlyingPlane({model,isNight,coastal=false}:{model:PlaneModel;isNight:boolean;coastal?:boolean}){
  const ref=useRef<THREE.Group>(null),elapsed=useRef(coastal?35:16);
  // Ambient transport keeps moving while the business clock is paused.
  useFrame((_,delta)=>{
    elapsed.current+=Math.min(delta,.1);
    if(!ref.current)return;
    const pose=flightPose(elapsed.current,coastal);
    ref.current.position.copy(pose.position);ref.current.rotation.set(pose.pitch,pose.heading,pose.bank,'YXZ');
  });
  return <group ref={ref} name={coastal?'coastal-flyover-airliner':'airport-arriving-departing-airliner'} scale={coastal?.85:1}><PlaneMeshes model={model} isNight={isNight}/></group>;
}
type BoatModel=ReturnType<typeof buildFishingBoat>;
function FishingBoat({model,x,z,index,moving=false}:{model:BoatModel;x:number;z:number;index:number;moving?:boolean}){
  const ref=useRef<THREE.Group>(null),elapsed=useRef(index*2);
  useFrame((_,delta)=>{
    elapsed.current+=Math.min(delta,.1);
    if(!ref.current)return;
    const t=elapsed.current;
    ref.current.position.set(x+(moving?Math.sin(t*.035)*32:0),.08+Math.sin(t*1.1+index)*.06,z+(moving?Math.cos(t*.035)*22:0));
    ref.current.rotation.set(Math.sin(t*.9)*.018,moving?Math.atan2(Math.cos(t*.035)*32,-Math.sin(t*.035)*22):.2+index*.2,Math.sin(t*.8+index)*.025);
  });
  return <group ref={ref} position={[x,.1,z]} name={moving?'harbour-fishing-boat':'moored-fishing-boat'}>
    <mesh geometry={model.hull} castShadow><meshStandardMaterial vertexColors roughness={.5}/></mesh><mesh geometry={model.details} castShadow><meshStandardMaterial vertexColors roughness={.7}/></mesh><mesh geometry={model.glass}><meshStandardMaterial vertexColors metalness={.35} roughness={.25}/></mesh>
  </group>;
}
function LighthouseBeam({isNight}:{isNight:boolean}){
  const ref=useRef<THREE.Group>(null);
  useFrame((_,delta)=>{if(ref.current)ref.current.rotation.y+=Math.min(delta,.1)*.38;});
  return <group ref={ref} position={[174,15.5,374]} visible={isNight}><mesh position={[0,0,22]} rotation={[Math.PI/2,0,0]}><coneGeometry args={[4,44,16,1,true]}/><meshBasicMaterial color="#fff0bf" transparent opacity={.045} depthWrite={false} side={THREE.DoubleSide}/></mesh></group>;
}
export const AirportAndCoast3D=memo(function AirportAndCoast3D({isNight=false,labels=true}:{isNight?:boolean;labels?:boolean}){
  const airport=useScenery(buildAirport),coast=useScenery(buildCoast),plane=useScenery(buildAirliner),boat=useScenery(buildFishingBoat),yacht=useScenery(buildYacht),sloop=useScenery(buildSloop);
  const trees=useStreetLibrary('trees'),cars=useStreetLibrary('vehicles');
  const skyReflection=useMemo(createCoastalSkyReflection,[]);
  useEffect(()=>()=>skyReflection.dispose(),[skyReflection]);
  return <group name="public-airport-and-seafront">
    <CoastalWater isNight={isNight}/>
    <group name="eastport-airport">
      <mesh geometry={airport.base} receiveShadow><SnowSurfaceMaterial/></mesh>
      <mesh geometry={airport.solid} castShadow receiveShadow><SnowSurfaceMaterial roughness={.72}/></mesh>
      <mesh geometry={airport.glass}><meshPhysicalMaterial vertexColors metalness={.12} roughness={.12} clearcoat={.8} envMap={skyReflection} envMapIntensity={isNight?.18:1.1} transparent opacity={.66} depthWrite={false} side={THREE.DoubleSide} emissive="#6c9aa7" emissiveIntensity={isNight?.27:0}/></mesh>
      <mesh geometry={airport.markings}><meshStandardMaterial vertexColors roughness={.9}/></mesh>
      <mesh geometry={airport.lights}><meshStandardMaterial vertexColors emissive="#ffe4bc" emissiveIntensity={isNight?2:.2}/></mesh>
      {[[-364,-73],[-364,-17]].map(([x,z])=><group key={z} position={[x+800,2,z]} rotation-y={-Math.PI/2}><PlaneMeshes model={plane} isNight={isNight}/></group>)}
      <FlyingPlane model={plane} isNight={isNight}/><FlyingPlane model={plane} isNight={isNight} coastal/>
      <AirportPassengers3D/>
      <Text position={[509.3,12,-48]} rotation={[0,Math.PI/2,0]} fontSize={2.1} color="#f7ecce" anchorX="center">EASTPORT AIRPORT</Text>
      <Text position={[368,.28,-168]} rotation={[-Math.PI/2,0,Math.PI]} fontSize={6} color="#f0eee1">18</Text>
      <Text position={[368,.28,66]} rotation={[-Math.PI/2,0,0]} fontSize={6} color="#f0eee1">36</Text>
      {labels&&<Html position={[479,31,-48]} center zIndexRange={[2,0]} style={{pointerEvents:'none'}}><div className="city-district-label"><strong>Eastport Airport</strong><small>Public airport · arrivals & departures</small></div></Html>}
    </group>
    <group name="seafront-fishing-harbour">
      <mesh geometry={coast.beach} receiveShadow><SnowSurfaceMaterial roughness={1}/></mesh>
      <mesh geometry={coast.stone} receiveShadow castShadow><SnowSurfaceMaterial roughness={.95}/></mesh>
      <mesh geometry={coast.wood} receiveShadow castShadow><SnowSurfaceMaterial roughness={.85}/></mesh>
      <mesh geometry={coast.details} castShadow><SnowSurfaceMaterial roughness={.65}/></mesh>
      <mesh geometry={coast.glass}><meshStandardMaterial vertexColors roughness={.22} metalness={.4}/></mesh>
      <mesh geometry={coast.lights}><meshStandardMaterial vertexColors emissive="#ffe2a0" emissiveIntensity={isNight?1.8:.05}/></mesh>
      {[4,21,38,55,72].map((x,i)=><FishingBoat key={x} model={boat} x={x} z={344+i%2*10} index={i}/>)}
      <FishingBoat model={boat} x={-13} z={410} index={6} moving/>
      <FishingBoat model={yacht} x={83} z={426} index={7} moving/><FishingBoat model={sloop} x={-122} z={431} index={8} moving/>
      <FishingBoat model={yacht} x={65} z={349} index={9}/><FishingBoat model={sloop} x={14} z={350} index={10}/>
      {[351,363,377].map((z,i)=><group key={z} position={[-72,1.6,z]} rotation-y={-Math.PI/2}><RealCharacter3D role="customer" seed={71+i*17} isSitting seatHeight={.65} gameSpeed={1} detail="crowd"/></group>)}
      <PedestrianCrowd3D routes={WALK_ROUTE} count={6} gameSpeed={.8}/>
      <Text position={[-32,3.5,300.6]} fontSize={.8} color="#e8efd6">BAIT & TACKLE</Text>
      <Text position={[91,3.5,310.6]} fontSize={.9} color="#e8efd6">HARBOUR HOUSE</Text>
      <LighthouseBeam isNight={isNight}/>
      {labels&&<Html position={[-70,11,338]} center zIndexRange={[2,0]} style={{pointerEvents:'none'}}><div className="city-district-label"><strong>Seabright Waterfront</strong><small>Public fishing pier · marina · promenade</small></div></Html>}
    </group>
    {trees&&<OuterTrees3D library={trees} placements={TREES}/>}
    {cars&&<OuterCars3D library={cars} placements={CARS}/>}
  </group>;
});



