import {OuterRoads3D} from '../components/OuterRoads3D';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { PROPERTIES, PUBLIC_GARDEN, Property, Business,createBusiness } from './expansionModel';
import {PlazaBuilding3D} from '../components/ShoppingPlaza3D';
import {BusinessContents3D} from './BusinessInterior';
import { ModelParts } from '../graphics/modelParts';
import { getSurfaceMaterial } from '../graphics/surfaceMaterials';
import { StylizedTree3D, RoundedCarBody3D } from '../components/StreetAssets3D';
import { OutdoorReflections3D } from '../components/OutdoorReflections3D';
import { PedestrianCrowd3D } from '../components/PedestrianCrowd3D';
import type {GameState} from '../hooks/useGameLoop';
import {RestaurantProperty3D} from '../components/RestaurantShell3D';
import {UrbanBuilding3D as Building} from '../components/UrbanBuilding3D';
import {StreetscapeDetails3D} from '../components/StreetscapeDetails3D';
import {NaturalSky3D} from '../components/NaturalSky3D';
import {CitySkyline3D} from '../components/CitySkyline3D';
import {NeighborhoodDistricts3D} from '../components/NeighborhoodDistricts3D';
import {CITY_AVENUES,CITY_CROSS_STREETS} from '../graphics/cityDistrictLayout';

