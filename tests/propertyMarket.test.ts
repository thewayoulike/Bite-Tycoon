import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,advanceGame} from '../src/hooks/useGameLoop';
import {createEmpire,createFastTrackEmpire,applyDistrictUpdate,advanceEmpire,startEmpireWeek,districtView,parseEmpireSave,updateRestaurant,businessFinance} from '../src/empire/empire';
import {acquire,createBusiness,payWeeklyLease,retryLease,propertyById} from '../src/prototype/expansionModel';
import {acquisitionQuote,leaseReserve,totalRentLiability,propertyLevel} from '../src/empire/propertyMarket';
import {upgradeRestaurant} from '../src/restaurantProgression';
import {manageLodging} from '../src/empire/lodging';
import {inventoryValue,venueFinancials} from '../src/empire/venueFinance';
import {weeklyProfitLoss} from '../src/empire/weeklyFinance';
import {paymentCalendar} from '../src/career/calendar';
import {openMallCompany} from '../src/career/mallCompanies';
import {consolidatedBalance} from '../src/career/consolidation';
import {RESTAURANT_TYPES} from '../src/data/restaurantCatalogs';
const fresh=()=>createFastTrackEmpire(structuredClone(INITIAL_STATE));
const open=(e:ReturnType<typeof fresh>,id:string,tenure:'owned'|'leased'='owned',type?:any)=>applyDistrictUpdate(e,s=>acquire(s,id,tenure,Object.keys(s.businesses)[0],type),INITIAL_STATE);
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.02,`${a} != ${b}`);

test('new career has $250,000 and no free restaurant; build packages leave a 34–36% buffer',()=>{
 const e=fresh();assert.equal(e.district.market!.ownerCash,250000);assert.equal(Object.keys(e.restaurants).length,0);assert.equal(Object.keys(e.district.businesses).length,0);
 assert.equal(startEmpireWeek(e),e);assert.equal(advanceEmpire(e,200,advanceGame),e);
 for(const [id,balance] of [['built-commercial-restaurant',90000],['built-commercial-shop',85000]] as const){
  const x=open(fresh(),id,'owned',id.endsWith('restaurant')?'italian':undefined),b=x.district.businesses[id];assert.equal(b.cash,balance);assert.equal(x.district.market!.ownerCash,0);assert.equal(x.district.market!.parcels.commercial,id);assert.equal(x.district.loans.length,0);assert.equal(x.activeRestaurantId,id);
  if(b.retail){assert.equal(b.retail.store!.level,1);assert.ok(inventoryValue(propertyById(id)!,b)>0);assert.ok(b.retail.shelves.every(k=>b.retail!.stock[k]>0));}
  else{const r=x.restaurants[id];assert.equal(r.restaurantLevel,1);assert.ok(r.tables.length>=2);assert.ok(r.staff.waiters>0&&r.staff.chefs>0);for(const recipe of r.recipes.filter(v=>r.activeMenu.includes(v.id)))for(const ingredient of Object.keys(recipe.ingredients))assert.ok(r.inventory[ingredient]>0);}
  assert.deepEqual(parseEmpireSave(JSON.stringify(x)),x);
  const duplicate=open(x,id,'owned','italian');assert.equal(duplicate.district.businesses[id].cash,b.cash);
  const other=open(x,id.endsWith('shop')?'built-commercial-restaurant':'built-commercial-shop','owned',id.endsWith('shop')?'diner':undefined);assert.equal(Object.keys(other.district.businesses).length,1);
 }
});

test('restaurant themes are mandatory and every theme receives its own ready opening menu',()=>{
 assert.equal(Object.keys(open(fresh(),'diner','leased').district.businesses).length,0);
 for(const t of RESTAURANT_TYPES){const e=open(fresh(),'diner','leased',t.id),r=e.restaurants.diner;assert.equal(r.restaurantType,t.id);assert.equal(r.money,232000);assert.ok(r.activeMenu.length>0);assert.equal(businessFinance(e,'diner').initialContribution,250000);near(weeklyProfitLoss(propertyById('diner')!,e.district.businesses.diner,e.district,r).revenue,0);}
});

