import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {chooseVehicleStyle, createVehicleInstance, type VehicleStyle} from '../src/graphics/streetAssetLibrary';
import {outerCarBatches} from '../src/graphics/outerStreetAssets';
import {getDeliveryTruck} from '../src/graphics/deliveryTruck';

test('factory delivery trucks fit the loading yard, share geometry and have six grounded wheels',()=>{
  const source=getDeliveryTruck();assert.equal(source,getDeliveryTruck(),'build the truck only once');
  const wheels:THREE.Object3D[]=[];source.traverse(o=>{if(o.userData.wheel)wheels.push(o);});
  assert.equal(wheels.length,6);
  for(const wheel of wheels){const box=new THREE.Box3().setFromObject(wheel);assert.ok(Math.abs(box.min.y)<.015);}
  const placements=[{style:'truck' as const,x:121.5,z:-143.5,color:'#69847e'}];
  const batches=outerCarBatches(new THREE.Group(),placements);
  const bounds=new THREE.Box3();let triangles=0;
  assert.ok(batches.filter(b=>b.lod===0).length<=5,'all nearby factory trucks share five instanced material draws');
  for(const batch of batches.filter(b=>b.lod===0)){
    batch.geometry.computeBoundingBox();bounds.union(batch.geometry.boundingBox!.clone().applyMatrix4(batch.instances[0].matrix));
    triangles+=(batch.geometry.index?.count??batch.geometry.getAttribute('position').count)/3;
    assert.ok(batch.geometry.getAttribute('position').array.every(Number.isFinite));
    if(batch.material.name==='paint')assert.equal(batch.instances[0].color!.getHexString(),'69847e');
  }
  assert.ok(bounds.min.x>116.25&&bounds.max.x<133.75,'truck stays in the factory plot');
  assert.ok(bounds.min.z>-145.1&&bounds.max.z<-141.25,'truck clears loading platforms, bollards and the pavement');
  assert.ok(Math.abs(bounds.min.y-.26)<.015,'tires touch the yard');
  const size=bounds.getSize(new THREE.Vector3());
  assert.ok(size.x>6&&size.x<7&&size.y>3&&size.z>2.4,'truck has a full-height cargo body and is parked across the yard');
  assert.ok(triangles<40000,'truck detail stays within the scenery budget');
  for(const far of batches.filter(b=>b.lod===1)){
    const colors=far.geometry.getAttribute('color');
    assert.ok(colors,'distant trucks retain their vertex paint, cargo and wheel colors');
    assert.equal(colors.count,far.geometry.getAttribute('position').count);
    assert.ok(colors.array.every(Number.isFinite));
    const original=batches.find(b=>b.material===far.material&&b.lod===0)!.geometry.getAttribute('color');
    const palette=new Set(Array.from({length:original.count},(_,i)=>[original.getX(i),original.getY(i),original.getZ(i)].map(n=>n.toFixed(4)).join(':')));
    for(let i=0;i<colors.count;i++)assert.ok(palette.has([colors.getX(i),colors.getY(i),colors.getZ(i)].map(n=>n.toFixed(4)).join(':')),'cargo colors cannot disappear or blend into black');
  }
  batches.forEach(b=>{b.geometry.dispose();b.material.dispose();});
});

function asset(name: string) {
  const bytes = readFileSync(new URL(`../public/models/street-assets/${name}.glb`, import.meta.url));
  assert.equal(bytes.readUInt32LE(0), 0x46546c67);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const binary = bytes.subarray(28 + bytes.readUInt32LE(12));
  return {bytes, json, binary};
}

test('trees have textured bark, cutout leaves and a cheaper matching-height LOD', () => {
  const {bytes, json, binary} = asset('trees');
  assert.ok(bytes.length < 5_000_000, 'whole tree library remains under 5 MB');
  assert.ok(json.images.every((i: any) => i.bufferView !== undefined && !i.uri), 'textures work offline');
  for (const species of ['oak', 'aspen', 'ash']) {
    const triangles: number[] = [], heights: number[] = [];
    for (const lod of [0, 1]) {
      const root = json.nodes.find((n: any) => n.name === `${species}_lod${lod}`);
      assert.equal(root.children.length, 2, 'one bark mesh plus one foliage mesh');
      let count = 0, top = 0;
      for (const child of root.children) {
        const mesh = json.meshes[json.nodes[child].mesh];
        for (const p of mesh.primitives) {
          count += json.accessors[p.indices].count / 3;
          const a = json.accessors[p.attributes.POSITION], v = json.bufferViews[a.bufferView];
          top = Math.max(top, a.max[1]);
          assert.ok(a.min[1] >= -.01, 'tree starts at ground level');
          const positions = new Float32Array(binary.buffer, binary.byteOffset + v.byteOffset, a.count * 3);
          assert.ok(positions.every(Number.isFinite));
          const material = json.materials[p.material];
          assert.ok(material.pbrMetallicRoughness.baseColorTexture);
          if (mesh.name.includes('leaves')) { assert.equal(material.alphaMode, 'MASK'); assert.ok(material.doubleSided); }
          else assert.ok(material.normalTexture, 'bark has surface detail');
        }
      }
      triangles.push(count); heights.push(top);
    }
    assert.ok(triangles[0] < 20_000 && triangles[1] < triangles[0] * .62);
    assert.ok(Math.abs(heights[0] - heights[1]) < .001, 'LOD cannot change the tree height');
  }
});

