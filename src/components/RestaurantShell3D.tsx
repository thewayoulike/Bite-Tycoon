import {memo,useEffect,useMemo} from 'react';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import {ModelParts} from '../graphics/modelParts';
import {getSignTexture,getSurfaceMaterial} from '../graphics/surfaceMaterials';
import {RestaurantAppearance,restaurantAppearance,propertyInteriorPlacement,RESTAURANT_SHELL} from '../graphics/propertyArchitecture';
import type {Property} from '../prototype/expansionModel';
import type {GameState} from '../hooks/useGameLoop';
import {SnowSurfaceMaterial} from './SnowSurfaceMaterial';
import {architecturalUV,restaurantFinish} from '../graphics/restaurantFinish';

/** One shell for neighborhood, exterior, and cutaway. Only visibility changes. */
export function restaurantShellGeometry(appearance:RestaurantAppearance){
  const sides=new ModelParts(),front=new ModelParts(),sideGlass=new ModelParts(),frontGlass=new ModelParts();
  const sideTrim=new ModelParts(),frontTrim=new ModelParts(),sideInside=new ModelParts(),frontInside=new ModelParts(),finish=restaurantFinish(appearance);
  const designs=[{w:9.6,h:5.8,y:4.9,n:3,small:2},{w:13.5,h:5.8,y:4.9,n:2,small:1},{w:7.1,h:6.2,y:5,n:4,small:2},{w:5.5,h:2.5,y:7.8,n:4,small:2},{w:10.3,h:7,y:4.8,n:3,small:1},{w:0,h:0,y:0,n:0,small:0}];
  const design=designs[appearance.layout%designs.length];
  function wall(model:ModelParts,glass:ModelParts,trim:ModelParts,inside:ModelParts,x:number,z:number,width:number,angle:number){
    const c=Math.cos(angle),s=Math.sin(angle),height=RESTAURANT_SHELL.height;
    const box=(parts:ModelParts,a:number,y:number,k:number,w:number,h:number,d:number,color:string)=>parts.box([x+a*c+k*s,y,z-a*s+k*c],[w,h,d],color,[0,angle,0]);
    const masonry=(a:number,y:number,w:number,h:number)=>{
      box(model,a,y,0,w,h,.5,finish.wall);
      box(inside,a,y,.285,w,h,.06,finish.plaster);
    };
    const n=width>20?design.n:design.small,bottom=design.y-design.h/2,top=design.y+design.h/2;
    // The long facade and shorter entrance bays use the same proportions, never overlapping panes.
    const windowWidth=Math.min(design.w,width/Math.max(1,n)-1.6);
    if(!n)masonry(0,height/2,width,height);
    else{
      masonry(0,bottom/2,width,bottom);masonry(0,(height+top)/2,width,height-top);
      const spacing=width/n,gap=spacing-windowWidth;
      for(let i=0;i<=n;i++){
        const edge=i===0||i===n,w=edge?gap/2:gap,a=i===0?-width/2+w/2:i===n?width/2-w/2:-width/2+i*spacing;
        masonry(a,design.y,w,design.h);
      }
      for(let i=0;i<n;i++){
        const a=-width/2+spacing*(i+.5);
        box(glass,a,design.y,0,windowWidth,design.h,.06,'#c0d0ca');
        for(const side of [-1,1]){
          box(trim,a+side*(windowWidth/2+.1),design.y,0,.2,design.h+.3,.63,finish.frame);
          box(trim,a,design.y+side*(design.h/2+.1),0,windowWidth+.6,.2,.7,finish.frame);
        }
        box(trim,a,design.y,0,.09,design.h,.18,finish.frame);
        box(trim,a,top-1.1,0,windowWidth,.09,.18,finish.frame);
        box(trim,a,bottom-.16,-.12,windowWidth+.8,.2,.95,finish.stone);
      }
    }
    box(trim,0,.55,-.05,width,1.1,.66,finish.stone);
    box(trim,0,.9,.34,width,1.8,.12,finish.frame);
    box(trim,0,1.84,.35,width,.08,.18,finish.brass);
    box(trim,0,9.85,0,width+.3,.28,.85,finish.stone);
    box(trim,0,9.52,-.08,width+.1,.1,.72,finish.brass);
  }
  sideGlass.box([0,0,0],[.001,.001,.001],'#b2c6cc');frontGlass.box([0,0,0],[.001,.001,.001],'#b2c6cc');
  wall(sides,sideGlass,sideTrim,sideInside,0,-15,40,0);wall(sides,sideGlass,sideTrim,sideInside,-20,4,38,Math.PI/2);wall(sides,sideGlass,sideTrim,sideInside,20,4,38,-Math.PI/2);
  wall(front,frontGlass,frontTrim,frontInside,-10.8,23,18.4,Math.PI);wall(front,frontGlass,frontTrim,frontInside,10.8,23,18.4,Math.PI);
  front.box([0,8.3,23],[3.2,3.4,.5],finish.wall);
  frontInside.box([0,8.3,22.72],[3.2,3.4,.06],finish.plaster);
  for(const x of [-1.67,1.67])frontTrim.box([x,3.2,23],[.18,6.4,.55],finish.frame);
  frontTrim.box([0,6.5,23],[3.5,.2,.55],finish.frame);
  frontTrim.box([0,8.45,23.5],[22,1.9,.28],finish.frame);
  for(const y of [7.48,9.42])frontTrim.box([0,y,23.68],[22.2,.07,.08],finish.brass);
  for(const x of [-11,11]){
    frontTrim.box([x,7.05,24.15],[15,.16,2.7],finish.frame,[-.12,0,0]);
    frontTrim.box([x,6.69,25.46],[15,.4,.09],finish.frame);
    frontTrim.box([x,6.48,25.46],[15,.05,.12],finish.stone);
  }
  if(appearance.design==='modern'){
    frontTrim.box([0,9.9,24],[39,.22,2.4],finish.frame);
    for(const x of [-18,-9,9,18])frontTrim.box([x,5,23.5],[.16,10,.18],finish.frame);
  }
  if(appearance.design==='garden'){
    for(let x=-18;x<=18;x+=1.2)frontTrim.box([x,8.9,24],[.16,1.7,2.4],'#92714e');
    for(const x of [-17,17]){frontTrim.box([x,.65,24],[4,1.3,1.3],'#a69a83');for(const dx of [-1.4,-.7,0,.7,1.4])frontTrim.ellipsoid([x+dx,1.6,24],[.65,.55,.6],'#637754');}
  }
  return {sides:architecturalUV(sides.finish()),front:architecturalUV(front.finish()),sideGlass:sideGlass.finish(),frontGlass:frontGlass.finish(),sideTrim:sideTrim.finish(),frontTrim:frontTrim.finish(),sideInside:sideInside.finish(),frontInside:frontInside.finish()};
}

