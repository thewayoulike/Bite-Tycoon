import {venueStep,venueActivityTime,CALENDAR_WEEK_SECONDS} from './simulationTime';
import {crewPower,ensureCrew} from '../career/crew';
const team=(b:Business,role:string,base=0,zone=-1)=>crewPower(ensureCrew(propertyById('shop')!,b),role,(8+(b.venue?.clock??0)*7*24/180)%24,base+(b.hires?.[role]??0),zone);
import {supermarketTravelSeconds,supermarketBrowseSeconds,supermarketProductPoint} from './supermarketLayout';
import type {Business,Property} from '../prototype/expansionModel';
import {businessWages,propertyById} from '../prototype/expansionModel';
import {retailProduct,retailProductFloor,retailPrice,consumeRetailStock,retailStockLevel,retailItemValue} from './retail';
import {recordStockUse,stockDay} from '../inventory/stockroom';
import {STORE_LEVELS,storeBasket,basketQuantity,shelfQuantity,backroomQuantity,productUnlocked,department,coldProduct,metric,replenishShelf,receiveStoreGoods,recordStoreSale,dispatchStoreDelivery,largeAppliance,storeLevel,recordStoreLoss,STORE_LOSS_LABELS,type StoreLossReason} from './supermarket';
import type {StoreEvent} from './supermarket';
import {STORE_REPAIR_COST,STORE_REPAIR_SECONDS,resolveStoreEvent} from './supermarket';
import type {VenueVisitor,ShoppingItem,BasketItem} from './venueSimulation';

const reachedProduct=(b:Business,p:VenueVisitor)=>p.browseReadyAt!==undefined?venueActivityTime(b.venue!)>=p.browseReadyAt:(p.shoppingTime??0)>=supermarketTravelSeconds(b,p.productId!).browse;
const productWaitSeconds=(b:Business,p:VenueVisitor)=>p.browseReadyAt!==undefined
 ? Math.max(0,venueActivityTime(b.venue!)-p.browseReadyAt)
 : Math.max(0,(p.shoppingTime??0)-supermarketTravelSeconds(b,p.productId!).browse);
const collectableQuantity=(b:Business,id:string)=>retailProductFloor(id)?backroomQuantity(b,id):shelfQuantity(b,id);

// Walking and normal self-service shopping are not time spent waiting for help.
export function storeCollectionBlocker(b:Business,person:VenueVisitor,manual=false):string|null{
 if(!b.venue?.running)return 'Start the week to welcome shoppers';
 if(!person.productId||person.basket||person.state!=='waiting')return 'No product to collect';
 if(!reachedProduct(b,person))return 'Walking to product';
 const key=person.productId;
 if(coldProduct(key)&&b.retail?.store?.events.some(e=>e.kind==='fridge'&&!e.resolved))return STORE_LOSS_LABELS.cold;
 if(collectableQuantity(b,key)<=0)return STORE_LOSS_LABELS[storeWaitReason(b,person)];
 if(!manual&&retailProductFloor(key)&&!team(b,'electronics',0,1))return STORE_LOSS_LABELS.adviser;
 if(!manual&&department(key)==='Meat & fish'&&!team(b,'specialist',0,0)&&(person.shoppingTime??0)<16)return 'Preparing fresh-counter item automatically';
 return null;
}

export function storeShopperHelp(b:Business,person:VenueVisitor){
 if(person.basket)return {label:'Help checkout · optional',blocker:storeServiceBlocker(b,person.id)};
 if(person.productId&&(retailProductFloor(person.productId)||department(person.productId)==='Meat & fish'))return {label:'Help collect · optional',blocker:storeCollectionBlocker(b,person,true)};
 return {label:null,blocker:null};
}

