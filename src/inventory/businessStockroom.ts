import {crewPower,ensureCrew} from '../career/crew';
import {expandedStorage} from '../career/storage';
import {productUnlocked,productLevel,storageCapacity,envelopeRemaining,markEnvelopeSpent,reconcileStoreStock,storeLevel,basketQuantity} from '../empire/supermarket';
import {advanceHotelLaundry} from '../empire/hotelLaundry';
import {Business,Property,ExpansionState,businessSupplies,propertyById} from '../prototype/expansionModel';
import {RETAIL_PRODUCTS,retailProductFloor,retailPrice,retailStockLevel} from '../empire/retail';
import {protectedObligations} from '../empire/cashProtection';
import {weatherForDay,weatherDemand} from '../empire/weather';
import {StockDefinition,StockBatch,DeliveryMode,ReorderRule,newStockroom,stockDay,stampBatches,stockView,stockQuote,incoming,receiveOrders,changeRule,neededQuantity,consumeBatches,recordStockUse,batchValue} from './stockroom';

export function businessStockDefinitions(p:Property,b:Business):StockDefinition[]{return baseStockDefinitions(p,b).map(d=>expandedStorage(d,b.stockroom));}
function baseStockDefinitions(p:Property,b:Business):StockDefinition[]{
 if(b.retail)return RETAIL_PRODUCTS.map(item=>{const electronic=retailProductFloor(item.id)===1,fresh=['Produce','Bakery','Chilled','Meat & Fish','Gifts'].includes(item.category),frozen=item.category==='Frozen';return {...item,salePrice:retailPrice(b,item.id),location:electronic?'Secure electronics stockroom':frozen?'Freezer':fresh?'Chilled store':'Dry stockroom',capacity:storageCapacity(b,item.id),shelfLife:frozen?28:fresh?7:undefined,kind:'resale',supplier:electronic?'Electronics distributor':'Grocery wholesaler',pack:1,tiers:electronic?[1,3,5]:[10,25,50],discounts:[0,.05,.1],unit:'items',locked:!productUnlocked(b,item.id),lockedHint:`Requires supermarket Level ${productLevel(item.id)} in Upgrades.`};});
 return businessSupplies(p,b).map(item=>{const reusable=p.kind==='hotel'&&['stock-0','stock-3'].includes(item.id),refreshment=p.kind==='hotel'&&item.id==='stock-4',repair=item.name.toLowerCase().includes('repair')||(p.kind==='apartments'&&['stock-3','stock-4','stock-5'].includes(item.id)),safety=item.name.toLowerCase().includes('safety');return {id:item.id,name:item.name,cost:item.costPerUnit,category:reusable?'Reusable linen':refreshment?'Guest amenities':repair?'Maintenance':safety?'Safety':'Consumable supplies',location:reusable?'Linen room':refreshment?'Chilled store':repair||safety?'Workshop':'Supply cupboard',icon:reusable?'🛏️':repair?'🛠️':safety?'🧯':refreshment?'🧃':'🧴',capacity:p.kind==='apartments'&&item.id==='stock-5'?8:100,shelfLife:refreshment?14:undefined,kind:reusable?'reusable':'consumable',supplier:reusable?'Hotel linen supplier':'Building supplies',pack:1,tiers:p.kind==='apartments'&&item.id==='stock-5'?[1,3,5]:[10,25,50],discounts:[0,.05,.1],unit:reusable?'pieces':'units'};});
}
export function ensureBusinessStockroom(p:Property,b:Business,week:number,day:number):Business{
 if(b.stockroom)return b;
 const date=stockDay(week,day),defs=businessStockDefinitions(p,b),inventory=b.retail?.stock??Object.fromEntries(businessSupplies(p,b).map(i=>[i.id,i.quantity]));
 const batches=Object.fromEntries(defs.map(d=>[d.id,stampBatches(b.retail?.batches?.[d.id]??((inventory[d.id]??0)>0?[{qty:inventory[d.id],costPerUnit:d.cost}]:[]),d,date)]));
 return {...b,stockroom:{...newStockroom(date),batches},...(b.retail?{retail:{...b.retail,batches}}:{inventory})};
}
export function businessStockViews(p:Property,b:Business,s:ExpansionState){
 const defs=businessStockDefinitions(p,b),supplies=businessSupplies(p,b),inventory=b.retail?.stock??Object.fromEntries(supplies.map(i=>[i.id,i.quantity])),weather=weatherDemand(p.kind,weatherForDay(s.week,s.day,s.weatherSeed).kind).visits;
 const units=b.venue?.units??[],committed=b.lodging?.bookings.filter(v=>['reserved','waiting'].includes(v.status)).length??0,occupied=units.filter(u=>u.occupied).length,dirtyRooms=units.filter(u=>u.dirty).length;
 const protectedCash=protectedObligations(p,b,s).total,freeCash=Math.max(0,b.cash-protectedCash-(b.manager?.reserve??0)),budget=Math.max(0,(b.manager?.budget??0)-(b.manager?.spent??0));
 return defs.map(def=>{
   let reserved=0,dailyUse=1;
   if(b.retail){reserved=b.retail.store?basketQuantity(b,def.id):b.venue?.visitors.filter(v=>v.state==='waiting'&&v.productId===def.id).reduce((n,v)=>n+(v.quantity??1),0)??0;dailyUse=(b.stockroom?.usage?.[def.id]?.rate??(retailProductFloor(def.id)?1:3))*Math.min(1.2,Math.max(.8,weather));}
   else if(p.kind==='hotel'){
     const needs:Record<string,number>={'stock-0':dirtyRooms,'stock-3':dirtyRooms,'stock-2':dirtyRooms*2,'stock-1':committed,'stock-4':committed,'stock-5':units.filter(u=>(u.condition??100)<65).length*2};reserved=needs[def.id]??0;
     dailyUse=Math.max(1,(occupied+committed+units.length*.2)*(def.id==='stock-2'?2:def.id==='stock-5'?.15:1));
   }else if(p.kind==='apartments'){reserved=b.lodging?.issues.filter(i=>i.kind==='repair'&&!i.resolved&&i.supplyId===def.id).length??0;dailyUse=def.id==='stock-5'?Math.max(.1,occupied*.03):def.id==='stock-3'||def.id==='stock-4'?Math.max(.3,occupied*.1):Math.max(1,units.length*.4+occupied*.25);if(def.id==='stock-1')reserved+=dirtyRooms*2;}else{reserved=def.name.includes('Cleaning')?dirtyRooms*2:def.name.includes('Repair')?units.filter(u=>(u.condition??100)<65).length*2:committed;dailyUse=Math.max(1,units.length*.4+occupied*.25);}
   const target=b.retail&&retailProductFloor(def.id)?Math.min(3,Math.max(1,Math.ceil(dailyUse))):Math.ceil(dailyUse*(b.retail?3:2)),legacyMin=b.lodging?.targets[def.id];
   return stockView({def,room:b.stockroom,stock:inventory[def.id]??0,batches:b.retail?.batches?.[def.id]??b.stockroom?.batches?.[def.id]??((inventory[def.id]??0)>0?[{qty:inventory[def.id],costPerUnit:def.cost}]:[]),reserved,dailyUse,target:legacyMin===undefined?target:Math.max(target,legacyMin+1),minimum:legacyMin,approved:!b.retail||b.retail.shelves.includes(def.id),manager:!!b.manager,enabled:!!b.manager?.enabled,budget:b.retail?Math.min(budget,envelopeRemaining(b,def.id,s.week)):budget,freeCash});
 });
}
export function orderBusinessStock(s:ExpansionState,id:string,itemId:string,qty:number,mode:DeliveryMode='standard',automatic=false):ExpansionState{
 const p=propertyById(id),original=s.businesses[id];if(!p||!original||!Number.isInteger(qty)||qty<=0)return s;
 const b=ensureBusinessStockroom(p,original,s.week,s.day),view=businessStockViews(p,b,s).find(v=>v.definition.id===itemId);if(!view||view.definition.locked)return s;
 qty=Math.min(qty,Math.max(0,Math.floor(Math.min(view.rule.maximum,view.definition.capacity)-view.onHand-view.onOrder-view.dirty)));if(qty<=0)return s;
 const cost=stockQuote(view.definition,qty,mode);if(b.cash+1e-8<cost)return s;
 if(automatic&&(!b.manager||cost>b.manager.budget-b.manager.spent+1e-8||cost>envelopeRemaining(b,itemId,s.week)+1e-8||cost>b.cash-b.manager.reserve-protectedObligations(p,b,s).total+1e-8))return s;
 const room=b.stockroom!,label=`${automatic?'Manager: ':''}${view.definition.name} · ${qty} ordered${mode==='emergency'?' · express delivery':' · next morning'}`;
 let next:Business={...b,cash:b.cash-cost,spending:b.spending+cost,books:b.books?{...b.books,purchases:b.books.purchases+cost}:undefined,manager:b.manager&&automatic?{...b.manager,spent:b.manager.spent+cost}:b.manager,stockroom:{...room,serial:room.serial+1,orders:[...room.orders,{id:room.serial+1,itemId,qty,cost,dueDay:stockDay(s.week,s.day)+(mode==='emergency'?0:1)}],notes:[label,...room.notes].slice(0,12)},ledger:[...b.ledger,{week:s.week,day:s.day,label,amount:-cost}].slice(-60)};
 if(automatic&&b.retail)next=markEnvelopeSpent(next,itemId,cost,s.week);
 if(mode==='emergency')next=advanceBusinessStockroom(p,next,s.week,s.day);
 return {...s,businesses:{...s.businesses,[id]:next},notice:label};
}
export function consumeBusinessSupplies(p:Property,b:Business,amounts:Record<string,number>):Business|null{
 const items=businessSupplies(p,b);if(items.some(i=>i.quantity<(amounts[i.id]??0)))return null;
 const inventory=Object.fromEntries(items.map(i=>[i.id,i.quantity-(amounts[i.id]??0)]));
 if(!b.stockroom)return {...b,inventory,stock:Math.min(...Object.values(inventory))};
 let room={...b.stockroom,batches:{...b.stockroom.batches},dirty:{...b.stockroom.dirty}};
 for(const def of businessStockDefinitions(p,b))if((amounts[def.id]??0)>0){
   const consumed=consumeBatches(room.batches[def.id]??[],amounts[def.id]);room.batches[def.id]=consumed.left;
   if(def.kind==='reusable')room.dirty[def.id]=[...(room.dirty[def.id]??[]),...consumed.used.map(batch=>({...batch,condition:Math.max(0,(batch.condition??100)-10)}))];
   room=recordStockUse(room,def.id,amounts[def.id]) as typeof room;
 }
 return {...b,inventory,stock:Math.min(...Object.values(inventory)),stockroom:room};
}
export function advanceBusinessStockroom(p:Property,b:Business,week:number,day:number):Business{
 if(!b.stockroom)return b;const date=stockDay(week,day),room=b.stockroom;
 if(room.day===date&&!room.orders.some(o=>o.dueDay<=date))return b;
 const inventory=b.retail?.stock??Object.fromEntries(businessSupplies(p,b).map(i=>[i.id,i.quantity]));
 const defs=businessStockDefinitions(p,b),result=receiveOrders(room,inventory,b.retail?.batches??room.batches??{},defs,date);
 let stockroom={...result.room,batches:result.batches,spoilage:(room.spoilage??0)+result.spoiled};
 const updated:Business={...b,stockroom,inventory:b.retail?b.inventory:result.inventory,retail:b.retail?{...b.retail,stock:result.inventory,batches:result.batches}:undefined,stock:b.retail?retailStockLevel({...b.retail,stock:result.inventory}):Math.min(...Object.values(result.inventory))};
 if(b.retail?.store)return reconcileStoreStock(b,updated,date);
 return p.kind==='hotel'&&date>room.day?advanceHotelLaundry(updated,week,day,date):updated;
}

