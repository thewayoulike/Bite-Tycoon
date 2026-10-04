import type {Business,Property} from '../prototype/expansionModel';
import {consumeBusinessSupplies} from '../inventory/businessStockroom';
import {crewPower} from './crew';
export type AmenityVisit={id:string;guest:number;facility:string;state:'travel'|'queue'|'using'|'done';timer:number;wait:number};
export type Household={booking:number;job:string;income:number;wallet:number;essentials:number;lastWeek:number};
export type Conference={id:string;week:number;day:number;people:number;fee:number;status:'accepted'|'completed'|'missed';label:string};
export type ServiceDepth={visits:AmenityVisit[];households:Household[];conferences:Conference[];lastDay:number;completed:number;missed:number;notice:string};
export const serviceDepth=(b:Business):ServiceDepth=>b.serviceDepth??{visits:[],households:[],conferences:[],lastDay:-1,completed:0,missed:0,notice:''};
export const facilityCapacity=(id:string)=>id==='conference'?6:id==='restaurant'?4:2;
export function conferenceOffers(b:Business,week:number):Conference[]{return !b.lodging?.facilities.includes('conference')?[]:[{id:`conference-${week}-3`,week,day:3,people:4,fee:240,status:'accepted',label:'Local business workshop'},{id:`conference-${week}-6`,week,day:6,people:6,fee:360,status:'accepted',label:'Weekend community meeting'}];}
export function acceptConference(b:Business,week:number,id:string):Business{const d=serviceDepth(b),o=conferenceOffers(b,week).find(v=>v.id===id);if(!o||d.conferences.some(c=>c.id===id)||(b.venue?.running&&Math.floor(b.venue.clock*7/180)+1>=o.day))return b;return {...b,serviceDepth:{...d,conferences:[...d.conferences,o],notice:'Meeting accepted. Keep refreshments and a concierge on shift; rooms are booked separately.'}};}
export function householdPayment(b:Business,booking:number,amount:number){
 const d=b.serviceDepth,h=d?.households.find(h=>h.booking===booking);if(!d||!h)return {business:b,paid:amount};
 const paid=Math.min(amount,Math.max(0,h.wallet));return {business:{...b,serviceDepth:{...d,households:d.households.map(v=>v.booking===booking?{...v,wallet:v.wallet-paid}:v)}},paid};
}
export function prepareHouseholds(b:Business,week:number):Business{
 const base=serviceDepth(b),d={...base,households:base.households.filter(h=>b.lodging?.bookings.some(k=>k.id===h.booking)).map(h=>({...h}))};
 if(!b.lodging)return b;
 for(const booking of b.lodging.bookings.filter(v=>v.status==='staying')){
  let h=d.households.find(h=>h.booking===booking.id);
  if(!h){const jobs=['Shop assistant','Teacher','Engineer','Nurse','Remote designer','Retired resident'];h={booking:booking.id,job:jobs[booking.id%jobs.length],income:Math.round(booking.rate*(2.3+(booking.id%4)*.35)),essentials:Math.round(booking.rate*.75),wallet:Math.round(booking.rate*2),lastWeek:week};d.households.push(h);}
  if(h.lastWeek<week){h.wallet+=Math.max(0,h.income-h.essentials)*(week-h.lastWeek);h.lastWeek=week;}
 }
 return {...b,serviceDepth:d};
}
export function advanceServices(p:Property,b:Business,dt:number,week:number,day:number):Business{
 if(!b.lodging||!b.venue?.running)return b;
 const base=serviceDepth(b),d:ServiceDepth={...base,visits:base.visits.map(v=>({...v})),households:base.households.filter(h=>b.lodging?.bookings.some(k=>k.id===h.booking)).map(h=>({...h})),conferences:base.conferences.filter(c=>c.week>=week-16).map(c=>({...c}))},today=(week-1)*7+day;
 const hour=(8+b.venue.clock*7*24/180)%24;
 if(p.kind==='apartments')d.households=prepareHouseholds(b,week).serviceDepth!.households;
 let reputation=b.lodging.reputation,next={...b,serviceDepth:d};
 if(d.lastDay!==today&&hour>=17&&hour<21){
  d.lastDay=today;d.visits=d.visits.filter(v=>v.state!=='done');
  const facilities=b.lodging.facilities.filter(id=>!['laundry','workshop','insulation','lift','parcels'].includes(id));
  b.venue.visitors.filter(v=>v.state==='using').forEach((v,i)=>{const facility=facilities[(v.seed+today)%Math.max(1,facilities.length)];if(facility&&!d.visits.some(a=>a.guest===v.id&&a.state!=='done'))d.visits.push({id:`amenity-${today}-${v.id}`,guest:v.id,facility,state:'travel',timer:0,wait:0});});
 }
 for(const visit of d.visits){
  if(visit.state==='done')continue;
  if(!b.venue.visitors.some(v=>v.id===visit.guest&&v.state==='using')){visit.state='done';continue;}
  if(visit.state==='travel'){visit.timer+=dt;if(visit.timer>=15){visit.state='queue';visit.timer=0;}continue;}
  if(visit.state==='using'){visit.timer+=dt;if(visit.timer>=7){visit.state='done';d.completed++;reputation+=.15;}continue;}
  visit.wait+=dt;
  const occupied=d.visits.filter(v=>v.facility===visit.facility&&v.state==='using').length;
  const staffed=visit.facility!=='restaurant'||crewPower(b.crew,'care',hour,1)>0;
  if(occupied<facilityCapacity(visit.facility)&&staffed){
   const supplies=visit.facility==='restaurant'?{'stock-4':1}:{};
   const served=Object.keys(supplies).length?consumeBusinessSupplies(p,next,supplies):next;
   if(served){next={...served,serviceDepth:d};visit.state='using';visit.timer=0;}
  }
  if(visit.wait>20&&visit.state==='queue'){visit.state='done';d.missed++;reputation-=.4;}
 }
 for(const event of d.conferences){
  if(event.status!=='accepted')continue;
  if(event.week<week||event.week===week&&event.day<day){event.status='missed';reputation-=2;continue;}
  if(event.week===week&&event.day===day&&hour>=12&&hour<18&&crewPower(b.crew,'concierge',hour,b.hires?.concierge??0)>0){
   const stocked=consumeBusinessSupplies(p,next,{'stock-4':event.people});if(!stocked)continue;
   next={...stocked,cash:stocked.cash+event.fee,books:stocked.books?{...stocked.books,revenue:stocked.books.revenue+event.fee}:undefined,venue:{...stocked.venue!,week:{...stocked.venue!.week,revenue:stocked.venue!.week.revenue+event.fee},totalRevenue:stocked.venue!.totalRevenue+event.fee},serviceDepth:d};event.status='completed';d.notice=`${event.label} completed: ${event.people} guests, $${event.fee} earned.`;reputation+=1;
  }
 }
 return {...next,serviceDepth:d,lodging:{...next.lodging!,reputation:Math.max(0,Math.min(100,reputation))}};
}