export function storeRepairStatus(b:Business,event:StoreEvent):string {
 if(event.resolved)return 'Repair complete.';
 if(!b.hires?.maintenance)return 'Manual repair available. Hire a maintenance worker in Staff for automatic refrigeration repairs.';
 if(b.cash<STORE_REPAIR_COST)return `Automatic repair waiting for $${STORE_REPAIR_COST} in this supermarket. No charge until the repair finishes.`;
 if(!b.venue?.running)return 'Maintenance worker hired. Automatic repairs start when trading resumes.';
 if(team(b,'maintenance',0,0)<=0)return 'Waiting for an available maintenance worker on the ground floor. Check shifts, breaks and training in Staff.';
 return `Maintenance worker repairing · ${Math.round(100*(event.repairProgress??0)/STORE_REPAIR_SECONDS)}% · $${STORE_REPAIR_COST} charged on completion.`;
}

export function advanceStoreMaintenance(p:Property,b:Business,dt:number,week:number,day:number):Business {
 const event=b.retail?.store?.events.find(e=>e.kind==='fridge'&&!e.resolved);
 if(!event||!b.venue?.running||dt<=0||b.cash<STORE_REPAIR_COST)return b;
 const power=team(b,'maintenance',0,0);if(power<=0)return b;
 const progress=Math.min(STORE_REPAIR_SECONDS,(event.repairProgress??0)+dt*power);
 const next={...b,retail:{...b.retail!,store:{...b.retail!.store!,events:b.retail!.store!.events.map(e=>e.id===event.id?{...e,repairProgress:progress}:e)}}};
 if(progress<STORE_REPAIR_SECONDS-1e-9)return next;
 // Share the manual repair's cash and expense path; resolving twice is a no-op.
 return resolveStoreEvent({week,day,businesses:{[p.id]:next},loans:[],payroll:[],report:[],notice:''},p.id,event.id,true).businesses[p.id];
}
export function storeShopperBasketLabel(b:Business,p:VenueVisitor){
 const items=storeBasket(b,p),units=items.reduce((n,item)=>n+item.quantity,0);
 return p.basket?`${items.length} products · ${units} items`:`${p.quantity??1} × ${retailProduct(p.productId!)?.name}${units?` · ${units} items collected`:''}`;
}

export function storeWaitReason(b:Business,person:VenueVisitor):StoreLossReason{
 if(person.basket)return 'checkout';
 const key=person.productId!;
 if(coldProduct(key)&&b.retail?.store?.events.some(e=>e.kind==='fridge'&&!e.resolved))return 'cold';
 if(retailProductFloor(key)&&!team(b,'electronics',0,1))return 'adviser';
 if(!retailProductFloor(key)&&!shelfQuantity(b,key)&&backroomQuantity(b,key)>0)return 'refill';
 if(!(retailProductFloor(key)?backroomQuantity(b,key):shelfQuantity(b,key))&&(b.retail?.store?.receiving[key]??0)>0)return 'receiving';
 return 'stock';
}
export function storeShopperStatus(b:Business,person:VenueVisitor){
 if(person.basket)return (person.checkoutReadyAt??0)>venueActivityTime(b.venue!)?'Walking to checkout':team(b,retailProductFloor(person.productId!)?'electronics':'service',1,retailProductFloor(person.productId!))>0?'Waiting for cashier':'No cashier on duty · check Staff or help checkout';
 return storeCollectionBlocker(b,person)??'Collecting products automatically';
}

