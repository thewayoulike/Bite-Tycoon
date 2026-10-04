import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {INITIAL_STATE,advanceGame,takeCustomerOrder,type GameState} from '../src/hooks/useGameLoop';
import {createEmpire,updateRestaurant,applyDistrictUpdate,startEmpireWeek,advanceEmpire,unlockTestDistrict,parseEmpireSave,districtView} from '../src/empire/empire';
import {chooseRestaurantType} from '../src/restaurantTypes';
import {hireStaff,serveReadyTable} from '../src/gameplay';
import {restaurantStockPlan} from '../src/restaurantPurchasing';
import {orderRestaurantStock} from '../src/inventory/restaurantStockroom';
import {restaurantUnlockBlocker,upgradeRestaurant,restaurantTableLimit} from '../src/restaurantProgression';
import {buyDiningTable} from '../src/tablePurchases';
import {propertyById,acquire,hireBusinessStaff,lendCash} from '../src/prototype/expansionModel';
import {manageBusinessStockroom} from '../src/inventory/businessStockroom';
import {hotelFloorBlocker} from '../src/empire/hotelProgression';
import {manageLodging} from '../src/empire/lodging';
import {openMallCompany} from '../src/career/mallCompanies';
import {consolidatedBalance} from '../src/career/consolidation';
import {managePlaza} from '../src/empire/plaza';
import {restaurantDepth,repairStation} from '../src/career/restaurant';

