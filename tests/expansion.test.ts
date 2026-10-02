import test from 'node:test';
import assert from 'node:assert/strict';
import {acquire, businessWages, changeBusiness, finishWeek, hireBusinessStaff, initialExpansion, lendCash, nextDay, PROPERTIES, project, repayLoan, restockBusinessItem, setBusinessManager} from '../src/prototype/expansionModel';

const cashTotal=(state:ReturnType<typeof initialExpansion>)=>Object.values(state.businesses).reduce((sum,b)=>sum+b.cash,0);

test('expansion starts with one independently funded diner and all requested property types',()=>{
  const state=initialExpansion();
  assert.deepEqual(Object.keys(state.businesses),['diner']);
  assert.equal(state.businesses.diner.cash,8500);
  assert.equal(PROPERTIES.length,7);
  assert.deepEqual(new Set(PROPERTIES.map(p=>p.kind)),new Set(['restaurant','cafe','hotel','apartments','shop','park']));
});

test('acquisition opens an independent account with a recorded funding loan',()=>{
  const initial=initialExpansion();
  const rented=acquire(initial,'cafe','leased');
  assert.equal(rented.businesses.diner.cash,6400);
  assert.equal(rented.businesses.cafe.cash,300);
  assert.equal(rented.businesses.cafe.tenure,'leased');
  assert.equal(rented.loans[0].outstanding,2100);
  assert.equal(rented.loans[0].from,'diner');
  assert.equal(rented.loans[0].to,'cafe');
  assert.equal(acquire(rented,'cafe','owned'),rented);
  assert.equal(initial.businesses.cafe,undefined);
  assert.equal(initial.businesses.diner.cash,8500);
  assert.deepEqual(acquire(initial,'hotel','owned').businesses,initial.businesses);
  assert.deepEqual(acquire(rented,'shop','leased','cafe').businesses,rented.businesses);
  const bought=acquire(initial,'cafe','owned');
  assert.equal(bought.businesses.diner.cash,1700);
  assert.equal(bought.businesses.cafe.cash,300);
  assert.equal(bought.loans[0].outstanding,6800);
  assert.equal(project(PROPERTIES.find(p=>p.id==='cafe')!,bought.businesses.cafe).rent,0);
});

test('loans conserve cash, record debt, and reject unaffordable or invalid transfers',()=>{
  const initial=acquire(initialExpansion(),'cafe','leased');
  const funded=lendCash(initial,'diner','cafe',250);
  assert.equal(cashTotal(funded),cashTotal(initial));
  assert.equal(funded.businesses.diner.cash,6150);
  assert.equal(funded.businesses.cafe.cash,550);
  assert.equal(funded.loans[1].outstanding,250);
  assert.equal(initial.loans.length,1);
  for(const amount of [-100,0,Infinity,NaN,6401]) {
    const denied=lendCash(initial,'diner','cafe',amount);
    assert.deepEqual(denied.businesses,initial.businesses);
    assert.deepEqual(denied.loans,initial.loans);
  }
  assert.deepEqual(lendCash(initial,'diner','diner',100).businesses,initial.businesses);
  assert.deepEqual(lendCash(initial,'missing','cafe',100).businesses,initial.businesses);
  const repaid=repayLoan(funded,funded.loans[1].id,100);
  assert.equal(cashTotal(repaid),cashTotal(funded));
  assert.equal(repaid.businesses.diner.cash,6250);
  assert.equal(repaid.businesses.cafe.cash,450);
  assert.equal(repaid.loans[1].outstanding,150);
  assert.equal(repayLoan(repaid,repaid.loans[1].id,151),repaid);
  assert.equal(repayLoan(repaid,repaid.loans[0].id,500),repaid);
  assert.equal(repayLoan(repaid,repaid.loans[0].id,NaN),repaid);
  const cleared=repayLoan(repaid,repaid.loans[1].id,150);
  assert.equal(cleared.loans[1].outstanding,0);
  assert.equal(repayLoan(cleared,cleared.loans[1].id,1),cleared);
});

test('sales and rent settle separately and delayed wages debit each employer once on Day 4',()=>{
  const active=acquire(initialExpansion(),'cafe','leased');
  let next=finishWeek(active);
  assert.equal(next.week,4); assert.equal(next.day,1);
  for(const row of next.report)assert.equal(next.businesses[row.id].cash,active.businesses[row.id].cash+row.revenue-row.rent);
  assert.deepEqual(next.payroll,[{businessId:'diner',amount:59,week:4},{businessId:'cafe',amount:75,week:4}]);
  const before={diner:next.businesses.diner.cash,cafe:next.businesses.cafe.cash};
  next=nextDay(next);next=nextDay(next);
  assert.equal(next.businesses.diner.cash,before.diner);
  assert.equal(next.businesses.cafe.cash,before.cafe);
  next=nextDay(next);
  assert.equal(next.businesses.diner.cash,before.diner-59);
  assert.equal(next.businesses.cafe.cash,before.cafe-75);
  assert.equal(next.payroll.length,0);
  assert.deepEqual(nextDay(next).businesses,next.businesses);
  assert.deepEqual(next.loans,active.loans);
});

