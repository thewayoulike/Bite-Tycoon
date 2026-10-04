import {promotionDiscount} from '../career/retailEvents';
import {newStore,StoreState,productUnlocked,selectedFixtureRoom,shelfPlan,advanceStoreLevel} from './supermarket';
import {orderBusinessStock,manageBusinessStockroom} from '../inventory/businessStockroom';
import type {StockBatch} from '../inventory/stockroom';
import {protectedObligations} from './cashProtection';
import {propertyById} from '../prototype/expansionModel';
import type {Business,ExpansionState} from '../prototype/expansionModel';
export const ELECTRONICS_FLOOR_COST=5000;
export const ELECTRONICS_FLOOR_CUSTOMERS=300;
export const SUPERMARKET_MAX_BUDGET=20000;
export const RETAIL_PRODUCTS=[
  {id:'apples',name:'Fresh apples',category:'Produce',cost:1.2,price:3,icon:'🍎',color:'#bc6b4e'},
  {id:'bread',name:'Bakery bread',category:'Bakery',cost:1.5,price:4,icon:'🍞',color:'#cda86d'},
  {id:'milk',name:'Milk carton',category:'Chilled',cost:2,price:5,icon:'🥛',color:'#dbe3d6'},
  {id:'juice',name:'Fruit juice',category:'Drinks',cost:2,price:6,icon:'🧃',color:'#b3ba66'},
  {id:'soap',name:'Hand soap',category:'Household',cost:1.8,price:5,icon:'🧼',color:'#9dbbaa'},
  {id:'tea',name:'Tea box',category:'Pantry',cost:2,price:6,icon:'🍵',color:'#759766'},
  {id:'coffee',name:'Coffee beans',category:'Pantry',cost:5,price:12,icon:'☕',color:'#967457'},
  {id:'cereal',name:'Breakfast cereal',category:'Pantry',cost:3,price:8,icon:'🥣',color:'#cab66d'},
  {id:'chocolate',name:'Chocolate bar',category:'Snacks',cost:1.5,price:4,icon:'🍫',color:'#906654'},
  {id:'flowers',name:'Fresh flowers',category:'Gifts',cost:4,price:11,icon:'💐',color:'#c893a1'},
  {id:'detergent',name:'Laundry detergent',category:'Household',cost:6,price:15,icon:'🧴',color:'#7895b5'},
  {id:'biscuits',name:'Butter biscuits',category:'Snacks',cost:2.5,price:7,icon:'🍪',color:'#d4ae79'},
  {id:'bananas',name:'Bananas',category:'Produce',cost:1,price:3,icon:'🍌',color:'#dec45a'},
  {id:'eggs',name:'Free-range eggs',category:'Chilled',cost:2.4,price:6,icon:'🥚',color:'#d5bf99'},
  {id:'chicken',name:'Fresh chicken',category:'Chilled',cost:4,price:9,icon:'🍗',color:'#dab9a6'},
  {id:'rice',name:'Rice bag',category:'Pantry',cost:2.5,price:6,icon:'🍚',color:'#eee1bf'},
  {id:'pasta',name:'Pasta pack',category:'Pantry',cost:1.2,price:3.5,icon:'🍝',color:'#cba963'},
  {id:'frozen_vegetables',name:'Frozen vegetables',category:'Frozen',cost:2,price:5,icon:'🥦',color:'#86a56b'},
  {id:'carrots',name:'Fresh carrots',category:'Produce',cost:1,price:3,icon:'🥕',color:'#df8d43'},
  {id:'tomatoes',name:'Tomatoes',category:'Produce',cost:1.5,price:4,icon:'🍅',color:'#c9654f'},
  {id:'lettuce',name:'Lettuce',category:'Produce',cost:1,price:3,icon:'🥬',color:'#71a762'},
  {id:'potatoes',name:'Potatoes',category:'Produce',cost:1.4,price:3.5,icon:'🥔',color:'#b69865'},
  {id:'beef',name:'Fresh beef',category:'Meat & Fish',cost:6,price:13,icon:'🥩',color:'#ae6f6a'},
  {id:'fish',name:'Fresh fish',category:'Meat & Fish',cost:5,price:12,icon:'🐟',color:'#9ab9bb'},
  {id:'tv',name:'Smart television',category:'Electronics',cost:240,price:390,icon:'📺',color:'#4c6477'},
  {id:'smartphone',name:'Mobile phone',category:'Electronics',cost:170,price:280,icon:'📱',color:'#6c879c'},
  {id:'laptop',name:'Laptop',category:'Electronics',cost:350,price:560,icon:'💻',color:'#848c94'},
  {id:'tablet',name:'Tablet',category:'Electronics',cost:120,price:200,icon:'📲',color:'#a8afb6'},
  {id:'headphones',name:'Headphones',category:'Electronics',cost:25,price:55,icon:'🎧',color:'#485c64'},
  {id:'console',name:'Games console',category:'Electronics',cost:210,price:330,icon:'🎮',color:'#d0d4d7'},
  {id:'washing_machine',name:'Washing machine',category:'Appliances',cost:270,price:440,icon:'🧺',color:'#e2e4df'},
  {id:'fridge_appliance',name:'Refrigerator',category:'Appliances',cost:310,price:510,icon:'🧊',color:'#b6bfc2'},
  {id:'microwave',name:'Microwave oven',category:'Appliances',cost:55,price:95,icon:'♨️',color:'#858e91'},
  {id:'vacuum',name:'Vacuum cleaner',category:'Appliances',cost:60,price:110,icon:'🧹',color:'#8a7889'},
  {id:'kettle',name:'Electric kettle',category:'Appliances',cost:14,price:32,icon:'🫖',color:'#c4bdad'},
  {id:'toaster',name:'Toaster',category:'Appliances',cost:17,price:38,icon:'🍞',color:'#bfc2c0'},
];
export type RetailState={store?:StoreState;stock:Record<string,number>;shelves:string[];electronicsUnlocked?:boolean;batches?:Record<string,StockBatch[]>};
export const createRetail=(stock=100):RetailState=>({store:newStore(),stock:Object.fromEntries(RETAIL_PRODUCTS.slice(0,6).map(p=>[p.id,Math.round((p.id==='tea'?10:20)*stock/100)])),shelves:['apples','bread','milk']});
export const retailProduct=(id:string)=>RETAIL_PRODUCTS.find(p=>p.id===id);
export const retailProductFloor=(id:string)=>['Electronics','Appliances'].includes(retailProduct(id)?.category??'')?1:0;
export const retailOrderDiscount=(id:string,quantity:number)=>quantity>=(retailProductFloor(id)===1?5:50)?.1:quantity>=(retailProductFloor(id)===1?3:25)?.05:0;
export const retailOrderCost=(id:string,quantity:number)=>Math.round((retailProduct(id)?.cost??0)*quantity*(1-retailOrderDiscount(id,quantity))*100)/100;
export function retailBatches(retail:RetailState,id:string){return retail.batches?.[id]??((retail.stock[id]??0)>0?[{qty:retail.stock[id],costPerUnit:retailProduct(id)?.cost??0}]:[]);}
export const retailItemValue=(retail:RetailState,id:string)=>retailBatches(retail,id).reduce((sum,batch)=>sum+batch.qty*batch.costPerUnit,0);
export function consumeRetailStock(retail:RetailState,id:string,quantity:number):RetailState{
 let remaining=quantity;const batches=retailBatches(retail,id).flatMap(batch=>{const used=Math.min(remaining,batch.qty);remaining-=used;return batch.qty>used?[{...batch,qty:batch.qty-used}]:[];});
 return {...retail,stock:{...retail.stock,[id]:Math.max(0,(retail.stock[id]??0)-quantity)},batches:{...retail.batches,[id]:batches}};
}
export const retailDisplayCapacity=(floor:number)=>RETAIL_PRODUCTS.filter(p=>retailProductFloor(p.id)===floor).length;
export const availableRetailProducts=(b:Business)=>RETAIL_PRODUCTS.filter(p=>productUnlocked(b,p.id));
export const retailShelfCount=(b:Business,floor:number)=>b.retail?.shelves.filter(id=>retailProductFloor(id)===floor).length??0;
export const retailSelectionDisabled=(b:Business,id:string)=>!b.retail||!productUnlocked(b,id)||(b.retail.shelves.includes(id)?b.retail.shelves.length===1:!selectedFixtureRoom(b,id));
export function unlockElectronicsFloor(state:ExpansionState,id:string):ExpansionState{
 const b=state.businesses[id];if(!b?.retail||b.retail.electronicsUnlocked)return state;
 if(b.retail.store)return b.retail.store.level===3?advanceStoreLevel(state,id):{...state,notice:'Complete the grocery and stockroom levels before electronics.'};
 if((b.venue?.totalServed??0)<ELECTRONICS_FLOOR_CUSTOMERS)return {...state,notice:`Serve ${ELECTRONICS_FLOOR_CUSTOMERS} supermarket shoppers to unlock the electronics floor.`};
 if(b.cash<ELECTRONICS_FLOOR_COST)return {...state,notice:`The electronics floor needs $${ELECTRONICS_FLOOR_COST} from the supermarket account.`};
 return {...state,businesses:{...state.businesses,[id]:{...b,cash:b.cash-ELECTRONICS_FLOOR_COST,spending:b.spending+ELECTRONICS_FLOOR_COST,retail:{...b.retail,electronicsUnlocked:true},books:b.books?{...b.books,upgrades:b.books.upgrades+ELECTRONICS_FLOOR_COST}:undefined,ledger:[...b.ledger,{week:state.week,day:state.day,label:'Electronics floor fitted out',amount:-ELECTRONICS_FLOOR_COST}].slice(-60)}},notice:'Electronics floor opened. Choose products, order stock and set prices in Inventory and Products & prices.'};
}
export const retailPrice=(b:Business,id:string)=>Math.round((b.menu?.[id]?.price??retailProduct(id)!.price)*(1-promotionDiscount(b,id))*100)/100;
export const retailValue=(b:Business)=>b.retail?RETAIL_PRODUCTS.reduce((n,p)=>n+retailItemValue(b.retail!,p.id),0):0;
export const retailStockLevel=(retail:RetailState)=>retail.shelves.length?Math.min(100,Math.round(retail.shelves.reduce((n,id)=>n+(retail.stock[id]??0)/(retailProductFloor(id)===1?3:30),0)/retail.shelves.length*100)):0;
export function setShelfProduct(state:ExpansionState,id:string,productId:string):ExpansionState {
  const b=state.businesses[id];if(!b?.retail||!retailProduct(productId))return state;
  const selected=b.retail.shelves.includes(productId);
  if(retailSelectionDisabled(b,productId))return state;
  const retail={...b.retail,...(selected&&b.retail.store?{store:{...b.retail.store,shelf:{...b.retail.store.shelf,[productId]:0}}}:{}),shelves:selected?b.retail.shelves.filter(key=>key!==productId):[...b.retail.shelves,productId]};
  const next={...state,businesses:{...state.businesses,[id]:{...b,retail,stock:retailStockLevel(retail)}},notice:selected?'Removed from display; remaining units stay in the supermarket stockroom.':'Product added to the supermarket. Order stock, or let the purchasing manager replenish it.'};
  return autoRetailStock(next,id);
}
export function placeAllRetailProducts(state:ExpansionState,id:string,floor:number):ExpansionState {
 const b=state.businesses[id];if(!b?.retail||floor===1&&!b.retail.electronicsUnlocked)return state;
 if(b.retail.store){const plan=shelfPlan(b,floor);if(plan.cost)return {...state,notice:`Display plan needs ${plan.addDry} dry and ${plan.addCold} refrigerated spaces ($${plan.cost}). Review and confirm the fixture plan.`};}
 const additions=availableRetailProducts(b).filter(p=>retailProductFloor(p.id)===floor&&!b.retail!.shelves.includes(p.id)).map(p=>p.id);if(!additions.length)return state;
 const retail={...b.retail,shelves:[...b.retail.shelves,...additions]};
 return autoRetailStock({...state,businesses:{...state.businesses,[id]:{...b,retail,stock:retailStockLevel(retail)}},notice:'All products placed on display. Order their stock, or let your manager replenish within the existing budget.'},id);
}
export function setProductPrice(state:ExpansionState,id:string,productId:string,price:number):ExpansionState {
  const b=state.businesses[id],p=retailProduct(productId);if(!b?.retail||!p||!productUnlocked(b,productId)||!Number.isFinite(price)||price<p.cost||price>p.price*3)return state;
  return {...state,businesses:{...state.businesses,[id]:{...b,menu:{...b.menu,[productId]:{price:Math.round(price*100)/100,enabled:true}}}}};
}
export function orderRetailStock(state:ExpansionState,id:string,productId:string,quantity:number,automatic=false):ExpansionState {
  if(state.businesses[id]?.stockroom)return orderBusinessStock(state,id,productId,quantity,'standard',automatic);
  const b=state.businesses[id],p=retailProduct(productId);if(!b?.retail||!p||!productUnlocked(b,productId)||!Number.isInteger(quantity)||quantity<=0)return state;
  const count=Math.min(quantity,100-(b.retail.stock[productId]??0)),cost=retailOrderCost(productId,count);
  if(count<=0||b.cash<cost)return state;
  const retail={...b.retail,stock:{...b.retail.stock,[productId]:(b.retail.stock[productId]??0)+count},batches:{...b.retail.batches,[productId]:[...retailBatches(b.retail,productId),{qty:count,costPerUnit:cost/count}]}};
  return {...state,businesses:{...state.businesses,[id]:{...b,cash:b.cash-cost,retail,stock:retailStockLevel(retail),spending:b.spending+cost,books:b.books?{...b.books,purchases:b.books.purchases+cost}:undefined,manager:b.manager&&automatic?{...b.manager,spent:b.manager.spent+cost}:b.manager,ledger:[...b.ledger,{week:state.week,day:state.day,label:`${automatic?'Manager: ':''}${p.name} (+${count})`,amount:-cost}].slice(-60)}}};
}
export function autoRetailStock(state:ExpansionState,id:string):ExpansionState {
  if(state.businesses[id]?.stockroom)return manageBusinessStockroom(state,id,true);
  let next=state;const original=state.businesses[id];if(!original?.retail||!original.manager?.enabled)return state;
  // Empty displays go first so grocery top-ups do not repeatedly starve empty electronics.
  const shelves=[...original.retail.shelves].sort((a,b)=>Number((original.retail!.stock[a]??0)>0)-Number((original.retail!.stock[b]??0)>0));
  for(const key of shelves){
    const b=next.businesses[id],p=retailProduct(key)!,count=b.retail!.stock[key]??0,manager=b.manager!;
    const electronics=retailProductFloor(key)===1;if(electronics&&!b.retail!.electronicsUnlocked||count>=(electronics?1:15))continue;
    const budget=Math.max(0,Math.min(manager.budget-manager.spent,b.cash-manager.reserve-protectedObligations(propertyById(id)!,b,next).total));
    let qty=Math.max(0,Math.min((electronics?3:30)-count,100-count));
    while(qty>0&&retailOrderCost(p.id,qty)>budget+1e-8)qty--;
    if(qty>0)next=orderRetailStock(next,id,key,qty,true);
  }
  return next;
}
export function retailRestockNeeds(b:Business){
 return availableRetailProducts(b).filter(p=>b.retail?.shelves.includes(p.id)&&(b.retail.stock[p.id]??0)<(retailProductFloor(p.id)===1?1:15)).map(p=>({id:p.id,name:p.name,quantity:(retailProductFloor(p.id)===1?3:30)-(b.retail!.stock[p.id]??0)}));
}
export function recommendedRetailBudget(b:Business){
 const rangeCost=availableRetailProducts(b).filter(p=>b.retail?.shelves.includes(p.id)).reduce((sum,p)=>sum+retailOrderCost(p.id,retailProductFloor(p.id)===1?3:30),0);
 const remainingCost=retailRestockNeeds(b).reduce((sum,p)=>sum+retailOrderCost(p.id,p.quantity),0);
 return Math.min(SUPERMARKET_MAX_BUDGET,Math.max(b.retail?.electronicsUnlocked?1000:300,Math.ceil(Math.max(rangeCost,(b.manager?.spent??0)+remainingCost)/500)*500));
}
export function retailManagerStatus(b:Business):string{
 const manager=b.manager;if(!manager)return 'Hire a purchasing manager to reorder displayed products.';
 if(!manager.enabled)return 'Automatic purchasing is paused. Enable Manager auto-restock to resume.';
 const needs=retailRestockNeeds(b);if(!needs.length)return 'No displayed products need reordering. Products must be placed on shelves to be bought automatically.';
 const remaining=Math.max(0,manager.budget-manager.spent),cash=Math.max(0,b.cash-manager.reserve),minimum=Math.min(...needs.map(p=>retailOrderCost(p.id,1))),quote=needs.reduce((sum,p)=>sum+retailOrderCost(p.id,p.quantity),0);
 const money=(n:number)=>`$${n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
 if(cash<minimum&&cash<=remaining)return `Waiting for cash above the reserve: ${money(cash)} available. The cheapest needed item costs ${money(minimum)}. The reserve stays protected.`;
 if(remaining<minimum)return `Weekly budget too low: ${money(remaining)} left. The cheapest needed item costs ${money(minimum)}. Increase the purchasing budget to resume.`;
 return `${needs.length} displayed products need stock · ${money(quote)} to refill their targets. ${money(Math.min(remaining,cash))} available within the budget and reserve.`;
}
