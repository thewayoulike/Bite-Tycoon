import * as THREE from 'three';
import {clone} from 'three/examples/jsm/utils/SkeletonUtils.js';

export type PersonRole='customer'|'waiter'|'chef'|'cleaner'|'helper'|'receptionist'|'maintenance'|'cashier'|'gardener';
export type PersonPose='idle'|'walk'|'sit'|'eat'|'work'|'sleep';
export type PersonModel='eric'|'carla'|'claudia';
export interface CastPoseOptions { carryTray?:boolean; takingOrder?:boolean; holdMenu?:boolean; holdPhone?:boolean; seatHeight?:number }
export function createPreviewRig(source:THREE.Group, material?:THREE.Material, preserveHeight=false){
 const object=clone(source) as THREE.Group;
 object.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(object),height=bounds.max.y-bounds.min.y;
 const scale=preserveHeight?1:1.82/height;
 const bones:Record<string,THREE.Bone>={},rest:Record<string,{q:THREE.Quaternion;world:THREE.Quaternion;position:THREE.Vector3;direction:THREE.Vector3}>={};
 object.traverse(n=>{
  if((n as THREE.Mesh).isMesh){const mesh=n as THREE.SkinnedMesh;if(material)mesh.material=material;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;}
  if((n as THREE.Bone).isBone)bones[n.name]=n as THREE.Bone;
 });
 for(const [alias,name] of Object.entries({root:'Root',hip:'pelvis',upperleg_l:'thigh_l',upperleg_r:'thigh_r',lowerleg_l:'calf_l',lowerleg_r:'calf_r'}))if(!bones[alias]&&bones[name])bones[alias]=bones[name];
 for(const [name,bone] of Object.entries(bones)){
  const child=bone.children.find(n=>(n as THREE.Bone).isBone);
  rest[name]={q:bone.quaternion.clone(),world:bone.getWorldQuaternion(new THREE.Quaternion()),position:bone.position.clone(),direction:child?child.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3())).normalize():new THREE.Vector3(0,1,0)};
 }
 const hipHeight=bones.hip.getWorldPosition(new THREE.Vector3()).y,basePositionY=object.position.y;
 const parentQ=new THREE.Quaternion(),modelQ=new THREE.Quaternion(),desiredQ=new THREE.Quaternion(),direction=new THREE.Vector3(),deltaQ=new THREE.Quaternion();
 function aim(name:string,x:number,y:number,z:number){
  const bone=bones[name],bind=rest[name];if(!bone||!bind)return;
  direction.set(x,y,z).normalize();deltaQ.setFromUnitVectors(bind.direction,direction);
  desiredQ.copy(modelQ).multiply(deltaQ).multiply(bind.world);
  bone.parent!.getWorldQuaternion(parentQ).invert();bone.quaternion.copy(parentQ).multiply(desiredQ);bone.updateMatrixWorld(true);
 }
 function flatFoot(name:string){const bone=bones[name];if(!bone)return;bone.parent!.getWorldQuaternion(parentQ).invert();bone.quaternion.copy(parentQ).multiply(modelQ).multiply(rest[name].world);bone.updateMatrixWorld(true);}
 const headTopOffset=bounds.max.y-bones.head.getWorldPosition(new THREE.Vector3()).y;
 return {object,scale,bones,headTopOffset,hipHeight,baseY:-bounds.min.y*scale,pose(role:PersonRole,pose:PersonPose,t:number,options?:CastPoseOptions){
  const sitting=pose==='sit'||pose==='eat',walking=pose==='walk',working=pose==='work',stride=Math.sin(t*5.7);
  for(const name of ['hip','spine_01','spine_02','spine_03','head']){bones[name]?.quaternion.copy(rest[name].q);}
  // Move the scene root in model Y: FBX centimetres and glTF metres share this solver.
  object.position.y=basePositionY+(sitting?(options?.seatHeight??.66)/scale-hipHeight:walking?Math.abs(Math.sin(t*5.7))*.008/scale:pose==='sleep'?0:Math.sin(t*1.7)*.0012/scale);
  object.updateMatrixWorld(true);object.getWorldQuaternion(modelQ);
  for(const [suffix,side] of [['l',1],['r',-1]] as const){
   const swing=stride*side;
   aim('upperleg_'+suffix,side*.015,sitting?-.18:-1,sitting?1:swing*.37*(walking?1:0));
   aim('lowerleg_'+suffix,0,-1,sitting?-.025:walking?-Math.max(0,swing)*.45:0);
   flatFoot('foot_'+suffix);
   let upper:[number,number,number]=[side*.12,-1,walking?-swing*.29:.02];
   let lower:[number,number,number]=[side*.03,-1,walking?-.1-swing*.23:.1];
   if(sitting){upper=[side*.18,-1,.45];lower=[-side*.12,-.15,1];}
   if((options?.carryTray??(role==='waiter'&&(walking||working)))&&suffix==='l'){upper=[.12,-1,.13];lower=[0,.1,1];}
   if(role==='helper'&&working){upper=[side*.2,-1,.3];lower=[-side*.35,-.05,1];}
   if(['chef','receptionist','cashier','maintenance'].includes(role)&&working){upper=[side*.2,-1,.5];lower=[-side*.15,.05+Math.sin(t*5+side)*.09,1];}
   if(['cleaner','gardener'].includes(role)&&working){upper=[side*.3,-1,.6];lower=[-side*.35,-.45,.8+Math.sin(t*2)*.2];}
   if(pose==='eat'&&suffix==='r'){const bite=(Math.sin(t*2)+1)/2;upper=[-.18,-1,.5];lower=[.2,bite*.95-.2,1-bite*.5];}
   if(options?.takingOrder||sitting&&(options?.holdMenu||options?.holdPhone)){upper=[side*.14,-1,.38];lower=[-side*.3,.35,1];}
   aim('upperarm_'+suffix,...upper);aim('lowerarm_'+suffix,...lower);
  }
 },dispose(){object.traverse(n=>{if((n as THREE.SkinnedMesh).isSkinnedMesh)(n as THREE.SkinnedMesh).skeleton.dispose();});}};
}
