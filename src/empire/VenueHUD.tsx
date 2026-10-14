import {STORE_LEVELS,storeLevel} from './supermarket';
import {SupermarketLossAdvice} from './SupermarketLossAdvice';
import {storeShopperStatus,storeShopperBasketLabel} from './supermarketSimulation';
import {HOTEL_FLOORS,hotelCompletedNights} from './hotelProgression';
import {APARTMENT_FLOORS,apartmentWeeks} from './apartments';
import {Business,Property} from '../prototype/expansionModel';
import {createVenue,serviceBlocker,venueRules} from './venueSimulation';
import type {VenueInteraction} from '../prototype/BusinessInterior';
import {retailProduct} from './retail';
import {floorMilestone,maxFloors,nextFloorCost} from './lodging';
import {PLAZA_FLOORS,plazaFloorCost,plazaFloorMilestone} from './plaza';
export function VenueHUD({p,b,onAction}:{p:Property;b:Business;onAction:(action:VenueInteraction,id?:number)=>void}){
  const v=b.venue??createVenue(p),rules=venueRules(p),waiting=v.visitors.filter(person=>person.state==='waiting'),blocked=serviceBlocker(p,b),dirty=v.units.filter(u=>u.dirty).length;
  return <section className="venue-hud" aria-label={`${p.name} live service`}>
    <header><strong>{v.running?'Live service':'Ready to open'}</strong><span>{rules.noun}</span></header>
    <div className="venue-metrics"><span><b>${v.week.revenue.toLocaleString()}</b>Sales this week</span><span><b>{v.week.served}</b>Served</span><span><b>{v.week.lost}</b>{b.retail?'Left without buying':'Left waiting'}</span></div>
    {b.retail&&<><p className="venue-hint">{waiting.filter(v=>!v.basket).length} browsing · {waiting.filter(v=>v.basket&&(v.checkoutReadyAt??0)>(b.venue?.clock??0)).length} walking to checkout · {waiting.filter(v=>v.basket&&(v.checkoutReadyAt??0)<=(b.venue?.clock??0)).length} in checkout queue now</p></>}
    {!!v.units.length&&<p className="venue-occupancy">{v.units.filter(u=>u.occupied).length}/{v.units.length} {p.kind==='hotel'?'rooms occupied':p.kind==='plaza'?'shops leased':'homes leased'} · {dirty} need {p.kind==='hotel'||p.kind==='plaza'?'cleaning':'repairs'}</p>}
    {waiting.length?<div className="venue-queue">{waiting.slice(0,3).map(person=><button key={person.id} disabled={!!serviceBlocker(p,b,person.id)} onClick={()=>onAction('serve',person.id)}><span>{rules.verb} #{person.id}<small>{person.productId?`${b.retail?storeShopperBasketLabel(b,person):`${person.quantity}× ${retailProduct(person.productId)?.name}`} · `:''}{Math.ceil(person.patience)}s patience</small>{b.retail&&<small>{storeShopperStatus(b,person)}</small>}</span><b>→</b></button>)}</div>:<p className="venue-hint">{v.running?'Visitors will arrive while the week runs. Your opening team helps; you can serve faster.':'Start the week above to welcome visitors. Hire helpers or order supplies before opening.'}</p>}
    {blocked&&waiting.length>0&&<p className="venue-warning">{blocked}</p>}
    {!!dirty&&<button className="venue-clean" onClick={()=>onAction('clean')}> {p.kind==='hotel'?'Clean next room':'Handle next repair'}</button>}
    {b.retail&&<SupermarketLossAdvice b={b} compact onAction={onAction}/>}
    <footer>Goal: {b.retail?.store?(storeLevel(b)>=5?'All departments open · review margins and stock flow':`Level ${storeLevel(b)+1}: ${v.totalServed}/${STORE_LEVELS[storeLevel(b)].shoppers} shoppers · see Upgrades`):b.plaza?(b.plaza.openFloors>=PLAZA_FLOORS?'All mall floors open · improve tenant mix':`Next floor: ${Math.min(b.plaza.leasesSigned,plazaFloorMilestone(b))}/${plazaFloorMilestone(b)} leases · $${plazaFloorCost(b).toLocaleString()}`):b.lodging?(b.lodging.openFloors>=maxFloors(p)?'All floors open · improve rooms and reputation':p.kind==='hotel'?`Next floor: ${hotelCompletedNights(b)}/${HOTEL_FLOORS[b.lodging.openFloors]?.nights} completed room-nights · see Upgrades`:`Next floor: ${apartmentWeeks(b)}/${APARTMENT_FLOORS[b.lodging.openFloors]?.weeks} occupied-home weeks · see Upgrades`):v.totalServed>=25?'Upgrade this property to grow capacity':`Serve ${v.totalServed}/25 ${rules.noun}`} · staff and stock below</footer>
  </section>;
}
