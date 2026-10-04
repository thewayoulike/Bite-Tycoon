import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,advanceGame,type GameState} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,applyDistrictUpdate,updateRestaurant,startEmpireWeek,advanceEmpire,parseEmpireSave,districtView} from '../src/empire/empire';
import {chooseRestaurantType} from '../src/restaurantTypes';
import {propertyById,hireBusinessStaff} from '../src/prototype/expansionModel';
import {ensureCrew,editCrew,advanceCrew,crewPower} from '../src/career/crew';
import {changeSettings,simulationRate} from '../src/career/settings';
import {paymentCalendar} from '../src/career/calendar';
import {buildStockroom,manageCrew} from '../src/career/manage';
import {storageCellAllowed,storagePlan,expandedStorage,expandStorage} from '../src/career/storage';
import {ingredientDefinition,orderRestaurantStock} from '../src/inventory/restaurantStockroom';
import {restaurantDepth,saveMenuSchedule,scheduledMenu,importResearchDish,acceptCatering,cateringOffers,serveCatering,advanceRestaurantDepth,buildTerrace} from '../src/career/restaurant';
import {schedulePromotion,advanceRetailEvents,promotionDiscount} from '../src/career/retailEvents';
import {prepareHouseholds,householdPayment,advanceServices,serviceDepth,acceptConference} from '../src/career/services';
import {openMallCompany,settleInternalRent,advanceTenantTrade,closeTenantTurnover} from '../src/career/mallCompanies';
import {consolidatedBalance} from '../src/career/consolidation';
import {venueFinancials} from '../src/empire/venueFinance';
import {collectApartmentRent} from '../src/empire/apartments';
import {createLodgingLayout,lodgingWalkingPath,clearWalkingSegment} from '../src/empire/lodgingLayout';
import {amenityDestination} from '../src/career/amenityRoutes';
import {mallAccrueRent,retryMallCollections} from '../src/empire/mallDepth';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.01,`${a} != ${b}`);
const fresh=()=>createEmpire(chooseRestaurantType(structuredClone(INITIAL_STATE),'diner'));
const full=()=>unlockTestDistrict(fresh(),INITIAL_STATE);

