import test from 'node:test';
import type {ExpansionState} from '../src/prototype/expansionModel';
function prepared(s:ExpansionState){const b=s.businesses.park;return {...s,week:3,businesses:{...s.businesses,park:{...b,hires:{...b.hires,security:1,cleaner:1},venue:{...b.venue!,units:b.venue!.units.map(u=>({...u,occupied:true}))},plaza:{...b.plaza!,depth:{...b.plaza!.depth!,satisfaction:90,history:[1,2].map(week=>({week,occupancy:100,profit:100,satisfaction:90,footfall:[],complete:true}))}}}}};}
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {INITIAL_STATE,advanceGame} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,parseEmpireSave,applyDistrictUpdate,startEmpireWeek,advanceEmpire} from '../src/empire/empire';
import {PROPERTIES,PUBLIC_GARDEN,propertyById,lendCash} from '../src/prototype/expansionModel';
import {CITY_LOTS} from '../src/graphics/cityDistrictLayout';
import {ensurePlaza,managePlaza,advancePlaza,startPlazaWeek,SHOP_TYPES,plazaFloorCost,mallWeeklyUpkeep,mallAppeal,MALL_FACILITIES,MALL_FLOORS,PLAZA_FLOORS} from '../src/empire/plaza';
import {plazaInteriorGeometry,plazaShopRoute,mallPlayRoute,MALL_SIZE,mallExteriorGeometry} from '../src/components/ShoppingPlaza3D';
import {propertyInteriorPlacement} from '../src/graphics/propertyArchitecture';
import {venueFinancials} from '../src/empire/venueFinance';
const fresh=()=>unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);
const p=propertyById('park')!;
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.001,`${a} != ${b}`);

test('garden is public scenery; plaza occupies its own clear plot and old accounts migrate without losing money or debt',()=>{
 assert.equal(p.kind,'plaza');assert.equal(PROPERTIES.some(v=>v.kind==='park'),false);assert.ok(!PROPERTIES.includes(PUBLIC_GARDEN));assert.notDeepEqual(p.position,PUBLIC_GARDEN.position);
 for(const lot of CITY_LOTS)assert.notDeepEqual(lot.position,p.position,'plaza must not overlap a scenery building');
 let e=fresh();e=applyDistrictUpdate(e,s=>lendCash(s,'diner','park',123),INITIAL_STATE);
 const raw=structuredClone(e);delete raw.district.businesses.park.plaza;raw.district.businesses.park.venue!.units=[];
 const before=structuredClone(raw.district.businesses.park),loaded=parseEmpireSave(JSON.stringify(raw))!,b=loaded.district.businesses.park;
 assert.equal(b.cash,before.cash);assert.deepEqual(b.books,before.books);assert.deepEqual(b.weeklyBooks,before.weeklyBooks);assert.deepEqual(b.inventory,before.inventory);assert.deepEqual(loaded.district.loans,raw.district.loans);assert.equal(b.plaza!.openFloors,1);assert.equal(b.venue!.units.length,4);assert.equal(ensurePlaza(p,b),b);
 assert.deepEqual(parseEmpireSave(JSON.stringify(loaded)),loaded);
});

test('shop leases pay once on signing and once each later week; signed rent survives asking-price changes and leases expire',()=>{
 let e=startEmpireWeek(fresh()),s=e.district;const base=s.businesses.park;
 s={...s,businesses:{...s.businesses,park:advancePlaza(p,base,4,s.week,s.day)}};
 const app=s.businesses.park.plaza!.applications[0];assert.ok(app);
 s=managePlaza(s,'park',{type:'accept',id:app.id});near(s.businesses.park.cash,base.cash+app.rate);
 assert.equal(managePlaza(s,'park',{type:'accept',id:app.id}),s);
 const booked=s.businesses.park.venue!.units[app.unit],asked=booked.rate!+50;
 s=managePlaza(s,'park',{type:'rate',unit:app.unit,rate:asked});assert.equal(s.businesses.park.venue!.units[app.unit].rent,app.rate);
 let b=startPlazaWeek(s.businesses.park,1);near(b.cash,s.businesses.park.cash);
 b=startPlazaWeek(b,2);near(b.cash,s.businesses.park.cash+app.rate-mallWeeklyUpkeep(b));assert.equal(startPlazaWeek(b,2).cash,b.cash);
 const ending=startPlazaWeek(b,booked.leaseEnd!);assert.equal(ending.venue!.units[app.unit].occupied,false);assert.equal(ending.venue!.units[app.unit].dirty,true);near(ending.cash,b.cash-mallWeeklyUpkeep(b));
});

