import {PropertyMarket} from './PropertyMarketPanel';
import {canLease} from './propertyMarket';
import {internalRentForWeek} from '../career/mallCompanies';
import {useState} from 'react';
import {useDialogFocus} from '../ui/dialogFocus';
import {ArrowUpRight,Check,MapPin,X} from 'lucide-react';
import type {GameState} from '../hooks/useGameLoop';
import {weeklyWages} from '../gameplay';
import {acquire,businessWages,ExpansionState,OPENING_CASH,PROPERTIES,propertyById} from '../prototype/expansionModel';
import {BusinessManagement,ManagementTab,RestaurantSection} from '../prototype/BusinessManagement';
import '../prototype/expansion.css';
import './world.css';
import {weeklyProfitLoss} from './weeklyFinance';
import {WeeklyProfitLoss,reportMoney} from './WeeklyProfitLoss';
import {RestaurantTypePicker} from '../components/RestaurantTypePicker';
import {defaultRestaurantType} from '../restaurantTypes';
import {CashForecastContext} from '../components/CashForecast';
import {protectedObligations} from './cashProtection';
import {businessSupplies} from '../prototype/expansionModel';
const money=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
export function WorldPropertyPanel({id,state,restaurants,onChange,onEnter,onClose,initialTab='run',inside=false,selectedUnit}:{id:string;state:ExpansionState;restaurants:Record<string,GameState>;onChange:(f:(s:ExpansionState)=>ExpansionState)=>void;onEnter:(id:string,section?:RestaurantSection)=>void;onClose:()=>void;initialTab?:ManagementTab;inside?:boolean;selectedUnit?:number}){
  const[tenure,setTenure]=useState<'owned'|'leased'>(canLease(propertyById(id,state.businesses[id])!.kind)?'leased':'owned'),[funding,setFunding]=useState('diner');
  const[term,setTerm]=useState<10|20|40>(40);
  const[restaurantType,setRestaurantType]=useState(defaultRestaurantType(id));
  const definition=propertyById(id,state.businesses[id])!,business=state.businesses[id],restaurant=restaurants[id];
  const p=restaurant?{...definition,capacity:restaurant.tables.length*4,wages:weeklyWages(restaurant.staff)}:definition;
  const source=state.businesses[funding]?funding:'diner',sourceCash=state.businesses[source]?.cash??0;
  const cost=(tenure==='owned'?p.buy:p.deposit)+OPENING_CASH;
  const planning=Object.values(restaurants).every(r=>r.phase==='planning');
  const sectionTitle:Record<ManagementTab,string>={run:'Operations',prices:p.kind==='shop'?'Products & prices':p.kind==='hotel'?'Rooms & rates':p.kind==='apartments'?'Homes & rents':p.kind==='plaza'?'Shops & rents':'Offers & prices',bookings:p.kind==='plaza'?'Tenants & leases':p.kind==='apartments'?'Applications & leases':'Bookings',staff:'Staff',inventory:'Inventory',upgrades:'Upgrades',reports:'Financials',finance:'Loans'};
  const dialog=useDialogFocus<HTMLElement>();
  if(state.market&&!business)return <PropertyMarket initialId={id} state={state} restaurants={restaurants} onChange={onChange} onEnter={onEnter} onClose={onClose}/>;
  return <aside ref={dialog.ref} tabIndex={-1} onKeyDown={dialog.onKeyDown} className={`expansion-app in-world-panel ${business?"venue-management-window restaurant-console":""}`} role="dialog" aria-modal={!!business} aria-label={`${p.name} management`}>
    <div className="world-panel-heading"><div><span className="eyebrow">{p.kind==='plaza'?'SHOPPING MALL':p.kind==='cafe'?'CAFÉ':p.kind.toUpperCase()}{business?` · ${p.name}`:''}</span><h2>{business?sectionTitle[initialTab]:p.name}</h2></div><button className="world-panel-close" aria-label="Close building panel" onClick={onClose}><X size={18}/></button></div>
    {business&&initialTab==='run'&&<button className="world-enter-business" onClick={()=>onEnter(id,'restaurant')}>{inside?'Back to the floor':p.kind==='park'?'Enter & run park':'Enter & run business'}<ArrowUpRight size={16}/></button>}
    <div className="world-panel-body">
      <div className="world-property-status"><span>{business?<><Check size={13}/>{business.tenure==='owned'?'Owned':'Leased'}</>:'Available to open'}</span><small><MapPin size={11}/>{p.address}</small></div>
      {business?<CashForecastContext.Provider value={{cash:business.cash,protectedCash:protectedObligations(p,business,state,restaurant).total+(restaurant?.manager.reserve??business.manager?.reserve??0),stock:businessSupplies(p,business).reduce((n,i)=>n+Math.max(0,10-i.quantity)*i.costPerUnit,0),weeklyWages:restaurant?weeklyWages(restaurant.staff):businessWages(p,business)}}><BusinessManagement key={`${id}:${initialTab}:${selectedUnit??0}`} p={p} state={state} onChange={onChange} live inside hideEnter hideNavigation selectedUnit={selectedUnit} initialTab={initialTab} enterLabel={restaurant?'Run this restaurant':'View property'} onEnter={()=>onEnter(id,'restaurant')} onOpenInventory={()=>onEnter(id,'inventory')} restaurant={restaurant?{state:restaurant,onOpen:section=>onEnter(id,section)}:undefined}/></CashForecastContext.Provider>:<>
        <p className="property-description">{p.description}</p>
        {['restaurant','cafe'].includes(p.kind)&&<RestaurantTypePicker id="acquisition-restaurant-type" value={restaurantType} onChange={setRestaurantType}/>}
        <div className="property-facts"><div><strong>{p.capacity}</strong><span>{p.unit}</span></div><div><strong>{money(['restaurant','cafe'].includes(p.kind)?59:p.wages)}</strong><span>weekly wages</span></div></div>
        <div className="tenure-options">{canLease(p.kind)&&<button aria-pressed={tenure==='leased'} className={tenure==='leased'?'chosen':''} onClick={()=>setTenure('leased')}><span>Rent the space</span><strong>{money(p.deposit)}</strong><small>setup + deposit</small><em>{money(p.rent)} / week</em></button>}<button aria-pressed={tenure==='owned'} className={tenure==='owned'?'chosen':''} onClick={()=>setTenure('owned')}><span>{p.kind==='park'?'Buy the land':'Buy the building'}</span><strong>{money(p.buy)}</strong><small>purchase + setup</small><em>No weekly rent</em></button></div>
        <label className="pricing-control acquisition-funding">Fund with a loan from<select aria-label="Acquisition funding business" value={source} onChange={e=>setFunding(e.target.value)}>{PROPERTIES.filter(item=>state.businesses[item.id]).map(item=><option key={item.id} value={item.id}>{item.name} · {money(state.businesses[item.id].cash)}</option>)}</select></label>
        <label>Property loan term<select aria-label="Acquisition loan term" value={term} onChange={e=>setTerm(Number(e.target.value) as typeof term)}>{[10,20,40].map(n=><option value={n} key={n}>{n} weeks</option>)}</select></label><p>Funding account after acquisition: {money(sourceCash-cost)}. New account opening cash: {money(OPENING_CASH)}. Weekly team {money(['restaurant','cafe'].includes(p.kind)?59:p.wages)} + lease {money(tenure==='leased'?p.rent:0)} + loan {money(Math.ceil(cost/term*100)/100)}. Opening stock is included; further restocking is paid separately.</p><p className="terms">Includes equipment, supplies, and {money(OPENING_CASH)} in the new account. Total loan: <strong>{money(cost)}</strong>. Automatic repayment: {money(Math.ceil(cost/term*100)/100)} / week from Week {state.week+1}, Day 4.{tenure==='leased'&&` Property rent of ${money(p.rent)} is paid automatically at week-end.`}</p>
        <button className="primary wide" disabled={!planning||sourceCash<cost} onClick={()=>{onChange(s=>acquire(s,id,tenure,source,['restaurant','cafe'].includes(p.kind)?restaurantType:undefined,term));onEnter(id,'restaurant');}}>{!planning?'Acquire between weeks':sourceCash<cost?`Need ${money(cost-sourceCash)} more`:`${tenure==='owned'?'Buy':'Rent'} & open`}<ArrowUpRight size={16}/></button>
      </>}
    </div>
  </aside>;
}

