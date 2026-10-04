import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,advanceGame} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,startEmpireWeek,advanceEmpire,parseEmpireSave} from '../src/empire/empire';
import {initialExpansion,createBusiness,lendCash,refinanceLoan,automaticLoanPayments,payWeeklyLease,retryLease,propertyById,autoStockBusiness,nextDay} from '../src/prototype/expansionModel';
import {payDueWages} from '../src/gameplay';
import {protectedObligations} from '../src/empire/cashProtection';
import {syncAssets,depreciateAssets,accumulatedDepreciation} from '../src/empire/assets';
import {venueFinancials} from '../src/empire/venueFinance';
import {serveLodging,advanceLodging} from '../src/empire/lodgingSimulation';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.001,`${a} != ${b}`);
const fresh=()=>unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);

test('zero cash does not overdraw payroll or erase wages, and operating staff still earn wages',()=>{
 let r={...structuredClone(INITIAL_STATE),money:0,week:2,time:44,pendingPayroll:[{dueWeek:2,amount:59},{dueWeek:3,amount:35}]};
 const owed=structuredClone(r.pendingPayroll),stats=structuredClone(r.stats);
 for(const time of [44,58,72]){
  r=payDueWages({...r,time});assert.equal(r.money,0);assert.deepEqual(r.pendingPayroll,owed);assert.deepEqual(r.stats,stats);
 }
 assert.match(r.floatingEvents.at(-1)!.text,/59.00 wages still owed/);
 const active=advanceGame({...r,phase:'service',time:44},.5);
 assert.equal(active.money,0);assert.ok(active.weekStats.wages>r.weekStats.wages);assert.deepEqual(active.pendingPayroll,owed);
 const paid=payDueWages({...r,time:99,money:20});assert.equal(paid.money,0);assert.deepEqual(paid.pendingPayroll,[{dueWeek:2,amount:39},{dueWeek:3,amount:35}]);assert.deepEqual(paid.stats,stats);
 assert.match(paid.floatingEvents.at(-1)!.text,/Wages paid: \$20.00.*\$39.00 wages still owed/);
 const rounded=payDueWages({...r,time:99,money:19.999999999});assert.equal(rounded.money,0);
});