export function storeServiceBlocker(b:Business,id?:number){
 if(!b.venue?.running)return 'Start the week to welcome shoppers';
 const person=b.venue.visitors.find(v=>v.state==='waiting'&&(id===undefined?v.basket:id===v.id))??b.venue.visitors.find(v=>v.state==='waiting'&&id===undefined);if(!person)return 'Waiting for shoppers';
 if(!person.basket)return person.productId&&backroomQuantity(b,person.productId)>0?'Shopper is browsing · stock assistant refills empty shelves':'Shopper is collecting products · check shelves and incoming deliveries';
 if((person.checkoutReadyAt??0)>venueActivityTime(b.venue))return 'Shopper is walking to checkout';
 const items=storeBasket(b,person);
 if(!items.length||items.some(item=>(b.retail!.stock[item.id]??0)<item.quantity))return 'Basket stock expired · customer needs a replacement';
 return null;
}
export function checkoutStore(b:Business,week:number,day:number,id?:number):Business{
 if(!b.venue?.running)return b;const person=b.venue.visitors.find(v=>v.state==='waiting'&&v.basket&&(v.checkoutReadyAt??0)<=venueActivityTime(b.venue!)&&(id===undefined||v.id===id));if(!person||storeServiceBlocker(b,person.id))return b;
 const items=storeBasket(b,person),v=b.venue;
 const price=(item:BasketItem)=>Math.round(item.rate*item.quantity*100)/100;
 const sale=items.reduce((n,item)=>n+price(item),0);
 let next=b;
 for(const item of items){
  const before=next,retail=consumeRetailStock(next.retail!,item.id,item.quantity);
  next={...next,retail,stock:retailStockLevel(retail),stockroom:next.stockroom?recordStockUse({...next.stockroom,batches:retail.batches},item.id,item.quantity):undefined};
  next=recordStoreSale(next,before,item.id,item.quantity,price(item),Math.max(0,venueActivityTime(v)-(person.queueAt??venueActivityTime(v))),stockDay(week,day));
 }
 return {...next,cash:b.cash+sale,condition:Math.max(0,b.condition-.3),books:b.books?{...b.books,revenue:b.books.revenue+sale}:undefined,ledger:[...b.ledger,{week,day,label:`Checkout #${person.id} · ${items.map(i=>`${i.quantity}× ${retailProduct(i.id)!.name}`).join(', ')}`,amount:sale}].slice(-60),venue:{...v,visitors:v.visitors.map(g=>g.id===person.id?{...g,state:'using',remaining:5,basket:false,basketItems:[]}:g),week:{...v.week,revenue:v.week.revenue+sale,served:v.week.served+1},totalRevenue:v.totalRevenue+sale,totalServed:v.totalServed+1}};
}

function nextShoppingStop(b:Business,person:VenueVisitor,items:BasketItem[]):VenueVisitor{
 const [next,...rest]=person.shoppingList??[];
 if(next)return {...person,productId:next.id,quantity:next.quantity,shoppingList:rest,basket:false,basketItems:items,shoppingTime:0,browseReadyAt:venueActivityTime(b.venue!)+supermarketBrowseSeconds(b,person.productId!,next.id)};
 const ready=venueActivityTime(b.venue!)+supermarketTravelSeconds(b,person.productId!).checkout;
 return {...person,basket:items.length>0,basketItems:items,quantity:items.at(-1)?.quantity??person.quantity,checkoutReadyAt:ready,queueAt:ready,agreedRate:items.at(-1)?.rate};
}
export function collectStoreBasket(b:Business,id:number,manual=false):Business{
 const person=b.venue?.visitors.find(v=>v.id===id&&v.state==='waiting'&&!v.basket);if(!person?.productId||!b.retail?.store)return b;
 if(storeCollectionBlocker(b,person,manual))return b;
 const key=person.productId,electronic=retailProductFloor(key)===1;
 const qty=Math.min(person.quantity??1,electronic?backroomQuantity(b,key):shelfQuantity(b,key));
 const items=[...storeBasket(b,person),{id:key,quantity:qty,rate:retailPrice(b,key)}];
 return {...b,retail:{...b.retail,store:{...b.retail.store,shelf:electronic?b.retail.store.shelf:{...b.retail.store.shelf,[key]:shelfQuantity(b,key)-qty}}},venue:{...b.venue!,visitors:b.venue!.visitors.map(v=>v.id===id?nextShoppingStop(b,v,items):v)}};
}

