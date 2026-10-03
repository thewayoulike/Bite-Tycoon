import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,startEmpireWeek,parseEmpireSave} from '../src/empire/empire';
import {advanceVenue,operateVenue,startVenueWeek} from '../src/empire/venueSimulation';
import {absoluteTime,ensureLodging,manageLodging,maxFloors,newLodgingUnit,nextFloorCost,unitReady,roomNeedsRepair,roomRepairBlocker,lodgingRepairStatus} from '../src/empire/lodging';
import {autoStockBusiness,propertyById,hireBusinessStaff,restockBusinessItem} from '../src/prototype/expansionModel';
import {venueFinancials} from '../src/empire/venueFinance';
const fresh=()=>unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.001,`${a} != ${b}`);

test('hired maintenance staff repair the same faults shown in the queue, including occupied rooms',()=>{
 for(const id of ['hotel','apartments'])for(const fault of [false,true]){
  let s=startEmpireWeek(fresh()).district;s=hireBusinessStaff(s,id,'maintenance');const p=propertyById(id)!;
  const hired=s.businesses[id],repairStock=id==='hotel'?'stock-5':'stock-0';
  const b={...hired,lodging:{...hired.lodging!,lastBookingDay:0,lastIssueDay:0,shifts:{service:'evening' as const,care:'evening' as const,maintenance:'all' as const},issues:fault?[{id:400,unit:0,kind:'repair' as const,description:'Fault',deadline:100}]:[]},venue:{...hired.venue!,clock:0,arrivalTimer:100,units:hired.venue!.units.map((u,i)=>i?u:{...u,condition:fault?85:64,occupied:true,checkoutAt:100})}};
  assert.equal(roomNeedsRepair(b,0),true);assert.match(lodgingRepairStatus(p,b),/1 repair queued/);
  const after=advanceVenue(p,b,10,s.week,s.day);assert.equal(after.venue!.units[0].condition,100);assert.equal(after.venue!.units[0].occupied,true);
  close(after.cash,b.cash-15);assert.equal(after.inventory![repairStock],b.inventory![repairStock]-2);
  if(fault)assert.equal(after.lodging!.issues[0].resolved,'Repaired');
  const f=venueFinancials(p,after,s);close(f.assets,f.liabilities+f.equity);
 }
});

test('repair blockers explain shifts, unopened weeks and missing supplies; restocking resumes staff work',()=>{
 for(const id of ['hotel','apartments']){
  let s=startEmpireWeek(fresh()).district;s=hireBusinessStaff(s,id,'maintenance');const p=propertyById(id)!,key=id==='hotel'?'stock-5':'stock-0',hired=s.businesses[id];
  const damaged={...hired,lodging:{...hired.lodging!,lastBookingDay:0,lastIssueDay:0,shifts:{service:'evening' as const,care:'evening' as const,maintenance:'all' as const}},venue:{...hired.venue!,clock:0,arrivalTimer:100,units:hired.venue!.units.map((u,i)=>i?u:{...u,condition:40})}};
  const closed={...damaged,venue:{...damaged.venue,running:false}};
  assert.match(lodgingRepairStatus(p,closed),/start the week/);assert.equal(advanceVenue(p,closed,10,1,1),closed);
  const off={...damaged,lodging:{...damaged.lodging,shifts:{...damaged.lodging.shifts,maintenance:'evening' as const}}};
  assert.match(lodgingRepairStatus(p,off),/off shift/);assert.equal(advanceVenue(p,off,10,1,1).venue!.units[0].condition,40);
  const dry={...damaged,inventory:{...damaged.inventory,[key]:0}};
  assert.match(roomRepairBlocker(p,dry,0)!,/Order more in Inventory/);assert.match(lodgingRepairStatus(p,dry),/Staff waiting/);
  let b=advanceVenue(p,dry,10,1,1);assert.equal(b.venue!.units[0].condition,40);assert.equal(b.cash,dry.cash);
  s={...s,businesses:{...s.businesses,[id]:b}};s=restockBusinessItem(s,id,key,10);b=s.businesses[id];
  const repaired=advanceVenue(p,b,10,1,1);assert.equal(repaired.venue!.units[0].condition,100);close(repaired.cash,b.cash-15);
  const poor={...damaged,cash:14};assert.match(roomRepairBlocker(p,poor,0)!,/Needs \$15/);assert.equal(advanceVenue(p,poor,10,1,1).venue!.units[0].condition,40);
 }
});