test('individual staff training, shifts, pay and breaks persist and change actual availability',()=>{
 let e=full();const before=e.restaurants.diner.money;
 e=manageCrew(e,'diner',{type:'train',id:'chef-0'});near(e.restaurants.diner.money,before-100);
 const repeat=manageCrew(e,'diner',{type:'train',id:'chef-0'});near(repeat.restaurants.diner.money,e.restaurants.diner.money);
 let crew=advanceCrew(e.restaurants.diner.crew!,30,10,{});assert.equal(crew[0].skill,2);near(crewPower(crew,'chef',10,0),1.1);
 crew=editCrew(crew,100,{type:'shift',id:'chef-0',shift:'night'}).crew;assert.equal(crewPower(crew,'chef',10,0),0);assert.ok(crewPower(crew,'chef',23,0)>0);
 e=manageCrew(e,'diner',{type:'raise',id:'chef-0'});assert.equal(e.restaurants.diner.crew![0].pay,40);
 assert.equal(parseEmpireSave(JSON.stringify(e))!.restaurants.diner.crew![0].training,30);
});
test('training leaves salary unchanged; a raise only adds future earned wages, not speed or an immediate debit',()=>{
 let e=full(),r=e.restaurants.diner;
 const crew=ensureCrew(propertyById('diner')!,e.district.businesses.diner,r),chef=crew.find(c=>c.id==='chef-0')!;
 const trained=advanceCrew(editCrew(crew,100,{type:'train',id:chef.id}).crew,30,10,{});
 assert.equal(trained.find(c=>c.id===chef.id)!.pay,chef.pay);
 assert.ok(crewPower(trained,'chef',10,0)>crewPower(crew,'chef',10,0));
 const cash=r.money;e=manageCrew(e,'diner',{type:'raise',id:chef.id});assert.equal(e.restaurants.diner.money,cash);
 const raised=e.restaurants.diner.crew!;assert.equal(crewPower(raised,'chef',10,0),crewPower(crew,'chef',10,0));
 const base=advanceGame({...r,phase:'service',time:0,crew},1),higher=advanceGame({...r,phase:'service',time:0,crew:raised},1);
 near(higher.weekStats.wages-base.weekStats.wages,5/180);
});
test('longer weeks scale the entire simulation together and cannot change midway',()=>{
 const fast=startEmpireWeek(fresh()),slow=startEmpireWeek(changeSettings(fresh(),{weekMinutes:14}));
 assert.equal(simulationRate(slow),3/14);assert.equal(changeSettings(slow,{weekMinutes:3}),slow);
 const a=advanceEmpire(fast,1,advanceGame),b=advanceEmpire(slow,14/3,advanceGame);
 near(a.restaurants.diner.time,b.restaurants.diner.time);near(a.restaurants.diner.weekStats.wages,b.restaurants.diner.weekStats.wages);
 assert.equal(changeSettings(slow,{mode:'sandbox'}).settings!.mode,'career');
});
test('buildable stockrooms protect aisles, cannot buy overlapping racks, expand capacity and retain routes after expansion',()=>{
 let e=full(),r=e.restaurants.diner;const before=r.money;
 assert.equal(buildStockroom(e,'diner',{kind:'cold',x:1,z:1}),e);
 e=buildStockroom(e,'diner',{kind:'cold',x:0,z:0});r=e.restaurants.diner;near(r.money,before-400);
 assert.equal(buildStockroom(e,'diner',{kind:'cold',x:0,z:0}),e);
 assert.equal(expandedStorage(ingredientDefinition('milk'),r.stockroom).capacity,160);
 e=buildStockroom(e,'diner',{expand:true});e=buildStockroom(e,'diner',{expand:true});
 assert.equal(storagePlan(e.restaurants.diner.stockroom).size,10);
 for(const rack of storagePlan(e.restaurants.diner.stockroom).racks)assert.ok(storageCellAllowed(10,rack.x,rack.z));
 const current=e.restaurants.diner.stockroom!;assert.equal(expandStorage(current,1e6).room,current);
});
test('seasonal and meal schedules use only active dishes, and imported dishes count as research recipes',()=>{
 let r:GameState={...fresh().restaurants.diner,restaurantLevel:3};const ids=r.activeMenu;
 r=saveMenuSchedule(r,1,'all',[ids[0]],'spring');assert.deepEqual(scheduledMenu(r),[ids[0]]);
 assert.deepEqual(scheduledMenu({...r,week:5}),ids);
 assert.deepEqual(scheduledMenu({...r,activeMenu:ids.slice(1)}),[]);
 const before=r.money;r=importResearchDish(r,'japanese','cuisine_japanese_26');assert.ok(r.recipes.some(v=>v.id==='custom_guest_cuisine_japanese_26'));assert.ok(r.money<before);
 assert.equal(importResearchDish(r,'japanese','cuisine_japanese_26'),r);
});
test('catering consumes chef time and stock, captures the agreed fee and cannot charge twice',()=>{
 let r:GameState={...full().restaurants.diner,restaurantLevel:4};const offer=cateringOffers(r)[0];r=acceptCatering(r,offer.id);
 const recipe=r.recipes.find(v=>v.id===offer.recipeId)!;
 for(const [id,qty]of Object.entries(recipe.ingredients))r=orderRestaurantStock(r,id,qty*offer.qty,'emergency');
 r={...r,phase:'service',time:15,crew:ensureCrew(propertyById('diner')!,full().district.businesses.diner,r),orders:[]};
 const cash=r.money;r=serveCatering(r,offer.id);assert.equal(restaurantDepth(r).catering[0].status,'preparing');near(r.money,cash);
 r=advanceRestaurantDepth(r,60);assert.equal(restaurantDepth(r).catering[0].status,'completed');near(r.money,cash+offer.price);
 assert.equal(serveCatering(r,offer.id),r);
});
test('terrace is an asset bought once, with a level gate and recurring upkeep',()=>{
 let r=full().restaurants.diner;assert.equal(!!buildTerrace({...r,restaurantLevel:4}).advanced?.terrace,false);
 r=buildTerrace({...r,restaurantLevel:5});assert.equal(r.advanced!.terrace,true);assert.equal(buildTerrace(r),r);
 const cost=r.money;const active=advanceRestaurantDepth({...r,phase:'service'},18);near(active.money,cost-1.5);near(active.stats.maintenanceCosts!,1.5);
});
test('promotions activate only after paying advertising and preserve other products',()=>{
 let b=full().district.businesses.shop;const id=b.retail!.shelves[0],cash=b.cash;
 b=schedulePromotion(b,1,2,id,10,25);assert.equal(promotionDiscount(b,id),0);
 const unfunded=advanceRetailEvents({...b,cash:0},1,2);assert.equal(promotionDiscount(unfunded,id),0);
 b=advanceRetailEvents(b,1,2);near(b.cash,cash-25);near(promotionDiscount(b,id),.1);assert.equal(promotionDiscount(b,'missing'),0);
 near(advanceRetailEvents(b,1,2).cash,b.cash);assert.equal(promotionDiscount(advanceRetailEvents(b,1,3),id),0);
});
test('household income, rent and shortages use a real household wallet without consuming deposits',()=>{
 const p=propertyById('apartments')!;let b=full().district.businesses.apartments;
 b={...b,tenantDeposits:180,lodging:{...b.lodging!,bookings:[{id:90,name:'Resident',type:'studio',rate:180,nights:1,arrival:0,status:'staying',kind:'booking',unit:0}]},venue:{...b.venue!,units:b.venue!.units.map((u,i)=>i?u:{...u,occupied:true,bookingId:90,rent:180,rentWeek:1})}};
 b=prepareHouseholds(b,2);b={...b,serviceDepth:{...b.serviceDepth!,households:b.serviceDepth!.households.map(h=>({...h,wallet:50}))}};
 const cash=b.cash;b=collectApartmentRent(b,2);near(b.cash,cash+50);assert.equal(b.lodging!.bookings[0].rentDue,130);assert.equal(b.tenantDeposits,180);
 const earned=b.books!.revenue;b=prepareHouseholds(b,3);assert.ok(b.serviceDepth!.households[0].wallet>180);
 const paid=householdPayment(b,90,130);assert.equal(paid.paid,130);assert.equal(paid.business.books!.revenue,earned);
});
test('every amenity has collision-safe reachable approach and queue positions',()=>{
 for(const kind of ['hotel','apartments'] as const){const facilities=kind==='hotel'?['restaurant','gym','conference','rooftop','laundry']:['resident-laundry','bikes','work-lounge','playroom','fitness','terrace','roof-garden'];
 const layout=createLodgingLayout(kind,kind==='hotel'?6:11,[],facilities);
 for(const facility of facilities)for(let place=0;place<4;place++){const goal=amenityDestination(layout,facility,place),path=lodgingWalkingPath(layout,layout.elevator,goal);assert.ok(path.length>0,`${kind}/${facility}`);for(let i=1;i<path.length;i++)assert.ok(clearWalkingSegment(layout,path[i-1],path[i]));}
 }
});
test('owner mall shops have separate playable accounts and preserve cash when paying internal rent',()=>{
 let e=full();e=applyDistrictUpdate(e,s=>openMallCompany(s,0,'cafe','japanese'),INITIAL_STATE);
 assert.ok(e.restaurants['mall-cafe-0']);assert.equal(e.restaurants['mall-cafe-0'].restaurantType,'japanese');near(e.restaurants['mall-cafe-0'].money,1500);assert.equal(e.district.loans.at(-1)!.from,'park');
 assert.equal(openMallCompany(e.district,0,'shop'),e.district);
 const sum=Object.values(e.district.businesses).reduce((n,b)=>n+b.cash,0);e=settleInternalRent(e,true);
 near(Object.values(e.district.businesses).reduce((n,b)=>n+b.cash,0),sum);assert.equal(e.restaurants['mall-cafe-0'].stats.rentCosts,260);
 assert.equal(e.district.businesses.park.internalRentIncome,260);near(consolidatedBalance(e).difference,0);
 const repeat=settleInternalRent(e,true);near(repeat.restaurants['mall-cafe-0'].stats.rentCosts!,260);
 assert.ok(parseEmpireSave(JSON.stringify(e))!.restaurants['mall-cafe-0']);
});
test('internal shop rent arrears stay payable/receivable, retry without new income and consolidate to zero',()=>{
 let e=applyDistrictUpdate(full(),s=>openMallCompany(s,0,'shop'),INITIAL_STATE);
 const b=e.district.businesses['mall-shop-0'];e.district.businesses['mall-shop-0']={...b,cash:20,books:{...b.books!,capital:b.books!.capital-1480}};
 e=settleInternalRent(e,true);near(e.district.businesses['mall-shop-0'].mallCompany!.due,190);near(consolidatedBalance(e).difference,0);
 const rental=e.district.businesses.park.books!.revenue;e.district.day=2;e.district.businesses['mall-shop-0'].cash=200;e.district.businesses['mall-shop-0'].books!.capital+=200;
 e=settleInternalRent(e);near(e.district.businesses['mall-shop-0'].mallCompany!.due,0);near(e.district.businesses.park.books!.revenue,rental);near(consolidatedBalance(e).difference,0);
});
test('tenant stock and actual transactions fund fixed and percentage rent; collections never fabricate tenant cash',()=>{
 const e=full();let b=e.district.businesses.park;
 b={...b,venue:{...b.venue!,running:true,units:b.venue!.units.map((u,i)=>i?u:{...u,occupied:true,rent:300,rentWeek:0,tenantName:'Shopkeeper'})},plaza:{...b.plaza!,depth:{...b.plaza!.depth!,tenants:{0:{health:80,term:8,turnoverPercent:10}}}}};
 b=mallAccrueRent(b,0,1,1,true);near(b.tenantTrading![0].cash,700);
 b=advanceTenantTrade(b,40,1);assert.ok(b.tenantTrading![0].transactions>0);const sales=b.tenantTrading![0].sales,cash=b.cash;
 b=closeTenantTurnover(b,1);near(b.cash,cash+sales*.1);near(closeTenantTurnover(b,1).cash,b.cash);
 b={...b,tenantTrading:{...b.tenantTrading,0:{...b.tenantTrading![0],cash:5}}};b=mallAccrueRent(b,0,2,1);near(b.plaza!.depth!.receivables.at(-1)!.amount,295);
 const after=b.cash;b=retryMallCollections(b,2,2);near(b.cash,after);assert.ok(b.plaza!.depth!.receivables.some(v=>v.amount===295));
});
test('payment calendar includes automatic obligations, internal leases and prepaid stock deliveries',()=>{
 let e=applyDistrictUpdate(full(),s=>openMallCompany(s,0,'shop'),INITIAL_STATE);e=updateRestaurant(e,'diner',r=>orderRestaurantStock(r,'milk',10));
 const rows=paymentCalendar(e);assert.ok(rows.some(r=>r.id==='mall-shop-0-internal-rent'&&r.amount===210));assert.ok(rows.some(r=>r.label.includes('Prepaid delivery')&&r.amount===0));assert.ok(rows.some(r=>r.label.includes('Loan instalment')));
});