function recoverGroceryShopping(b:Business,id:number):Business{
 const person=b.venue!.visitors.find(v=>v.id===id&&v.state==='waiting'&&!v.basket);
 if(!person?.productId||retailProductFloor(person.productId)||!reachedProduct(b,person))return b;
 const broken=coldProduct(person.productId)&&b.retail!.store!.events.some(e=>e.kind==='fridge'&&!e.resolved);
 if((!broken&&collectableQuantity(b,person.productId)>0)||productWaitSeconds(b,person)<6)return b;
 const items=storeBasket(b,person);
 // Try the next planned item. If there are none, pay for what was already collected.
 if(person.shoppingList?.length||items.length)return {...b,venue:{...b.venue!,visitors:b.venue!.visitors.map(v=>v.id===id?nextShoppingStop(b,v,items):v)}};
 const category=retailProduct(person.productId)?.category;
 const alternative=b.retail!.shelves.find(key=>key!==person.productId&&productUnlocked(b,key)&&retailProduct(key)?.category===category&&shelfQuantity(b,key)>0&&retailPrice(b,key)<=retailProduct(key)!.price*1.25&&!(coldProduct(key)&&b.retail!.store!.events.some(e=>e.kind==='fridge'&&!e.resolved)));
 if(alternative)return {...b,venue:{...b.venue!,visitors:b.venue!.visitors.map(v=>v.id===id?nextShoppingStop(b,{...v,shoppingList:[{id:alternative,quantity:Math.min(v.quantity??1,shelfQuantity(b,alternative))}]},[]):v)}};
 // No goods to buy: record the real stock problem once, rather than blocking an aisle for 70 seconds.
 const next=metric(recordStoreLoss(b,storeWaitReason(b,person)),person.productId,{stockouts:collectableQuantity(b,person.productId)<=0?1:0});
 return {...next,venue:{...next.venue!,week:{...next.venue!.week,lost:next.venue!.week.lost+1},visitors:next.venue!.visitors.map(v=>v.id===id?{...v,state:'leaving',remaining:4,basketItems:[]}:v)}};
}

