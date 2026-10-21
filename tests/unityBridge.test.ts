import test from 'node:test';
import assert from 'node:assert/strict';
import {unityFrame,validUnityEvent,copyBrowserSave,unitySaveKey,browserSaveKey,replaceUnitySave} from '../src/unity/bridge';
import {INITIAL_STATE,advanceGame} from '../src/hooks/useGameLoop';
import {createFastTrackEmpire,applyDistrictUpdate,advanceEmpire,startEmpireWeek} from '../src/empire/empire';
import {acquire} from '../src/prototype/expansionModel';
import {LAND_PLOTS,siteOffer} from '../src/empire/propertyMarket';
import {newGame} from '../src/empire/newGame';
import {propertyById,createBusiness} from '../src/prototype/expansionModel';
const view={floor:0,detail:'room',area:'center',cutaway:true};
const fresh=()=>createFastTrackEmpire(structuredClone(INITIAL_STATE));

test('map highlights distinguish a rented business from an owned building and an available lease',()=>{
 let e=applyDistrictUpdate(fresh(),d=>acquire(d,'diner','leased',undefined,'fastfood'),INITIAL_STATE);
 e=applyDistrictUpdate(e,d=>acquire(d,'shop','owned'),INITIAL_STATE);
 assert.equal(e.district.businesses.diner.tenure,'leased');
 assert.equal(e.district.businesses.shop.tenure,'owned');
 const before=structuredClone(e);
 const frame=unityFrame({state:INITIAL_STATE,district:e.district,restaurants:e.restaurants,worldProgress:0,focus:null,selected:null},view);
 assert.deepEqual(frame.properties.filter(p=>p.owned).map(p=>[p.id,p.tenure]),[['diner','leased'],['shop','owned']]);
 assert.ok(frame.properties.some(p=>p.offer==='lease'&&!p.owned&&p.tenure===undefined));
 assert.deepEqual(e,before);
});
test('Unity floor views carry the selected floor and the lodging roof facilities',()=>{
 const e=newGame('sandbox');
 for(const id of ['hotel','apartments']){
  const business=e.district.businesses[id];
  assert.ok(business?.lodging);
  business.lodging.facilities=['laundry','gym'];business.lodging.openFloors=2;
  const input={state:Object.values(e.restaurants)[0],restaurants:e.restaurants,district:e.district,worldProgress:2,focus:id,selected:null};
  const ground=unityFrame(input,{...view,floor:0}),second=unityFrame(input,{...view,floor:2});
  assert.equal(ground.floor,0);assert.equal(second.floor,2);
  assert.deepEqual(second.facilities,['laundry','gym']);
  assert.equal(second.properties.find(p=>p.id===id)?.floors,2);
 }
});
const storage=()=>{const data=new Map<string,string>();return{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);},data};};

test('Unity normal career uses the current React start, while only sandbox starts with owned businesses',()=>{
 for(const mode of [null,'fast-track','career']){
  const e=newGame(mode);assert.equal(e.district.market?.ownerCash,250000);assert.equal(Object.keys(e.district.businesses).length,0);
  const frame=unityFrame({state:INITIAL_STATE,district:e.district,restaurants:e.restaurants,worldProgress:0,focus:null,selected:null},view);
  assert.equal(frame.properties.filter(p=>p.owned).length,0);assert.equal(frame.market,true);
 }
 const sandbox=newGame('sandbox');assert.ok(Object.keys(sandbox.district.businesses).length>=7);
});

test('Unity keeps every property at its original address and does not place internal mall shops over their parent',()=>{
 const e=newGame('sandbox');e.district.businesses['mall-cafe-0']={...createBusiness('owned'),mallCompany:{parent:'park',unit:0,rent:260,chargedWeek:0,due:0,lastRetry:-1,totalRent:0}};
 const frame=unityFrame({state:INITIAL_STATE,district:e.district,restaurants:e.restaurants,worldProgress:0,focus:null,selected:null},view);
 for(const p of frame.properties){const original=propertyById(p.id,e.district.businesses[p.id]);if(original){assert.equal(p.x,original.position[0]);assert.equal(p.z,original.position[2]);}}
 assert.equal(frame.properties.find(p=>p.id==='mall-cafe-0')?.offer,'internal');
 assert.equal(frame.properties.find(p=>p.id==='hotel')?.floors,e.district.businesses.hotel.lodging!.openFloors);
 assert.equal(frame.properties.find(p=>p.id==='apartments')?.floors,e.district.businesses.apartments.lodging!.openFloors);
});

