import {useState} from 'react';
import {ArrowUpRight,Check,MapPin,X} from 'lucide-react';
import type {GameState} from '../hooks/useGameLoop';
import {weeklyWages} from '../gameplay';
import {acquire,businessWages,ExpansionState,OPENING_CASH,PROPERTIES,propertyById} from '../prototype/expansionModel';
import {BusinessManagement,ManagementTab,RestaurantSection} from '../prototype/BusinessManagement';
import '../prototype/expansion.css';
import './world.css';
const money=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
export function WorldPropertyPanel({id,state,restaurants,onChange,onEnter,onClose,initialTab='run',inside=false,selectedUnit}:{id:string;state:ExpansionState;restaurants:Record<string,GameState>;onChange:(f:(s:ExpansionState)=>ExpansionState)=>void;onEnter:(id:string,section?:RestaurantSection)=>void;onClose:()=>void;initialTab?:ManagementTab;inside?:boolean;selectedUnit?:number}){
  const[tenure,setTenure]=useState<'owned'|'leased'>('leased'),[funding,setFunding]=useState('diner');
  const definition=propertyById(id)!,business=state.businesses[id],restaurant=restaurants[id];
  const p=restaurant?{...definition,capacity:restaurant.tables.length*4,wages:weeklyWages(restaurant.staff)}:definition;
  const source=state.businesses[funding]?funding:'diner',sourceCash=state.businesses[source].cash;
  const cost=(tenure==='owned'?p.buy:p.deposit)+OPENING_CASH;
  const planning=Object.values(restaurants).every(r=>r.phase==='planning');
  const sectionTitle:Record<ManagementTab,string>={run:'Operations',prices:p.kind==='shop'?'Products & prices':p.kind==='hotel'?'Rooms & rates':p.kind==='apartments'?'Homes & rents':'Offers & prices',bookings:p.kind==='apartments'?'Applications & leases':'Bookings',staff:'Staff',inventory:'Inventory',upgrades:'Upgrades',reports:'Financials',finance:'Loans'};
  return <aside className={`expansion-app in-world-panel ${business?"venue-management-window restaurant-console":""}`} role="dialog" aria-modal={!!business} aria-label={`${p.name} management`}>
    <div className="world-panel-heading"><div><span className="eyebrow">{p.kind==='cafe'?'CAFÉ':p.kind.toUpperCase()}{business?` · ${p.name}`:''}</span><h2>{business?sectionTitle[initialTab]:p.name}</h2></div><button className="world-panel-close" aria-label="Close building panel" onClick={onClose}><X size={18}/></button></div>
    {business&&initialTab==='run'&&<button className="world-enter-business" onClick={()=>onEnter(id,'restaurant')}>{inside?'Back to the floor':p.kind==='park'?'Enter & run park':'Enter & run business'}<ArrowUpRight size={16}/></button>}
    <div className="world-panel-body">
      <div className="world-property-status"><span>{business?<><Check size={13}/>{business.tenure==='owned'?'Owned':'Leased'}</>:'Available to open'}</span><small><MapPin size={11}/>{p.address}</small></div>
      {business?<BusinessManagement key={`${id}:${initialTab}:${selectedUnit??0}`} p={p} state={state} onChange={onChange} live inside hideEnter hideNavigation selectedUnit={selectedUnit} initialTab={initialTab} enterLabel={restaurant?'Run this restaurant':'View property'} onEnter={()=>onEnter(id,'restaurant')} onOpenInventory={()=>onEnter(id,'inventory')} restaurant={restaurant?{state:restaurant,onOpen:section=>onEnter(id,section)}:undefined}/>:<>
        <p className="property-description">{p.description}</p>
        <div className="property-facts"><div><strong>{p.capacity}</strong><span>{p.unit}</span></div><div><strong>{money(['restaurant','cafe'].includes(p.kind)?59:p.wages)}</strong><span>weekly wages</span></div></div>
        <div className="tenure-options"><button aria-pressed={tenure==='leased'} className={tenure==='leased'?'chosen':''} onClick={()=>setTenure('leased')}><span>Rent the space</span><strong>{money(p.deposit)}</strong><small>setup + deposit</small><em>{money(p.rent)} / week</em></button><button aria-pressed={tenure==='owned'} className={tenure==='owned'?'chosen':''} onClick={()=>setTenure('owned')}><span>{p.kind==='park'?'Buy the land':'Buy the building'}</span><strong>{money(p.buy)}</strong><small>purchase + setup</small><em>No weekly rent</em></button></div>
        <label className="pricing-control acquisition-funding">Fund with a loan from<select aria-label="Acquisition funding business" value={source} onChange={e=>setFunding(e.target.value)}>{PROPERTIES.filter(item=>state.businesses[item.id]).map(item=><option key={item.id} value={item.id}>{item.name} · {money(state.businesses[item.id].cash)}</option>)}</select></label>
        <p className="terms">Includes equipment, supplies, and {money(OPENING_CASH)} in the new account. Total loan: <strong>{money(cost)}</strong>. Cash stays separate and the loan is repayable.</p>
        <button className="primary wide" disabled={!planning||sourceCash<cost} onClick={()=>{onChange(s=>acquire(s,id,tenure,source));onEnter(id,'restaurant');}}>{!planning?'Acquire between weeks':sourceCash<cost?`Need ${money(cost-sourceCash)} more`:`${tenure==='owned'?'Buy':'Rent'} & open`}<ArrowUpRight size={16}/></button>
      </>}
    </div>
  </aside>;
}

export function WorldWeekReport({state,onClose}:{state:ExpansionState;onClose:()=>void}){
  return <div className="expansion-app world-report-backdrop"><section className="district-report" role="dialog" aria-modal="true" aria-labelledby="world-report-title"><button className="report-close" aria-label="Close district report" onClick={onClose}><X size={18}/></button><p className="eyebrow">SEPARATE BUSINESS ACCOUNTS</p><h2 id="world-report-title">Week {state.week-1} · your district</h2><div className="report-table"><table><thead><tr><th>Business</th><th>Sales</th><th>Rent</th><th>Wages owed</th><th>Profit</th><th>Own cash</th></tr></thead><tbody>{state.report.map(r=><tr key={r.id}><th>{propertyById(r.id)!.name}</th><td>{money(r.revenue)}</td><td>{money(r.rent)}</td><td>{money(r.wages)}</td><td>{money(r.profit)}</td><td>{money(state.businesses[r.id].cash)}</td></tr>)}</tbody></table></div><p>Wages are paid from each business after Day 3. Loans stay separate from sales.</p><button className="primary wide" onClick={onClose}>Back to the game</button></section></div>;
}
