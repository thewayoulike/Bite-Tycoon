import {ensureCrew,crewPower} from '../career/crew';
import {propertyById} from '../prototype/expansionModel';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import type {Business} from '../prototype/expansionModel';
import {supermarketNavigation,supermarketProductPoint} from '../empire/supermarketLayout';
import {retailProductFloor} from '../empire/retail';
import {storeLevel} from '../empire/supermarket';
import {lodgingWalkingPath,advanceFloorWalker,walkablePoint} from '../empire/lodgingLayout';
import type {FloorPoint,FloorWalker,LodgingLayout} from '../empire/lodgingLayout';
import {RealCharacter3D} from './RealCharacter3D';
import type {VenueInteraction} from '../prototype/BusinessInterior';
function Walker({layout,target,role,seed,speed,basket=false,onClick}:{layout:LodgingLayout;target:FloorPoint;role:'customer'|'helper'|'cleaner';seed:number;speed:number;basket?:boolean;onClick:()=>void}){
 const root=useRef<THREE.Group>(null),walk=useRef<FloorWalker>({position:{...layout.entrance},path:[],next:0,heading:0}),[moving,setMoving]=useState(false),movingRef=useRef(false);
 useEffect(()=>{if(!walkablePoint(layout,walk.current.position))walk.current.position={...layout.entrance};walk.current.path=lodgingWalkingPath(layout,walk.current.position,target);walk.current.next=0;},[layout,target.x,target.z]);
 useFrame((_,delta)=>{const isMoving=advanceFloorWalker(walk.current,Math.min(.06,delta)*speed*2.8);if(movingRef.current!==isMoving){movingRef.current=isMoving;setMoving(isMoving);}if(root.current){root.current.position.set(walk.current.position.x,0,walk.current.position.z);root.current.rotation.y=walk.current.heading;}});
 return <group ref={root} onClick={e=>{e.stopPropagation();onClick();}}><RealCharacter3D role={role} seed={seed} gameSpeed={speed} isWalking={moving} isWorking={role!=='customer'&&!moving}/>{basket&&<mesh position={[0,.85,.35]}><boxGeometry args={[.48,.3,.3]}/><meshStandardMaterial color="#517264"/></mesh>}</group>;
}
export function SupermarketPeople3D({b,floor,speed,onAction}:{b:Business;floor:number;speed:number;onAction:(a:VenueInteraction,id?:number)=>void}){
 const crew=ensureCrew(propertyById('shop')!,b),hour=(8+(b.venue?.clock??0)*7*24/180)%24,coverage=(role:string)=>crewPower(crew,role,hour,0,floor);
 const layout=useMemo(()=>supermarketNavigation(b,floor),[floor,storeLevel(b),b.retail?.shelves.join('|')]);
 const people=b.venue?.visitors.filter(v=>retailProductFloor(v.productId??'')===floor)??[],queued=people.filter(v=>v.basket),job=b.retail?.store?.job;
 return <group name="supermarket-people">{people.map(v=>{const target=v.state!=='waiting'?layout.entrance:v.basket?layout.queue[Math.max(0,queued.findIndex(q=>q.id===v.id))%layout.queue.length]:supermarketProductPoint(b,v.productId!);return <Walker key={v.id} layout={layout} target={target} role="customer" seed={v.seed} speed={speed} basket={v.basket} onClick={()=>onAction(v.basket?'serve':'run',v.id)}/>;})}
  {layout.staff.slice(0,Math.ceil(coverage(floor===0?'service':'electronics'))).map((pos,i)=><group key={'cashier'+i} position={[pos.x,0,pos.z]} onClick={()=>onAction('staff')}><RealCharacter3D role="cashier" seed={40+i+floor*8} gameSpeed={speed} isWorking={queued.length>0}/></group>)}
  {floor===0&&<>{coverage('care')>0&&<Walker layout={layout} target={job&&b.retail?.store?.jobProgress!<.65?supermarketProductPoint(b,job):layout.care[0]} role="helper" seed={56} speed={speed} onClick={()=>onAction('staff')}/>}{coverage('cleaner')>0&&<Walker layout={layout} target={{x:-2.3,z:Math.floor((b.venue?.clock??0)/8)%2?-4:3}} role="cleaner" seed={58} speed={speed} onClick={()=>onAction('staff')}/>}{coverage('receiving')>0&&<group position={[6.5,0,-6.4]} onClick={()=>onAction('run')}><RealCharacter3D role="helper" seed={57} gameSpeed={speed} isWorking={Object.values(b.retail?.store?.receiving??{}).some(n=>n>0)}/></group>}</>}
  {floor===1&&coverage('electronics')>0&&<Walker layout={layout} target={{x:-2.8,z:3.5}} role="helper" seed={65} speed={speed} onClick={()=>onAction('staff')}/>}
  {floor===1&&coverage('handling')>0&&<Walker layout={layout} target={{x:-6.5,z:-3.8}} role="helper" seed={66} speed={speed} onClick={()=>onAction('run')}/>}
 </group>;
}
