import {Business,ExpansionState,Property,setBusinessManager,autoStockBusiness} from '../prototype/expansionModel';
import {businessSupplies} from '../prototype/expansionModel';
import {manageLodging} from './lodging';
import {recommendedRetailBudget,retailManagerStatus,retailRestockNeeds} from './retail';

const money=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
export function BusinessPurchasing({p,b,onChange}:{p:Property;b:Business;onChange:(fn:(s:ExpansionState)=>ExpansionState)=>void}){
 if(!b.manager)return <p className="mt-4 text-xs text-[#555555]">Hire a purchasing manager in Staff to automate replenishment.</p>;
 const suggested=b.retail?recommendedRetailBudget(b):80;
 const budgets=[...new Set([0,40,80,150,300,...(b.retail?[500,1000,3000,6000,10000,20000,suggested]:[]),b.manager.budget])].sort((a,b)=>a-b);
 return <section className="mc-inner-panel mt-4 p-3 text-xs text-[#2b2b2b]" aria-label="Purchasing manager rules">
  <h4 className="font-black uppercase tracking-wider mb-3">Purchasing manager</h4>
  <label className="flex gap-2 items-center mb-3"><input type="checkbox" checked={b.manager.enabled} onChange={e=>onChange(s=>setBusinessManager(s,p.id,{enabled:e.target.checked}))}/> Manager auto-restock</label>
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
   <label className="flex flex-col gap-1">Weekly purchasing budget<select className="mc-button p-2" aria-label="Business manager budget" value={b.manager.budget} onChange={e=>onChange(s=>setBusinessManager(s,p.id,{budget:Number(e.target.value)}))}>{budgets.map(n=><option key={n} value={n}>{money(n)}</option>)}</select></label>
   <label className="flex flex-col gap-1">Keep in this account<select className="mc-button p-2" aria-label="Business manager reserve" value={b.manager.reserve} onChange={e=>onChange(s=>setBusinessManager(s,p.id,{reserve:Number(e.target.value)}))}>{[0,150,300,500].map(n=><option key={n} value={n}>{money(n)}</option>)}</select></label>
  </div>
  <p className="mt-3">{money(b.manager.spent)} / {money(b.manager.budget)} spent this week. {b.retail?'Groceries: reorder below 15, up to 30. Electronics: reorder when sold out, up to 3. Empty displays are stocked first.':b.lodging?'Reorders supplies below your minimum targets.':'Reorders supplies below 50 units.'}</p>
  {b.retail&&<><p className="weekly-history-note" role="status">{retailManagerStatus(b)}</p><div className="flex flex-wrap gap-2 mt-3"><button className="mc-button-green p-2" onClick={()=>onChange(s=>setBusinessManager(s,p.id,{budget:suggested,enabled:true}))}>Set {money(suggested)} budget & restock {b.retail.electronicsUnlocked?'both floors':'groceries'}</button><button className="mc-button p-2" disabled={!b.manager.enabled||!retailRestockNeeds(b).length} onClick={()=>onChange(s=>autoStockBusiness(s,p.id))}>Run manager now</button></div><p className="mt-2">The budget is a weekly limit, not an immediate fee. Orders use this supermarket’s cash and keep your reserve. Only products placed on shelves are ordered.</p></>}
  {b.lodging&&<div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">{businessSupplies(p,b).map(item=><label className="flex flex-col gap-1" key={item.id}>{item.name} · minimum<input className="mc-button p-2" type="number" min={0} max={80} aria-label={`${item.name} minimum stock`} value={b.lodging!.targets[item.id]??50} onChange={e=>{const value=Number(e.target.value);onChange(s=>manageLodging(s,p.id,{type:'target',id:item.id,value}));}}/></label>)}</div>}
 </section>;
}
