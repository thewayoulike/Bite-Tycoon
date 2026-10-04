import {expandedStorage} from '../career/storage';
import {crewPower} from '../career/crew';
import type {GameState} from '../hooks/useGameLoop';
import {INGREDIENTS} from '../data/recipes';
import {INGREDIENT_CATEGORIES,INGREDIENT_ICONS} from '../data/categories';
import {restaurantStockPlan} from '../restaurantPurchasing';
import {StockDefinition,DeliveryMode,ReorderRule,newStockroom,stockDay,stampBatches,stockView,stockQuote,incoming,receiveOrders,changeRule,neededQuantity} from './stockroom';

export function ingredientDefinition(id:string):StockDefinition{
 const item=INGREDIENTS[id],category=INGREDIENT_CATEGORIES[id]??'General';
 const fresh=['protein','produce'].includes(category)||['milk','cream','cheese','butter','tofu','yogurt','cucumber'].includes(id),frozen=id==='ice_cream';
 return {...item,category,icon:INGREDIENT_ICONS[id],location:frozen?'Freezer':fresh?'Chilled pantry':'Dry pantry',capacity:fresh?120:frozen?160:500,shelfLife:frozen?28:fresh?7:['bread','bun','tortilla'].includes(id)?7:undefined,kind:'consumable',supplier:fresh?'Fresh food supplier':'Pantry wholesaler',pack:1,tiers:[10,50,100,500],discounts:[0,.1,.2,.3],unit:'units'};
}
export const restaurantDay=(r:GameState)=>stockDay(r.week,Math.min(7,Math.floor(r.time*7/100)+1));
export function ensureRestaurantStockroom(r:GameState):GameState{
 if(r.stockroom)return r;
 const day=restaurantDay(r);
 return {...r,stockroom:newStockroom(day),inventoryBatches:Object.fromEntries(Object.entries(r.inventory).filter(([id])=>INGREDIENTS[id]).map(([id,qty])=>[id,stampBatches(r.inventoryBatches[id]??(qty?[{qty,costPerUnit:INGREDIENTS[id].cost}]:[]),ingredientDefinition(id),day)]))};
}
export function restaurantStockViews(r:GameState){
 const plan=restaurantStockPlan(r),weather=r.stockDemandFactor??1;
 const budget=Math.max(0,r.manager.budget-r.manager.spent),freeCash=Math.max(0,r.money-r.manager.reserve-(r.cashProtection?.total??r.pendingPayroll.reduce((n,p)=>n+p.amount,0)+r.weekStats.wages));
 return Object.keys(INGREDIENTS).map(id=>{
   const target=plan.ingredients[id],dailyUse=(target?.target??0)/plan.coverageDays*weather;
   return stockView({def:expandedStorage(ingredientDefinition(id),r.stockroom),room:r.stockroom,stock:r.inventory[id]??0,batches:r.inventoryBatches[id]??[],dailyUse,target:Math.ceil((target?.target??0)*weather),minimum:target?.reorderAt??0,approved:!!target,manager:r.staff.hasManager,enabled:r.manager.enabled,budget,freeCash});
 });
}
export function orderRestaurantStock(r:GameState,id:string,qty:number,mode:DeliveryMode='standard',automatic=false):GameState{
 if(!INGREDIENTS[id]||!Number.isInteger(qty)||qty<=0)return r;
 r=ensureRestaurantStockroom(r);const room=r.stockroom!,def=expandedStorage(ingredientDefinition(id),r.stockroom),rule=room.rules[id];
 qty=Math.min(qty,Math.max(0,Math.floor((rule?.maximum??def.capacity)-(r.inventory[id]??0)-incoming(room,id))));if(qty<=0)return r;
 const cost=stockQuote(def,qty,mode);if(r.money+1e-8<cost)return r;
 if(automatic&&(cost>r.manager.budget-r.manager.spent+1e-8||cost>r.money-r.manager.reserve-(r.cashProtection?.total??0)+1e-8))return r;
 const label=`${automatic?'Manager: ':''}${def.name} · ${qty} ordered${mode==='emergency'?' · delivered now':' · next morning'}`;
 let next:GameState={...r,money:r.money-cost,stats:{...r.stats,inventoryCosts:r.stats.inventoryCosts+cost,totalExpenses:r.stats.totalExpenses+cost},manager:automatic?{...r.manager,spent:r.manager.spent+cost}:r.manager,stockroom:{...room,serial:room.serial+1,orders:[...room.orders,{id:room.serial+1,itemId:id,qty,cost,dueDay:restaurantDay(r)+(mode==='emergency'?0:1)}],notes:[label,...room.notes].slice(0,12)}};
 return mode==='emergency'?advanceRestaurantStockroom(next):next;
}
export function advanceRestaurantStockroom(r:GameState):GameState{
 if(!r.stockroom)return r;
 const day=restaurantDay(r);if(r.stockroom.day===day&&!r.stockroom.orders.some(o=>o.dueDay<=day))return r;
 const result=receiveOrders(r.stockroom,r.inventory,r.inventoryBatches,Object.keys(INGREDIENTS).map(ingredientDefinition),day);
 return {...r,stockroom:result.room,inventory:result.inventory,inventoryBatches:result.batches,stats:{...r.stats,spoilageCosts:r.stats.spoilageCosts+result.spoiled,totalExpenses:r.stats.totalExpenses+result.spoiled},weekStats:{...r.weekStats,spoilage:(r.weekStats.spoilage??0)+result.spoiled}};
}
export function setRestaurantReorder(r:GameState,id:string,rule:ReorderRule|null):GameState{
 if(!INGREDIENTS[id])return r;r=ensureRestaurantStockroom(r);
 if(!rule){const rules={...r.stockroom!.rules};delete rules[id];return {...r,stockroom:{...r.stockroom!,rules}};}
 return {...r,stockroom:changeRule(r.stockroom!,expandedStorage(ingredientDefinition(id),r.stockroom),rule)};
}
export function manageRestaurantStockroom(r:GameState,force=false):GameState{
 if(!r.stockroom||!r.staff.hasManager||!r.manager.enabled||crewPower(r.crew,'manager',(8+r.time*7*24/100)%24,1)<=0)return r;
 const day=restaurantDay(r);if(!force&&(r.phase==='planning'||r.stockroom.lastManagerDay===day))return r;
 let next={...r,stockroom:{...r.stockroom,lastManagerDay:day}};
 const views=restaurantStockViews(next).filter(v=>v.rule.minimum>0&&v.available+v.onOrder<v.rule.minimum);
 // Fund a complete meal before adding coverage to any ingredient.
 const plan=restaurantStockPlan(next);
 for(const dish of [...plan.dishes].sort((a,b)=>b.weeklyDemand-a.weeklyDemand)){
   const recipe=next.recipes.find(x=>x.id===dish.id)!;
   const kit=Object.entries(recipe.ingredients).map(([id,qty])=>({view:views.find(v=>v.definition.id===id),qty:Math.max(0,qty-(next.inventory[id]??0)-incoming(next.stockroom,id))})).filter(x=>x.view&&x.qty>0);
   const cost=kit.reduce((n,x)=>n+stockQuote(x.view!.definition,x.qty),0),spendable=Math.min(next.manager.budget-next.manager.spent,next.money-next.manager.reserve-(next.cashProtection?.total??0));
   if(cost>spendable||kit.some(x=>neededQuantity(x.view!)<x.qty))continue;
   for(const x of kit)next=orderRestaurantStock(next,x.view!.definition.id,x.qty,'standard',true) as typeof next;
 }
 for(const view of restaurantStockViews(next).filter(v=>views.some(old=>old.definition.id===v.definition.id)).sort((a,b)=>a.coverage!-b.coverage!)){
   let qty=neededQuantity(view);const budget=Math.max(0,Math.min(next.manager.budget-next.manager.spent,next.money-next.manager.reserve-(next.cashProtection?.total??0)));
   while(qty>0&&stockQuote(view.definition,qty)>budget+1e-8)qty-=view.definition.pack;
   if(qty>0)next=orderRestaurantStock(next,view.definition.id,qty,'standard',true) as typeof next;
 }
 return next;
}
