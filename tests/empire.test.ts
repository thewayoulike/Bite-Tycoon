import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceGame,INITIAL_STATE,GameState} from '../src/hooks/useGameLoop';
import {advanceEmpire,applyDistrictUpdate,businessFinance,createEmpire,districtView,parseEmpireSave,reconcileRestaurantLedger,setEmpireSpeed,startEmpireWeek,unlockTestDistrict,updateRestaurant} from '../src/empire/empire';
import {acquire,createBusiness,lendCash,repayLoan,PROPERTIES} from '../src/prototype/expansionModel';
import {canHire,weeklyWages} from '../src/gameplay';
const fresh=(money=1200)=>createEmpire({...structuredClone(INITIAL_STATE),money});
const funded=()=>applyDistrictUpdate(fresh(8500),s=>acquire(s,'cafe','leased'),INITIAL_STATE);

test('testing unlock funds every business independently without erasing progress or loans',()=>{
  const before=funded();
  before.restaurants.diner.inventory.water=17;
  before.restaurants.diner.stats.customersServed=4;
  const unlocked=unlockTestDistrict(before,INITIAL_STATE);
  assert.equal(unlocked.testingUnlocked,true);
  assert.equal(Object.keys(unlocked.district.businesses).length,7);
  for(const p of PROPERTIES)assert.equal(districtView(unlocked).businesses[p.id].cash,25000);
  assert.deepEqual(unlocked.district.loans,before.district.loans);
  assert.equal(unlocked.district.businesses.cafe.tenure,'leased');
  assert.equal(unlocked.restaurants.diner.inventory.water,17);
  assert.equal(unlocked.restaurants.diner.stats.customersServed,4);
  assert.deepEqual(unlocked.restaurants.diner.weekStats,before.restaurants.diner.weekStats);
  assert.equal(unlocked.restaurants.diner.stats.totalEarned,0);
  assert.equal(unlocked.restaurants.bistro.staff.waiters,1);
  assert.notEqual(unlocked.restaurants.bistro.inventory,unlocked.restaurants.cafe.inventory);
  assert.ok(unlocked.restaurants.bistro.recipes.every(r=>r.unlocked));
  assert.ok(canHire(unlocked.restaurants.diner,'manager'));
  assert.equal(canHire(before.restaurants.diner,'manager'),false);
  assert.equal(businessFinance(unlocked,'cafe').initialContribution,24700);
  assert.equal(businessFinance(unlocked,'bistro').initialContribution,34800);
  assert.equal(businessFinance(unlocked,'cafe').loansPayable,2100);
  assert.deepEqual(parseEmpireSave(JSON.stringify(unlocked)),unlocked);
});

test('test funds are repeatable top-ups and never lower a successful business balance',()=>{
  const first=unlockTestDistrict(fresh(40000),INITIAL_STATE);
  assert.equal(first.restaurants.diner.money,40000);
  const repeat=unlockTestDistrict(first,INITIAL_STATE);
  assert.deepEqual(repeat.testCapital,first.testCapital);
  assert.deepEqual(repeat.district.businesses,first.district.businesses);
  const spent=updateRestaurant(first,'cafe',r=>({...r,money:r.money-500}));
  const topped=unlockTestDistrict(spent,INITIAL_STATE);
  assert.equal(topped.restaurants.cafe.money,25000);
  assert.equal(topped.testCapital!.cafe,first.testCapital!.cafe+500);
  assert.equal(topped.restaurants.diner.money,40000);
});

test('test unlock waits for a safe week boundary before adding kitchens',()=>{
  const running=startEmpireWeek(fresh());
  const denied=unlockTestDistrict(running,INITIAL_STATE);
  assert.equal(denied.testingUnlocked,undefined);
  assert.equal(Object.keys(denied.restaurants).length,1);
  assert.equal(denied.restaurants.diner,running.restaurants.diner);
});