test('player levels follow paid service upgrades, with purchase gates and independent opening levels',()=>{
 let e=open(fresh(),'diner','leased','diner');
 assert.equal(propertyLevel('hotel'),3);assert.equal(propertyLevel('apartments'),4);assert.equal(propertyLevel('plaza'),5);
 assert.equal(open(e,'hotel').district.businesses.hotel,undefined);
 e=updateRestaurant(e,'diner',r=>({...r,stats:{...r.stats,customersServed:180},performance:{bestServiceRate:85,profitableStreak:2,lastWeek:1}}));
 assert.equal(districtView(e).market!.level,1,'served guests alone do not buy the upgrade');
 e=updateRestaurant(e,'diner',upgradeRestaurant);assert.equal(districtView(e).market!.level,2);
 e=updateRestaurant(e,'diner',upgradeRestaurant);assert.equal(districtView(e).market!.level,3);
 e=open(e,'hotel');assert.ok(e.district.businesses.hotel);assert.equal(e.district.businesses.hotel.lodging!.openFloors,1);assert.equal(e.district.businesses.hotel.venue!.units.length,4);assert.equal(e.district.loans[0].purpose,'property');assert.equal(e.district.businesses.hotel.cash,12000);
 assert.equal(open(e,'apartments').district.businesses.apartments,undefined);
});

test('hotel and apartment construction includes only G and Floor 1; later floors need milestones AND money',()=>{
 for(const [kind,level,count,cost] of [['hotel',3,4,6000],['apartments',4,3,4800]] as const){
  let e=fresh();e.district.market!.level=level;e=open(e,'built-large-'+kind);const id='built-large-'+kind;let b=e.district.businesses[id];assert.equal(b.lodging!.openFloors,1);assert.equal(b.venue!.units.length,count);assert.ok(b.venue!.units.every(u=>!u.occupied&&!u.dirty));
  let s=e.district;const blocked=manageLodging(s,id,{type:'floor'});assert.equal(blocked.businesses[id],b);
  b={...b,lodging:{...b.lodging!,completedNights:30,occupiedHomeWeeks:6,lastReport:{week:1,occupancy:60,reputation:75,served:30,lost:0,revenue:1000,averageRate:85}}};s={...s,businesses:{[id]:b}};
  const poor={...s,businesses:{[id]:{...b,cash:cost-1}}};assert.equal(manageLodging(poor,id,{type:'floor'}).businesses[id].lodging!.openFloors,1);
  const expanded=manageLodging(s,id,{type:'floor'});assert.equal(expanded.businesses[id].lodging!.openFloors,2);assert.equal(expanded.businesses[id].venue!.units.length,count*2);near(expanded.businesses[id].cash,b.cash-cost);assert.equal(manageLodging(expanded,id,{type:'floor'}).businesses[id],expanded.businesses[id]);
 }
});

test('only food and supermarkets lease; leasing and construction cannot bypass level gates',()=>{
 for(const id of ['hotel','apartments','park','built-large-hotel']){const e=fresh();e.district.market!.level=6;assert.equal(open(e,id,'leased').district.businesses[id],undefined);}
 const e=fresh();assert.equal(open(e,'built-large-hotel').district.businesses['built-large-hotel'],undefined);
 const poor=fresh();poor.district.market!.ownerCash=10;assert.equal(open(poor,'shop').district.businesses.shop,undefined);
 const started=startEmpireWeek(open(fresh(),'shop'));assert.equal(open(started,'cafe','leased','cafe').district.businesses.cafe,undefined);
});

test('a supermarket can run alone, close a week, pay next-week wages, and reload without a diner',()=>{
 let e=open(fresh(),'shop');assert.equal(e.district.businesses.shop.cash,105000);assert.equal(Object.keys(e.restaurants).length,0);
 e=startEmpireWeek(e);e=advanceEmpire(e,30,advanceGame);assert.equal(e.district.day,2);assert.ok(e.clock!.time>0);assert.ok(e.district.businesses.shop.venue!.running);
 assert.ok(parseEmpireSave(JSON.stringify(e)));
 for(let n=0;n<310&&e.district.week===1;n++)e=advanceEmpire(e,.5,advanceGame);
 assert.equal(e.district.week,2);assert.equal(e.clock!.phase,'planning');assert.equal(e.district.closedWeek!.reports.length,1);assert.ok(e.district.payroll.some(p=>p.businessId==='shop'));assert.equal(advanceEmpire(e,200,advanceGame),e);
 e=startEmpireWeek(e);for(let n=0;n<160;n++)e=advanceEmpire(e,.5,advanceGame);assert.equal(e.district.day,4);assert.ok(!e.district.payroll.some(p=>p.week===2));
 const f=venueFinancials(propertyById('shop')!,e.district.businesses.shop,e.district);near(f.assets,f.liabilities+f.equity);near(f.closingCash,e.district.businesses.shop.cash);
});

