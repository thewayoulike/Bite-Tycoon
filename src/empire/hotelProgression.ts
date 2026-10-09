import type {Business,ExpansionState} from '../prototype/expansionModel';
import type {RoomType} from './lodging';
import type {WeeklyProfitLoss} from './weeklyFinance';

export const HOTEL_FLOORS=[
 {floor:1,name:'First guests',nights:0,cost:0,occupancy:0,reputation:0,profitableWeeks:0,visible:'Four standard rooms, each with a private bathroom. G reception and Floor 1 are included when you open.',unlock:'Standard and double rooms',needs:'Receptionist and housekeeper included; keep linen, towels, toiletries and cleaning supplies stocked.'},
 {floor:2,name:'Family stays',nights:30,cost:6000,occupancy:60,reputation:0,profitableWeeks:0,visible:'Four more rooms; family layouts with twin beds and family storage become available.',unlock:'Family renovations and optional breakfast service',needs:'Four more linen and towel sets; review housekeeping capacity and breakfast stock.'},
 {floor:3,name:'Business travel',nights:100,cost:9000,occupancy:0,reputation:75,profitableWeeks:0,visible:'Four more rooms; business fit-outs with a larger work area become available.',unlock:'Business rooms, meeting lounge and an optional laundry room',needs:'More toiletries and refreshments; consider a concierge and a laundry attendant.'},
 {floor:4,name:'Premium comfort',nights:220,cost:12000,occupancy:70,reputation:0,profitableWeeks:2,visible:'Four more rooms; premium rooms with lounge seating and upgraded finishes become available.',unlock:'Premium renovations and optional wellness facilities',needs:'Extra clean linen, towels and repair parts; review the housekeeper rota.'},
 {floor:5,name:'Suites & sky lounge',nights:400,cost:15000,occupancy:0,reputation:85,profitableWeeks:0,visible:'Four more rooms; suites with separate sleeping and sitting areas become available.',unlock:'Suite renovations and optional rooftop lounge',needs:'Larger service team and supply budget; keep payroll current.'},
] as const;
export const hotelCompletedNights=(b:Business)=>b.lodging?.completedNights??b.lodging?.bookings.filter(v=>v.status==='completed').reduce((n,v)=>n+v.nights,0)??0;
// A sold night includes the daytime checkout/cleaning window, rather than requiring
// a guest to physically occupy the room for all 24 hours.
export const hotelWeeklyOccupancy=(b:Business)=>{const l=b.lodging;if(!l?.availableSeconds)return 0;return Math.min(100,100*(l.earnedRoomNights??l.roomNights)/(l.availableSeconds/(180/7)));};
export function hotelFloorChecks(b:Business,s:ExpansionState,floor=(b.lodging?.openFloors??1)+1){
 const spec=HOTEL_FLOORS[floor-1];if(!spec)return [];
 const l=b.lodging!,occupancy=l.lastReport?.occupancy??hotelWeeklyOccupancy(b);
 const overdue=s.payroll.some(pay=>s.businesses[pay.businessId]===b&&pay.amount>0&&(pay.week<s.week||(pay.week===s.week&&s.day>=4)));
 return [
  {label:`${spec.nights} completed room-nights`,value:`${hotelCompletedNights(b)} / ${spec.nights}`,met:hotelCompletedNights(b)>=spec.nights},
  ...(spec.occupancy?[{label:`${spec.occupancy}% occupancy in the latest week`,value:`${Math.round(occupancy)}% / ${spec.occupancy}%`,met:occupancy>=spec.occupancy}]:[]),
  ...(spec.reputation?[{label:`Reputation ${spec.reputation}`,value:`${Math.round(l.reputation)} / ${spec.reputation}`,met:l.reputation>=spec.reputation}]:[]),
  ...(spec.profitableWeeks?[{label:'Two consecutive profitable weeks',value:`${l.profitableWeeks??0} / 2`,met:(l.profitableWeeks??0)>=2}]:[]),
  ...(floor===5?[{label:'No overdue wages',value:overdue?'Wages overdue':'Payroll current',met:!overdue}]:[]),
 ];
}
export function hotelFloorBlocker(b:Business,s:ExpansionState){
 if((b.lodging?.openFloors??1)>=5)return 'All five guest floors are open.';
 if(b.venue?.running)return 'Open the next floor between weeks.';
 return hotelFloorChecks(b,s).find(c=>!c.met)?.label??null;
}
export function roomTypeFloor(type:RoomType){return ({family:2,business:3,premium:4,suite:5} as Partial<Record<RoomType,number>>)[type]??1;}
export function roomTypeUnlocked(b:Business,type:RoomType){return (b.lodging?.openFloors??1)>=roomTypeFloor(type)||!!b.venue?.units.some(u=>u.type===type);}
export function closeHotelPerformance(b:Business,report:WeeklyProfitLoss):Business{
 if(!b.lodging||b.lodging.performanceWeek===report.week)return b;
 const l=b.lodging,occupancy=hotelWeeklyOccupancy(b);
 const nights=l.earnedRoomNights??l.roomNights;
 return {...b,lodging:{...l,performanceWeek:report.week,profitableWeeks:!report.partial&&report.profit>0?(l.profitableWeeks??0)+1:0,lastReport:{week:report.week,occupancy,averageRate:nights?l.roomRevenue/nights:0,reputation:l.reputation,served:b.venue?.week.served??0,lost:b.venue?.week.lost??0,revenue:l.roomRevenue,profit:report.profit,revpar:b.venue?.units.length?l.roomRevenue/(b.venue.units.length*7):0,complaints:l.issues.filter(i=>!i.resolved||i.resolved.toLowerCase().includes('unresolved')).length}}};
}
