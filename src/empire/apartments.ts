import {prepareHouseholds,householdPayment} from '../career/services';
import {businessWages,type Business,type ExpansionState,type Property} from '../prototype/expansionModel';
import type {RoomType} from './lodging';
import {protectedObligations} from './cashProtection';

export type FurnishingPackage='unfurnished'|'partial'|'furnished';
export const FURNISHING_PACKAGES=[{id:'unfurnished',name:'Unfurnished',cost:0,rent:.85,description:'Kitchen and bathroom included. Residents bring their own furniture; landlord maintains the fixed fittings.'},{id:'partial',name:'Partly furnished',cost:200,rent:.95,description:'Landlord supplies the bed, wardrobe and appliances; residents bring living-room furniture.'},{id:'furnished',name:'Furnished',cost:450,rent:1,description:'Landlord supplies the full bed, dining and lounge package and maintains it.'}] as const;
const targets=[0,6,18,36,60,90,126,168,216,270];
const names=['Starter studios','One-bedroom living','Family homes','Resident services','Growing families','Work from home','Health & access','Premium living','Terraces & families','Penthouses'];
const additions=['Three starter studios with kitchens, bathrooms and living areas.','One-bedroom conversions and parcel lockers.','Two-bedroom conversions and bicycle storage.','Shared laundry and maintenance workshop.','Indoor playroom for resident families.','Resident work lounge and quieter shared spaces.','Fitness room and improved lift service.','Premium fittings and insulation packages.','Landscaped terrace for residents.','Top-floor penthouse conversions and roof garden.'];
export const APARTMENT_FLOORS=targets.map((weeks,i)=>({floor:i+1,weeks,name:names[i],visible:additions[i],cost:i===0?0:(i+1)*2400}));
export const APARTMENT_FACILITIES=[
 {id:'parcels',name:'Parcel lockers',floor:2,cost:600,upkeep:5,description:'Secure parcel storage in the lobby improves resident satisfaction.'},
 {id:'bikes',name:'Bicycle storage',floor:3,cost:800,upkeep:5,description:'A resident bike rack in the shared wing.'},
 {id:'resident-laundry',name:'Resident laundry',floor:4,cost:1600,upkeep:15,description:'Shared washers for residents; included utility charge, no hotel linen inventory.'},
 {id:'workshop',name:'Maintenance workshop',floor:4,cost:1400,upkeep:10,description:'Workbench and parts storage; technicians repair faults 25% faster.'},
 {id:'playroom',name:'Children’s playroom',floor:5,cost:1800,upkeep:15,description:'A soft-play corner and activity tables for resident families.'},
 {id:'work-lounge',name:'Resident work lounge',floor:6,cost:2000,upkeep:15,description:'Work desks and quiet seating for residents.'},
 {id:'fitness',name:'Resident fitness room',floor:7,cost:2200,upkeep:20,description:'Exercise equipment in the shared wing.'},
 {id:'lift',name:'Lift service upgrade',floor:7,cost:1800,upkeep:10,description:'Extra lift maintenance and improved leasing throughput.'},
 {id:'insulation',name:'Sound insulation',floor:8,cost:2600,upkeep:0,description:'Improved acoustic lining reduces noise complaints.'},
 {id:'terrace',name:'Landscaped terrace',floor:9,cost:2800,upkeep:15,description:'Planted outdoor seating for residents.'},
 {id:'roof-garden',name:'Resident roof garden',floor:10,cost:3400,upkeep:20,description:'A planted roof lounge overlooking the neighborhood.'},
];
export const apartmentWeeks=(b:Business)=>b.lodging?.occupiedHomeWeeks??0;
export const apartmentUpkeep=(b:Business)=>APARTMENT_FACILITIES.filter(f=>b.lodging?.facilities.includes(f.id)).reduce((n,f)=>n+f.upkeep,0);
export function apartmentFloorChecks(p:Property,b:Business,s:ExpansionState,floor=(b.lodging?.openFloors??1)+1){
 const spec=APARTMENT_FLOORS[floor-1];if(!spec)return [];
 const l=b.lodging!,occupancy=l.lastReport?.occupancy??0;
 const response=l.issues.filter(i=>i.deadline>(s.week-2)*180).every(i=>i.kind!=='repair'||(i.resolved&&!i.resolved.toLowerCase().includes('unresolved'))||i.deadline>(s.week-1)*180+(b.venue?.running?b.venue.clock:0));
 const protectedCash=protectedObligations(p,b,s),bills=protectedCash.total+Math.max(0,businessWages(p,b)-protectedCash.wages),buffer=b.manager?.reserve??0;
 return [{label:`${spec.weeks} occupied-home weeks`,value:`${apartmentWeeks(b)} / ${spec.weeks}`,met:apartmentWeeks(b)>=spec.weeks},
 ...(floor>=4?[{label:'70% occupancy in the last completed week',value:`${Math.round(occupancy)}% / 70%`,met:occupancy>=70},{label:'Maintenance requests handled on time',value:response?'On track':'Overdue repairs',met:response},{label:'Keep cash for bills and buffer after construction',value:`$${Math.max(0,b.cash-spec.cost).toFixed(0)} / $${Math.ceil(bills+buffer)}`,met:b.cash-spec.cost>=bills+buffer}]:[]),
 ...(floor>=8?[{label:'Resident satisfaction 80/100',value:`${Math.round(l.reputation)} / 80`,met:l.reputation>=80}]:[])];
}
export function apartmentFloorBlocker(p:Property,b:Business,s:ExpansionState){
 if((b.lodging?.openFloors??1)>=10)return 'All ten residential floors are open.';
 if(b.venue?.running)return 'Open floors between weeks.';
 return apartmentFloorChecks(p,b,s).find(c=>!c.met)?.label??null;
}
export function apartmentTypeUnlocked(b:Business,type:RoomType,index:number){
 if(b.venue?.units[index]?.type===type)return true;
 const floor=b.lodging?.openFloors??1;
 return type==='studio'||type==='onebed'&&floor>=2||type==='twobed'&&floor>=3||type==='penthouse'&&floor>=10&&Math.floor(index/3)===9;
}
export const apartmentTypeRequirement=(type:RoomType)=>type==='penthouse'?'Top floor 10 only':type==='onebed'?'Floor 2':type==='twobed'?'Floor 3':'Floor 1';
export function apartmentTerm(b:Business){return b.lodging?.leaseTerm??6;}
export const tenantDepositWeeks=(b:Business)=>b.lodging?.depositWeeks??1;
export function apartmentRentBase(b:Business,index:number,base:number){return base*(FURNISHING_PACKAGES.find(f=>f.id===(b.venue?.units[index]?.furnishing??'furnished'))?.rent??1)*(b.venue?.units[index]?.premiumFinish?1.12:1);}
export const rentReceivable=(b:Business)=>b.lodging?.bookings.reduce((n,v)=>n+(v.rentDue??0),0)??0;
export function collectApartmentRent(b:Business,week:number):Business{
 if(!b.venue||!b.lodging)return b;
 const original=b;b=prepareHouseholds(b,week);
 let earned=0,collected=0;const bookings=b.lodging.bookings.map(v=>({...v}));
 const units=b.venue.units.map(u=>{
  if(!u.occupied||u.rentWeek>=week)return u;
  const rent=Math.round(u.rent??u.rate??180),booking=bookings.find(v=>v.id===u.bookingId);
  if(booking?.rentPaidThrough!==undefined&&booking.departure!==undefined&&booking.rentPaidThrough>=booking.departure-1e-7)return u;
  if(booking?.rentPaidThrough!==undefined)booking.rentPaidThrough+=180;
  earned+=rent;
  // An occasional delayed bank payment retries the following game day. It is a
  // receivable, never another sale, a loan, or a deduction from a tenant deposit.
  if(booking&&(booking.id+week)%11===0){booking.rentDue=(booking.rentDue??0)+rent;booking.rentRetryAt=(week-1)*180+180/7;}
  else if(booking){const paid=householdPayment(b,booking.id,rent);b=paid.business;collected+=paid.paid;if(paid.paid<rent){booking.rentDue=(booking.rentDue??0)+rent-paid.paid;booking.rentRetryAt=(week-1)*180+180/7;}}
  else collected+=rent;
  return {...u,rentWeek:week};
 });
 if(!earned)return original;
 return {...b,cash:b.cash+collected,books:b.books?{...b.books,revenue:b.books.revenue+earned}:undefined,lodging:{...b.lodging,bookings,rentCollected:(b.lodging.rentCollected??0)+collected},venue:{...b.venue,units,week:{...b.venue.week,revenue:b.venue.week.revenue+earned},totalRevenue:b.venue.totalRevenue+earned},ledger:[...b.ledger,{week,day:1,label:`Weekly tenant rents · $${earned-collected} pending`,amount:collected}].slice(-60)};
}
