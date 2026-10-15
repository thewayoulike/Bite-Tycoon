import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,advanceGame,type GameState} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,startEmpireWeek,advanceEmpire,parseEmpireSave} from '../src/empire/empire';
import {chooseRestaurantType} from '../src/restaurantTypes';
import {weeklyWages} from '../src/gameplay';
import {settings,changeSettings,canChangeWeekLength,WEEK_LENGTHS} from '../src/career/settings';
import {propertyById,businessWages} from '../src/prototype/expansionModel';
import {advanceVenue,startVenueWeek} from '../src/empire/venueSimulation';
import {advanceSupermarket} from '../src/empire/supermarketSimulation';
import {venueActivityTime} from '../src/empire/simulationTime';

const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const fresh=()=>createEmpire(chooseRestaurantType(structuredClone(INITIAL_STATE),'diner'));
const full=()=>unlockTestDistrict(fresh(),INITIAL_STATE);
function kitchen():GameState {
 const r=fresh().restaurants.diner;
 return {...r,phase:'service',isRestaurantOpen:false,customers:[{id:'guest',tableId:'t1',state:'waiting_food',patience:100,maxPatience:100,actionTimer:0,currentBill:10,isVIP:false,vipBonus:0,partySize:1}],orders:[{id:'order',customerId:'guest',tableId:'t1',recipeId:r.activeMenu[0],state:'pending',progress:0,isOnFire:false,price:10}]};
}

test('3, 5 and 10 minute weeks use the same cooking and training pace, with different calendar progress',()=>{
 const base=kitchen(),reference=advanceGame(base,1,{visits:0,delivery:0});
 for(const minutes of WEEK_LENGTHS){
  const next=advanceGame(structuredClone(base),1,{visits:0,delivery:0},3/minutes);
  near(next.orders[0].progress,reference.orders[0].progress);
  near(next.customers[0].patience,reference.customers[0].patience);
  near(next.serviceClock!,1);near(next.time,reference.time*3/minutes);
  let e=changeSettings(fresh(),{weekMinutes:minutes});
  e=startEmpireWeek(e);e.restaurants.diner.isRestaurantOpen=false;
  e.restaurants.diner.crew=[{id:'chef-0',name:'Test chef',role:'chef',skill:1,basePay:35,pay:35,energy:100,shift:'all',zone:-1,station:'all',training:30,task:'Training'}];
  e=advanceEmpire(e,10,advanceGame);
  near(e.restaurants.diner.crew!.find(p=>p.id==='chef-0')!.training,20);
 }
});

test('every week duration closes at its chosen length and accrues one wage bill and one terrace upkeep',()=>{
 for(const minutes of WEEK_LENGTHS){
  let r={...fresh().restaurants.diner,phase:'service',isRestaurantOpen:false,money:10000} as GameState;
  r.advanced={schedules:[],stations:{grill:100,oven:100,cold:100,drinks:100},catering:[],terrace:true,lastDay:1,notice:''};
  const cost=r.stats.maintenanceCosts??0;
  r=advanceGame(r,minutes*60-.5,{visits:0,delivery:0},3/minutes);
  assert.equal(r.phase,'service');assert.equal(r.week,1);
  r=advanceGame(r,.5,{visits:0,delivery:0},3/minutes);
  assert.equal(r.phase,'planning');assert.equal(r.week,2);
  near(r.weekSummary!.wages,weeklyWages(r.staff));
  near((r.stats.maintenanceCosts??0)-cost,15);
 }
});

test('supermarket shopping and checkout deadlines use activity seconds in every week setting',()=>{
 const p=propertyById('shop')!,base=startVenueWeek(p,full().district.businesses.shop,1);
 base.venue!.arrivalTimer=1000;
 base.venue!.visitors=[{id:1,seed:1,state:'waiting',remaining:0,unit:null,patience:70,shoppingTime:0,productId:'apples',quantity:1,basketItems:[]}];
 const results=WEEK_LENGTHS.map(minutes=>{
  let b=structuredClone(base);
  for(let t=0;t<30;t++)b=advanceSupermarket(p,b,1,1,1,1,3/minutes);
  near(venueActivityTime(b.venue!),30);near(b.venue!.clock,30*3/minutes);
  assert.equal(b.venue!.week.served,1);assert.equal(b.venue!.week.lost,0);
  return b;
 });
 for(const b of results){near(b.venue!.week.revenue,results[0].venue!.week.revenue);assert.deepEqual(b.venue!.visitors,results[0].venue!.visitors);}
});

