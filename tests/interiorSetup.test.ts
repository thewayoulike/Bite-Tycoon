import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {createFastTrackEmpire,applyDistrictUpdate,parseEmpireSave} from '../src/empire/empire';
import {acquire,propertyById} from '../src/prototype/expansionModel';
import {RESTAURANT_INTERIORS,acquisitionInterior,defaultInterior,changeSandboxInterior} from '../src/empire/interiorStyles';
import {newGame} from '../src/empire/newGame';
import {unityFrame} from '../src/unity/bridge';

const frame=(e:ReturnType<typeof newGame>,id:string)=>unityFrame({state:e.restaurants[id],restaurants:e.restaurants,district:e.district,focus:id,selected:null,worldProgress:0},{floor:0,detail:'room',area:'center',cutaway:true});

test('all four interior choices persist through purchase, leasing and construction without changing the menu or setup price',()=>{
 for(const [id,tenure] of [['diner','leased'],['bistro','owned'],['built-commercial-restaurant','owned']] as const){
  let price:number|undefined;
  for(const style of RESTAURANT_INTERIORS){
   const original=createFastTrackEmpire(structuredClone(INITIAL_STATE)),before=structuredClone(original);
   const e=applyDistrictUpdate(original,s=>acquire(s,id,tenure,'','italian',40,{interiorStyle:style.id}),INITIAL_STATE);
   assert.equal(e.district.businesses[id]?.interiorStyle,style.id);assert.equal(e.restaurants[id].restaurantType,'italian');
   price??=e.district.businesses[id].cash;assert.equal(e.district.businesses[id].cash,price);
   const saved=parseEmpireSave(JSON.stringify(e));assert.ok(saved);
   const snapshot=frame(saved,id);assert.equal(snapshot.interiorStyle,style.id);
   assert.equal(snapshot.frontages.find(f=>f.id===id)!.interiorStyle,style.id);assert.equal(snapshot.restaurantType,'italian');
   assert.deepEqual(original,before);
  }
 }
});

test('a buyer may retain the existing fit-out or choose a replacement',()=>{
 const original=createFastTrackEmpire(structuredClone(INITIAL_STATE));
 const opened=applyDistrictUpdate(original,s=>acquire(s,'bistro','owned','','japanese'),INITIAL_STATE);
 assert.equal(opened.district.businesses.bistro?.interiorStyle,'diner');
 const changed=applyDistrictUpdate(original,s=>acquire(s,'bistro','owned','','japanese',40,{interiorStyle:'japanese'}),INITIAL_STATE);
 assert.equal(changed.district.businesses.bistro.interiorStyle,'japanese');
 assert.equal(changed.district.businesses.bistro.cash,opened.district.businesses.bistro.cash);
});

test('Sandbox can restyle an existing restaurant without resetting service, stock or accounts',()=>{
 const e=newGame('sandbox'),before=structuredClone(e);
 for(const style of RESTAURANT_INTERIORS){
  const changed=changeSandboxInterior(e,'diner',style.id);
  assert.equal(changed.district.businesses.diner.interiorStyle,style.id);
  assert.equal(changed.restaurants,e.restaurants);assert.equal(changed.district.businesses.cafe,e.district.businesses.cafe);
  assert.deepEqual({...changed.district.businesses.diner,interiorStyle:undefined},{...e.district.businesses.diner,interiorStyle:undefined});
  const saved=parseEmpireSave(JSON.stringify(changed));assert.ok(saved);assert.equal(frame(saved,'diner').interiorStyle,style.id);
 }
 assert.deepEqual(e,before);
 const career={...e,testingUnlocked:false};assert.equal(changeSandboxInterior(career,'diner','cafe'),career);
 for(const id of ['missing','shop'])assert.equal(changeSandboxInterior(e,id,'cafe'),e);
 assert.equal(changeSandboxInterior(e,'diner','invalid' as any),e);
});

test('old restaurants keep their existing theme and room-level upgrades stay separate',()=>{
 const e=newGame('sandbox');
 for(const id of ['diner','cafe','bistro']){
  delete e.district.businesses[id].interiorStyle;
  const before=structuredClone(e),snapshot=frame(e,id);
  assert.equal(snapshot.interiorStyle,defaultInterior(e.restaurants[id].restaurantType));assert.deepEqual(e,before);
 }
 assert.ok(acquisitionInterior('hotel','construction',undefined,'bistro').error);
 assert.deepEqual(acquisitionInterior('shop','lease',undefined),{});
 const broken=structuredClone(e);(broken.district.businesses.diner as any).interiorStyle='unknown';assert.equal(parseEmpireSave(JSON.stringify(broken)),null);
 const bad=applyDistrictUpdate(createFastTrackEmpire(structuredClone(INITIAL_STATE)),s=>acquire(s,'shop','owned','',undefined,40,{interiorStyle:'diner'}),INITIAL_STATE);
 assert.equal(bad.district.businesses.shop,undefined);assert.ok(propertyById('shop'));
});