test('floor progression creates distinct new shops, rejects repeated and unaffordable construction, and accounts for capital costs',()=>{
 let s=fresh().district,b=s.businesses.park;
 assert.equal(managePlaza(s,'park',{type:'floor',floor:2}).businesses.park,b);
 s={...s,businesses:{...s.businesses,park:{...b,plaza:{...b.plaza!,leasesSigned:4}}}};
 s=prepared(s);const cost=plazaFloorCost(s.businesses.park);s=managePlaza(s,'park',{type:'floor',floor:2});assert.equal(s.businesses.park.plaza!.openFloors,2);assert.equal(s.businesses.park.venue!.units.length,8);near(s.businesses.park.cash,b.cash-cost);
 assert.equal(managePlaza(s,'park',{type:'floor',floor:2}).businesses.park,s.businesses.park);
 const poor={...s,businesses:{...s.businesses,park:{...s.businesses.park,cash:0,plaza:{...s.businesses.park.plaza!,leasesSigned:8}}}};assert.equal(managePlaza(poor,'park',{type:'floor',floor:3}).businesses.park,poor.businesses.park);
 s={...s,businesses:{...s.businesses,park:{...s.businesses.park,plaza:{...s.businesses.park.plaza!,leasesSigned:8}}}};s=prepared(s);s=managePlaza(s,'park',{type:'floor',floor:3});assert.equal(s.businesses.park.venue!.units.length,12);assert.equal(managePlaza(s,'park',{type:'floor',floor:3}),s);
 const f=venueFinancials(p,s.businesses.park,s);near(f.profit,0);near(f.assets,f.liabilities+f.equity);
});

test('shop refits change type once, reject occupied units, and care consumes supplies without repeat charges',()=>{
 let s=fresh().district;const initial=s.businesses.park;
 s=managePlaza(s,'park',{type:'fitout',unit:0,shop:'florist'});assert.equal(s.businesses.park.venue!.units[0].shopType,'florist');near(s.businesses.park.cash,initial.cash-400);assert.equal(managePlaza(s,'park',{type:'fitout',unit:0,shop:'florist'}),s);
 let b=s.businesses.park;s={...s,businesses:{...s.businesses,park:{...b,venue:{...b.venue!,units:b.venue!.units.map((u,i)=>i?u:{...u,occupied:true,condition:30,dirty:true,cleanliness:30})}}}};
 assert.equal(managePlaza(s,'park',{type:'fitout',unit:0,shop:'bakery'}).businesses.park,s.businesses.park);
 const cash=s.businesses.park.cash;s=managePlaza(s,'park',{type:'repair',unit:0});near(s.businesses.park.cash,cash-15);assert.equal(managePlaza(s,'park',{type:'repair',unit:0}).businesses.park,s.businesses.park);
 s=managePlaza(s,'park',{type:'clean',unit:0});assert.equal(s.businesses.park.venue!.units[0].dirty,false);near(s.businesses.park.cash,cash-15);
 const f=venueFinancials(p,s.businesses.park,s);near(f.profit,-15-.42-.48);near(f.assets,f.liabilities+f.equity);
});

test('plaza leases, wages and rent stay in its account through the empire week cycle and closing P&L',()=>{
 let e=fresh();e=applyDistrictUpdate(e,s=>managePlaza(s,'park',{type:'auto',enabled:true}),INITIAL_STATE);e=startEmpireWeek(e);
 for(let n=0;n<500&&e.district.week===1;n++)e=advanceEmpire(e,1,advanceGame);
 const b=e.district.businesses.park;assert.equal(b.venue!.units.filter(u=>u.occupied).length,4);assert.equal(b.plaza!.leasesSigned,4);
 const closed=e.district.closedWeek!.reports.find(r=>r.id==='park')!;assert.ok(closed.revenue>0);near(closed.wages,95);assert.ok(closed.cogs>0);assert.equal(closed.name,'Willow Galleria Mall');
 const cash=b.cash,rent=b.venue!.units.reduce((n,u)=>n+u.rent!,0);e=startEmpireWeek(e);near(e.district.businesses.park.cash,cash+rent-mallWeeklyUpkeep(b));
 assert.deepEqual(parseEmpireSave(JSON.stringify(e))!.district.businesses.park,JSON.parse(JSON.stringify(e.district.businesses.park)));
});