test('vehicle exports have human-scale bounds, independent wheel pivots and shared resources', async () => {
  const {bytes} = asset('vehicles');
  assert.ok(bytes.length < 1_500_000);
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, '');
  for (const style of ['sedan', 'hatchback', 'suv'] as VehicleStyle[]) {
    const a = createVehicleInstance(gltf.scene, style, '#31566c', false);
    const b = createVehicleInstance(gltf.scene, style, '#bb3838', true);
    assert.notEqual(a.root, b.root);
    const box = new THREE.Box3().setFromObject(a.root), size = box.getSize(new THREE.Vector3());
    assert.ok(size.x > 1.7 && size.x < 2.5 && size.y > 1.4 && size.y < 1.9 && size.z > 4 && size.z < 4.8);
    assert.ok(Math.abs(box.min.y) < .015, 'tires touch the road');
    assert.equal(a.wheels.length, 4);
    assert.equal(new Set(a.wheels.map(w => `${w.position.x.toFixed(2)}:${w.position.z.toFixed(2)}`)).size, 4);
    let draws = 0, triangles = 0;
    a.root.traverse(node => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      draws++;
      triangles += (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
      const other = b.root.getObjectByName(mesh.name) as THREE.Mesh;
      assert.equal(mesh.geometry, other.geometry);
      if ((mesh.material as THREE.Material).name === 'paint') assert.notEqual(mesh.material, other.material);
      if ((mesh.material as THREE.Material).name === 'headlights') assert.ok((other.material as THREE.MeshStandardMaterial).emissiveIntensity > (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity);
    });
    assert.equal(draws, 10);
    assert.ok(triangles < 13_000);
    const wheel = a.wheels[0];
    const before = new THREE.Box3().setFromObject(wheel).getSize(new THREE.Vector3());
    wheel.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    const after = new THREE.Box3().setFromObject(wheel).getSize(new THREE.Vector3());
    assert.ok(before.distanceTo(after) < .02, 'wheel spins around its axle, not end over end');
    assert.equal(b.wheels[0].quaternion.x, 0, 'one car cannot animate the other');
  }
});

test('traffic with the same speed still gets different car bodies and taxis stay sedans', () => {
  const colors = ['#31566c', '#c6bda9', '#e1e2df'];
  assert.equal(new Set(colors.map(c => chooseVehicleStyle(c, 4))).size, 3);
  for (const color of colors) assert.equal(chooseVehicleStyle(color, 4, true), 'sedan');
});

test('instanced parked models keep curved bodies and wheels aligned inside parking spaces',async()=>{
  const {bytes}=asset('vehicles');
  const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer,'');
  const spots=(['sedan','hatchback','suv'] as const).map((style,i)=>({style,x:100+i*25,z:106.1,color:'#845951'}));
  const batches=outerCarBatches(scene,spots);
  assert.ok(batches.filter(b=>b.lod===0).length<=21,'material batching limits nearby parked-car draw calls');
  for(const spot of spots){
    const bounds=new THREE.Box3();let triangles=0;
    for(const b of batches.filter(b=>b.lod===0))for(const instance of b.instances){
      if(instance.position.x!==spot.x)continue;
      b.geometry.computeBoundingBox();bounds.union(b.geometry.boundingBox!.clone().applyMatrix4(instance.matrix));
      triangles+=(b.geometry.index?.count??b.geometry.getAttribute('position').count)/3;
      if(b.material.name==='paint')assert.equal(instance.color!.getHexString(),'845951');
    }
    const size=bounds.getSize(new THREE.Vector3());
    assert.ok(size.x>1.4&&size.x<2.1);assert.ok(size.z>3.3&&size.z<4.05);
    assert.ok(Math.abs(bounds.min.y-.26)<.015,'all four tires stay on the paved surface');
    assert.ok(triangles>1000&&triangles<13000,'reuse the approved detailed mesh');
    const distant=batches.filter(b=>b.lod===1&&b.instances.some(i=>i.position.x===spot.x));
    const farTriangles=distant.reduce((sum,b)=>sum+(b.geometry.index?.count??b.geometry.getAttribute('position').count)/3,0);
    assert.ok(farTriangles<triangles*.5,'parked vehicles use less than half their geometry in distant city views');
    for(const b of distant){
      assert.ok(b.geometry.getAttribute('position').array.every(Number.isFinite));
      const near=batches.find(n=>n.lod===0&&n.material===b.material)!;
      assert.equal(near.instances,b.instances,'all LODs share one selection to prevent zoom flicker');
      near.geometry.computeBoundingBox();b.geometry.computeBoundingBox();
      assert.ok(b.geometry.boundingBox!.min.distanceTo(near.geometry.boundingBox!.min)<.32);
      assert.ok(b.geometry.boundingBox!.max.distanceTo(near.geometry.boundingBox!.max)<.32);
    }
  }
  batches.forEach(b=>{b.geometry.dispose();b.material.dispose();});
});