// Two lots share each long block; keep full-size playable interiors.
const AVENUES=CITY_AVENUES;
const CROSS_STREETS=CITY_CROSS_STREETS;
const BLOCK_COLUMNS=[-50,-25,0,25,50];
// Pavement paths stop short of junctions and stay outside the building footprints.
const routes: [number,number][][]=[[[8.65,-6],[8.65,29]], [[-16.3,-5],[-16.3,5],[-16.95,5],[-16.95,8],[-16.3,8],[-16.3,29],[-16.3,8],[-16.95,8],[-16.95,5],[-16.3,5]], [[33.7,-5],[33.7,5],[32.9,5],[32.9,8],[33.7,8],[33.7,29],[33.7,8],[32.9,8],[32.9,5],[33.7,5]], [[-58.9,-56],[-58.9,-17]], [[58.8,-55],[58.8,-18]], [[58.8,-4],[58.8,29]]];
function PublicGarden({labels=true,gameSpeed=1,isNight=false}:{labels?:boolean;gameSpeed?:number;isNight?:boolean}) {
  const b=useMemo(()=>createBusiness('owned'),[]);
  return <group position={PUBLIC_GARDEN.position}>
    <group position={[0,.13,0]} scale={.75}><BusinessContents3D p={PUBLIC_GARDEN} b={b} gameSpeed={gameSpeed} isNight={isNight}/></group>
    {labels&&<Html position={[0,5,0]} center zIndexRange={[3,0]} style={{pointerEvents:'none'}}><div className="map-pin"><span className="owned-dot"/>Willow Gardens<small>Public garden · open to everyone</small></div></Html>}
  </group>;
}
function Car({bounds=[-39,39,-64,64],offset=0,color='#597978',gameSpeed=1,isNight=false}:{bounds?:[number,number,number,number];offset?:number;color?:string;gameSpeed?:number;isNight?:boolean}){
  const ref=useRef<THREE.Group>(null),elapsed=useRef(0);
  useFrame((_,delta)=>{elapsed.current+=delta*gameSpeed;if(!ref.current)return;
    const [left,right,back,front]=bounds,width=right-left,depth=front-back;
    let d=(elapsed.current*4+offset)%(2*(width+depth));
    const lengths=[width,depth,width,depth];let side=0;while(d>lengths[side]&&side<3){d-=lengths[side];side++;}
    const positions:[number,number,number][]=[[left+d,0,front],[right,0,front-d],[right-d,0,back],[left,0,back+d]];
    ref.current.position.set(...positions[side]);ref.current.rotation.y=[Math.PI/2,Math.PI,-Math.PI/2,0][side];
  });
  return <group ref={ref}><RoundedCarBody3D color={color} speed={27} gameSpeed={gameSpeed} isNight={isNight}/></group>;
}
function MapControls({revision}:{revision:number}){
  const controls=useRef<React.ElementRef<typeof OrbitControls>>(null),{camera}=useThree();
  useEffect(()=>{camera.position.set(82,64,116);controls.current?.target.set(0,2,0);controls.current?.update();},[revision,camera]);
  return <OrbitControls ref={controls} target={[0,2,0]} minDistance={25} maxDistance={190} minPolarAngle={.25} maxPolarAngle={1.25} enablePan/>;
}
function Roads({wet=0,snow=0}:{wet?:number;snow?:number}){
  const materials=useMemo(()=>[getSurfaceMaterial('asphalt',snow?'#818990':wet?'#353e47':'#494c51',3,35),getSurfaceMaterial('asphalt',snow?'#818990':wet?'#353e47':'#494c51',35,3)].map(base=>{const m=base.clone();m.roughness=wet?.23:.92;m.metalness=wet?.3:0;return m;}),[wet,snow]);
  useEffect(()=>()=>materials.forEach(m=>m.dispose()),[materials]);
  const markings=useMemo(()=>{const m=new ModelParts();
    for(const z of CROSS_STREETS)for(let x=-60;x<=60;x+=5){
      if(AVENUES.some(c=>Math.abs(c-x)<5))continue;
      m.box([x,.036,z],[2.4,.015,.12],'#e5d8a6');
    }
    for(const x of AVENUES)for(let z=-60;z<=60;z+=5){
      if(CROSS_STREETS.some(c=>Math.abs(c-z)<5))continue;
      m.box([x,.038,z],[.12,.015,2.4],'#e5d8a6');
    }
    for(const x of AVENUES)for(const z of CROSS_STREETS)for(const side of [-1,1])for(let i=0;i<6;i++){
      if(Math.abs(x)===62.5||Math.abs(z+side*5)<65.75)m.box([x-2.6+i*.9,.045,z+side*5],[.5,.016,2],'#e4e5d9');
      if(z===-12.5||Math.abs(x+side*5)<65.75)m.box([x+side*5,.045,z-2.6+i*.9],[2,.016,.5],'#e4e5d9');
    }return m.finish();},[]);
  useEffect(()=>()=>markings.dispose(),[markings]);
  return <group>{AVENUES.map(x=><mesh key={'avenue'+x} position={[x,.015,0]} rotation={[-Math.PI/2,0,0]} receiveShadow material={materials[0]}><planeGeometry args={[6.5,131.5]}/></mesh>)}
    {CROSS_STREETS.map(z=><mesh key={'cross'+z} position={[0,.018,z]} rotation={[-Math.PI/2,0,0]} receiveShadow material={materials[1]}><planeGeometry args={[131.5,6.5]}/></mesh>)}
    <mesh geometry={markings}><meshStandardMaterial vertexColors roughness={.9}/></mesh>
  </group>;
}
function SharedBlocks(){
  const courtyard=useMemo(()=>{const m=new ModelParts();
    for(const x of BLOCK_COLUMNS)for(const z of [-37.5,12.5]){
      // Paved paths, planted edges and benches between the two addresses.
      m.box([x,.094,z],[12,.02,3.2],'#a8a298');
      for(const side of [-1,1]){
        m.box([x+side*3.8,.58,z+2.8],[2.4,.12,.65],'#977555');
        m.box([x+side*3.8,.88,z+3.05],[2.4,.6,.1],'#977555');
        for(const dx of [-.85,.85])m.box([x+side*3.8+dx,.3,z+2.8],[.08,.6,.55],'#42464a');
      }
    }return m.finish();},[]);
  useEffect(()=>()=>courtyard.dispose(),[courtyard]);
  return <group>{BLOCK_COLUMNS.flatMap(x=>[-37.5,12.5,50].map(z=><mesh key={x+':'+z} position={[x,.045,z]} receiveShadow material={getSurfaceMaterial('concrete','#b3afa7',14,z===50?14:34)}><boxGeometry args={[18.5,.085,z===50?18.5:43.5]}/></mesh>))}
    <mesh geometry={courtyard} receiveShadow><meshStandardMaterial vertexColors roughness={.9}/></mesh>
  </group>;
}
export function ExpansionMap({selected,businesses,onSelect}:{selected:string;businesses:Record<string,Business>;onSelect:(id:string)=>void}) {
  const[revision,setRevision]=useState(0);
  return <><button className="map-reset" onClick={()=>setRevision(n=>n+1)}>Reset map</button><Canvas shadows={{type:THREE.PCFSoftShadowMap}} dpr={[1,1.5]} camera={{position:[48,28,78],fov:46,far:1000}}>
    <NaturalSky3D daylight={1} isNight={false}/><fog attach="fog" args={['#e1e5e5',180,360]}/>
    <hemisphereLight intensity={.9} color="#dce7f5" groundColor="#8e8277"/><directionalLight position={[-30,60,30]} intensity={2.7} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-65} shadow-camera-right={65} shadow-camera-top={65} shadow-camera-bottom={-65} shadow-normalBias={.035} shadow-bias={-.00015}/>
    <OutdoorReflections3D isNight={false}/>
    <DistrictScenery selected={selected} businesses={businesses} onSelect={onSelect}/>
    <MapControls revision={revision}/>
  </Canvas></>;
}