test('every plaza shop layout keeps its doorway and shopper routes clear of walls and furniture',()=>{
 for(let type=0;type<SHOP_TYPES.length;type++){
  const geometry=plazaInteriorGeometry(Array.from({length:4},(_,i)=>SHOP_TYPES[(type+i)%SHOP_TYPES.length].id));
  assert.ok(geometry.getAttribute('position').count<100000);assert.ok(Array.from(geometry.getAttribute('position').array).every(Number.isFinite));
  const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(geometry,material);mesh.updateMatrixWorld();
  for(let slot=0;slot<4;slot++){const route=plazaShopRoute(slot);for(let j=1;j<route.length;j++){const a=route[j-1],b=route[j],direction=new THREE.Vector3(b[0]-a[0],0,b[1]-a[1]),length=direction.length();direction.normalize();for(const y of [.6,1.3])for(const side of [-.3,0,.3]){const origin=new THREE.Vector3(a[0]-direction.z*side,y,a[1]+direction.x*side),ray=new THREE.Raycaster(origin,direction,.001,length);assert.equal(ray.intersectObject(mesh).length,0,`${SHOP_TYPES[type].name}, shop ${slot}, segment ${j} crosses furniture`);}}}
  material.dispose();geometry.dispose();
 }
});



test('the old plaza becomes a mall without replacing saved shops, signed rents, open floors or accounts',()=>{
 const e=fresh(),b=e.district.businesses.park;
 const legacy=structuredClone(b) as any;legacy.plaza.version=1;delete legacy.plaza.facilities;delete legacy.plaza.operatingWeek;
 legacy.venue.units[0]={...legacy.venue.units[0],occupied:true,rent:377,leaseEnd:12,tenantName:'Saved tenant'};
 const migrated=ensurePlaza(p,legacy);assert.equal(migrated.plaza!.version,2);assert.deepEqual(migrated.venue,legacy.venue);assert.equal(migrated.cash,legacy.cash);assert.deepEqual(migrated.books,legacy.books);assert.deepEqual(migrated.plaza!.facilities,[]);assert.equal(ensurePlaza(p,migrated),migrated);
});

test('all five mall floors and four facilities unlock in order, charge once, and preserve balanced accounts',()=>{
 let s=fresh().district,b=s.businesses.park;
 b={...b,cash:b.cash+100000,books:{...b.books!,capital:b.books!.capital+100000},plaza:{...b.plaza!,leasesSigned:20}};s={...s,businesses:{...s.businesses,park:b}};
 assert.equal(managePlaza(s,'park',{type:'facility',facility:'play'}).businesses.park,b);
 assert.equal(managePlaza(s,'park',{type:'floor',floor:3}),s);
 for(let count=2;count<=PLAZA_FLOORS;count++){
  s=prepared(s);const before=s.businesses.park,cost=plazaFloorCost(before);s=managePlaza(s,'park',{type:'floor',floor:count});
  near(s.businesses.park.cash,before.cash-cost);assert.equal(s.businesses.park.venue!.units.length,count*4);assert.equal(managePlaza(s,'park',{type:'floor',floor:count}),s);
  assert.deepEqual(s.businesses.park.venue!.units.slice((count-1)*4).map(u=>u.shopType),MALL_FLOORS[count-1].shops);
 }
 assert.equal(managePlaza(s,'park',{type:'floor',floor:6}),s);
 for(const facility of MALL_FACILITIES){const before=s.businesses.park.cash;s=managePlaza(s,'park',{type:'facility',facility:facility.id});near(s.businesses.park.cash,before-facility.cost);assert.equal(managePlaza(s,'park',{type:'facility',facility:facility.id}),s);}
 s={...s,businesses:{...s.businesses,park:{...s.businesses.park,hires:{...s.businesses.park.hires,attendant:1,operator:1,cleaner:2},plaza:{...s.businesses.park.plaza!,depth:{...s.businesses.park.plaza!.depth!,legacyFacilities:['play','foodcourt','cinema','roofgarden']}}}}};
 b=s.businesses.park;const f=venueFinancials(p,b,s);near(f.profit,0);near(f.assets,f.liabilities+f.equity);assert.equal(mallWeeklyUpkeep(b),335);near(mallAppeal(b),1.74);
 const running=startPlazaWeek({...b,venue:{...b.venue!,running:true}},1);near(running.cash,b.cash-335);near(running.books!.maintenance,b.books!.maintenance+335);assert.equal(startPlazaWeek(running,1).cash,running.cash);
 const f2=venueFinancials(p,running,{...s,businesses:{...s.businesses,park:running}});near(f2.assets,f2.liabilities+f2.equity);near(f2.profit,-335);
 const without={...running,plaza:{...running.plaza!,facilities:[]}},populated={...running,venue:{...running.venue!,units:running.venue!.units.map(u=>({...u,occupied:true}))}};
 const a=advancePlaza(p,populated,1,1,1),c=advancePlaza(p,{...without,venue:populated.venue},1,1,1);assert.ok(a.plaza!.footfall>c.plaza!.footfall);
});

