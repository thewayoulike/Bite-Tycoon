import {departureTip,type CustomerDeparture} from './customerDepartures';
export function CustomerDepartureList({items,week}:{items?:CustomerDeparture[];week?:number}){
 const rows=(items??[]).filter(r=>week===undefined||r.week===week).slice(-8).reverse();
 if(!rows.length)return null;
 return <details className="mc-inner-panel customer-departures" style={{padding:'10px',marginBlock:'8px'}}><summary>Cancellation & walkout reasons ({rows.reduce((n,r)=>n+r.count,0)} recent)</summary>{rows.map((r,i)=><article key={i} style={{paddingBlock:'8px',borderBottom:'1px solid #d9d6ca'}}><b>{r.subject}{r.count>1?` · ${r.count} people`:''}</b><p style={{margin:'3px 0'}}>Week {r.week}{r.day?`, Day ${r.day}`:''} · {r.reason}</p><small>{departureTip(r.reason)}</small></article>)}</details>;
}