test('live expansion uses earned diner cash and cannot acquire from prototype savings',()=>{
  const original=fresh();
  const denied=applyDistrictUpdate(original,s=>acquire(s,'cafe','leased'),INITIAL_STATE);
  assert.equal(denied.restaurants.diner.money,1200);
  assert.equal(denied.restaurants.cafe,undefined);
  assert.equal(denied.district.businesses.cafe,undefined);
  const acquired=funded();
  assert.equal(acquired.restaurants.diner.money,6400);
  assert.equal(acquired.restaurants.cafe.money,300);
  assert.equal(acquired.district.loans[0].outstanding,2100);
  assert.equal(acquired.restaurants.cafe.staff.waiters,1);
  assert.notEqual(acquired.restaurants.cafe.inventory,acquired.restaurants.diner.inventory);
  assert.notEqual(acquired.restaurants.cafe.recipes,acquired.restaurants.diner.recipes);
  assert.notEqual(acquired.restaurants.cafe.tables,acquired.restaurants.diner.tables);
});

test('live restaurant actions and business loans update only the correct accounts',()=>{
  const original=funded();
  const bought=updateRestaurant(original,'cafe',r=>({...r,money:r.money-50,inventory:{...r.inventory,water:r.inventory.water+10}}));
  assert.equal(bought.restaurants.cafe.money,250);
  assert.equal(districtView(bought).businesses.cafe.cash,250);
  assert.equal(bought.restaurants.diner,original.restaurants.diner);
  const loaned=applyDistrictUpdate(bought,s=>lendCash(s,'diner','cafe',500),INITIAL_STATE);
  assert.equal(loaned.restaurants.diner.money,5900);
  assert.equal(loaned.restaurants.cafe.money,750);
  assert.equal(loaned.restaurants.cafe.stats.totalEarned,0);
  assert.equal(loaned.restaurants.cafe.weekStats.revenue,0);
  const paid=applyDistrictUpdate(loaned,s=>repayLoan(s,s.loans[1].id,100),INITIAL_STATE);
  assert.equal(paid.restaurants.diner.money,6000);
  assert.equal(paid.restaurants.cafe.money,650);
  assert.equal(paid.district.loans[1].outstanding,400);
  const tooMuch=applyDistrictUpdate(paid,s=>lendCash(s,'cafe','diner',651),INITIAL_STATE);
  assert.equal(tooMuch.restaurants.cafe.money,650);
  assert.equal(tooMuch.district.loans.length,2);
});

test('shared calendar runs independent kitchens and blocks midweek acquisitions',()=>{
  const playing=startEmpireWeek(funded());
  assert.equal(playing.restaurants.diner.phase,'service');
  assert.equal(playing.restaurants.cafe.phase,'service');
  const ticked=advanceEmpire(playing,.1,advanceGame);
  assert.ok(ticked.restaurants.diner.time>0);
  assert.equal(ticked.restaurants.cafe.time,ticked.restaurants.diner.time);
  const denied=applyDistrictUpdate(playing,s=>acquire(s,'shop','leased'),INITIAL_STATE);
  assert.equal(denied.district.businesses.shop,undefined);
  assert.equal(denied.restaurants.diner.money,playing.restaurants.diner.money);
  const paused=setEmpireSpeed(playing,0);
  assert.equal(advanceEmpire(paused,20,advanceGame),paused);
});

test('live week settlement does not invent diner revenue or double-charge property costs',()=>{
  let empire=applyDistrictUpdate(fresh(20000),s=>acquire(s,'cafe','leased'),INITIAL_STATE);
  empire=applyDistrictUpdate(empire,s=>acquire(s,'hotel','leased'),INITIAL_STATE);
  empire=startEmpireWeek(empire);
  empire={...empire,restaurants:Object.fromEntries(Object.entries(empire.restaurants).map(([id,r])=>[id,{...r,time:99.9,isRestaurantOpen:false,weekStats:{...r.weekStats,wages:weeklyWages(r.staff)*.999}}]))};
  const hotel=empire.district.businesses.hotel;
  hotel.venue={...hotel.venue!,clock:179,arrivalTimer:999,week:{...hotel.venue!.week,wages:210*179/180}};
  hotel.books={...hotel.books!,wagesAccrued:210*179/180};
  const beforeDiner=empire.restaurants.diner.money;
  const closed=advanceEmpire(empire,1,advanceGame);
  assert.equal(closed.district.week,2);
  assert.equal(closed.restaurants.diner.money,beforeDiner,'only real restaurant sales can add cash');
  assert.equal(closed.restaurants.cafe.money,160,'lease paid once from cafe cash');
  assert.equal(closed.restaurants.cafe.weekSummary?.propertyRent,140);
  assert.equal(closed.restaurants.cafe.stats.rentCosts,140);
  assert.equal(closed.district.businesses.hotel.cash,0);
  assert.equal(closed.district.report.length,3);
  assert.equal(advanceEmpire(closed,20,advanceGame),closed);
  let next=startEmpireWeek(closed);
  next={...next,restaurants:Object.fromEntries(Object.entries(next.restaurants).map(([id,r])=>[id,{...r,time:300/7-.01,isRestaurantOpen:false}]))};
  const paid=advanceEmpire(next,.1,advanceGame);
  assert.equal(paid.restaurants.diner.money,beforeDiner-35);
  assert.equal(paid.restaurants.cafe.money,101);
  assert.equal(paid.district.businesses.hotel.cash,0);
  assert.equal(paid.district.payroll.length,1);assert.equal(paid.district.payroll[0].amount,210);
  const repeat=advanceEmpire(paid,.1,advanceGame);
  assert.equal(repeat.restaurants.cafe.money,101);
  assert.equal(repeat.district.businesses.hotel.cash,0);
});

