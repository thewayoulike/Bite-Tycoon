import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,startEmpireWeek,parseEmpireSave} from '../src/empire/empire';
import {propertyById,businessSupplies} from '../src/prototype/expansionModel';
import {manageLodging,newLodgingUnit,roomRepairBlocker} from '../src/empire/lodging';
import {advanceLodging,serveLodging} from '../src/empire/lodgingSimulation';
import {APARTMENT_FACILITIES,apartmentFloorChecks,apartmentTypeUnlocked,collectApartmentRent,rentReceivable} from '../src/empire/apartments';
import {venueFinancials} from '../src/empire/venueFinance';
import {createLodgingLayout,lodgingWalkingPath,clearWalkingSegment} from '../src/empire/lodgingLayout';
import {residentKitchenPoint} from '../src/empire/lodgingActivities';
import {orderBusinessStock} from '../src/inventory/businessStockroom';
const fresh=()=>unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);
const p=propertyById('apartments')!;
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.001,`${a} ≠ ${b}`);
test('apartment progression counts time occupied, not signings, cash or repeated floor clicks',()=>{
 let s=startEmpireWeek(fresh()).district,b=s.businesses.apartments;
 b={...b,venue:{...b.venue!,clock:0,arrivalTimer:1000,totalServed:10000,units:b.venue!.units.map(u=>({...u,occupied:true,checkoutAt:2000}))},lodging:{...b.lodging!,lastBookingDay:0,lastIssueDay:0}};
 s.businesses.apartments={...b,venue:{...b.venue!,running:false}};assert.equal(manageLodging(s,'apartments',{type:'floor'}).businesses.apartments,s.businesses.apartments);
 b=advanceLodging(p,b,180,1,7);assert.equal(b.lodging!.occupiedHomeWeeks,3);
 b={...b,venue:{...b.venue!,clock:0,running:true}};b=advanceLodging(p,b,180,2,7);assert.equal(b.lodging!.occupiedHomeWeeks,6);
 s.businesses.apartments={...b,venue:{...b.venue!,running:false}};const before=b.cash;s=manageLodging(s,'apartments',{type:'floor'});assert.equal(s.businesses.apartments.lodging!.openFloors,2);assert.equal(s.businesses.apartments.venue!.units.length,6);near(s.businesses.apartments.cash,before-4800);
 const built=s.businesses.apartments;assert.equal(manageLodging(s,'apartments',{type:'floor'}).businesses.apartments,built);
});
test('upper apartment floors require occupancy, payroll cash, maintenance response and satisfaction',()=>{
 const s=fresh().district,b=s.businesses.apartments;b.lodging={...b.lodging!,openFloors:3,occupiedHomeWeeks:300,lastReport:{week:1,occupancy:69,reputation:90,averageRate:180,served:3,lost:0,revenue:1000}};
 assert.ok(apartmentFloorChecks(p,b,s).some(c=>!c.met));b.lodging.lastReport!.occupancy=75;b.cash=9600;
 assert.equal(apartmentFloorChecks(p,b,s).at(-1)!.met,false);b.cash=50000;assert.ok(apartmentFloorChecks(p,b,s).every(c=>c.met));
 b.lodging.openFloors=7;b.lodging.reputation=79;assert.equal(apartmentFloorChecks(p,b,s).at(-1)!.met,false);
 b.lodging.reputation=80;assert.ok(apartmentFloorChecks(p,b,s).every(c=>c.met));
});
test('new lease terms and deposits are captured, survive saves and do not rewrite existing contracts',()=>{
 let e=startEmpireWeek(fresh()),s=e.district;s=manageLodging(s,'apartments',{type:'leaseTerms',weeks:24,depositWeeks:0});let b=s.businesses.apartments;
 b={...b,venue:{...b.venue!,visitors:[{id:4,seed:4,state:'waiting',unit:null,remaining:0,patience:100,offerId:'studio'}]}};
 const before=b.cash;b=serveLodging(p,b,1,1,4);near(b.cash,before+180);assert.equal(b.tenantDeposits??0,0);assert.equal(b.lodging!.bookings[0].leaseWeeks,24);assert.equal(b.venue!.units[0].leaseEnd,25);
 s.businesses.apartments=b;s=manageLodging(s,'apartments',{type:'leaseTerms',weeks:6,depositWeeks:1});assert.equal(s.businesses.apartments.lodging!.bookings[0].leaseWeeks,24);
 e.district=s;const loaded=parseEmpireSave(JSON.stringify(e))!.district.businesses.apartments;assert.equal(loaded.lodging!.bookings[0].leaseWeeks,24);assert.equal(loaded.lodging!.leaseTerm,6);
 const f=venueFinancials(p,loaded,s);near(f.assets,f.liabilities+f.equity);near(f.closingCash,loaded.cash);
});
test('renewals begin at expiry, keep the tenant, and are never applied or counted twice',()=>{
 let s=startEmpireWeek(fresh()).district,b=s.businesses.apartments;
 b={...b,lodging:{...b.lodging!,bookings:[{id:99,name:'Resident',type:'studio',rate:180,nights:1,arrival:0,departure:12,leaseEnd:2,status:'staying',kind:'booking',unit:0}]},venue:{...b.venue!,clock:10,units:b.venue!.units.map((u,i)=>i?u:{...u,occupied:true,rent:180,bookingId:99,checkoutAt:12,leaseEnd:2}),arrivalTimer:1000}};
 s.businesses.apartments=b;s=manageLodging(s,'apartments',{type:'renew',id:99,rate:185,weeks:12});b=s.businesses.apartments;assert.equal(b.venue!.units[0].rent,180);assert.equal(b.lodging!.renewalsAccepted,1);
 assert.equal(manageLodging(s,'apartments',{type:'renew',id:99,rate:190,weeks:6}).businesses.apartments,b);
 const before=b.cash;b=advanceLodging(p,b,3,1,1);assert.equal(b.venue!.units[0].occupied,true);assert.equal(b.venue!.units[0].rent,185);assert.equal(b.venue!.units[0].checkoutAt,12+12*180);assert.equal(b.lodging!.bookings[0].renewal,undefined);near(b.cash,before+185);assert.equal(b.lodging!.bookings[0].rentPaidThrough,192);
});