test('conference events require staffed supplies, earn once and fail if the day is missed',()=>{
 const p=propertyById('hotel')!;let b=full().district.businesses.hotel;
 b={...b,hires:{...b.hires,concierge:1},lodging:{...b.lodging!,facilities:[...b.lodging!.facilities,'conference']}};
 b=acceptConference(b,1,'conference-1-3');
 b={...b,venue:{...b.venue!,running:true,clock:60}};const cash=b.cash;
 const noStaff={...b,hires:{...b.hires,concierge:0},crew:[]};assert.equal(advanceServices(p,noStaff,1,1,3).cash,cash);
 b={...b,crew:ensureCrew(p,b)};b=advanceServices(p,b,1,1,3);
 assert.equal(b.serviceDepth!.conferences[0].status,'completed');near(b.cash,cash+240);
 near(advanceServices(p,b,1,1,3).cash,b.cash);
 b=acceptConference(b,1,'conference-1-6');b=advanceServices(p,b,1,2,1);assert.equal(b.serviceDepth!.conferences[1].status,'missed');
});
test('amenities enforce capacity and abandon queues, rather than admitting everyone at once',()=>{
 const p=propertyById('apartments')!;let b=full().district.businesses.apartments;
 b={...b,venue:{...b.venue!,running:true,clock:60,visitors:[1,2,3].map(id=>({id,seed:id,state:'using',unit:id-1,remaining:30,patience:0}))},serviceDepth:{...serviceDepth(b),visits:[1,2,3].map(id=>({id:`q${id}`,guest:id,facility:'fitness',state:'queue',timer:0,wait:id===3?20:0}))}};
 b=advanceServices(p,b,1,1,3);assert.equal(b.serviceDepth!.visits.filter(v=>v.state==='using').length,2);assert.equal(b.serviceDepth!.missed,1);
 b=advanceServices(p,b,8,1,3);assert.equal(b.serviceDepth!.completed,2);
});
test('floor assignments exclude staff from other work areas, and an unfunded terrace closes without debt',()=>{
 const e=full(),b=e.district.businesses.hotel,p=propertyById('hotel')!;
 const crew=editCrew(ensureCrew(p,b),100,{type:'zone',id:'care-0',zone:1},5).crew;
 assert.equal(crewPower(crew,'care',10,1,2),0);assert.ok(crewPower(crew,'care',10,0,1)>0);
 let r=buildTerrace({...e.restaurants.diner,restaurantLevel:5});r={...r,money:0,phase:'service'};
 const closed=advanceRestaurantDepth(r,10);assert.equal(closed.money,0);assert.equal(closed.advanced!.terraceOperational,false);
});


test('trained cleaners complete real table jobs sooner than untrained cleaners',()=>{
 const e=full(),p=propertyById('diner')!,b=e.district.businesses.diner;
 let r:GameState={...e.restaurants.diner,phase:'service',staff:{...e.restaurants.diner.staff,cleaners:1},customers:[],orders:[]};
 r={...r,tables:r.tables.map((t,i)=>i?t:{...t,isDirty:true}),cleanerEntities:[{id:'cleaner-0',x:0,y:0,state:'cleaning',targetTableId:r.tables[0].id,actionTimer:2,stamina:100}],crew:ensureCrew(p,b,r)};
 const trained={...r,crew:r.crew!.map(c=>c.role==='cleaner'?{...c,skill:5}:c)};
 const ordinary=advanceGame(r,.5),faster=advanceGame(trained,.5);
 assert.ok(faster.cleanerEntities[0].actionTimer!<ordinary.cleanerEntities[0].actionTimer!);
});
