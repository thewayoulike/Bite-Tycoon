import test from 'node:test';
import assert from 'node:assert/strict';
import {restaurantAppearance,propertyInteriorPlacement,RESTAURANT_SHELL,urbanBuildingProfile,LODGING_STOREY_HEIGHT} from '../src/graphics/propertyArchitecture';
import {restaurantShellGeometry} from '../src/components/RestaurantShell3D';
import {PROPERTIES} from '../src/prototype/expansionModel';
import {ROOM} from '../src/restaurantLayout';
import {restaurantFinish} from '../src/graphics/restaurantFinish';
import * as THREE from 'three';

test('the shared restaurant shell encloses the playable room at the same address and scale',()=>{
  for(const p of PROPERTIES.filter(p=>p.kind==='restaurant'||p.kind==='cafe')){
    const placement=propertyInteriorPlacement(p),appearance=restaurantAppearance(p.id),model=restaurantShellGeometry(appearance);
    assert.equal(RESTAURANT_SHELL.width,ROOM.right-ROOM.left);assert.equal(RESTAURANT_SHELL.front,ROOM.front);assert.equal(RESTAURANT_SHELL.back,ROOM.back);
    assert.equal(placement.position[0],p.position[0]);assert.equal(placement.position[2],p.position[2]);assert.equal(placement.scale,.38);
    model.sides.computeBoundingBox();assert.ok(model.sides.boundingBox!.min.x<=ROOM.left);assert.ok(model.sides.boundingBox!.max.x>=ROOM.right);
    model.front.computeBoundingBox();assert.ok(model.front.boundingBox!.min.z<=ROOM.front&&model.front.boundingBox!.max.z>=ROOM.front);
    for(const mesh of Object.values(model))mesh.dispose();
  }
});

test('every saved restaurant facade layout and custom paint produces valid, bounded shared geometry',()=>{
  for(let layout=0;layout<6;layout++){
    const appearance=restaurantAppearance('cafe',{wallColor:'#c7ad92',frameColor:'#724747',restaurantLayout:layout});
    assert.equal(appearance.name,'Corner café');assert.equal(appearance.wall,'#c7ad92');assert.equal(appearance.frame,'#724747');
    const model=restaurantShellGeometry(appearance);
    for(const geometry of Object.values(model)){
      assert.ok(geometry.getAttribute('position').count<30000);
      for(const attribute of ['position','normal','color'])assert.ok(Array.from(geometry.getAttribute(attribute).array).every(Number.isFinite));
      geometry.dispose();
    }
  }
});

test('hotel, apartments and shop keep facade identity and footprint when revealing a floor',()=>{
  for(const p of PROPERTIES.filter(p=>['hotel','apartments','shop'].includes(p.kind))){
    const full=urbanBuildingProfile(p,{floorsOverride:5});
    for(const level of [1,2,5]){
      const cutaway=urbanBuildingProfile(p,{cutawayFloor:level});
      assert.deepEqual(cutaway.style,full.style);assert.deepEqual(cutaway.scale,full.scale);
      assert.equal(cutaway.modern,full.modern);assert.equal(cutaway.mansard,full.mansard);
      assert.ok(Math.abs(cutaway.height*cutaway.scale[1]-level*LODGING_STOREY_HEIGHT)<1e-9);
      assert.equal(cutaway.scale[0]*13.4,18*propertyInteriorPlacement(p).scale);
      assert.equal(cutaway.scale[2]*12.2,20*propertyInteriorPlacement(p).scale);
    }
  }
});

test('approved finishes preserve custom paint and purchased designs without rewriting the saved appearance',()=>{
  const untouched=restaurantAppearance('diner'),snapshot={...untouched};
  assert.equal(restaurantFinish(untouched).frame,'#25443c');assert.deepEqual(untouched,snapshot);
  const custom=restaurantAppearance('cafe',{wallColor:'#c7ad92',frameColor:'#724747'});
  assert.equal(restaurantFinish(custom).wall,custom.wall);assert.equal(restaurantFinish(custom).frame,custom.frame);
  for(const design of ['heritage','modern','garden'] as const){
    const purchased=restaurantAppearance('diner',undefined,{name:'My restaurant',design});
    assert.equal(restaurantFinish(purchased).wall,purchased.wall);assert.equal(restaurantFinish(purchased).frame,purchased.frame);
  }
});

test('all new facade layouts keep the working entrance open and masonry UVs finite',()=>{
  const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
  for(let layout=0;layout<6;layout++){
    const model=restaurantShellGeometry(restaurantAppearance('diner',{restaurantLayout:layout}));
    const solids=[model.front,model.frontTrim,model.frontInside].map(geometry=>new THREE.Mesh(geometry,material));
    for(const x of [-1.25,0,1.25])for(const y of [.2,1.5,3.6]){
      const ray=new THREE.Raycaster(new THREE.Vector3(x,y,27),new THREE.Vector3(0,0,-1),0,6);
      assert.equal(ray.intersectObjects(solids).length,0,`Entrance blocked at ${x}, ${y}, layout ${layout}`);
    }
    for(const geometry of [model.sides,model.front]){
      assert.equal(geometry.getAttribute('uv').count,geometry.getAttribute('position').count);
      assert.ok(Array.from(geometry.getAttribute('uv').array).every(Number.isFinite));
    }
    Object.values(model).forEach(g=>g.dispose());
  }
  material.dispose();
});
