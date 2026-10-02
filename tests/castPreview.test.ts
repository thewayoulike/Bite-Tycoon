import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {CAST,CUSTOMERS,CHILDREN,STAFF,sceneCastId,nextArrival} from '../src/people-preview/cast.ts';
import {createPreviewRig,PersonPose} from '../src/people-preview/rig.ts';

async function loadGeometry(id:string){
 const input=fs.readFileSync(`public/models/people-preview/cast/${id}.glb`),jsonLength=input.readUInt32LE(12);
 const data=JSON.parse(input.subarray(20,20+jsonLength).toString());
 // Browser image decoding is irrelevant to skeleton/geometry checks.
 delete data.images;delete data.textures;delete data.materials;
 for(const mesh of data.meshes)for(const primitive of mesh.primitives)delete primitive.material;
 const json=Buffer.from(JSON.stringify(data)),padded=Buffer.alloc(Math.ceil(json.length/4)*4,32);json.copy(padded);
 const binary=input.subarray(20+jsonLength),header=Buffer.alloc(20);
 header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(20+padded.length+binary.length,8);header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const output=Buffer.concat([header,padded,binary]);
 return new GLTFLoader().parseAsync(output.buffer.slice(output.byteOffset,output.byteOffset+output.byteLength),'');
}
test('100 clothed cast assets include 50 adult customers, 30 children and 20 adult staff',()=>{
 const manifest=JSON.parse(fs.readFileSync('public/models/people-preview/cast/manifest.json','utf8'));
 assert.equal(CAST.length,100);assert.equal(CUSTOMERS.length,50);assert.equal(CHILDREN.length,30);assert.equal(STAFF.length,20);
 assert.equal(new Set(manifest.map(p=>p.faceSignature)).size,100);
 assert.equal(new Set(CAST.map(p=>p.id)).size,100);
 assert.deepEqual(manifest.map(p=>p.id),CAST.map(p=>p.id));
 for(const member of CAST){
  assert.ok(fs.statSync(`public/models/people-preview/cast/${member.id}.glb`).size>100_000);
  for(const suffix of ['','-outfit'])assert.ok(fs.existsSync(`public/models/people-preview/cast/${member.id}${suffix}.png`));
  assert.ok(['male_casualsuit01','male_casualsuit03','male_casualsuit05','male_elegantsuit01'].includes(member.clothes),'only audited long-sleeved, full-length outfits');
  assert.equal(member.coverage,'long sleeves, covered torso, full-length trousers, closed shoes');
  if(member.group==='children'){assert.ok(member.ageYears>=5&&member.ageYears<=15);assert.equal(member.role,'customer');}
  else assert.ok(member.ageYears>=18,'all staff and adult customers are adults');
 }
 assert.equal(new Set(CHILDREN.map(p=>p.ageYears)).size,11);
 const visits=new Set<string>();
 for(let arrival=0;arrival<50;arrival=nextArrival(arrival)){
  const diners=[sceneCastId('carla','eat','customer',arrival),sceneCastId('claudia','eat','customer',arrival),sceneCastId('eric','sit','customer',arrival)];
  assert.equal(new Set(diners).size,3);
  diners.forEach(id=>{assert.ok(CUSTOMERS.some(p=>p.id===id));visits.add(id);});
  assert.equal(sceneCastId('eric','walk','waiter',arrival),'theo');
  assert.equal(sceneCastId('carla','work','chef',arrival),'maya');
 }
 assert.equal(visits.size,50);
 const childrenSeen=new Set<string>(),staffSeen=new Set<string>();
 for(let arrival=0;arrival<60;arrival++){
  const child=sceneCastId('claudia','eat','customer',arrival,0,true);
  assert.ok(CHILDREN.some(p=>p.id===child));childrenSeen.add(child);
  assert.ok(CUSTOMERS.some(p=>p.id===sceneCastId('carla','eat','customer',arrival,0,true)));
 }
 for(const role of new Set(STAFF.map(p=>p.role)))for(let team=0;team<6;team++){
  const id=sceneCastId('eric','work',role,0,team,true);
  assert.equal(id,sceneCastId('eric','work',role,49,team,true));
  assert.ok(STAFF.some(p=>p.id===id&&p.role===role));staffSeen.add(id);
 }
 assert.equal(childrenSeen.size,30);assert.equal(staffSeen.size,20);
});
test('all 100 glTF rigs have age-appropriate heights and independent, finite walking and seated poses',async()=>{
 for(const member of CAST){
  const gltf=await loadGeometry(member.id),rig=createPreviewRig(gltf.scene,undefined,true),other=createPreviewRig(gltf.scene,undefined,true);
  const height=new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3()).y;
  assert.ok(Math.abs(height-member.heightMetres)<.015,`${member.id}: calibrated human scale ${height}`);
  assert.ok(member.group==='children'?height>.9&&height<1.65:height>1.5&&height<2.05);
  assert.notEqual(rig.bones.hip,other.bones.hip);
  for(const pose of ['idle','walk','sit','eat','work','sleep'] as PersonPose[]){
   rig.pose(member.role,pose,1.25);rig.object.updateMatrixWorld(true);
   rig.object.traverse(n=>assert.ok(n.matrixWorld.elements.every(Number.isFinite),`${member.id}: ${pose}: ${n.name}`));
   if(pose==='sit'){
    const hip=rig.bones.hip.getWorldPosition(new THREE.Vector3()),knee=rig.bones.lowerleg_l.getWorldPosition(new THREE.Vector3());
    assert.ok(Math.abs(hip.y-.66)<.01,`${member.id}: seated hip fits chair`);
    assert.ok(knee.z>hip.z+.1,`${member.id}: knees face forward`);
   }
  }
  rig.pose(member.role,'sit',1.25,{seatHeight:.78});rig.object.updateMatrixWorld(true);
  assert.ok(Math.abs(rig.bones.hip.getWorldPosition(new THREE.Vector3()).y-.78)<.01,'Sofa/booster seat height is respected');
  const bed=new THREE.Group(),pivot=new THREE.Group();bed.rotation.x=-Math.PI/2;pivot.position.y=-rig.hipHeight;bed.add(pivot);pivot.add(rig.object);
  rig.pose(member.role,'sleep',1.25);bed.updateMatrixWorld(true);
  const lyingSize=new THREE.Box3().setFromObject(bed,true).getSize(new THREE.Vector3());
  assert.ok(lyingSize.y<.65&&lyingSize.z>member.heightMetres*.9,`${member.id}: sleeping body lies along the mattress, not upright`);
  assert.equal(other.object.position.y,0);rig.dispose();other.dispose();
 }
});
