import type {Business,ExpansionState} from '../prototype/expansionModel';
import {RETAIL_PRODUCTS,retailProduct,retailProductFloor,retailBatches,retailItemValue,consumeRetailStock} from './retail';
import {batchValue,consumeBatches,stockDay} from '../inventory/stockroom';

export type Department='Produce & bakery'|'Pantry & essentials'|'Chilled & frozen'|'Meat & fish'|'Household'|'Electronics'|'Large appliances';
export type DepartmentResult={sales:number;cogs:number;units:number;stockouts:number;waste:number;received:number;opening:number;wait:number;checkouts:number};
export type StoreEvent={id:number;kind:'fridge'|'delay'|'rush'|'return';title:string;day:number;until:number;resolved?:string;saleId?:number};
export type StoreSale={id:number;item:string;price:number;cost:number;qty:number;day:number;returned?:boolean};
export type StoreDelivery={id:number;item:string;day:number;done?:boolean};
export type StoreState={version:1;level:number;legacy?:boolean;shelf:Record<string,number>;fixtures:{dry:number;cold:number};budgets?:{grocery:number;electronics:number};spent:{grocery:number;electronics:number};budgetWeek:number;returnBuffer:number;serviceDue:number;replenishTimer:number;receivingTimer:number;deliveryTimer:number;job?:string;jobProgress?:number;week:number;metrics:Partial<Record<Department,DepartmentResult>>;lastMetrics?:Partial<Record<Department,DepartmentResult>>;sales:StoreSale[];deliveries:StoreDelivery[];events:StoreEvent[];lastEventDay:number;serial:number;lastSale:Record<string,number>;receiving:Record<string,number>};
export const STORE_LEVELS=[
 {level:1,name:'Local grocery',shoppers:0,cost:0,upkeep:0,visible:'Produce bins, bread, milk, pantry essentials, one checkout and a receiving bay.',needs:'Opening cashier and stock assistant included. Select a range and replenish its displays.',stock:0,wages:0},
 {level:2,name:'Complete grocery',shoppers:50,cost:1000,upkeep:10,visible:'Refrigerated cabinets, a freezer and meat, fish and household departments.',needs:'Cold fixtures are included. Consider a fresh-counter specialist and cleaner.',stock:100,wages:70},
 {level:3,name:'Reliable supermarket',shoppers:150,cost:2500,upkeep:20,visible:'Larger backroom, a second checkout and a staffed receiving desk.',needs:'Hire another cashier to use the extra lane; a receiving clerk speeds deliveries to the backroom.',stock:150,wages:70},
 {level:4,name:'Electronics upstairs',shoppers:300,cost:5000,upkeep:35,visible:'An upper showroom for TVs, phones, computers, consoles and small appliances.',needs:'Hire an electronics adviser; reserve a separate electronics purchasing allowance. Start with 1–3 sealed units per item.',stock:1200,wages:35},
 {level:5,name:'Department store',shoppers:700,cost:7500,upkeep:55,visible:'Large appliances, a service and returns desk and a dispatch/loading area upstairs.',needs:'Hire a handling worker for appliance deliveries. Keep a return reserve; appliance stock uses secure storage.',stock:1200,wages:35},
] as const;
export const storeLevel=(b:Business)=>b.retail?.store?.level??(b.retail?.electronicsUnlocked?5:2);
export const largeAppliance=(id:string)=>['washing_machine','fridge_appliance'].includes(id);
export function productLevel(id:string){const p=retailProduct(id);return largeAppliance(id)?5:retailProductFloor(id)?4:id==='milk'?1:['Chilled','Frozen','Meat & Fish','Household','Gifts'].includes(p?.category??'')?2:1;}
export function productUnlocked(b:Business,id:string){return !!b.retail&&(retailProductFloor(id)===0||!!b.retail.electronicsUnlocked)&&(storeLevel(b)>=productLevel(id)||!!b.retail.store?.legacy);}
export function department(id:string):Department{const p=retailProduct(id);return largeAppliance(id)?'Large appliances':retailProductFloor(id)?'Electronics':id==='chicken'||p?.category==='Meat & Fish'?'Meat & fish':['Chilled','Frozen'].includes(p?.category??'')?'Chilled & frozen':['Produce','Bakery'].includes(p?.category??'')?'Produce & bakery':p?.category==='Household'?'Household':'Pantry & essentials';}
export const coldProduct=(id:string)=>['Chilled & frozen','Meat & fish'].includes(department(id));
export const emptyDepartment=():DepartmentResult=>({sales:0,cogs:0,units:0,stockouts:0,waste:0,received:0,opening:0,wait:0,checkouts:0});
export const newStore=():StoreState=>({version:1,level:1,shelf:{apples:8,bread:8,milk:8},fixtures:{dry:12,cold:1},budgets:{grocery:500,electronics:1500},spent:{grocery:0,electronics:0},budgetWeek:1,returnBuffer:0,serviceDue:0,replenishTimer:0,receivingTimer:0,deliveryTimer:0,week:0,metrics:{},sales:[],deliveries:[],events:[],lastEventDay:0,serial:0,lastSale:{},receiving:{}});
export function ensureSupermarket(b:Business):Business{
 if(!b.retail||b.retail.store)return b;
 const base=newStore(),level=b.retail.electronicsUnlocked?5:2;
 return {...b,retail:{...b.retail,store:{...base,level,legacy:true,budgets:undefined,fixtures:{dry:24,cold:12},shelf:Object.fromEntries(b.retail.shelves.filter(id=>!retailProductFloor(id)).map(id=>[id,Math.min(12,b.retail!.stock[id]??0)]))}}};
}
export function startStoreWeek(b:Business,week:number):Business{
 if(!b.retail?.store)return b;const st=b.retail.store;
 if(st.week===week)return b;
 const metrics:StoreState['metrics']={};for(const p of RETAIL_PRODUCTS){const d=department(p.id);metrics[d]??=emptyDepartment();metrics[d]!.opening+=b.retail.stock[p.id]??0;}
 return {...b,retail:{...b.retail,store:{...st,week,metrics,lastMetrics:st.week?st.metrics:st.lastMetrics,spent:st.budgetWeek===week?st.spent:{grocery:0,electronics:0},budgetWeek:week}}};
}
export function metric(b:Business,id:string,changes:Partial<DepartmentResult>):Business{
 if(!b.retail?.store)return b;const st=b.retail.store,d=department(id),m={...(st.metrics[d]??emptyDepartment())};for(const [k,n]of Object.entries(changes))m[k as keyof DepartmentResult]+=n;
 return {...b,retail:{...b.retail,store:{...st,metrics:{...st.metrics,[d]:m}}}};
}
export const basketQuantity=(b:Business,id:string)=>b.venue?.visitors.filter(v=>v.state==='waiting'&&v.productId===id&&v.basket).reduce((n,v)=>n+(v.quantity??1),0)??0;
export const shelfQuantity=(b:Business,id:string)=>b.retail?.store?Math.max(0,Math.min(b.retail.store.shelf[id]??0,(b.retail.stock[id]??0)-basketQuantity(b,id))):b.retail?.stock[id]??0;
export const backroomQuantity=(b:Business,id:string)=>Math.max(0,(b.retail?.stock[id]??0)-shelfQuantity(b,id)-basketQuantity(b,id)-(b.retail?.store?.receiving[id]??0));
export const shelfCapacity=(b:Business,id:string)=>retailProductFloor(id)?1:storeLevel(b)>=3?18:12;
export const storageCapacity=(b:Business,id:string)=>retailProductFloor(id)?10:storeLevel(b)>=3||b.retail?.store?.legacy?100:50;
export function shelfPlan(b:Business,floor:number){
 const ids=RETAIL_PRODUCTS.filter(p=>retailProductFloor(p.id)===floor&&productUnlocked(b,p.id)).map(p=>p.id),st=b.retail?.store;
 const dry=ids.filter(id=>!coldProduct(id)).length,cold=ids.filter(coldProduct).length;
 const addDry=floor?0:Math.max(0,dry-(st?.fixtures.dry??24)),addCold=floor?0:Math.max(0,cold-(st?.fixtures.cold??12));
 return {ids,addDry,addCold,cost:addDry*40+addCold*100};
}
export function selectedFixtureRoom(b:Business,id:string){if(!b.retail?.store||retailProductFloor(id))return true;const cold=coldProduct(id),used=b.retail.shelves.filter(key=>!retailProductFloor(key)&&coldProduct(key)===cold).length;return used<(cold?b.retail.store.fixtures.cold:b.retail.store.fixtures.dry);}
const change=(s:ExpansionState,id:string,b:Business,notice:string)=>({...s,businesses:{...s.businesses,[id]:b},notice});
export function storeSpend(b:Business,s:Pick<ExpansionState,'week'|'day'>,cost:number,label:string,asset=false):Business{return {...b,cash:b.cash-cost,books:b.books?{...b.books,[asset?'upgrades':'maintenance']:b.books[asset?'upgrades':'maintenance']+cost}:undefined,ledger:[...b.ledger,{week:s.week,day:s.day,label,amount:-cost}].slice(-60)};}
export function advanceStoreLevel(s:ExpansionState,id:string):ExpansionState{
 const b=s.businesses[id];if(!b?.retail?.store)return s;const st=b.retail.store,spec=STORE_LEVELS[st.level];if(!spec)return s;
 if(b.venue?.running)return {...s,notice:'Fit out the next store level between weeks.'};
 if((b.venue?.totalServed??0)<spec.shoppers)return {...s,notice:`Serve ${spec.shoppers} shoppers before Level ${spec.level}.`};
 if(b.cash<spec.cost)return {...s,notice:`The supermarket needs $${spec.cost} for this fit-out.`};
 const next=storeSpend(b,s,spec.cost,`Supermarket Level ${spec.level} · ${spec.name}`,true);
 return change(s,id,{...next,retail:{...b.retail,electronicsUnlocked:b.retail.electronicsUnlocked||spec.level>=4,store:{...st,level:spec.level,returnBuffer:spec.level===5?Math.max(st.returnBuffer,250):st.returnBuffer,fixtures:{dry:Math.max(st.fixtures.dry,spec.level>=3?24:18),cold:Math.max(st.fixtures.cold,8)}}}},`Level ${spec.level} open: ${spec.name}. Choose products and staff; starting stock is purchased separately.`);
}
export function confirmShelfPlan(s:ExpansionState,id:string,floor:number):ExpansionState{
 const b=s.businesses[id];if(!b?.retail?.store||floor===1&&!b.retail.electronicsUnlocked||b.venue?.running)return s;const plan=shelfPlan(b,floor);if(b.cash<plan.cost)return {...s,notice:'Not enough supermarket cash for the proposed fixtures.'};
 const next=plan.cost?storeSpend(b,s,plan.cost,'Additional display / refrigerated fixtures',true):b;
 return change(s,id,{...next,retail:{...b.retail,shelves:[...new Set([...b.retail.shelves,...plan.ids])],store:{...b.retail.store,fixtures:{dry:b.retail.store.fixtures.dry+plan.addDry,cold:b.retail.store.fixtures.cold+plan.addCold}}}},'Display plan applied. Receiving and replenishment staff move purchased goods onto these shelves.');
}
export function replenishShelf(b:Business,id?:string):Business{
 if(!b.retail?.store)return b;const key=id??[...b.retail.shelves].filter(k=>!retailProductFloor(k)&&backroomQuantity(b,k)>0&&shelfQuantity(b,k)<shelfCapacity(b,k)).sort((a,c)=>shelfQuantity(b,a)-shelfQuantity(b,c))[0];
 if(!key||!b.retail.shelves.includes(key)||retailProductFloor(key))return b;
 const qty=Math.min(6,backroomQuantity(b,key),shelfCapacity(b,key)-shelfQuantity(b,key));if(qty<=0)return b;
 return {...b,retail:{...b.retail,store:{...b.retail.store,shelf:{...b.retail.store.shelf,[key]:shelfQuantity(b,key)+qty},job:key,jobProgress:0}}};
}
export function receiveStoreGoods(b:Business):Business{
 if(!b.retail?.store)return b;const st=b.retail.store,entry=Object.entries(st.receiving).find(([,qty])=>qty>0);if(!entry)return b;
 return {...b,retail:{...b.retail,store:{...st,receiving:{...st.receiving,[entry[0]]:Math.max(0,entry[1]-(b.hires?.receiving?40:12))}}}};
}
export const storeEnvelope=(id:string)=>retailProductFloor(id)?'electronics':'grocery';
export function envelopeRemaining(b:Business,id:string,week:number){const st=b.retail?.store;if(!st?.budgets)return Infinity;const key=storeEnvelope(id);return Math.max(0,st.budgets[key]-(st.budgetWeek===week?st.spent[key]:0));}
export function markEnvelopeSpent(b:Business,id:string,cost:number,week:number):Business{if(!b.retail?.store)return b;const st=b.retail.store,key=storeEnvelope(id),spent=st.budgetWeek===week?st.spent:{grocery:0,electronics:0};return {...b,retail:{...b.retail,store:{...st,budgetWeek:week,spent:{...spent,[key]:spent[key]+cost}}}};}
export function storeRules(s:ExpansionState,id:string,values:{grocery?:number;electronics?:number;returnBuffer?:number}):ExpansionState{
 const b=s.businesses[id];if(!b?.retail?.store||!Object.values(values).every(n=>Number.isFinite(n)&&n>=0&&n<=20000))return s;const st=b.retail.store;
 return change(s,id,{...b,retail:{...b.retail,store:{...st,budgets:values.grocery!==undefined||values.electronics!==undefined?{grocery:values.grocery??st.budgets?.grocery??b.manager?.budget??300,electronics:values.electronics??st.budgets?.electronics??b.manager?.budget??1000}:st.budgets,returnBuffer:values.returnBuffer??st.returnBuffer}}},'Supermarket budget envelopes updated; the overall budget and protected cash still apply.');
}
export function recordStoreSale(b:Business,before:Business,item:string,qty:number,sale:number,wait:number,day:number):Business{
 if(!b.retail?.store)return b;const cost=retailItemValue(before.retail!,item)-retailItemValue(b.retail,item),st=b.retail.store,id=st.serial+1;
 const next=metric(b,item,{sales:sale,cogs:cost,units:qty,wait,checkouts:1});
 return {...next,retail:{...next.retail!,store:{...next.retail!.store!,serial:id,lastSale:{...st.lastSale,[item]:day},sales:[...st.sales,{id,item,price:sale/qty,cost:cost/qty,qty,day}].slice(-100),deliveries:largeAppliance(item)?[...st.deliveries,{id,item,day}]:st.deliveries}}};
}
export function resolveStoreEvent(s:ExpansionState,id:string,eventId:number,accept:boolean):ExpansionState{
 let b=s.businesses[id];if(!b?.retail?.store)return s;const st=b.retail.store,event=st.events.find(e=>e.id===eventId);if(!event||event.resolved)return s;
 let label='Reviewed';
 if(event.kind==='fridge'){if(b.cash<60)return {...s,notice:'Refrigerator repair needs $60.'};b=storeSpend(b,s,60,'Refrigerator repaired');label='Repaired';}
 else if(event.kind==='return'){
  const sale=st.sales.find(v=>v.id===event.saleId);if(!sale||sale.returned)return s;
  if(accept){if(b.cash<sale.price)return {...s,notice:'Keep enough supermarket cash to refund this purchase.'};const r=b.retail!,batches=[...retailBatches(r,sale.item),{qty:1,costPerUnit:sale.cost,receivedDay:stockDay(s.week,s.day)}];
   b={...b,cash:b.cash-sale.price,books:b.books?{...b.books,revenue:b.books.revenue-sale.price}:undefined,retail:{...r,stock:{...r.stock,[sale.item]:(r.stock[sale.item]??0)+1},batches:{...r.batches,[sale.item]:batches}},venue:b.venue?{...b.venue,week:{...b.venue.week,revenue:b.venue.week.revenue-sale.price},totalRevenue:b.venue.totalRevenue-sale.price}:undefined,ledger:[...b.ledger,{week:s.week,day:s.day,label:'Return approved · '+retailProduct(sale.item)!.name,amount:-sale.price}].slice(-60)};
   b=metric(b,sale.item,{sales:-sale.price,cogs:-sale.cost,units:-1});label='Refunded · sealed item returned to secure stock';
  }else{b={...b,condition:Math.max(0,b.condition-3)};label='Declined · customer satisfaction reduced';}
  b={...b,retail:{...b.retail!,store:{...b.retail!.store!,sales:b.retail!.store!.sales.map(v=>v.id===sale.id?{...v,returned:true}:v)}}};
 }else label='Acknowledged';
 return change(s,id,{...b,retail:{...b.retail!,store:{...b.retail!.store!,events:b.retail!.store!.events.map(e=>e.id===eventId?{...e,resolved:label}:e)}}},label);
}
export function dispatchStoreDelivery(s:ExpansionState,id:string):ExpansionState{const b=s.businesses[id],st=b?.retail?.store,job=st?.deliveries.find(d=>!d.done);if(!st||!job)return s;return change(s,id,{...b,retail:{...b.retail!,store:{...st,deliveries:st.deliveries.map(d=>d.id===job.id?{...d,done:true}:d)}}},`${retailProduct(job.item)!.name} dispatched. This sale was already paid at checkout.`);}

/** Keep shelf and receiving quantities as locations of owned inventory, never extra assets. */
export function reconcileStoreStock(before:Business,after:Business,day:number):Business{
 if(!after.retail?.store)return after;let b=after;const st=after.retail.store,receiving={...st.receiving},shelf={...st.shelf};
 for(const p of RETAIL_PRODUCTS){
  const delivered=before.stockroom?.orders.filter(o=>o.itemId===p.id&&o.dueDay<=day).reduce((n,o)=>n+o.qty,0)??0;
  const waste=batchValue(retailBatches(before.retail!,p.id).filter(v=>v.expiresDay!==undefined&&v.expiresDay<=day));
  const qty=after.retail.stock[p.id]??0;receiving[p.id]=Math.min(qty,(receiving[p.id]??0)+delivered);shelf[p.id]=Math.min(shelf[p.id]??0,Math.max(0,qty-receiving[p.id]-basketQuantity(after,p.id)));
  if(delivered||waste)b=metric(b,p.id,{received:delivered,waste});
 }
 return {...b,retail:{...b.retail!,store:{...b.retail!.store!,receiving,shelf}}};
}
