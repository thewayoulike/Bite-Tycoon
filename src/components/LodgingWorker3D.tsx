import {useEffect,useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {FloorWalker,LodgingLayout,lodgingWalkingPath,advanceFloorWalker} from '../empire/lodgingLayout';
import {RealCharacter3D} from './RealCharacter3D';

/** Staff use the same collision map and lift transitions as guests. */
export function LodgingWorker3D({layouts,floor,unit,role,seed,speed,onClick}:{layouts:LodgingLayout[];floor:number;unit:number;role:'cleaner'|'maintenance'|'receptionist';seed:number;speed:number;onClick:()=>void}){
 const targetFloor=unit<0?0:1+Math.floor(unit/(layouts[0].kind==='hotel'?4:3));
 const currentFloor=useRef(0),root=useRef<THREE.Group>(null),walker=useRef<FloorWalker>({position:{...layouts[0].elevator},heading:0,path:[],next:0});
 const walkingRef=useRef(false),[walking,setWalking]=useState(false);
 const route=()=>{const layout=layouts[currentFloor.current],target=currentFloor.current===targetFloor?(unit<0?{x:3,z:-4.7}:layout.rooms.find(r=>r.index===unit)?.door??layout.elevator):layout.elevator;walker.current.path=lodgingWalkingPath(layout,walker.current.position,target);walker.current.next=0;};
 useEffect(()=>{route();},[layouts,targetFloor,unit]);
 useFrame((_,delta)=>{
  const elapsed=Math.min(delta,.06)*speed,moved=advanceFloorWalker(walker.current,elapsed*2.25);
  if(currentFloor.current!==targetFloor&&Math.hypot(walker.current.position.x-layouts[currentFloor.current].elevator.x,walker.current.position.z-layouts[currentFloor.current].elevator.z)<.05){currentFloor.current=targetFloor;walker.current.position={...layouts[targetFloor].elevator};route();}
  if(walkingRef.current!==moved){walkingRef.current=moved;setWalking(moved);}
  if(root.current){root.current.visible=currentFloor.current===floor;root.current.position.set(walker.current.position.x,0,walker.current.position.z);root.current.rotation.y=walker.current.heading;}
 });
 return <group ref={root} visible={floor===0} onClick={e=>{e.stopPropagation();onClick();}}><RealCharacter3D role={role} seed={seed} gameSpeed={speed} isWalking={walking} isWorking={unit>=0&&!walking}/></group>;
}