function seeded(seed:number){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function ownerHelp(r:GameState){
 // The same order-taking and table-serving functions used by the live buttons.
 for(const c of r.customers)if(c.state==='waiting_order')r=takeCustomerOrder(r,c.id);
 for(const o of r.orders)if(o.state==='ready')r=serveReadyTable(r,o.id);
 // Manual table clearing and fire response have no cost or progress reward in the live game.
 return {...r,orders:r.orders.map(o=>o.isOnFire?{...o,isOnFire:false}:o),tables:r.tables.map(t=>t.isDirty?{...t,isDirty:false}:t)};
}
function orderOpeningStock(r:GameState){
 if(r.staff.hasManager)return r;
 for(const [id,target]of Object.entries(restaurantStockPlan(r).ingredients)){
  const coming=r.stockroom?.orders.filter(o=>o.itemId===id).reduce((n,o)=>n+o.qty,0)??0;
  const needed=Math.max(0,Math.min(30,Math.max(target.target,6))-(r.inventory[id]??0)-coming);
  if(needed&&r.money>450)r=orderRestaurantStock(r,id,needed,r.week===1?'emergency':'standard');
 }
 return r;
}
test('sustained fresh career reaches earned hires, profit, menu expansion, a second property and an upper hotel floor',()=>{
 const originalRandom=Math.random;Math.random=seeded(2309);
 try{
  let e=createEmpire(chooseRestaurantType(structuredClone(INITIAL_STATE),'diner'));const milestones:Record<string,number>={},weeks:any[]=[];
  for(let week=1;week<=60&&!milestones.upperFloor;week++){
   e=updateRestaurant(e,'diner',r=>{r=orderOpeningStock(r);if(r.staff.waiters<1)r=hireStaff(r,'waiter');if(r.staff.cleaners<1&&r.money>650)r=hireStaff(r,'cleaner');if(r.staff.chefs<2&&r.money>900)r=hireStaff(r,'chef');if(!r.staff.hasManager&&r.money>900)r=hireStaff(r,'manager');if(r.staff.hasManager)r={...r,manager:{...r.manager,budget:600,target:30,reserve:250}};
    if(!restaurantUnlockBlocker(r)&&r.restaurantLevel!<3)r=upgradeRestaurant(r);while(r.tables.length<restaurantTableLimit(r)&&r.money>1000){const next=buyDiningTable(r);if(next===r)break;r=next;}
    for(const [station,condition]of Object.entries(restaurantDepth(r).stations))if(condition<50)r=repairStation(r,station as any);return r;});
   const r=e.restaurants.diner;if(r.staff.waiters&&!milestones.waiter)milestones.waiter=week;if((r.restaurantLevel??1)>=2&&!milestones.level2)milestones.level2=week;
   if(!e.district.businesses.hotel&&r.money>9000){e=applyDistrictUpdate(e,s=>acquire(s,'hotel','leased'),INITIAL_STATE);if(e.district.businesses.hotel){milestones.secondBusiness=week;e=applyDistrictUpdate(e,s=>lendCash(s,'diner','hotel',1600,40,'operating'),INITIAL_STATE);for(const role of ['care','service','maintenance','manager'] as const)e=applyDistrictUpdate(e,s=>hireBusinessStaff(s,'hotel',role),INITIAL_STATE);}}
   if(e.district.businesses.hotel&&!hotelFloorBlocker(e.district.businesses.hotel,e.district)&&e.district.businesses.hotel.cash>6800){e=applyDistrictUpdate(e,s=>manageLodging(s,'hotel',{type:'floor'}),INITIAL_STATE);if(e.district.businesses.hotel.lodging!.openFloors>1)milestones.upperFloor=week;}
   e=startEmpireWeek(e);let ticks=0;
   while(e.district.week===week&&ticks<900){
    if(ticks%2===0)e=updateRestaurant(e,'diner',ownerHelp);
    if(ticks%26===0)e=updateRestaurant(e,'diner',orderOpeningStock);
    e=advanceEmpire(e,.5,advanceGame);ticks++;
   }
   assert.ok(ticks<900,'Week must close');assert.ok(!e.testingUnlocked,'No testing grant in Career');
   const balance=consolidatedBalance(e);assert.ok(Math.abs(balance.difference)<.1,`Week ${week}: accounts differ ${balance.difference}`);
   const report=e.district.closedWeek!.reports.find(v=>v.id==='diner')!;if(report.profit>0&&!milestones.profit)milestones.profit=week;
   weeks.push({week,cash:Math.round(e.restaurants.diner.money),served:e.restaurants.diner.stats.customersServed,level:e.restaurants.diner.restaurantLevel,profit:Math.round(report.profit),hotel:e.district.businesses.hotel?.cash,hotelOccupancy:e.district.businesses.hotel?.lodging?.lastReport?.occupancy,hotelNights:e.district.businesses.hotel?.lodging?.completedNights});
   e=parseEmpireSave(JSON.stringify(e))!;assert.ok(e,'Save reload must succeed');
  }
  writeFileSync('artifacts/career-playthrough.json',JSON.stringify({startingCash:1200,testingGrants:0,ownerActions:'Take and serve orders; clear tables; purchase stock; hire and expand through normal gates.',milestones,weeks},null,2));
  for(const name of ['waiter','profit','level2','secondBusiness','upperFloor'])assert.ok(milestones[name],`Career milestone not reached: ${name}; see artifacts/career-playthrough.json`);
 }finally{Math.random=originalRandom;}
});

test('24-week multi-property soak preserves nine accounts, bounded records and accounting after reload',()=>{
 const originalRandom=Math.random;Math.random=seeded(17017);
 try{
  let e=unlockTestDistrict(createEmpire(chooseRestaurantType(structuredClone(INITIAL_STATE),'diner')),INITIAL_STATE);
  e=applyDistrictUpdate(e,s=>openMallCompany(s,0,'cafe','cafe'),INITIAL_STATE);e=applyDistrictUpdate(e,s=>openMallCompany(s,1,'shop'),INITIAL_STATE);
  for(const id of Object.keys(e.restaurants))e=updateRestaurant(e,id,r=>{r=hireStaff(r,'manager');r=hireStaff(r,'cleaner');return {...r,manager:{...r.manager,budget:600,target:30,reserve:200}};});
  for(const id of ['hotel','apartments','shop','park','mall-shop-1'])for(const role of ['manager','care','service'] as const)e=applyDistrictUpdate(e,s=>hireBusinessStaff(s,id,role),INITIAL_STATE);
  for(const id of ['hotel','apartments','park'])e=applyDistrictUpdate(e,s=>hireBusinessStaff(s,id,'maintenance'),INITIAL_STATE);
  const ticks:number[]=[],weeks:any[]=[];
  for(let week=1;week<=24;week++){
   e=startEmpireWeek(e);let limit=0;
   while(e.district.week===week&&limit<500){const t=performance.now();e=advanceEmpire(e,1,advanceGame);ticks.push(performance.now()-t);limit++;}
   assert.ok(limit<500,`Week ${week} did not close`);
   for(const [id,b]of Object.entries(e.district.businesses)){assert.ok(Number.isFinite(b.cash),id);assert.ok(b.ledger.length<=60,id);for(const value of Object.values(b.inventory??b.retail?.stock??{}))assert.ok(value>=0,`${id}: negative stock`);}
   const before=consolidatedBalance(e);assert.ok(Math.abs(before.difference)<.2,`Week ${week}: unreconciled ${before.difference}`);
   const closed=structuredClone(e.district.closedWeek);e=parseEmpireSave(JSON.stringify(e))!;assert.ok(e);assert.deepEqual(e.district.closedWeek,closed);
   assert.equal(Object.keys(e.district.businesses).length,9);assert.equal(Object.keys(e.restaurants).length,4);
   weeks.push({week,cash:Math.round(before.cash),difference:before.difference,loans:Math.round(before.loansEliminated),internalRent:closed!.internalRent});
  }
  ticks.sort((a,b)=>a-b);writeFileSync('artifacts/career-soak.json',JSON.stringify({weeks:24,accounts:9,initialMode:'Sandbox',tickCount:ticks.length,p95SimulationMs:ticks[Math.floor(ticks.length*.95)],maxSimulationMs:ticks.at(-1),results:weeks},null,2));
 }finally{Math.random=originalRandom;}
});
