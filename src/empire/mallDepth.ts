import {crewPower,ensureCrew} from '../career/crew';
import type {Business,ExpansionState,Property} from '../prototype/expansionModel';
import {businessSupplies,businessWages,propertyById} from '../prototype/expansionModel';
import {consumeBusinessSupplies} from '../inventory/businessStockroom';
import {stockDay} from '../inventory/stockroom';
import {protectedObligations} from './cashProtection';
import {MALL_FACILITIES,shopType,plazaFloorCost,plazaFloorMilestone,plazaUnitName,mallWeeklyUpkeep} from './plaza';
import type {MallFacility} from './plaza';
import type {WeeklyProfitLoss} from './weeklyFinance';
export type MallTerm=8|16|24;
export type MallRole='service'|'care'|'maintenance'|'concierge'|'cleaner'|'security'|'attendant'|'operator';
export type MallTenant={turnoverPercent?:number;health:number;term:MallTerm;renewal?:{rate:number;term:MallTerm;accepted:boolean};renewed?:number};
export type MallZone={cleanliness:number;condition:number;safety:number};
export type MallRentDue={id:string;unit:number;tenant:string;amount:number;dueDay:number;retryDay:number;health?:number};
export type MallHistory={week:number;occupancy:number;profit:number;satisfaction:number;footfall:number[];complete?:boolean};
export type MallDepth={newTurnoverPercent?:0|5|10;version:1;term:MallTerm;legacyFacilities?:MallFacility[];satisfaction:number;zones:MallZone[];tenants:Record<number,MallTenant>;receivables:MallRentDue[];rentCollected:number;serviceDue:number;week:number;elapsed:number;occupiedSeconds:number;availableSeconds:number;floorFootfall:number[];history:MallHistory[];lastDay:number;workTimer:number;assignments:Partial<Record<MallRole,number>>;paused:MallFacility[];lastJob:Record<number,string>;renewalsOffered:number;renewalsAccepted:number};
export function ensureMallDepth(b:Business):Business{
 if(!b.plaza)return b;
 if(b.plaza.depth){const d=b.plaza.depth;if(d.zones.length===b.plaza.openFloors)return b;return {...b,plaza:{...b.plaza,depth:{...d,zones:Array.from({length:b.plaza.openFloors},(_,i)=>d.zones[i]??{cleanliness:100,condition:100,safety:100}),floorFootfall:Array.from({length:b.plaza.openFloors},(_,i)=>d.floorFootfall[i]??0)}}};}
 const count=b.plaza.openFloors;
 const depth:MallDepth={version:1,term:8,legacyFacilities:b.plaza.facilities.length?[...b.plaza.facilities]:[],satisfaction:75,zones:Array.from({length:count},()=>({cleanliness:100,condition:100,safety:100})),tenants:Object.fromEntries((b.venue?.units??[]).flatMap((u,i)=>u.occupied?[[i,{health:75,term:8}]]:[])),receivables:[],rentCollected:0,serviceDue:0,week:0,elapsed:0,occupiedSeconds:0,availableSeconds:0,floorFootfall:Array(count).fill(0),history:[],lastDay:0,workTimer:0,assignments:{},paused:[],lastJob:{},renewalsOffered:0,renewalsAccepted:0};
 // New consumables start empty in existing accounts; migration never invents stock value.
 return {...b,inventory:{...b.inventory,'stock-3':b.inventory?.['stock-3']??0,'stock-4':b.inventory?.['stock-4']??0,'stock-5':b.inventory?.['stock-5']??0},plaza:{...b.plaza,depth}};
}
export const mallReceivable=(b:Business)=>b.plaza?.depth?.receivables.reduce((n,r)=>n+r.amount,0)??0;
export const mallOccupancy=(b:Business)=>100*(b.venue?.units.filter(u=>u.occupied).length??0)/Math.max(1,b.venue?.units.length??0);
export function mallRoleCoverage(b:Business,role:MallRole,floor:number){const d=b.plaza?.depth,assigned=d?.assignments[role]??-1;return (assigned<0||assigned===floor)?crewPower(ensureCrew(propertyById('park')!,b),role,(8+(b.venue?.clock??0)*7*24/180)%24,b.hires?.[role]??0,floor):0;}
export function mallCleaningCoverage(b:Business,floor:number){return mallRoleCoverage(b,'care',floor)+mallRoleCoverage(b,'cleaner',floor);}
export function mallFacilityCoverage(b:Business,id:MallFacility){
 const d=b.plaza?.depth,f=MALL_FACILITIES.find(v=>v.id===id)!;if(!b.plaza?.facilities.includes(id)||d?.paused.includes(id))return 0;
 if(!d)return 1;
 const zone=d.zones[f.floor];if(!zone||zone.safety<60||zone.condition<45)return 0;
 const legacy=d.legacyFacilities?.includes(id),staffed=id==='play'?legacy||mallRoleCoverage(b,'attendant',f.floor)>0:id==='cinema'?legacy||mallRoleCoverage(b,'operator',f.floor)>0:true;
 if(!staffed)return 0;
 const supplies=businessSupplies(propertyById('park')!,b),paper=supplies.find(v=>v.id==='stock-3')?.quantity??0,trays=supplies.find(v=>v.id==='stock-5')?.quantity??0;
 return Math.min(1,zone.cleanliness/80,mallCleaningCoverage(b,f.floor)/Math.ceil(b.plaza.openFloors/2))*(paper>0||legacy?1:.5)*(id!=='foodcourt'||trays>0||legacy?1:.5);
}
export function mallFloorChecks(p:Property,b:Business,s:ExpansionState){
 const floor=b.plaza!.openFloors,d=b.plaza!.depth!,h=d.history.filter(v=>v.complete),last=h.at(-1),occupancy=mallOccupancy(b),protectedCash=protectedObligations(p,b,s),cost=plazaFloorCost(b);
 const checks=[{label:`${plazaFloorMilestone(b)} cumulative signed leases`,value:`${b.plaza!.leasesSigned} / ${plazaFloorMilestone(b)}`,met:b.plaza!.leasesSigned>=plazaFloorMilestone(b)}];
 if(floor===1)checks.push({label:'75% average occupancy for two completed consecutive weeks',value:h.slice(-2).map(v=>`${v.occupancy.toFixed(0)}%`).join(' · ')||'No completed weeks',met:h.length>=2&&h.at(-1)!.week===s.week-1&&h.at(-2)!.week===s.week-2&&h.slice(-2).every(v=>v.occupancy>=75)});
 if(floor===2)checks.push({label:'75% current occupancy',value:`${occupancy.toFixed(0)}% / 75%`,met:occupancy>=75},{label:'Two completed profitable weeks',value:`${h.filter(v=>v.profit>0).length} / 2`,met:h.filter(v=>v.profit>0).length>=2});
 if(floor===3)checks.push({label:'Visitor satisfaction 75/100',value:`${d.satisfaction.toFixed(0)} / 75`,met:d.satisfaction>=75},{label:'Security and cleaning coverage on every open floor',value:'At least one security officer and two cleaning crew per floor (roving staff count)',met:Array.from({length:floor},(_,i)=>i).every(i=>mallRoleCoverage(b,'security',i)>0&&mallCleaningCoverage(b,i)>=2)});
 if(floor===4)checks.push({label:'80% current occupancy',value:`${occupancy.toFixed(0)}% / 80%`,met:occupancy>=80},{label:'Visitor satisfaction 85/100',value:`${d.satisfaction.toFixed(0)} / 85`,met:d.satisfaction>=85});
 const buffer=protectedCash.total+Math.max(0,businessWages(p,b)-protectedCash.wages)+(b.manager?.reserve??0)+18;
 checks.push({label:'Cash left for bills, team wages, next floor upkeep and purchasing buffer',value:`$${Math.floor(b.cash-cost)} / $${Math.ceil(buffer)}`,met:b.cash-cost>=buffer},{label:'No overdue shared-space repairs or safety failures',value:d.zones.every(z=>z.condition>=60&&z.safety>=60)?'Ready':'Repair affected zones',met:d.zones.every(z=>z.condition>=60&&z.safety>=60)});
 return checks;
}
export function closeMallWeek(b:Business,r:WeeklyProfitLoss):Business{
 const d=b.plaza?.depth;if(!d||d.history.some(h=>h.week===r.week))return b;
 return {...b,plaza:{...b.plaza!,depth:{...d,history:[...d.history,{week:r.week,occupancy:d.availableSeconds?100*d.occupiedSeconds/d.availableSeconds:mallOccupancy(b),profit:r.profit,satisfaction:d.satisfaction,footfall:d.floorFootfall,complete:d.elapsed>=179.99&&!r.partial}].slice(-52)}}};
}
export function startMallDepthWeek(b:Business,week:number):Business{
 b=ensureMallDepth(b);const d=b.plaza!.depth!;if(d.week===week)return b;
 return {...b,plaza:{...b.plaza!,depth:{...d,week,elapsed:0,occupiedSeconds:0,availableSeconds:0,floorFootfall:Array(b.plaza!.openFloors).fill(0)}}};
}
export function mallAccrueRent(b:Business,index:number,week:number,day:number,first=false):Business{
 const u=b.venue!.units[index],d=b.plaza!.depth!,amount=u.rent??0,tenant=d.tenants[index]??{health:75,term:8};if(u.ownerCompany||!u.occupied||u.rentWeek>=week||amount<=0)return b;
 const late=!first&&tenant.health<55&&(week+index)%3===0,date=stockDay(week,day);
 const trade=b.tenantTrading?.[index]??{cash:1000,stock:40,sales:0,cogs:0,week,transactions:0,timer:0,turnoverPercent:tenant.turnoverPercent??0,chargedWeek:0};
 const paid=late?0:Math.min(amount,Math.max(0,trade.cash)),due=amount-paid;
 return {...b,cash:b.cash+paid,tenantTrading:{...b.tenantTrading,[index]:{...trade,cash:trade.cash-paid}},books:b.books?{...b.books,revenue:b.books.revenue+amount}:undefined,ledger:[...b.ledger,{week,day,label:`${plazaUnitName(index)} · rent $${paid} received${due?`, $${due} pending`:''}`,amount:paid}].slice(-60),venue:{...b.venue!,units:b.venue!.units.map((v,i)=>i===index?{...v,rentWeek:week}:v),week:{...b.venue!.week,revenue:b.venue!.week.revenue+amount},totalRevenue:b.venue!.totalRevenue+amount},plaza:{...b.plaza!,depth:{...d,rentCollected:d.rentCollected+paid,receivables:due?[...d.receivables,{id:`${index}-${week}`,unit:index,tenant:u.tenantName??plazaUnitName(index),amount:due,dueDay:date,retryDay:date+1,health:tenant.health}]:d.receivables}}};
}
export function payMallUpkeep(b:Business,week:number,day:number,accrue=false):Business{
 const d=b.plaza!.depth!,expense=accrue?mallWeeklyUpkeep(b):0,due=d.serviceDue+expense,paid=Math.min(Math.max(0,b.cash),due);if(!due)return b;
 return {...b,cash:b.cash-paid,books:b.books?{...b.books,maintenance:b.books.maintenance+expense}:undefined,plaza:{...b.plaza!,depth:{...d,serviceDue:due-paid}},ledger:paid?[...b.ledger,{week,day,label:'Mall utilities & facility upkeep paid',amount:-paid}].slice(-60):b.ledger};
}
export function retryMallCollections(b:Business,week:number,day:number):Business{
 const date=stockDay(week,day),d=b.plaza!.depth!;let received=0;const trades={...b.tenantTrading};
 const receivables=d.receivables.flatMap(r=>{if(r.retryDay>date)return [r];const health=r.health??d.tenants[r.unit]?.health??75;if(health<35&&date%3!==0)return [{...r,retryDay:date+1}];
 const trade=trades[r.unit],paid=trade?Math.min(r.amount,Math.max(0,trade.cash)):r.amount;
 if(trade)trades[r.unit]={...trade,cash:trade.cash-paid};received+=paid;
 return paid<r.amount?[{...r,amount:r.amount-paid,retryDay:date+1}]:[];});
 const next={...b,tenantTrading:trades,cash:b.cash+received,plaza:{...b.plaza!,depth:{...d,receivables,rentCollected:d.rentCollected+received}},ledger:received?[...b.ledger,{week,day,label:'Overdue tenant rents collected · already recognized',amount:received}].slice(-60):b.ledger};
 return payMallUpkeep(next,week,day);
}
export function mallZoneBlocker(b:Business,floor:number,repair=false):string|null{
 const z=b.plaza?.depth?.zones[floor];if(!z)return 'Floor unavailable';if(repair?z.condition>=100&&z.safety>=100:z.cleanliness>=100)return repair?'No shared repairs needed':'Shared space already clean';
 const stock=businessSupplies(propertyById('park')!,b),needs=repair?{'stock-1':2,'stock-2':1,'stock-4':1}:{'stock-0':2,'stock-3':1,...(floor===2&&b.plaza!.facilities.includes('foodcourt')?{'stock-5':1}:{})};
 const missing=stock.find(i=>i.quantity<(needs[i.id as keyof typeof needs]??0));if(missing)return `Order ${missing.name.toLowerCase()} in Inventory`;return repair&&b.cash<15?'Needs $15 for repairs':null;
}
export function serviceMallZone(b:Business,floor:number,week:number,day:number,repair=false):Business{
 if(mallZoneBlocker(b,floor,repair))return b;
 const needs=repair?{'stock-1':2,'stock-2':1,'stock-4':1}:{'stock-0':2,'stock-3':1,...(floor===2&&b.plaza!.facilities.includes('foodcourt')?{'stock-5':1}:{})};
 const next=consumeBusinessSupplies(propertyById('park')!,b,needs)!;const d=next.plaza!.depth!;
 return {...next,cash:next.cash-(repair?15:0),books:next.books?{...next.books,maintenance:next.books.maintenance+(repair?15:0)}:undefined,plaza:{...next.plaza!,depth:{...d,zones:d.zones.map((z,i)=>i!==floor?z:repair?{...z,condition:100,safety:100}:{...z,cleanliness:100}),lastJob:{...d.lastJob,[floor]:repair?'Shared fittings and safety repaired':'Promenade, toilets and seating cleaned'}}}};
}
export type MallDepthAction={type:'term';term:MallTerm}|{type:'renew';unit:number;term:MallTerm;rate:number}|{type:'assign';role:MallRole;floor:number}|{type:'zone';floor:number;repair:boolean}|{type:'pause';facility:MallFacility;paused:boolean};
export function manageMallDepth(s:ExpansionState,id:string,a:MallDepthAction):ExpansionState{
 let b=s.businesses[id];if(!b?.plaza?.depth)return s;const d=b.plaza.depth;let note='Mall updated.';
 if(a.type==='term'){if(![8,16,24].includes(a.term))return s;b={...b,plaza:{...b.plaza,depth:{...d,term:a.term}}};note='New applicants use this lease term. Existing offers and contracts stay unchanged.';}
 else if(a.type==='assign'){if(!Number.isInteger(a.floor)||a.floor< -1||a.floor>=b.plaza.openFloors)return s;b={...b,plaza:{...b.plaza,depth:{...d,assignments:{...d.assignments,[a.role]:a.floor}}}};note='Team coverage updated.';}
 else if(a.type==='zone'){const blocked=mallZoneBlocker(b,a.floor,a.repair);if(blocked)return {...s,notice:blocked};b=serviceMallZone(b,a.floor,s.week,s.day,a.repair);note='Shared area serviced using mall supplies.';}
 else if(a.type==='pause'){if(!b.plaza.facilities.includes(a.facility))return s;b={...b,plaza:{...b.plaza,depth:{...d,paused:a.paused?[...new Set([...d.paused,a.facility])]:d.paused.filter(id=>id!==a.facility)}}};note='Facility operation changed. Standby upkeep is 25% from the next week; staff wages continue.';}
 else{
  const u=b.venue?.units[a.unit],t=d.tenants[a.unit];if(!u?.occupied||!t||t.renewal||s.week<(u.leaseEnd??0)-2||s.week>=(u.leaseEnd??0)||![8,16,24].includes(a.term)||!Number.isFinite(a.rate)||a.rate<shopType(u.shopType).rent*.5||a.rate>shopType(u.shopType).rent*3)return s;
  const accepted=t.health>=55&&d.satisfaction>=65&&a.rate<=shopType(u.shopType).rent*1.35&&!d.receivables.some(r=>r.unit===a.unit&&r.tenant===u.tenantName);
  b={...b,plaza:{...b.plaza,depth:{...d,renewalsOffered:d.renewalsOffered+1,renewalsAccepted:d.renewalsAccepted+(accepted?1:0),tenants:{...d.tenants,[a.unit]:{...t,renewal:{rate:a.rate,term:a.term,accepted}}}}}};
  note=accepted?'Renewal accepted. The agreed rent and term begin when this lease ends.':'Renewal declined: review trading health, arrears, asking rent and visitor satisfaction.';
 }
 return {...s,businesses:{...s.businesses,[id]:b},notice:note};
}
export function advanceMallDepth(p:Property,b:Business,dt:number,week:number,day:number,demand:number):Business{
 if(!b.plaza?.depth)return b;let next=b;const date=stockDay(week,day);
 if(b.plaza.depth.lastDay!==date)next=retryMallCollections(next,week,day);
 let d=next.plaza!.depth!;const occupied=next.venue!.units.filter(u=>u.occupied),mix=new Set(occupied.map(u=>u.shopType)).size;
 const zones=d.zones.map((z,f)=>{const traffic=next.venue!.units.slice(f*4,f*4+4).filter(u=>u.occupied).length;return {cleanliness:Math.max(0,z.cleanliness-dt*(.028+traffic*.008)),condition:Math.max(0,z.condition-dt*.012),safety:Math.max(0,z.safety-dt*.008)};});
 const concierge=Math.min(4,(next.hires?.concierge??0)*2);
 const quality=zones.reduce((n,z)=>n+(z.cleanliness+z.condition)/2,0)/zones.length,security=Array.from({length:next.plaza!.openFloors},(_,f)=>mallRoleCoverage(next,'security',f)>0?1:0).reduce((n,v)=>n+v,0)/next.plaza!.openFloors;
 const amenities=MALL_FACILITIES.reduce((n,f)=>n+mallFacilityCoverage(next,f.id)*2,0),target=Math.min(100,quality*.7+10+concierge+security*8+Math.min(8,mix*2)+amenities);
 const satisfaction=d.satisfaction+(target-d.satisfaction)*Math.min(1,dt/100),clock=next.venue!.clock,hour=(8+clock/180*7*24)%24;
 const footfall=d.floorFootfall.map((n,f)=>{const shops=next.venue!.units.slice(f*4,f*4+4).filter(u=>u.occupied).length,appeal=1+MALL_FACILITIES.filter(v=>v.floor===f).reduce((v,a)=>v+a.appeal*mallFacilityCoverage(next,a.id),0),evening=f===3&&hour>=18&&hour<24?1.4:hour<7?.15:1;return n+shops*dt*.3*appeal*demand*evening;});
 const tenants={...d.tenants};for(const [key,t]of Object.entries(tenants)){const u=next.venue!.units[Number(key)];if(!u?.occupied)continue;const rate=u.rent??shopType(u.shopType).rent,healthTarget=Math.max(5,Math.min(100,satisfaction+(demand-1)*10+Math.min(10,mix*2)-Math.max(0,rate/shopType(u.shopType).rent-1)*60));tenants[Number(key)]={...t,health:t.health+(healthTarget-t.health)*Math.min(1,dt/180)};}
 next={...next,plaza:{...next.plaza!,depth:{...d,zones,tenants,satisfaction,lastDay:date,elapsed:d.elapsed+dt,occupiedSeconds:d.occupiedSeconds+occupied.length*dt,availableSeconds:d.availableSeconds+next.venue!.units.length*dt,floorFootfall:footfall,workTimer:d.workTimer+dt}}};
 if(next.plaza!.depth!.workTimer>=12){
  const floors=Array.from({length:next.plaza!.openFloors},(_,i)=>i).sort((a,c)=>next.plaza!.depth!.zones[a].cleanliness-next.plaza!.depth!.zones[c].cleanliness);
  let jobs=1+(next.hires?.care??0)+(next.hires?.cleaner??0);
  for(const f of floors)if(jobs>0&&mallCleaningCoverage(next,f)>0&&next.plaza!.depth!.zones[f].cleanliness<85){const serviced=serviceMallZone(next,f,week,day);if(serviced!==next){next=serviced;jobs--;}}
  for(const f of floors)if(mallRoleCoverage(next,'maintenance',f)>0&&(next.plaza!.depth!.zones[f].condition<75||next.plaza!.depth!.zones[f].safety<75))next=serviceMallZone(next,f,week,day,true);
  next={...next,plaza:{...next.plaza!,depth:{...next.plaza!.depth!,workTimer:0}}};
 }
 const total=next.plaza!.depth!.floorFootfall.reduce((n,v)=>n+v,0)-d.floorFootfall.reduce((n,v)=>n+v,0);
 return {...next,plaza:{...next.plaza!,footfall:b.plaza.footfall+total}};
}
