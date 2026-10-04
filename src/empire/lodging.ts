import {crewPower,ensureCrew} from '../career/crew';
import {APARTMENT_FACILITIES,apartmentFloorBlocker,apartmentTypeUnlocked,FURNISHING_PACKAGES,FurnishingPackage,apartmentRentBase} from './apartments';
import {consumeBusinessSupplies} from '../inventory/businessStockroom';
import type {Business,ExpansionState,Property} from '../prototype/expansionModel';
import {businessSupplies,propertyById} from '../prototype/expansionModel';
import type {VenueUnit} from './venueSimulation';
import {prepareHotelRoom} from './hotelLaundry';
import {worldTime} from './worldTime';
import {hotelFloorBlocker,roomTypeUnlocked,hotelWeeklyOccupancy} from './hotelProgression';

export type RoomType='standard'|'double'|'family'|'business'|'premium'|'suite'|'studio'|'onebed'|'twobed'|'penthouse';
export const roomLayoutDescription:Record<RoomType,string>={business:'Double bed, generous work desk, meeting chair and private bathroom.',premium:'King bed, upgraded finishes, lounge sofa and private bathroom.',standard:'Single bed, work desk and private bathroom.',double:'Double bed, bedside tables, work desk and a compact sofa.',family:'Two beds, extra seating, family storage and private bathroom.',suite:'King bed with a bedroom divider, separate lounge and side table.',studio:'Open-plan sleeping and living area with a kitchenette and bathroom.',onebed:'Separate bedroom, kitchen, dining nook and living room.',twobed:'Two enclosed bedrooms, kitchen, breakfast nook and living room.',penthouse:'Large bedroom, full kitchen, formal dining area and a larger lounge.'};
export type LodgingBooking={id:number;name:string;type:RoomType;rate:number;nights:number;arrival:number;departure?:number;unit?:number;status:'reserved'|'waiting'|'staying'|'completed'|'cancelled';kind:'booking'|'walk-in'|'family'|'group';review?:number;leaseEnd?:number;checkedInAt?:number;prepaid?:number;earned?:number;deposit?:number;groupId?:number;groupSize?:number;leaseWeeks?:6|12|24;depositWeeks?:0|1;renewal?:{rate:number;weeks:6|12|24;accepted:boolean};noticeGiven?:boolean;rentPaidThrough?:number;rentDue?:number;rentRetryAt?:number};
export type LodgingIssue={id:number;unit:number;kind:'noise'|'service'|'repair';description:string;deadline:number;resolved?:string;supplyId?:string};
export type StaffShift='all'|'morning'|'afternoon'|'evening';
export type LodgingState={version:1;completedNights?:number;profitableWeeks?:number;performanceWeek?:number;earnedRoomNights?:number;roomEarnings?:Record<number,number>;lastBreakfastDay?:number;breakfastServed?:number;breakfastMissed?:number;laundryMode?:'outsourced'|'inhouse';serviceNote?:string;serviceDue?:number;occupiedHomeWeeks?:number;homeProgress?:Record<number,number>;leaseTerm?:6|12|24;depositWeeks?:0|1;renewalsOffered?:number;renewalsAccepted?:number;lastResidentDay?:number;rentCollected?:number;openFloors:number;reputation:number;bookings:LodgingBooking[];issues:LodgingIssue[];facilities:string[];shifts:Record<string,StaffShift>;targets:Record<string,number>;nextBooking:number;lastBookingDay:number;lastIssueDay:number;occupiedSeconds:number;availableSeconds:number;roomRevenue:number;roomNights:number;lastReport?:{occupancy:number;averageRate:number;reputation:number;served:number;lost:number;revenue:number;week:number;profit?:number;revpar?:number;complaints?:number}};
export const isLodging=(p:Property)=>p.kind==='hotel'||p.kind==='apartments';
export const roomsPerFloor=(p:Property)=>p.kind==='hotel'?4:3;
export const maxFloors=(p:Property)=>p.kind==='hotel'?5:10;
export const roomTypes=(p:Property):{id:RoomType;name:string;rate:number;renovation:number;comfort:number}[]=>p.kind==='hotel'?[{id:'standard',name:'Standard',rate:85,renovation:200,comfort:60},{id:'double',name:'Double',rate:110,renovation:450,comfort:70},{id:'family',name:'Family',rate:140,renovation:750,comfort:80},{id:'business',name:'Business',rate:155,renovation:950,comfort:84},{id:'premium',name:'Premium',rate:180,renovation:1150,comfort:90},{id:'suite',name:'Suite',rate:210,renovation:1400,comfort:95}]:[{id:'studio',name:'Studio',rate:180,renovation:250,comfort:60},{id:'onebed',name:'One bedroom',rate:240,renovation:600,comfort:72},{id:'twobed',name:'Two bedrooms',rate:340,renovation:1000,comfort:84},{id:'penthouse',name:'Penthouse',rate:500,renovation:1900,comfort:98}];
export function newLodgingUnit(p:Property):VenueUnit{return{occupied:false,dirty:false,remaining:0,seed:0,rentWeek:0,type:roomTypes(p)[0].id,rate:roomTypes(p)[0].rate,condition:100,cleanliness:100,level:1,...(p.kind==='hotel'?{linenReady:true,linen:{'stock-0':[{qty:1,costPerUnit:0,condition:100}],'stock-3':[{qty:1,costPerUnit:0,condition:100}]}}:{})};}
export function ensureLodging(p:Property,b:Business,week=1):Business{
 if(!isLodging(p)||!b.venue||b.lodging)return b;
 const units=b.venue.units.map((u,i)=>({...newLodgingUnit(p),...u,type:u.type??(p.kind==='hotel'?(i%4===3?'suite':'standard'):(i>=3?'onebed':'studio')),rate:u.rate??b.menu?.[u.type??(p.kind==='hotel'?(i%4===3?'suite':'standard'):(i>=3?'onebed':'studio'))]?.price??u.rent??(p.kind==='hotel'?(i%4===3?125:85):(i>=3?240:180))}));
 // Legacy saves retain every occupied unit and all earned progress. New buildings start with one floor.
 const lodging:LodgingState={version:1,openFloors:Math.max(1,Math.ceil(units.length/roomsPerFloor(p))),reputation:75,bookings:[],issues:[],facilities:[],shifts:{service:'all',care:'all',maintenance:'all'},targets:{},nextBooking:1,lastBookingDay:-1,lastIssueDay:-1,occupiedSeconds:0,availableSeconds:0,roomRevenue:0,roomNights:0};
 units.forEach((u,i)=>{if(!u.occupied)return;const id=lodging.nextBooking++,now=(week-1)*180+b.venue!.clock;u.bookingId=id;u.checkoutAt=now+(p.kind==='hotel'?Math.max(1,u.remaining):6*180);lodging.bookings.push({id,name:`Existing ${p.kind==='hotel'?'guest':'tenant'} ${i+1}`,type:u.type!,rate:u.rent??u.rate!,nights:1,arrival:now,status:'staying',kind:'booking',unit:i,departure:u.checkoutAt,leaseEnd:p.kind==='apartments'?week+6:undefined});});
 const inventory=Object.fromEntries(businessSupplies(p,b).map(i=>[i.id,i.quantity]));
 return{...b,inventory,stock:Math.min(...Object.values(inventory)),lodging,venue:{...b.venue,units}};
}
export const absoluteTime=(week:number,clock:number)=>(week-1)*180+clock;
export const lodgingClock=(b:Business)=>worldTime((b.venue?.clock??0)/1.8);
export function shiftActive(b:Business,role:string){const h=lodgingClock(b).hours,shift=b.lodging?.shifts[role]??'all';return shift==='all'||(shift==='morning'?h>=6&&h<14:shift==='afternoon'?h>=14&&h<22:h>=22||h<6);}
export const staffCount=(p:Property,b:Business,role:string,zone=-1)=>crewPower(ensureCrew(p,b),role,lodgingClock(b).hours,(['service','care'].includes(role)?1:0)+(b.hires?.[role]??0),zone);
export const ROOM_REPAIR_COST=15;
export const ROOM_REPAIR_SUPPLIES=2;
export const roomNeedsRepair=(b:Business,index:number)=>(b.venue?.units[index]?.condition??100)<65||!!b.lodging?.issues.some(i=>i.unit===index&&i.kind==='repair'&&!i.resolved);
export function repairRequirements(p:Property,b:Business,index:number){const issue=b.lodging?.issues.find(i=>i.unit===index&&i.kind==='repair'&&!i.resolved);return {[p.kind==='hotel'?'stock-5':'stock-0']:2,...(p.kind==='apartments'&&issue?.supplyId?{[issue.supplyId]:1}:{})};}
export const repairSupply=(p:Property,b:Business)=>businessSupplies(p,b).find(i=>i.id===(p.kind==='hotel'?'stock-5':'stock-0'))!;
export function roomRepairBlocker(p:Property,b:Business,index:number):string|null{
 const unit=b.venue?.units[index];if(!unit)return 'Room unavailable.';
 if((unit.condition??100)>=100&&!roomNeedsRepair(b,index))return 'No repairs needed.';
 if(b.cash<ROOM_REPAIR_COST)return `Needs $${ROOM_REPAIR_COST} in this business’s account.`;
 const required=repairRequirements(p,b,index),supply=businessSupplies(p,b).find(i=>i.quantity<(required[i.id]??0));if(supply)return `Needs ${required[supply.id]} ${supply.name.toLowerCase()} · ${supply.quantity} in stock. Order more in Inventory.`;
 return null;
}
export function lodgingRepairStatus(p:Property,b:Business):string{
 const jobs=b.venue?.units.map((_,i)=>i).filter(i=>roomNeedsRepair(b,i))??[];
 if(!jobs.length)return 'No urgent repairs. Staff repair reported faults or rooms below 65% condition; you can repair wear manually at any time.';
 const roles=p.kind==='apartments'?['care','maintenance']:['maintenance'];
 if(!roles.some(role=>staffCount(p,b,role)>0))return 'Hire a maintenance worker for automatic repairs. Housekeepers clean rooms; you can still repair manually.';
 if(!b.venue?.running)return 'Staff repairs resume when you start the week. You can repair manually before opening.';
 if(!roles.some(role=>staffCount(p,b,role)>0&&shiftActive(b,role)))return 'Repair staff are off shift. Change their shift in Staff, or repair manually.';
 const blocked=roomRepairBlocker(p,b,jobs[0]);if(blocked)return `Staff waiting: ${blocked}`;
 return `${jobs.length} repair${jobs.length===1?'':'s'} queued · staff work while the game is running. Each job uses $${ROOM_REPAIR_COST} and ${ROOM_REPAIR_SUPPLIES} ${repairSupply(p,b).name.toLowerCase()}.`;
}
export const unitReady=(u:VenueUnit)=>!u.occupied&&!u.dirty&&(u.condition??100)>=65&&u.linenReady!==false;
export const roomLabel=(p:Property,i:number)=>`${p.kind==='hotel'?'Room':'Home'} ${Math.floor(i/roomsPerFloor(p))+1}${String(i%roomsPerFloor(p)+1).padStart(2,'0')}`;
export const nextFloorCost=(p:Property,b:Business)=>(p.kind==='hotel'?3000:2400)*((b.lodging?.openFloors??1)+1);
export const floorMilestone=(b:Business)=>b.venue?.units.length??4*(b.lodging?.openFloors??1);
export const lodgingMetrics=(b:Business,p?:Property)=>{const l=b.lodging!,units=b.venue?.units??[],nights=l.earnedRoomNights??l.roomNights,days=Math.max(1/24,(b.venue?.clock??0)/(180/7));return {occupancy:units.length?units.filter(u=>u.occupied).length/units.length*100:0,weeklyOccupancy:p?.kind==='hotel'?hotelWeeklyOccupancy(b):l.availableSeconds?l.occupiedSeconds/l.availableSeconds*100:0,averageRate:nights?l.roomRevenue/nights:0,revpar:units.length?l.roomRevenue/(units.length*days):0,laborPerNight:nights?(b.venue?.week.wages??0)/nights:0,cleanliness:units.length?units.reduce((n,u)=>n+(u.cleanliness??100),0)/units.length:100,complaints:l.issues.filter(i=>!i.resolved||i.resolved.toLowerCase().includes('unresolved')).length,reviews:l.bookings.filter(v=>v.review!==undefined).length};};
export const FACILITIES=[
 {id:'restaurant',name:'Breakfast service',cost:2600,floor:2,upkeep:20,description:'A breakfast buffet in the shared wing. One refreshment portion per occupied room each morning; included in the room rate.'},
 {id:'conference',name:'Business & meeting lounge',cost:3200,floor:3,upkeep:25,description:'Work desks and a meeting table in the shared wing; encourages two-room group reservations.'},
 {id:'laundry',name:'Laundry room',cost:2400,floor:3,upkeep:15,description:'Washers, folding counter and linen storage. Requires a laundry attendant; each attendant handles 20 pieces per morning.'},
 {id:'gym',name:'Gym & wellness',cost:1800,floor:4,upkeep:20,description:'A dedicated exercise area in the shared wing adds comfort to stays.'},
 {id:'rooftop',name:'Rooftop lounge',cost:4500,floor:5,upkeep:30,description:'A premium sitting lounge with planted terraces; adds comfort and visitor appeal.'},
];
export const lodgingFacilities=(p:Property)=>p.kind==='hotel'?FACILITIES:APARTMENT_FACILITIES;
export const hotelWeeklyUpkeep=(b:Business)=>FACILITIES.filter(f=>b.lodging?.facilities.includes(f.id)).reduce((n,f)=>n+f.upkeep,0);
export function roomReadiness(b:Business,index:number){const u=b.venue!.units[index];return [
 {label:'Vacant',met:!u.occupied},{label:'Clean',met:!u.dirty},{label:'Repaired',met:!roomNeedsRepair(b,index)},
 {label:'Fresh linen ready',met:u.linenReady!==false},{label:'No reservation conflict',met:!b.lodging?.bookings.some(v=>v.unit===index&&['reserved','waiting'].includes(v.status))}];}
