import {memo,useEffect,useMemo} from 'react';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import {ModelParts} from '../graphics/modelParts';
import {getSignTexture,getSurfaceMaterial} from '../graphics/surfaceMaterials';
import {RestaurantAppearance,restaurantAppearance,propertyInteriorPlacement,RESTAURANT_SHELL} from '../graphics/propertyArchitecture';
import type {Property} from '../prototype/expansionModel';
import type {GameState} from '../hooks/useGameLoop';
import {SnowSurfaceMaterial} from './SnowSurfaceMaterial';

/** One shell for neighborhood, exterior, and cutaway. Only visibility changes. */
export function restaurantShellGeometry(appearance:RestaurantAppearance){
  const sides=new ModelParts(),front=new ModelParts(),sideGlass=new ModelParts(),frontGlass=new ModelParts();
  const designs=[{w:5.5,h:5.2,y:5.4,n:3,small:1},{w:7.5,h:5.5,y:5.2,n:2,small:1},{w:4.8,h:6.2,y:5,n:4,small:2},{w:5.5,h:2.5,y:7.8,n:4,small:2},{w:8,h:7,y:4.8,n:3,small:1},{w:0,h:0,y:0,n:0,small:0}];
  const design=designs[appearance.layout%designs.length];
  function wall(model:ModelParts,glass:ModelParts,x:number,z:number,width:number,angle:number){
    const c=Math.cos(angle),s=Math.sin(angle),height=RESTAURANT_SHELL.height;
    const box=(parts:ModelParts,a:number,y:number,k:number,w:number,h:number,d:number,color:string)=>parts.box([x+a*c+k*s,y,z-a*s+k*c],[w,h,d],color,[0,angle,0]);
    const n=width>20?design.n:design.small,bottom=design.y-design.h/2,top=design.y+design.h/2;
    if(!n)box(model,0,height/2,0,width,height,.5,appearance.wall);
    else{
      box(model,0,bottom/2,0,width,bottom,.5,appearance.wall);box(model,0,(height+top)/2,0,width,height-top,.5,appearance.wall);
      const spacing=width/n,gap=spacing-design.w;
      for(let i=0;i<=n;i++){
        const edge=i===0||i===n,w=edge?gap/2:gap,a=i===0?-width/2+w/2:i===n?width/2-w/2:-width/2+i*spacing;
        box(model,a,design.y,0,w,design.h,.5,appearance.wall);
      }
      for(let i=0;i<n;i++){
        const a=-width/2+spacing*(i+.5);
        box(glass,a,design.y,0,design.w,design.h,.08,'#b2c6cc');
        for(const side of [-1,1]){
          box(model,a+side*(design.w/2+.13),design.y,0,.26,design.h+.3,.65,appearance.frame);
          box(model,a,design.y+side*(design.h/2+.12),0,design.w+.7,.24,.75,appearance.frame);
          // Curtains remain inside the same window frame in every view.
          box(model,a+side*(design.w/2-.25),design.y,.28,.45,design.h,.1,appearance.identity==='cafe'?'#b9b098':'#9c7564');
          box(model,a,design.y+side*design.h/4,0,design.w,.08,.16,appearance.frame);
        }
        for(const dx of [-design.w/4,0,design.w/4])box(model,a+dx,design.y,0,.09,design.h,.16,appearance.frame);
      }
    }
    box(model,0,.95,0,width,1.8,.57,appearance.frame);box(model,0,1.92,0,width+.1,.12,.68,'#b4a184');
    box(model,0,9.84,0,width+.15,.32,.68,appearance.frame);
  }
  sideGlass.box([0,0,0],[.001,.001,.001],'#b2c6cc');frontGlass.box([0,0,0],[.001,.001,.001],'#b2c6cc');
  wall(sides,sideGlass,0,-15,40,0);wall(sides,sideGlass,-20,4,38,Math.PI/2);wall(sides,sideGlass,20,4,38,-Math.PI/2);
  wall(front,frontGlass,-10.8,23,18.4,Math.PI);wall(front,frontGlass,10.8,23,18.4,Math.PI);
  front.box([0,8.3,23],[3.2,3.4,.5],appearance.wall);
  for(const x of [-1.67,1.67])front.box([x,3.2,23],[.18,6.4,.55],appearance.frame);
  front.box([0,6.5,23],[3.5,.2,.55],appearance.frame);
  front.box([0,8.25,23.5],[14,1.5,.22],appearance.frame);
  for(const x of [-10.5,10.5])front.box([x,7.2,24.15],[8.2,.18,2.7],appearance.identity==='bistro'?'#687252':appearance.identity==='cafe'?'#8d9479':'#8f5b4a',[-.1,0,0]);
  if(appearance.design==='modern'){
    front.box([0,9.9,24],[39,.22,2.4],appearance.frame);
    for(const x of [-18,-9,9,18])front.box([x,5,23.5],[.16,10,.18],appearance.frame);
  }
  if(appearance.design==='garden'){
    for(let x=-18;x<=18;x+=1.2)front.box([x,8.9,24],[.16,1.7,2.4],'#92714e');
    for(const x of [-17,17]){front.box([x,.65,24],[4,1.3,1.3],'#a69a83');for(const dx of [-1.4,-.7,0,.7,1.4])front.ellipsoid([x+dx,1.6,24],[.65,.55,.6],'#637754');}
  }
  return {sides:sides.finish(),front:front.finish(),sideGlass:sideGlass.finish(),frontGlass:frontGlass.finish()};
}