test('mall facility construction respects cash and between-week controls',()=>{
 let s=fresh().district,b=s.businesses.park;b={...b,plaza:{...b.plaza!,openFloors:2}};
 s={...s,businesses:{...s.businesses,park:{...b,cash:0}}};assert.equal(managePlaza(s,'park',{type:'facility',facility:'play'}).businesses.park,s.businesses.park);
 s={...s,businesses:{...s.businesses,park:{...b,venue:{...b.venue!,running:true}}}};assert.equal(managePlaza(s,'park',{type:'facility',facility:'play'}).businesses.park,s.businesses.park);
});

test('mall interiors are over twice the former area, storeys align, and every themed floor leaves safe walking paths',()=>{
 assert.ok(MALL_SIZE.width*MALL_SIZE.depth>18*20*2);
 for(let floor=0;floor<PLAZA_FLOORS;floor++){
  near(propertyInteriorPlacement(p,floor).position[1],.13+floor*3.6);
  const geometry=plazaInteriorGeometry([...MALL_FLOORS[floor].shops],floor,MALL_FACILITIES.map(f=>f.id));assert.ok(geometry.getAttribute('position').count<100000);
  const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),mesh=new THREE.Mesh(geometry,material);mesh.updateMatrixWorld();
  const routes=[...Array.from({length:4},(_,i)=>plazaShopRoute(i)),...(floor===1?[mallPlayRoute]:[])];
  for(const route of routes)for(let j=1;j<route.length;j++){const a=route[j-1],b=route[j],direction=new THREE.Vector3(b[0]-a[0],0,b[1]-a[1]),length=direction.length();direction.normalize();for(const y of [.4,1.3])for(const side of [-.3,0,.3]){const ray=new THREE.Raycaster(new THREE.Vector3(a[0]-direction.z*side,y,a[1]+direction.x*side),direction,.001,length);assert.equal(ray.intersectObject(mesh).length,0,`floor ${floor}, segment ${j} crosses an object`);}}
  geometry.dispose();material.dispose();
 }
});

test('the signature mall facade is shared across map and cutaways, finite, bounded and compact',()=>{
 for(let levels=0;levels<=5;levels++){
  const model=mallExteriorGeometry(levels,Math.max(1,levels),levels===5);
  for(const g of [model.frame,model.glass]){const a=g.getAttribute('position');if(!a){g.dispose();continue;}assert.ok(a.count<120000);assert.ok(Array.from(a.array).every(Number.isFinite));g.computeBoundingBox();assert.ok(g.boundingBox!.min.x>=-12.3&&g.boundingBox!.max.x<=12.3);assert.ok(g.boundingBox!.max.y<=levels*4.8+3.2,`Storeys ${levels}: height ${g.boundingBox!.max.y}`);g.dispose();}
 }
});
