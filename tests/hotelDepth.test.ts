import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,startEmpireWeek} from '../src/empire/empire';
import {propertyById,hireBusinessStaff,finishWeek} from '../src/prototype/expansionModel';
import {manageLodging,roomReadiness,unitReady} from '../src/empire/lodging';
import {hotelFloorChecks,closeHotelPerformance} from '../src/empire/hotelProgression';
import {prepareHotelRoom,stripHotelLinen,laundryPending} from '../src/empire/hotelLaundry';
import {advanceBusinessStockroom} from '../src/inventory/businessStockroom';
import {serveLodging,advanceLodging,lodgingBlocker} from '../src/empire/lodgingSimulation';
import {venueFinancials} from '../src/empire/venueFinance';
import {weeklyProfitLoss} from '../src/empire/weeklyFinance';
import {businessStockViews,manageBusinessStockroom} from '../src/inventory/businessStockroom';
import {startVenueWeek,advanceVenue} from '../src/empire/venueSimulation';
const fresh=()=>unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);
const p=propertyById('hotel')!;
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.001,`${a} ≠ ${b}`);
test('G has no sellable rooms; hotel opens with 101–104 and success gates cannot be paid past',()=>{
 let s=fresh().district,b=s.businesses.hotel;assert.equal(b.venue!.units.length,4);assert.equal(b.lodging!.openFloors,1);
 b={...b,lodging:{...b.lodging!,completedNights:30,lastReport:{week:1,occupancy:59,averageRate:85,reputation:75,served:30,lost:0,revenue:2550}}};s.businesses.hotel=b;
 assert.equal(manageLodging(s,'hotel',{type:'floor'}).businesses.hotel,b);
 b.lodging!.lastReport!.occupancy=60;s=manageLodging(s,'hotel',{type:'floor'});assert.equal(s.businesses.hotel.venue!.units.length,8);near(s.businesses.hotel.cash,b.cash-6000);
 const next=s.businesses.hotel;assert.ok(hotelFloorChecks(next,s).some(c=>!c.met));assert.equal(manageLodging(s,'hotel',{type:'floor'}).businesses.hotel,next);
 assert.equal(manageLodging(s,'hotel',{type:'renovate',unit:0,roomType:'suite'}).businesses.hotel,next);
 assert.equal(manageLodging(s,'hotel',{type:'renovate',unit:0,roomType:'family'}).businesses.hotel.venue!.units[0].type,'family');
});
test('profitability counts completed profitable weeks once; loss resets the streak and overdue wages block top floor',()=>{
 let s=fresh().district,b=s.businesses.hotel;const report=weeklyProfitLoss(p,b,s);b=closeHotelPerformance(b,{...report,partial:false,profit:100});assert.equal(b.lodging!.profitableWeeks,1);assert.equal(closeHotelPerformance(b,{...report,profit:100}),b);
 b=closeHotelPerformance(b,{...report,week:2,profit:100,partial:false});assert.equal(b.lodging!.profitableWeeks,2);
 b=closeHotelPerformance(b,{...report,week:3,profit:-1,partial:false});assert.equal(b.lodging!.profitableWeeks,0);
 b={...b,lodging:{...b.lodging!,openFloors:4,completedNights:400,reputation:85}};s={...s,week:4,day:4,payroll:[{businessId:'hotel',amount:20,week:4}],businesses:{...s.businesses,hotel:b}};
 assert.equal(hotelFloorChecks(b,s).at(-1)!.met,false);assert.equal(manageLodging(s,'hotel',{type:'floor'}).businesses.hotel,b);
});
test('linen moves stock → room → laundry → stock, outsourcing charges once and all accounts reconcile',()=>{
 const s=fresh().district;let b=s.businesses.hotel;b={...b,venue:{...b.venue!,units:b.venue!.units.map((u,i)=>i?u:{...u,dirty:true,linenReady:false,linen:{}})}};
 b=prepareHotelRoom(b,0)!;assert.equal(b.inventory!['stock-0'],99);assert.ok(b.venue!.units[0].linenReady);assert.equal(b.stockroom!.dirty?.['stock-0']?.length??0,0);
 b=stripHotelLinen(b,[0]);assert.equal(b.stockroom!.dirty!['stock-0'][0].condition,90);assert.equal(unitReady(b.venue!.units[0]),false);
 const before=b.cash;b=advanceBusinessStockroom(p,b,1,2);near(b.cash,before-4);assert.equal(laundryPending(b),2);assert.equal(b.inventory!['stock-0'],99);
 const view=businessStockViews(p,b,s).find(v=>v.definition.id==='stock-0')!;assert.equal(view.onOrder,1);assert.equal(view.nextDelivery,3);
 assert.equal(advanceBusinessStockroom(p,b,1,2),b);b=advanceBusinessStockroom(p,b,1,3);assert.equal(laundryPending(b),0);assert.equal(b.inventory!['stock-0'],100);
 const f=venueFinancials(p,b,s);near(f.assets,f.liabilities+f.equity);near(f.closingCash,b.cash);
});
test('group check-in requires both rooms and supplies, takes agreed prices together and cancel releases the group',()=>{
 let s=startEmpireWeek(fresh()).district,b=s.businesses.hotel;
 b={...b,lodging:{...b.lodging!,bookings:[0,1].map(i=>({id:50+i,name:'Group',groupId:50,groupSize:2,type:'standard',rate:76,nights:1,arrival:0,status:'waiting',kind:'group',unit:i}))},venue:{...b.venue!,visitors:[0,1].map(i=>({id:50+i,bookingId:50+i,seed:i,state:'waiting',patience:100,unit:null,remaining:0,offerId:'standard'}))}};
 const blocked={...b,venue:{...b.venue!,units:b.venue!.units.map((u,i)=>i===1?{...u,dirty:true}:u)}};
 assert.match(lodgingBlocker(p,blocked,50)!,/both|all.*rooms/);assert.equal(serveLodging(p,blocked,1,1,50),blocked);
 const after=serveLodging(p,b,1,1,50);near(after.cash,b.cash+152);assert.equal(after.venue!.units.filter(u=>u.occupied).length,2);near(after.deferredIncome!,152);
 s.businesses.hotel=b;s=manageLodging(s,'hotel',{type:'cancel',id:50});assert.equal(s.businesses.hotel.lodging!.bookings.filter(k=>k.status==='cancelled').length,2);assert.equal(s.businesses.hotel.venue!.visitors.length,0);
});
test('concierge resolves requests and breakfast consumes portions once per morning',()=>{
 let s=startEmpireWeek(fresh()).district;s=hireBusinessStaff(s,'hotel','concierge');let b=s.businesses.hotel;
 b={...b,lodging:{...b.lodging!,facilities:['restaurant'],lastBookingDay:0,lastIssueDay:0,issues:[{id:999,unit:0,kind:'service',description:'Refreshments',deadline:100}]},venue:{...b.venue!,clock:0,arrivalTimer:100,units:b.venue!.units.map((u,i)=>i?u:{...u,occupied:true,checkoutAt:100})}};
 const before=b.inventory!['stock-4'];b=advanceLodging(p,b,8,1,1);assert.equal(b.lodging!.issues[0].resolved,'help');assert.ok(b.inventory!['stock-4']<before);const served=b.lodging!.breakfastServed??0;
 b=advanceLodging(p,b,.1,1,1);assert.equal(b.lodging!.breakfastServed??0,served);const f=venueFinancials(p,b,s);near(f.assets,f.liabilities+f.equity);near(f.closingCash,b.cash);
 assert.ok(roomReadiness(b,0).some(c=>c.label==='Vacant'&&!c.met));
});

test('a staffed four-room hotel can earn the first floor milestone through ordinary service',()=>{
 let s=fresh().district;s=hireBusinessStaff(s,'hotel','care');s=hireBusinessStaff(s,'hotel','service');s=hireBusinessStaff(s,'hotel','maintenance');s=hireBusinessStaff(s,'hotel','manager');let b=s.businesses.hotel,reached=false;
 for(let week=1;week<=12&&!reached;week++){
  b=startVenueWeek(p,{...b,venue:{...b.venue!,running:false}},week);
  for(let tick=0;tick<180;tick++){const day=Math.min(7,1+Math.floor(tick*7/180));b=advanceBusinessStockroom(p,b,week,day);s={...s,week,day,businesses:{...s.businesses,hotel:b}};s=manageBusinessStockroom(s,'hotel');b=advanceVenue(p,s.businesses.hotel,1,week,day);}
  s=finishWeek({...s,businesses:{hotel:b}},false);b=s.businesses.hotel;
  reached=hotelFloorChecks(b,s,2).every(c=>c.met);
 }
 assert.ok(reached,`First expansion should be reachable: ${JSON.stringify(hotelFloorChecks(b,s,2))}`);
});
