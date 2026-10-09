import {useEffect,useState,useRef} from 'react';
import type {GameState} from '../hooks/useGameLoop';
import {acquire,PROPERTIES,propertyById,type ExpansionState} from '../prototype/expansionModel';
import {LAND_PLOTS,landPlotById,acquisitionQuote,builtPropertyId,canLease,constructionIdentity,marketKindName,propertyLevel} from './propertyMarket';
import {RestaurantTypePicker} from '../components/RestaurantTypePicker';
import {defaultRestaurantType} from '../restaurantTypes';
import {useDialogFocus} from '../ui/dialogFocus';
import './propertyMarket.css';
const money=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
export function PropertyMarket({state,restaurants,onChange,onEnter,onClose,onLocate,initialId}:{state:ExpansionState;restaurants:Record<string,GameState>;onChange:(f:(s:ExpansionState)=>ExpansionState)=>void;onEnter:(id:string)=>void;onClose:()=>void;onLocate?:(id:string)=>void;initialId?:string}){
 const first=Object.keys(state.businesses).length===0;
 const [selection,setSelection]=useState(initialId??'diner'),[tenure,setTenure]=useState<'owned'|'leased'>(initialId&&initialId!=='diner'?'owned':'leased');
 const [type,setType]=useState(defaultRestaurantType(initialId??'diner')),[source,setSource]=useState(Object.keys(state.businesses)[0]??''),[term,setTerm]=useState<10|20|40>(40),[pending,setPending]=useState<string|null>(null);
 const [search,setSearch]=useState(''),[area,setArea]=useState('All areas'),[limit,setLimit]=useState(12);
 const dialog=useDialogFocus<HTMLElement>(onClose),market=state.market!,articleRef=useRef<HTMLElement>(null);
 useEffect(()=>{articleRef.current?.scrollTo({top:0});},[selection]);
 const selectedPlot=selection.startsWith('plot-')?landPlotById(selection.slice(5)):undefined;
 const resolved=selectedPlot?builtPropertyId(selectedPlot.id,selectedPlot.kinds[0]):selection;
 const id=propertyById(resolved)?resolved:'diner';
 const p=propertyById(id)!,built=constructionIdentity(id),food=['restaurant','cafe'].includes(p.kind),method=built?'construction':canLease(p.kind)&&tenure==='leased'?'lease':'purchase',quote=acquisitionQuote(p,method);
 const funding=state.businesses[source]?source:Object.keys(state.businesses)[0]??'',cash=first?market.ownerCash:state.businesses[funding]?.cash??0,total=quote.cost+(first?0:quote.workingCash),locked=market.level<quote.level;
 const planning=Object.values(restaurants).every(r=>r.phase==='planning')&&!Object.values(state.businesses).some(b=>b.venue?.running);
 const owned=!!state.businesses[id]||!!(built&&market.parcels[built.plot.id]);
 useEffect(()=>{if(pending&&state.businesses[pending]){onEnter(pending);setPending(null);onClose();}},[pending,state.businesses]);
 const choose=(next:string,lease=false)=>{setSelection(next);setTenure(lease?'leased':'owned');setType(defaultRestaurantType(next));};
 const availablePlots=LAND_PLOTS.filter(plot=>!market.parcels[plot.id]),shownPlots=availablePlots.filter(plot=>(area==='All areas'||area===plot.area)&&plot.name.toLowerCase().includes(search.trim().toLowerCase()));
 return <div className="property-market-backdrop"><section ref={dialog.ref} tabIndex={-1} onKeyDown={dialog.onKeyDown} className="mc-panel property-market" role="dialog" aria-modal="true" aria-label="Property market">
  <header><div><small>BITE TYCOON MANAGEMENT CONSOLE · PLAYER LEVEL {market.level}</small><h1>{first?'Choose your first business':'Property market'}</h1><p>{first?'Your starting investment: '+money(market.ownerCash):'Each property has its own cash, staff and stockroom.'}</p></div><button className="mc-button" onClick={onClose}>{first?'Browse map':'Close'}</button></header>
  <div className="market-body"><nav aria-label="Available properties">
   <h2>{first?'Start in the commercial district':'Buildings & serviced land'}</h2>
   {(first?[PROPERTIES[0],PROPERTIES[3]]:PROPERTIES.filter(p=>!state.businesses[p.id])).map(item=><button key={item.id} className="mc-button market-choice" aria-pressed={id===item.id} onClick={()=>choose(item.id,item.id==='diner')}><strong>{item.id==='diner'?'Market Street restaurant':item.name}</strong><span>{propertyLevel(item.kind)>market.level?'Locked · Player Level '+propertyLevel(item.kind):item.id==='diner'?'For lease · '+money(acquisitionQuote(item,'lease').cost):'For sale · '+money(acquisitionQuote(item,'purchase').cost)}</span></button>)}
   <h2>Commercial sites · {availablePlots.length} available</h2>
   <p className="market-site-help">Green signs: empty land. Gold signs: redevelopment sites. Click a site on the map or find its address here.</p>
   <label className="market-label">Find a site<input type="search" aria-label="Search commercial sites" placeholder="Address or avenue" value={search} onChange={e=>{setSearch(e.target.value);setLimit(12);}}/></label>
   <label className="market-label">Area<select aria-label="Commercial area" value={area} onChange={e=>{setArea(e.target.value);setLimit(12);}}>{['All areas','Town centre','North Market','East Market','South Market'].map(a=><option key={a}>{a}</option>)}</select></label>
   <p className="market-site-help">{shownPlots.length} matching sites · land is included in every build quote.</p>
   {shownPlots.slice(0,limit).map(plot=><button key={plot.id} className="mc-button market-choice" aria-pressed={built?.plot.id===plot.id} onClick={()=>choose('plot-'+plot.id)}><strong>{plot.name}</strong><span>{plot.area} · {plot.vacant?'Empty land':'Redevelopment site'}</span></button>)}
   {!shownPlots.length&&<p>No sites match this search.</p>}
   {shownPlots.length>limit&&<button className="mc-button" onClick={()=>setLimit(n=>n+24)}>Show more sites</button>}
   <div className="market-level-help"><strong>How player levels work</strong><p>Your highest earned business level unlocks new property types. Buying property does not raise your level.</p><p>Level 1: restaurants & supermarkets<br/>Level 3: hotels<br/>Level 4: apartments<br/>Level 5: shopping malls</p><p>Grow through service milestones and paid upgrades. For example, a restaurant needs 60 guests for Level 2 and 180 guests plus an 80% service result for Level 3. See each business’s Upgrades panel for every requirement.</p></div>
  </nav><article ref={articleRef}>
   <h2>{built?'Build on '+built.plot.name:p.id==='diner'?'Market Street restaurant':p.name}</h2>
   {built&&<><p>{built.plot.description}</p><div className="market-location"><span>{built.plot.area} · map {built.plot.position[0]}, {built.plot.position[2]}</span>{onLocate&&<button className="mc-button" onClick={()=>onLocate('plot-'+built.plot.id)}>Locate on map</button>}</div><label className="market-label">What would you like to build?<select aria-label="Building type" value={id} onChange={e=>choose(e.target.value)}>{built.plot.kinds.map(kind=><option key={kind} value={builtPropertyId(built.plot.id,kind)}>{marketKindName(kind)} · Player Level {propertyLevel(kind)}</option>)}</select></label><p className="market-site-help">Malls are purchase-only. Buy the existing Willow Galleria Mall after reaching Player Level 5.</p></>}
   {p.kind==='plaza'&&<p>Purchase-only · malls cannot be leased or constructed. Buy this building, then earn and pay for its upper-floor upgrades.</p>}
   {!built&&canLease(p.kind)&&<div className="market-tenure"><button className="mc-button" aria-pressed={method==='lease'} onClick={()=>setTenure('leased')}>Lease · {money(acquisitionQuote(p,'lease').cost)}</button><button className="mc-button" aria-pressed={method==='purchase'} onClick={()=>setTenure('owned')}>Buy · {money(acquisitionQuote(p,'purchase').cost)}</button></div>}
   {food&&<RestaurantTypePicker value={type} onChange={setType} id="market-restaurant-type"/>}
   <div className="mc-panel market-package"><strong>Ready to open · Business Level 1</strong><p>{food?'Dining room, tables, chairs, equipped kitchen, chef, waiter and ingredients for your selected type.':p.kind==='shop'?'Grocery displays, checkout, receiving area, cashier, stock assistant and initial produce, bread, milk and pantry stock.':p.kind==='hotel'?'Ground-floor reception and lounge, plus Floor 1 with four furnished standard guest rooms, bathrooms, linen, supplies and the opening team.':p.kind==='apartments'?'Ground-floor reception, plus Floor 1 with three studio homes, essential furnishings, maintenance supplies and the opening team.':'Ground-floor shopping concourse with four ready-to-let shops, shared facilities, opening supplies and the building team. Tenant applications arrive when you start the week.'}</p>
   {['hotel','apartments'].includes(p.kind)&&<p><b>Upper floors are not included.</b> Meet each floor’s service requirements, then pay its build cost in Upgrades. {p.kind==='hotel'?'Five guest floors':'Ten residential floors'} maximum, plus ground-floor reception. Your player level never opens these floors for free.</p>}
   <p>Furniture, equipment and starting stock are included in this quote. Ongoing wages, restocking and later upgrades are paid by this business.</p></div>
   {!first&&<><label className="market-label">Lending business<select aria-label="Acquisition funding business" value={funding} onChange={e=>setSource(e.target.value)}>{Object.keys(state.businesses).map(key=><option key={key} value={key}>{propertyById(key)!.name} · {money(state.businesses[key].cash)}</option>)}</select></label><label className="market-label">Property loan term<select aria-label="Property loan term" value={term} onChange={e=>setTerm(Number(e.target.value) as typeof term)}>{[10,20,40].map(n=><option key={n} value={n}>{n} weeks</option>)}</select></label></>}
   <dl className="market-quote">{built&&<><dt>Land (included)</dt><dd>{money(quote.land)}</dd><dt>Building, fit-out & starter stock (included)</dt><dd>{money(quote.building)}</dd></>}<dt><b>{built?'Total build cost':method==='lease'?'Lease opening package':'Purchase opening package'}</b></dt><dd><b>{money(quote.cost)}</b></dd>{!first&&<><dt>Opening cash retained in new account</dt><dd>{money(quote.workingCash)}</dd><dt>Total repayable property loan</dt><dd>{money(total)}</dd><dt>Automatic loan payment / week</dt><dd>{money(Math.ceil(total/term*100)/100)}</dd></>}<dt>{first?'Cash left in your new business':'Lender’s cash after funding'}</dt><dd className={cash<total?'text-red-700':'text-green-700'}>{money(cash-total)}</dd><dt>Opening team wages / week</dt><dd>{money(food?59:p.wages)}</dd><dt>Property rent</dt><dd>{method==='lease'?money(quote.monthlyRent)+' / month':'None · owned building'}</dd></dl>
   {method==='lease'&&<p>One game month is four weeks. Rent is recorded weekly and paid automatically at the end of Week {state.week+3}, then every four weeks.</p>}
   {!first&&<p>The loan starts repayment in Week {state.week+1}, Day 4. Funding is a loan between separate businesses, not sales income.</p>}
   <p role="status" className="market-notice">{state.notice}</p>
   <button className="mc-button-green market-confirm" disabled={locked||owned||!planning||cash<total} onClick={()=>{setPending(id);onChange(s=>acquire(s,id,method==='lease'?'leased':'owned',funding,food?type:undefined,term));}}>{owned?'Already acquired':locked?`Reach player Level ${quote.level}`:!planning?'Acquire between weeks':cash<total?`Need ${money(total-cash)} more`:built?'Buy land, build & enter':method==='lease'?'Lease & enter':'Buy & enter'}</button>
  </article></div>
 </section></div>;
}
