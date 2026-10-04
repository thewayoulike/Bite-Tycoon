import {useMemo,useState,Component,ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {configureTextBuilder} from 'troika-three-text';
import App from '../App';
import {PROPERTIES} from '../prototype/expansionModel';
import {createProposalSample,proposalVersion,MENU_CAPACITIES,HOTEL_FLOORS,HOME_FLOORS,MALL_OPEN_FLOORS} from './sample';
import {DEFAULT_RESTAURANT_TYPES,RESTAURANT_TYPES,RestaurantType,restaurantCatalog} from './restaurantCatalogs';
import {ProgressionComparison} from './ProgressionComparison';
import '../index.css';
import './proposal.css';

configureTextBuilder({defaultFontURL:'/fonts/kenpixel.ttf'});

class PreviewBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="proposal-failure"><h1>The preview could not start</h1><p>Reload this sample session. Your main game is separate.</p><button onClick={()=>location.reload()}>Reload preview</button><a href="/artifacts/game-expansion-proposal.html">Return to the proposal</a></div>:this.props.children;}
}

function Proposal(){
  const params=new URLSearchParams(location.search);
  const [property,setProperty]=useState(PROPERTIES.some(p=>p.id===params.get('property'))?params.get('property')!:'diner');
  const [level,setLevel]=useState(Math.max(1,Math.min(6,Number(params.get('level'))||3)));
  const [restaurantTypes,setRestaurantTypes]=useState({...DEFAULT_RESTAURANT_TYPES});
  const [after,setAfter]=useState(params.get('version')!=='before');
  const [night,setNight]=useState(false),[reset,setReset]=useState(0),[request,setRequest]=useState(0);
  const [screen,setScreen]=useState(['inside','exterior','progression','recipes','inventory','upgrades','stats','layouts','loans','district'].includes(params.get('screen')??'')?params.get('screen')!:'inside'),[help,setHelp]=useState(false);
  const sample=useMemo(()=>createProposalSample(level,restaurantTypes,night),[level,restaurantTypes,night,reset]);
  const profiles=useMemo(()=>Object.fromEntries(Object.entries(restaurantTypes).map(([id,type])=>[id,restaurantCatalog(type)])),[restaurantTypes]);
  const comparisonSample=useMemo(()=>proposalVersion(sample,after),[sample,after]);
  const p=PROPERTIES.find(p=>p.id===property)!,food=p.kind==='restaurant'||p.kind==='cafe';
  const jump=(next:string)=>{setScreen(next);setRequest(r=>r+1);};
  const changeProperty=(id:string)=>{setProperty(id);jump(['inside','exterior','recipes','inventory','upgrades','stats','layouts','loans','progression'].includes(screen)?screen:'inside');};
  const floor=p.kind==='hotel'||p.kind==='apartments'?1:0;
  const capacity=food?`${after?MENU_CAPACITIES[level-1]:6} menu slots`:p.kind==='hotel'?`${HOTEL_FLOORS[level-1]} guest floors · ${4*HOTEL_FLOORS[level-1]} rooms`:p.kind==='apartments'?`${HOME_FLOORS[level-1]} residential floors · ${3*HOME_FLOORS[level-1]} homes`:p.kind==='plaza'?`${MALL_OPEN_FLOORS[level-1]} shopping floors · ${4*MALL_OPEN_FLOORS[level-1]} shops`:level>=3?'Groceries + electronics · 2 floors':'Groceries · ground floor';
  return <div className="proposal-app">
    <header className="proposal-toolbar" onKeyDown={e=>{if(e.key==='Escape')e.stopPropagation();}}>
      <div className="proposal-brand"><strong>GAME COMPARISON</strong><span>Actual game interface · disposable sample</span></div>
      <div className="proposal-version" role="group" aria-label="Compare historical game and current features"><button aria-pressed={!after} onClick={()=>setAfter(false)}>Before · original game</button><button aria-pressed={after} onClick={()=>setAfter(true)}>After · current features</button></div>
      <div className="proposal-links"><button onClick={()=>setHelp(v=>!v)} aria-expanded={help}>What’s included?</button><a href="/artifacts/game-expansion-proposal.html#visual" target="_top">Written proposal ↗</a><a href="/" target="_blank" rel="noreferrer">Main game ↗</a></div>
      <div className="proposal-controls">
        <label>Explore property<select aria-label="Preview property" value={property} onChange={e=>changeProperty(e.target.value)}>{PROPERTIES.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
        <label>Stage · resets sample<select aria-label="Preview stage" value={level} onChange={e=>{setLevel(Number(e.target.value));setRequest(r=>r+1);}}>{MENU_CAPACITIES.map((slots,i)=><option key={i} value={i+1}>{i===0?'Opening':i===5?'Fully expanded':`Growing ${i+1}`} · {food?(after?`Level ${i+1} / ${slots} dishes`:'Current cap: 6 dishes'):p.kind==='hotel'?`${HOTEL_FLOORS[i]} guest floors`:p.kind==='apartments'?`${HOME_FLOORS[i]} residential floors`:p.kind==='plaza'?`${MALL_OPEN_FLOORS[i]} shopping floors`:i>=2?'2 sales floors':'Groceries only'}</option>)}</select></label>
        <label>Open game screen<select aria-label="Preview screen" value={screen} onChange={e=>jump(e.target.value)}>
          <option value="inside">Inside · 3D</option><option value="exterior">Exterior · 3D</option><option value="district">Neighborhood</option>
          <option value="progression">Levels & unlocks · compare</option>
          <option value="recipes">{food?'Menu & prices':p.kind==='hotel'?'Rooms & rates':p.kind==='apartments'?'Homes & rents':p.kind==='plaza'?'Shops & rents':'Products & prices'}</option>
          <option value="inventory">{food?'Ingredients & purchasing':'Inventory & purchasing'}</option><option value="upgrades">Staff</option><option value="layouts">{food?'Decor & fitout':'Floors & upgrades'}</option><option value="stats">Financials</option><option value="loans">Loans</option>
          {food?<option value="lab">Recipe research</option>:p.kind!=='shop'&&<option value="bookings">{p.kind==='hotel'?'Bookings':'Tenants & leases'}</option>}
        </select></label>
        {food&&after&&<label>Restaurant type · resets sample<select aria-label="Restaurant type" value={restaurantTypes[property]} onChange={e=>setRestaurantTypes(types=>({...types,[property]:e.target.value as RestaurantType}))}>{RESTAURANT_TYPES.map(type=><option key={type.id} value={type.id}>{type.name}</option>)}</select></label>}
        <button className="proposal-reset" onClick={()=>{setReset(v=>v+1);setRequest(r=>r+1);}}>Reset sample</button>
      </div>
      <div className="proposal-status"><strong>{after?'AFTER':'BEFORE'} · {capacity}</strong><span>Same sample & 3D art · switching version resets trial edits · press 1X to play</span><button onClick={()=>setNight(n=>!n)}>{night?'Preview daytime':'Preview nighttime'}</button></div>
      {help&&<div className="proposal-help"><p><b>Working here:</b> the live game’s 3D buildings, customers, staff, floor controls, menu cards, inventory ordering, bookings, leases and financial screens. All seven businesses have their own sample cash. Use the game’s bottom toolbar normally.</p><p><b>Implemented progression:</b> six menu-capacity stages (6, 10, 15, 20, 25, 30 type dishes, plus 10 research slots). Classic diner, café & bakery, garden bistro, Italian, fast food, Indian and Japanese each have 30 distinct recipes, their own starter menu and a matching pantry. Change one property’s type without changing the others. Before restores the original shared recipe collection and six-dish cap.</p><p>Floors are pre-opened at each sample stage so you can compare interiors. This is not a career unlock playthrough. Restaurant types, visible kitchen stations and the restaurant menu ladder are now in the main game. Delivery lead times, laundry and the property career gates are also implemented. The Business planning desk opens individual staff, stockroom construction, payment schedules and service plans. The 3D art is the current game’s art.</p><p>Changing stage, restaurant type or day/night starts a new sample. Switching Before/After or reloading discards trial edits. Your main save is never loaded or written.</p></div>}
    </header>
    <main className="proposal-workspace"><PreviewBoundary key={`${level}-${JSON.stringify(restaurantTypes)}-${night}-${reset}-${after}`}><App prototype gameOptions={{persist:false,startingEmpire:comparisonSample,menuLimit:after?MENU_CAPACITIES[level-1]:6}} proposal={{propertyId:property,screen:screen==='progression'?'inside':screen,request,floor,restaurantProfiles:after?profiles:undefined}}/></PreviewBoundary>{screen==='progression'&&<ProgressionComparison p={p} level={level} after={after} onClose={()=>jump('inside')} onStage={n=>{setLevel(n);jump('inside');}}/>}</main>
  </div>;
}
createRoot(document.getElementById('root')!).render(<Proposal/>);
