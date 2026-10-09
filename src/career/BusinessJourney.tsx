import type {EmpireState} from '../empire/empire';
import {propertyById} from '../prototype/expansionModel';
import {expansionFunding} from '../empire/expansionFunding';
import {careerMilestones} from './settings';
const money=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
export function BusinessJourney({empire,id,onEnter,onMarket}:{empire:EmpireState;id:string;onEnter:()=>void;onMarket?:()=>void}){
 const goals=careerMilestones(empire,id),next=goals.find(g=>!g.done),funds=expansionFunding(empire.district,id,empire.restaurants[id]);
 return <section aria-label="Your business journey"><h3>From opening day to your next business</h3>
  <div className="desk-help"><strong>{next?'Next: '+next.title:'Your businesses are growing'}</strong><p>{next?.hint??'Keep service reliable, protect each account and work toward the next paid upgrade.'}</p><button className="mc-button-selected" onClick={onEnter}>Enter {propertyById(id,empire.district.businesses[id])?.name}</button>{onMarket&&<button onClick={onMarket}>Browse expansion opportunities</button>}</div>
  <div className="desk-cards"><article><b>Cash in this business</b><h3>{money(funds.cash)}</h3><p>Sales add to this account. Its staff, supplies and bills are paid here.</p></article><article><b>Keep available to operate</b><h3>{money(funds.reserve)}</h3><p>Bills, next week’s wages, needed stock and your cash buffer.</p></article><article><b>Available for expansion</b><h3>{money(funds.available)}</h3><p>This can fund another business through a recorded loan. It is not a shared balance.</p></article></div>
  <ol className="desk-goals">{goals.map((g,i)=><li key={g.id} aria-current={next?.id===g.id?'step':undefined}><b>{g.done?'✓':i+1+'.'} {g.title}</b><p>{g.hint}</p></li>)}</ol>
 </section>;
}
