import {useState} from 'react';
import {StockView,Stockroom,ReorderRule,DeliveryMode,stockQuote,dayLabel,batchValue} from '../inventory/stockroom';
export type StockroomControls={room:Stockroom;views:StockView[];onOrder:(id:string,qty:number,mode:DeliveryMode)=>void;onRule:(id:string,rule:ReorderRule|null)=>void};
const money=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD'});
const quantity=(n:number)=>Number(n.toFixed(1));
export function StockroomItem({view,controls,cash,actions}:{view:StockView;controls:StockroomControls;cash:number;actions?:React.ReactNode}){
 const {definition:d,rule}=view,[mode,setMode]=useState<DeliveryMode>('standard'),[draft,setDraft]=useState<ReorderRule>(rule);
 const invalid=draft.minimum<0||draft.minimum>draft.target||draft.target>draft.maximum||draft.maximum>d.capacity||!Object.values(draft).every(Number.isInteger);
 const cost=batchValue(view.batches),average=view.onHand?cost/view.onHand:d.cost;
 const capacity=Math.max(0,Math.floor(Math.min(rule.maximum,d.capacity)-view.onHand-view.onOrder-view.dirty));
 return <section aria-label={`${d.name} stock details`} className="space-y-3 text-xs">
  <div className="border-b-2 border-[#8b8b8b] pb-2"><span className="text-3xl">{d.icon??'📦'}</span><h4 className="font-black uppercase text-base">{d.name}</h4><p>{d.category} · {d.kind==='reusable'?'Reusable':d.kind==='resale'?'Goods for sale':'Consumable'}</p></div>
  <div className="grid grid-cols-3 gap-1">{[['On hand',view.onHand],['Reserved',view.reserved],['Available',view.available]].map(([label,value])=><div key={label} className="mc-slot p-2"><span className="block text-[9px] uppercase">{label}</span><strong>{quantity(Number(value))}</strong></div>)}</div>
  <p>{d.location} · {quantity(view.onHand+view.onOrder+view.dirty)} / {d.capacity} {d.unit} allocated{view.onHand>d.capacity?' · existing excess retained':''}. {view.reserved>0?'Reserved for waiting shoppers, booked arrivals or pending room work.':'Stock already consumed by service is not reserved twice.'}</p>
  <p>Expected use <b>{quantity(view.dailyUse)} / game day</b> · {view.coverage===null?'No active demand':`${quantity(view.coverage)} days available`}. {d.shelfLife?`Shelf life: ${d.shelfLife} game days from delivery.`:'Does not expire.'}</p>
  {d.kind==='reusable'&&<p className="mc-slot p-2">Laundry: <b>{quantity(view.dirty)} pieces</b> awaiting the morning wash. Morning housekeeping uses cleaning supplies; linen retires after ten uses. Dirty pieces remain owned stock.</p>}
  <div className="grid grid-cols-2 gap-1"><div className="mc-slot p-2">Next FIFO unit<br/><b>{money(view.batches[0]?.costPerUnit??d.cost)}</b></div><div className="mc-slot p-2">Owned stock value<br/><b>{money(cost)}</b></div></div>
  <p>Average cost {money(average)}{d.salePrice!==undefined?` · unit margin ${money(d.salePrice-average)} at ${money(d.salePrice)} retail`:''}.</p>
  <div className="mc-slot p-2"><b>On order: {view.onOrder} {d.unit}</b><p>{view.onOrder&&Number.isFinite(view.nextDelivery)?`${dayLabel(view.nextDelivery!)} morning · paid, awaiting delivery`:'No outstanding shipment'}</p></div>
  <details><summary>FIFO batches · {view.batches.length}</summary><div className="max-h-32 overflow-y-auto">{view.batches.map((b,i)=><p key={i} className="border-b py-1">#{i+1} · {quantity(b.qty)} @ {money(b.costPerUnit)}{b.expiresDay!==undefined?` · expires ${dayLabel(b.expiresDay)}`:''}{b.condition!==undefined?` · condition ${b.condition}%`:''}</p>)}</div></details>
  <fieldset className="mc-slot p-2"><legend className="font-bold">Reorder settings</legend><div className="grid grid-cols-3 gap-1">{(['minimum','target','maximum'] as const).map(key=><label key={key} className="capitalize">{key}<input className="w-full mc-button p-1" aria-label={`${d.name} ${key}`} type="number" min={0} max={d.capacity} value={draft[key]} onChange={e=>setDraft({...draft,[key]:Number(e.target.value)})}/></label>)}</div><p className="my-2">Trigger below minimum; refill to target. Maximum includes incoming stock and laundry.</p><div className="flex gap-2"><button className="mc-button px-2 py-1" disabled={invalid} onClick={()=>controls.onRule(d.id,draft)}>Save levels</button><button className="mc-button px-2 py-1" onClick={()=>controls.onRule(d.id,null)}>Use forecast</button></div>{invalid&&<p role="alert">Use minimum ≤ target ≤ maximum ≤ capacity.</p>}</fieldset>
  <div className="mc-slot p-2" role="status"><b>{view.reason}</b><p>{view.action}</p></div>
  {actions}
  <p><b>{d.supplier}</b> · pack size {d.pack} {d.unit}.</p>
  <label className="block">Delivery<select aria-label="Inventory delivery" className="mc-button w-full p-2" value={mode} onChange={e=>setMode(e.target.value as DeliveryMode)}><option value="standard">Next morning · standard price</option><option value="emergency">Emergency · now, +10%</option></select></label>
  <div className="space-y-2">{d.tiers.map(tier=>Math.min(tier,capacity)).filter((qty,i,all)=>all.indexOf(qty)===i).map(qty=>{const price=stockQuote(d,qty,mode);return <button key={qty} className="mc-button w-full p-2 flex justify-between gap-2" disabled={!qty||cash<price||d.locked} onClick={()=>controls.onOrder(d.id,qty,mode)}><span>{qty?`Order ${quantity(qty)}`:'Storage full'}{qty>=d.tiers[1]?` · bulk price`:''}</span><span>{money(price)}<small className="block">{money(qty?price/qty:d.cost)} / unit</small></span></button>;})}</div>
 </section>;
}
