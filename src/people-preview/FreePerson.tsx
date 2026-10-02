import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useLoader} from '@react-three/fiber';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import * as THREE from 'three';
import {createPreviewRig,PersonModel,PersonPose,PersonRole} from './rig';
import {FoodPlate3D} from '../components/FoodPlate3D';

export function FreePerson({model='eric',role='customer',pose='idle',position=[0,0,0],rotation=0,paused=false,phase=0}:{model?:PersonModel;role?:PersonRole;pose?:PersonPose;position?:[number,number,number];rotation?:number;paused?:boolean;phase?:number}){
 const source=useLoader(FBXLoader,`/models/people-preview/${model}.fbx`),texture=useLoader(THREE.TextureLoader,`/models/people-preview/${model}.jpg`);
 const material=useMemo(()=>{texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return new THREE.MeshStandardMaterial({map:texture,roughness:.85});},[texture]);
 const rig=useMemo(()=>createPreviewRig(source,material),[source,material]);
 const elapsed=useRef(phase),root=useRef<THREE.Group>(null),hand=useRef<THREE.Group>(null),head=useRef<THREE.Group>(null);
 const tmp=useMemo(()=>new THREE.Vector3(),[]),inverse=useMemo(()=>new THREE.Matrix4(),[]);
 useEffect(()=>()=>{rig.dispose();material.dispose();},[rig,material]);
 useFrame((_,dt)=>{
  if(!paused)elapsed.current+=Math.min(dt,.05);
  rig.pose(role,pose,elapsed.current);
  if(root.current){root.current.updateWorldMatrix(true,false);inverse.copy(root.current.matrixWorld).invert();
   if(hand.current){rig.bones[role==='waiter'?'hand_l':'hand_r'].getWorldPosition(tmp);hand.current.position.copy(tmp.applyMatrix4(inverse));}
   if(head.current){rig.bones.head.getWorldPosition(tmp);head.current.position.copy(tmp.applyMatrix4(inverse));}
  }
 });
 const seated=pose==='sit'||pose==='eat',working=pose==='work';
 return <group ref={root} position={position} rotation={[0,rotation,0]}>
  <group position={[0,rig.baseY,0]} scale={rig.scale}><primitive object={rig.object} dispose={null}/></group>
  {role==='chef'&&!seated&&<><group ref={head}><mesh position={[0,.23,.015]} castShadow><cylinderGeometry args={[.13,.12,.12,20]}/><meshStandardMaterial color="#fbf8f0"/></mesh><mesh position={[0,.32,.015]} scale={[1,.65,1]} castShadow><sphereGeometry args={[.155,20,12]}/><meshStandardMaterial color="#fbf8f0"/></mesh></group><mesh position={[0,1.12,.168]} castShadow><boxGeometry args={[.32,.58,.015]}/><meshStandardMaterial color="#e5dac3" roughness={1}/></mesh></>}
  {role==='waiter'&&(working||pose==='walk')&&<group ref={hand}><mesh position={[0,.02,.01]} castShadow><cylinderGeometry args={[.24,.24,.025,24]}/><meshStandardMaterial color="#414348" metalness={.65} roughness={.3}/></mesh><group position={[0,.04,.01]}><FoodPlate3D recipeId="burger_classic" scale={.42}/></group></group>}
  {role==='helper'&&working&&<mesh position={[0,1,.43]} castShadow><boxGeometry args={[.46,.35,.32]}/><meshStandardMaterial color="#ae8459"/></mesh>}
  {role==='maintenance'&&working&&<group ref={hand}><mesh rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.025,.025,.19,8]}/><meshStandardMaterial color="#cf8a31"/></mesh></group>}
  {['cleaner','gardener'].includes(role)&&working&&<group position={[0,0,.65]}><mesh position={[0,.58,0]} rotation={[.12,0,-.1]} castShadow><cylinderGeometry args={[.015,.015,1.2,10]}/><meshStandardMaterial color="#a2a8a4" metalness={.55}/></mesh><mesh position={[.06,.03,-.07]} castShadow><boxGeometry args={[.35,.06,.15]}/><meshStandardMaterial color={role==='gardener'?'#6b5130':'#a2b8b4'}/></mesh></group>}
 </group>;
}
