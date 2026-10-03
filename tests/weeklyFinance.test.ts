import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,advanceGame} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,startEmpireWeek,advanceEmpire,applyDistrictUpdate,updateRestaurant,parseEmpireSave,districtView} from '../src/empire/empire';
import {weeklyProfitLoss,openWeeklyBooks,cumulativeProfitLoss} from '../src/empire/weeklyFinance';
import {PROPERTIES,propertyById,hireBusinessStaff,lendCash,repayLoan,changeBusiness,nextDay} from '../src/prototype/expansionModel';
import {orderRetailStock,consumeRetailStock} from '../src/empire/retail';
import {manageLodging} from '../src/empire/lodging';
import {hireStaff} from '../src/gameplay';
const fresh=()=>unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);
const report=(e:ReturnType<typeof fresh>,id:string)=>weeklyProfitLoss(propertyById(id)!,e.district.businesses[id],e.district,e.restaurants[id]);
const near=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<.001,`${actual} != ${expected}`);

test('all seven properties have isolated current-week reports; test funds, loans, stock orders and upgrades are not expenses',()=>{
 let e=fresh();
 for(const p of PROPERTIES){const r=report(e,p.id);assert.equal(r.week,1);assert.equal(r.profit,0);assert.equal(r.partial,false);}
 e=applyDistrictUpdate(e,s=>lendCash(s,'diner','hotel',500),INITIAL_STATE);
 e=applyDistrictUpdate(e,s=>repayLoan(s,s.loans.at(-1)!.id,100),INITIAL_STATE);
 e=applyDistrictUpdate(e,s=>orderRetailStock(s,'shop','apples',50),INITIAL_STATE);
 e=applyDistrictUpdate(e,s=>changeBusiness(s,'park','upgrade'),INITIAL_STATE);
 e=applyDistrictUpdate(e,s=>manageLodging(s,'hotel',{type:'renovate',unit:0,roomType:'suite'}),INITIAL_STATE);
 for(const p of PROPERTIES)near(report(e,p.id).profit,0);
 e=applyDistrictUpdate(e,s=>hireBusinessStaff(s,'hotel','maintenance'),INITIAL_STATE);
 near(report(e,'hotel').hiring,120);near(report(e,'hotel').profit,-120);near(report(e,'apartments').profit,0);
 const before=e.restaurants.diner.money;e=updateRestaurant(e,'diner',r=>hireStaff(r,'waiter'));assert.ok(e.restaurants.diner.money<before);
 near(report(e,'diner').hiring,before-e.restaurants.diner.money);
 const restored=parseEmpireSave(JSON.stringify(e))!;assert.deepEqual(report(restored,'hotel'),report(e,'hotel'));
});

test('weekly retail COGS uses FIFO discounted costs and staff payroll payments are not charged twice',()=>{
 let e=fresh();e=applyDistrictUpdate(e,s=>orderRetailStock(s,'shop','apples',50),INITIAL_STATE);
 e=applyDistrictUpdate(e,s=>{const b=s.businesses.shop;return {...s,businesses:{...s.businesses,shop:{...b,cash:b.cash+150,retail:consumeRetailStock(b.retail!,'apples',30),books:{...b.books!,revenue:b.books!.revenue+150,wagesAccrued:b.books!.wagesAccrued+20}}}};},INITIAL_STATE);
 const r=report(e,'shop');near(r.revenue,150);near(r.cogs,20*1.2+10*1.08);near(r.wages,20);near(r.profit,150-34.8-20);
 e=applyDistrictUpdate(e,s=>nextDay({...s,day:3,payroll:[...s.payroll,{businessId:'shop',amount:19,week:s.week}]}),INITIAL_STATE);
 near(report(e,'shop').profit,r.profit);near(report(e,'shop').cash,r.cash-19);
});

test('weekly repairs are expenses, negative guest refunds reduce income, and dirty stock consumption is valued',()=>{
 let e=fresh();e=applyDistrictUpdate(e,s=>{const b=s.businesses.hotel;return {...s,businesses:{...s.businesses,hotel:{...b,venue:{...b.venue!,units:b.venue!.units.map((u,i)=>i?u:{...u,condition:30,rent:100,occupied:true})},lodging:{...b.lodging!,issues:[{id:500,unit:0,kind:'noise',description:'Noise',deadline:100}]}}}};},INITIAL_STATE);
 e=applyDistrictUpdate(e,s=>manageLodging(s,'hotel',{type:'repair',unit:0}),INITIAL_STATE);
 e=applyDistrictUpdate(e,s=>manageLodging(s,'hotel',{type:'issue',id:500,choice:'refund'}),INITIAL_STATE);
 const r=report(e,'hotel');near(r.revenue,-25);near(r.maintenance,15);near(r.cogs,1.2);near(r.profit,-41.2);
});

test('a complete simulated week rolls every P&L to zero, then includes planning hires in the new week',()=>{
 let e=startEmpireWeek(fresh());
 for(let n=0;n<500&&e.district.week===1;n++)e=advanceEmpire(e,1,advanceGame);
 assert.equal(e.district.week,2);
 for(const p of PROPERTIES){const r=report(e,p.id);assert.equal(r.week,2);assert.equal(r.partial,false);near(r.revenue,0);near(r.expenses,0);near(r.profit,0);}
 e=applyDistrictUpdate(e,s=>hireBusinessStaff(s,'park','care'),INITIAL_STATE);
 near(report(e,'park').hiring,120);
 e=startEmpireWeek(e);near(report(e,'park').hiring,120);
 assert.deepEqual(parseEmpireSave(JSON.stringify(e))!.district.businesses.park.weeklyBooks,e.district.businesses.park.weeklyBooks);
});