test('a stocked supermarket can serve more shoppers during longer weeks without multiplying weekly wages',()=>{
 const p=propertyById('shop')!,base=startVenueWeek(p,full().district.businesses.shop,1);
 for(const id of base.retail!.shelves){base.retail!.stock[id]=2000;base.retail!.batches[id]=[{qty:2000,costPerUnit:1}];}
 const outcomes=WEEK_LENGTHS.map(minutes=>{
  let b=structuredClone(base);
  for(let t=0;t<minutes*60;t++)b=advanceSupermarket(p,b,1,1,1,1,3/minutes);
  near(b.venue!.clock,180);near(b.venue!.week.wages,businessWages(p,b));
  return b.venue!.week;
 });
 for(let i=1;i<outcomes.length;i++){
  assert.ok(outcomes[i].served>outcomes[i-1].served,JSON.stringify(outcomes));
  assert.ok(outcomes[i].revenue>outcomes[i-1].revenue,JSON.stringify(outcomes));
 }
});

test('hotel, apartment and mall work timers keep their pace while calendar occupancy and wages stay proportional',()=>{
 const e=full();
 for(const id of ['hotel','apartments','park']){
  const p=propertyById(id)!,base=startVenueWeek(p,e.district.businesses[id],1);
  const short=advanceVenue(p,structuredClone(base),1,1,1,1),long=advanceVenue(p,structuredClone(base),1,1,1,1,.3);
  near(short.venue!.serviceTimer,long.venue!.serviceTimer);
  near(short.venue!.careTimer,long.venue!.careTimer);
  near(long.venue!.clock,short.venue!.clock*.3);
  near(long.venue!.week.wages,short.venue!.week.wages*.3);
  if(short.lodging)near(long.lodging!.availableSeconds,short.lodging.availableSeconds*.3);
  if(short.plaza?.depth)near(long.plaza!.depth!.availableSeconds,short.plaza.depth.availableSeconds*.3);
 }
});

test('venue-only weeks last 3, 5 or 10 minutes and cannot be changed mid-service, even when paused',()=>{
 for(const minutes of WEEK_LENGTHS){
  const source=full();
  let e=changeSettings({...source,testingUnlocked:false,restaurants:{},activeRestaurantId:'shop',district:{...source.district,businesses:{shop:source.district.businesses.shop}}},{weekMinutes:minutes});
  e=startEmpireWeek(e);
  assert.equal(canChangeWeekLength(e),false);assert.equal(changeSettings(e,{weekMinutes:5}),e);
  const paused={...e,speed:0};assert.equal(changeSettings(paused,{weekMinutes:3}),paused);
  for(let t=0;t<minutes*60-1;t++)e=advanceEmpire(e,1,advanceGame);
  assert.equal(e.district.week,1);assert.ok(e.clock!.time<100);
  e=advanceEmpire(e,1,advanceGame);
  assert.equal(e.district.week,2);assert.equal(canChangeWeekLength(e),true);
 }
});

test('old 14-minute saves migrate to 10 minutes without losing cash or calendar progress; new choices persist',()=>{
 const old=startEmpireWeek(fresh());old.restaurants.diner.time=42;
 const migrated=parseEmpireSave(JSON.stringify({...old,settings:{mode:'career',weekMinutes:14,guide:false}}))!;
 assert.equal(settings(migrated).weekMinutes,10);assert.equal(settings(migrated).guide,false);
 assert.equal(migrated.restaurants.diner.time,42);near(migrated.restaurants.diner.money,old.restaurants.diner.money);
 for(const minutes of WEEK_LENGTHS)assert.equal(settings(parseEmpireSave(JSON.stringify(changeSettings(fresh(),{weekMinutes:minutes})))!).weekMinutes,minutes);
 assert.equal(venueActivityTime({clock:42}),42,'legacy shopper deadlines retain their current clock');
});
