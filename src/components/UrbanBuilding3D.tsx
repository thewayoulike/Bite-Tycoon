import {memo,useEffect,useMemo} from 'react';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import type {Property} from '../prototype/expansionModel';
import {ModelParts,seededRandom} from '../graphics/modelParts';
import {getSurfaceMaterial,getSignTexture,getContactShadow} from '../graphics/surfaceMaterials';
import {urbanBuildingProfile} from '../graphics/propertyArchitecture';

type Props={p:Property;selected:boolean;owned:boolean;onSelect:()=>void;interactive?:boolean;labels?:boolean;isNight?:boolean;floorsOverride?:number;background?:boolean;cutawayFloor?:number};
/** Recessed bays, thin frames, shopfronts and roof equipment, batched by material. */
export const UrbanBuilding3D=memo(function UrbanBuilding3D({p,selected,owned,onSelect,interactive=true,labels=true,isNight=false,floorsOverride,background=false,cutawayFloor}:Props){
 const {seed,cutaway,groundHeight,floors,height,modern,hotel,residential,mansard,style,scale}=urbanBuildingProfile(p,{background,floorsOverride,cutawayFloor});
 const halfWidth=6.7,halfDepth=6.1;
 const model=useMemo(()=>{
  const stone=new ModelParts(),metal=new ModelParts(),glass=new ModelParts(),rooms=new ModelParts(),lit=new ModelParts();
  const random=seededRandom(seed),frame=style.frame;
  // Dark recesses create depth; glazing and slender frames sit just ahead of them.
  function windowBay(x:number,y:number,z:number,w:number,h:number,side=false){
   const outward=side?Math.sign(x):Math.sign(z);
   const box=(parts:ModelParts,dx:number,dy:number,dz:number,a:number,b:number,c:number,color:string)=>parts.box(side?[x+dz*outward,y+dy,z+dx]:[x+dx,y+dy,z+dz*outward],side?[c,b,a]:[a,b,c],color);
   box(rooms,0,0,0,w+.22,h+.22,.06,'#25292b');
   const pane=random()>.4?'#66727a':'#46535b';
   box(glass,0,0,.032,w-.08,h-.08,.04,pane);
   for(const sign of [-1,1]){
    box(metal,sign*w/2,0,.105,.065,h+.06,.09,frame);
    box(metal,0,sign*h/2,.105,w+.08,.065,.09,frame);
   }
   box(metal,0,0,.11,.048,h,.06,frame);
   box(metal,0,-h*.12,.11,w,.045,.06,frame);
   box(stone,0,-h/2-.12,.1,w+.36,.13,.38,style.trim);
   box(stone,0,h/2+.16,.055,w+.32,.19,.17,style.trim);
   if(random()>.53){ // Uneven blinds and occupied windows, rather than identical blue panels.
    const blind=.2+random()*.55;
    box(rooms,0,h/2-blind/2-.035,.075,w-.16,blind,.012,'#a39d8e');
   }
   if(random()>.64)box(lit,w*.22,-h*.18,.08,w*.34,h*.43,.012,'#c4b295');
  }
  for(let level=0;level<floors;level++){
   const y=groundHeight+1.35+level*2.85;
   for(const x of [-4.7,-1.57,1.57,4.7])windowBay(x,y,halfDepth+.018,modern?2.35:1.5,1.92);
   for(const x of [-4.7,-1.57,1.57,4.7])windowBay(-x,y,-halfDepth-.15,1.5,1.92);
   for(const side of [-1,1])for(const z of [-4,-.4,3.2])windowBay(side*(halfWidth+.018),y,z,1.55,1.92,true);
   // Floor bands are subtle masonry courses, not thick white outlines.
   stone.box([0,groundHeight-.17+level*2.85,halfDepth+.045],[13.45,.12,.12],style.trim);
   if(residential&&level<floors){
    for(const x of [-3.15,3.15]){
     const base=groundHeight+.13+level*2.85;
     stone.box([x,base,6.68],[4.8,.16,1.25],'#8c877e');
     metal.box([x,base+1,7.23],[4.8,.045,.05],frame);
     for(let i=0;i<13;i++)metal.box([x-2.28+i*.38,base+.5,7.23],[.03,1,.03],frame);
    }
   }
  }
  // Shopfront: plinth, recessed door, window mullions and visible display shelves.
  stone.box([0,.36,6.15],[13.4,.58,.2],modern?'#55575a':style.trim);
  for(const x of [-4.35,-1.8,1.8,4.35]){
   rooms.box([x,1.65,6.145],[2.35,2.15,.05],'#242b2c');
   glass.box([x,1.65,6.19],[2.24,2.08,.035],'#43545c');
   metal.box([x-1.16,1.7,6.25],[.075,2.6,.08],frame);
   metal.box([x,2.44,6.25],[2.38,.055,.08],frame);
   metal.box([x,1.03,6.25],[2.38,.06,.08],frame);
   rooms.box([x,1.02,6.235],[2.15,.075,.02],'#88745d');
   for(let k=0;k<4;k++)rooms.box([x-.77+k*.5,1.22,6.238],[.24,.34+random()*.2,.018],['#9e8b6e','#aeaa98','#8b7361'][k%3]);
  }
  rooms.box([0,1.5,6.145],[1.4,2.9,.06],'#20272a');
  metal.box([-.7,1.5,6.26],[.09,2.9,.13],frame);metal.box([.7,1.5,6.26],[.09,2.9,.13],frame);
  metal.box([0,2.9,6.26],[1.5,.09,.13],frame);metal.box([.45,1.4,6.3],[.035,.45,.035],'#b3a184');
  stone.box([0,.12,6.43],[1.8,.12,.65],'#a39e93');
  // Masonry corners, drains and low parapets; rooftop plant replaces repeated cubes.
  for(const x of [-6.58,6.58])metal.box([x,height/2,6.21],[.065,height,.075],'#55544e');
  if(!cutaway){
  for(const z of [-6.1,6.1])stone.box([0,height+.33,z],[13.55,.6,.2],style.wall);
  for(const x of [-6.7,6.7])stone.box([x,height+.33,0],[.2,.6,12.2],style.wall);
  for(const z of [-6.1,6.1])metal.box([0,height+.66,z],[13.65,.055,.27],'#78776f');
  for(const x of [-6.7,6.7])metal.box([x,height+.66,0],[.27,.055,12.2],'#78776f');
  metal.box([-2.7,height+.53,-2],[2.1,.85,1.35],'#7c8080');
  for(let i=0;i<9;i++)metal.box([-3.53+i*.2,height+.55,-1.31],[.04,.6,.025],'#42494c');
  metal.branch([1.5,height+.1,-3.4],[1.5,height+1.1,-3.4],.19,.19,'#777c7e');
  metal.box([1.5,height+1.12,-3.4],[.58,.08,.58],'#686d70');
  }
  if(hotel){
   metal.box([0,groundHeight-.12,7],[5.8,.17,2.4],'#343a3e');
   for(const x of [-2.7,2.7])metal.box([x,(groundHeight-.12)/2,8],[.09,groundHeight-.12,.09],'#aa9270');
   rooms.box([0,.12,7.2],[2.1,.025,2.2],'#58423a');
  }else if(p.id==='cafe'||p.id==='bistro'||p.id==='diner'){
   // Individual canvas awnings leave the brick facade visible.
   for(const x of [-3.4,3.4])for(let i=0;i<8;i++)stone.box([x-2.03+i*.58,2.82,6.8],[.58,.065,1.45],i%2?'#b3a893':p.id==='bistro'?'#494b40':'#474b4c',[-.12,0,0]);
  }
  if(mansard&&!cutaway)for(const x of [-4,0,4]){
   stone.box([x,height+1.15,5.4],[1.6,1.5,.7],style.trim);
   glass.box([x,height+1.17,5.77],[1.22,1.14,.04],'#45545e');
   metal.box([x,height+1.17,5.805],[.045,1.14,.04],style.frame);
   metal.box([x,height+1.96,5.4],[1.78,.1,.9],'#444b50');
  }
  // Air-conditioning units on the less prominent side wall.
  if(!hotel)for(let y=4;y<height;y+=5.7){metal.box([6.91,y,-3],[.45,.65,1],'#91928b');for(let i=0;i<5;i++)metal.box([7.15,y-.23+i*.1,-3],[.02,.025,.78],'#515859');}
  lit.box([0,2.7,6.25],[1.2,.12,.05],'#c4b295');
  return {stone:stone.finish(),metal:metal.finish(),glass:glass.finish(),rooms:rooms.finish(),lit:lit.finish()};
 },[seed,floors,height,modern,hotel,residential,mansard,p.id,style,cutaway,groundHeight]);
 useEffect(()=>()=>Object.values(model).forEach(g=>g.dispose()),[model]);
 return <group position={p.position} scale={scale} onClick={e=>{if(interactive){e.stopPropagation();onSelect();}}}>
  <mesh position={[0,.102,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[17.2,16]}/><meshBasicMaterial map={getContactShadow()} transparent opacity={.48} depthWrite={false}/></mesh>
  <mesh position={[0,height/2,0]} material={getSurfaceMaterial(style.surface,style.wall,3.6,height/2.4)} castShadow receiveShadow><boxGeometry args={[13.4,height,12.2]}/></mesh>
  {!cutaway&&<mesh position={[0,height+.04,0]} material={getSurfaceMaterial('asphalt','#555354',4,4)} receiveShadow><boxGeometry args={[13.2,.1,12]}/></mesh>}
  {mansard&&!cutaway&&<group position={[0,height+1.3,0]} scale={[9.48,1,8.63]}><mesh rotation={[0,Math.PI/4,0]} castShadow receiveShadow material={getSurfaceMaterial('asphalt','#44494d',6,2)}><cylinderGeometry args={[.64,1,2.2,4,1,true]}/></mesh></group>}
  {mansard&&<mesh position={[0,height+2.41,0]}><boxGeometry args={[8.58,.08,7.82]}/><meshStandardMaterial color="#4e5354" roughness={.9}/></mesh>}
  <mesh geometry={model.stone} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.89}/></mesh>
  <mesh geometry={model.metal} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.5} metalness={.28}/></mesh>
  <mesh geometry={model.rooms}><meshStandardMaterial vertexColors roughness={.87}/></mesh>
  <mesh geometry={model.glass}><meshStandardMaterial vertexColors roughness={.24} metalness={.35} envMapIntensity={.65}/></mesh>
  <mesh geometry={model.lit}><meshStandardMaterial vertexColors roughness={.8} emissive={isNight?'#efc28b':'#000000'} emissiveIntensity={isNight?.65:0}/></mesh>
  <mesh position={[0,groundHeight-.27,hotel?8.22:6.24]}><boxGeometry args={[hotel?6:12.6,.48,.12]}/><meshStandardMaterial color={modern?'#353b40':hotel?'#554c43':'#383f3d'} roughness={.75}/></mesh>
  <mesh position={[0,groundHeight-.26,hotel?8.288:6.308]}><planeGeometry args={[hotel?5.5:11.8,.4]}/><meshBasicMaterial map={getSignTexture(p.name.toUpperCase())} transparent depthWrite={false}/></mesh>
  {selected&&<mesh position={[0,.11,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[14.5,14]}/><meshBasicMaterial color="#c4ac72" transparent opacity={.2} depthWrite={false}/></mesh>}
  {interactive&&labels&&<Html position={[0,height+1.4,0]} center zIndexRange={[4,0]}><button className={`map-pin ${selected?'selected':''}`} onClick={e=>{e.stopPropagation();onSelect();}} aria-label={`Select ${p.name}`}><span className={owned?'owned-dot':'available-dot'}/>{p.name}<small>{owned?'Your business':'Available'}</small></button></Html>}
 </group>;
});