export function setBusinessReorder(s:ExpansionState,id:string,itemId:string,rule:ReorderRule|null):ExpansionState{
 const p=propertyById(id),original=s.businesses[id];if(!p||!original)return s;const b=ensureBusinessStockroom(p,original,s.week,s.day),def=businessStockDefinitions(p,b).find(d=>d.id===itemId);if(!def)return s;
 let room=b.stockroom!;if(rule)room=changeRule(room,def,rule);else{const rules={...room.rules};delete rules[itemId];room={...room,rules};}
 return {...s,businesses:{...s.businesses,[id]:{...b,stockroom:room}}};
}
export function manageBusinessStockroom(s:ExpansionState,id:string,force=false):ExpansionState{
 const p=propertyById(id)!,b=s.businesses[id];if(!b?.stockroom||!b.manager?.enabled||crewPower(ensureCrew(p,b),'manager',(8+(b.venue?.clock??0)*7*24/180)%24,1)<=0)return s;
 const day=stockDay(s.week,s.day);if(!force&&b.stockroom.lastManagerDay===day)return s;
 let next={...s,businesses:{...s.businesses,[id]:{...b,stockroom:{...b.stockroom,lastManagerDay:day}}}};
 const views=businessStockViews(p,b,s).filter(v=>!v.definition.locked&&(!b.retail||b.retail.shelves.includes(v.definition.id))&&v.available+v.onOrder<v.rule.minimum);
 // Supply complete housekeeping/repair kits before buying additional coverage.
 if(!b.retail){
   const kit=views.map(v=>({v,qty:Math.max(0,(v.definition.id==='stock-2'&&p.kind==='hotel'?2:1)-v.onHand-v.onOrder)})).filter(x=>x.qty>0),cost=kit.reduce((n,x)=>n+stockQuote(x.v.definition,x.qty),0);
   if(cost<=Math.min(b.manager.budget-b.manager.spent,b.cash-b.manager.reserve-protectedObligations(p,b,s).total))for(const {v,qty}of kit)next=orderBusinessStock(next,id,v.definition.id,qty,'standard',true) as typeof next;
 }
 if(!views.length)return s;
 for(const original of views.sort((a,b)=>(a.coverage??Infinity)-(b.coverage??Infinity))){
   const current=next.businesses[id],view=businessStockViews(p,current,next).find(v=>v.definition.id===original.definition.id)!;
   const budget=Math.max(0,Math.min(current.manager!.budget-current.manager!.spent,envelopeRemaining(current,view.definition.id,s.week),current.cash-current.manager!.reserve-protectedObligations(p,current,next).total));let qty=neededQuantity(view);
   while(qty>0&&stockQuote(view.definition,qty)>budget+1e-8)qty-=view.definition.pack;
   if(qty>0)next=orderBusinessStock(next,id,view.definition.id,qty,'standard',true) as typeof next;
 }
 return next.businesses[id].cash===b.cash&&b.stockroom.lastManagerDay===day?s:next;
}