test('monthly lease accrues expense weekly, debits every four weeks, reserves rent, and retries arrears',()=>{
 const e=open(fresh(),'diner','leased','fastfood'),p=propertyById('diner')!;let b=e.district.businesses.diner;
 assert.equal(leaseReserve(p,b,e.district),720);assert.ok(paymentCalendar(e).some(v=>v.label.includes('Monthly')&&v.date.includes('Week 4')));
 const initial=b.cash;
 for(let week=1;week<=3;week++){b=payWeeklyLease(p,b,{week,day:7});assert.equal(b.cash,initial);assert.equal(totalRentLiability(b),week*180);assert.equal(payWeeklyLease(p,b,{week,day:7}),b);}
 b=payWeeklyLease(p,b,{week:4,day:7});assert.equal(b.cash,initial-720);assert.equal(totalRentLiability(b),0);assert.equal(b.leaseTerms!.nextPaymentWeek,8);
 b={...b,cash:100};for(let week=5;week<=8;week++)b=payWeeklyLease(p,b,{week,day:7});assert.equal(b.cash,0);assert.equal(b.leaseDue,620);
 b=retryLease(p,{...b,cash:700},{week:9,day:1});assert.equal(b.cash,80);assert.equal(b.leaseDue,0);assert.equal(e.district.loans.length,0);
});

test('opening purchase accounts reconcile; second property is funded by a separate repayable loan',()=>{
 let e=open(fresh(),'shop');let b=e.district.businesses.shop,p=propertyById('shop')!,f=venueFinancials(p,b,e.district);near(f.assets,250000);near(f.assets,f.liabilities+f.equity);assert.equal(f.profit,0);assert.equal(f.book.revenue,0);
 e=open(e,'cafe','leased','cafe');assert.equal(e.district.businesses.shop.cash,88000);assert.equal(e.restaurants.cafe.money,5000);assert.equal(e.district.market!.level,1);assert.equal(e.district.loans.length,1);assert.equal(e.district.loans[0].principal,17000);
 f=venueFinancials(p,e.district.businesses.shop,e.district);near(f.assets,f.liabilities+f.equity);assert.equal(f.profit,0);assert.ok(parseEmpireSave(JSON.stringify(e)));
});

test('legacy saves retain their cash and existing lease contracts; empty new careers reload',()=>{
 const old=createEmpire(structuredClone(INITIAL_STATE)),cash=old.restaurants.diner.money;
 const loaded=parseEmpireSave(JSON.stringify(old))!;assert.equal(loaded.restaurants.diner.money,cash);assert.equal(loaded.district.market,undefined);
 assert.deepEqual(parseEmpireSave(JSON.stringify(fresh()))?.district.market,fresh().district.market);
});

test('a legacy constructed mall stays usable and its shops still use it as their landlord',()=>{
 const id='built-large-plaza';let e=applyDistrictUpdate(fresh(),s=>({...s,businesses:{[id]:{...createBusiness('owned',190000),acquisition:{method:'construction',cost:60000,land:15000,capital:250000}}},market:{...s.market!,level:5,ownerCash:0,firstPropertyId:id,parcels:{large:id}}}),INITIAL_STATE);
 assert.equal(e.district.businesses[id].plaza!.openFloors,1);assert.equal(e.district.businesses[id].venue!.units.length,4);
 e=applyDistrictUpdate(e,s=>openMallCompany(s,0,'cafe','italian',id),INITIAL_STATE);
 const child=e.district.businesses[id].venue!.units[0].ownerCompany!;assert.equal(e.district.businesses[child].mallCompany!.parent,id);assert.equal(e.restaurants[child].restaurantType,'italian');assert.equal(e.district.businesses.park,undefined);
 assert.equal(propertyById(child)!.position,propertyById(id)!.position);assert.ok(parseEmpireSave(JSON.stringify(e)));near(consolidatedBalance(e).difference,0);
 const assets=e.district.businesses[id].assets!.items.filter(a=>a.kind==='property').reduce((n,a)=>n+a.cost,0);near(assets,e.district.businesses[id].books!.openingProperty-e.district.businesses[id].acquisition!.land);
});
