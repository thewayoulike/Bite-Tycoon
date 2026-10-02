import {Business,Property} from '../prototype/expansionModel';
import {createVenue,serviceBlocker,venueRules} from './venueSimulation';
import type {VenueInteraction} from '../prototype/BusinessInterior';
import {retailProduct} from './retail';
import {floorMilestone,maxFloors,nextFloorCost} from './lodging';
export function VenueHUD({p,b,onAction}:{p:Property;b:Business;onAction:(action:VenueInteraction,id?:number)=>void}){
  const v=b.venue??createVenue(p),rules=venueRules(p),waiting=v.visitors.filter(person=>person.state==='waiting'),blocked=serviceBlocker(p,b),dirty=v.units.filter(u=>u.dirty).length;
  return <section className="venue-hud" aria-label={`${p.name} live service`}>
    <header><strong>{v.running?'Live service':'Ready to open'}</strong><span>{rules.noun}</span></header>
    <div className="venue-metrics"><span><b>${v.week.revenue.toLocaleString()}</b>Sales this week</span><span><b>{v.week.served}</b>Served</span><span><b>{v.week.lost}</b>Left waiting</span></div>
    {!!v.units.length&&<p className="venue-occupancy">{v.units.filter(u=>u.occupied).length}/{v.units.length} {p.kind==='hotel'?'rooms occupied':'homes leased'} · {dirty} need {p.kind==='hotel'?'cleaning':'repairs'}</p>}
    {waiting.length?<div className="venue-queue">{waiting.slice(0,3).map(person=><button key={person.id} disabled={!!serviceBlocker(p,b,person.id)} onClick={()=>onAction('serve',person.id)}><span>{rules.verb} #{person.id}<small>{person.productId?`${person.quantity}× ${retailProduct(person.productId)?.name} · `:''}{Math.ceil(person.patience)}s patience</small></span><b>→</b></button>)}</div>:<p className="venue-hint">{v.running?'Visitors will arrive while the week runs. Your opening team helps; you can serve faster.':'Start the week above to welcome visitors. Hire helpers or order supplies before opening.'}</p>}
    {blocked&&waiting.length>0&&<p className="venue-warning">{blocked}</p>}
    {!!dirty&&<button className="venue-clean" onClick={()=>onAction('clean')}> {p.kind==='hotel'?'Clean next room':'Handle next repair'}</button>}
    <footer>Goal: {b.lodging?(b.lodging.openFloors>=maxFloors(p)?'All floors open · improve rooms and reputation':`Next floor: ${Math.min(v.totalServed,floorMilestone(b))}/${floorMilestone(b)} served · $${nextFloorCost(p,b).toLocaleString()}`):v.totalServed>=25?'Upgrade this property to grow capacity':`Serve ${v.totalServed}/25 ${rules.noun}`} · staff and stock below</footer>
  </section>;
}