export function DistrictScenery({selected,businesses,onSelect,interiorId=null,labels=true,gameSpeed=1,isNight=false,restaurants={},wet=0,snow=0}:{wet?:number;snow?:number;restaurants?:Record<string,GameState>;selected:string;businesses:Record<string,Business>;onSelect:(id:string)=>void;interiorId?:string|null;labels?:boolean;gameSpeed?:number;isNight?:boolean}){
return <>
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow material={getSurfaceMaterial('grass',snow?'#d8dedf':'#868679',100,100)}><planeGeometry args={[1000,1000]}/></mesh>
    <Roads wet={wet} snow={snow}/><OuterRoads3D wet={wet} snow={snow}/>
    <CitySkyline3D isNight={isNight} snow={snow}/>
    <SharedBlocks/><StreetscapeDetails3D isNight={isNight}/>
    <NeighborhoodDistricts3D isNight={isNight}/>
    <PublicGarden labels={labels} gameSpeed={gameSpeed} isNight={isNight}/>
    {PROPERTIES.filter(p=>p.id!==interiorId).map(p=>(p.kind==='restaurant'||p.kind==='cafe')?<RestaurantProperty3D key={p.id} p={p} state={restaurants[p.id]} selected={selected===p.id} owned={!!businesses[p.id]} labels={labels} onSelect={()=>onSelect(p.id)} isNight={isNight}/>:p.kind==='plaza'?<PlazaBuilding3D key={p.id} p={p} floors={businesses[p.id]?.plaza?.openFloors??1} isNight={isNight} selected={selected===p.id} owned={!!businesses[p.id]} labels={labels} onSelect={()=>onSelect(p.id)}/>:<Building key={p.id} floorsOverride={businesses[p.id]?.lodging?.openFloors} isNight={isNight} p={p} selected={selected===p.id} owned={!!businesses[p.id]} labels={labels} onSelect={()=>onSelect(p.id)}/>)}
    {[-25,0,25].flatMap(x=>[-25,0,25].filter(z=>!(x===0&&(z===0||z===-25))).map((z,i)=><StylizedTree3D key={`${x}:${z}`} position={[x+8.65,.1,z+6.5]} seed={i} scale={.75}/>))}
    <Car isNight={isNight} gameSpeed={gameSpeed}/><Car isNight={isNight} gameSpeed={gameSpeed} bounds={[-14,14,-14,39]} offset={45} color="#b88d62"/><Car isNight={isNight} gameSpeed={gameSpeed} offset={85} color="#92534b"/>
    <Car isNight={isNight} gameSpeed={gameSpeed} bounds={[-64,64,-64,64]} offset={140} color="#bab7ae"/><Car isNight={isNight} gameSpeed={gameSpeed} bounds={[-61,61,-61,61]} offset={40} color="#626d78"/>
    <PedestrianCrowd3D routes={routes} gameSpeed={gameSpeed} count={12} size={.75}/>{[-25,0,25].flatMap(x=>[-25,0,25].filter(z=>!(x===0&&z===-25)).map(z=><group key={`lamp-${x}-${z}`} position={[x-8,.1,z+8]}><mesh position={[0,1.8,0]} castShadow><cylinderGeometry args={[.06,.1,3.6,8]}/><meshStandardMaterial color="#434950"/></mesh><mesh position={[0,3.65,0]}><sphereGeometry args={[.24,10,8]}/><meshStandardMaterial color="#e9d5ac" emissive="#ffd48c" emissiveIntensity={isNight?2:0}/></mesh>{isNight&&<mesh position={[0,.005,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[2.4,20]}/><meshBasicMaterial color="#d9ad69" transparent opacity={.12} depthWrite={false}/></mesh>}</group>))}
</>;
}