export const RestaurantShell3D=memo(function RestaurantShell3D({appearance,cutaway=false,roof=true,isNight=false,doorOpen=false}:{appearance:RestaurantAppearance;cutaway?:boolean;roof?:boolean;isNight?:boolean;doorOpen?:boolean}){
  const model=useMemo(()=>restaurantShellGeometry(appearance),[appearance.wall,appearance.frame,appearance.layout,appearance.identity,appearance.design]);
  useEffect(()=>()=>Object.values(model).forEach(g=>g.dispose()),[model]);
  return <group name={`restaurant-shell-${appearance.identity}`}>
    <mesh geometry={model.sides} castShadow receiveShadow><SnowSurfaceMaterial roughness={.8}/></mesh>
    <mesh geometry={model.sideGlass}><meshStandardMaterial vertexColors transparent opacity={.45} roughness={.15} metalness={.2} depthWrite={false}/></mesh>
    {!cutaway&&<group>
      <mesh geometry={model.front} castShadow receiveShadow><SnowSurfaceMaterial roughness={.8}/></mesh>
      <mesh geometry={model.frontGlass}><meshStandardMaterial vertexColors transparent opacity={.45} roughness={.15} metalness={.2} depthWrite={false}/></mesh>
      <mesh position={[0,8.25,23.63]}><planeGeometry args={[13,1.05]}/><meshBasicMaterial map={getSignTexture(appearance.name.toUpperCase())} transparent/></mesh>
      {[-1,1].map(side=><group key={side} position={[side*1.55,0,23]} rotation={[0,doorOpen?side*Math.PI/2:0,0]}>
        <mesh position={[-side*.77,3.1,0]}><boxGeometry args={[1.54,6.2,.12]}/><meshStandardMaterial color={appearance.frame}/></mesh>
        <mesh position={[-side*.77,3.55,.08]}><boxGeometry args={[1.3,4.4,.05]}/><meshStandardMaterial color={isNight?'#d8c9a2':'#a3bcc7'} transparent opacity={.5} roughness={.18}/></mesh>
        <mesh position={[-side*1.3,2.8,.16]}><boxGeometry args={[.06,.65,.07]}/><meshStandardMaterial color="#bca279" metalness={.7} roughness={.25}/></mesh>
      </group>)}
    </group>}
    {roof&&<group>
      <mesh position={[0,10.12,4]} castShadow receiveShadow><boxGeometry args={[40.6,.24,38.6]}/><SnowSurfaceMaterial vertexColors={false} map={getSurfaceMaterial('asphalt','#615f5a',8,8).map}/></mesh>
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
