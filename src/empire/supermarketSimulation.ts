import {crewPower,ensureCrew} from '../career/crew';
const team=(b:Business,role:string,base=0,zone=-1)=>crewPower(ensureCrew(propertyById('shop')!,b),role,(8+(b.venue?.clock??0)*7*24/180)%24,base+(b.hires?.[role]??0),zone);
import {supermarketTravelSeconds} from './supermarketLayout';
import type {Business,Property} from '../prototype/expansionModel';
import {businessWages,propertyById} from '../prototype/expansionModel';
import {retailProduct,retailProductFloor,retailPrice,consumeRetailStock,retailStockLevel,retailItemValue} from './retail';
import {recordStockUse,stockDay} from '../inventory/stockroom';
import {STORE_LEVELS,basketQuantity,shelfQuantity,backroomQuantity,productUnlocked,department,coldProduct,metric,replenishShelf,receiveStoreGoods,recordStoreSale,dispatchStoreDelivery,largeAppliance,storeLevel} from './supermarket';
import type {StoreEvent} from './supermarket';
import type {VenueVisitor} from './venueSimulation';

export function storeServiceBlocker(b:Business,id?:number){
 if(!b.venue?.running)return 'Start the week to welcome shoppers';
 const person=b.venue.visitors.find(v=>v.state==='waiting'&&(id===undefined?v.basket:id===v.id))??b.venue.visitors.find(v=>v.state==='waiting'&&id===undefined);if(!person)return 'Waiting for shoppers';
 if(!person.basket)return person.productId&&backroomQuantity(b,person.productId)>0?'Shopper is browsing · stock assistant refills empty shelves':'Shopper is collecting products · check shelves and incoming deliveries';
 if((person.checkoutReadyAt??0)>b.venue.clock)return 'Shopper is walking to checkout';
 if((b.retail!.stock[person.productId!]??0)<(person.quantity??1))return 'Basket stock expired · customer needs a replacement';
 return null;
}
export function checkoutStore(b:Business,week:number,day:number,id?:number):Business{
 if(!b.venue?.running)return b;const person=b.venue.visitors.find(v=>v.state==='waiting'&&v.basket&&(v.checkoutReadyAt??0)<=b.venue!.clock&&(id===undefined||v.id===id));if(!person||storeServiceBlocker(b,person.id))return b;
 const key=person.productId!,qty=person.quantity??1,sale=Math.round((person.agreedRate??retailPrice(b,key))*qty*100)/100,v=b.venue;
 const retail=consumeRetailStock(b.retail!,key,qty);
 let next:Business={...b,cash:b.cash+sale,condition:Math.max(0,b.condition-.3),retail,stock:retailStockLevel(retail),stockroom:b.stockroom?recordStockUse({...b.stockroom,batches:retail.batches},key,qty):undefined,books:b.books?{...b.books,revenue:b.books.revenue+sale}:undefined,ledger:[...b.ledger,{week,day,label:`Checkout #${person.id} · ${retailProduct(key)!.name}`,amount:sale}].slice(-60),venue:{...v,visitors:v.visitors.map(g=>g.id===person.id?{...g,state:'using',remaining:5,basket:false}:g),week:{...v.week,revenue:v.week.revenue+sale,served:v.week.served+1},totalRevenue:v.totalRevenue+sale,totalServed:v.totalServed+1}};
 return recordStoreSale(next,b,key,qty,sale,Math.max(0,v.clock-(person.queueAt??v.clock)),stockDay(week,day));
}
export function collectStoreBasket(b:Business,id:number,manual=false):Business{
 const person=b.venue?.visitors.find(v=>v.id===id&&v.state==='waiting'&&!v.basket);if(!person?.productId||!b.retail?.store)return b;
 const travel=supermarketTravelSeconds(b,person.productId);if((person.shoppingTime??0)<travel.browse)return b;
 const key=person.productId,qty=person.quantity??1,electronic=retailProductFloor(key)===1;
 if(!manual&&electronic&&!team(b,'electronics',0,1))return b;
 if(!manual&&department(key)==='Meat & fish'&&!team(b,'specialist',0,0)&&(person.shoppingTime??0)<16)return b;
 if(coldProduct(key)&&b.retail.store.events.some(e=>e.kind==='fridge'&&!e.resolved))return b;
 if((electronic?backroomQuantity(b,key):shelfQuantity(b,key))<qty)return b;
 return {...b,retail:{...b.retail,store:{...b.retail.store,shelf:electronic?b.retail.store.shelf:{...b.retail.store.shelf,[key]:shelfQuantity(b,key)-qty}}},venue:{...b.venue!,visitors:b.venue!.visitors.map(v=>v.id===id?{...v,basket:true,checkoutReadyAt:b.venue!.clock+travel.checkout,queueAt:b.venue!.clock,agreedRate:retailPrice(b,key)}:v)}};
}
function storeEvents(b:Business,week:number,day:number):Business{
 const date=stockDay(week,day),st=b.retail!.store!;if(st.lastEventDay===date)return b;
 let next={...b,retail:{...b.retail!,store:{...st,lastEventDay:date}}};const live=st.events.filter(e=>!e.resolved),serial=st.serial+1;let event:StoreEvent|undefined;
 if(storeLevel(b)>=2&&date%11===3&&!live.some(e=>e.kind==='fridge'))event={id:serial,kind:'fridge',title:'Refrigerator fault · cold sales paused; repair for $60 before tomorrow to avoid waste.',day:date,until:date+1};
 else if(date%13===4&&b.stockroom?.orders.length){event={id:serial,kind:'delay',title:'Supplier delay · today’s outstanding shipments will arrive one morning later.',day:date,until:date+1};next={...next,stockroom:{...b.stockroom,orders:b.stockroom.orders.map(o=>({...o,dueDay:o.dueDay+1}))}};}
 else if(date%9===2)event={id:serial,kind:'rush',title:'Neighborhood promotion · 50% more shoppers today. Watch queues and shelf stock.',day:date,until:date+1};
 else if(storeLevel(b)>=5&&date%7===5){const sale=[...st.sales].reverse().find(s=>!s.returned&&retailProductFloor(s.item)===1&&date-s.day<=7&&!st.events.some(e=>e.saleId===s.id));if(sale)event={id:serial,kind:'return',title:`Sealed ${retailProduct(sale.item)!.name.toLowerCase()} returned · refund $${sale.price.toFixed(2)} or decline.`,saleId:sale.id,day:date,until:date+7};}
 if(event)next={...next,retail:{...next.retail,store:{...next.retail.store,serial,events:[...st.events,event].slice(-30)}}};
 for(const ev of next.retail.store.events){
  if(ev.resolved||ev.until>date)continue;
  if(ev.kind==='fridge'){
   for(const item of next.retail.shelves.filter(coldProduct)){const qty=Math.min(next.retail.stock[item]??0,Math.max(1,Math.floor((next.retail.stock[item]??0)*.25)));if(!qty)continue;const r=consumeRetailStock(next.retail,item,qty),loss=retailItemValue(next.retail,item)-retailItemValue(r,item);next=metric({...next,retail:r,stockroom:next.stockroom?{...next.stockroom,batches:r.batches,spoilage:(next.stockroom.spoilage??0)+loss}:undefined},item,{waste:loss}) as typeof next;}
   next={...next,retail:{...next.retail,store:{...next.retail.store,events:next.retail.store.events.map(e=>e.id===ev.id?{...e,until:date+1}:e)}}};
  }else if(ev.kind!=='return')next={...next,retail:{...next.retail,store:{...next.retail.store,events:next.retail.store.events.map(e=>e.id===ev.id?{...e,resolved:'Finished'}:e)}}};
 }
 return next;
}
export function advanceSupermarket(p:Property,b:Business,delta:number,week:number,day:number,demand=1):Business{
 if(!b.venue?.running||!b.retail?.store||delta<=0)return b;const dt=Math.min(delta,180-b.venue.clock);if(dt<=0)return b;
 let next=storeEvents(b,week,day),st=next.retail!.store!,v=next.venue!;
 const visitors:VenueVisitor[]=[];let lost=0;
 for(const old of v.visitors){let person={...old};if(person.state==='waiting'){
   person.patience-=dt;person.shoppingTime=(person.shoppingTime??0)+dt;
   if(person.patience<=0){lost++;next=metric(next,person.productId!,{stockouts:!person.basket&&(retailProductFloor(person.productId!)?backroomQuantity(next,person.productId!):shelfQuantity(next,person.productId!))<(person.quantity??1)?1:0});continue;}
   // Spoiled stock cannot stay reserved in an unpaid basket.
   if(person.basket&&(next.retail!.stock[person.productId!]??0)<basketQuantity(next,person.productId!))person.basket=false;
  }else{person.remaining-=dt;if(person.remaining<=0){if(person.state==='leaving')continue;person={...person,state:'leaving',remaining:8};}}
  visitors.push(person);
 }
 const rush=st.events.some(e=>e.kind==='rush'&&e.until>stockDay(week,day));
 v={...v,clock:v.clock+dt,visitors,arrivalTimer:v.arrivalTimer-dt*demand*(rush?1.5:1),serviceTimer:v.serviceTimer+dt,week:{...v.week,lost:v.week.lost+lost,wages:v.week.wages+businessWages(p,next)*dt/180}};
 next={...next,venue:v,books:next.books?{...next.books,wagesAccrued:next.books.wagesAccrued+businessWages(p,next)*dt/180}:undefined};
 const range=next.retail!.shelves.filter(id=>productUnlocked(next,id));
 if(v.arrivalTimer<=0&&v.clock<170&&range.length){
  const serial=v.serial+1,key=range[(serial-1)%range.length],ratio=retailPrice(next,key)/retailProduct(key)!.price;
  const wanted=(serial*37%100)/100<Math.exp(-2.5*Math.max(0,ratio-1));
  next={...next,venue:{...v,serial,arrivalTimer:Math.max(2,5-(storeLevel(next)-1)*.4)*(next.condition<35?1.6:1),visitors:wanted&&visitors.filter(p=>p.state==='waiting').length<12?[...visitors,{id:serial,seed:serial*17,state:'waiting',patience:50,unit:null,remaining:0,productId:key,quantity:retailProductFloor(key)?1:1+serial%3,shoppingTime:0}]:visitors}};
 }
 st=next.retail!.store!;
 const replenish=st.replenishTimer+dt,receiving=st.receivingTimer+dt,delivery=st.deliveryTimer+dt;
 next={...next,retail:{...next.retail!,store:{...st,replenishTimer:replenish,receivingTimer:receiving,deliveryTimer:delivery,jobProgress:Math.min(1,(st.jobProgress??0)+dt/4)}}};
 if(receiving>=6/(team(next,'care',1,0)+team(next,'receiving',0,0)*2)){next=receiveStoreGoods(next);next={...next,retail:{...next.retail!,store:{...next.retail!.store!,receivingTimer:0}}};}
 if(replenish>=6/team(next,'care',1,0)){next=replenishShelf(next);next={...next,retail:{...next.retail!,store:{...next.retail!.store!,replenishTimer:0}}};}
 for(const person of next.venue!.visitors.filter(v=>v.state==='waiting'&&!v.basket&&(v.shoppingTime??0)>=10))next=collectStoreBasket(next,person.id);
 const staffedLanes=Math.min(storeLevel(next)>=3?2:1,team(next,'service',1,0))+(next.retail!.electronicsUnlocked?Math.min(1,team(next,'electronics',0,1)):0);
 if(next.venue!.serviceTimer>=8/staffedLanes){next=checkoutStore(next,week,day);next={...next,venue:{...next.venue!,serviceTimer:0}};}
 if(team(next,'handling',0,1)>0&&delivery>=10/team(next,'handling',0,1)){next=dispatchStoreDelivery({week,day,businesses:{shop:next},loans:[],payroll:[],report:[],notice:''},'shop').businesses.shop;next={...next,retail:{...next.retail!,store:{...next.retail!.store!,deliveryTimer:0}}};}
 if(team(next,'cleaner')>0)next={...next,condition:Math.min(100,next.condition+dt*team(next,'cleaner')*.12)};
 const due=next.retail!.store!.serviceDue+STORE_LEVELS[storeLevel(next)-1].upkeep*dt/180,paid=Math.min(Math.max(0,next.cash),due),expense=due-next.retail!.store!.serviceDue;
 return {...next,cash:next.cash-paid,retail:{...next.retail!,store:{...next.retail!.store!,serviceDue:due-paid}},books:next.books?{...next.books,maintenance:next.books.maintenance+expense}:undefined};
}
