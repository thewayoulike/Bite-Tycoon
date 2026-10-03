import {useState,SetStateAction} from 'react';
import {ArrowUpRight,Building2,Check,Coffee,Hotel,House,MapPin,RotateCcw,ShoppingBag,TreePine,UtensilsCrossed,Wallet,X} from 'lucide-react';
import {ExpansionMap} from './ExpansionMap';
import {BusinessInterior} from './BusinessInterior';
import {BusinessManagement,RestaurantSection} from './BusinessManagement';
import {acquire,BusinessKind,businessWages,createBusiness,ExpansionState,finishWeek,initialExpansion,nextDay,OPENING_CASH,project,PROPERTIES} from './expansionModel';
import type {GameState} from '../hooks/useGameLoop';
import {weeklyWages} from '../gameplay';
import './expansion.css';

const icons={restaurant:UtensilsCrossed,cafe:Coffee,hotel:Hotel,apartments:House,shop:ShoppingBag,park:TreePine,plaza:Building2};
const titles:Record<BusinessKind,string>={restaurant:'Restaurant',cafe:'Café',hotel:'Hotel',apartments:'Apartments',shop:'Retail shop',park:'Park',plaza:'Shopping plaza'};
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
export type LiveDistrict={restaurants:Record<string,GameState>;onEnter:(id:string,section:RestaurantSection)=>void;onReturn:()=>void;onStart:()=>void;onSpeed:(speed:number)=>void;speed:number;saveError:boolean};
export default function Prototype({state:connectedState,onChange,live}:{state?:ExpansionState;onChange?:(update:(s:ExpansionState)=>ExpansionState)=>void;live?:LiveDistrict}={}){
  const[demo,setDemo]=useState(initialExpansion),[selected,setSelected]=useState('cafe');
  const state=connectedState??demo;
  const setState=(update:SetStateAction<ExpansionState>)=>onChange?onChange(typeof update==='function'?update:()=>update):setDemo(update);
  const[tenure,setTenure]=useState<'leased'|'owned'>('leased'),[inside,setInside]=useState(false),[fundingId,setFundingId]=useState('diner');
  const definition=PROPERTIES.find(p=>p.id===selected)!,restaurant=live?.restaurants[selected];
  const p=restaurant?{...definition,capacity:restaurant.tables.length*4,wages:weeklyWages(restaurant.staff)}:live&&['restaurant','cafe'].includes(definition.kind)?{...definition,capacity:8,wages:59}:definition;
  const business=state.businesses[selected],Icon=icons[p.kind];
  const running=!!live&&Object.values(live.restaurants).some(r=>r.phase!=='planning');
  const mayAcquire=!running;
  const source=state.businesses[fundingId]?fundingId:'diner',sourceBusiness=state.businesses[source];
  const upfront=tenure==='owned'?p.buy:p.deposit,fundingNeeded=upfront+OPENING_CASH;
  const forecast=project(p,business??createBusiness(tenure));
  const cash=business?.cash??sourceBusiness.cash;
  const accountName=business?p.name:PROPERTIES.find(p=>p.id===source)!.name;
  const count=Object.keys(state.businesses).length,wages=state.payroll.reduce((sum,p)=>sum+p.amount,0)+(live?Object.values(live.restaurants).reduce((n,r)=>n+r.pendingPayroll.reduce((v,p)=>v+p.amount,0),0):0);
  const loans=state.loans.filter(l=>l.outstanding>0).length;
  const select=(id:string)=>{setSelected(id);setTenure('leased');if(!state.businesses[id]||live?.restaurants[id])setInside(false);};
  const reset=()=>{setState(initialExpansion());setSelected('cafe');setTenure('leased');setInside(false);setFundingId('diner');};
  return <div className="expansion-app">
    <header className="district-header">
      <a className="district-brand" href="/" onClick={live?e=>{e.preventDefault();live.onReturn();}:undefined}><span><UtensilsCrossed size={22}/></span><div>BITE TYCOON<small>{live?'RETURN TO RESTAURANT':'NEIGHBORHOOD EXPANSION'}</small></div></a>
      <div className="prototype-badge"><span/> {live?'Your neighborhood':'Interactive prototype'}</div>
      <div className="district-wallet"><Wallet size={19}/><div><small>{accountName} · {business?'business cash':'funding account'}</small><strong className={cash<0?'negative':''}>{money(cash)}</strong></div></div>
      {live?<button className="secondary" onClick={live.onReturn}>Back to restaurant</button>:<button className="reset-demo" title="Reset prototype" aria-label="Reset prototype" onClick={reset}><RotateCcw size={18}/></button>}
    </header>
    <main className="district-main">
      <section className="district-intro"><div><div className="eyebrow">ONE DINER. A WHOLE NEIGHBORHOOD.</div><h1>{inside&&business?'Make it your own.':'Your next chapter.'}</h1><p>Independent businesses. Separate accounts. A growing neighborhood.</p></div><div className="district-metrics"><span><strong>{count}<small>/ {PROPERTIES.length}</small></strong> businesses</span><span><strong>{loans}</strong> active loans</span></div></section>
      <div className="district-layout">
        <aside className="property-panel" aria-label="Property details">
          <div className="property-heading"><span className="property-icon" style={{background:p.accent}}><Icon size={25}/></span><span className={`property-status ${business?'yours':''}`}>{business?<><Check size={13}/>{business.tenure==='owned'?'Owned':'Leased'}</>:<><span/> Available to open</>}</span></div>
          <div className="eyebrow property-kind">{titles[p.kind]}</div><h2>{p.name}</h2>
          {!business&&<><p className="property-address"><MapPin size={13}/>{p.address}</p><p className="property-description">{p.description}</p></>}
          <div className="property-facts"><div><strong>{p.capacity+(business?.upgrade??0)*2}</strong><span>{p.unit}</span></div><div><strong>{money(restaurant?p.wages:business?businessWages(p,business):p.wages)}</strong><span>weekly wages</span></div><div><strong>{money(restaurant?restaurant.weekStats.revenue:forecast.revenue)}</strong><span>{restaurant?'sales this week':'est. weekly sales'}</span></div></div>
          {!business?<>
            <div className="section-caption">CHOOSE HOW TO EXPAND</div>
            <div className="tenure-options">
              <button className={tenure==='leased'?'chosen':''} aria-pressed={tenure==='leased'} onClick={()=>setTenure('leased')}><span>Rent the space</span><strong>{money(p.deposit)}</strong><small>setup + deposit</small><em>{money(p.rent)} / week</em>{tenure==='leased'&&<Check size={15}/>}</button>
              <button className={tenure==='owned'?'chosen':''} aria-pressed={tenure==='owned'} onClick={()=>setTenure('owned')}><span>{p.kind==='park'?'Buy the land':'Buy the building'}</span><strong>{money(p.buy)}</strong><small>purchase + setup</small><em>No weekly rent</em>{tenure==='owned'&&<Check size={15}/>}</button>
            </div>
            <label className="pricing-control acquisition-funding">Fund with a loan from<select aria-label="Acquisition funding business" value={source} onChange={e=>setFundingId(e.target.value)}>{PROPERTIES.filter(item=>state.businesses[item.id]).map(item=><option key={item.id} value={item.id}>{item.name} · {money(state.businesses[item.id].cash)}</option>)}</select></label>
            <p className="terms">Includes basic equipment and supplies. Add {money(OPENING_CASH)} for this business’s own opening cash. Total loan: <strong>{money(fundingNeeded)}</strong>, repayable to {PROPERTIES.find(item=>item.id===source)!.name}.</p>
            <div className="cash-after"><span>Lender’s remaining cash</span><strong className={sourceBusiness.cash<fundingNeeded?'negative':''}>{money(sourceBusiness.cash-fundingNeeded)}</strong></div>
            <button className="primary wide" disabled={!mayAcquire||sourceBusiness.cash<fundingNeeded} onClick={()=>{setState(s=>acquire(s,selected,tenure,source));if(live&&['restaurant','cafe'].includes(p.kind))live.onEnter(selected,'restaurant');else setInside(true);}}>{!mayAcquire?'Acquire between weeks':sourceBusiness.cash<fundingNeeded?'Funding business needs more cash':`${tenure==='leased'?'Rent':'Buy'} & open ${titles[p.kind].toLowerCase()}`}<ArrowUpRight size={18}/></button>
            <p className="small-note">Once opened, income, wages, rent, inventory, and upgrades stay in the new account. Cash moves between businesses only through recorded loans.</p>
          </>:<BusinessManagement key={p.id} state={state} p={p} onChange={setState} live={!!live} restaurant={restaurant?{state:restaurant,onOpen:section=>live!.onEnter(p.id,section)}:undefined} inside={inside} onEnter={()=>restaurant?live!.onEnter(p.id,'restaurant'):setInside(v=>!v)}/>}
        </aside>
        <section className="district-map" aria-label={inside&&business?'Business interior preview':'Interactive neighborhood'}>
          <div className="map-topline"><span><MapPin size={14}/>{inside&&business?p.name.toUpperCase():'THE MARKET DISTRICT'}</span><span>{inside&&business?(live?'Weekly operations · sales settle at week end':'Interior preview · sample activity'):'Drag to explore · scroll to zoom'}</span></div>
          {inside&&business?<><button className="map-reset" onClick={()=>setInside(false)}>Back to neighborhood</button><BusinessInterior p={p} b={business}/></>:<ExpansionMap selected={selected} businesses={state.businesses} onSelect={select}/>}
          <div className="map-legend">{inside&&business?<span>Staff, stock, pricing, and finance belong to this business.</span>:<><span><i/> Your business</span><span><i/> 7 starter properties</span></>}</div>
          <div className="property-strip">{PROPERTIES.map(item=>{const ItemIcon=icons[item.kind];return <button key={item.id} className={selected===item.id?'active':''} onClick={()=>select(item.id)} aria-label={`View ${item.name}`} aria-pressed={selected===item.id}><ItemIcon size={19}/><span>{item.id==='diner'?'Your diner':titles[item.kind]}<small>{state.businesses[item.id]?money(state.businesses[item.id].cash):`Rent ${money(item.deposit)}`}</small></span>{state.businesses[item.id]&&<span className="portfolio-check"><Check size={11}/></span>}</button>;})}</div>
        </section>
      </div>
      <section className="district-bottom"><div className="notice" role="status"><span><Building2 size={20}/></span><p>{state.notice}</p></div><div className="calendar"><span>WEEK {state.week}<strong>Day {state.day} of 7</strong></span>{live?<><button className="secondary" onClick={()=>live.onSpeed(live.speed?0:1)}>{live.speed?'Pause game':'Resume game'}</button><button className="primary" disabled={running} onClick={live.onStart}>{running?'Week in progress':`Start Week ${state.week}`}</button></>:<><button className="secondary" onClick={()=>setState(nextDay)}>Next day<ArrowUpRight size={16}/></button><button className="primary" onClick={()=>setState(finishWeek)}>Finish week<ArrowUpRight size={16}/></button></>}</div></section>
      <footer className="prototype-footer"><span>{live?(live.saveError?'Saving unavailable · keep this page open':'Autosaved on this device · separate business accounts'):'Prototype economy · separate business accounts · sample savings · resets on reload'}</span><span>{wages?`${money(wages)} wages due across businesses · Week ${state.week}, Day 4`:live?'Businesses continue operating when you switch views.':'Your main restaurant game is separate from this demo.'}</span></footer>
    </main>
    {!!state.report.length&&<div className="report-backdrop"><section className="district-report" role="dialog" aria-modal="true" aria-labelledby="report-title"><button className="report-close" aria-label="Close weekly report" onClick={()=>setState(s=>({...s,report:[]}))}><X size={20}/></button><div className="eyebrow">EACH BUSINESS STANDS ON ITS OWN</div><h2 id="report-title">Week {state.week-1}, in review.</h2><p>Sales and expenses settle in each business’s own account.</p><div className="report-table"><table><thead><tr><th>Business</th><th>Sales</th><th>Rent</th><th>Wages owed</th><th>Profit</th><th>Own cash</th></tr></thead><tbody>{state.report.map(row=><tr key={row.id}><th>{PROPERTIES.find(p=>p.id===row.id)!.name}</th><td>{money(row.revenue)}</td><td>{money(row.rent)}</td><td>{money(row.wages)}</td><td>{money(row.profit)}</td><td>{money(row.cash)}</td></tr>)}</tbody></table></div><p className="report-explanation">Supplies are paid when ordered. Wages come from the employing business after Day 3 of the new week. Acquisitions, upgrades, loans, and repayments appear separately in each Finance ledger.</p><button className="primary wide" onClick={()=>setState(s=>({...s,report:[]}))}>Plan Week {state.week}</button></section></div>}
  </div>;
}
