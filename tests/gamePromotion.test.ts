import test from 'node:test';
import assert from 'node:assert/strict';
import {mainGameUrl} from '../src/unity-comparison/routes';
import {newGame} from '../src/empire/newGame';
import {createEmpire,unlockTestDistrict,startEmpireWeek,advanceEmpire,parseEmpireSave,districtView} from '../src/empire/empire';
import {INITIAL_STATE,advanceGame} from '../src/hooks/useGameLoop';
import {PROPERTIES} from '../src/prototype/expansionModel';
import {unityFrame} from '../src/unity/bridge';
import {comparisonSaveKey,copyComparisonSave,upgradeSandboxSave} from '../src/unity-comparison/saves';

const store=()=>{const data=new Map<string,string>();return{data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};};

test('old game and save bookmarks resolve to one renderer while retaining mode and previews',()=>{
 assert.equal(mainGameUrl('http://localhost/unity-game.html?mode=sandbox'),'/?mode=sandbox');
 assert.equal(mainGameUrl('http://localhost/unity-comparison.html?play=1&mode=sandbox'),'/?mode=sandbox');
 assert.equal(mainGameUrl('http://localhost/unity-comparison.html?play=1&mode=fast-track'),'/?mode=fast-track');
 assert.equal(mainGameUrl('http://localhost/unity-game.html?mode=career&preview=1'),'/?mode=career&preview=1');
 assert.equal(mainGameUrl('http://localhost/unity-comparison.html'),'/?saves=1');
 assert.equal(mainGameUrl('http://localhost/save-slots.html'),'/?saves=1');
});

test('Sandbox has the current city market and every manageable building runs on the shared simulation',()=>{
 let e=newGame('sandbox');const career=newGame('fast-track');
 assert.equal(e.district.week,1);assert.equal(e.district.market?.level,5);
 assert.equal(e.district.market?.ownerCash,1_000_000);
 assert.equal(career.district.market?.ownerCash,250_000);assert.equal(Object.keys(career.district.businesses).length,0);
 assert.equal(Object.keys(e.district.businesses).length,7);
 for(const p of PROPERTIES){
  const b=e.district.businesses[p.id];assert.ok(b.cash>=25000&&b.crew?.length);
  const r=e.restaurants[p.id];
  if(r)assert.ok(r.restaurantType&&r.staff.chefs>0&&r.staff.waiters>0&&Object.keys(r.inventory).length>0);
  else assert.ok(b.venue);
 }
 const snapshot=unityFrame({state:e.restaurants.diner,restaurants:e.restaurants,district:districtView(e),worldProgress:0,focus:null,selected:null},{floor:0,detail:'room',area:'commercial',cutaway:true});
 assert.ok(snapshot.market&&snapshot.properties.length>100,'Sandbox includes the same commercial city, not the old seven-property map');
 assert.ok(snapshot.properties.some(p=>p.id==='park'&&p.kind==='plaza'&&p.owned));
 e=startEmpireWeek(e);
 for(const r of Object.values(e.restaurants))assert.notEqual(r.phase,'planning');
 for(const b of Object.values(e.district.businesses))if(b.venue)assert.ok(b.venue.running);
 for(let tick=0;tick<240;tick++)e=advanceEmpire(e,.25,advanceGame);
 for(const id of ['shop','hotel','apartments','park']){
  const b=e.district.businesses[id];assert.ok(b.venue!.clock>0,id+' simulation advances');
  assert.ok(Number.isFinite(b.cash),id+' balance stays valid');
 }
 assert.ok(e.district.businesses.shop.venue!.totalServed>0,'Supermarket trades without a separate prototype simulation');
 assert.ok(parseEmpireSave(JSON.stringify(e)),'The trading Sandbox remains a valid save');
});

test('older Sandbox city upgrades once with live service, inventory and other saves preserved',()=>{
 const s=store(),key=comparisonSaveKey('sandbox');
 let e=unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);
 e=startEmpireWeek(e);e.restaurants.diner.inventory.water=17;
 const raw=JSON.stringify(e);s.setItem(key,raw);s.setItem(key+'-play',raw);s.setItem(comparisonSaveKey(null),'untouched career');
 assert.equal(upgradeSandboxSave(s),'upgraded');
 const changed=parseEmpireSave(s.getItem(key))!,before=parseEmpireSave(raw)!;
 assert.ok(changed.district.market);
 assert.deepEqual(changed.clock,before.clock);
 assert.equal(changed.restaurants.diner.inventory.water,17);
 for(const [id,r] of Object.entries(before.restaurants)){
  assert.deepEqual(changed.restaurants[id].orders,r.orders);assert.deepEqual(changed.restaurants[id].weekStats,r.weekStats);
  assert.equal(changed.restaurants[id].phase,r.phase);assert.equal(changed.restaurants[id].restaurantLevel,6);
 }
 for(const [id,b] of Object.entries(before.district.businesses)){
  const next=changed.district.businesses[id];assert.equal(next.tenure,b.tenure);
  if(b.venue)assert.deepEqual(next.venue!.units.slice(0,b.venue.units.length),b.venue.units);
  if(b.retail)assert.deepEqual(next.retail!.stock,b.retail.stock);
 }
 assert.equal(JSON.parse(s.getItem(key+'-city-upgrade-backup')!).primary,raw);
 assert.equal(s.getItem(comparisonSaveKey(null)),'untouched career');
 assert.equal(upgradeSandboxSave(s),'current');
});

test('storage failure during Sandbox migration leaves its previous state recoverable',()=>{
 const s=store(),key=comparisonSaveKey('sandbox');
 const raw=JSON.stringify(unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE));s.setItem(key,raw);
 const failing={...s,setItem:(k:string,v:string)=>{if(k===key&&v!==raw)throw new Error('full');s.setItem(k,v);}};
 assert.throws(()=>upgradeSandboxSave(failing),/full/);
 assert.equal(s.getItem(key),raw);assert.equal(s.getItem(key+'-resetting'),null);
 assert.equal(JSON.parse(s.getItem(key+'-city-upgrade-backup')!).primary,raw);
});

test('oldest browser progress can migrate without overwriting the chosen comparison save',()=>{
 const s=store(),raw=JSON.stringify(newGame('fast-track'));s.setItem('bite-tycoon-empire-v1',raw);
 assert.equal(copyComparisonSave(s,null),'copied');assert.equal(s.getItem('bite-tycoon-empire-v1'),raw);
 const chosen=s.getItem(comparisonSaveKey(null));s.setItem('bite-tycoon-empire-v1','invalid replacement');
 assert.equal(copyComparisonSave(s,null),'existing');assert.equal(s.getItem(comparisonSaveKey(null)),chosen);
});
