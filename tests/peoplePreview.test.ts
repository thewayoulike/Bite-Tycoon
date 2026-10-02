import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {FBXLoader} from 'three/examples/jsm/loaders/FBXLoader.js';
import {createPreviewRig,PersonPose} from '../src/people-preview/rig.ts';

test('free preview rigs have independent bones, finite poses and consistent human scale',()=>{
 for(const name of ['eric','carla','claudia']){
  const data=fs.readFileSync(`public/models/people-preview/${name}.fbx`);
  const source=new FBXLoader().parse(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  const material=new THREE.MeshStandardMaterial();
  const rig=createPreviewRig(source,material),other=createPreviewRig(source,material);
  assert.notEqual(rig.bones.hip,other.bones.hip);
  assert.ok(rig.scale>.005&&rig.scale<.02);
  for(const pose of ['idle','walk','sit','eat','work'] as PersonPose[]){
   rig.pose('waiter',pose,1.25);rig.object.updateMatrixWorld(true);
   rig.object.traverse(n=>assert.ok(n.matrixWorld.elements.every(Number.isFinite),`${name}: ${pose}: ${n.name}`));
   if(pose==='sit'){
    const pelvis=rig.bones.hip.getWorldPosition(new THREE.Vector3()).y*rig.scale;
    assert.ok(Math.abs(pelvis-.66)<.01,`${name}: pelvis aligns with a dining chair`);
    const knee=rig.bones.lowerleg_l.getWorldPosition(new THREE.Vector3());
    assert.ok(knee.z*rig.scale>.25,`${name}: thighs extend forward when seated`);
   }
  }
  assert.equal(other.bones.root.position.y,0,'one pose must not change another person');
  rig.dispose();other.dispose();material.dispose();
 }
});