test('skipping to the next week pays overdue wages without duplication',()=>{
  const first=finishWeek(initialExpansion());
  const second=finishWeek(first);
  assert.equal(second.businesses.diner.cash,first.businesses.diner.cash-59+second.report[0].revenue);
  assert.deepEqual(second.payroll,[{businessId:'diner',amount:59,week:5}]);
});

test('park care, supplies and hands-on tasks affect only the park account',()=>{
  const opened=acquire(initialExpansion(),'park','leased');
  const helped=changeBusiness(opened,'park','help');
  const park=PROPERTIES.find(p=>p.id==='park')!;
  assert.ok(project(park,helped.businesses.park).revenue>project(park,opened.businesses.park).revenue);
  assert.equal(changeBusiness(helped,'park','help'),helped);
  const closed=finishWeek(helped),stocked=changeBusiness(closed,'park','stock');
  assert.equal(closed.businesses.park.stock,65);
  assert.equal(stocked.businesses.park.stock,100);
  assert.equal(stocked.businesses.park.cash,closed.businesses.park.cash-21);
  assert.equal(stocked.businesses.diner,closed.businesses.diner);
  const repaired=changeBusiness(stocked,'park','care');
  assert.equal(repaired.businesses.park.condition,100);
  assert.equal(repaired.businesses.park.cash,stocked.businesses.park.cash-45);
  assert.equal(repaired.businesses.diner,stocked.businesses.diner);
  assert.equal(closed.businesses.park.helped,false);
});

test('hiring and replenishment cannot spend another business cash',()=>{
  const opened=acquire(initialExpansion(),'cafe','leased');
  const hired=hireBusinessStaff(opened,'cafe','service');
  assert.equal(hired.businesses.cafe.cash,180);
  assert.equal(hired.businesses.diner,opened.businesses.diner);
  assert.equal(businessWages(PROPERTIES.find(p=>p.id==='cafe')!,hired.businesses.cafe),110);
  assert.deepEqual(hireBusinessStaff(hired,'cafe','manager').businesses,hired.businesses);
  assert.deepEqual(changeBusiness(hired,'cafe','upgrade').businesses,hired.businesses);
  const closed=finishWeek(hired),stocked=restockBusinessItem(closed,'cafe','stock-0');
  assert.equal(stocked.businesses.cafe.inventory?.['stock-0'],85);
  assert.equal(stocked.businesses.cafe.cash,closed.businesses.cafe.cash-7);
  assert.equal(stocked.businesses.diner,closed.businesses.diner);
});

test('manager follows its own budget and reserve without using lender funds',()=>{
  const opened=acquire(initialExpansion(),'cafe','leased');
  const hired=hireBusinessStaff(opened,'cafe','manager');
  const depleted={...hired,businesses:{...hired.businesses,cafe:{...hired.businesses.cafe,stock:20}}};
  const blocked=setBusinessManager(depleted,'cafe',{budget:40,reserve:150});
  assert.equal(blocked.businesses.cafe.cash,50);
  assert.equal(blocked.businesses.cafe.stock,20);
  assert.equal(blocked.businesses.cafe.manager?.spent,0);
  const funded=lendCash(blocked,'diner','cafe',200);
  const stocked=setBusinessManager(funded,'cafe',{budget:40,reserve:230});
  assert.ok(stocked.businesses.cafe.cash>=230);
  assert.ok(stocked.businesses.cafe.manager!.spent<=20);
  assert.equal(stocked.businesses.diner,funded.businesses.diner);
  const repeat=setBusinessManager(stocked,'cafe',{});
  assert.ok(repeat.businesses.cafe.manager!.spent<=40);
  assert.ok(repeat.businesses.cafe.cash>=230);
});

test('inventory order sizes respect stockroom capacity and only debit the selected property',()=>{
 const state=acquire(initialExpansion(30000),'hotel','owned');
 state.businesses.hotel.inventory={'stock-0':92.5,'stock-1':10,'stock-2':25};
 const ordered=restockBusinessItem(state,'hotel','stock-0',25);
 assert.equal(ordered.businesses.hotel.inventory?.['stock-0'],100);
 assert.equal(ordered.businesses.hotel.cash,state.businesses.hotel.cash-3);
 assert.deepEqual(ordered.businesses.diner,state.businesses.diner);
 assert.equal(ordered.businesses.hotel.inventory?.['stock-1'],10);
 for(const qty of [NaN,Infinity,0,-10])assert.equal(restockBusinessItem(state,'hotel','stock-1',qty),state);
 assert.equal(restockBusinessItem(ordered,'hotel','stock-0',50),ordered);
});
