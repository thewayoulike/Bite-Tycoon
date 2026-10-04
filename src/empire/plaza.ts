import {crewPower,ensureCrew} from '../career/crew';
import {ensureMallDepth,startMallDepthWeek,mallAccrueRent,payMallUpkeep,mallFloorChecks,mallFacilityCoverage,advanceMallDepth} from './mallDepth';
import type {MallDepth,MallTerm} from './mallDepth';
import {consumeBusinessSupplies} from '../inventory/businessStockroom';
import type {Business,ExpansionState,Property} from '../prototype/expansionModel';
import {businessSupplies,businessWages,propertyById} from '../prototype/expansionModel';
import type {VenueUnit} from './venueSimulation';

export const PLAZA_FLOORS=5,SHOPS_PER_FLOOR=4;
export const MALL_FLOOR_HEIGHT=4.8;
export const MALL_FLOORS=[
 {name:'Grand shopping hall',description:'A glazed entrance, concierge, coffee shop, everyday shopping and a planted atrium.',shops:['barber','bakery','fashion','pharmacy']},
 {name:'Family & play',description:'Toy and book shops, family shopping, a play zone and parent seating.',shops:['toys','books','fashion','grocer']},
 {name:'Food court',description:'Cafés, restaurants and dessert counters around a shared dining hall.',shops:['cafe','restaurant','bakery','dessert']},
 {name:'Lifestyle & leisure',description:'Electronics, sports, homeware and beauty shops, with a cinema lounge.',shops:['electronics','sports','home','beauty']},
 {name:'Sky dining & garden',description:'Top-floor dining, a glass-roofed garden and a terrace overlooking the town.',shops:['restaurant','cafe','florist','books']},
] as const;
export const MALL_FACILITIES=[
 {id:'play',name:'Little Willow play zone',floor:1,cost:1800,weekly:45,appeal:.16,description:'Soft play, a slide, activity tables and seating for parents. Requires a play attendant and cleaning coverage.'},
 {id:'foodcourt',name:'Shared food-court dining',floor:2,cost:2400,weekly:60,appeal:.20,description:'Dining tables, café seating, tray returns and a dedicated cleaning station.'},
 {id:'cinema',name:'Cinema & games lounge',floor:3,cost:4000,weekly:90,appeal:.24,description:'A small screening room, ticket counter and arcade games Requires a facility operator.'},
 {id:'roofgarden',name:'Sky garden terrace',floor:4,cost:3000,weekly:50,appeal:.14,description:'Landscaped planters, pergolas, outdoor dining and a quiet seating terrace.'},
] as const;
export type MallFacility=typeof MALL_FACILITIES[number]['id'];
export const SHOP_TYPES=[
 {id:'barber',name:'Barber shop',rent:180,fitout:450,color:'#4b6870'},
 {id:'bakery',name:'Bakery & coffee',rent:220,fitout:650,color:'#ae7952'},
 {id:'fashion',name:'Clothing boutique',rent:240,fitout:550,color:'#947482'},
 {id:'electronics',name:'Electronics shop',rent:280,fitout:800,color:'#4e6589'},
 {id:'pharmacy',name:'Pharmacy',rent:260,fitout:700,color:'#668473'},
 {id:'grocer',name:'Local grocer',rent:210,fitout:600,color:'#748653'},
 {id:'florist',name:'Florist',rent:170,fitout:400,color:'#b28475'},
 {id:'books',name:'Bookshop',rent:190,fitout:450,color:'#86684d'},
 {id:'cafe',name:'Coffee house',rent:260,fitout:850,color:'#806b50'},
 {id:'restaurant',name:'Restaurant',rent:340,fitout:1200,color:'#a46750'},
 {id:'dessert',name:'Dessert & ice cream',rent:240,fitout:750,color:'#b88793'},
 {id:'toys',name:'Toys & games',rent:230,fitout:650,color:'#c29854'},
 {id:'sports',name:'Sports store',rent:270,fitout:750,color:'#657b8b'},
 {id:'home',name:'Home & living',rent:290,fitout:900,color:'#9a8470'},
 {id:'beauty',name:'Beauty salon',rent:250,fitout:800,color:'#a68d96'},
] as const;
export type ShopType=typeof SHOP_TYPES[number]['id'];
export type PlazaApplicant={id:number;unit:number;name:string;rate:number;expiresAt:number;term?:MallTerm};
export type PlazaState={depth?:MallDepth;version:2;openFloors:number;autoLease:boolean;leasesSigned:number;applications:PlazaApplicant[];nextApplicant:number;enquiryTimer:number;footfall:number;facilities:MallFacility[];operatingWeek:number};
export const shopType=(id?:string)=>SHOP_TYPES.find(t=>t.id===id)??SHOP_TYPES[0];
export const plazaUnitName=(index:number)=>`Shop ${Math.floor(index/SHOPS_PER_FLOOR)+1}0${index%SHOPS_PER_FLOOR+1}`;
export function newPlazaUnit(index:number):VenueUnit{const type=shopType(MALL_FLOORS[Math.floor(index/SHOPS_PER_FLOOR)]?.shops[index%SHOPS_PER_FLOOR]);return {occupied:false,dirty:false,remaining:0,seed:index*19+7,rentWeek:0,shopType:type.id,rate:type.rent,condition:100,cleanliness:100};}
/** The old park account keeps its ID, cash, debt, payroll and historical books. */
export function ensurePlaza(p:Property,b:Business):Business{
 if(p.kind!=='plaza'||!b.venue)return b;
 if(b.plaza)return ensureMallDepth(b.plaza.version===2?b:{...b,plaza:{...b.plaza,version:2,facilities:[],operatingWeek:0}});
 return ensureMallDepth({...b,plaza:{version:2,openFloors:1,autoLease:false,leasesSigned:0,applications:[],nextApplicant:1,enquiryTimer:3,footfall:0,facilities:[],operatingWeek:0},venue:{...b.venue,visitors:[],units:Array.from({length:SHOPS_PER_FLOOR},(_,i)=>newPlazaUnit(i))}});
}
export const mallWeeklyUpkeep=(b:Business)=>(b.plaza?.openFloors??1)*18+MALL_FACILITIES.filter(f=>b.plaza?.facilities.includes(f.id)).reduce((n,f)=>n+f.weekly*(b.plaza?.depth?.paused.includes(f.id)?.25:1),0);
export const mallAppeal=(b:Business)=>1+MALL_FACILITIES.filter(f=>b.plaza?.facilities.includes(f.id)).reduce((n,f)=>n+f.appeal*mallFacilityCoverage(b,f.id),0);
export const plazaFloorCost=(b:Business)=>4000+2500*(b.plaza?.openFloors??1);
export const plazaFloorMilestone=(b:Business)=>SHOPS_PER_FLOOR*(b.plaza?.openFloors??1);
const now=(b:Business,week:number)=>(week-1)*180+(b.venue?.clock??0);
function income(b:Business,week:number,day:number,label:string,amount:number):Business{
 return {...b,cash:b.cash+amount,books:b.books?{...b.books,revenue:b.books.revenue+amount}:undefined,venue:{...b.venue!,week:{...b.venue!.week,revenue:b.venue!.week.revenue+amount},totalRevenue:b.venue!.totalRevenue+amount},ledger:[...b.ledger,{week,day,label,amount}].slice(-60)};
}
function spend(b:Business,week:number,day:number,label:string,amount:number,category:'upgrades'|'maintenance'):Business{
 return {...b,cash:b.cash-amount,spending:b.spending+amount,books:b.books?{...b.books,[category]:b.books[category]+amount}:undefined,ledger:[...b.ledger,{week,day,label,amount:-amount}].slice(-60)};
}
export function startPlazaWeek(b:Business,week:number):Business{
 b=startMallDepthWeek(b,week);const d=b.plaza!.depth!,tenants={...d.tenants};
 const units=b.venue!.units.map((u,i)=>{
  if(u.ownerCompany||!u.occupied||(u.leaseEnd??Infinity)>week)return u;
  const renewal=tenants[i]?.renewal;
  if(renewal?.accepted){tenants[i]={...tenants[i],term:renewal.term,renewal:undefined,renewed:week};return {...u,rent:renewal.rate,leaseEnd:week+renewal.term};}
  return {...u,occupied:false,dirty:true,tenantName:undefined,rent:undefined,cleanliness:45};
 });
 let next:Business={...b,plaza:{...b.plaza!,applications:[],depth:{...d,tenants}},venue:{...b.venue!,units}};
 if(next.plaza!.operatingWeek!==week){next=payMallUpkeep(next,week,1,true);next={...next,plaza:{...next.plaza!,operatingWeek:week}};}
 for(let i=0;i<units.length;i++)next=mallAccrueRent(next,i,week,1);
 return next;
}
export function plazaLeaseBlocker(b:Business,app:PlazaApplicant,week:number):string|null{
 const u=b.venue?.units[app.unit];
 if(!b.venue?.running)return 'Start the week to sign leases.';
 if(!u||u.occupied)return 'This shop is already leased.';
 if(app.expiresAt<=now(b,week))return 'This application has expired.';
 if(u.dirty||(u.cleanliness??100)<60)return 'Clean this shop before handover.';
 if((u.condition??100)<65)return 'Repair this shop before handover.';
 return null;
}
function signLease(b:Business,app:PlazaApplicant,week:number,day:number):Business{
 if(plazaLeaseBlocker(b,app,week))return b;
 const term=app.term??8,d=b.plaza!.depth!;
 const tenantTrading={...b.tenantTrading};delete tenantTrading[app.unit];
 const next:Business={...b,tenantTrading,plaza:{...b.plaza!,leasesSigned:b.plaza!.leasesSigned+1,applications:b.plaza!.applications.filter(a=>a.unit!==app.unit),depth:{...d,tenants:{...d.tenants,[app.unit]:{health:75,term,turnoverPercent:d.newTurnoverPercent??0}}}},venue:{...b.venue!,units:b.venue!.units.map((u,i)=>i===app.unit?{...u,occupied:true,tenantName:app.name,rent:app.rate,rentWeek:week-1,leaseEnd:week+term}:u),totalServed:b.venue!.totalServed+1,week:{...b.venue!.week,served:b.venue!.week.served+1}}};
 return mallAccrueRent(next,app.unit,week,day,true);
}
export function plazaCareBlocker(p:Property,b:Business,index:number,repair=false):string|null{
 const u=b.venue?.units[index];if(!u)return 'Shop unavailable.';
 if(repair?(u.condition??100)>=100:!u.dirty&&(u.cleanliness??100)>=100)return repair?'No repairs needed.':'Already clean.';
 if(repair&&b.cash<15)return 'Needs $15 in this plaza’s account.';
 const item=businessSupplies(p,b)[repair?1:0];return item.quantity<2?`Order ${item.name.toLowerCase()}.`:null;
}
function care(p:Property,b:Business,index:number,week:number,day:number,repair=false):Business{
 if(plazaCareBlocker(p,b,index,repair))return b;
 const supplied=consumeBusinessSupplies(p,b,{[repair?'stock-1':'stock-0']:2});if(!supplied)return b;
 let next={...supplied,venue:{...b.venue!,units:b.venue!.units.map((u,i)=>i!==index?u:repair?{...u,condition:100}:{...u,dirty:false,cleanliness:100})}};
 if(repair)next=spend(next,week,day,`${plazaUnitName(index)} repaired`,15,'maintenance') as typeof next;
 return next;
}
export type PlazaAction={type:'rate';unit:number;rate:number}|{type:'fitout';unit:number;shop:ShopType}|{type:'accept'|'decline';id:number}|{type:'clean'|'repair';unit:number}|{type:'floor';floor:number}|{type:'facility';facility:MallFacility}|{type:'auto';enabled:boolean};
export function managePlaza(state:ExpansionState,id:string,action:PlazaAction):ExpansionState{
 const p=propertyById(id),old=state.businesses[id];if(!p||p.kind!=='plaza'||!old)return state;
 let b=ensurePlaza(p,old);if(!b.plaza||!b.venue)return state;
 const refuse=(notice:string)=>({...state,notice});let note='Mall updated.';
 if(action.type==='auto'){b={...b,plaza:{...b.plaza,autoLease:action.enabled}};note=action.enabled?'Leasing assistant will sign ready applicants at their quoted rent.':'Choose and accept tenants yourself.';}
 else if(action.type==='facility'){
  const facility=MALL_FACILITIES.find(f=>f.id===action.facility);if(!facility||b.plaza.facilities.includes(facility.id))return state;
  if(facility.floor>=b.plaza.openFloors)return refuse('Open this floor before building its facility.');
  if(b.venue.running)return refuse('Build facilities between weeks.');
  if(b.cash<facility.cost)return refuse(`This facility needs $${facility.cost} from the mall account.`);
  b=spend({...b,plaza:{...b.plaza,facilities:[...b.plaza.facilities,facility.id]}},state.week,state.day,facility.name+' construction',facility.cost,'upgrades');note=`${facility.name} is open. Upkeep of $${facility.weekly} per week starts next week.`;
 }
 else if(action.type==='floor'){
  if(b.plaza.openFloors>=PLAZA_FLOORS||action.floor!==b.plaza.openFloors+1)return state;
  if(b.venue.running)return refuse('Open additional floors between weeks.');
  const unmet=mallFloorChecks(p,b,state).find(c=>!c.met);if(unmet)return refuse(unmet.label+' · '+unmet.value);
  const cost=plazaFloorCost(b);if(b.cash<cost)return refuse(`This floor needs $${cost} from the plaza account.`);
  const count=b.venue.units.length;b=spend({...b,plaza:{...b.plaza,openFloors:b.plaza.openFloors+1,depth:{...b.plaza.depth!,zones:[...b.plaza.depth!.zones,{cleanliness:100,condition:100,safety:100}],floorFootfall:[...b.plaza.depth!.floorFootfall,0]}},venue:{...b.venue,units:[...b.venue.units,...Array.from({length:SHOPS_PER_FLOOR},(_,i)=>newPlazaUnit(count+i))]}},state.week,state.day,'Shopping floor construction & fit-out',cost,'upgrades');note='Four new shop units are ready to lease on the next floor.';
 }else if(action.type==='accept'||action.type==='decline'){
  const app=b.plaza.applications.find(a=>a.id===action.id);if(!app)return state;
  if(action.type==='accept'){const blocker=plazaLeaseBlocker(b,app,state.week);if(blocker)return refuse(blocker);b=signLease(b,app,state.week,state.day);note=`${app.name} signed a ${app.term??8}-week lease. First week rent received.`;}
  else {b={...b,plaza:{...b.plaza,applications:b.plaza.applications.filter(a=>a.id!==app.id)}};note='Application declined. New enquiries can arrive.';}
 }else if('unit' in action){
  const u=b.venue.units[action.unit];if(!u)return state;
  if(action.type==='rate'){
   const base=shopType(u.shopType).rent;if(!Number.isFinite(action.rate)||action.rate<base*.5||action.rate>base*3)return refuse(`Choose weekly rent between $${base*.5} and $${base*3}.`);
   b={...b,venue:{...b.venue,units:b.venue.units.map((v,i)=>i===action.unit?{...v,rate:Math.round(action.rate)}:v)}};note='Asking rent updated. Signed leases and existing applications keep their agreed rate.';
  }else if(action.type==='fitout'){
   const type=SHOP_TYPES.find(t=>t.id===action.shop);if(!type||type.id===u.shopType)return state;
   if(u.occupied)return refuse('Wait for the tenant’s lease to end before changing shop type.');
   if(b.cash<type.fitout)return refuse(`The fit-out needs $${type.fitout}.`);
   b=spend({...b,plaza:{...b.plaza,applications:b.plaza.applications.filter(a=>a.unit!==action.unit)},venue:{...b.venue,units:b.venue.units.map((v,i)=>i===action.unit?{...v,shopType:type.id,rate:type.rent,condition:100,cleanliness:100,dirty:false}:v)}},state.week,state.day,`${plazaUnitName(action.unit)} · ${type.name} fit-out`,type.fitout,'upgrades');note='Shop layout and asking rent updated.';
  }else {const repair=action.type==='repair',blocker=plazaCareBlocker(p,b,action.unit,repair);if(blocker)return refuse(blocker);b=care(p,b,action.unit,state.week,state.day,repair);note=repair?'Shop repaired using plaza supplies.':'Shop cleaned using plaza supplies.';}
 }
 return {...state,businesses:{...state.businesses,[id]:b},notice:note};
}
export function advancePlaza(p:Property,old:Business,delta:number,week:number,day:number,demand=1):Business{
 if(!old.venue?.running||!old.plaza||delta<=0)return old;
 const dt=Math.min(delta,180-old.venue.clock);if(dt<=0)return old;
 const wage=businessWages(p,old)*dt/180,clock=old.venue.clock+dt;
 let b:Business={...old,plaza:{...old.plaza,enquiryTimer:old.plaza.enquiryTimer-dt*demand,applications:old.plaza.applications.filter(a=>a.expiresAt>(week-1)*180+clock)},venue:{...old.venue,clock,careTimer:old.venue.careTimer+dt,serviceTimer:old.venue.serviceTimer+dt,units:old.venue.units.map(u=>u.occupied?{...u,condition:Math.max(0,(u.condition??100)-dt*.035),cleanliness:Math.max(0,(u.cleanliness??100)-dt*.15)}:u),week:{...old.venue.week,wages:old.venue.week.wages+wage}},books:old.books?{...old.books,wagesAccrued:old.books.wagesAccrued+wage}:undefined};
 if(b.plaza!.enquiryTimer<=0&&clock<170){
  const vacant=b.venue!.units.map((u,i)=>({u,i})).filter(({u,i})=>!u.occupied&&!b.plaza!.applications.some(a=>a.unit===i));
  const serial=b.plaza!.nextApplicant,slot=vacant[serial%Math.max(1,vacant.length)];
  const applications=[...b.plaza!.applications];
  if(slot){const type=shopType(slot.u.shopType),rate=slot.u.rate??type.rent,demand=Math.exp(-2.3*Math.max(0,rate/type.rent-1));if((serial*37%100)/100<demand)applications.push({id:serial,unit:slot.i,name:`${['Oak & Co.','Bright Corner','The Local','Maple Lane','Parkview','Cedar House'][serial%6]} ${type.name}`,rate,term:b.plaza!.depth?.term??8,expiresAt:now(b,week)+65});}
  b={...b,plaza:{...b.plaza!,nextApplicant:serial+1,enquiryTimer:14/((1+(b.hires?.service??0)*.25)*mallAppeal(b)),applications}};
 }
 const crew=ensureCrew(p,b),hour=(8+clock*7*24/180)%24,service=crewPower(crew,'service',hour,1),carePower=crewPower(crew,'care',hour,1);
 if(b.plaza!.autoLease&&service>0&&b.venue!.serviceTimer>=8/service){const app=b.plaza!.applications.find(a=>!plazaLeaseBlocker(b,a,week));if(app)b=signLease(b,app,week,day);b={...b,venue:{...b.venue!,serviceTimer:0}};}
 if(carePower>0&&b.venue!.careTimer>=16/carePower){
  const dirty=b.venue!.units.findIndex((u,i)=>(u.dirty||(u.cleanliness??100)<75)&&crewPower(crew,'care',hour,1,Math.floor(i/4))>0);if(dirty>=0)b=care(p,b,dirty,week,day);
  const broken=b.venue!.units.findIndex((u,i)=>(u.condition??100)<65&&crewPower(crew,'maintenance',hour,0,Math.floor(i/4))>0);if(broken>=0)b=care(p,b,broken,week,day,true);
  b={...b,venue:{...b.venue!,careTimer:0}};
 }
 const units=b.venue!.units;return advanceMallDepth(p,{...b,condition:Math.round(units.reduce((n,u)=>n+(u.condition??100),0)/units.length)},dt,week,day,demand);
}