test('Unity snapshot keeps commercial listings stable and never changes the economy',()=>{
 const e=fresh(),before=structuredClone(e),state=structuredClone(INITIAL_STATE);
 const frame=unityFrame({state,district:e.district,restaurants:e.restaurants,worldProgress:0,focus:null,selected:null},view);
 assert.deepEqual(e,before);assert.equal(frame.version,1);
 assert.equal(new Set(frame.properties.map(p=>p.id)).size,frame.properties.length);
 for(const plot of LAND_PLOTS){const p=frame.properties.find(p=>p.id===siteOffer(plot,e.district.market?.listingSeed).id);assert.ok(p);assert.equal(p.existing,siteOffer(plot,e.district.market?.listingSeed).mode!=='land');}
 assert.equal(frame.properties.find(p=>p.id==='public-garden')?.offer,'public');
 assert.ok(frame.properties.filter(p=>['diner','cafe','bistro','shop','hotel','apartments','park'].includes(p.id)).every(p=>['lease','purchase'].includes(p.offer)));
});

test('acquired business replaces its plot and connects the actual tables, customers and staff',()=>{
 const e=applyDistrictUpdate(fresh(),d=>acquire(d,'built-commercial-restaurant','owned',undefined,'italian'),INITIAL_STATE);
 const r=e.restaurants[e.activeRestaurantId];assert.ok(r);
 const frame=unityFrame({state:r,district:e.district,restaurants:e.restaurants,worldProgress:0,focus:e.activeRestaurantId,selected:null},view);
 assert.equal(frame.tables.length,r.tables.length);assert.equal(frame.staff.length,r.waiterEntities.length+r.cleanerEntities.length+r.chefEntities.length);
 assert.ok(frame.staff.every(person=>person.cast.id&&person.cast.height>0));
 assert.ok(!frame.properties.some(p=>p.id==='plot-commercial'));
 assert.equal(frame.properties.find(p=>p.id===e.activeRestaurantId)?.owned,true);
 const running=startEmpireWeek(e),before=structuredClone(running);
 unityFrame({state:r,district:running.district,restaurants:running.restaurants,worldProgress:3,focus:r?'built-commercial-restaurant':null,selected:null},view);
 assert.deepEqual(running,before);const next=advanceEmpire(running,.1,advanceGame);assert.ok(next.district.week>=1);
});

test('Unity events cannot spend money or select unknown properties',()=>{
 const ids=new Set(['diner','plot-commercial']);
 assert.ok(validUnityEvent({type:'select',id:'diner'},ids));assert.ok(validUnityEvent({type:'interact',action:'clean',id:2},ids));
 assert.ok(validUnityEvent({type:'overview'},ids));
 for(const message of [{type:'purchase',cost:0},{type:'select',id:'missing'},{type:'interact',action:'setCash'},{type:'interact',action:'clean',id:-1},null])assert.equal(validUnityEvent(message,ids),false);
});

test('street windows receive each owned restaurants actual layout and never substitute the focused business',()=>{
 const e=newGame('sandbox'),before=structuredClone(e);
 const ids=Object.keys(e.restaurants);assert.ok(ids.length>1);
 e.restaurants[ids[1]].tables[0].x=75;
 const frame=unityFrame({state:e.restaurants[ids[0]],district:e.district,restaurants:e.restaurants,worldProgress:0,focus:null,selected:null},view);
 assert.equal(frame.tables.length,0);
 for(const id of ids){
  const street=frame.frontages.find(f=>f.id===id);assert.ok(street);
  assert.equal(street.tables.length,e.restaurants[id].tables.length);
  assert.equal(street.staff.length,e.restaurants[id].waiterEntities.length+e.restaurants[id].chefEntities.length+e.restaurants[id].cleanerEntities.length);
 }
 assert.notDeepEqual(frame.frontages.find(f=>f.id===ids[0])?.tables,frame.frontages.find(f=>f.id===ids[1])?.tables);
 assert.deepEqual(e.district,before.district);
});

