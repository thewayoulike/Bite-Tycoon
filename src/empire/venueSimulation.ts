import {Business,businessSupplies,businessWages,ExpansionState,Property,propertyById,autoStockBusiness} from '../prototype/expansionModel';
import {retailPrice,retailProduct,retailStockLevel} from './retail';
import {offersFor,offerPrice,offerEnabled,unitOffer} from './businessOffers';
import {isLodging,roomsPerFloor,newLodgingUnit,ensureLodging,manageLodging,absoluteTime} from './lodging';
import type {RoomType} from './lodging';
import {advanceLodging,lodgingBlocker,serveLodging} from './lodgingSimulation';

export type VenueVisitor={id:number;seed:number;state:'waiting'|'using'|'leaving';patience:number;remaining:number;unit:number|null;productId?:string;quantity?:number;offerId?:string;bookingId?:number;agreedRate?:number};
export type VenueUnit={occupied:boolean;dirty:boolean;remaining:number;seed:number;rentWeek:number;rent?:number;type?:RoomType;rate?:number;condition?:number;cleanliness?:number;level?:number;bookingId?:number;checkoutAt?:number;leaseEnd?:number};
export type VenueState={running:boolean;clock:number;arrivalTimer:number;serviceTimer:number;careTimer:number;serial:number;visitors:VenueVisitor[];units:VenueUnit[];week:{revenue:number;served:number;lost:number;wages:number};totalServed:number;totalRevenue:number};
export type VenueAction='serve'|'clean';
export const VENUE_RULES={
  hotel:{rate:85,arrival:11,patience:32,stay:32,verb:'Check in',noun:'guests'},
  apartments:{rate:180,arrival:22,patience:45,stay:6,verb:'Sign lease',noun:'applicants'},
  shop:{rate:24,arrival:5,patience:24,stay:4,verb:'Checkout',noun:'shoppers'},
  park:{rate:12,arrival:5,patience:28,stay:12,verb:'Serve kiosk',noun:'visitors'},
};
export const isVenue=(p:Property)=>p.kind in VENUE_RULES;
export const venueRules=(p:Property)=>VENUE_RULES[p.kind as keyof typeof VENUE_RULES];
export function createVenue(p:Property):VenueState {
  return {running:false,clock:0,arrivalTimer:2,serviceTimer:0,careTimer:0,serial:0,visitors:[],units:Array.from({length:isLodging(p)?roomsPerFloor(p):0},()=>newLodgingUnit(p)),week:{revenue:0,served:0,lost:0,wages:0},totalServed:0,totalRevenue:0};
}
const priceFactor=(b:Business)=>({value:.85,standard:1,premium:1.3}[b.price]);
function record(b:Business,week:number,day:number,label:string,amount:number):Business {
  return {...b,cash:b.cash+amount,books:b.books?{...b.books,revenue:b.books.revenue+amount}:undefined,ledger:[...b.ledger,{week,day,label,amount}].slice(-60)};
}
function consume(p:Property,b:Business,amounts:number[]):Business|null {
  const items=businessSupplies(p,b);
  if(items.some((item,i)=>item.quantity<amounts[i]))return null;
  const inventory=Object.fromEntries(items.map((item,i)=>[item.id,item.quantity-amounts[i]]));
  return {...b,inventory,stock:Math.min(...Object.values(inventory))};
}
export function startVenueWeek(p:Property,b:Business,week:number):Business {
  b=ensureLodging(p,b);
  const previous=b.venue??createVenue(p);
  if(previous.running)return b;
  let venue:VenueState={...previous,running:true,clock:0,arrivalTimer:2,serviceTimer:0,careTimer:0,week:{revenue:0,served:0,lost:0,wages:0},visitors:previous.visitors.filter(v=>v.state==='using')};
  let next={...b,venue};
  if(p.kind==='apartments'){
    const rent=venue.units.reduce((n,u,i)=>n+(u.occupied&&u.rentWeek<week?Math.round(u.rent??u.rate??offerPrice(b,unitOffer(p,i))):0),0);
    if(rent){
      next=record(next,week,1,'Weekly tenant rents collected',rent) as typeof next;
      venue={...venue,units:venue.units.map(u=>u.occupied?{...u,rentWeek:week}:u),week:{...venue.week,revenue:rent},totalRevenue:venue.totalRevenue+rent};
    }
  }
  return {...next,venue,...(b.lodging?{lodging:{...b.lodging,occupiedSeconds:0,availableSeconds:0,roomRevenue:p.kind==='apartments'?venue.week.revenue:0,roomNights:p.kind==='apartments'?venue.units.filter(u=>u.occupied).length:0}}:{})};
}
export function serviceBlocker(p:Property,b:Business,visitorId?:number):string|null {
  if(isLodging(p))return lodgingBlocker(p,ensureLodging(p,b),visitorId);
  const v=b.venue;
  if(!v?.running)return 'Start the week to welcome visitors';
  const person=v.visitors.find(person=>person.state==='waiting'&&(visitorId===undefined||person.id===visitorId));
  if(!person)return 'Waiting for arrivals';
  if(b.condition<15)return 'Maintenance needed';
  if(b.retail){if(!person.productId||(b.retail.stock[person.productId]??0)<(person.quantity??1))return `Out of ${retailProduct(person.productId??'')?.name??'stock'} · order more`;}
  else if(businessSupplies(p,b).some((item,i)=>item.quantity<[2,1,1][i]))return 'Order supplies to continue';
  if(v.units.length&&!v.units.some((u,i)=>!u.occupied&&!u.dirty&&offerEnabled(b,unitOffer(p,i).id)&&(!person.offerId||unitOffer(p,i).id===person.offerId)))return p.kind==='hotel'?'No ready rooms · clean a vacant room':'No vacant homes';
  return null;
}
export function serveVenueVisitor(p:Property,b:Business,week:number,day:number,visitorId?:number):Business {
  if(isLodging(p))return serveLodging(p,ensureLodging(p,b),week,day,visitorId);
  if(serviceBlocker(p,b,visitorId))return b;
  const person=b.venue!.visitors.find(v=>v.state==='waiting'&&(visitorId===undefined||visitorId===v.id));
  if(!person)return b;
  const retail=b.retail&&person.productId?{...b.retail,stock:{...b.retail.stock,[person.productId]:b.retail.stock[person.productId]-(person.quantity??1)}}:undefined;
  const supplied=retail?{...b,retail,stock:retailStockLevel(retail)}:consume(p,b,[2,1,1]);if(!supplied)return b;
  const rules=venueRules(p),v=b.venue!,unit=v.units.length?v.units.findIndex((u,i)=>!u.occupied&&!u.dirty&&offerEnabled(b,unitOffer(p,i).id)&&(!person.offerId||unitOffer(p,i).id===person.offerId)):null;
  const offer=unit!==null?unitOffer(p,unit):offersFor(p).find(item=>item.id===person.offerId);
  const sale=retail?Math.round(retailPrice(b,person.productId!)*(person.quantity??1)*100)/100:Math.round((offer?offerPrice(b,offer):rules.rate));
  const duration=rules.stay+person.seed%8;
  const venue:VenueState={...v,visitors:v.visitors.map(guest=>guest.id===person.id?{...guest,state:'using',remaining:duration,unit}:guest),
    units:v.units.map((u,i)=>i===unit?{...u,occupied:true,remaining:duration,seed:person.seed,rentWeek:week,rent:sale}:u),
    week:{...v.week,served:v.week.served+1,revenue:v.week.revenue+sale},totalServed:v.totalServed+1,totalRevenue:v.totalRevenue+sale};
  return record({...supplied,venue,condition:Math.max(0,b.condition-.65)},week,day,`${rules.verb} #${person.id}`,sale);
}
export function cleanVenueUnit(p:Property,b:Business,index?:number):Business {
  const v=b.venue;if(!v)return b;
  const target=index??v.units.findIndex(u=>u.dirty);
  if(target<0||!v.units[target]?.dirty)return b;
  const supplied=consume(p,b,[0,0,2]);if(!supplied)return b;
  return {...supplied,condition:Math.min(100,b.condition+4),venue:{...v,units:v.units.map((u,i)=>i===target?{...u,dirty:false}:u)}};
}
export function operateVenue(state:ExpansionState,id:string,action:VenueAction,visitorOrUnit?:number):ExpansionState {
  const p=propertyById(id),b=state.businesses[id];if(!p||!b||!isVenue(p))return state;
  if(isLodging(p)&&action==='clean'){const unit=visitorOrUnit??b.venue?.units.findIndex(u=>u.dirty)??-1;return manageLodging(state,id,{type:p.kind==='apartments'?'repair':'clean',unit});}
  const next=action==='serve'?serveVenueVisitor(p,b,state.week,state.day,visitorOrUnit):cleanVenueUnit(p,b,visitorOrUnit);
  return next===b?state:{...state,businesses:{...state.businesses,[id]:next},notice:action==='serve'?`${p.name}: service completed; payment received in this business’s account.`:`${p.name}: maintenance completed using this property’s supplies.`};
}
export function advanceVenue(p:Property,b:Business,delta:number,week:number,day:number):Business {
  if(isLodging(p))return advanceLodging(p,ensureLodging(p,b),delta,week,day);
  if(!b.venue?.running||delta<=0)return b;
  const dt=Math.min(delta,Math.max(0,180-b.venue.clock));if(!dt)return b;
  const rules=venueRules(p),old=b.venue;
  let lost=0;
  const visitors=old.visitors.flatMap(person=>{
    if(person.state==='waiting'){
      if(person.patience<=dt){lost++;return [];}
      return [{...person,patience:person.patience-dt}];
    }
    if(person.remaining<=dt)return person.state==='leaving'?[]:[{...person,state:'leaving' as const,remaining:4}];
    return [{...person,remaining:person.remaining-dt}];
  });
  const units=old.units.map((u,i)=>{
    if(p.kind==='hotel'&&u.occupied)return u.remaining<=dt?{...u,occupied:false,dirty:true,remaining:0}:{...u,remaining:u.remaining-dt};
    if(p.kind==='apartments'&&u.occupied&&old.clock<80+i*9&&old.clock+dt>=80+i*9)return {...u,dirty:true};
    return u;
  });
  let venue:VenueState={...old,clock:old.clock+dt,arrivalTimer:old.arrivalTimer-dt,serviceTimer:old.serviceTimer+dt,careTimer:old.careTimer+dt,visitors,units,week:{...old.week,lost:old.week.lost+lost,wages:old.week.wages+businessWages(p,b)*dt/180}};
  const hasVacancy=p.kind!=='apartments'||units.some(u=>!u.occupied);
  if(venue.arrivalTimer<=0&&venue.clock<170&&hasVacancy){
    const interval=rules.arrival/(1+b.upgrade*.12)* (b.condition<35?1.6:1);
    venue={...venue,arrivalTimer:interval,serial:venue.serial+1};
    if(visitors.filter(v=>v.state==='waiting').length<6){
      const shelf=b.retail?.shelves,productId=shelf?.[(venue.serial-1)%shelf.length];
      const offers=offersFor(p).filter(item=>offerEnabled(b,item.id)),offer=offers[(venue.serial-1)%Math.max(1,offers.length)];
      const ratio=productId?retailPrice(b,productId)/retailProduct(productId)!.price:offer?offerPrice(b,offer)/offer.price:1;
      const demand=Math.exp(-2.5*Math.max(0,ratio-1));
      if((venue.serial*37%100)/100<demand)venue.visitors=[...visitors,{id:venue.serial,seed:venue.serial*17+p.id.length*31,state:'waiting',patience:rules.patience,remaining:0,unit:null,productId,quantity:productId?1+venue.serial%3:undefined,offerId:offer?.id}];
    }
    else venue.week={...venue.week,lost:venue.week.lost+1};
  }
  let next:Business={...b,venue,books:b.books?{...b.books,wagesAccrued:b.books.wagesAccrued+businessWages(p,b)*dt/180}:undefined};
  if(venue.serviceTimer>=12/(1+(b.hires?.service??0)+b.upgrade*.25)){
    next=serveVenueVisitor(p,next,week,day);
    next={...next,venue:{...next.venue!,serviceTimer:0}};
  }
  if(venue.careTimer>=20/(1+(b.hires?.care??0))){
    next=cleanVenueUnit(p,next);
    if(!units.length&&(b.hires?.care??0)>0)next={...next,condition:Math.min(100,next.condition+2)};
    next={...next,venue:{...next.venue!,careTimer:0}};
  }
  return next;
}
export function advanceVenues(state:ExpansionState,delta:number):ExpansionState {
  let next={...state,businesses:{...state.businesses}};
  for(const [id,b] of Object.entries(state.businesses)){
    const p=propertyById(id)!;if(!isVenue(p))continue;
    next.businesses[id]=advanceVenue(p,b,delta,state.week,state.day);
    next=autoStockBusiness(next,id);
  }
  return next;
}
