import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,advanceGame} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,startEmpireWeek,advanceEmpire,parseEmpireSave} from '../src/empire/empire';
import {propertyById,hireBusinessStaff} from '../src/prototype/expansionModel';
import type {Business,ExpansionState} from '../src/prototype/expansionModel';
import {ensurePlaza,advancePlaza,managePlaza,startPlazaWeek,newPlazaUnit,mallWeeklyUpkeep,mallAppeal} from '../src/empire/plaza';
import {ensureMallDepth,mallFloorChecks,manageMallDepth,mallReceivable,retryMallCollections,mallFacilityCoverage,mallRoleCoverage,serviceMallZone,mallZoneBlocker,closeMallWeek} from '../src/empire/mallDepth';
import {orderBusinessStock} from '../src/inventory/businessStockroom';
import {venueFinancials} from '../src/empire/venueFinance';
import {weeklyProfitLoss} from '../src/empire/weeklyFinance';
import {protectedObligations} from '../src/empire/cashProtection';
const p=propertyById('park')!;
const fresh=()=>unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);
const put=(s:ExpansionState,b:Business)=>({...s,businesses:{...s.businesses,park:b}});
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.001,`${a} != ${b}`);
function balanced(s:ExpansionState){const b=s.businesses.park,f=venueFinancials(p,b,s);near(f.assets,f.liabilities+f.equity);near(f.closingCash,b.cash);}
function equipped(floors=2){let s=fresh().district,b=s.businesses.park;b=ensureMallDepth({...b,plaza:{...b.plaza!,openFloors:floors},venue:{...b.venue!,units:Array.from({length:floors*4},(_,i)=>newPlazaUnit(i))}});s=put(s,b);for(const id of ['stock-3','stock-4','stock-5'])s=orderBusinessStock(s,'park',id,10,'emergency');return s;}

test('mall migration preserves open floors, tenants, cash and included facility contracts without invented history or stock',()=>{
 const s=equipped(3),b=s.businesses.park,old={...b,plaza:{...b.plaza!,depth:undefined,facilities:['play' as const]}};const migrated=ensurePlaza(p,old);
 assert.equal(migrated.cash,old.cash);assert.deepEqual(migrated.venue,old.venue);assert.deepEqual(migrated.books,old.books);assert.equal(migrated.plaza!.depth!.zones.length,3);assert.deepEqual(migrated.plaza!.depth!.legacyFacilities,['play']);assert.equal(migrated.plaza!.depth!.history.length,0);assert.equal(ensurePlaza(p,migrated),migrated);
 const e={...fresh(),district:put(s,migrated)},loaded=parseEmpireSave(JSON.stringify(e))!;assert.deepEqual(loaded.district.businesses.park,JSON.parse(JSON.stringify(migrated)));
});

test('mall floors require service readiness, completed occupancy/profit history and protected operating cash',()=>{
 let s=fresh().district,b=s.businesses.park;b={...b,plaza:{...b.plaza!,leasesSigned:4}};s=put(s,b);assert.equal(managePlaza(s,'park',{type:'floor',floor:2}).businesses.park,b);
 const history=[1,2].map(week=>({week,occupancy:80,profit:100,satisfaction:85,footfall:[100],complete:true}));
 s={...s,week:3};s=put(s,{...b,plaza:{...b.plaza!,depth:{...b.plaza!.depth!,history}}});assert.ok(mallFloorChecks(p,s.businesses.park,s).every(c=>c.met));
 const poor=put(s,{...s.businesses.park,cash:6500});assert.equal(managePlaza(poor,'park',{type:'floor',floor:2}).businesses.park,poor.businesses.park);
 const partial=put(s,{...s.businesses.park,plaza:{...s.businesses.park.plaza!,depth:{...s.businesses.park.plaza!.depth!,history:history.map(h=>({...h,complete:false}))}}});assert.equal(managePlaza(partial,'park',{type:'floor',floor:2}).businesses.park,partial.businesses.park);
 s=managePlaza(s,'park',{type:'floor',floor:2});assert.equal(s.businesses.park.plaza!.openFloors,2);assert.equal(s.businesses.park.plaza!.depth!.zones.length,2);assert.equal(managePlaza(s,'park',{type:'floor',floor:2}),s);
 b=s.businesses.park;s=put(s,{...b,plaza:{...b.plaza!,leasesSigned:8},venue:{...b.venue!,units:b.venue!.units.map((u,i)=>({...u,occupied:i<6}))}});assert.ok(mallFloorChecks(p,s.businesses.park,s).every(c=>c.met));
 s=managePlaza(s,'park',{type:'floor',floor:3});b=s.businesses.park;s=put(s,{...b,plaza:{...b.plaza!,leasesSigned:12}});assert.ok(mallFloorChecks(p,s.businesses.park,s).some(c=>!c.met&&c.label.includes('coverage')));
 s=hireBusinessStaff(s,'park','security');s=hireBusinessStaff(s,'park','cleaner');s=put(s,{...s.businesses.park,plaza:{...s.businesses.park.plaza!,depth:{...s.businesses.park.plaza!.depth!,satisfaction:80}}});assert.ok(mallFloorChecks(p,s.businesses.park,s).some(c=>!c.met&&c.label.includes('Cash')));
 balanced(s);
});

