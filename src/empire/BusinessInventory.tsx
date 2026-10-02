import {InventoryModal,InventoryItem} from '../components/InventoryModal';
import {Business,ExpansionState,Property,businessSupplies,restockBusinessItem} from '../prototype/expansionModel';
import {RETAIL_PRODUCTS,orderRetailStock,setShelfProduct} from './retail';

const supplyDetails:Record<string,[string,string][]>={
 hotel:[['Housekeeping','🛏️'],['Guest amenities','🧴'],['Housekeeping','🧹'],['Housekeeping','🛁'],['Refreshments','🧃'],['Maintenance','🛠️']],
 apartments:[['Maintenance','🛠️'],['Shared spaces','🧹'],['Safety','🧯']],
 park:[['Kiosk','🧃'],['Grounds','🌱'],['Grounds','🧹']],
};
export function BusinessInventory({p,b,onChange}:{p:Property;b:Business;onChange:(fn:(s:ExpansionState)=>ExpansionState)=>void}){
 const supplies=businessSupplies(p,b);
 const items:InventoryItem[]=b.retail?RETAIL_PRODUCTS:supplies.map((item,i)=>({id:item.id,name:item.name,cost:item.costPerUnit,category:supplyDetails[p.kind]?.[i]?.[0]??'Supplies',icon:supplyDetails[p.kind]?.[i]?.[1]??'📦'}));
 const inventory=b.retail?.stock??Object.fromEntries(supplies.map(item=>[item.id,item.quantity]));
 return <InventoryModal inventory={inventory} inventoryBatches={{}} money={b.cash} unlockedRecipes={[]}
  onBuyIngredient={(id,qty)=>onChange(s=>b.retail?orderRetailStock(s,p.id,id,qty):restockBusinessItem(s,p.id,id,qty))}
  catalog={{items,title:b.retail?'Products & Stockroom Inventory':'Supplies & Stockroom Inventory',subtitle:`${p.name} · orders, stock and spending stay in this business`,neededLabel:b.retail?'On The Shelves':'Needed By Property',neededIds:b.retail?.shelves??items.map(i=>i.id),capacity:100,lowStock:b.retail?15:35,
   quote:(item,qty)=>b.retail?Math.round(item.cost*qty*100)/100:Math.ceil(item.cost*qty-1e-8),
   itemActions:b.retail?id=>{const selected=b.retail!.shelves.includes(id);return <button className="mc-button w-full mt-3 py-2" disabled={selected?b.retail!.shelves.length===1:b.retail!.shelves.length>=6} onClick={()=>onChange(s=>setShelfProduct(s,p.id,id))}>{selected?'Remove from shelves':'Place on shelves'} · {b.retail!.shelves.length}/6</button>;}:undefined,
  }}/>
}