test('a six-week lease charges six weeks even when move-in falls between calendar-week boundaries',()=>{
 let s=startEmpireWeek(fresh()).district,b=s.businesses.apartments;
 b={...b,venue:{...b.venue!,clock:50,visitors:[{id:4,seed:4,state:'waiting',unit:null,remaining:0,patience:100,offerId:'studio'}]}};
 const revenue=b.books!.revenue;b=serveLodging(p,b,1,2,4);
 for(let week=2;week<=7;week++)b=collectApartmentRent(b,week);
 near(b.books!.revenue-revenue,180*6);assert.equal(b.lodging!.bookings[0].rentPaidThrough,50+6*180);
 const f=venueFinancials(p,b,s);near(f.assets,f.liabilities+f.equity);near(f.closingCash,b.cash);
});
test('delayed rent is a receivable and automatic retry collects it once without spending the deposit',()=>{
 const s=fresh().district;let b=s.businesses.apartments;
 b={...b,lodging:{...b.lodging!,bookings:[{id:9,name:'Resident',type:'studio',rate:180,nights:1,arrival:0,departure:2000,leaseEnd:12,status:'staying',kind:'booking',unit:0}]},venue:{...b.venue!,running:true,units:b.venue!.units.map((u,i)=>i?u:{...u,occupied:true,rent:180,rentWeek:1,bookingId:9,checkoutAt:2000}),arrivalTimer:1000}};
 const before=b.cash;b=collectApartmentRent(b,2);assert.equal(b.cash,before);assert.equal(rentReceivable(b),180);assert.equal(collectApartmentRent(b,2),b);
 let f=venueFinancials(p,b,s);near(f.assets,f.liabilities+f.equity);near(f.closingCash,b.cash);
 b=advanceLodging(p,b,27,2,2);assert.equal(rentReceivable(b),0);near(b.cash,before+180);const revenue=b.books!.revenue;
 b=advanceLodging(p,b,.1,2,2);assert.equal(b.books!.revenue,revenue);near(b.cash,before+180);f=venueFinancials(p,b,s);near(f.assets,f.liabilities+f.equity);near(f.closingCash,b.cash);
});
test('furnishing and premium fit-outs apply once; penthouses are top-floor purchases with legacy layouts retained',()=>{
 let s=fresh().district,b=s.businesses.apartments;assert.equal(apartmentTypeUnlocked(b,'onebed',0),false);
 s=manageLodging(s,'apartments',{type:'furnish',unit:0,package:'unfurnished'});assert.equal(s.businesses.apartments.venue!.units[0].rate,153);
 s=manageLodging(s,'apartments',{type:'furnish',unit:0,package:'partial'});const fitted=s.businesses.apartments;near(fitted.cash,b.cash-200);assert.equal(manageLodging(s,'apartments',{type:'furnish',unit:0,package:'partial'}).businesses.apartments,fitted);
 b={...fitted,lodging:{...fitted.lodging!,openFloors:10},venue:{...fitted.venue!,units:Array.from({length:30},()=>newLodgingUnit(p))}};assert.equal(apartmentTypeUnlocked(b,'penthouse',0),false);assert.equal(apartmentTypeUnlocked(b,'penthouse',27),true);b.venue!.units[0].type='penthouse';assert.equal(apartmentTypeUnlocked(b,'penthouse',0),true);
 s.businesses.apartments=b;s=manageLodging(s,'apartments',{type:'finish',unit:27});const premium=s.businesses.apartments;assert.ok(premium.venue!.units[27].premiumFinish);near(premium.cash,b.cash-650);assert.equal(manageLodging(s,'apartments',{type:'finish',unit:27}).businesses.apartments,premium);
});
test('apartment faults consume their actual replacement part and report missing stock',()=>{
 let s=fresh().district,b=s.businesses.apartments;assert.equal(businessSupplies(p,b).find(i=>i.name==='Replacement appliances')!.quantity,0);
 b={...b,lodging:{...b.lodging!,issues:[{id:1,unit:0,kind:'repair',supplyId:'stock-5',deadline:20,description:'Broken appliance'}]},venue:{...b.venue!,units:b.venue!.units.map((u,i)=>i?u:{...u,condition:50})}};assert.match(roomRepairBlocker(p,b,0)!,/replacement appliances/);
 s.businesses.apartments=b;s=orderBusinessStock(s,'apartments','stock-5',1,'emergency');const before=s.businesses.apartments.cash;s=manageLodging(s,'apartments',{type:'repair',unit:0});assert.equal(s.businesses.apartments.inventory!['stock-5'],0);near(s.businesses.apartments.cash,before-15);const f=venueFinancials(p,s.businesses.apartments,s);near(f.assets,f.liabilities+f.equity);
});
test('furnishing packages, kitchen routines and every shared amenity keep routes clear',()=>{
 const furnished=createLodgingLayout('apartments',1,['studio','onebed','twobed']);
 const empty=createLodgingLayout('apartments',1,['studio','onebed','twobed'],[],['unfurnished','partial','furnished']);assert.ok(empty.items.filter(i=>i.kind==='bed').length<furnished.items.filter(i=>i.kind==='bed').length);assert.equal(empty.items.filter(i=>i.kind==='kitchen').length,3);
 for(const room of furnished.rooms){const point=residentKitchenPoint(furnished,room),route=lodgingWalkingPath(furnished,furnished.elevator,point);assert.ok(route.length>1);for(let i=1;i<route.length;i++)assert.ok(clearWalkingSegment(furnished,route[i-1],route[i]));}
 const amenities=createLodgingLayout('apartments',11,[],APARTMENT_FACILITIES.map(f=>f.id));assert.equal(amenities.rooms.length,0);assert.ok(amenities.items.some(i=>i.kind==='washer'));assert.ok(amenities.items.some(i=>i.kind==='bikerack'));
 for(const target of amenities.care)assert.ok(lodgingWalkingPath(amenities,amenities.elevator,target).length>1);
});
