import test from 'node:test';
import assert from 'node:assert/strict';
import {automaticLoanPayments,createBusiness,initialExpansion,lendCash,repayLoan,payWeeklyLease,propertyById} from '../src/prototype/expansionModel';
import {INITIAL_STATE,advanceGame} from '../src/hooks/useGameLoop';
import {advanceEmpire,applyDistrictUpdate,createEmpire,parseEmpireSave,startEmpireWeek,unlockTestDistrict} from '../src/empire/empire';
import {venueFinancials} from '../src/empire/venueFinance';
import {weeklyProfitLoss} from '../src/empire/weeklyFinance';
import {startVenueWeek} from '../src/empire/venueSimulation';

const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const total=(s:ReturnType<typeof initialExpansion>)=>Object.values(s.businesses).reduce((n,b)=>n+b.cash,0);
const base=()=>({...initialExpansion(10000),week:1,businesses:{diner:createBusiness('owned',10000),cafe:createBusiness('owned',1000)}});
const empire=()=>unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);

test('loans automatically repay in ten weekly instalments, conserve cash and never repeat on the same day',()=>{
 let s=lendCash(base(),'diner','cafe',1000);const cash=total(s);
 assert.equal(s.loans[0].repayment!.weeklyAmount,100);
 assert.equal(automaticLoanPayments({...s,day:7}).loans[0].outstanding,1000);
 assert.equal(automaticLoanPayments({...s,week:2,day:3}).loans[0].outstanding,1000);
 for(let week=2;week<=11;week++){
  s=automaticLoanPayments({...s,week,day:4});near(total(s),cash);near(s.loans[0].outstanding,1000-(week-1)*100);
  assert.equal(automaticLoanPayments(s),s);assert.equal(automaticLoanPayments({...s,day:5}).businesses,s.businesses);
 }
 assert.equal(automaticLoanPayments({...s,week:12,day:4}).businesses,s.businesses);
 assert.equal(s.businesses.cafe.ledger.filter(e=>e.label.startsWith('Automatic loan repayment')).length,10);
});
test('short cash makes a partial payment, protects rent and retries the balance the following game day',()=>{
 let s=lendCash(base(),'diner','cafe',500);
 s={...s,week:2,day:4,businesses:{...s.businesses,cafe:{...s.businesses.cafe,tenure:'leased',cash:160}}};
 s=automaticLoanPayments(s);assert.equal(s.businesses.cafe.cash,140);assert.equal(s.loans[0].outstanding,480);assert.equal(s.loans[0].repayment!.due,30);
 assert.equal(automaticLoanPayments(s),s);
 s={...s,day:5,businesses:{...s.businesses,cafe:{...s.businesses.cafe,cash:200}}};
 s=automaticLoanPayments(s);assert.equal(s.businesses.cafe.cash,170);assert.equal(s.loans[0].outstanding,450);assert.equal(s.loans[0].repayment!.due,0);
 const leased=payWeeklyLease(propertyById('cafe')!,s.businesses.cafe,s);assert.equal(leased.cash,30);assert.equal(payWeeklyLease(propertyById('cafe')!,leased,s),leased);
});
test('unpaid instalments accumulate once, oldest debt is paid first and early payments clear arrears',()=>{
 let s=lendCash(base(),'diner','cafe',1000);s=lendCash(s,'diner','cafe',500);
 s={...s,week:3,day:4,businesses:{...s.businesses,cafe:{...s.businesses.cafe,cash:50}}};
 s=automaticLoanPayments(s);assert.equal(s.businesses.cafe.cash,0);assert.equal(s.loans[0].repayment!.due,150);assert.equal(s.loans[1].repayment!.due,100);
 s={...s,businesses:{...s.businesses,cafe:{...s.businesses.cafe,cash:2000}}};
 s=repayLoan(s,s.loans[0].id,950);assert.equal(s.loans[0].repayment!.due,0);assert.equal(s.loans[0].outstanding,0);
 s=automaticLoanPayments({...s,day:5});assert.equal(s.loans[1].outstanding,400);assert.equal(s.loans[1].repayment!.due,0);
});
test('legacy loans gain a forward schedule without debiting cash; saved repayments do not run twice',()=>{
 let e=applyDistrictUpdate(empire(),s=>lendCash(s,'diner','hotel',1234.56),INITIAL_STATE);
 delete e.district.loans[0].repayment;e.district.week=8;e.district.day=6;
 const loaded=parseEmpireSave(JSON.stringify(e))!;
 for(const [id,b] of Object.entries(e.district.businesses)){const restored=loaded.district.businesses[id];assert.equal(restored.cash,b.cash);assert.deepEqual(restored.ledger,b.ledger);assert.deepEqual(restored.books,b.books);}
 assert.equal(loaded.district.loans[0].repayment!.startWeek,9);
 const s=automaticLoanPayments({...loaded.district,week:9,day:4});assert.equal(s.loans[0].outstanding,1111.10);near(total(s),total(loaded.district));
 e={...loaded,district:s,restaurants:Object.fromEntries(Object.entries(loaded.restaurants).map(([id,r])=>[id,{...r,money:s.businesses[id].cash}]))};
 const restored=parseEmpireSave(JSON.stringify(e))!;assert.equal(automaticLoanPayments(restored.district),restored.district);
});
test('live game pays after restaurant and venue wages, synchronizes both loan accounts and keeps repayments out of profit',()=>{
 let e=applyDistrictUpdate(empire(),s=>lendCash(s,'diner','cafe',1000),INITIAL_STATE);
 e=applyDistrictUpdate(e,s=>lendCash(s,'hotel','diner',2000),INITIAL_STATE);
 e.district.week=2;e.district.day=3;
 e.restaurants=Object.fromEntries(Object.entries(e.restaurants).map(([id,r])=>[id,{...r,week:2,pendingPayroll:[{amount:20,dueWeek:2}]}]));
 e.district.payroll=[{businessId:'hotel',amount:30,week:2}];e=startEmpireWeek(e);
 e.restaurants=Object.fromEntries(Object.entries(e.restaurants).map(([id,r])=>[id,{...r,time:300/7-.01,isRestaurantOpen:false}]));
 const before={diner:e.restaurants.diner.money,cafe:e.restaurants.cafe.money,hotel:e.district.businesses.hotel.cash};
 const paid=advanceEmpire(e,.1,advanceGame);
 near(paid.restaurants.diner.money,before.diner-20+100-200);near(paid.restaurants.cafe.money,before.cafe-20-100);near(paid.district.businesses.hotel.cash,before.hotel-30+200);
 for(const [id,r] of Object.entries(paid.restaurants))near(r.money,paid.district.businesses[id].cash);
 assert.equal(paid.district.loans[0].outstanding,900);assert.equal(paid.district.loans[1].outstanding,1800);
 const repeated=advanceEmpire(paid,.1,advanceGame);assert.deepEqual(repeated.district.loans,paid.district.loans);near(repeated.restaurants.diner.money,paid.restaurants.diner.money);
 const hotel=paid.district.businesses.hotel,f=venueFinancials(propertyById('hotel')!,hotel,paid.district);near(f.assets,f.liabilities+f.equity);near(f.closingCash,hotel.cash);
 const report=weeklyProfitLoss(propertyById('hotel')!,hotel,paid.district);near(report.revenue,0);near(report.profit,-report.wages);
});
test('weekly property leases debit once and tenant rents collect automatically without double collection',()=>{
 const e=empire();const p=propertyById('hotel')!,b={...e.district.businesses.hotel,tenure:'leased' as const};
 const paid=payWeeklyLease(p,b,e.district);near(paid.cash,b.cash-p.rent);near(paid.books!.rent,b.books!.rent+p.rent);
 assert.equal(payWeeklyLease(p,paid,e.district),paid);assert.equal(payWeeklyLease(p,{...paid,tenure:'owned'},e.district).cash,paid.cash);
 for(const id of ['apartments','park']){
  const p=propertyById(id)!,b=e.district.businesses[id];
  const occupied={...b,venue:{...b.venue!,units:b.venue!.units.map((u,i)=>i===0?{...u,occupied:true,rent:220,rentWeek:0,leaseEnd:8}:u)}};
  const collected=startVenueWeek(p,occupied,1),again=startVenueWeek(p,collected,1);
  assert.equal(collected.venue!.units[0].rentWeek,1);assert.equal(again.cash,collected.cash);
  assert.ok(collected.ledger.some(row=>row.amount===220));
 }
});
