import {InventoryModal} from '../components/InventoryModal';
import {Account,Demo,transact,order,orderSupply,toggleItem} from './model';
import {RETAIL_PRODUCTS} from '../empire/retail';
export function PropertyInventory({id,b,onChange}:{id:string;b:Account;onChange:React.Dispatch<React.SetStateAction<Demo>>}){
 const items=b.supplies??b.items;
 return <div className="pv-native game-ui"><InventoryModal inventory={Object.fromEntries(items.map(i=>[i.id,i.stock]))} inventoryBatches={{}} money={b.cash} unlockedRecipes={[]}
  onBuyIngredient={(key,qty)=>onChange(s=>transact(s,id,a=>a.supplies?orderSupply(a,key,qty):order(a,key,qty)))}
  catalog={{title:b.supplies?'Supplies & Stockroom Inventory':'Products & Stockroom Inventory',subtitle:'Orders, stock and spending stay in this business',neededLabel:b.supplies?'Needed By Property':'On The Shelves',neededIds:items.filter(i=>b.supplies||i.enabled).map(i=>i.id),items:items.map(i=>({...i,icon:RETAIL_PRODUCTS.find(p=>p.id===i.id)?.icon??'📦'})),
   itemActions:id==='shop'?key=>{const item=b.items.find(i=>i.id===key)!;return <button className="mc-button w-full mt-3 py-2" onClick={()=>onChange(s=>transact(s,id,a=>toggleItem(a,key)))}>{item.enabled?'Remove from shelves':'Place on shelves'}</button>;}:undefined,
  }}/></div>
}
