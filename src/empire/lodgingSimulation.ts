import {Business,businessSupplies,businessWages,Property} from '../prototype/expansionModel';
import {absoluteTime,ensureLodging,isLodging,lodgingClock,lodgingEntry,LodgingBooking,manageLodging,roomNeedsRepair,roomTypes,shiftActive,staffCount,unitReady,useLodgingSupplies} from './lodging';
import type {VenueVisitor} from './venueSimulation';
const DAY=180/7;
const bookingRoom=(b:Business,person:VenueVisitor)=>{const booking=b.lodging?.bookings.find(v=>v.id===person.bookingId);return b.venue!.units.findIndex((u,i)=>unitReady(u)&&(booking?.unit===undefined||i===booking.unit)&&(!person.offerId||u.type===person.offerId)&&!b.lodging?.bookings.some(other=>other.id!==booking?.id&&other.unit===i&&['reserved','waiting'].includes(other.status)));};
export function lodgingBlocker(p:Property,b:Business,id?:number):string|null{
 if(!b.venue?.running)return 'Start the week to welcome visitors';
 const person=b.venue.visitors.find(v=>v.state==='waiting'&&(id===undefined||v.id===id));if(!person)return 'Waiting for arrivals';
 if(bookingRoom(b,person)<0)return 'No suitable ready unit · clean, repair or change the booking';
 if(businessSupplies(p,b).some(i=>i.quantity<(p.kind==='hotel'?({'stock-1':1,'stock-4':1}[i.id]??0):({'stock-1':1,'stock-2':1}[i.id]??0))))return 'Order supplies to continue';
 return null;
}
export function serveLodging(p:Property,b:Business,week:number,day:number,id?:number):Business{
 if(lodgingBlocker(p,b,id))return b;
 const person=b.venue!.visitors.find(v=>v.state==='waiting'&&(id===undefined||v.id===id))!,index=bookingRoom(b,person),unit=b.venue!.units[index],l=b.lodging!;
 const reserved=l.bookings.find(v=>v.id===person.bookingId),rate=reserved?.rate??person.agreedRate??unit.rate??85,nights=reserved?.nights??1;
 const supplied=useLodgingSupplies(p,b,p.kind==='hotel'?{'stock-1':1,'stock-4':1}:{'stock-1':1,'stock-2':1});if(!supplied)return b;
 const now=absoluteTime(week,b.venue!.clock),hours=lodgingClock(b).hours;
 const departure=p.kind==='hotel'?now+((11-hours+24)%24)/24*DAY+(nights-1)*DAY:now+6*180;
 const booking:LodgingBooking=reserved??{id:l.nextBooking,name:`${p.kind==='hotel'?'Guest':'Tenant'} ${person.id}`,type:unit.type!,rate,nights,arrival:now,status:'waiting',kind:'walk-in'};
 const sale=rate*(p.kind==='hotel'?nights:1),duration=departure-now;
 const next={...supplied,lodging:{...l,nextBooking:reserved?l.nextBooking:l.nextBooking+1,bookings:[...l.bookings.filter(v=>v.id!==booking.id),{...booking,status:'staying' as const,unit:index,departure,leaseEnd:p.kind==='apartments'?week+6:undefined}],roomRevenue:l.roomRevenue+sale,roomNights:l.roomNights+(p.kind==='hotel'?nights:1)},venue:{...b.venue!,visitors:b.venue!.visitors.map(v=>v.id===person.id?{...v,state:'using' as const,unit:index,bookingId:booking.id,remaining:duration}:v),units:b.venue!.units.map((u,i)=>i===index?{...u,occupied:true,remaining:duration,seed:person.seed,rentWeek:week,rent:rate,bookingId:booking.id,checkoutAt:departure,leaseEnd:week+6}:u),week:{...b.venue!.week,served:b.venue!.week.served+1,revenue:b.venue!.week.revenue+sale},totalServed:b.venue!.totalServed+1,totalRevenue:b.venue!.totalRevenue+sale}};
 return lodgingEntry(next,{week,day},`${p.kind==='hotel'?'Check-in':'Lease signed'} · ${booking.name}`,sale);
}
export function advanceLodging(p:Property,b:Business,delta:number,week:number,day:number,demand=1):Business{
 if(!b.venue?.running||delta<=0||!b.lodging)return b;
 const dt=Math.min(delta,180-b.venue.clock);if(dt<=0)return b;
 let v={...b.venue,clock:b.venue.clock+dt,serviceTimer:b.venue.serviceTimer+dt,careTimer:b.venue.careTimer+dt,arrivalTimer:b.venue.arrivalTimer-dt*demand,units:b.venue.units.map(u=>({...u})),visitors:b.venue.visitors.map(v=>({...v})),week:{...b.venue.week,wages:b.venue.week.wages+businessWages(p,b)*dt/180}},l={...b.lodging,bookings:b.lodging.bookings.map(v=>({...v})),issues:b.lodging.issues.map(i=>({...i})),occupiedSeconds:b.lodging.occupiedSeconds+b.venue.units.filter(u=>u.occupied).length*dt,availableSeconds:b.lodging.availableSeconds+b.venue.units.length*dt};
 const now=absoluteTime(week,v.clock),clock=lodgingClock({...b,venue:v}),globalDay=Math.floor(now/DAY),isHotel=p.kind==='hotel';
 // Overnight stays finish in the morning; a checked-out unit is never immediately resold.
 v.units.forEach((u,i)=>{
  if(!u.occupied)return;
  u.cleanliness=Math.max(0,(u.cleanliness??100)-dt*(isHotel?.35:.1));u.condition=Math.max(0,(u.condition??100)-dt*.08);if(!isHotel&&(u.cleanliness??100)<45)u.dirty=true;
  if(!u.checkoutAt)u.checkoutAt=isHotel?now+Math.max(1,u.remaining):now+6*180;
  u.remaining=Math.max(0,u.checkoutAt-now);
  if(now<u.checkoutAt)return;
  const booking=l.bookings.find(v=>v.id===u.bookingId),base=roomTypes(p).find(t=>t.id===u.type)??roomTypes(p)[0];
  const unresolved=l.issues.filter(issue=>issue.unit===i&&!issue.resolved).length;
  const review=Math.max(1,Math.min(5,Math.round(((u.condition??100)*.22+(u.cleanliness??100)*.15+(base.comfort+((u.level??1)-1)*3)*.3+28+l.facilities.length*3-Math.max(0,(u.rent??base.rate)/base.rate-1)*20-unresolved*15)/20*10)/10));
  l.reputation=Math.max(0,Math.min(100,l.reputation*.9+review*20*.1));
  if(booking){booking.status='completed';booking.review=review;}
  l.issues.forEach(issue=>{if(issue.unit===i&&!issue.resolved)issue.resolved='Unresolved at checkout';});
  v.visitors=v.visitors.map(person=>person.unit===i?{...person,state:'leaving',remaining:4}:person);
  Object.assign(u,{occupied:false,dirty:true,remaining:0,bookingId:undefined,checkoutAt:undefined});
 });
 v.visitors=v.visitors.flatMap(person=>{
  if(person.state==='waiting'){
   if(person.patience<=dt){v.week.lost++;l.reputation=Math.max(0,l.reputation-.5);const booking=l.bookings.find(v=>v.id===person.bookingId);if(booking)booking.status='cancelled';return [];}
   person.patience-=dt;
  }else if(person.state==='leaving'){person.remaining-=dt;if(person.remaining<=0)return [];}
  else person.remaining=Math.max(0,person.remaining-dt);
  return[person];
 });
 // A booked rate is captured now, before arrival; later rate edits cannot change it.
 if(l.lastBookingDay!==globalDay&&clock.hours>=8&&clock.hours<12){
  l.lastBookingDay=globalDay;
  const candidates=v.units.map((u,i)=>({u,i})).filter(({u,i})=>unitReady(u)&&!l.bookings.some(v=>v.unit===i&&['reserved','waiting'].includes(v.status)));
  const selected=candidates[globalDay%Math.max(1,candidates.length)];
  if(selected){const {u,i}=selected,base=roomTypes(p).find(t=>t.id===u.type)!;if((globalDay*37%100)/100<Math.min(1,demand)*Math.exp(-2.5*Math.max(0,(u.rate??base.rate)/base.rate-1))){
   const kind=globalDay%4===0&&['double','family','suite','onebed','twobed','penthouse'].includes(u.type??'')?'family':globalDay%5===0?'group':'booking';
   const rate=Math.round((u.rate??base.rate)*(kind==='group'?.9:1));
   l.bookings.push({id:l.nextBooking++,name:`${isHotel?'Guest':'Applicant'} ${week}-${globalDay+1}`,type:u.type!,rate,nights:kind==='family'?2:1,arrival:now+(kind==='family'?1:(14-clock.hours)/24*DAY),unit:i,status:'reserved',kind});
  }}
 }
 for(const booking of l.bookings.filter(v=>v.status==='reserved'&&v.arrival<=now)){
  if(v.visitors.filter(p=>p.state==='waiting').length>=6)break;
  booking.status='waiting';v.serial++;v.visitors.push({id:v.serial,seed:v.serial*17,state:'waiting',patience:32,remaining:0,unit:null,bookingId:booking.id,offerId:booking.type,agreedRate:booking.rate});
 }
 if(v.arrivalTimer<=0){
  v.arrivalTimer=Math.max(4,12/(1+l.facilities.length*.1+l.reputation/200));
  if(clock.hours>=12&&clock.hours<21&&v.clock<174&&v.visitors.filter(v=>v.state==='waiting').length<6){
   const candidates=v.units.map((u,i)=>({u,i})).filter(({u,i})=>unitReady(u)&&!l.bookings.some(v=>v.unit===i&&['reserved','waiting'].includes(v.status)));
   const item=candidates[(v.serial+1)%Math.max(1,candidates.length)];if(item){const base=roomTypes(p).find(t=>t.id===item.u.type)!;v.serial++;if((v.serial*37%100)/100<Math.exp(-2.5*Math.max(0,(item.u.rate??base.rate)/base.rate-1))){v.visitors.push({id:v.serial,seed:v.serial*17,state:'waiting',patience:32,remaining:0,unit:null,offerId:item.u.type,agreedRate:item.u.rate});}}
  }
 }
 // Evenings bring service requests; ignoring them affects the next review.
 if(l.lastIssueDay!==globalDay&&clock.hours>=18&&clock.hours<23){
  l.lastIssueDay=globalDay;const occupied=v.units.map((u,i)=>({u,i})).filter(x=>x.u.occupied),target=occupied[globalDay%Math.max(1,occupied.length)];
  if(target){const kind=(['service','noise','repair'] as const)[globalDay%3];l.issues.push({id:globalDay+1,unit:target.i,kind,description:kind==='repair'?'A plumbing fault needs repair.':kind==='noise'?'Noise from the corridor is disturbing the occupant.':isHotel?'The guest requested refreshments and assistance.':'The tenant requested shared-area cleaning.',deadline:now+DAY});if(kind==='repair')target.u.condition=Math.max(0,(target.u.condition??100)-40);}
 }
 for(const issue of l.issues)if(!issue.resolved&&issue.deadline<=now){issue.resolved='unresolved at deadline';l.reputation=Math.max(0,l.reputation-6);}
 l.bookings=l.bookings.filter(v=>!['completed','cancelled'].includes(v.status)||now-v.arrival<180*3).slice(-200);l.issues=l.issues.slice(-80);
 let next:Business={...b,lodging:l,venue:v,books:b.books?{...b.books,wagesAccrued:b.books.wagesAccrued+businessWages(p,b)*dt/180}:undefined};
 if(shiftActive(next,'service')&&v.serviceTimer>=10/staffCount(p,next,'service')){const ready=next.venue!.visitors.find(person=>person.state==='waiting'&&!lodgingBlocker(p,next,person.id));if(ready)next=serveLodging(p,next,week,day,ready.id);next={...next,venue:{...next.venue!,serviceTimer:0}};}
 const action=(type:'clean'|'repair',unit:number)=>{const state={week,day,businesses:{[p.id]:next},loans:[],payroll:[],report:[],notice:''};next=manageLodging(state,p.id,{type,unit}).businesses[p.id];};
 if(shiftActive(next,'care')&&v.careTimer>=12/staffCount(p,next,'care')){
  const index=next.venue!.units.findIndex((u,i)=>isHotel?u.dirty&&!u.occupied:u.dirty||roomNeedsRepair(next,i));if(index>=0)action(next.venue!.units[index].dirty?'clean':'repair',index);
  next={...next,venue:{...next.venue!,careTimer:0}};
 }
 const repairInterval=10/Math.max(1,staffCount(p,next,'maintenance'));
 if(staffCount(p,next,'maintenance')&&shiftActive(next,'maintenance')&&Math.floor(b.venue.clock/repairInterval)!==Math.floor(v.clock/repairInterval)){
  const index=next.venue!.units.findIndex((_,i)=>roomNeedsRepair(next,i));if(index>=0)action('repair',index);
 }
 if(l.facilities.includes('restaurant')&&clock.hours>=8&&clock.hours<10&&Math.floor(b.venue.clock/DAY)!==Math.floor(v.clock/DAY)){
  const supplied=useLodgingSupplies(p,next,{[isHotel?'stock-4':'stock-1']:next.venue!.units.filter(u=>u.occupied).length});if(supplied)next={...supplied,lodging:{...next.lodging!,reputation:Math.min(100,next.lodging!.reputation+1)}};
 }
 return next;
}
