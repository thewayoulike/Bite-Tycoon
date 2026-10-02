import {useEffect,useMemo,useRef} from 'react';
import {useFrame,useLoader} from '@react-three/fiber';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import {createPreviewRig,PersonPose,PersonRole} from './rig';
import {FoodPlate3D} from '../components/FoodPlate3D';
import {CAST_BY_ID} from './cast';

export function CastPerson({id,role='customer',pose='idle',paused=false,phase=0,position=[0,0,0],rotation=0}:{id:string;role?:PersonRole;pose?:PersonPose;paused?:boolean;phase?:number;position?:[number,number,number];rotation?:number}){
 const gltf=useLoader(GLTFLoader,`/models/people-preview/cast/${id}.glb?v=${CAST_BY_ID.get(id)?.assetVersion??'v1'}`);
 const rig=useMemo(()=>createPreviewRig(gltf.scene,undefined,true),[gltf]);
 const elapsed=useRef(phase),root=useRef<THREE.Group>(null),hand=useRef<THREE.Group>(null),hat=useRef<THREE.Group>(null);
 const v=useMemo(()=>new THREE.Vector3(),[]),inverse=useMemo(()=>new THREE.Matrix4(),[]);
 useEffect(()=>()=>rig.dispose(),[rig]);
 useFrame((_,dt)=>{
  if(!paused)elapsed.current+=Math.min(dt,.05);
  rig.pose(role,pose,elapsed.current);
  if(root.current){root.current.updateWorldMatrix(true,false);inverse.copy(root.current.matrixWorld).invert();
   if(hand.current){rig.bones.hand_l.getWorldPosition(v);hand.current.position.copy(v.applyMatrix4(inverse));}
   if(hat.current){rig.bones.head.getWorldPosition(v);hat.current.position.copy(v.applyMatrix4(inverse));}
  }
 });
 const working=pose==='work',standing=pose!=='sit'&&pose!=='eat';
 return <group ref={root} position={position} rotation={[0,rotation,0]}>
  <group position={[0,rig.baseY,0]} scale={rig.scale}><primitive object={rig.object} dispose={null}/></group>
  {role==='waiter'&&(working||pose==='walk')&&<group ref={hand}><mesh position={[0,.015,.02]} castShadow><cylinderGeometry args={[.23,.23,.02,24]}/><meshStandardMaterial color="#555856" roughness={.3} metalness={.6}/></mesh><group position={[0,.03,.02]}><FoodPlate3D recipeId="burger_classic" scale={.4}/></group></group>}
  {role==='chef'&&standing&&<group ref={hat}><mesh position={[0,.21,.02]} castShadow><cylinderGeometry args={[.135,.13,.15,20]}/><meshStandardMaterial color="#f4eddf"/></mesh><mesh position={[0,.3,.02]} scale={[1,.6,1]} castShadow><sphereGeometry args={[.16,20,12]}/><meshStandardMaterial color="#f4eddf"/></mesh></group>}
  {role==='helper'&&working&&<mesh position={[0,1,.4]} castShadow><boxGeometry args={[.47,.32,.33]}/><meshStandardMaterial color="#af885b"/></mesh>}
  {['cleaner','gardener'].includes(role)&&working&&<group position={[0,0,.62]}><mesh position={[0,.6,0]} castShadow><cylinderGeometry args={[.015,.015,1.2,10]}/><meshStandardMaterial color="#a7b0aa" metalness={.5}/></mesh><mesh position={[0,.03,0]} castShadow><boxGeometry args={[.32,.06,.17]}/><meshStandardMaterial color="#9fb5ab"/></mesh></group>}
 </group>;
}
