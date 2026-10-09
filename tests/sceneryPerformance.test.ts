import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cityCameraNear,sceneryLod,simplifySceneryGeometry,distantLeafGeometry} from '../src/graphics/sceneryPerformance';

test('city zoom preserves road depth precision without clipping the close camera',()=>{
  const resolution=(distance:number,near:number)=>distance*distance*(1000-near)/(1000*near*(2**24));
  for(const distance of [70,200,490,580]){
    const near=cityCameraNear(distance);
    assert.ok(near<distance*.025);
    assert.ok(resolution(distance,near)<.003,'road markings are separated by more than one depth unit');
    assert.ok(resolution(distance,near)<resolution(distance,.05)/25);
  }
  assert.equal(cityCameraNear(2,true),.1);
  assert.equal(cityCameraNear(36,true),.1);
  assert.equal(cityCameraNear(490,true),8);
  assert.equal(cityCameraNear(1.4),.2);
});

test('detail does not oscillate or overlap while zooming near a LOD boundary',()=>{
  const thresholds=[55,145];let level=sceneryLod(40,undefined,thresholds);
  for(const distance of [54,57,54,60,56]){level=sceneryLod(distance,level,thresholds);assert.equal(level,0);}
  level=sceneryLod(63,level,thresholds);assert.equal(level,1);
  for(const distance of [54,50,56,52]){level=sceneryLod(distance,level,thresholds);assert.equal(level,1);}
  assert.equal(sceneryLod(47,level,thresholds),0);
  assert.equal(sceneryLod(500,0,thresholds),2);
  assert.equal(sceneryLod(20,2,thresholds),0);
  assert.equal(sceneryLod(90,undefined,thresholds),1);
});

test('distant curved geometry is smaller, finite and leaves the source model intact',()=>{
  const source=new THREE.TorusGeometry(.3,.1,18,40),original=source.index!.count;
  const reduced=simplifySceneryGeometry(source,.18);
  assert.ok(reduced.index!.count<original*.6);
  assert.equal(source.index!.count,original);
  for(const attr of Object.values(reduced.attributes))assert.ok(attr.array.every(Number.isFinite));
  source.computeBoundingBox();
  assert.ok(source.boundingBox!.min.distanceTo(reduced.boundingBox!.min)<.18);
  assert.ok(source.boundingBox!.max.distanceTo(reduced.boundingBox!.max)<.18);
  source.dispose();reduced.dispose();
});

test('distant foliage reduces leaf cards while keeping the complete canopy outline',()=>{
  const positions:number[]=[],indices:number[]=[];
  for(let x=-3;x<=3;x+=.2)for(let y=1;y<=6;y+=.2){
    const n=positions.length/3;
    positions.push(x-.12,y-.15,0,x+.12,y-.15,0,x+.12,y+.15,0,x-.12,y+.15,0);
    indices.push(n,n+1,n+2,n,n+2,n+3);
  }
  const source=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)).setIndex(indices);
  const far=distantLeafGeometry(source);
  assert.ok(far.index!.count<source.index!.count*.2);
  const bounds=(g:THREE.BufferGeometry)=>{const box=new THREE.Box3(),p=g.getAttribute('position'),v=new THREE.Vector3();for(const index of g.index!.array)box.expandByPoint(v.fromBufferAttribute(p,index));return box;};
  assert.deepEqual(bounds(far),bounds(source));
  assert.equal(source.index!.count,indices.length);
  source.dispose();far.dispose();
});