test('save migration copies once and leaves every original save and lock unchanged',()=>{
 const s=storage(),source=browserSaveKey(null),target=unitySaveKey(null),raw=JSON.stringify(fresh());
 s.setItem(source,raw);s.setItem(source+'-leader','another-tab');s.setItem(source+'-revision','original');
 assert.equal(copyBrowserSave(s,null),'copied');assert.equal(s.getItem(target),raw);assert.equal(s.getItem(source),raw);assert.equal(s.getItem(source+'-leader'),'another-tab');assert.equal(s.getItem(source+'-revision'),'original');
 s.setItem(target,'do not overwrite');assert.equal(copyBrowserSave(s,null),'existing-unity');assert.equal(s.getItem(target),'do not overwrite');
});

test('unreadable or resetting browser saves are preserved',()=>{
 const s=storage(),source=browserSaveKey(null);s.setItem(source,'broken');assert.equal(copyBrowserSave(s,null),'invalid-source');assert.equal(s.getItem(source),'broken');assert.equal(s.getItem(unitySaveKey(null)),null);
 s.setItem(source,JSON.stringify(fresh()));s.setItem(source+'-resetting','yes');assert.equal(copyBrowserSave(s,null),'source-busy');assert.equal(s.getItem(unitySaveKey(null)),null);
});


test('reset and restore affect only the selected Unity slot, with a recoverable backup',()=>{
 const s=storage(),original=JSON.stringify(fresh()),key=unitySaveKey(null);
 s.setItem(browserSaveKey(null),original);s.setItem(key,original);s.setItem(key+'-play','unreadable older side save');
 const changed=fresh();changed.district.week=4;const raw=JSON.stringify(changed);
 replaceUnitySave(s,null,raw);
 assert.equal(s.getItem(key),raw);assert.equal(s.getItem(browserSaveKey(null)),original);
 assert.equal(s.getItem(key+'-play'),null);assert.equal(s.getItem(key+'-resetting'),null);
 assert.equal(JSON.parse(s.getItem(key+'-reset-backup')!).primary,original);
 assert.ok(s.getItem(key+'-revision'));
 assert.throws(()=>replaceUnitySave(s,null,'invalid'));assert.equal(s.getItem(key),raw);
});

test('an interrupted Unity reset retains a usable backup and releases its reset guard',()=>{
 const s=storage(),key=unitySaveKey(null),raw=JSON.stringify(fresh());s.setItem(key,raw);
 let fail=true;const wrapped={...s,setItem:(k:string,v:string)=>{if(k===key&&fail){fail=false;throw new Error('Storage full');}s.setItem(k,v);}};
 assert.throws(()=>replaceUnitySave(wrapped,null,raw),/Storage full/);
 assert.equal(s.getItem(key),raw);assert.equal(s.getItem(key+'-resetting'),null);
 assert.equal(JSON.parse(s.getItem(key+'-reset-backup')!).primary,raw);
});


test('Unity receives shelf stock rather than backroom totals, and keeps electronics upstairs',()=>{
 const e=applyDistrictUpdate(fresh(),d=>acquire(d,'shop','owned'),INITIAL_STATE);
 const b=e.district.businesses.shop;assert.ok(b?.retail?.store);
 const id=b.retail.shelves[0];b.retail.stock[id]=30;b.retail.store.shelf[id]=2;
 const frame=unityFrame({state:INITIAL_STATE,district:e.district,restaurants:e.restaurants,worldProgress:2,focus:'shop',selected:null},view);
 assert.equal(frame.stock.find(item=>item.id===id)?.quantity,2);
 assert.equal(frame.stock.find(item=>item.id===id)?.floor,0);
 assert.equal(frame.speed,0);
});
