import {useEffect,useMemo} from 'react';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import {ModelParts,Vec3} from '../graphics/modelParts';
import {getSurfaceMaterial,getSignTexture} from '../graphics/surfaceMaterials';
import {RestaurantProperty3D} from '../components/RestaurantShell3D';
import {UrbanBuilding3D} from '../components/UrbanBuilding3D';
import {StylizedTree3D,RoundedCarBody3D} from '../components/StreetAssets3D';
import {PedestrianCrowd3D} from '../components/PedestrianCrowd3D';
import {BusinessContents3D} from '../prototype/BusinessInterior';
import {PROPERTIES,Property,ExpansionState} from '../prototype/expansionModel';
import type {GameState} from '../hooks/useGameLoop';

export const LOTS:Record<string,Vec3>={diner:[-24,0,0],cafe:[-8,0,0],bistro:[24,0,0],shop:[8,0,0],hotel:[-25,0,-28],apartments:[-5,0,-28],park:[25,0,-29]};
const routes:[number,number][][]=[[[-42,10.7],[34,10.7]], [[-43,-9],[34,-9]], [[-43,-39],[34,-39]]];
const colors=['#8f5745','#a87f62','#9b6652','#b3a38a'];

/** Upper-storey details are merged into three meshes instead of hundreds of draw calls. */
function Facade({width=15.2,depth=14.44,levels=2,base=3.95,tint='#95624b',pitched=false,night=false}:{width?:number;depth?:number;levels?:number;base?:number;tint?:string;pitched?:boolean;night?:boolean}){
 const model=useMemo(()=>{
  const trim=new ModelParts(),glass=new ModelParts(),roof=new ModelParts(),height=base+levels*2.8;
  for(let level=0;level<levels;level++){
   const y=base+1.4+level*2.8;
   for(const side of [-1,1]){
    for(let x=-width/2+2;x<width/2-1;x+=3.4){
     glass.box([x,y,side*(depth/2+.035)],[1.25,1.85,.035],(Math.round(x)+level)%3===0?'#938977':'#38434a');
     for(const dx of [-.7,.7])trim.box([x+dx,y,side*(depth/2+.09)],[.09,2.07,.17],'#d2bfa3');
     trim.box([x,y+.98,side*(depth/2+.1)],[1.5,.13,.2],'#d2bfa3');
     trim.box([x,y-.99,side*(depth/2+.18)],[1.62,.16,.4],'#c2b59f');
     trim.box([x,y,side*(depth/2+.075)],[.045,1.85,.06],'#b1aea0');
     trim.box([x,y+.2,side*(depth/2+.075)],[1.25,.05,.06],'#b1aea0');
    }
    for(let z=-depth/2+2;z<depth/2-1;z+=3.4){
     glass.box([side*(width/2+.02),y,z],[.04,1.85,1.25],'#45515a');
     trim.box([side*(width/2+.12),y-.99,z],[.3,.15,1.62],'#c9bca6');
     for(const dz of [-.7,.7])trim.box([side*(width/2+.08),y,z+dz],[.15,2.04,.09],'#c9bca6');
     trim.box([side*(width/2+.08),y+.98,z],[.15,.1,1.5],'#c9bca6');
    }
   }
   trim.box([0,base+level*2.8,0],[width+.22,.13,depth+.22],'#ad9e86');
  }
  trim.box([0,height+.08,0],[width+.55,.24,depth+.5],'#c4b79f');
  if(pitched){
   for(const side of [-1,1])roof.box([side*width/4,height+1.23,0],[width/2+.8,.18,depth+.7],'#4f5255',[0,0,-side*.31]);
   roof.box([0,height+2.45,0],[.3,.15,depth+.75],'#55595b');
  }else{
   roof.box([0,height+.3,0],[width,.18,depth],'#676965');
   for(const z of [-depth/2,depth/2])trim.box([0,height+.55,z],[width,.45,.2],tint);
   for(const x of [-width/2,width/2])trim.box([x,height+.55,0],[.2,.45,depth],tint);
   roof.box([-width*.25,height+.7,-depth*.22],[1.8,.75,1.4],'#95968e');
  }
  trim.box([width*.28,height+1.15,-depth*.2],[.65,1.7,.8],tint);
  return{trim:trim.finish(),glass:glass.finish(),roof:roof.finish()};
 },[width,depth,levels,base,tint,pitched]);
 useEffect(()=>()=>Object.values(model).forEach(g=>g.dispose()),[model]);
 return <group>
  <mesh position={[0,base+levels*1.4,0]} material={getSurfaceMaterial('brick',tint,3,Math.max(1,levels))} castShadow receiveShadow><boxGeometry args={[width,levels*2.8,depth]}/></mesh>
  <mesh geometry={model.trim} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.87}/></mesh>
  <mesh geometry={model.glass}><meshStandardMaterial vertexColors roughness={.25} metalness={.25} emissive={night?'#bfa076':'#000000'} emissiveIntensity={night?.35:0}/></mesh>
  <mesh geometry={model.roof} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.9}/></mesh>
 </group>;
}

