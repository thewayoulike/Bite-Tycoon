import type {Business,ExpansionState} from '../prototype/expansionModel';
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
];
export type RetailState={stock:Record<string,number>;shelves:string[]};
export const createRetail=(stock=100):RetailState=>({stock:Object.fromEntries(RETAIL_PRODUCTS.slice(0,6).map(p=>[p.id,Math.round((p.id==='tea'?10:20)*stock/100)])),shelves:['apples','bread','milk']});
export const retailProduct=(id:string)=>RETAIL_PRODUCTS.find(p=>p.id===id);
export const retailPrice=(b:Business,id:string)=>b.menu?.[id]?.price??retailProduct(id)!.price;
export const retailValue=(b:Business)=>RETAIL_PRODUCTS.reduce((n,p)=>n+(b.retail?.stock[p.id]??0)*p.cost,0);
export const retailStockLevel=(retail:RetailState)=>retail.shelves.length?Math.min(100,Math.round(retail.shelves.reduce((n,id)=>n+(retail.stock[id]??0),0)/(retail.shelves.length*30)*100)):0;
export function setShelfProduct(state:ExpansionState,id:string,productId:string):ExpansionState {
  const b=state.businesses[id];if(!b?.retail||!retailProduct(productId))return state;
  const selected=b.retail.shelves.includes(productId);
  if(selected?b.retail.shelves.length===1:b.retail.shelves.length>=6)return state;
  const retail={...b.retail,shelves:selected?b.retail.shelves.filter(key=>key!==productId):[...b.retail.shelves,productId]};
  const next={...state,businesses:{...state.businesses,[id]:{...b,retail,stock:retailStockLevel(retail)}},notice:selected?'Removed from display; remaining units stay in this shop’s stockroom.':'Product added to the shop shelves. Order stock, or let the purchasing manager replenish it.'};
  return autoRetailStock(next,id);
}
export function setProductPrice(state:ExpansionState,id:string,productId:string,price:number):ExpansionState {
  const b=state.businesses[id],p=retailProduct(productId);if(!b?.retail||!p||!Number.isFinite(price)||price<p.cost||price>p.price*3)return state;
  return {...state,businesses:{...state.businesses,[id]:{...b,menu:{...b.menu,[productId]:{price:Math.round(price*100)/100,enabled:true}}}}};
}
export function orderRetailStock(state:ExpansionState,id:string,productId:string,quantity:number,automatic=false):ExpansionState {
  const b=state.businesses[id],p=retailProduct(productId);if(!b?.retail||!p||!Number.isInteger(quantity)||quantity<=0)return state;
  const count=Math.min(quantity,100-(b.retail.stock[productId]??0)),cost=Math.round(count*p.cost*100)/100;
  if(count<=0||b.cash<cost)return state;
  const retail={...b.retail,stock:{...b.retail.stock,[productId]:(b.retail.stock[productId]??0)+count}};
  return {...state,businesses:{...state.businesses,[id]:{...b,cash:b.cash-cost,retail,stock:retailStockLevel(retail),spending:b.spending+cost,books:b.books?{...b.books,purchases:b.books.purchases+cost}:undefined,manager:b.manager&&automatic?{...b.manager,spent:b.manager.spent+cost}:b.manager,ledger:[...b.ledger,{week:state.week,day:state.day,label:`${automatic?'Manager: ':''}${p.name} (+${count})`,amount:-cost}].slice(-60)}}};
}
export function autoRetailStock(state:ExpansionState,id:string):ExpansionState {
  let next=state;const original=state.businesses[id];if(!original?.retail||!original.manager?.enabled)return state;
  for(const key of original.retail.shelves){
    const b=next.businesses[id],p=retailProduct(key)!,count=b.retail!.stock[key]??0,manager=b.manager!;
    if(count>=15)continue;
    const budget=Math.max(0,Math.min(manager.budget-manager.spent,b.cash-manager.reserve));
    const qty=Math.min(30-count,Math.floor((budget+1e-8)/p.cost));
    if(qty>0)next=orderRetailStock(next,id,key,qty,true);
  }
  return next;
}