test('manual repair works with hired staff before opening, charges once, and apartment cleaning uses cleaning supplies',()=>{
 for(const id of ['hotel','apartments']){
  let s=fresh().district;s=hireBusinessStaff(s,id,'maintenance');const p=propertyById(id)!,old=s.businesses[id];
  const b={...old,venue:{...old.venue!,units:old.venue!.units.map((u,i)=>i?u:{...u,condition:80,dirty:true,cleanliness:20})}};
  s={...s,businesses:{...s.businesses,[id]:b}};assert.equal(roomRepairBlocker(p,b,0),null);
  s=manageLodging(s,id,{type:'repair',unit:0});const repaired=s.businesses[id];assert.equal(repaired.venue!.units[0].condition,100);assert.equal(repaired.venue!.units[0].dirty,true);close(repaired.cash,b.cash-15);
  assert.equal(manageLodging(s,id,{type:'repair',unit:0}).businesses[id],repaired);
  if(id==='apartments'){
   s=operateVenue(s,id,'clean',0);const clean=s.businesses[id];assert.equal(clean.venue!.units[0].dirty,false);assert.equal(clean.inventory!['stock-1'],repaired.inventory!['stock-1']-2);assert.equal(clean.inventory!['stock-0'],repaired.inventory!['stock-0']);assert.equal(clean.cash,repaired.cash);
  }
 }
});

test('additional maintenance workers increase repair throughput without double-charging completed jobs',()=>{
 let s=startEmpireWeek(fresh()).district;s=hireBusinessStaff(s,'hotel','maintenance');s=hireBusinessStaff(s,'hotel','maintenance');const b=s.businesses.hotel;
 const damaged={...b,lodging:{...b.lodging!,lastBookingDay:0,lastIssueDay:0},venue:{...b.venue!,clock:0,arrivalTimer:100,units:b.venue!.units.map((u,i)=>i<2?{...u,condition:40}:u)}};
 const first=advanceVenue(propertyById('hotel')!,damaged,5,1,1);assert.equal(first.venue!.units[0].condition,100);assert.equal(first.venue!.units[1].condition,40);
 const second=advanceVenue(propertyById('hotel')!,first,5,1,1);assert.equal(second.venue!.units[1].condition,100);close(second.cash,damaged.cash-30);
});
test('renovations change one unit once, with no duplicate charge, rate reset or free repair',()=>{
 for(const id of ['hotel','apartments']){
  let s=fresh().district;const before=s.businesses[id],type=id==='hotel'?'suite':'twobed';
  assert.equal(manageLodging(s,id,{type:'renovate',unit:0,roomType:before.venue!.units[0].type!}).businesses[id],before);
  s=manageLodging(s,id,{type:'renovate',unit:0,roomType:type});const renovated=s.businesses[id];
  assert.equal(renovated.venue!.units[0].type,type);close(renovated.cash,before.cash-(id==='hotel'?1400:1000));
  assert.deepEqual(renovated.venue!.units.slice(1),before.venue!.units.slice(1));
  for(let n=0;n<5;n++){s=manageLodging(s,id,{type:'renovate',unit:0,roomType:type});assert.equal(s.businesses[id],renovated);}
  s=manageLodging(s,id,{type:'rate',unit:0,rate:400});
  const custom={...s.businesses[id],venue:{...s.businesses[id].venue!,units:s.businesses[id].venue!.units.map((u,i)=>i?u:{...u,condition:70,dirty:true})}};
  s={...s,businesses:{...s.businesses,[id]:custom}};
  assert.equal(manageLodging(s,id,{type:'renovate',unit:0,roomType:type}).businesses[id],custom);
  const statements=venueFinancials(propertyById(id)!,custom,s);close(statements.assets,statements.liabilities+statements.equity);
 }
});

test('occupied and reserved units cannot be converted or charged',()=>{
 for(const id of ['hotel','apartments'])for(const reserved of [false,true]){
  let s=fresh().district;const before=s.businesses[id];
  const b={...before,venue:{...before.venue!,units:before.venue!.units.map((u,i)=>i?u:{...u,occupied:!reserved})},lodging:{...before.lodging!,bookings:reserved?[{id:200,name:'Existing reservation',type:before.venue!.units[0].type!,unit:0,rate:85,nights:1,arrival:100,status:'reserved' as const,kind:'booking' as const}]:[]}};
  s={...s,businesses:{...s.businesses,[id]:b}};
  assert.equal(manageLodging(s,id,{type:'renovate',unit:0,roomType:id==='hotel'?'family':'onebed'}).businesses[id],b);
 }
});
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
