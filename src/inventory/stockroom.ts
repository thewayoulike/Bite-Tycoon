/** Shared purchasing, storage and delivery rules. Quantities remain in each business account. */
export type StockBatch={qty:number;costPerUnit:number;receivedDay?:number;expiresDay?:number;condition?:number};
export type ReorderRule={minimum:number;target:number;maximum:number};
export type DeliveryMode='standard'|'emergency';
export type StockOrder={id:number;itemId:string;qty:number;cost:number;dueDay:number};
export type Stockroom={layout?:import("../career/storage").StoragePlan;version:1;laundryLoads?:{itemId:string;batches:StockBatch[];dueDay:number}[];day:number;serial:number;rules:Record<string,ReorderRule>;orders:StockOrder[];batches?:Record<string,StockBatch[]>;dirty?:Record<string,StockBatch[]>;usage?:Record<string,{day:number;used:number;rate:number}>;lastLaundryDay?:number;lastManagerDay?:number;notes:string[];spoilage?:number};
export type StockDefinition={id:string;name:string;cost:number;category:string;icon?:string;location:string;capacity:number;shelfLife?:number;kind:'consumable'|'resale'|'reusable';supplier:string;pack:number;tiers:number[];discounts:number[];unit:string;locked?:boolean;lockedHint?:string;salePrice?:number};
export type StockView={definition:StockDefinition;onHand:number;reserved:number;available:number;onOrder:number;dirty:number;dailyUse:number;coverage:number|null;rule:ReorderRule;nextDelivery?:number;reason:string;action:string;batches:StockBatch[]};
export const stockDay=(week:number,day:number)=>(week-1)*7+day;
export const dayLabel=(day:number)=>`Week ${Math.floor((day-1)/7)+1}, Day ${(day-1)%7+1}`;
export const newStockroom=(day:number):Stockroom=>({version:1,day,serial:0,rules:{},orders:[],notes:[]});
export const incoming=(room:Stockroom|undefined,id:string)=>(room?.orders.filter(o=>o.itemId===id).reduce((n,o)=>n+o.qty,0)??0)+(room?.laundryLoads?.filter(l=>l.itemId===id).reduce((n,l)=>n+l.batches.reduce((n,b)=>n+b.qty,0),0)??0);
export const transitValue=(room?:Stockroom)=>(room?.orders.reduce((n,o)=>n+o.cost,0)??0)+(room?.laundryLoads?.reduce((n,l)=>n+batchValue(l.batches),0)??0);
export const batchValue=(batches:StockBatch[])=>batches.reduce((n,b)=>n+b.qty*b.costPerUnit,0);
export const dirtyValue=(room?:Stockroom)=>Object.values(room?.dirty??{}).reduce((n,b)=>n+batchValue(b),0);
export function recordStockUse(room:Stockroom,id:string,qty:number):Stockroom{
 const old=room.usage?.[id];return {...room,usage:{...room.usage,[id]:{day:room.day,used:old?.day===room.day?old.used+qty:qty,rate:old?.rate??qty}}};
}
export function stampBatches(batches:StockBatch[],def:StockDefinition,day:number){return batches.map(b=>b.receivedDay===undefined?{...b,receivedDay:day,...(def.shelfLife?{expiresDay:day+def.shelfLife}:{}),...(def.kind==='reusable'?{condition:b.condition??100}:{})}:b);}
export function consumeBatches(batches:StockBatch[],qty:number){
 let remaining=qty,cost=0;const used:StockBatch[]=[],left:StockBatch[]=[];
 for(const b of batches){const take=Math.min(remaining,b.qty);if(take>0){used.push({...b,qty:take});cost+=take*b.costPerUnit;remaining-=take;}if(b.qty>take)left.push({...b,qty:b.qty-take});}
 return {left,used,cost};
}
export function stockQuote(def:StockDefinition,qty:number,mode:DeliveryMode='standard'){
 const discount=def.tiers.reduce((best,t,i)=>qty>=t?def.discounts[i]??0:best,0);
 return Math.round(def.cost*qty*(1-discount)*(mode==='emergency'?1.1:1)*100)/100;
}
export function reorderRule(room:Stockroom|undefined,def:StockDefinition,target:number,minimum=Math.ceil(target/2)):ReorderRule{
 return room?.rules[def.id]??{minimum:Math.min(def.capacity,minimum),target:Math.min(def.capacity,target),maximum:def.capacity};
}
export function changeRule(room:Stockroom,def:StockDefinition,rule:ReorderRule):Stockroom{
 if(![rule.minimum,rule.target,rule.maximum].every(n=>Number.isInteger(n)&&n>=0)||rule.minimum>rule.target||rule.target>rule.maximum||rule.maximum>def.capacity)return room;
 return {...room,rules:{...room.rules,[def.id]:rule}};
}
export function stockView(args:{def:StockDefinition;room?:Stockroom;stock:number;batches:StockBatch[];reserved?:number;dailyUse:number;target:number;minimum?:number;approved:boolean;manager:boolean;enabled:boolean;budget:number;freeCash:number}):StockView{
 const {def,room,stock,batches,dailyUse}=args,rule=reorderRule(room,def,args.target,args.minimum),onOrder=incoming(room,def.id),dirty=(room?.dirty?.[def.id]??[]).reduce((n,b)=>n+b.qty,0),reserved=Math.min(stock,args.reserved??0),available=Math.max(0,stock-reserved);
 let reason='Ready',action='No purchase needed.';
 if(def.locked){reason='Floor locked';action=def.lockedHint??'Open the required floor in Upgrades.';}
 else if(!args.approved){reason='Not selected for service';action='Add a dish to the menu or place this product on shelves.';}
 else if(!args.manager){reason='Manager not hired';action='Order manually or hire purchasing staff.';}
 else if(!args.enabled){reason='Purchasing paused';action='Enable the purchasing manager.';}
 else if(onOrder&&available+onOrder>=rule.minimum){reason='Already on order';action='Delivery is counted toward the target.';}
 else if(stock+onOrder+dirty>=Math.min(rule.maximum,def.capacity)){reason='Storage full';action='Use existing stock or raise the maximum within capacity.';}
 else if(available+onOrder>=rule.minimum){reason='Target covered';action='The manager waits until available stock falls below the minimum.';}
 else if(def.shelfLife&&available+onOrder>=Math.max(def.pack,Math.ceil(dailyUse*Math.max(1,def.shelfLife-1)))){reason='Shelf-life limit';action='Buying more would exceed expected use before expiry. Lower targets or expand demand.';}
 else if(args.freeCash<stockQuote(def,def.pack)){reason='Cash protected for bills';action='Earn cash, review the extra buffer or arrange a loan yourself.';}
 else if(args.budget<stockQuote(def,def.pack)){reason='Weekly budget exhausted';action='Increase the budget or wait for the next week.';}
 else{reason='Reorder needed';action='The manager will order at the next daily stock check.';}
 return {definition:def,onHand:stock,reserved,available,onOrder,dirty,dailyUse,coverage:dailyUse>0?available/dailyUse:null,rule,nextDelivery:[...(room?.orders??[]),...(room?.laundryLoads??[])].filter(o=>o.itemId===def.id).reduce((n,o)=>Math.min(n,o.dueDay),Infinity),reason,action,batches};
}
/** Limit overbuying to usable life; reservations are additional committed demand, not free stock. */
export function neededQuantity(view:StockView){
 const d=view.definition,r=view.rule,lifeLimit=d.shelfLife?Math.max(d.pack,Math.ceil(view.dailyUse*Math.max(1,d.shelfLife-1))):r.target;
 const target=Math.min(r.target,lifeLimit);
 return Math.max(0,Math.floor(Math.min(target-view.available-view.onOrder,Math.min(r.maximum,d.capacity)-view.onHand-view.onOrder-view.dirty)/d.pack)*d.pack);
}
export function receiveOrders(room:Stockroom,inventory:Record<string,number>,batches:Record<string,StockBatch[]>,defs:StockDefinition[],day:number){
 let stock={...inventory},nextBatches={...batches},spoiled=0;const notes:string[]=[];
 for(const o of room.orders.filter(o=>o.dueDay<=day)){
   const def=defs.find(d=>d.id===o.itemId);if(!def)continue;
   stock[o.itemId]=(stock[o.itemId]??0)+o.qty;
   nextBatches[o.itemId]=[...(nextBatches[o.itemId]??[]),...stampBatches([{qty:o.qty,costPerUnit:o.cost/o.qty}],def,o.dueDay)];
   notes.push(`${def.name}: ${o.qty} delivered.`);
 }
 for(const def of defs){
   const all=stampBatches(nextBatches[def.id]??[],def,day),expired=all.filter(b=>b.expiresDay!==undefined&&b.expiresDay<=day),good=all.filter(b=>!expired.includes(b));
   if(expired.length){stock[def.id]=Math.max(0,(stock[def.id]??0)-expired.reduce((n,b)=>n+b.qty,0));spoiled+=batchValue(expired);notes.push(`${def.name}: expired batch removed.`);}
   nextBatches[def.id]=good;
 }
 const usage=Object.fromEntries(Object.entries(room.usage??{}).map(([id,u])=>[id,day>u.day?{day,used:0,rate:u.rate*.5+u.used/Math.max(1,day-u.day)*.5}:u]));
 return {inventory:stock,batches:nextBatches,spoiled,room:{...room,day,usage,orders:room.orders.filter(o=>o.dueDay>day||!defs.some(d=>d.id===o.itemId)),notes:notes.length?[...notes,...room.notes].slice(0,12):room.notes}};
}
