import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,advanceGame} from '../src/hooks/useGameLoop';
import {createFastTrackEmpire,applyDistrictUpdate,parseEmpireSave,startEmpireWeek,advanceEmpire} from '../src/empire/empire';
import {acquire,acquireMarketProperty,propertyById,initialExpansion} from '../src/prototype/expansionModel';
import {LAND_PLOTS,builtPropertyId,canConstruct,constructionIdentity} from '../src/empire/propertyMarket';
import {OUTER_LOTS,isOuterPark,buildOuterCity} from '../src/graphics/outerCity';
import {COMMERCIAL_PARCELS,commercialParcelAt} from '../src/graphics/commercialParcels';
import {CITY_LOTS} from '../src/graphics/cityDistrictLayout';
import {consolidatedBalance} from '../src/career/consolidation';

const fresh=()=>createFastTrackEmpire(structuredClone(INITIAL_STATE));
const open=(e:ReturnType<typeof fresh>,id:string,type?:'italian'|'fastfood')=>applyDistrictUpdate(e,s=>acquire(s,id,'owned',Object.keys(s.businesses)[0],type),INITIAL_STATE);
const remote=COMMERCIAL_PARCELS.filter(p=>p.id.startsWith('city-'));

test('every commercial address is developable, while parks, civic, homes and factories stay protected',()=>{
 assert.ok(remote.length>100);assert.equal(new Set(LAND_PLOTS.map(p=>p.id)).size,LAND_PLOTS.length);
 assert.equal(new Set(LAND_PLOTS.map(p=>p.position.join(','))).size,LAND_PLOTS.length);
 for(const l of OUTER_LOTS){assert.equal(!!commercialParcelAt(l.x,l.z),l.zone==='commercial'&&!isOuterPark(l.x,l.z),`${l.x},${l.z}`);}
 for(const l of CITY_LOTS.filter(p=>p.zone==='commercial'))assert.ok(LAND_PLOTS.some(p=>p.position[0]===l.position[0]&&Math.abs(p.position[2]-l.position[2])<4));
 assert.ok(remote.some(p=>p.position[0]===250));assert.ok(remote.some(p=>p.position[2]===250));assert.ok(remote.some(p=>p.position[2]===-250));
 for(const p of LAND_PLOTS)for(const kind of p.kinds){const id=builtPropertyId(p.id,kind);assert.ok(canConstruct(id));assert.deepEqual(propertyById(id)?.position,p.position);}
 assert.equal(propertyById('built-city-0-0-restaurant'),undefined);assert.equal(constructionIdentity('built-unknown-shop'),null);
});

test('new remote businesses have stock, staff, accounts, floors and independent loans; parcels survive reload',()=>{
 let e=fresh();e.district.market!.level=4;
 const p=remote[0],q=remote.at(-1)!,hotel=builtPropertyId(p.id,'hotel'),home=builtPropertyId(q.id,'apartments');
 e=open(e,hotel);assert.equal(e.district.businesses[hotel].lodging!.openFloors,1);assert.equal(e.district.businesses[hotel].venue!.units.length,4);
 e=open(e,home);assert.equal(e.district.businesses[home].lodging!.openFloors,1);assert.equal(e.district.businesses[home].venue!.units.length,3);
 assert.equal(e.district.businesses[home].cash,12000);assert.equal(e.district.businesses[hotel].cash,154000);
 assert.equal(e.district.loans[0].from,hotel);assert.equal(e.district.loans[0].to,home);assert.equal(e.district.loans[0].principal,58000);
 assert.ok(e.district.businesses[home].stockroom);assert.ok(e.district.businesses[hotel].crew?.length);
 assert.ok(Math.abs(consolidatedBalance(e).difference)<.02);
 const loaded=parseEmpireSave(JSON.stringify(e))!;assert.deepEqual(loaded.district.market!.parcels,{[p.id]:hotel,[q.id]:home});
 const running=advanceEmpire(startEmpireWeek(loaded),3,advanceGame);assert.ok(running.district.businesses[hotel].venue!.clock>0);assert.ok(running.district.businesses[home].venue!.clock>0);
 const conflicting=JSON.parse(JSON.stringify(e));conflicting.district.market.parcels[q.id]=hotel;assert.equal(parseEmpireSave(JSON.stringify(conflicting)),null);
 const missing=JSON.parse(JSON.stringify(e));delete missing.district.market.parcels[p.id];assert.equal(parseEmpireSave(JSON.stringify(missing)),null);
});