test('financial statements track loans as liabilities and receivables, not sales',()=>{
  const opened=funded();
  const cafe=businessFinance(opened,'cafe'),diner=businessFinance(opened,'diner');
  assert.equal(cafe.openingCash,0);
  assert.equal(cafe.initialContribution,0);
  assert.equal(cafe.propertyCost,1800);
  assert.equal(cafe.loansPayable,2100);
  assert.equal(diner.loansReceivable,2100);
  assert.equal(diner.openingCash,8500);
  const repaid=applyDistrictUpdate(opened,s=>repayLoan(s,s.loans[0].id,100),INITIAL_STATE);
  assert.equal(businessFinance(repaid,'cafe').loansPayable,2000);
  assert.equal(businessFinance(repaid,'diner').loansReceivable,2000);
  assert.equal(repaid.restaurants.diner.stats.totalEarned,0);
});

test('new week waits for every kitchen to finish service',()=>{
  let empire=startEmpireWeek(funded());
  empire={...empire,restaurants:{...empire.restaurants,diner:{...empire.restaurants.diner,phase:'planning',week:2}}};
  assert.equal(startEmpireWeek(empire),empire);
});

test('saved expansion restores restaurant inventories, local balances and loan debt',()=>{
  const empire=applyDistrictUpdate(funded(),s=>lendCash(s,'diner','cafe',275),INITIAL_STATE);
  const restored=parseEmpireSave(JSON.stringify({...empire,activeRestaurantId:'cafe'}));
  assert.ok(restored);
  assert.deepEqual(restored.restaurants,empire.restaurants);
  assert.deepEqual(restored.district.loans,empire.district.loans);
  assert.equal(restored.activeRestaurantId,'cafe');
  assert.equal(parseEmpireSave('{broken'),null);
  assert.equal(parseEmpireSave(JSON.stringify({...empire,version:9})),null);
  assert.equal(parseEmpireSave(JSON.stringify({...empire,activeRestaurantId:'missing'})),null);
  assert.equal(parseEmpireSave(JSON.stringify({...empire,restaurants:{diner:{...empire.restaurants.diner,money:null}}})),null);
});

test('restaurant week ledger names sales and fees and still adds up to cash',()=>{
  const account={...createBusiness('owned',1000),ledger:[{week:1,day:1,label:'Opening cash',amount:1000}]};
  const next=reconcileRestaurantLedger({...account,cash:1045},1,{revenue:80,fees:10});
  const sum=next.ledger.reduce((n,e)=>n+e.amount,0);
  assert.ok(Math.abs(sum-next.cash)<0.001);
  assert.equal(next.ledger.find(e=>e.label==='Weekly restaurant sales')?.amount,80);
  assert.equal(next.ledger.find(e=>e.label==='Delivery commissions')?.amount,-10);
  assert.equal(next.ledger.find(e=>e.label==='Ingredient purchases and upkeep')?.amount,-25);
  const already=reconcileRestaurantLedger({...account,cash:1080,ledger:[...account.ledger,{week:1,day:4,label:'Catering paid',amount:30}]},1,{revenue:80,fees:0});
  assert.ok(Math.abs(already.ledger.reduce((n,e)=>n+e.amount,0)-already.cash)<0.001);
});