export const RestaurantShell3D=memo(function RestaurantShell3D({appearance,cutaway=false,roof=true,isNight=false,doorOpen=false}:{appearance:RestaurantAppearance;cutaway?:boolean;roof?:boolean;isNight?:boolean;doorOpen?:boolean}){
  const model=useMemo(()=>restaurantShellGeometry(appearance),[appearance.wall,appearance.frame,appearance.layout,appearance.identity,appearance.design]);
  const finish=restaurantFinish(appearance),wallMap=getSurfaceMaterial(finish.surface,'#f6f1e8').map;
  useEffect(()=>()=>Object.values(model).forEach(g=>g.dispose()),[model]);
  return <group name={`restaurant-shell-${appearance.identity}`}>
    <mesh geometry={model.sides} castShadow receiveShadow><SnowSurfaceMaterial map={wallMap} roughness={.88}/></mesh>
    <mesh geometry={model.sideTrim} castShadow receiveShadow><SnowSurfaceMaterial roughness={.65}/></mesh>
    <mesh geometry={model.sideInside} receiveShadow><meshStandardMaterial vertexColors roughness={.88}/></mesh>
    <mesh geometry={model.sideGlass}><meshStandardMaterial vertexColors transparent opacity={.17} roughness={.13} metalness={.22} depthWrite={false}/></mesh>
    {!cutaway&&<group>
      <mesh geometry={model.front} castShadow receiveShadow><SnowSurfaceMaterial map={wallMap} roughness={.88}/></mesh>
      <mesh geometry={model.frontTrim} castShadow receiveShadow><SnowSurfaceMaterial roughness={.65}/></mesh>
      <mesh geometry={model.frontInside} receiveShadow><meshStandardMaterial vertexColors roughness={.88}/></mesh>
      <mesh geometry={model.frontGlass}><meshStandardMaterial vertexColors transparent opacity={.17} roughness={.13} metalness={.22} depthWrite={false}/></mesh>
      <mesh position={[0,8.45,23.66]}><planeGeometry args={[20.5,1.4]}/><meshBasicMaterial map={getSignTexture(appearance.name.toUpperCase())} transparent/></mesh>
      {[-18.9,18.9].map(x=><group key={x} position={[x,5.5,23.6]}>
        <mesh castShadow><boxGeometry args={[.48,1.25,.32]}/><meshStandardMaterial color={finish.frame}/></mesh>
        <mesh position={[0,0,.18]}><boxGeometry args={[.28,.85,.04]}/><meshStandardMaterial color="#f2dfb4" emissive="#ffc885" emissiveIntensity={isNight?2:.25}/></mesh>
      </group>)}
      {[-1,1].map(side=><group key={side} position={[side*1.55,0,23]} rotation={[0,doorOpen?side*Math.PI/2:0,0]}>
        <mesh position={[-side*.77,.62,0]}><boxGeometry args={[1.54,1.24,.12]}/><meshStandardMaterial color={finish.frame}/></mesh>
        <mesh position={[-side*.77,3.7,0]}><boxGeometry args={[1.3,4.9,.06]}/><meshStandardMaterial color="#bacdc7" transparent opacity={.2} roughness={.13} metalness={.2} depthWrite={false}/></mesh>
        {[-.07,-1.47].map(x=><mesh key={x} position={[side*x,3.1,0]}><boxGeometry args={[.14,6.2,.13]}/><meshStandardMaterial color={finish.frame}/></mesh>)}
        <mesh position={[-side*.77,6.13,0]}><boxGeometry args={[1.54,.14,.13]}/><meshStandardMaterial color={finish.frame}/></mesh>
        <mesh position={[-side*1.3,2.8,.16]}><boxGeometry args={[.06,.65,.07]}/><meshStandardMaterial color="#bca279" metalness={.7} roughness={.25}/></mesh>
      </group>)}
    </group>}
    {roof&&<group>
      <mesh position={[0,10.12,4]} castShadow receiveShadow><boxGeometry args={[40.6,.24,38.6]}/><SnowSurfaceMaterial vertexColors={false} map={getSurfaceMaterial('asphalt','#615f5a',8,8).map}/></mesh>
      {[-20.1,20.1].map(x=><mesh key={x} position={[x,10.48,4]} castShadow receiveShadow><boxGeometry args={[.45,.7,39]}/><SnowSurfaceMaterial vertexColors={false} color={finish.stone}/></mesh>)}
      {[-15.2,23.2].map(z=><mesh key={z} position={[0,10.48,z]} castShadow receiveShadow><boxGeometry args={[40.6,.7,.45]}/><SnowSurfaceMaterial vertexColors={false} color={finish.stone}/></mesh>)}
      <mesh position={[0,10.48,5]}><boxGeometry args={[10,.5,13]}/><meshStandardMaterial color={finish.frame}/></mesh>
      <mesh position={[0,10.76,5]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[9.5,12.5]}/><meshStandardMaterial color="#90aba7" metalness={.42} roughness={.18}/></mesh>
      {[-3,0,3].map(z=><mesh key={z} position={[0,10.8,5+z]}><boxGeometry args={[9.6,.07,.09]}/><meshStandardMaterial color={finish.frame}/></mesh>)}
      <mesh position={[-9,10.7,-5]} castShadow><boxGeometry args={[4,1.05,3]}/><meshStandardMaterial color="#909796" roughness={.7}/></mesh>
      <mesh position={[10,10.9,-8]} castShadow><cylinderGeometry args={[.45,.45,1.5,10]}/><meshStandardMaterial color="#888b86" metalness={.3}/></mesh>
    </group>}
  </group>;
});

export function RestaurantProperty3D({p,state,selected,owned,labels,onSelect,isNight=false}:{p:Property;state?:Partial<Pick<GameState,'restaurantIdentity'|'wallColor'|'frameColor'|'restaurantLayout'>>;selected:boolean;owned:boolean;labels:boolean;onSelect:()=>void;isNight?:boolean}){
  const placement=propertyInteriorPlacement(p),appearance=restaurantAppearance(p.id,state,p);
  return <group position={placement.position} scale={placement.scale} onClick={event=>{event.stopPropagation();if(event.delta<=5)onSelect();}}>
    <mesh position={[0,-.1,4]} receiveShadow><boxGeometry args={[40,.2,38]}/><meshStandardMaterial color="#b9aa94"/></mesh>
    <RestaurantShell3D appearance={appearance} isNight={isNight}/>
    {labels&&<Html position={[0,14,4]} center zIndexRange={[4,0]}><button className={`map-pin ${selected?'selected':''}`} aria-label={`Select ${p.name}`} onClick={event=>{event.stopPropagation();onSelect();}}><span className={owned?'owned-dot':'available-dot'}/>{p.name}<small>{owned?'Your business':'Available'}</small></button></Html>}
  </group>;
}
