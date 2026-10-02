import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,startEmpireWeek,parseEmpireSave} from '../src/empire/empire';
import {advanceVenue,operateVenue,startVenueWeek} from '../src/empire/venueSimulation';
import {absoluteTime,ensureLodging,manageLodging,maxFloors,newLodgingUnit,nextFloorCost,unitReady} from '../src/empire/lodging';
import {autoStockBusiness,propertyById} from '../src/prototype/expansionModel';
import {venueFinancials} from '../src/empire/venueFinance';
const fresh=()=>unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.001,`${a} != ${b}`);
test('three starter leases unlock apartment expansion without waiting six weeks for turnover',()=>{
 let s=fresh().district,b=s.businesses.apartments;s={...s,businesses:{...s.businesses,apartments:{...b,venue:{...b.venue!,totalServed:3,units:b.venue!.units.map(u=>({...u,occupied:true}))}}}};
 s=manageLodging(s,'apartments',{type:'floor'});assert.equal(s.businesses.apartments.lodging!.openFloors,2);assert.equal(s.businesses.apartments.venue!.units.length,6);assert.equal(s.businesses.apartments.venue!.units.filter(u=>u.occupied).length,3);
});
test('receptionists respect shifts and finite check-in capacity',()=>{
 const p=propertyById('hotel')!;let b=startEmpireWeek(fresh()).district.businesses.hotel;
 b={...b,lodging:{...b.lodging!,lastBookingDay:0,shifts:{service:'evening',care:'evening'}},venue:{...b.venue!,clock:1,visitors:[{id:99,seed:99,state:'waiting',patience:60,remaining:0,unit:null,offerId:'standard'}]}};
 b=advanceVenue(p,b,11,1,1);assert.equal(b.venue!.totalServed,0);b={...b,lodging:{...b.lodging!,shifts:{...b.lodging!.shifts,service:'all'}}};b=advanceVenue(p,b,1,1,1);assert.equal(b.venue!.totalServed,1);assert.equal(b.venue!.visitors.find(v=>v.id===99)?.state,'using');
});
test('new hotels and apartments start with one floor; expansion is earned, paid, sequential and capped',()=>{
 let s=fresh().district;
 for(const id of ['hotel','apartments']){
  const p=propertyById(id)!,initial=s.businesses[id],perFloor=id==='hotel'?4:3;
  assert.equal(initial.lodging!.openFloors,1);assert.equal(initial.venue!.units.length,perFloor);
  assert.equal(manageLodging(s,id,{type:'floor'}).businesses[id],initial);
  s={...s,businesses:{...s.businesses,[id]:{...initial,cash:200000,books:{...initial.books!,capital:initial.books!.capital+175000},venue:{...initial.venue!,totalServed:100}}}};
  for(let floor=2;floor<=maxFloors(p);floor++){
   const before=s.businesses[id],cost=nextFloorCost(p,before);s=manageLodging(s,id,{type:'floor'});const after=s.businesses[id];assert.equal(after.lodging!.openFloors,floor);assert.equal(after.venue!.units.length,floor*perFloor);close(after.cash,before.cash-cost);const f=venueFinancials(p,after,s);close(f.assets,f.liabilities+f.equity);close(f.closingCash,after.cash);
  }
  assert.equal(manageLodging(s,id,{type:'floor'}).businesses[id],s.businesses[id]);
 }
 assert.equal(s.businesses.diner.cash,fresh().district.businesses.diner.cash);
});
test('booked rates survive edits and future reserved rooms cannot be sold to walk-ins',()=>{
 let s=startEmpireWeek(fresh()).district,b=s.businesses.hotel;
 b={...b,lodging:{...b.lodging!,bookings:[{id:50,name:'Reserved guest',type:'standard',rate:90,nights:2,arrival:0,status:'waiting',kind:'family',unit:0}],nextBooking:51},venue:{...b.venue!,visitors:[{id:50,seed:50,state:'waiting',patience:50,remaining:0,unit:null,offerId:'standard',bookingId:50}]}};
 s={...s,businesses:{...s.businesses,hotel:b}};s=manageLodging(s,'hotel',{type:'rate',unit:0,rate:200});const cash=s.businesses.hotel.cash;s=operateVenue(s,'hotel','serve',50);assert.equal(s.businesses.hotel.venue!.units[0].rent,90);close(s.businesses.hotel.cash,cash+180);assert.equal(s.businesses.hotel.lodging!.bookings[0].status,'staying');
 b={...s.businesses.hotel,venue:{...s.businesses.hotel.venue!,units:s.businesses.hotel.venue!.units.map((u,i)=>({...u,occupied:i!==1,dirty:false})),visitors:[{id:90,seed:90,state:'waiting',patience:30,remaining:0,unit:null,offerId:'standard'}]},lodging:{...s.businesses.hotel.lodging!,bookings:[{id:60,name:'Future guest',type:'standard',rate:85,nights:1,arrival:100,status:'reserved',kind:'booking',unit:1}]}};
 const view={...s,businesses:{...s.businesses,hotel:b}};assert.equal(operateVenue(view,'hotel','serve',90).businesses.hotel.cash,b.cash);
});
test('overnight checkout creates dirty rooms; cleaning consumes linen, towels and products',()=>{
 let s=startEmpireWeek(fresh()).district,b=s.businesses.hotel;const p=propertyById('hotel')!;
 b={...b,lodging:{...b.lodging!,shifts:{service:'evening',care:'evening'},lastBookingDay:0},venue:{...b.venue!,clock:6,visitors:[{id:1,seed:2,state:'waiting',patience:30,remaining:0,unit:null,offerId:'standard'}]}};s={...s,businesses:{...s.businesses,hotel:b}};s=operateVenue(s,'hotel','serve',1);b=s.businesses.hotel;const departure=b.venue!.units[0].checkoutAt!;assert.ok(departure>180/7);
 while(absoluteTime(s.week,b.venue!.clock)<departure)b=advanceVenue(p,b,.2,s.week,2);
 assert.equal(b.venue!.units[0].occupied,false);assert.equal(b.venue!.units[0].dirty,true);assert.equal(unitReady(b.venue!.units[0]),false);
 s={...s,businesses:{...s.businesses,hotel:b}};const stock={...b.inventory};s=manageLodging(s,'hotel',{type:'clean',unit:0});assert.equal(s.businesses.hotel.venue!.units[0].dirty,false);assert.equal(s.businesses.hotel.inventory!['stock-0'],stock['stock-0']!-1);assert.equal(s.businesses.hotel.inventory!['stock-3'],stock['stock-3']!-1);assert.equal(s.businesses.hotel.inventory!['stock-2'],stock['stock-2']!-2);assert.ok(s.businesses.hotel.lodging!.bookings.some(v=>v.review!==undefined));
});
test('leases retain agreed rent and are collected once per week despite rate and condition changes',()=>{
 let s=startEmpireWeek(fresh()).district,b=s.businesses.apartments;const p=propertyById('apartments')!;
 b={...b,venue:{...b.venue!,visitors:[{id:1,seed:1,state:'waiting',patience:30,remaining:0,unit:null,offerId:'studio'}]}};s={...s,businesses:{...s.businesses,apartments:b}};s=operateVenue(s,'apartments','serve',1);s=manageLodging(s,'apartments',{type:'rate',unit:0,rate:400});b=s.businesses.apartments;const cash=b.cash;b=startVenueWeek(p,{...b,condition:50,venue:{...b.venue!,running:false}},s.week+1);close(b.cash,cash+180);assert.equal(startVenueWeek(p,b,s.week+1).cash,b.cash);assert.equal(b.venue!.units[0].rent,180);
});
test('purchasing targets honor reserve and budget, and refunds reconcile all statements',()=>{
 let s=startEmpireWeek(fresh()).district,b=s.businesses.hotel;
 b={...b,manager:{enabled:true,budget:15,spent:0,reserve:b.cash-10},inventory:{...b.inventory,'stock-5':0},lodging:{...b.lodging!,targets:{'stock-5':20}}};s={...s,businesses:{...s.businesses,hotel:b}};s=autoStockBusiness(s,'hotel');assert.ok(s.businesses.hotel.cash>=b.manager!.reserve);assert.ok(s.businesses.hotel.manager!.spent<=10.001);assert.ok(s.businesses.hotel.inventory!['stock-5']>0);
 b=s.businesses.hotel;b={...b,venue:{...b.venue!,units:b.venue!.units.map((u,i)=>i===0?{...u,occupied:true,rent:100}:u)},lodging:{...b.lodging!,issues:[{id:1,unit:0,kind:'noise',description:'Noise',deadline:100}]}};s={...s,businesses:{...s.businesses,hotel:b}};const cash=b.cash;s=manageLodging(s,'hotel',{type:'issue',id:1,choice:'refund'});close(s.businesses.hotel.cash,cash-25);close(s.businesses.hotel.venue!.week.revenue,b.venue!.week.revenue-25);const f=venueFinancials(propertyById('hotel')!,s.businesses.hotel,s);close(f.assets,f.liabilities+f.equity);close(f.closingCash,s.businesses.hotel.cash);
});
test('legacy saves keep rooms, occupants, agreed rents and cash without adding unrecorded stock',()=>{
 const e=fresh(),p=propertyById('hotel')!,old=e.district.businesses.hotel;delete old.lodging;old.venue!.units=Array.from({length:8},(_,i)=>({...newLodgingUnit(p),occupied:i===6,rent:125,remaining:12}));old.inventory={'stock-0':80,'stock-1':70,'stock-2':60};const b=ensureLodging(p,old,12);assert.equal(b.lodging!.openFloors,2);assert.equal(b.venue!.units.length,8);assert.ok(b.venue!.units[6].occupied);assert.equal(b.lodging!.bookings[0].rate,125);assert.equal(b.cash,old.cash);assert.equal(b.inventory!['stock-3'],0);e.district.businesses.hotel=b;assert.equal(parseEmpireSave(JSON.stringify(e))!.district.businesses.hotel.lodging!.openFloors,2);
});