test('shop offers capture chosen term and fixed rent; accepted renewals begin at expiry without an extra signing charge',()=>{
 let s=fresh().district;s=manageMallDepth(s,'park',{type:'term',term:24});let b=startPlazaWeek({...s.businesses.park,venue:{...s.businesses.park.venue!,running:true}},1);b=advancePlaza(p,b,4,1,1);s=put(s,b);const app=b.plaza!.applications[0];assert.equal(app.term,24);
 s=manageMallDepth(s,'park',{type:'term',term:8});s=managePlaza(s,'park',{type:'accept',id:app.id});const tenant=s.businesses.park.venue!.units[app.unit];assert.equal(tenant.leaseEnd,25);near(s.businesses.park.cash,b.cash+app.rate);assert.equal(managePlaza(s,'park',{type:'accept',id:app.id}),s);
 s={...s,week:23};const cash=s.businesses.park.cash;s=manageMallDepth(s,'park',{type:'renew',unit:app.unit,term:16,rate:app.rate+10});near(s.businesses.park.cash,cash);assert.ok(s.businesses.park.plaza!.depth!.tenants[app.unit].renewal!.accepted);assert.equal(manageMallDepth(s,'park',{type:'renew',unit:app.unit,term:8,rate:app.rate}),s);
 b=startPlazaWeek(s.businesses.park,25);assert.equal(b.venue!.units[app.unit].rent,app.rate+10);assert.equal(b.venue!.units[app.unit].leaseEnd,41);near(b.cash,cash+app.rate+10-mallWeeklyUpkeep(b));near(startPlazaWeek(b,25).cash,b.cash);balanced(put(s,b));
});

test('overdue tenant rent is a receivable, daily collection never counts the income twice and weather cannot change signed rent',()=>{
 let s=fresh().district,b=s.businesses.park;b={...b,plaza:{...b.plaza!,depth:{...b.plaza!.depth!,tenants:{0:{health:20,term:8}}}},venue:{...b.venue!,running:true,units:b.venue!.units.map((u,i)=>i?u:{...u,occupied:true,tenantName:'Late tenant',rent:200,rentWeek:2,leaseEnd:10})}};
 const cash=b.cash;b=startPlazaWeek(b,3);near(mallReceivable(b),200);near(b.cash,cash-mallWeeklyUpkeep(b));near(b.books!.revenue,200);balanced(put(s,b));
 const again=startPlazaWeek(b,3);near(mallReceivable(again),200);near(again.books!.revenue,200);
 b=retryMallCollections(b,3,2);near(mallReceivable(b),200);b=retryMallCollections(b,3,4);near(mallReceivable(b),0);near(b.cash,cash+200-mallWeeklyUpkeep(b));near(b.books!.revenue,200);near(retryMallCollections(b,3,4).cash,b.cash);balanced(put(s,b));
 const a=advancePlaza(p,b,1,3,4,1),rain=advancePlaza(p,b,1,3,4,1.2);assert.ok(rain.plaza!.footfall>a.plaza!.footfall);near(rain.cash,a.cash);near(rain.books!.revenue,a.books!.revenue);assert.equal(rain.venue!.units[0].rent,200);
});