test('all non-restaurant properties keep unpaid wages when there is no cash',()=>{
 let s=fresh().district;
 const ids=['shop','hotel','apartments','park'];
 s={...s,week:2,day:4,payroll:ids.map(businessId=>({businessId,week:2,amount:80})),businesses:Object.fromEntries(Object.entries(s.businesses).map(([id,b])=>[id,{...b,cash:0}]))};
 const payroll=structuredClone(s.payroll),before=structuredClone(s.businesses);
 for(let i=0;i<2;i++){
  s=nextDay(s,false);assert.deepEqual(s.payroll,payroll);
  for(const id of ids){assert.equal(s.businesses[id].cash,0);assert.equal(s.businesses[id].books!.wagesPaid,before[id].books!.wagesPaid);assert.equal(s.businesses[id].books!.wagesAccrued,before[id].books!.wagesAccrued);}
 }
});
test('loan terms amortize exactly, refinancing keeps balances and preserves other schedules',()=>{
 for(const term of [10,20,40] as const){
  let s:ReturnType<typeof initialExpansion>={...initialExpansion(10000),week:1,businesses:{diner:createBusiness('owned',10000),hotel:createBusiness('owned',10000)}};
  s=lendCash(s,'diner','hotel',1000.01,term,'property');const loan=s.loans[0];near(loan.repayment!.weeklyAmount,Math.ceil(1000.01/term*100)/100);
  for(let week=2;week<=term+1;week++)s=automaticLoanPayments({...s,week,day:4});near(s.loans[0].outstanding,0);near(s.businesses.diner.cash,10000);
 }
 let s=fresh().district;s=lendCash(s,'diner','hotel',1000,20);s=lendCash(s,'diner','hotel',500,40,'property');
 const before=structuredClone(s);s=refinanceLoan(s,s.loans[0].id,40);assert.deepEqual(s.businesses,before.businesses);assert.deepEqual(s.loans[1],before.loans[1]);assert.equal(s.loans.length,2);assert.equal(s.loans[0].repayment!.weeklyAmount,25);
 const e=fresh();e.district=s;assert.deepEqual(parseEmpireSave(JSON.stringify(e))!.district.loans,s.loans);
});
test('rent shortfall becomes a liability, retries once per day, and never creates a loan',()=>{
 const e=fresh(),p=propertyById('hotel')!,s=e.district;
 const b={...s.businesses.hotel,tenure:'leased' as const,cash:100};const paid=payWeeklyLease(p,b,s);
 assert.equal(paid.cash,0);assert.equal(paid.leaseDue,290);assert.equal(paid.books!.rent,390);assert.equal(paid.books!.rentPaid,100);
 assert.equal(payWeeklyLease(p,paid,s),paid);
 const funded={...paid,cash:300};assert.equal(retryLease(p,funded,{week:1,day:7}),funded);
 const retry=retryLease(p,funded,{week:2,day:1});assert.equal(retry.leaseDue,0);assert.equal(retry.cash,10);assert.equal(retry.books!.rent,390);assert.equal(retry.books!.rentPaid,390);
 assert.equal(s.loans.length,0);
});
test('manager protects next wages, rent, instalments and tenant deposits plus buffer',()=>{
 let s=fresh().district;s=lendCash(s,'diner','hotel',1000,20);
 let b={...s.businesses.hotel,cash:1000,tenure:'leased' as const,tenantDeposits:100,manager:{enabled:true,budget:1000,spent:0,reserve:150},inventory:Object.fromEntries(Object.keys(s.businesses.hotel.inventory!).map(id=>[id,0]))};
 s={...s,businesses:{...s.businesses,hotel:b},payroll:[{businessId:'hotel',week:2,amount:310}]};
 const protectedCash=protectedObligations(propertyById('hotel')!,b,s);assert.equal(protectedCash.total,850);
 assert.equal(autoStockBusiness(s,'hotel').businesses.hotel.cash,s.businesses.hotel.cash);assert.equal(autoStockBusiness(s,'hotel').businesses.hotel.stockroom!.orders.length,0);b={...b,cash:1050};s={...s,businesses:{...s.businesses,hotel:b}};
 const purchased=autoStockBusiness(s,'hotel');assert.ok(purchased.businesses.hotel.cash>=1000-.00001);
});
test('depreciation is forward-only, capped at cost, and affects profit without spending cash',()=>{
 let b=syncAssets(createBusiness('owned',1000),9,5200,1040);assert.equal(accumulatedDepreciation(b),0);
 b=depreciateAssets(b,9);assert.equal(accumulatedDepreciation(b),20);assert.equal(b.cash,1000);assert.equal(depreciateAssets(b,9),b);
 const existing=b;b=syncAssets(b,10,5200,2080);assert.equal(accumulatedDepreciation(b),20);assert.equal(b.assets!.items.length,3);assert.equal(existing.assets!.items.length,2);
 b=depreciateAssets(b,1000);assert.equal(accumulatedDepreciation(b),7280);assert.equal(b.cash,1000);
});
test('hotel advance receipts become income over the stay and remain balanced across reloads',()=>{
 const e=startEmpireWeek(fresh()),s=e.district,p=propertyById('hotel')!;let b=s.businesses.hotel;
 b={...b,venue:{...b.venue!,clock:90,arrivalTimer:999,visitors:[{id:999,seed:1,state:'waiting',patience:100,remaining:0,unit:null,agreedRate:100}],serviceTimer:0},lodging:{...b.lodging!,shifts:{service:'morning',care:'morning',maintenance:'morning'}}};
 const cash=b.cash,revenue=b.books!.revenue;b=serveLodging(p,b,1,4,999);near(b.cash,cash+100);near(b.books!.revenue,revenue);near(b.deferredIncome!,100);
 let f=venueFinancials(p,b,{...s,businesses:{...s.businesses,hotel:b}});near(f.assets,f.liabilities+f.equity);near(f.closingCash,b.cash);
 const booking=b.lodging!.bookings.find(v=>v.id===b.venue!.units[0].bookingId)!;const duration=booking.departure!-booking.checkedInAt!;
 b=advanceLodging(p,b,duration/2,1,4,0);near(b.cash,cash+100);near(b.deferredIncome!,50);near(b.books!.revenue,revenue+50);
 const loaded=parseEmpireSave(JSON.stringify({...e,district:{...s,businesses:{...s.businesses,hotel:b}}}))!;near(loaded.district.businesses.hotel.deferredIncome!,50);
 b=advanceLodging(p,loaded.district.businesses.hotel,duration/2+.01,1,5,0);near(b.deferredIncome!,0);near(b.books!.revenue,revenue+100);
 f=venueFinancials(p,b,s);near(f.assets,f.liabilities+f.equity);near(f.closingCash,b.cash);
});
test('new apartment leases receive a refundable deposit as a liability, returned on departure',()=>{
 const e=startEmpireWeek(fresh()),s=e.district,p=propertyById('apartments')!;let b=s.businesses.apartments;
 b={...b,venue:{...b.venue!,clock:90,arrivalTimer:999,visitors:[{id:999,seed:1,state:'waiting',patience:100,remaining:0,unit:null,agreedRate:200}]}};
 const cash=b.cash;b=serveLodging(p,b,1,4,999);near(b.cash,cash+400);near(b.tenantDeposits!,200);near(b.books!.revenue,200);
 let f=venueFinancials(p,b,s);near(f.assets,f.liabilities+f.equity);near(f.closingCash,b.cash);
 b={...b,venue:{...b.venue!,units:b.venue!.units.map((u,i)=>i?u:{...u,checkoutAt:91})}};
 b=advanceLodging(p,b,1.01,1,4,0);near(b.tenantDeposits!,0);near(b.cash,cash+200);near(b.books!.revenue,200);
 f=venueFinancials(p,b,s);near(f.assets,f.liabilities+f.equity);near(f.closingCash,b.cash);
});
test('full multi-property weeks keep books and cash balanced with depreciation and deferred income',()=>{
 let e=startEmpireWeek(fresh());
 for(let n=0;n<500&&e.district.week===1;n++)e=advanceEmpire(e,1,advanceGame);
 assert.equal(e.district.week,2);
 for(const id of ['hotel','apartments','shop','park']){const b=e.district.businesses[id],f=venueFinancials(propertyById(id)!,b,e.district);near(f.assets,f.liabilities+f.equity);near(f.closingCash,b.cash);assert.ok(f.depreciation>0);}
 const restored=parseEmpireSave(JSON.stringify(e))!;assert.deepEqual(restored.district.closedWeek,e.district.closedWeek);assert.deepEqual(restored.district.businesses.hotel.assets,e.district.businesses.hotel.assets);
});

