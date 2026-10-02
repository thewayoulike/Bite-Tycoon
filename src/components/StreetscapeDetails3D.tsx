import {memo,useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {ModelParts} from '../graphics/modelParts';
import {RoundedCarBody3D,StylizedTree3D} from './StreetAssets3D';
import {getSignTexture} from '../graphics/surfaceMaterials';

/** The small cues that make a paved block read as a lived-in street. */
export const StreetscapeDetails3D=memo(function StreetscapeDetails3D({isNight}:{isNight:boolean}){
 const geometry=useMemo(()=>{
  const m=new ModelParts();
  for(const x of [-50,-25,0,25,50])for(const z of [-37.5,12.5,50]){
   const half=z===50?9.25:21.75;
   // Individual kerbstones and the darker drainage channel along each avenue.
   for(const side of [-1,1]){
    for(let t=-half;t<half;t+=1.25)m.box([x+side*9.17,.12,z+t+.6],[.19,.19,Math.min(1.2,half-t)],'#a4a097');
    for(let t=-9;t<9;t+=1.25)m.box([x+t+.6,.12,z+side*half],[1.2,.19,.19],'#aaa69c');
    m.box([x+side*9.37,.026,z],[.2,.018,half*2],'#414346');
    for(const dz of [-half+3,half-3]){
     m.box([x+side*9.43,.04,z+dz],[.34,.025,.8],'#303638');
     for(let i=0;i<7;i++)m.box([x+side*9.43,.057,z+dz-.33+i*.1],[.31,.02,.024],'#6b6d6b');
    }
   }
  }
  // Parking bays sit in the rear courtyards, away from moving traffic and entrances.
  for(const x of [-50,-25,25,50])for(const z of [-37.5,12.5]){
   for(const dz of [-2.4,0,2.4])m.box([x+4,.105,z+dz],[4.3,.013,.065],'#d8d3c6');
   m.box([x+6.2,.105,z],[.065,.013,4.8],'#d8d3c6');
  }
  for(const [x,z] of [[-16,34],[16,34],[-16,-9],[16,-9]]){
   m.branch([x,.1,z],[x,3.6,z],.045,.045,'#55585a');
   m.box([x,3.55,z],[1.05,.36,.055],'#414b4c');
   m.box([x,3.1,z],[.65,.25,.055],'#c0baaa');
   // Bollards protect corners and pavements.
   for(const dx of [-.65,.65])m.branch([x+dx,.1,z+1],[x+dx,.85,z+1],.06,.055,'#484c4c');
  }
  for(const [x,z] of [[-18,30],[7,29],[32,5],[-32,-2],[7,-29]]){
   m.box([x,.62,z],[.6,1.05,.56],'#454b4c');
   m.box([x,1.15,z],[.66,.08,.62],'#626967');
   m.box([x,.91,z+.285],[.36,.16,.012],'#202628');
  }
  // Fine manhole covers and concentric rims break up the asphalt surface.
  for(const [x,z] of [[12.5,18],[-12.5,-32],[37.5,22]]){
   m.add(new THREE.CylinderGeometry(.38,.38,.023,16),'#55585a',[x,.045,z]);
   for(let i=-2;i<=2;i++)m.box([x,.062,z+i*.11],[.56,.013,.022],'#34393b');
  }
  // Bus shelter along the commercial avenue, on pavement between shop entrances.
  for(const z of [10.3,14.7])m.box([58.2,1.65,z],[.075,3.1,.075],'#505c61');
  m.box([57.55,3.24,12.5],[1.65,.13,4.8],'#565e60');
  m.box([57.65,.65,12.5],[.55,.12,3.7],'#8d7962');
  for(const z of [11.1,13.9])m.box([57.65,.36,z],[.44,.6,.085],'#505c61');
  m.box([58.25,1.75,15.5],[.065,3.5,.065],'#515c61');
  m.box([58.25,3.18,15.5],[.12,.55,.75],'#406174');
  // Signal heads face the crossing, with pavement-mounted poles.
  for(const [x,z] of [[41.35,33.65],[-8.65,-8.65]]){
   m.box([x,1.95,z],[.09,3.8,.09],'#4c565a');m.box([x,3.45,z],[.36,.9,.3],'#323a40');
   for(let i=0;i<3;i++)m.add(new THREE.CylinderGeometry(.095,.095,.03,10),['#a24f40','#bf9c55','#657864'][i],[x,3.73-i*.27,z+.17],[1,1,1],[Math.PI/2,0,0]);
  }
  return m.finish();
 },[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <group>
  <mesh geometry={geometry} receiveShadow><meshStandardMaterial vertexColors roughness={.84}/></mesh>
  <mesh position={[58.17,1.85,12.5]}><boxGeometry args={[.045,2.4,4.2]}/><meshStandardMaterial color="#869b9f" transparent opacity={.28} roughness={.2} depthWrite={false}/></mesh>
  {([{x:-41.7,z:12.5,text:'CEDAR LANE'},{x:41.7,z:12.5,text:'MARKET STREET'},{x:8.4,z:-37.5,text:'CIVIC QUARTER'}]).map(({x,z,text})=><group key={text} position={[x,0,z]}>
   <mesh position={[0,1.85,0]}><boxGeometry args={[.08,3.6,.08]}/><meshStandardMaterial color="#586167"/></mesh>
   <mesh position={[0,3.52,0]}><boxGeometry args={[2.5,.4,.09]}/><meshStandardMaterial color="#3c5056"/></mesh>
   <mesh position={[0,3.52,.05]}><planeGeometry args={[2.38,.3]}/><meshBasicMaterial map={getSignTexture(text)} transparent depthWrite={false}/></mesh>
  </group>)}
  {[[-21,0,12.5], [29,0,-37.5],[-46,0,-37.5],[54,0,12.5]].map((position,i)=><group key={i} position={position as [number,number,number]} rotation={[0,Math.PI/2,0]} scale={.8}><RoundedCarBody3D color={['#b7b4a9','#47545d','#714d43','#85817a'][i]} isNight={isNight} gameSpeed={0} speed={i}/></group>)}
  {[-50,-25,0,25,50].map((x,i)=><StylizedTree3D key={x} position={[x-7.7,.1,-37.5]} seed={i+14} scale={.88} gameSpeed={0}/>)}
 </group>;
});
