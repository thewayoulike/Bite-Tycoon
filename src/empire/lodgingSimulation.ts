import {householdPayment,prepareHouseholds} from '../career/services';
import {apartmentTerm,tenantDepositWeeks,apartmentUpkeep,apartmentRentBase} from './apartments';
import {hotelCompletedNights} from './hotelProgression';
import {stripHotelLinen} from './hotelLaundry';
import {Business,businessSupplies,businessWages,Property} from '../prototype/expansionModel';
import {absoluteTime,ensureLodging,isLodging,lodgingClock,lodgingEntry,LodgingBooking,manageLodging,roomNeedsRepair,roomTypes,shiftActive,staffCount,unitReady,useLodgingSupplies,hotelWeeklyUpkeep} from './lodging';
import type {VenueVisitor} from './venueSimulation';
const DAY=180/7;
const bookingRoom=(b:Business,person:VenueVisitor)=>{const booking=b.lodging?.bookings.find(v=>v.id===person.bookingId);return b.venue!.units.findIndex((u,i)=>unitReady(u)&&(booking?.unit===undefined||i===booking.unit)&&(!person.offerId||u.type===person.offerId)&&!b.lodging?.bookings.some(other=>other.id!==booking?.id&&other.unit===i&&['reserved','waiting'].includes(other.status)));};
export function lodgingBlocker(p:Property,b:Business,id?:number):string|null{
 if(!b.venue?.running)return 'Start the week to welcome visitors';
 const person=b.venue.visitors.find(v=>v.state==='waiting'&&(id===undefined||v.id===id));if(!person)return 'Waiting for arrivals';
 const booking=b.lodging?.bookings.find(v=>v.id===person.bookingId),group=booking?.groupId?b.lodging!.bookings.filter(v=>v.groupId===booking.groupId&&['reserved','waiting'].includes(v.status)):[];
 if(group.length&&group.some(v=>v.status!=='waiting'||!b.venue!.visitors.some(person=>person.bookingId===v.id)))return 'Waiting for the rest of the group';
 if(group.some(v=>{const guest=b.venue!.visitors.find(person=>person.bookingId===v.id);return !guest||bookingRoom(b,guest)<0;}))return 'Group needs all its reserved rooms ready together';
 if(bookingRoom(b,person)<0)return 'No suitable ready unit · clean, repair or change the booking';
 if(businessSupplies(p,b).some(i=>i.quantity<Math.max(1,group.length)*(p.kind==='hotel'?({'stock-1':1,'stock-4':1}[i.id]??0):({'stock-1':1,'stock-2':1}[i.id]??0))))return 'Order supplies to continue';
 return null;
}
export function serveLodging(p:Property,b:Business,week:number,day:number,id?:number,single=false):Business{
 if(lodgingBlocker(p,b,id))return b;
 const person=b.venue!.visitors.find(v=>v.state==='waiting'&&(id===undefined||v.id===id))!,index=bookingRoom(b,person),unit=b.venue!.units[index],l=b.lodging!;
 const groupId=l.bookings.find(v=>v.id===person.bookingId)?.groupId;
 if(groupId&&!single){const guests=b.venue!.visitors.filter(v=>v.state==='waiting'&&l.bookings.some(k=>k.id===v.bookingId&&k.groupId===groupId));return guests.reduce((next,guest)=>serveLodging(p,next,week,day,guest.id,true),b);}
 const reserved=l.bookings.find(v=>v.id===person.bookingId),rate=reserved?.rate??person.agreedRate??unit.rate??85,nights=reserved?.nights??1;
 const supplied=useLodgingSupplies(p,b,p.kind==='hotel'?{'stock-1':1,'stock-4':1}:{'stock-1':1,'stock-2':1});if(!supplied)return b;
 const now=absoluteTime(week,b.venue!.clock),hours=lodgingClock(b).hours;
 const leaseWeeks=reserved?.leaseWeeks??apartmentTerm(b),depositWeeks=reserved?.depositWeeks??tenantDepositWeeks(b);
 const departure=p.kind==='hotel'?now+((11-hours+24)%24)/24*DAY+(nights-1)*DAY:now+leaseWeeks*180;
 const booking:LodgingBooking=reserved??{id:l.nextBooking,name:`${p.kind==='hotel'?'Guest':'Tenant'} ${person.id}`,type:unit.type!,rate,nights,arrival:now,status:'waiting',kind:'walk-in'};
 const sale=rate*(p.kind==='hotel'?nights:1),duration=departure-now;
 const next={...supplied,lodging:{...l,nextBooking:reserved?l.nextBooking:l.nextBooking+1,bookings:[...l.bookings.filter(v=>v.id!==booking.id),{...booking,status:'staying' as const,unit:index,departure,checkedInAt:now,prepaid:p.kind==='hotel'?sale:undefined,earned:0,deposit:p.kind==='apartments'?rate*depositWeeks:0,leaseWeeks:p.kind==='apartments'?leaseWeeks:undefined,depositWeeks:p.kind==='apartments'?depositWeeks:undefined,rentPaidThrough:p.kind==='apartments'?now+180:undefined,leaseEnd:p.kind==='apartments'?week+leaseWeeks:undefined}],roomRevenue:l.roomRevenue+sale,roomNights:l.roomNights+(p.kind==='hotel'?nights:1)},venue:{...b.venue!,visitors:b.venue!.visitors.map(v=>v.id===person.id?{...v,state:'using' as const,unit:index,bookingId:booking.id,remaining:duration}:v),units:b.venue!.units.map((u,i)=>i===index?{...u,occupied:true,remaining:duration,seed:person.seed,rentWeek:week,rent:rate,bookingId:booking.id,checkoutAt:departure,leaseEnd:week+leaseWeeks}:u),week:{...b.venue!.week,served:b.venue!.week.served+1,revenue:b.venue!.week.revenue+sale},totalServed:b.venue!.totalServed+1,totalRevenue:b.venue!.totalRevenue+sale}};
 const received=lodgingEntry(next,{week,day},(p.kind==='hotel'?'Stay paid in advance · ':'Lease signed · ')+booking.name,sale);
 if(p.kind==='hotel')return {...received,deferredIncome:(b.deferredIncome??0)+sale,books:received.books?{...received.books,revenue:received.books.revenue-sale}:undefined,lodging:{...received.lodging!,roomRevenue:received.lodging!.roomRevenue-sale},venue:{...received.venue!,week:{...received.venue!.week,revenue:received.venue!.week.revenue-sale},totalRevenue:received.venue!.totalRevenue-sale}};
 return {...received,cash:received.cash+rate*depositWeeks,tenantDeposits:(b.tenantDeposits??0)+rate*depositWeeks,lodging:{...received.lodging!,earnedRoomNights:(l.earnedRoomNights??0)+1,rentCollected:(l.rentCollected??0)+rate},ledger:depositWeeks?[...received.ledger,{week,day,label:'Refundable tenant deposit received',amount:rate}].slice(-60):received.ledger};
}
export function advanceLodging(p:Property,b:Business,delta:number,week:number,day:number,demand=1):Business{
 if(!b.venue?.running||delta<=0||!b.lodging)return b;
 if(p.kind==='apartments')b=prepareHouseholds(b,week);
 const dt=Math.min(delta,180-b.venue!.clock);if(dt<=0)return b;
 let v={...b.venue,clock:b.venue.clock+dt,serviceTimer:b.venue.serviceTimer+dt,careTimer:b.venue.careTimer+dt,arrivalTimer:b.venue.arrivalTimer-dt*demand,units:b.venue.units.map(u=>({...u})),visitors:b.venue.visitors.map(v=>({...v})),week:{...b.venue.week,wages:b.venue.week.wages+businessWages(p,b)*dt/180}},l={...b.lodging,homeProgress:{...b.lodging.homeProgress},occupiedHomeWeeks:b.lodging.occupiedHomeWeeks??0,completedNights:hotelCompletedNights(b),earnedRoomNights:b.lodging.earnedRoomNights??0,roomEarnings:{...b.lodging.roomEarnings},bookings:b.lodging.bookings.map(v=>({...v})),issues:b.lodging.issues.map(i=>({...i})),occupiedSeconds:b.lodging.occupiedSeconds+b.venue.units.filter(u=>u.occupied).length*dt,availableSeconds:b.lodging.availableSeconds+b.venue.units.length*dt};
 const now=absoluteTime(week,v.clock),clock=lodgingClock({...b,venue:v}),globalDay=Math.floor(now/DAY),isHotel=p.kind==='hotel';
 const stripped:number[]=[];let renewalRent=0,renewalAccrual=0;
 // Overnight stays finish in the morning; a checked-out unit is never immediately resold.
 v.units.forEach((u,i)=>{
  if(!u.occupied)return;
  if(!isHotel){const lived=Math.min(dt,Math.max(0,(u.checkoutAt??now+dt)-(now-dt)));l.homeProgress[i]=(l.homeProgress[i]??0)+lived;while(l.homeProgress[i]>=180-1e-7){l.occupiedHomeWeeks++;l.homeProgress[i]=Math.max(0,l.homeProgress[i]-180);}}
  u.cleanliness=Math.max(0,(u.cleanliness??100)-dt*(isHotel?.35:.1));u.condition=Math.max(0,(u.condition??100)-dt*(!isHotel&&u.furnishing==='unfurnished'?.05:.08));if(!isHotel&&(u.cleanliness??100)<45)u.dirty=true;
  if(!u.checkoutAt)u.checkoutAt=isHotel?now+Math.max(1,u.remaining):now+6*180;
  u.remaining=Math.max(0,u.checkoutAt-now);
  const contract=l.bookings.find(v=>v.id===u.bookingId);if(!isHotel&&contract&&u.checkoutAt-now<=180&&!contract.renewal)contract.noticeGiven=true;
  if(now<u.checkoutAt)return;
  if(!isHotel&&contract?.renewal?.accepted){const renewal=contract.renewal;contract.rate=renewal.rate;contract.leaseWeeks=renewal.weeks;contract.leaseEnd=(contract.leaseEnd??week)+renewal.weeks;contract.departure=u.checkoutAt+renewal.weeks*180;contract.renewal=undefined;contract.noticeGiven=false;contract.rentPaidThrough=u.checkoutAt+180;renewalAccrual+=renewal.rate;const paid=householdPayment(b,contract.id,renewal.rate);b=paid.business;renewalRent+=paid.paid;if(paid.paid<renewal.rate){contract.rentDue=(contract.rentDue??0)+renewal.rate-paid.paid;contract.rentRetryAt=now+DAY;}l.roomNights++;l.earnedRoomNights++;u.checkoutAt=contract.departure;u.leaseEnd=contract.leaseEnd;u.rent=contract.rate;u.remaining=u.checkoutAt-now;return;}
  const booking=l.bookings.find(v=>v.id===u.bookingId),base=roomTypes(p).find(t=>t.id===u.type)??roomTypes(p)[0];
  const unresolved=l.issues.filter(issue=>issue.unit===i&&!issue.resolved).length;
  const review=Math.max(1,Math.min(5,Math.round(((u.condition??100)*.22+(u.cleanliness??100)*.15+(base.comfort+((u.level??1)-1)*3)*.3+28+l.facilities.length*3-Math.max(0,(u.rent??base.rate)/(isHotel?base.rate:apartmentRentBase(b,i,base.rate))-1)*20-unresolved*15)/20*10)/10));
  l.reputation=Math.max(0,Math.min(100,l.reputation*.9+review*20*.1));
  if(booking){booking.status='completed';booking.review=review;if(isHotel)l.completedNights+=booking.nights;}
  if(isHotel)stripped.push(i);
  l.issues.forEach(issue=>{if(issue.unit===i&&!issue.resolved)issue.resolved='Unresolved at checkout';});
  v.visitors=v.visitors.map(person=>person.unit===i?{...person,state:'leaving',remaining:4}:person);
  Object.assign(u,{occupied:false,dirty:true,remaining:0,bookingId:undefined,checkoutAt:undefined});
 });
 let earned=0,refunds=0,rentPaid=0;
 for(const booking of l.bookings){
  if(!isHotel&&(booking.rentDue??0)>0&&(booking.rentRetryAt??Infinity)<=now){const paid=householdPayment(b,booking.id,booking.rentDue!);b=paid.business;rentPaid+=paid.paid;booking.rentDue=Math.max(0,booking.rentDue!-paid.paid);booking.rentRetryAt=booking.rentDue?now+DAY:undefined;}
  if(booking.prepaid!==undefined&&booking.checkedInAt!==undefined&&booking.departure!==undefined){
   const progress=Math.max(0,Math.min(1,(now-booking.checkedInAt)/Math.max(.001,booking.departure-booking.checkedInAt)));
   const total=Math.round(booking.prepaid*progress*100)/100;
   const recognized=Math.max(0,total-(booking.earned??0));earned+=recognized;l.earnedRoomNights+=recognized/Math.max(1,booking.rate);if(booking.unit!==undefined)l.roomEarnings[booking.unit]=(l.roomEarnings[booking.unit]??0)+recognized;booking.earned=Math.max(total,booking.earned??0);
  }
  if(booking.status==='completed'&&(booking.deposit??0)>0){
   const paid=Math.min(booking.deposit!,Math.max(0,b.cash-refunds));booking.deposit!-=paid;refunds+=paid;
  }
 }
 v.week.revenue+=earned+renewalAccrual;v.totalRevenue+=earned+renewalAccrual;l.roomRevenue+=earned+renewalAccrual;
 v.visitors=v.visitors.flatMap(person=>{
  if(person.state==='waiting'){
   if(l.bookings.find(v=>v.id===person.bookingId)?.status==='cancelled')return [];
   if(person.patience<=dt){v.week.lost++;l.reputation=Math.max(0,l.reputation-.5);const booking=l.bookings.find(v=>v.id===person.bookingId);if(booking){booking.status='cancelled';if(booking.groupId)l.bookings.forEach(v=>{if(v.groupId===booking.groupId&&['reserved','waiting'].includes(v.status))v.status='cancelled';});}return [];}
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
  if(selected){const {u,i}=selected,base=roomTypes(p).find(t=>t.id===u.type)!;if((globalDay*37%100)/100<Math.min(1,demand)*Math.exp(-2.5*Math.max(0,(u.rate??base.rate)/(isHotel?base.rate:apartmentRentBase(b,i,base.rate))-1))){
   const kind=globalDay%4===0&&['double','family','suite','onebed','twobed','penthouse'].includes(u.type??'')?'family':isHotel&&(globalDay%5===0||(l.facilities.includes('conference')&&globalDay%3===0))&&candidates.length>=2?'group':'booking';
   const rate=Math.round((u.rate??base.rate)*(kind==='group'?.9:1));
   const groupId=kind==='group'?l.nextBooking:undefined;
   l.bookings.push({leaseWeeks:isHotel?undefined:apartmentTerm(b),depositWeeks:isHotel?undefined:tenantDepositWeeks(b),groupId,groupSize:groupId?2:undefined,id:l.nextBooking++,name:`${isHotel?'Guest':'Applicant'} ${week}-${globalDay+1}`,type:u.type!,rate,nights:kind==='family'?2:1,arrival:now+(kind==='family'?1:(14-clock.hours)/24*DAY),unit:i,status:'reserved',kind});
   if(groupId){const other=candidates.find(c=>c.i!==i)!,otherBase=roomTypes(p).find(t=>t.id===other.u.type)!;l.bookings.push({id:l.nextBooking++,groupId,groupSize:2,name:`Group ${groupId} · second room`,type:other.u.type!,rate:Math.round((other.u.rate??otherBase.rate)*.9),nights:1,arrival:now+(14-clock.hours)/24*DAY,unit:other.i,status:'reserved',kind:'group'});}
  }}
 }
 for(const booking of l.bookings.filter(v=>v.status==='reserved'&&v.arrival<=now)){
  const party=booking.groupId?l.bookings.filter(other=>other.groupId===booking.groupId&&other.status==='reserved').length:1;
  if(v.visitors.filter(p=>p.state==='waiting').length+party>6)continue;
  booking.status='waiting';v.serial++;v.visitors.push({id:v.serial,seed:v.serial*17,state:'waiting',patience:32,remaining:0,unit:null,bookingId:booking.id,offerId:booking.type,agreedRate:booking.rate});
 }
 if(v.arrivalTimer<=0){
  // Hotel demand grows with available rooms; residential applicants keep their slower pace.
  v.arrivalTimer=isHotel?Math.max(1,6/(1+l.facilities.length*.1+l.reputation/200)/Math.max(1,v.units.length/4)):Math.max(4,12/(1+l.facilities.length*.1+l.reputation/200));
  if(clock.hours>=12&&clock.hours<21&&v.clock<174&&v.visitors.filter(v=>v.state==='waiting').length<6){
   const candidates=v.units.map((u,i)=>({u,i})).filter(({u,i})=>unitReady(u)&&!l.bookings.some(v=>v.unit===i&&['reserved','waiting'].includes(v.status)));
   const item=candidates[(v.serial+1)%Math.max(1,candidates.length)];if(item){const base=roomTypes(p).find(t=>t.id===item.u.type)!;v.serial++;if((v.serial*37%100)/100<Math.exp(-2.5*Math.max(0,(item.u.rate??base.rate)/(isHotel?base.rate:apartmentRentBase(b,item.i,base.rate))-1))){v.visitors.push({id:v.serial,seed:v.serial*17,state:'waiting',patience:32,remaining:0,unit:null,offerId:item.u.type,agreedRate:item.u.rate});}}
  }
 }
 // Evenings bring service requests; ignoring them affects the next review.
 if(l.lastIssueDay!==globalDay&&clock.hours>=18&&clock.hours<23){
  l.lastIssueDay=globalDay;const occupied=v.units.map((u,i)=>({u,i})).filter(x=>x.u.occupied),target=occupied[globalDay%Math.max(1,occupied.length)];
  if(target){const kind=(['service','noise','repair'] as const)[globalDay%3];if(kind==='noise'&&l.facilities.includes('insulation')){l.lastIssueDay=globalDay;}else{l.issues.push({id:globalDay+1,unit:target.i,kind,description:kind==='repair'?(isHotel?'A plumbing fault needs repair.':(['A light fitting needs a replacement bulb.','A plumbing fault needs a fitting.',target.u.furnishing==='unfurnished'?'A light fitting needs a replacement bulb.':'An appliance needs replacement.'][Math.floor(globalDay/3)%3])):kind==='noise'?'Noise from the corridor is disturbing the occupant.':isHotel?'The guest requested refreshments and assistance.':'The tenant requested shared-area cleaning.',deadline:now+DAY,supplyId:!isHotel&&kind==='repair'?(['stock-3','stock-4',target.u.furnishing==='unfurnished'?'stock-3':'stock-5'][Math.floor(globalDay/3)%3]):undefined});if(kind==='repair')target.u.condition=Math.max(0,(target.u.condition??100)-40);}}
 }
 for(const issue of l.issues)if(!issue.resolved&&issue.deadline<=now){issue.resolved='unresolved at deadline';l.reputation=Math.max(0,l.reputation-6);}
 l.bookings=l.bookings.filter(v=>!['completed','cancelled'].includes(v.status)||(v.deposit??0)>0||(v.rentDue??0)>0||now-v.arrival<180*3).slice(-200);l.issues=l.issues.slice(-80);
 let next:Business={...b,cash:b.cash-refunds+rentPaid+renewalRent,deferredIncome:Math.max(0,(b.deferredIncome??0)-earned),tenantDeposits:Math.max(0,(b.tenantDeposits??0)-refunds),ledger:refunds?[...b.ledger,{week,day,label:'Refundable tenant deposit returned',amount:-refunds}].slice(-60):b.ledger,lodging:l,venue:v,books:b.books?{...b.books,revenue:b.books.revenue+earned+renewalAccrual,wagesAccrued:b.books.wagesAccrued+businessWages(p,b)*dt/180}:undefined};
 if(renewalRent)next={...next,lodging:{...next.lodging!,rentCollected:(next.lodging!.rentCollected??0)+renewalRent},ledger:[...next.ledger,{week,day,label:'Renewed lease rent collected',amount:renewalRent}].slice(-60)};
 if(rentPaid)next={...next,lodging:{...next.lodging!,rentCollected:(next.lodging!.rentCollected??0)+rentPaid},ledger:[...next.ledger,{week,day,label:'Delayed tenant rent collected',amount:rentPaid}].slice(-60)};
 if(stripped.length)next=stripHotelLinen(next,stripped);
 if(shiftActive(next,'service')&&v.serviceTimer>=(l.facilities.includes('lift')?8:10)/staffCount(p,next,'service',0)){const ready=next.venue!.visitors.find(person=>person.state==='waiting'&&!lodgingBlocker(p,next,person.id));if(ready)next=serveLodging(p,next,week,day,ready.id);next={...next,venue:{...next.venue!,serviceTimer:0}};}
 const action=(type:'clean'|'repair',unit:number)=>{const state={week,day,businesses:{[p.id]:next},loans:[],payroll:[],report:[],notice:''};next=manageLodging(state,p.id,{type,unit}).businesses[p.id];};
 const cleaningTeam=(shiftActive(next,'care')?staffCount(p,next,'care'):0)+(!isHotel&&shiftActive(next,'cleaner')?staffCount(p,next,'cleaner'):0);
 if(cleaningTeam&&v.careTimer>=12/cleaningTeam){
  const index=next.venue!.units.findIndex((u,i)=>((shiftActive(next,'care')?staffCount(p,next,'care',1+Math.floor(i/(isHotel?4:3))):0)+(!isHotel&&shiftActive(next,'cleaner')?staffCount(p,next,'cleaner',1+Math.floor(i/3)):0))>0&&(isHotel?u.dirty&&!u.occupied:u.dirty||roomNeedsRepair(next,i)));if(index>=0&&(next.venue!.units[index].dirty||shiftActive(next,'care')))action(next.venue!.units[index].dirty?'clean':'repair',index);
  next={...next,venue:{...next.venue!,careTimer:0}};
 }
 const repairInterval=(l.facilities.includes('workshop')?7.5:10)/Math.max(1,staffCount(p,next,'maintenance'));
 if(staffCount(p,next,'maintenance')&&shiftActive(next,'maintenance')&&Math.floor(b.venue.clock/repairInterval)!==Math.floor(v.clock/repairInterval)){
  const index=next.venue!.units.findIndex((_,i)=>roomNeedsRepair(next,i)&&staffCount(p,next,'maintenance',1+Math.floor(i/(isHotel?4:3)))>0);if(index>=0)action('repair',index);
 }
 // A concierge handles one guest request at a time; repairs remain maintenance jobs.
 const concierge=staffCount(p,next,isHotel?'concierge':'supervisor'),conciergeInterval=8/Math.max(1,concierge);
 if(concierge&&shiftActive(next,isHotel?'concierge':'supervisor')&&Math.floor(b.venue.clock/conciergeInterval)!==Math.floor(v.clock/conciergeInterval)){
  const issue=next.lodging!.issues.find(i=>!i.resolved&&i.kind!=='repair'&&staffCount(p,next,isHotel?'concierge':'supervisor',1+Math.floor(i.unit/(isHotel?4:3)))>0);
  if(issue){const state={week,day,businesses:{[p.id]:next},loans:[],payroll:[],report:[],notice:''};next=manageLodging(state,p.id,{type:'issue',id:issue.id,choice:'help'}).businesses[p.id];}
 }
 if(isHotel&&l.facilities.includes('restaurant')&&clock.hours>=7&&clock.hours<11&&next.lodging!.lastBreakfastDay!==globalDay){
  const diners=next.venue!.units.filter(u=>u.occupied).length,portions=Math.min(diners,Math.floor(next.inventory?.['stock-4']??0));
  const supplied=portions?useLodgingSupplies(p,next,{'stock-4':portions}):next;if(supplied)next=supplied;
  next={...next,lodging:{...next.lodging!,lastBreakfastDay:globalDay,breakfastServed:(next.lodging!.breakfastServed??0)+portions,breakfastMissed:(next.lodging!.breakfastMissed??0)+diners-portions,reputation:Math.max(0,Math.min(100,next.lodging!.reputation+(diners?portions===diners?.3:-1:0)))}};
 }
 if(!isHotel&&l.lastResidentDay!==globalDay){const occupied=next.venue!.units.filter(u=>u.occupied),target=occupied.length?occupied.reduce((n,u)=>n+Math.min(100,50+(u.condition??100)*.3+(u.cleanliness??100)*.15+l.facilities.length*2),0)/occupied.length:next.lodging!.reputation;next={...next,lodging:{...next.lodging!,lastResidentDay:globalDay,reputation:Math.max(0,Math.min(100,next.lodging!.reputation*.95+target*.05))}};}
 {
  const expense=(isHotel?hotelWeeklyUpkeep(next):apartmentUpkeep(next))*dt/180,due=(next.lodging!.serviceDue??0)+expense,paid=Math.min(Math.max(0,next.cash),due);
  next={...next,cash:next.cash-paid,lodging:{...next.lodging!,serviceDue:Math.max(0,due-paid)},books:next.books?{...next.books,maintenance:next.books.maintenance+expense}:undefined};
 }
 return next;
}