test('wage shortfalls carry forward, protect deposits, and retry without duplicating expenses',()=>{
 let r={...structuredClone(INITIAL_STATE),money:20,week:2,time:44,pendingPayroll:[{dueWeek:2,amount:59}]};
 const originalStats=structuredClone(r.stats);
 r=payDueWages(r);near(r.money,0);near(r.pendingPayroll[0].amount,39);assert.deepEqual(r.stats,originalStats);
 r={...r,money:100};assert.equal(payDueWages(r),r);
 r=payDueWages({...r,time:58});near(r.money,61);assert.equal(r.pendingPayroll.length,0);
 let s=fresh().district;
 s={...s,week:2,day:1,payroll:[{businessId:'apartments',week:1,amount:80},{businessId:'apartments',week:2,amount:30}],businesses:{...s.businesses,apartments:{...s.businesses.apartments,cash:120,tenantDeposits:100}}};
 s=nextDay(s,false);near(s.businesses.apartments.cash,100);assert.deepEqual(s.payroll.map(p=>[p.week,p.amount]).sort(),[[1,60],[2,30]]);
 const protection=protectedObligations(propertyById('apartments')!,s.businesses.apartments,s);near(protection.wageArrears!,60);
 s={...s,businesses:{...s.businesses,apartments:{...s.businesses.apartments,cash:200}}};
 s=nextDay(s,false);near(s.businesses.apartments.cash,140);assert.deepEqual(s.payroll,[{businessId:'apartments',week:2,amount:30}]);
 s=nextDay(s,false);near(s.businesses.apartments.cash,110);assert.equal(s.payroll.length,0);
 const mall=fresh().district;assert.ok(protectedObligations(propertyById('park')!,mall.businesses.park,mall).upkeep!>0);
});