function shoppingExtras(b:Business,key:string,serial:number,range:string[]):ShoppingItem[]{
 if(retailProductFloor(key))return [];
 const list:ShoppingItem[]=[],used=new Set([key]);let from=key;
 for(let i=0;i<3;i++){
  const point=supermarketProductPoint(b,from);
  const choices=range.filter(id=>!used.has(id)&&!retailProductFloor(id)&&(b.retail!.stock[id]??0)-basketQuantity(b,id)>0&&retailPrice(b,id)<=retailProduct(id)!.price*1.25);
  choices.sort((a,c)=>{const pa=supermarketProductPoint(b,a),pc=supermarketProductPoint(b,c);return Math.hypot(pa.x-point.x,pa.z-point.z)-Math.hypot(pc.x-point.x,pc.z-point.z);});
  if(!choices.length)break;
  // Nearby alternatives vary by visitor, avoiding an identical repeated basket.
  const id=choices[(serial+i)%Math.min(3,choices.length)];
  list.push({id,quantity:Math.min(1+(serial+i)%2,(b.retail!.stock[id]??0)-basketQuantity(b,id))});used.add(id);from=id;
 }
 return list;
}
function shoppingTripSeconds(b:Business,key:string,list:ShoppingItem[]=[]){
 const browse=(id:string,seconds:number)=>Math.max(seconds,department(id)==='Meat & fish'&&!team(b,'specialist',0,0)?16:0);
 let seconds=browse(key,supermarketTravelSeconds(b,key).browse),from=key;
 for(const item of list){seconds+=browse(item.id,supermarketBrowseSeconds(b,from,item.id));from=item.id;}
 // Allow for picking goods, simulation-step rounding and a short checkout queue.
 return seconds+supermarketTravelSeconds(b,from).checkout+8;
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
export function advanceSupermarket(p:Property,b:Business,delta:number,week:number,day:number,demand=1,calendarRate=1):Business{
 if(!b.venue?.running||!b.retail?.store||delta<=0)return b;const {activity:dt,calendar:calendarDelta}=venueStep(b.venue.clock,delta,calendarRate);if(dt<=0)return b;
 let next=advanceStoreMaintenance(p,storeEvents(b,week,day),dt,week,day),st=next.retail!.store!,v=next.venue!;
 const visitors:VenueVisitor[]=[],reserved:Record<string,number>={};let lost=0;
 for(const old of v.visitors){let person={...old};if(person.state==='waiting'){
   const actuallyWaiting=person.basket?(person.checkoutReadyAt??0)<=venueActivityTime(v):reachedProduct(next,person)&&!!storeCollectionBlocker(next,person);
   if(actuallyWaiting)person.patience-=dt;
   person.shoppingTime=(person.shoppingTime??0)+dt;
   if(person.patience<=0){lost++;next=recordStoreLoss(next,storeWaitReason(next,person));next=metric(next,person.productId!,{stockouts:!person.basket&&(retailProductFloor(person.productId!)?backroomQuantity(next,person.productId!):shelfQuantity(next,person.productId!))<(person.quantity??1)?1:0});continue;}
   // Spoiled stock cannot stay reserved in an unpaid basket.
   if(person.basketItems!==undefined||person.basket){
    const items=storeBasket(next,person).flatMap(item=>{
     const quantity=Math.min(item.quantity,Math.max(0,(next.retail!.stock[item.id]??0)-(reserved[item.id]??0)));
     reserved[item.id]=(reserved[item.id]??0)+quantity;
     return quantity?[{...item,quantity}]:[];
    });
    person={...person,basketItems:items,basket:person.basket&&items.length>0};
   }
  }else{person.remaining-=dt;if(person.remaining<=0){if(person.state==='leaving')continue;person={...person,state:'leaving',remaining:8};}}
  visitors.push(person);
 }
 const rush=st.events.some(e=>e.kind==='rush'&&e.until>stockDay(week,day));
 v={...v,clock:v.clock+calendarDelta,activityClock:venueActivityTime(v)+dt,visitors,arrivalTimer:v.arrivalTimer-dt*demand*(rush?1.5:1),serviceTimer:v.serviceTimer+dt,week:{...v.week,lost:v.week.lost+lost,wages:v.week.wages+businessWages(p,next)*calendarDelta/180}};
 next={...next,venue:v,books:next.books?{...next.books,wagesAccrued:next.books.wagesAccrued+businessWages(p,next)*calendarDelta/180}:undefined};
 const range=next.retail!.shelves.filter(id=>productUnlocked(next,id));
 if(v.arrivalTimer<=0&&range.length){
  // Trade on all seven days. Near closing, admit only trips that can still fit
  // and shorten the shopping list, instead of shutting out the whole final day.
  const secondsLeft=Math.max(0,CALENDAR_WEEK_SECONDS-v.clock)/calendarRate;
  const arrivalRange=secondsLeft>=70?range:range.filter(id=>shoppingTripSeconds(next,id)<=secondsLeft);
  if(!arrivalRange.length){next={...next,venue:{...next.venue!,arrivalsClosed:true}};}
  else {
  const serial=v.serial+1,intended=arrivalRange[Math.floor((Math.imul(serial,2654435761)>>>0)/4294967296*arrivalRange.length)];
  const owned=(id:string)=>Math.max(0,(next.retail!.stock[id]??0)-basketQuantity(next,id));
  // Shoppers can choose an available alternative; an unstocked new selection must
  // not divert every arrival away from the goods the shop can actually sell.
  const alternatives=arrivalRange.filter(id=>retailProductFloor(id)===retailProductFloor(intended)&&owned(id)>0);
  const similar=alternatives.filter(id=>retailProduct(id)!.category===retailProduct(intended)!.category);
  const choices=similar.length?similar:alternatives;
  const key=owned(intended)>0||!choices.length?intended:choices[(serial-1)%choices.length],ratio=retailPrice(next,key)/retailProduct(key)!.price;
  const wanted=(serial*37%100)/100<Math.exp(-2.5*Math.max(0,ratio-1));
  const full=visitors.filter(p=>p.state==='waiting').length>=18;
  const quantity=retailProductFloor(key)?1:Math.min(1+serial%3,owned(key)||3);
  const shoppingList=shoppingExtras(next,key,serial,range);
  while(shoppingList.length&&shoppingTripSeconds(next,key,shoppingList)>secondsLeft)shoppingList.pop();
  next={...next,venue:{...v,arrivalsClosed:false,serial,arrivalTimer:Math.max(1.4,2.1-(storeLevel(next)-1)*.15)*(next.condition<35?1.6:1),week:{...v.week,lost:v.week.lost+Number(wanted&&full)},visitors:wanted&&!full?[...visitors,{id:serial,seed:serial*17,state:'waiting',patience:70,unit:null,remaining:0,productId:key,quantity,shoppingTime:0,basketItems:[],shoppingList}]:visitors}};
  if(wanted&&full)next=recordStoreLoss(next,'crowded');
  }
 }
 st=next.retail!.store!;
 const replenish=st.replenishTimer+dt,receiving=st.receivingTimer+dt,delivery=st.deliveryTimer+dt;
 next={...next,retail:{...next.retail!,store:{...st,replenishTimer:replenish,receivingTimer:receiving,deliveryTimer:delivery,jobProgress:Math.min(1,(st.jobProgress??0)+dt/4)}}};
 if(receiving>=1/(team(next,'care',1,0)+team(next,'receiving',0,0)*2)){next=receiveStoreGoods(next);next={...next,retail:{...next.retail!,store:{...next.retail!.store!,receivingTimer:0}}};}
 if(replenish>=1.2/team(next,'care',1,0)){next=replenishShelf(next);next={...next,retail:{...next.retail!,store:{...next.retail!.store!,replenishTimer:0}}};}
 for(const person of next.venue!.visitors.filter(v=>v.state==='waiting'&&!v.basket)){
  next=collectStoreBasket(next,person.id);
  next=recoverGroceryShopping(next,person.id);
 }
 const groundLanes=Math.min(storeLevel(next)>=3?2:1,team(next,'service',1,0)),upperLane=next.retail!.electronicsUnlocked?Math.min(1,team(next,'electronics',0,1)):0;
 const staffedLanes=groundLanes+upperLane,serviceTime=2/staffedLanes;
 if(!staffedLanes)next={...next,venue:{...next.venue!,serviceTimer:0}};
 if(next.venue!.serviceTimer>=serviceTime){
  const shopper=next.venue!.visitors.find(v=>v.state==='waiting'&&v.basket&&(v.checkoutReadyAt??0)<=venueActivityTime(next.venue!)&&(retailProductFloor(v.productId!)?upperLane:groundLanes)>0);
  // Keep a ready till ready while its customer walks over; don't restart the
  // entire checkout delay on an empty queue or bank work from an unstaffed shift.
  next=shopper?checkoutStore(next,week,day,shopper.id):next;
  next={...next,venue:{...next.venue!,serviceTimer:shopper?Math.max(0,next.venue!.serviceTimer-serviceTime):serviceTime}};
 }
 if(team(next,'handling',0,1)>0&&delivery>=10/team(next,'handling',0,1)){next=dispatchStoreDelivery({week,day,businesses:{shop:next},loans:[],payroll:[],report:[],notice:''},'shop').businesses.shop;next={...next,retail:{...next.retail!,store:{...next.retail!.store!,deliveryTimer:0}}};}
 if(team(next,'cleaner')>0)next={...next,condition:Math.min(100,next.condition+dt*team(next,'cleaner')*.12)};
 const due=next.retail!.store!.serviceDue+STORE_LEVELS[storeLevel(next)-1].upkeep*calendarDelta/180,paid=Math.min(Math.max(0,next.cash),due),expense=due-next.retail!.store!.serviceDue;
 return {...next,cash:next.cash-paid,retail:{...next.retail!,store:{...next.retail!.store!,serviceDue:due-paid}},books:next.books?{...next.books,maintenance:next.books.maintenance+expense}:undefined};
}