test('closing P&L saves the same detailed accounting figures and stays frozen during the next week and after reload',()=>{
 let e=fresh();
 e=applyDistrictUpdate(e,s=>({...s,businesses:{...s.businesses,diner:{...s.businesses.diner,tenure:'leased'},hotel:{...s.businesses.hotel,tenure:'leased'}}}),INITIAL_STATE);
 e=applyDistrictUpdate(e,s=>hireBusinessStaff(s,'hotel','maintenance'),INITIAL_STATE);
 e=applyDistrictUpdate(e,s=>orderRetailStock(s,'shop','apples',50),INITIAL_STATE);
 e=startEmpireWeek(e);
 for(let n=0;n<500&&e.district.week===1;n++)e=advanceEmpire(e,1,advanceGame);
 assert.equal(e.district.week,2);assert.equal(e.district.closedWeek!.week,1);
 const saved=structuredClone(e.district.closedWeek!);assert.equal(saved.reports.length,7);
 for(const p of PROPERTIES){
  const r=saved.reports.find(r=>r.id===p.id)!,totals=cumulativeProfitLoss(p,e.district.businesses[p.id],e.district,e.restaurants[p.id]);
  for(const key of Object.keys(totals) as (keyof typeof totals)[])near(r[key],totals[key]);
  near(r.expenses,r.cogs+r.wages+r.hiring+r.maintenance+r.fees+r.spoilage+r.rent);near(r.profit,r.revenue-r.expenses);
  assert.equal(r.week,1);assert.equal(r.day,7);near(r.cash,e.district.businesses[p.id].cash);
  near(e.district.report.find(item=>item.id===p.id)!.profit,r.profit);near(report(e,p.id).profit,0);
 }
 near(saved.reports.find(r=>r.id==='hotel')!.hiring,120);
 near(saved.reports.find(r=>r.id==='hotel')!.rent,propertyById('hotel')!.rent);
 near(saved.reports.find(r=>r.id==='diner')!.rent,propertyById('diner')!.rent);
 e=applyDistrictUpdate(e,s=>lendCash(s,'diner','hotel',500),INITIAL_STATE);
 e=applyDistrictUpdate(e,s=>hireBusinessStaff(s,'hotel','care'),INITIAL_STATE);
 e=startEmpireWeek(e);for(let n=0;n<30;n++)e=advanceEmpire(e,1,advanceGame);
 assert.equal(e.district.report.length,0);assert.deepEqual(e.district.closedWeek,saved);
 const restored=parseEmpireSave(JSON.stringify(e))!;assert.deepEqual(restored.district.closedWeek,saved);assert.notEqual(report(restored,'hotel').cash,saved.reports.find(r=>r.id==='hotel')!.cash);
 for(let n=0;n<500&&e.district.week===2;n++)e=advanceEmpire(e,1,advanceGame);
 assert.equal(e.district.closedWeek!.week,2);near(e.district.closedWeek!.reports.find(r=>r.id==='hotel')!.hiring,120);
});

test('apartment rent collected at week opening is included; prior-week totals never bleed into the new report',()=>{
 let e=fresh();const s=e.district,b=s.businesses.apartments;
 const old={...b,books:{...b.books!,revenue:1000,wagesAccrued:100},venue:{...b.venue!,units:b.venue!.units.map((u,i)=>i?u:{...u,occupied:true,rent:240,rentWeek:1,checkoutAt:1000}),week:{...b.venue!.week,revenue:1000,wages:100}}};
 e={...e,restaurants:Object.fromEntries(Object.entries(e.restaurants).map(([id,r])=>[id,{...r,week:2}])),district:{...s,week:2,businesses:{...s.businesses,apartments:old}}};
 e={...e,district:districtView(e)};near(report(e,'apartments').revenue,0);
 e=startEmpireWeek(e);near(report(e,'apartments').revenue,240);near(report(e,'apartments').wages,0);
});

test('old saves preserve known weekly sales and wages, mark unavailable costs, and gain a full baseline next week',()=>{
 let e=startEmpireWeek(fresh());for(let n=0;n<20;n++)e=advanceEmpire(e,1,advanceGame);
 const raw=structuredClone(e);raw.district.week=4;
 for(const [id,b] of Object.entries(raw.district.businesses)){delete b.weeklyBooks;if(raw.restaurants[id])raw.restaurants[id].week=4;}
 const loaded=parseEmpireSave(JSON.stringify(raw))!;
 for(const p of PROPERTIES){const r=report(loaded,p.id);assert.equal(r.partial,true);near(r.revenue,loaded.restaurants[p.id]?.weekStats.revenue??loaded.district.businesses[p.id].venue!.week.revenue);}
 const hotel=loaded.district.businesses.hotel,totals=cumulativeProfitLoss(propertyById('hotel')!,hotel,loaded.district);
 const next=openWeeklyBooks(propertyById('hotel')!,hotel,{...loaded.district,week:5});assert.equal(next.weeklyBooks!.partial,false);assert.deepEqual(next.weeklyBooks!.opening,totals);
 assert.deepEqual(parseEmpireSave(JSON.stringify(loaded))!.district.businesses.hotel.weeklyBooks,hotel.weeklyBooks);
});
