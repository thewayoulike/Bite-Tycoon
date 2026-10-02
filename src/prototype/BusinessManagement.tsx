import {useState} from 'react';
import {ArrowUpRight, Check, Package, Sparkles, Users, Wallet} from 'lucide-react';
import {BUSINESS_TEAMS,businessSupplies,businessWages,changeBusiness,ExpansionState,hireBusinessStaff,lendCash,project,PROPERTIES,Property,repayLoan,restockBusinessItem,setBusinessManager} from './expansionModel';
import type {GameState} from '../hooks/useGameLoop';
import {activeRecipes,weeklyWages} from '../gameplay';
import {operateVenue,serviceBlocker,venueRules} from '../empire/venueSimulation';
import {BusinessCatalog} from '../empire/BusinessCatalog';
import {BusinessInventory} from '../empire/BusinessInventory';
import {BusinessPurchasing} from '../empire/BusinessPurchasing';
import {BusinessStatements} from '../empire/BusinessStatements';
import {isLodging} from '../empire/lodging';
import {LodgingManagement} from '../empire/LodgingManagement';

const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
export type RestaurantSection='restaurant'|'upgrades'|'inventory'|'recipes';
export type ManagementTab='run'|'prices'|'bookings'|'staff'|'inventory'|'upgrades'|'reports'|'finance';
export function BusinessManagement({state,p,onChange,onEnter,inside,live=false,restaurant,initialTab='run',enterLabel,hideEnter=false,hideNavigation=false,onOpenInventory,selectedUnit}:{state:ExpansionState;p:Property;onChange:(update:(s:ExpansionState)=>ExpansionState)=>void;onEnter:()=>void;inside:boolean;live?:boolean;initialTab?:ManagementTab;enterLabel?:string;hideEnter?:boolean;hideNavigation?:boolean;selectedUnit?:number;onOpenInventory?:()=>void;restaurant?:{state:GameState;onOpen:(tab:RestaurantSection)=>void}}){
  const[tab,setTab]=useState<ManagementTab>(initialTab);
  const[lender,setLender]=useState('diner'),[amount,setAmount]=useState(250);
  const b=state.businesses[p.id],forecast=project(p,b),supplies=businessSupplies(p,b);
  const sources=PROPERTIES.filter(item=>item.id!==p.id&&state.businesses[item.id]);
  const source=sources.find(item=>item.id===lender)??sources[0];
  const loans=state.loans.filter(l=>(l.from===p.id||l.to===p.id)&&l.outstanding>0);
  const manage=(action:Parameters<typeof changeBusiness>[2])=>onChange(s=>b.venue&&action==='help'?operateVenue(s,p.id,'serve'):changeBusiness(s,p.id,action));
  return <div className="operations">
    <div className="business-cash"><span><Wallet size={15}/> This business’s cash</span><strong className={b.cash<0?'negative':''}>{money(b.cash)}</strong></div>
    {!hideEnter&&<button className="primary wide" onClick={onEnter}>{enterLabel??(inside?'Return to neighborhood':'Enter & manage business')}<ArrowUpRight size={16}/></button>}
    {!hideNavigation&&<div className="management-tabs" role="tablist" aria-label="Business management">
      {(restaurant?([['run','Run',Sparkles],['staff','Staff',Users],['inventory','Inventory',Package],['finance','Loans',Wallet]] as const):([['run','Operations',Sparkles],['prices',p.kind==='shop'?'Products & prices':'Offers & prices',Package],['staff','Staff',Users],['inventory','Inventory',Package],['upgrades','Upgrades',Sparkles],['reports','Financials',Wallet],['finance','Loans',Wallet]] as const)).map(([id,title,Icon])=><button key={id} role="tab" aria-selected={tab===id} onClick={()=>id==='inventory'&&onOpenInventory?onOpenInventory():setTab(id)}><Icon size={13}/>{title}</button>)}
    </div>}
    {restaurant&&tab!=='finance'&&<section role="tabpanel" aria-label="Restaurant operations">
      <div className="management-summary"><strong>{tab==='staff'?'Your own restaurant team':tab==='inventory'?'Your own pantry & menu':'Live restaurant service'}</strong><span>{restaurant.state.staff.chefs} chefs · {restaurant.state.staff.waiters} waiters · {restaurant.state.staff.cleaners} cleaners · {money(weeklyWages(restaurant.state.staff))} wages / week</span></div>
      <p className="small-note">{restaurant.state.customers.length} groups visiting · {restaurant.state.orders.length} kitchen tickets · {activeRecipes(restaurant.state).length} active dishes. Menu, ingredients, staff, upgrades, and money belong to {p.name}.</p>
      <button className="primary wide" onClick={()=>restaurant.onOpen(tab==='staff'?'upgrades':tab==='inventory'?'inventory':'restaurant')}>{tab==='staff'?'Manage this team':tab==='inventory'?'Open this pantry':'Enter & run service'}<ArrowUpRight size={15}/></button>
      <button className="secondary wide" style={{marginTop:10}} onClick={()=>restaurant.onOpen('recipes')}>Edit this menu & prices</button>
      {!restaurant.state.staff.waiters&&<p className="small-note">This business needs you to take orders and serve food until you hire a waiter. Pause the game while planning, or return to help the floor.</p>}
    </section>}
    {b.lodging&&['run','prices','bookings','staff','upgrades'].includes(tab)&&<LodgingManagement p={p} b={b} state={state} section={tab} selectedUnit={selectedUnit} onChange={onChange}/>}
    {tab==='run'&&!restaurant&&!b.lodging&&<section role="tabpanel" aria-label="Run business">
      <p className="small-note">Set individual prices in {p.kind==='shop'?'Products & prices':'Offers & prices'}. Your opening team handles routine service; stepping in reduces waiting and lost customers.</p>
      <div className="business-meters">{[['Supplies',b.stock],['Condition',b.condition]].map(([label,n])=><div key={label as string}><span>{label}<strong>{n}%</strong></span><div className="meter"><i style={{width:`${n}%`,background:Number(n)<35?'#bd684b':'#638678'}}/></div></div>)}</div>
      <button className="primary wide" disabled={b.venue?!!serviceBlocker(p,b):b.helped} onClick={()=>manage('help')}><Sparkles size={16}/>{b.venue?(serviceBlocker(p,b)??`${venueRules(p).verb} next visitor`):b.helped?'You helped this week':p.task}</button>
      <div className="operation-buttons"><button disabled={b.condition===100||b.cash<45} onClick={()=>manage('care')}>{p.care}<strong>{b.condition===100?'Ready':'$45'}</strong></button><button disabled={b.upgrade===3||b.cash<600*(b.upgrade+1)} onClick={()=>manage('upgrade')}>Upgrade the space<strong>{b.upgrade===3?'Max level':money(600*(b.upgrade+1))}</strong></button></div>
      <div className="cash-after"><span>{b.venue?'Week profit so far':'Est. weekly profit'}<small>After rent, accrued wages, and supplies bought this week</small></span><strong>{money(forecast.profit)}</strong></div>
      <p className="small-note">{b.venue?'Visitors arrive during the week. Serve them on the floor to collect payment immediately. Rooms need cleaning, tenants need repairs, and low stock blocks service. Your staff keep working while you visit other properties.':live?'Sales settle at week end. Prices, staffing, supplies, and upkeep determine results.':'This prototype simulates service with weekly actions. Restaurant service is available in the main game.'}</p>
      {!!b.venue?.units.length&&<div className="unit-list"><h3>{p.kind==='hotel'?'Guest rooms':'Residential units'}</h3>{b.venue.units.map((unit,i)=><div key={i}><span><strong>{p.kind==='hotel'?'Room':'Home'} {i+1}</strong><small>Floor {1+Math.floor(i/(p.kind==='hotel'?4:3))} · {unit.occupied?(p.kind==='hotel'?`Occupied · ${Math.ceil(unit.remaining)}s stay remaining`:`Leased · ${money(unit.rent??180)}/week`):'Vacant'} · {unit.dirty?'needs care':'ready'}</small></span><button disabled={!unit.dirty} onClick={()=>onChange(s=>operateVenue(s,p.id,'clean',i))}>{unit.dirty?(p.kind==='hotel'?'Clean':'Repair'):'Ready'}</button></div>)}</div>}
    </section>}
    {tab==='staff'&&!restaurant&&!b.lodging&&<section role="tabpanel" aria-label="Manage staff">
      <div className="management-summary"><strong>Opening team included</strong><span>{money(p.wages)} base wages per week</span></div>
      {BUSINESS_TEAMS[p.kind].map((name,i)=>{const role=i===0?'service':'care',count=b.hires?.[role]??0;return <div className="staff-card" key={role}><div><strong>{name}</strong><span>{count} additional · +$35 / week each</span><small>{i===0?'More service capacity and higher potential sales.':'Slows condition loss and reduces upkeep pressure.'}</small></div><button disabled={count>=2||b.cash<120} onClick={()=>onChange(s=>hireBusinessStaff(s,p.id,role))}>{count>=2?'Full team':'Hire · $120'}</button></div>;})}
      <div className="staff-card"><div><strong>Purchasing manager</strong><span>+$60 / week · one per business</span><small>Orders this business’s supplies within its own budget and cash reserve.</small></div><button disabled={!!b.manager||b.cash<250} onClick={()=>onChange(s=>hireBusinessStaff(s,p.id,'manager'))}>{b.manager?'Hired':'Hire · $250'}</button></div>
      <p className="small-note">Total wages: {money(businessWages(p,b))} per week. Paid from {p.name} after Day 3 of the next week. Hiring fees are paid now.</p>
    </section>}
    {tab==='inventory'&&!restaurant&&<section role="tabpanel" aria-label="Manage inventory">
      <BusinessInventory p={p} b={b} onChange={onChange}/>
      <BusinessPurchasing p={p} b={b} onChange={onChange}/>
    </section>}
    {tab==='prices'&&!restaurant&&!b.lodging&&<BusinessCatalog p={p} b={b} onChange={onChange}/>}
    {tab==='upgrades'&&!restaurant&&!b.lodging&&<section className="business-upgrades"><h3>{p.kind==='hotel'?'Hotel comfort & service':p.kind==='apartments'?'Building improvements':p.kind==='shop'?'Store equipment':'Park facilities'}</h3><p>Each level attracts 12% more visitors and speeds up the opening team. Upgrades use this business’s cash and remain assets on its balance sheet.</p>{[1,2,3].map(level=><article key={level}><h4>Level {level} · {['Refresh','Modernize','Premium facilities'][level-1]}</h4><p>{level*12}% more visitor demand · improved service speed</p><button className="primary" disabled={level!==b.upgrade+1||b.cash<600*level} onClick={()=>manage('upgrade')}>{level<=b.upgrade?'Installed':`${money(600*level)} · upgrade`}</button></article>)}</section>}
    {tab==='reports'&&!restaurant&&<BusinessStatements p={p} b={b} state={state}/>}
    {tab==='finance'&&<section role="tabpanel" aria-label="Business finance">
      <div className="management-summary"><strong>Separate cash flow</strong><span>Sales, wages, rent, stock, and upgrades stay in this account.</span></div>
      {!!sources.length&&<div className="loan-form"><strong>Borrow from another business</strong><label>Lender<select aria-label="Loan lender" value={source?.id} onChange={e=>setLender(e.target.value)}>{sources.map(item=><option key={item.id} value={item.id}>{item.name} · {money(state.businesses[item.id].cash)}</option>)}</select></label><label>Amount<input aria-label="Loan amount" type="number" min="25" step="25" value={amount} onChange={e=>setAmount(Number(e.target.value))}/></label><button className="primary wide" disabled={!source||!Number.isFinite(amount)||amount<=0||state.businesses[source.id].cash<amount} onClick={()=>onChange(s=>lendCash(s,source!.id,p.id,amount))}>Transfer as a loan</button></div>}
      {loans.map(loan=><div className="loan-card" key={loan.id}><strong>{loan.to===p.id?'Owed to':'Lent to'} {PROPERTIES.find(item=>item.id===(loan.to===p.id?loan.from:loan.to))!.name}</strong><span>{money(loan.outstanding)} outstanding · {money(loan.principal)} originally</span>{loan.to===p.id&&<div><button disabled={b.cash<Math.min(100,loan.outstanding)} onClick={()=>onChange(s=>repayLoan(s,loan.id,Math.min(100,loan.outstanding)))}>Repay {money(Math.min(100,loan.outstanding))}</button><button disabled={b.cash<loan.outstanding} onClick={()=>onChange(s=>repayLoan(s,loan.id,loan.outstanding))}>Repay in full</button></div>}</div>)}
      <p className="small-note">Business loans are interest-free. Transfers and repayments are deliberate actions; cash is never pooled.</p>
      <div className="section-caption ledger-caption">RECENT CASH FLOW</div><div className="cash-ledger">{[...b.ledger].reverse().slice(0,8).map((entry,i)=><div key={i}><span>{entry.label}<small>Week {entry.week}, Day {entry.day}</small></span><strong className={entry.amount<0?'negative':''}>{entry.amount>0?'+':''}{money(entry.amount)}</strong></div>)}</div>
    </section>}
  </div>;
}