test('mall upkeep accrues as debt without negative cash and retries after funds arrive',()=>{
 let s=fresh().district,b=s.businesses.park;b={...b,cash:0,books:{...b.books!,capital:b.books!.capital-b.cash}};b=startPlazaWeek(b,1);near(b.cash,0);near(b.plaza!.depth!.serviceDue,18);near(b.books!.maintenance,18);balanced(put(s,b));
 assert.ok(protectedObligations(p,b,s).total>=18);b={...b,cash:20,books:{...b.books!,capital:b.books!.capital+20}};b=retryMallCollections(b,1,2);near(b.cash,2);near(b.plaza!.depth!.serviceDue,0);near(b.books!.maintenance,18);balanced(put(s,b));
});

test('play and leisure facilities need actual staff and supplies; assignments and pausing alter coverage without duplicate costs',()=>{
 let s=equipped(2);s=managePlaza(s,'park',{type:'facility',facility:'play'});let b=s.businesses.park;assert.equal(mallFacilityCoverage(b,'play'),0);near(mallAppeal(b),1);
 s=hireBusinessStaff(s,'park','attendant');b=s.businesses.park;near(mallFacilityCoverage(b,'play'),1);near(mallAppeal(b),1.16);
 s=manageMallDepth(s,'park',{type:'assign',role:'attendant',floor:0});assert.equal(mallRoleCoverage(s.businesses.park,'attendant',1),0);assert.equal(mallFacilityCoverage(s.businesses.park,'play'),0);
 s=manageMallDepth(s,'park',{type:'assign',role:'attendant',floor:1});s=manageMallDepth(s,'park',{type:'pause',facility:'play',paused:true});assert.equal(mallFacilityCoverage(s.businesses.park,'play'),0);near(mallWeeklyUpkeep(s.businesses.park),36+45*.25);
 assert.equal(hireBusinessStaff(fresh().district,'park','operator').businesses.park.hires,undefined);balanced(s);
});

test('shared-zone jobs consume paper, parts and safety stock at actual cost; missing stock is explained and repeated care is free',()=>{
 let s=equipped(3),b=s.businesses.park;b={...b,plaza:{...b.plaza!,facilities:['foodcourt'],depth:{...b.plaza!.depth!,zones:b.plaza!.depth!.zones.map((z,i)=>i===2?{cleanliness:40,condition:30,safety:40}:z)}}};s=put(s,b);
 const before=b.inventory!,cash=b.cash;b=serviceMallZone(b,2,1,1);assert.equal(b.inventory!['stock-0'],before['stock-0']-2);assert.equal(b.inventory!['stock-3'],before['stock-3']-1);assert.equal(b.inventory!['stock-5'],before['stock-5']-1);assert.equal(serviceMallZone(b,2,1,1),b);
 b=serviceMallZone(b,2,1,1,true);near(b.cash,cash-15);assert.equal(b.inventory!['stock-4'],before['stock-4']-1);assert.equal(b.inventory!['stock-2'],before['stock-2']-1);assert.equal(serviceMallZone(b,2,1,1,true),b);balanced(put(s,b));
 b={...b,inventory:{...b.inventory,'stock-4':0},plaza:{...b.plaza!,depth:{...b.plaza!.depth!,zones:[{cleanliness:100,condition:20,safety:100},...b.plaza!.depth!.zones.slice(1)]}}};assert.match(mallZoneBlocker(b,0,true)!,/light bulbs/);
});

test('real completed mall weeks record weighted occupancy and exact profit for readiness; partial history cannot unlock a floor',()=>{
 let e=fresh();e.district=managePlaza(e.district,'park',{type:'auto',enabled:true});
 for(let week=1;week<=2;week++){e=startEmpireWeek(e);for(let i=0;i<500&&e.district.week===week;i++)e=advanceEmpire(e,1,advanceGame);const b=e.district.businesses.park,report=e.district.closedWeek!.reports.find(r=>r.id==='park')!,h=b.plaza!.depth!.history.at(-1)!;assert.equal(h.week,week);assert.ok(h.complete);near(h.profit,report.profit);assert.ok(h.occupancy>=75);assert.equal(closeMallWeek(b,report),b);balanced(e.district);}
 assert.ok(mallFloorChecks(p,e.district.businesses.park,e.district).every(c=>c.met));e.district=managePlaza(e.district,'park',{type:'floor',floor:2});assert.equal(e.district.businesses.park.plaza!.openFloors,2);
 const parsed=parseEmpireSave(JSON.stringify(e))!;assert.deepEqual(parsed.district.businesses.park.plaza,e.district.businesses.park.plaza);
});
