import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {buildingDesigns,readPreviewSelection} from '../src/building-preview/catalog';
import {assembleBuilding} from '../src/graphics/buildingAssembly';
import {compileResidentialHouse} from '../src/graphics/residentialHouseLibrary';
import {DISTRICT_HOUSES,OUTER_HOUSES} from '../src/graphics/residentialLayout';
import {CITY_LOTS} from '../src/graphics/cityDistrictLayout';
import {OUTER_LOTS,isOuterPark,buildOuterCity} from '../src/graphics/outerCity';
import {createHash} from 'node:crypto';
import {buildResidentialHouseDetails} from '../src/graphics/residentialHouseDetails';
import {HOUSE_PALETTES,houseAppearanceAt,houseMaterialTint} from '../src/graphics/residentialAppearance';

// Three's Node file-loader path reports the same progress event as a browser.
if(typeof ProgressEvent==='undefined') Object.defineProperty(globalThis,'ProgressEvent',{value:class extends Event {
  lengthComputable:boolean; loaded:number; total:number;
  constructor(type:string,init:any={}) {super(type);this.lengthComputable=!!init.lengthComputable;this.loaded=init.loaded??0;this.total=init.total??0;}
},configurable:true});

function asset(id:string) {
  const bytes=readFileSync(new URL(`../public/models/building-prototype/${id}.glb`,import.meta.url));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
  const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length).toString()),binary=bytes.subarray(28+length);
  return {bytes,json,binary};
}
async function geometryScene(id:string) {
  const {json,binary}=asset(id);
  // Keep exported geometry/hierarchy intact; Node has no browser image decoder.
  json.materials=json.materials.map((m:any)=>({name:m.name,pbrMetallicRoughness:{baseColorFactor:m.pbrMetallicRoughness?.baseColorFactor??[1,1,1,1]}}));
  delete json.images;delete json.textures;
  json.buffers[0].uri=`data:application/octet-stream;base64,${binary.toString('base64')}`;
  return (await new GLTFLoader().parseAsync(JSON.stringify(json),'')).scene;
}
test('only the selected residential house remains, with reusable modules and embedded textures',()=>{
  assert.deepEqual(buildingDesigns.map(d=>d.id),['house']);
  for(const design of buildingDesigns) {
    const {bytes,json,binary}=asset(design.id);
    assert.ok(bytes.length<5_000_000);
    assert.deepEqual(json.nodes.filter((n:any)=>n.extras?.module).map((n:any)=>n.extras.module).sort(),['ground','level','roof']);
    assert.ok(json.nodes.some((n:any)=>n.extras?.originalDesign));
    assert.ok(json.images.length>=4&&json.images.every((im:any)=>im.bufferView!==undefined&&!im.uri),'original textures travel with their model');
    assert.ok(json.materials.some((m:any)=>m.normalTexture&&m.pbrMetallicRoughness.baseColorTexture));
    for(const mesh of json.meshes) for(const primitive of mesh.primitives) {
      const a=json.accessors[primitive.attributes.POSITION],view=json.bufferViews[a.bufferView];
      const values=new Float32Array(binary.buffer,binary.byteOffset+(view.byteOffset??0)+(a.byteOffset??0),a.count*3);
      assert.ok(values.every(Number.isFinite));
    }
  }
});
test('floor counts assemble the right height, share buffers and reveal the matching cutaway',async()=>{
  for(const design of buildingDesigns) {
    const source=await geometryScene(design.id),outside=assembleBuilding(source,design,design.maxFloors,false,0);
    assert.equal(outside.children.length,design.maxFloors+1);
    const box=new THREE.Box3().setFromObject(outside);
    assert.ok(box.max.y>=design.maxFloors*design.floorHeight);
    const ground=assembleBuilding(source,design,2,true,0),upper=assembleBuilding(source,design,2,true,1);
    assert.equal(ground.children[0].userData.module,'ground');assert.equal(upper.children[0].userData.module,'level');
    for(const cutaway of [ground,upper]) {
      assert.equal(cutaway.children.length,1);
      cutaway.traverse(node=>{if(node.userData.section)assert.equal(node.visible,!['front','right'].includes(node.userData.section));});
    }
    const sourceMeshes=new Map<string,THREE.BufferGeometry>();source.traverse(node=>{if((node as THREE.Mesh).isMesh)sourceMeshes.set(node.name,(node as THREE.Mesh).geometry);});
    outside.traverse(node=>{if((node as THREE.Mesh).isMesh)assert.equal((node as THREE.Mesh).geometry,sourceMeshes.get(node.name));if(node.userData.section==='inside')assert.equal(node.visible,false);});
    source.traverse(node=>{assert.equal(node.visible,true,'cutaway must not mutate the source or another instance');});
  }
});
test('house pitched roof faces upward from both slopes',()=>{
  const {json,binary}=asset('house');
  const node=json.nodes.find((n:any)=>n.name.startsWith('roof_roof_slate'));
  assert.ok(node);
  const primitive=json.meshes[node.mesh].primitives[0],a=json.accessors[primitive.attributes.NORMAL],v=json.bufferViews[a.bufferView];
  const normals=new Float32Array(binary.buffer,binary.byteOffset+(v.byteOffset??0)+(a.byteOffset??0),a.count*3);
  let positive=0,negative=0;
  for(let i=1;i<normals.length;i+=3) {if(normals[i]>.1)positive++;if(normals[i]<-.1)negative++;}
  assert.ok(positive>=6);assert.equal(negative,0);
});
test('old prototype links resolve to the selected house and clamp floor values safely',()=>{
  const state=readPreviewSelection('?building=hotel&floors=6&floor=5&view=inside&source=library&time=night');
  assert.equal(state.design.id,'house');assert.equal(state.floor,1);assert.equal(state.floors,2);assert.ok(state.inside&&state.night);
  assert.equal(readPreviewSelection('?building=house&floors=200&floor=70').floor,1);
  assert.equal(readPreviewSelection('?building=apartments&floors=-10&floor=-2').floors,2);
  assert.equal(readPreviewSelection('?building=missing&floors=NaN').design.id,'house');
});
test('the real house exterior is batched for the city and fits every paired residential plot',async()=>{
  const source=await geometryScene('house'),parts=compileResidentialHouse(source);
  assert.ok(parts.length<=16,'a batch has at most sixteen material draws, not a draw per house');
  parts.push(...buildResidentialHouseDetails());
  assert.ok(parts.length<=23,'paint colors reuse the same batches, with only a few detail batches');
  const full=new THREE.Box3(),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion();
  let triangles=0;
  for(const p of parts){full.union(p.geometry.boundingBox!);triangles+=p.geometry.getAttribute('position').count/3;}
  assert.ok(triangles<4500,'exterior variations stay compact and exclude interior furniture');
  const houses=CITY_LOTS.filter(l=>l.kind==='homes');assert.equal(DISTRICT_HOUSES.length,houses.length*2);
  for(const lot of houses){
    const pair=DISTRICT_HOUSES.filter(p=>Math.hypot(p.position[0]-lot.position[0],p.position[2]-lot.position[2])<10);
    assert.equal(pair.length,2);
    const boxes=pair.map(p=>full.clone().applyMatrix4(matrix.compose(new THREE.Vector3(...p.position),rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),p.rotation),new THREE.Vector3(...p.scale))));
    assert.ok(!boxes[0].intersectsBox(boxes[1]),'neighboring roofs and porches must not overlap');
    for(const b of boxes)assert.ok(b.min.x>=lot.position[0]-8.8&&b.max.x<=lot.position[0]+8.8&&b.min.z>=lot.position[2]-8.8&&b.max.z<=lot.position[2]+8.8,'house stays within its block');
  }
  assert.equal(OUTER_HOUSES.flat().length,OUTER_LOTS.filter(l=>l.zone==='homes'&&!isOuterPark(l.x,l.z)).length*2);
  for(const p of OUTER_HOUSES.flat())assert.ok(p.scale[1]*2.55>2.2,'doors keep adult headroom');
  parts.forEach(p=>p.geometry.dispose());
});

