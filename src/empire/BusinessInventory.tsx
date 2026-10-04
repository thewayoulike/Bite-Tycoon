import {SupermarketShelfPlan,SupermarketStockLocation} from './SupermarketManagement';
import {replenishShelf} from './supermarket';
import {businessStockViews,orderBusinessStock,setBusinessReorder,businessStockDefinitions} from '../inventory/businessStockroom';
import {InventoryModal,InventoryItem} from '../components/InventoryModal';
import {Business,ExpansionState,Property,businessSupplies,restockBusinessItem} from '../prototype/expansionModel';
import {retailOrderCost,retailOrderDiscount,retailDisplayCapacity,placeAllRetailProducts,availableRetailProducts,retailShelfCount,retailProductFloor,retailSelectionDisabled,orderRetailStock,setShelfProduct} from './retail';

const supplyDetails:Record<string,[string,string][]>={
 hotel:[['Housekeeping','🛏️'],['Guest amenities','🧴'],['Housekeeping','🧹'],['Housekeeping','🛁'],['Refreshments','🧃'],['Maintenance','🛠️']],
 apartments:[['Maintenance','🛠️'],['Shared spaces','🧹'],['Safety','🧯']],
 park:[['Kiosk','🧃'],['Grounds','🌱'],['Grounds','🧹']],
 plaza:[['Shared spaces','🧹'],['Maintenance','🛠️'],['Safety','🧯']],
};
export function BusinessInventory({p,b,district,onChange}:{p:Property;b:Business;district:ExpansionState;onChange:(fn:(s:ExpansionState)=>ExpansionState)=>void}){
 const supplies=businessSupplies(p,b);
 const items:InventoryItem[]=b.stockroom?businessStockDefinitions(p,b):b.retail?availableRetailProducts(b):supplies.map((item,i)=>({id:item.id,name:item.name,cost:item.costPerUnit,category:supplyDetails[p.kind]?.[i]?.[0]??'Supplies',icon:supplyDetails[p.kind]?.[i]?.[1]??'📦'}));
 const inventory=b.retail?.stock??Object.fromEntries(supplies.map(item=>[item.id,item.quantity]));
 return <InventoryModal stockroom={b.stockroom?{room:b.stockroom,views:businessStockViews(p,b,district),onOrder:(item,qty,mode)=>onChange(s=>orderBusinessStock(s,p.id,item,qty,mode)),onRule:(item,rule)=>onChange(s=>setBusinessReorder(s,p.id,item,rule))}:undefined} inventory={inventory} inventoryBatches={b.retail?.batches??{}} money={b.cash} unlockedRecipes={[]}
  onBuyIngredient={(id,qty)=>onChange(s=>b.retail?orderRetailStock(s,p.id,id,qty):restockBusinessItem(s,p.id,id,qty))}
  catalog={{items,title:b.retail?'Supermarket Products & Stockroom':'Supplies & Stockroom Inventory',subtitle:`${p.name} · ${b.retail&&!b.retail.electronicsUnlocked?'Electronics floor locked — open it in Upgrades. ':''}Orders use this business’s cash`,neededLabel:b.retail?'On The Shelves':'Needed By Property',neededIds:b.retail?.shelves??items.map(i=>i.id),capacity:100,lowStock:b.retail?15:35,
   lowStockAt:b.retail?id=>retailProductFloor(id)===1?1:15:undefined, orderQuantities:b.retail?id=>retailProductFloor(id)===1?[1,3,5]:[10,25,50]:undefined, restockQuantity:b.retail?(id,stock)=>retailProductFloor(id)===1?Math.max(0,3-stock):25:undefined,
   selectionActions:b.retail?.store?<SupermarketShelfPlan p={p} b={b} onChange={onChange}/>:b.retail?<div className="flex flex-wrap gap-2 my-2"><button className="mc-button" disabled={retailShelfCount(b,0)===retailDisplayCapacity(0)} onClick={()=>onChange(s=>placeAllRetailProducts(s,p.id,0))}>Place all groceries</button>{b.retail!.electronicsUnlocked&&<button className="mc-button" disabled={retailShelfCount(b,1)===retailDisplayCapacity(1)} onClick={()=>onChange(s=>placeAllRetailProducts(s,p.id,1))}>Place all electronics</button>}</div>:undefined,
   orderBadge:b.retail?(id,qty)=>retailOrderDiscount(id,qty)?`${Math.round(retailOrderDiscount(id,qty)*100)}% OFF`:'Standard':undefined,
   quote:(item,qty)=>b.retail?retailOrderCost(item.id,qty):Math.ceil(item.cost*qty-1e-8),
   itemActions:b.retail?id=>{const selected=b.retail!.shelves.includes(id);return <><SupermarketStockLocation b={b} id={id} onRefill={()=>onChange(s=>({...s,businesses:{...s.businesses,[p.id]:replenishShelf(s.businesses[p.id],id)}}))}/><button className="mc-button w-full mt-3 py-2" disabled={retailSelectionDisabled(b,id)} onClick={()=>onChange(s=>setShelfProduct(s,p.id,id))}>{selected?'Remove from shelves':'Place on shelves'} · {retailShelfCount(b,retailProductFloor(id))}/{retailDisplayCapacity(retailProductFloor(id))} · {retailProductFloor(id)===1?'Electronics floor':'Ground floor'}</button></>;}:undefined,
  }}/>
}