test('remote restaurant and supermarket open ready; occupied plots cannot be bought twice or changed by another purchase',()=>{
 const plot=remote.find(p=>!p.vacant)!,id=builtPropertyId(plot.id,'restaurant');
 let e=open(fresh(),id,'italian');assert.equal(e.restaurants[id].restaurantType,'italian');assert.equal(e.restaurants[id].money,90000);assert.ok(e.restaurants[id].staff.waiters);assert.ok(e.restaurants[id].activeMenu.length);
 const again=open(e,builtPropertyId(plot.id,'shop'));assert.deepEqual(again.district.businesses,e.district.businesses);assert.equal(again.district.loans.length,0);
 const second=remote.find(p=>p.vacant)!,shop=builtPropertyId(second.id,'shop');e=open(fresh(),shop);assert.equal(e.district.businesses[shop].retail!.store!.level,1);assert.ok(e.district.businesses[shop].retail!.shelves.every(k=>e.district.businesses[shop].retail!.stock[k]>0));
 assert.equal(e.district.businesses[shop].cash,85000);assert.ok(parseEmpireSave(JSON.stringify(e)));
 const gated=open(fresh(),builtPropertyId(plot.id,'hotel'));assert.equal(Object.keys(gated.district.businesses).length,0);
});

test('mall is purchasable at Level 5 but cannot be built or leased through any acquisition path',()=>{
 let e=fresh();e.district.market!.level=5;
 for(const id of ['built-large-plaza',builtPropertyId(remote[0].id,'plaza')]){
   assert.equal(canConstruct(id),false);assert.equal(Object.keys(open(e,id).district.businesses).length,0);
   assert.equal(Object.keys(acquireMarketProperty(e.district,id,'owned','').businesses).length,0);
   const legacy=initialExpansion(100000);assert.equal(acquire(legacy,id,'owned').businesses[id],undefined);
 }
 assert.ok(LAND_PLOTS.every(p=>!p.kinds.includes('plaza')));assert.ok(propertyById('built-large-plaza'),'Old saves must remain readable');
 assert.equal(acquire(e.district,'park','leased','').businesses.park,undefined);
 e=open(e,'park');assert.ok(e.district.businesses.park);assert.equal(e.district.businesses.park.plaza!.openFloors,1);assert.equal(e.district.businesses.park.acquisition!.method,'purchase');
});

test('building on a remote site removes the old scenery and parked cars without reshuffling neighboring resources',()=>{
 const site=remote.find(p=>!p.vacant&&p.position[0]>0&&p.position[2]>0)!;
 const placements=()=>({trees:[],cars:[]});const a=placements(),b=placements();
 const original=buildOuterCity(0,true,{trees:true,cars:true,placements:a},{developed:new Set()});
 const changed=buildOuterCity(0,true,{trees:true,cars:true,placements:b},{developed:new Set([site.id])});
 const belongs=(c:{x:number;z:number})=>Math.abs(c.x-site.position[0])<9&&Math.abs(c.z-site.position[2])<9;
 assert.ok(a.cars.some(belongs));assert.ok(!b.cars.some(belongs));assert.deepEqual(b.cars,a.cars.filter(c=>!belongs(c)));assert.deepEqual(b.trees,a.trees);
 assert.ok(changed.solid.getAttribute('position').count<original.solid.getAttribute('position').count);
 Object.values(original).forEach(g=>g.dispose());Object.values(changed).forEach(g=>g.dispose());
});
