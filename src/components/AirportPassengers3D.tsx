import {memo,useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {RealCharacter3D} from './RealCharacter3D';
import {ModelParts,type Vec3} from '../graphics/modelParts';

// The two entrance lanes use a real gap in the rounded glass facade. The
// indoor loop stays between the curtain wall and the lounge seating.
const ROUTES:Vec3[][]=[
  [[504,.59,43],[512.5,.59,43],[512.5,.59,-41.6],[509.8,.75,-41.6],[508.4,.96,-41.6],[503,.96,-41.6],[503,.96,-39.5],[508.2,.96,-39.5],[510.8,.59,-39.5],[511.8,.59,-38],[511.8,.59,43]],
  [[466,.96,-92],[466,.96,-4],[468,.96,-4],[468,.96,-92]],
];
const PATHS=ROUTES.map(points=>{
  const segments=points.map((point,i)=>{const end=points[(i+1)%points.length];return {point,end,length:Math.hypot(end[0]-point[0],end[2]-point[2])};});
  return {segments,length:segments.reduce((sum,segment)=>sum+segment.length,0)};
});
function pose(path:typeof PATHS[number],distance:number){
  let d=distance%path.length;
  const s=path.segments.find(segment=>{if(d<segment.length)return true;d-=segment.length;return false;})??path.segments[0];
  const t=d/s.length;
  return {x:s.point[0]+(s.end[0]-s.point[0])*t,y:s.point[1]+(s.end[1]-s.point[1])*t,z:s.point[2]+(s.end[2]-s.point[2])*t,heading:Math.atan2(s.end[0]-s.point[0],s.end[2]-s.point[2])};
}
function suitcaseGeometry(){
  const parts=new ModelParts();
  parts.box([0,.35,0],[.38,.58,.25],'#65818b');
  for(const x of [-.13,.13]){
    parts.branch([x,.58,0],[x,.95,0],.013,.013,'#b0bdc1',5);
    parts.add(new THREE.CylinderGeometry(.055,.055,.04,8),'#28383d',[x,.055,0],[1,1,1],[0,0,Math.PI/2]);
  }
  parts.box([0,.95,0],[.31,.045,.045],'#253b43');
  for(const y of [.2,.34,.48])parts.box([0,y,-.13],[.29,.018,.015],'#90a6ac');
  return parts.finish();
}
function Traveller({index,path,geometry}:{index:number;path:typeof PATHS[number];geometry:THREE.BufferGeometry}){
  const group=useRef<THREE.Group>(null),time=useRef(index*path.length/8);
  const start=useMemo(()=>pose(path,time.current),[path]);
  useFrame((_,delta)=>{
    time.current+=Math.min(delta,.1)*1.15;
    if(!group.current)return;
    const next=pose(path,time.current);group.current.position.set(next.x,next.y,next.z);
    const difference=next.heading-group.current.rotation.y;
    group.current.rotation.y+=Math.atan2(Math.sin(difference),Math.cos(difference))*Math.min(1,delta*9);
  });
  return <group ref={group} position={[start.x,start.y,start.z]} rotation-y={start.heading}>
    <RealCharacter3D role="customer" seed={700+index*13} isWalking gameSpeed={1.15} detail="crowd" name="airport-passenger"/>
    <mesh geometry={geometry} position={[.53,0,-.32]} rotation-x={-.13} castShadow><meshStandardMaterial vertexColors roughness={.7}/></mesh>
  </group>;
}
export const AirportPassengers3D=memo(function AirportPassengers3D(){
  const root=useRef<THREE.Group>(null),geometry=useMemo(suitcaseGeometry,[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(({camera})=>{if(root.current)root.current.visible=Math.hypot(camera.position.x-490,camera.position.z+45)<220;});
  return <group ref={root} name="airport-public-passengers">
    {Array.from({length:12},(_,i)=><Traveller key={i} index={i} path={PATHS[i<8?0:1]} geometry={geometry}/>)}
    {[-54,-57,-60,-63].map((z,i)=><group key={z} position={[503,.96,z]} rotation-y={Math.PI/2}>
      <RealCharacter3D role="customer" seed={820+i*17} detail="crowd" name="airport-waiting-passenger"/>
      <mesh geometry={geometry} position={[.6,0,0]} castShadow><meshStandardMaterial vertexColors color={i%2?'#c48d70':'#a9bec4'}/></mesh>
    </group>)}
    {[[-327.5,-85],[-327.5,-73],[-310.5,-85],[-310.5,-13]].map(([x,z],i)=><group key={i} position={[x+800,.95,z]} rotation-y={i<2?Math.PI/2:-Math.PI/2}>
      <RealCharacter3D role="customer" seed={881+i*23} isSitting isWaitingFood={i%2===0} seatHeight={.55} detail="crowd" name="airport-seated-passenger"/>
      <mesh geometry={geometry} position={[.65,0,.4]} castShadow><meshStandardMaterial vertexColors roughness={.7}/></mesh>
    </group>)}
    {[[-304,-53],[-304,-60]].map(([x,z],i)=><group key={i} position={[x+800,.96,z]} rotation-y={Math.PI/2}><RealCharacter3D role="manager" seed={950+i} detail="crowd" name="airport-service-staff"/></group>)}
  </group>;
});