function LocalShop({position,name,tint,house=false}:{position:Vec3;name:string;tint:string;house?:boolean}){
 const width=house?10:11,depth=house?10:14;
 return <group position={position}>
  <mesh position={[0,1.8,0]} material={getSurfaceMaterial('brick',tint,2,1)} castShadow receiveShadow><boxGeometry args={[width,3.6,depth]}/></mesh>
  <Facade width={width} depth={depth} levels={house?1:2} base={3.6} tint={tint} pitched={house}/>
  {[-width*.28,width*.28].map(x=><group key={x} position={[x,1.75,depth/2+.045]}>
   <mesh><boxGeometry args={[width*.37,2.3,.12]}/><meshStandardMaterial color="#30393c" roughness={.2} metalness={.3}/></mesh>
   <mesh position={[0,0,.08]}><boxGeometry args={[.07,2.3,.06]}/><meshStandardMaterial color="#baaf9b"/></mesh>
   <mesh position={[0,-1.2,.1]}><boxGeometry args={[width*.4,.15,.35]}/><meshStandardMaterial color="#c3b39a"/></mesh>
  </group>)}
  <mesh position={[0,1.35,depth/2+.1]}><boxGeometry args={[1.25,2.7,.15]}/><meshStandardMaterial color={house?'#595f5b':'#2e3638'}/></mesh>
  {!house&&<>
   <mesh position={[0,3.22,depth/2+.13]}><boxGeometry args={[width-.5,.75,.2]}/><meshStandardMaterial color="#383c39"/></mesh>
   <mesh position={[0,3.22,depth/2+.245]}><planeGeometry args={[width-1.2,.55]}/><meshBasicMaterial transparent map={getSignTexture(name)}/></mesh>
   <mesh position={[0,2.79,depth/2+.75]} rotation={[-.2,0,0]} castShadow><boxGeometry args={[width-.6,.09,1.5]}/><meshStandardMaterial color="#9a9282"/></mesh>
  </>}
 </group>;
}

