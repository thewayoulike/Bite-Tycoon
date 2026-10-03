import {useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import type {Customer} from '../hooks/useGameLoop';
import {RealCharacter3D} from './RealCharacter3D';
import {diningCastId} from '../characters/gameCast';

/** Uses the reserved central aisle and the clear strip in front of the counter. */
export function PickupGuest3D({customer,gameSpeed}:{customer:Customer;gameSpeed:number}){
 const ref=useRef<THREE.Group>(null),[walking,setWalking]=useState(true);
 const seed=Array.from(customer.id).reduce((n,c)=>((n*31+c.charCodeAt(0))>>>0),0),x=11+(customer.pickupSlot??0)*2.3;
 useFrame((_,delta)=>{
  if(!ref.current||!gameSpeed)return;
  const length=34+x,travel=customer.state==='leaving'?Math.max(0,customer.actionTimer*4):Math.min(length,(customer.pickupElapsed??0)*4);
  const tx=travel<=34?0:Math.min(x,travel-34),tz=travel<=34?27-travel:-7;
  const dx=tx-ref.current.position.x,dz=tz-ref.current.position.z,dist=Math.hypot(dx,dz);
  ref.current.position.x+=dx*Math.min(1,delta*12);ref.current.position.z+=dz*Math.min(1,delta*12);
  if(dist>.05)ref.current.rotation.y=Math.atan2(dx,dz);else ref.current.rotation.y=Math.PI;
  const moving=dist>.1;if(walking!==moving)setWalking(moving);
 });
 return <group ref={ref} position={[0,0,27]}><RealCharacter3D size={2} role="customer" castId={diningCastId(seed,0,1)} seed={seed} color="#597681" gameSpeed={gameSpeed} isWalking={walking}/>{!walking&&customer.state!=='leaving'&&<Html position={[0,4.5,0]} center><span className="rounded bg-white px-2 py-1 text-xs font-bold whitespace-nowrap">Takeaway collection</span></Html>}</group>;
}