export function WorldWeekReport({state,restaurants={},onClose}:{state:ExpansionState;restaurants?:Record<string,GameState>;onClose:()=>void}){
 const[period,setPeriod]=useState<'week'|'last'>('week'),[selected,setSelected]=useState('diner');
 const closed=period==='last';
 const reports=closed?(state.closedWeek?.reports??[]):Object.keys(state.businesses).map(id=>propertyById(id,state.businesses[id])!).map(p=>weeklyProfitLoss(p,state.businesses[p.id],state,restaurants[p.id]));
 const legacy=closed&&!state.closedWeek;
 const rows=legacy?state.report.map(r=>({...r,name:propertyById(r.id,state.businesses[r.id])?.name??r.id,partial:false,cogs:null,other:null})):reports.map(r=>({...r,other:r.overhead-r.wages}));
 const detail=reports.find(r=>r.id===selected)??reports[0];
 const eliminated=closed?(state.closedWeek?.internalRent??0):internalRentForWeek(state,state.week);
 const total=(key:'revenue'|'cogs'|'wages'|'other'|'profit'|'cash')=>rows.reduce((sum,r)=>sum+(r[key]??0),0)-(['revenue','other'].includes(key)?eliminated:0);
 const closingWeek=state.closedWeek?.week??state.week-1;
 const dialog=useDialogFocus<HTMLElement>();
 return <div className="expansion-app world-report-backdrop" onKeyDown={dialog.onKeyDown}><section ref={dialog.ref} tabIndex={-1} className="district-report weekly-district-report" role="dialog" aria-modal="true" aria-labelledby="world-report-title">
  <button className="report-close" aria-label="Close district report" onClick={onClose}><X size={18}/></button><p className="eyebrow">SEPARATE BUSINESS ACCOUNTS</p><h2 id="world-report-title">{closed?`Week ${closingWeek} · closing summary`:`Week ${state.week}, Day ${state.day} · live district P&L`}</h2>
  <div className="pc-subtabs financial-period-tabs" role="tablist" aria-label="District report period"><button role="tab" aria-selected={!closed} onClick={()=>setPeriod('week')}>This week · {state.week}</button><button role="tab" aria-selected={closed} disabled={!state.closedWeek&&!state.report.length} onClick={()=>setPeriod('last')}>Last closing summary</button></div>
  <p className="report-period-caption">{closed?'Saved at week close; these figures stay fixed as the next week runs. ':'All owned and rented properties. '}{!legacy&&'Select a business for its detailed P&L below. '}Totals compare performance; each business keeps its own cash.</p>
  {legacy&&<p className="weekly-history-note">This older closing summary saved totals only. Missing cost details cannot be recovered. Detailed closing reports begin at the next week close; the original recorded profits are preserved below.</p>}
  {reports.some(r=>r.partial)&&<p className="weekly-history-note">Some older saved costs cannot be assigned to {closed?'this completed week':'this week'}. * marks partial figures; complete weekly tracking {closed?'started the following week':'starts next week'}.</p>}
  <div className="report-table"><table><thead><tr><th>Business</th><th>Revenue</th><th>Products & supplies</th><th>Wages earned</th><th>Other costs</th><th>Profit</th><th>{closed?'Closing cash':'Own cash'}</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><th>{legacy?r.name:<button aria-pressed={detail?.id===r.id} onClick={()=>setSelected(r.id)}>{r.name}{r.partial?' *':''}</button>}</th><td>{reportMoney(r.revenue)}</td><td>{r.cogs===null?'Not recorded':reportMoney(r.cogs)}</td><td>{reportMoney(r.wages)}</td><td>{r.other===null?'Not recorded':reportMoney(r.other)}</td><td className={r.profit<0?'pc-red':'pc-green'}>{reportMoney(r.profit)}</td><td>{reportMoney(r.cash)}</td></tr>)}<tr className="report-total"><th>{reports.some(r=>r.partial)?'Tracked total *':'District total'}</th><td>{reportMoney(total('revenue'))}</td><td>{legacy?'Not recorded':reportMoney(total('cogs'))}</td><td>{reportMoney(total('wages'))}</td><td>{legacy?'Not recorded':reportMoney(total('other'))}</td><td>{reportMoney(total('profit'))}</td><td>{reportMoney(total('cash'))}</td></tr></tbody></table></div>
  {detail&&<WeeklyProfitLoss report={detail} closed={closed}/>}
  <p>District totals eliminate {reportMoney(eliminated)} of internal mall rent from both income and costs. Individual reports keep it. Wages are paid from each business after Day 3. Loans stay separate from sales.</p><button className="primary wide" onClick={onClose}>Back to the game</button>
 </section></div>;
}