function Streets({night}:{night:boolean}){
 const details=useMemo(()=>{
  const p=new ModelParts();
  for(const z of [-42,-13,15])for(let x=-57;x<61;x+=5)if(Math.abs(x-40)>6&&Math.abs(x+50)>6)p.box([x,.025,z],[2,.018,.1],'#cec4a6');
  for(const x of [-50,40])for(let z=-67;z<42;z+=5)if(![-42,-13,15].some(v=>Math.abs(v-z)<6))p.box([x,.025,z],[.1,.018,2],'#cec4a6');
  for(const x of [-45,35])for(let i=0;i<8;i++)p.box([x,.04,11.8+i*.83],[2.7,.025,.4],'#d4d0c5');
  for(const x of [-40,-22,-4,14,32]){
   p.branch([x,.1,10],[x,4.4,10],.07,.045,'#414647');
   p.box([x,4.4,10],[.43,.5,.43],'#434948');
   p.box([x,4.4,10],[.36,.35,.45],night?'#f5cc81':'#c5b58f');
  }
  for(const x of [13,27]){
   p.box([x,.65,-21],[2.4,.13,.65],'#8c6d50');p.box([x,.97,-21.3],[2.4,.65,.12],'#8c6d50');
   for(const dx of [-.9,.9])p.box([x+dx,.32,-21],[.07,.64,.5],'#3f4241');
  }
  return p.finish();
 },[night]);
 useEffect(()=>()=>details.dispose(),[details]);
 return <group>
  <mesh position={[0,-.11,0]} rotation={[-Math.PI/2,0,0]} material={getSurfaceMaterial('concrete','#aaa69b',100,100)} receiveShadow><planeGeometry args={[800,800]}/></mesh>
  {[-42,-13,15].map(z=><mesh key={z} position={[0,0,z]} rotation={[-Math.PI/2,0,0]} receiveShadow material={getSurfaceMaterial('asphalt','#4e5256',45,3)}><planeGeometry args={[200,z===15?8.5:7]}/></mesh>)}
  {[-50,40].map(x=><mesh key={x} position={[x,.002,-16]} rotation={[-Math.PI/2,0,0]} receiveShadow material={getSurfaceMaterial('asphalt','#4e5256',3,45)}><planeGeometry args={[8,200]}/></mesh>)}
  {[[ -5,0.02,0,81,21],[ -5,0.02,-28,81,21],[-5,0.02,-58,81,25]].map(([x,y,z,w,d],i)=><mesh key={i} position={[x,y,z]} material={getSurfaceMaterial('concrete','#c3bcb0',w/1.6,d/1.6)} receiveShadow><boxGeometry args={[w,.18,d]}/></mesh>)}
  <mesh geometry={details} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.8}/></mesh>
  {[[-30,12,Math.PI/2],[-2,18,Math.PI/2],[23,-11,-Math.PI/2]].map(([x,z,r],i)=><group key={i} position={[x,.04,z]} rotation={[0,r,0]} scale={.85}><RoundedCarBody3D color={['#8e9189','#4f6571','#826653'][i]} isNight={night} gameSpeed={0} speed={i}/></group>)}
 </group>;
}

type Props={restaurants:Record<string,GameState>;district:ExpansionState;onSelect:(id:string)=>void;night:boolean;speed:number;labels:boolean;inside?:string|null;floor?:number};
export function CozyNeighborhood({restaurants,district,onSelect,night,speed,labels,inside=null,floor=0}:Props){
 return <>
  <Streets night={night}/>
  {PROPERTIES.map(original=>{
   const p:Property={...original,position:LOTS[original.id]},r=restaurants[p.id],active=inside===p.id,b=district.businesses[p.id];
   const height=r?10:p.kind==='park'?4:3.7+(b?.lodging?.openFloors??2)*2.8;
   return <group key={p.id}>
    {r?!active&&<>
     <RestaurantProperty3D p={p} state={r} selected={false} owned labels={false} onSelect={()=>onSelect(p.id)} isNight={night}/>
     <group position={[p.position[0],.13,p.position[2]+1.52]} onClick={e=>{e.stopPropagation();onSelect(p.id);}}><Facade tint={colors[PROPERTIES.indexOf(original)%4]} night={night}/></group>
    </>:p.kind==='park'?!active&&b&&<group position={[p.position[0],.13,p.position[2]]} scale={.75} onClick={e=>{e.stopPropagation();onSelect(p.id);}}><BusinessContents3D p={p} b={b} isNight={night} gameSpeed={speed}/></group>:<UrbanBuilding3D p={p} owned labels={false} selected={false} isNight={night} floorsOverride={b?.lodging?.openFloors??2} cutawayFloor={active?floor:undefined} onSelect={()=>onSelect(p.id)} interactive={!active}/>}
    {!active&&labels&&<Html position={[p.position[0],height+2,p.position[2]+2]} center zIndexRange={[8,1]}><button className="cozy-pin" onClick={()=>onSelect(p.id)}><strong>{p.name}</strong><small>Enter & manage ↗</small></button></Html>}
   </group>;
  })}
  <LocalShop position={[-38,.13,1]} name="KINGSTON BARBER" tint="#98664e"/>
  {[-37,-25,-13,-1,11,23].map((x,i)=><LocalShop key={x} position={[x,.13,-57]} name="" house tint={colors[i%4]}/>)}
  {[[ -44,10],[-16,10],[32,10],[12,-23],[34,-34],[14,-37],[-39,-38],[-15,-38],[1,-38],[-42,-49],[29,-49]].map(([x,z],i)=><StylizedTree3D key={i} position={[x,.13,z]} seed={i+2} scale={i<3?.9:1.25} gameSpeed={speed}/>)}
  <PedestrianCrowd3D routes={routes} count={8} size={.8} gameSpeed={speed}/>
 </>;
}
