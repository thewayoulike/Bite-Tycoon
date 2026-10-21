import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {createFastTrackEmpire,applyDistrictUpdate,parseEmpireSave} from '../src/empire/empire';
import {acquire,propertyById} from '../src/prototype/expansionModel';
import {RESTAURANT_INTERIORS,acquisitionInterior,defaultInterior} from '../src/empire/interiorStyles';
import {newGame} from '../src/empire/newGame';
import {unityFrame} from '../src/unity/bridge';

const frame=(e:ReturnType<typeof newGame>,id:string)=>unityFrame({state:e.restaurants[id],restaurants:e.restaurants,district:e.district,focus:id,selected:null,worldProgress:0},{floor:0,detail:'room',area:'center',cutaway:true});

test('all four interior choices persist through leasing and construction without changing the menu or setup price',()=>{
 for(const [id,tenure] of [['diner','leased'],['built-commercial-restaurant','owned']] as const){
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

test('taking over an operating business retains its furnished style and rejects a different replacement',()=>{
 const original=createFastTrackEmpire(structuredClone(INITIAL_STATE));
 const opened=applyDistrictUpdate(original,s=>acquire(s,'bistro','owned','','japanese'),INITIAL_STATE);
 assert.equal(opened.district.businesses.bistro?.interiorStyle,'diner');
 const blocked=applyDistrictUpdate(original,s=>acquire(s,'bistro','owned','','japanese',40,{interiorStyle:'japanese'}),INITIAL_STATE);
 assert.equal(blocked.district.businesses.bistro,undefined);assert.equal(blocked.district.market!.ownerCash,original.district.market!.ownerCash);
 assert.match(blocked.district.notice,/keeps its fitted interior/);
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