test('residential paint and details vary by home, persist by plot and keep adjacent homes distinct',()=>{
  const all=[...DISTRICT_HOUSES,...OUTER_HOUSES.flat()];
  assert.equal(new Set(all.map(h=>h.palette)).size,HOUSE_PALETTES.length);
  assert.deepEqual([...new Set(all.map(h=>h.style))].sort(),[0,1,2]);
  for(const group of [DISTRICT_HOUSES,...OUTER_HOUSES])for(let i=0;i<group.length;i+=2){
    assert.notEqual(group[i].palette,group[i+1].palette);
    assert.notEqual(group[i].style,group[i+1].style);
  }
  for(const lot of CITY_LOTS.filter(l=>l.kind==='homes'))for(const side of [0,1]){
    assert.deepEqual(houseAppearanceAt(lot.position[0],lot.position[2],side),houseAppearanceAt(lot.position[0],lot.position[2],side));
  }
  const material=new THREE.MeshStandardMaterial({color:'#ffffff'});material.name='cedar';material.map=new THREE.Texture();
  const original=material.color.clone();
  const colors=HOUSE_PALETTES.map((palette,index)=>{
    const tint=houseMaterialTint(material,index),result=tint.clone().multiply(new THREE.Color('#878d84'));
    assert.ok([tint.r,tint.g,tint.b].every(Number.isFinite));
    assert.equal(result.getHexString(),new THREE.Color(palette.siding).getHexString());
    return result.getHexString();
  });
  assert.equal(new Set(colors).size,HOUSE_PALETTES.length);
  assert.deepEqual(material.color,original,'instance colors must not repaint the shared model');
  const details=buildResidentialHouseDetails();
  assert.ok(details.every(part=>part.styles?.length&&part.styles.every(style=>style===1||style===2)));
  details.forEach(part=>{part.geometry.dispose();part.material.dispose();});material.map.dispose();material.dispose();
});
test('replacing residential geometry preserves commercial buildings, parks and deterministic scenery',()=>{
  const commercialDigest=(geometry:THREE.BufferGeometry)=>{
    const positions=geometry.getAttribute('position'),colors=geometry.getAttribute('color'),values:number[]=[];
    for(let i=0;i<positions.count;i++)if(positions.getX(i)>-10&&positions.getZ(i)<62){values.push(positions.getX(i),positions.getY(i),positions.getZ(i),colors.getX(i),colors.getY(i),colors.getZ(i));}
    return createHash('sha256').update(Buffer.from(new Float32Array(values).buffer)).digest('hex');
  };
  for(const q of [0,1,2,3]){
    const before=buildOuterCity(q),after=buildOuterCity(q,true);
    for(const geometry of Object.values(after)) {
      assert.ok(Number.isFinite(geometry.boundingSphere!.radius),'residential-only districts must render empty batches safely');
      assert.ok(geometry.getAttribute('position').array.every(Number.isFinite));
    }
    for(const kind of ['solid','glass','lit'] as const)assert.equal(commercialDigest(after[kind]),commercialDigest(before[kind]),`${kind} commercial scenery stays identical`);
    assert.deepEqual(after.land.attributes.position.array,before.land.attributes.position.array);
    assert.deepEqual(after.land.attributes.color.array,before.land.attributes.color.array);
    Object.values(before).forEach(g=>g.dispose());Object.values(after).forEach(g=>g.dispose());
  }
});