export function lodgingEntry(b:Business,state:Pick<ExpansionState,'week'|'day'>,label:string,amount:number,category:'revenue'|'maintenance'|'upgrades'|'hiring'='revenue'):Business{return{...b,cash:b.cash+amount,books:b.books?{...b.books,[category]:b.books[category]+(category==='revenue'?amount:-amount)}:undefined,ledger:[...b.ledger,{week:state.week,day:state.day,label,amount}].slice(-60)};}
export function useLodgingSupplies(p:Property,b:Business,required:Record<string,number>):Business|null{return consumeBusinessSupplies(p,b,required);}
export type LodgingAction={type:'floor'}|{type:'rate';unit:number;rate:number}|{type:'renovate';unit:number;roomType:RoomType}|{type:'repair'|'clean';unit:number}|{type:'facility';id:string}|{type:'shift';role:string;shift:StaffShift}|{type:'target';id:string;value:number}|{type:'issue';id:number;choice:'help'|'refund'|'move'}|{type:'cancel';id:number}|{type:'laundry';mode:'outsourced'|'inhouse'}|{type:'leaseTerms';weeks:6|12|24;depositWeeks:0|1}|{type:'finish';unit:number}|{type:'furnish';unit:number;package:FurnishingPackage}|{type:'renew';id:number;rate:number;weeks:6|12|24};
export function manageLodging(state:ExpansionState,id:string,action:LodgingAction):ExpansionState{
 const p=propertyById(id),old=state.businesses[id];if(!p||!old||!isLodging(p))return state;
 let b=ensureLodging(p,old);if(!b.lodging||!b.venue)return state;
 let l={...b.lodging},units=[...b.venue.units],cost=0,category:'maintenance'|'upgrades'='maintenance',label='';
 const refuse=(message:string)=>({...state,notice:`${p.name}: ${message}`});
 if(action.type==='floor'){
  if(l.openFloors>=maxFloors(p))return refuse('All floors are open.');
  if(b.venue.running)return refuse('Open the next floor between weeks.');
  if(p.kind==='hotel'&&hotelFloorBlocker(b,state))return refuse(hotelFloorBlocker(b,state)!);
  if(p.kind==='apartments'&&apartmentFloorBlocker(p,b,state))return refuse(apartmentFloorBlocker(p,b,state)!);
  cost=nextFloorCost(p,b);category='upgrades';l.openFloors++;units.push(...Array.from({length:roomsPerFloor(p)},()=>newLodgingUnit(p)));label=`Floor ${l.openFloors} opened`;
 }else if(action.type==='facility'){
  const f=lodgingFacilities(p).find(f=>f.id===action.id);if(!f||l.facilities.includes(f.id))return state;
  if(l.openFloors<f.floor||b.venue.running)return refuse(`Needs ${f.floor} open floors; install between weeks.`);
  cost=f.cost;category='upgrades';l.facilities=[...l.facilities,f.id];label=`${f.name} installed`;
 }else if(action.type==='leaseTerms'){
  if(p.kind!=='apartments'||![6,12,24].includes(action.weeks)||![0,1].includes(action.depositWeeks))return state;
  l.leaseTerm=action.weeks;l.depositWeeks=action.depositWeeks;label='New-lease terms updated; existing offers and leases keep their terms';
 }else if(action.type==='renew'){
  const booking=l.bookings.find(v=>v.id===action.id&&v.status==='staying');if(p.kind!=='apartments'||!booking||booking.renewal||!booking.leaseEnd||booking.leaseEnd>state.week+1)return state;
  const type=roomTypes(p).find(t=>t.id===booking.type)!,base=apartmentRentBase(b,booking.unit!,type.rate);
  if(![6,12,24].includes(action.weeks)||!Number.isFinite(action.rate)||action.rate<base*.5||action.rate>base*3)return refuse('Choose a valid renewal rent and lease length.');
  const accepted=l.reputation>=60&&action.rate<=base*(1+(l.reputation-60)/100);
  l.renewalsOffered=(l.renewalsOffered??0)+1;l.renewalsAccepted=(l.renewalsAccepted??0)+(accepted?1:0);
  l.bookings=l.bookings.map(v=>v.id===booking.id?{...v,renewal:{rate:action.rate,weeks:action.weeks,accepted},noticeGiven:!accepted}:v);
  label=accepted?'Renewal accepted; the new rent starts at the end of the current lease':'Tenant declined the renewal and will move out at lease end';
 }else if(action.type==='laundry'){
  if(p.kind!=='hotel'||!['outsourced','inhouse'].includes(action.mode))return state;
  if(action.mode==='inhouse'&&!l.facilities.includes('laundry'))return refuse('Build the Floor 3 laundry room first.');
  l.laundryMode=action.mode;label='Laundry service updated';
 }else if(action.type==='shift'){
  if(!['service','care','maintenance','concierge','laundry','cleaner','supervisor'].includes(action.role)||!['all','morning','afternoon','evening'].includes(action.shift))return state;
  l.shifts={...l.shifts,[action.role]:action.shift};label='Staff shift updated';
 }else if(action.type==='target'){
  if(!businessSupplies(p,b).some(i=>i.id===action.id)||!Number.isFinite(action.value))return state;
  l.targets={...l.targets,[action.id]:Math.max(0,Math.min(80,action.value))};label='Minimum stock target updated';
 }else if(action.type==='cancel'){
  const booking=l.bookings.find(v=>v.id===action.id);if(!booking||!['reserved','waiting'].includes(booking.status))return state;
  const ids=l.bookings.filter(v=>v.id===booking.id||(booking.groupId&&v.groupId===booking.groupId&&['reserved','waiting'].includes(v.status))).map(v=>v.id);
  l.bookings=l.bookings.map(v=>ids.includes(v.id)?{...v,status:'cancelled'}:v);b={...b,venue:{...b.venue,visitors:b.venue.visitors.filter(v=>!ids.includes(v.bookingId??-1))}};l.reputation=Math.max(0,l.reputation-1);label='Reservation cancelled; no payment had been collected';
 }else if(action.type==='issue'){
  const issue=l.issues.find(i=>i.id===action.id&&!i.resolved);if(!issue)return state;
  const unit=units[issue.unit];if(!unit)return state;
  if(action.choice==='refund'){
   const refund=Math.round((unit.rent??unit.rate??85)*.25);if(b.cash<refund)return refuse('Not enough cash for the 25% refund.');
   b=lodgingEntry(b,state,'Guest / tenant goodwill refund',-refund);b={...b,venue:{...b.venue!,week:{...b.venue!.week,revenue:b.venue!.week.revenue-refund},totalRevenue:b.venue!.totalRevenue-refund}};l.roomRevenue-=refund;l.roomEarnings={...l.roomEarnings,[issue.unit]:(l.roomEarnings?.[issue.unit]??0)-refund};l.reputation=Math.min(100,l.reputation+2);
  }else if(action.choice==='move'){
   const next=units.findIndex((u,i)=>i!==issue.unit&&unitReady(u)&&!l.bookings.some(v=>v.unit===i&&['reserved','waiting'].includes(v.status))&&(u.rate??0)>=(unit.rate??0));if(next<0)return refuse('No ready room of equal or better quality.');
   units[next]={...units[next],occupied:true,remaining:unit.remaining,seed:unit.seed,rentWeek:unit.rentWeek,rent:unit.rent,bookingId:unit.bookingId,checkoutAt:unit.checkoutAt,leaseEnd:unit.leaseEnd};units[issue.unit]={...unit,occupied:false,dirty:true,bookingId:undefined};
   l.bookings=l.bookings.map(v=>v.unit===issue.unit&&v.status==='staying'?{...v,unit:next}:v);b={...b,venue:{...b.venue,visitors:b.venue.visitors.map(v=>v.unit===issue.unit?{...v,unit:next}:v)}};l.reputation=Math.min(100,l.reputation+4);
  }else{
   const supplied=useLodgingSupplies(p,b,{...(issue.kind==='repair'?repairRequirements(p,b,issue.unit):{}),[p.kind==='hotel'?'stock-4':'stock-1']:issue.kind==='service'?1:0});if(!supplied)return refuse('Order the required supplies first.');b=supplied;
   cost=issue.kind==='repair'?15:issue.kind==='noise'?5:3;units[issue.unit]={...unit,condition:Math.min(100,(unit.condition??100)+30)};l.reputation=Math.min(100,l.reputation+3);
  }
  l.issues=l.issues.map(i=>i.id===issue.id?{...i,resolved:action.choice}:i);label=`${roomLabel(p,issue.unit)} request resolved`;
 }else{
  const u=units[action.unit];if(!u)return state;
  if(action.type==='finish'){
   if(p.kind!=='apartments'||u.premiumFinish)return state;
   if(l.openFloors<8)return refuse('Premium fittings unlock with Floor 8.');
   if(u.occupied||l.bookings.some(v=>v.unit===action.unit&&['reserved','waiting'].includes(v.status)))return refuse('Refurbish between tenancies.');
   cost=650;category='upgrades';units[action.unit]={...u,premiumFinish:true,condition:100,rate:Math.round((u.rate??180)*1.12)};label=`${roomLabel(p,action.unit)} premium fittings installed`;
  }else if(action.type==='furnish'){
   if(p.kind!=='apartments')return state;const pack=FURNISHING_PACKAGES.find(f=>f.id===action.package);if(!pack)return state;
   if((u.furnishing??'furnished')===pack.id)return state;
   if(u.occupied||l.bookings.some(v=>v.unit===action.unit&&['reserved','waiting'].includes(v.status)))return refuse('Change furnishing only when the home and its reservations are vacant.');
   cost=pack.cost;category='upgrades';const base=roomTypes(p).find(t=>t.id===u.type)!.rate;units[action.unit]={...u,furnishing:pack.id,rate:Math.round(base*pack.rent*(u.premiumFinish?1.12:1))};label=`${roomLabel(p,action.unit)} ${pack.name.toLowerCase()} package installed`;
  }else if(action.type==='rate'){
   const type=roomTypes(p).find(t=>t.id===u.type)??roomTypes(p)[0],base=p.kind==='apartments'?apartmentRentBase(b,action.unit,type.rate):type.rate;if(!Number.isFinite(action.rate)||action.rate<base*.5||action.rate>base*3)return refuse('Rate must be between 50% and 300% of the room’s base rate.');
   units[action.unit]={...u,rate:action.rate};label='Rate updated for new bookings; agreed rates stay fixed';
  }else if(action.type==='renovate'){
   const type=roomTypes(p).find(t=>t.id===action.roomType);if(!type)return state;
   if(p.kind==='apartments'&&!apartmentTypeUnlocked(b,type.id,action.unit))return refuse('Unlock the required residential floor. New penthouses belong on Floor 10.');
   if(p.kind==='hotel'&&!roomTypeUnlocked(b,type.id))return refuse('Open the required guest floor to unlock this room type.');
   if((u.type??roomTypes(p)[0].id)===type.id)return refuse(`${type.name} is already installed. No charge was made.`);
   if(u.occupied||l.bookings.some(v=>v.unit===action.unit&&['reserved','waiting'].includes(v.status)))return refuse('Wait until this room and its reservations are clear.');
   cost=type.renovation;category='upgrades';units[action.unit]={...u,type:type.id,rate:p.kind==='apartments'?Math.round(apartmentRentBase(b,action.unit,type.rate)):type.rate,condition:100,cleanliness:100,dirty:false,level:Math.min(5,(u.level??1)+1)};label=`${roomLabel(p,action.unit)} renovated to ${type.name}`;
  }else if(action.type==='clean'){
   if(p.kind==='hotel'&&u.occupied)return refuse('The guest is still in this room.');
   if(!u.dirty&&(u.cleanliness??100)>=100&&u.linenReady!==false)return state;
   const supplied=p.kind==='hotel'?prepareHotelRoom(b,action.unit):useLodgingSupplies(p,b,{'stock-1':2});if(!supplied)return refuse('Need linen, towels and cleaning products.');b=supplied;units[action.unit]={...(p.kind==='hotel'?supplied.venue!.units[action.unit]:u),dirty:false,cleanliness:100,linenReady:true};label=`${roomLabel(p,action.unit)} cleaned`;
  }else{
   const blocked=roomRepairBlocker(p,b,action.unit);if(blocked)return refuse(blocked);
   const supplied=useLodgingSupplies(p,b,repairRequirements(p,b,action.unit));if(!supplied)return refuse('Need repair supplies.');b=supplied;cost=ROOM_REPAIR_COST;units[action.unit]={...u,condition:100};l.issues=l.issues.map(i=>i.unit===action.unit&&i.kind==='repair'&&!i.resolved?{...i,resolved:'Repaired'}:i);label=`${roomLabel(p,action.unit)} repaired`;
  }
 }
 if(b.cash<cost)return refuse(`Needs $${cost}; earn more or arrange a business loan.`);
 b={...b,lodging:l,venue:{...b.venue!,units}};if(cost)b=lodgingEntry(b,state,label,-cost,category);
 return {...state,businesses:{...state.businesses,[id]:b},notice:`${p.name}: ${label}.`};
}
