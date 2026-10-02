import React, { useState, useEffect, useRef } from 'react';
import { useGameLoop, GameOptions } from './hooks/useGameLoop';
import {
  ChefHat, Coffee, Utensils, DollarSign, Users, Clock, ArrowUpCircle,
  BookOpen, Package, PaintBucket, TrendingUp, Beaker, AlertTriangle,
  Sparkles, Layers, CheckCircle2, UserCheck, Eraser, Info, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GameWorld3D } from './components/GameWorld3D';
import { ResearchLabModal } from './components/ResearchLabModal';
import { InventoryModal } from './components/InventoryModal';
import {BusinessInventory} from './empire/BusinessInventory';
import {BusinessPurchasing} from './empire/BusinessPurchasing';
import { RecipesModal } from './components/RecipesModal';
import { StatsModal } from './components/StatsModal';
import { AnalysisModal } from './components/AnalysisModal';
import { LayoutsModal } from './components/LayoutsModal';
import { UpgradesModal } from './components/UpgradesModal';
import { WeekSummaryModal } from './components/DaySummaryModal';
import { activeRecipes, nextMilestone, shiftLabel } from './gameplay';
import { soundEngine } from './utils/audio';
import {changeBusiness,propertyById} from './prototype/expansionModel';
import type {VenueInteraction} from './prototype/BusinessInterior';
import {operateVenue} from './empire/venueSimulation';
import {VenueHUD} from './empire/VenueHUD';
import {worldTime} from './empire/worldTime';
import {businessFinance} from './empire/empire';
import {WorldPropertyPanel,WorldWeekReport} from './empire/WorldPropertyPanel';
import type {ManagementTab,RestaurantSection} from './prototype/BusinessManagement';

const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('THREE.Clock: This module has been deprecated')) return;
  originalWarn(...args);
};

export default function App({gameOptions}:{gameOptions?:GameOptions}={}) {
  const [gamePhase, setGamePhase] = useState<'menu' | 'playing'>('menu');
  const { state, actions, empire, district, saveError } = useGameLoop(gamePhase==='playing',gameOptions);
  const [activeTab, setActiveTab] = useState<'restaurant' | 'upgrades' | 'recipes' | 'inventory' | 'stats' | 'layouts' | 'analysis' | 'lab'>('restaurant');
  const [focusedProperty,setFocusedProperty]=useState<string|null>(empire.activeRestaurantId);
  const [selectedProperty,setSelectedProperty]=useState<string|null>(null);
  const [propertyTab,setPropertyTab]=useState<ManagementTab>('run');
  const [selectedUnit,setSelectedUnit]=useState<number|undefined>();
  const [showDistrictReport,setShowDistrictReport]=useState(false);
  const [insideVenue,setInsideVenue]=useState<string|null>(null);
  const [showWelcome, setShowWelcome] = useState(state.week===1&&state.stats.customersServed===0&&Object.keys(empire.restaurants).length===1);
  const [isMuted, setIsMuted] = useState(false);
  const headerRef=useRef<HTMLElement|null>(null);
  const [hudBottom,setHudBottom]=useState(96);

  useEffect(()=>{
    if(gamePhase!=='playing'||!headerRef.current)return;
    const header=headerRef.current;
    const observer=new ResizeObserver(()=>setHudBottom(header.getBoundingClientRect().bottom+10));
    observer.observe(header);
    return ()=>observer.disconnect();
  },[gamePhase]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {setActiveTab('restaurant');setSelectedProperty(null);setShowDistrictReport(false);}
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const currentWeek = district.week;
  const worldProgress=Math.max(0,...Object.values(empire.restaurants).filter(r=>r.week===district.week).map(r=>r.time));
  const clock=worldTime(worldProgress);
  const milestone = nextMilestone(state);
  const payroll = state.pendingPayroll[0];
  const dayOfWeek = clock.day;
  const allPlanning=Object.values(empire.restaurants).every(r=>r.phase==='planning');
  const shownId=focusedProperty??empire.activeRestaurantId;
  const shownProperty=propertyById(shownId)!;
  const businessName=shownProperty.name;
  const focusedRestaurant=!!focusedProperty&&!!empire.restaurants[focusedProperty];
  const nonFood=!!focusedProperty&&!focusedRestaurant;
  const overview=()=>{setFocusedProperty(null);setSelectedProperty(null);setActiveTab('restaurant');setInsideVenue(null);};
  const selectBuilding=(id:string)=>{
    setSelectedProperty(id);setPropertyTab('run');setActiveTab('restaurant');setInsideVenue(null);
    setFocusedProperty(district.businesses[id]?id:null);
    if(empire.restaurants[id])actions.enterRestaurant(id);
  };
  const enterBuilding=(id:string,section:RestaurantSection='restaurant')=>{
    setFocusedProperty(id);
    if(['restaurant','cafe'].includes(propertyById(id)!.kind)){
      actions.enterRestaurant(id);setActiveTab(section);setSelectedProperty(null);
    }else{setSelectedProperty(null);setPropertyTab('run');setInsideVenue(id);setActiveTab(section==='inventory'?'inventory':'restaurant');}
  };
  const interactWithVenue=(action:VenueInteraction,detail?:number)=>{
    if(!focusedProperty)return;
    setSelectedUnit(action==='prices'?detail:undefined);
    if(action==='inventory'){enterBuilding(focusedProperty,'inventory');return;}
    if(action==='serve'||action==='clean'){
      actions.updateDistrict(s=>operateVenue(s,focusedProperty,action,detail));
    }else if(action==='care'){
      actions.updateDistrict(s=>changeBusiness(s,focusedProperty,action));
    }else{
      setInsideVenue(focusedProperty);setSelectedProperty(focusedProperty);setPropertyTab(action);
    }
  };
  const navigate=(id:string)=>{
    setSelectedUnit(undefined);
    if(id==='district'){overview();return;}
    if(id==='loans'){
      setFocusedProperty(shownId);setActiveTab('restaurant');setSelectedProperty(shownId);setPropertyTab('finance');return;
    }
    if(nonFood){
      if(id==='inventory'){enterBuilding(shownId,'inventory');return;}
      setActiveTab('restaurant');
      setInsideVenue(shownId);setSelectedProperty(shownId);setPropertyTab(id==='upgrades'?'staff':id==='bookings'?'bookings':id==='inventory'?'inventory':id==='stats'?'reports':id==='recipes'?'prices':id==='layouts'?'upgrades':id==='loans'?'finance':'run');
      return;
    }
    setFocusedProperty(empire.activeRestaurantId);setSelectedProperty(null);
    setActiveTab(activeTab===id?'restaurant':id as typeof activeTab);
  };

  // Calculate table occupancy
  const occupiedTables = state.tables.filter(t => t.customerId !== null).length;

  // Calculate ingredients needed for currently unlocked recipes
  const neededIngredients = new Set<string>();
  state.recipes.forEach(r => {
    if (r.unlocked && state.activeMenu.includes(r.id)) {
      Object.keys(r.ingredients || {}).forEach(ingId => neededIngredients.add(ingId));
    }
  });

  // Calculate count of critical low stock items (< 5)
  const lowStockCount = Array.from(neededIngredients).filter(
    ingId => (state.inventory[ingId] || 0) < 5
  ).length;

  // Splash Start Screen
  if (gamePhase === 'menu') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-mono select-none bg-stone-950">
        <div className="w-full max-w-[900px] aspect-[4/3] bg-[#2563eb] rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.9)] border-8 border-stone-800 relative overflow-hidden flex flex-col items-center justify-center p-6">
          <div className="absolute inset-0 bg-[repeating-conic-gradient(from_0deg,#3b82f6_0deg_15deg,#1d4ed8_15deg_30deg)] opacity-60 animate-[spin_80s_linear_infinite]" />

          <motion.div
            initial={{ scale: 0.6, y: -40 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="z-10 flex flex-col items-center text-center"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl animate-bounce">🍔</span>
              <span className="text-4xl animate-bounce [animation-delay:200ms]">🍜</span>
              <span className="text-4xl animate-bounce [animation-delay:400ms]">🍕</span>
            </div>

            <h1
              className="text-6xl sm:text-7xl md:text-8xl font-black text-white drop-shadow-[0_8px_0_#172554] tracking-tighter"
              style={{ WebkitTextStroke: '4px #172554' }}
            >
              BITE
            </h1>
            <h2
              className="text-4xl sm:text-5xl md:text-6xl font-black text-yellow-300 drop-shadow-[0_6px_0_#854d0e] -mt-3 tracking-tight rotate-2"
              style={{ WebkitTextStroke: '3px #854d0e' }}
            >
              TYCOON 3D
            </h2>

            <p className="mt-4 text-xs md:text-sm font-bold text-blue-100 uppercase tracking-widest max-w-md drop-shadow bg-blue-950/60 px-4 py-2 rounded-full border border-blue-400/40">
              Voxel Restaurant Empire & Real-Time Management
            </p>
          </motion.div>

          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setGamePhase('playing')}
            className="mt-12 px-14 py-3.5 mc-button-green font-black text-2xl md:text-3xl z-10 transition-all font-mono tracking-widest shadow-2xl flex items-center gap-3"
          >
            <span>{state.week>1||Object.keys(empire.district.businesses).length>1?'CONTINUE GAME':'ENTER DINER'}</span>
            <span>▶</span>
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-ui w-screen h-dvh overflow-hidden font-sans select-none relative bg-stone-900" style={{'--world-hud-bottom':`${hudBottom}px`} as React.CSSProperties}>
      {/* 3D Canvas Viewport */}
      <div className="absolute inset-0 z-0">
        <GameWorld3D state={state} worldProgress={worldProgress} restaurants={empire.restaurants} district={district} actions={actions} focus={focusedProperty} selected={selectedProperty} onSelect={selectBuilding} onOverview={overview} onInteract={interactWithVenue} testing={!!empire.testingUnlocked} onTestUnlock={()=>{actions.unlockTestDistrict();setShowWelcome(false);overview();}} onReport={()=>setShowDistrictReport(true)}/>
      </div>

      {/* Retro HUD Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-2 md:p-3">
        {/* Top Header Bar */}
        <header
          ref={headerRef}
          className="mc-panel p-2.5 flex flex-wrap justify-between items-center pointer-events-auto shadow-xl font-mono gap-2"
          style={{ imageRendering: 'pixelated' }}
        >
          {/* Brand & Table Status */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-[#475569] text-yellow-300 p-2 mc-slot flex items-center justify-center">
              <Utensils size={18} />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-black tracking-widest text-[#2b2b2b] uppercase leading-none">
                {businessName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-bold text-[#555555] uppercase flex items-center gap-1">
                  <Coffee size={10} className="text-[#3b82f6]" />
                  {nonFood?`${district.businesses[shownId].venue?.units.length || shownProperty.capacity} ${shownProperty.unit}`:`Tables: ${occupiedTables} / ${state.tables.length}`}
                </span>
                <span className="text-[9px] font-bold text-[#555555] uppercase hidden sm:inline">
                  {nonFood?'Own staff · own inventory':`• ${state.staff.chefs} Chefs • ${state.staff.waiters} Waiters`}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Big Tactile Restaurant Status Button & Low Stock Alert */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => focusedRestaurant?actions.toggleRestaurantState():actions.startEmpireWeek()}
              disabled={focusedRestaurant?(state.phase === "closing"||(state.phase==='planning'&&!allPlanning)):!allPlanning}
              className={`px-5 py-2 font-black text-xs md:text-sm tracking-widest transition-all active:scale-95 flex items-center gap-2 ${
                state.isRestaurantOpen
                  ? 'mc-button-red animate-none'
                  : 'mc-button-green animate-pulse'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${state.isRestaurantOpen ? 'bg-white animate-ping' : 'bg-white'}`} />
              <span>{!focusedRestaurant?(allPlanning?`START WEEK ${district.week}`:'WEEK IN PROGRESS'):state.phase === "planning" ? (allPlanning?`START WEEK ${state.week}`:'OTHER KITCHENS FINISHING') : state.phase === "closing" ? "FINISHING SERVICE" : state.isRestaurantOpen ? "PAUSE ARRIVALS" : "RESUME ARRIVALS"}</span>
            </button>

            {!nonFood && lowStockCount > 0 && (
              <button
                onClick={() => navigate('inventory')}
                className="mc-button-gold px-2.5 py-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow"
                title="Critical low stock in active recipes! Click to open Pantry."
              >
                <AlertTriangle size={13} className="text-red-700 animate-bounce" />
                <span className="hidden sm:inline">Low Stock:</span>
                <span>{lowStockCount}</span>
              </button>
            )}
          </div>

          {/* Right: Cash Treasury, Calendar & Shift Clock */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Money Box */}
            <div title={`${businessName} cash only`} className="flex items-center gap-1.5 mc-slot text-[#2b2b2b] px-3 py-1.5 font-black bg-[#f1f5f9]">
              <DollarSign size={16} className="text-[#2e7d32]" />
              <span className="text-sm md:text-base tracking-wider font-black text-[#1b5e20]">
                {(district.businesses[shownId]?.cash??state.money).toLocaleString(undefined,{maximumFractionDigits:0})}
              </span>
            </div>

            {/* Time / Week Tracker */}
            <div className="flex items-center gap-2 text-[#2b2b2b] font-bold mc-slot px-3 py-1.5 bg-[#f1f5f9]">
              <Clock size={15} className="text-[#c62828]" />
              <div className="flex flex-col">
                <span className="tracking-wider uppercase text-[9px] font-black text-[#475569] leading-none">
                  Wk {currentWeek}, Day {dayOfWeek} · {clock.label} {clock.isNight?'☾':'☀'}
                </span>
                <div className="w-16 sm:w-20 h-2 bg-[#94a3b8] overflow-hidden mt-1 rounded-sm border border-[#475569]">
                  <div
                    className="h-full bg-[#2e7d32] transition-all duration-100 ease-linear shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                    style={{ width: `${worldProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Game Speed Multipliers */}
            <div className="flex items-center gap-0.5 mc-slot p-1 bg-[#f1f5f9]">
              <button
                onClick={() => actions.setGameSpeed(0)}
                className={`px-1.5 py-0.5 text-[10px] font-black rounded transition-colors ${state.gameSpeed === 0 ? 'bg-red-600 text-white' : 'hover:bg-stone-200 text-stone-700'}`}
                title="Pause Game"
              >
                ⏸
              </button>
              <button
                onClick={() => actions.setGameSpeed(1)}
                className={`px-1.5 py-0.5 text-[10px] font-black rounded transition-colors ${state.gameSpeed === 1 ? 'bg-blue-600 text-white' : 'hover:bg-stone-200 text-stone-700'}`}
                title="1x Normal Speed"
              >
                1X
              </button>
              <button
                onClick={() => actions.setGameSpeed(2)}
                className={`px-1.5 py-0.5 text-[10px] font-black rounded transition-colors ${state.gameSpeed === 2 ? 'bg-amber-500 text-white' : 'hover:bg-stone-200 text-stone-700'}`}
                title="2x Fast Speed"
              >
                2X
              </button>
              <button
                onClick={() => actions.setGameSpeed(5)}
                className={`px-1.5 py-0.5 text-[10px] font-black rounded transition-colors ${state.gameSpeed === 5 ? 'bg-emerald-600 text-white' : 'hover:bg-stone-200 text-stone-700'}`}
                title="5x Rush Speed"
              >
                5X
              </button>
            </div>

            {/* Sound FX Mute Toggle */}
            <button
              onClick={() => {
                const muted = soundEngine.toggleMute();
                setIsMuted(muted);
              }}
              className="mc-slot p-1.5 px-2 bg-[#f1f5f9] hover:bg-white text-stone-700 font-black text-xs active:scale-95 transition-all"
              title={isMuted ? "Unmute Audio" : "Mute Audio"}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>
        </header>

        {/* Bottom Hotbar Navigation Dock */}
        <div className="p-2 flex justify-center pointer-events-auto pb-4">
          <div
            className="mc-panel p-1.5 flex gap-1.5 font-mono overflow-x-auto custom-scrollbar max-w-full shadow-2xl"
            style={{ imageRendering: 'pixelated' }}
          >
            {(nonFood?[
              {id:'district',label:'Neighborhood',icon:<Building2 size={18}/>,badge:null},
              {id:'restaurant',label:'Operations',icon:<Building2 size={18}/>,badge:null},
              {id:'recipes',label:shownProperty.kind==='shop'?'Products & Prices':shownProperty.kind==='hotel'?'Rooms & Rates':shownProperty.kind==='apartments'?'Homes & Rents':'Offers & Prices',icon:<BookOpen size={18}/>,badge:null},
              ...(['hotel','apartments'].includes(shownProperty.kind)?[{id:'bookings',label:shownProperty.kind==='hotel'?'Bookings':'Applications & Leases',icon:<BookOpen size={18}/>,badge:null}]:[]),
              {id:'upgrades',label:'Staff',icon:<Users size={18}/>,badge:null},
              {id:'inventory',label:'Inventory',icon:<Package size={18}/>,badge:null},
              {id:'layouts',label:'Upgrades',icon:<ArrowUpCircle size={18}/>,badge:null},
              {id:'stats',label:'Financials',icon:<DollarSign size={18}/>,badge:null},
              {id:'loans',label:'Loans',icon:<DollarSign size={18}/>,badge:null},
            ]:[
              { id: 'district', label: 'Neighborhood', icon: <Building2 size={18} />, badge: null },
              { id: 'upgrades', label: 'Staff & Shop', icon: <ArrowUpCircle size={18} />, badge: null },
              { id: 'recipes', label: 'Menu & Prices', icon: <BookOpen size={18} />, badge: null },
              { id: 'lab', label: 'Research Lab', icon: <Beaker size={18} />, badge: state.money >= 2500 ? '⭐' : null },
              { id: 'inventory', label: 'Pantry', icon: <Package size={18} />, badge: lowStockCount > 0 ? `${lowStockCount}!` : null },
              { id: 'layouts', label: 'Decor', icon: <PaintBucket size={18} />, badge: null },
              { id: 'stats', label: 'Financials', icon: <Users size={18} />, badge: null },
              { id: 'analysis', label: 'Sales Mix', icon: <TrendingUp size={18} />, badge: null },
              { id: 'loans', label: 'Loans', icon: <DollarSign size={18} />, badge: null }
            ]).map((tab) => {
              const panelNavId={run:'restaurant',prices:'recipes',bookings:'bookings',staff:'upgrades',inventory:'inventory',upgrades:'layouts',reports:'stats',finance:'loans'}[propertyTab];
              const isActive = tab.id==='district'?!focusedProperty:selectedProperty===shownId?tab.id===panelNavId:activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  aria-label={tab.label}
                  aria-pressed={isActive}
                  title={tab.label}
                  onClick={() => navigate(tab.id)}
                  className={`px-3 py-2 font-black flex items-center gap-1.5 transition-all outline-none whitespace-nowrap text-xs relative ${
                    isActive ? 'mc-button-selected scale-95' : 'mc-button'
                  }`}
                >
                  {tab.icon}
                  <span className="uppercase tracking-wider text-[10px]">
                    {tab.label}
                  </span>

                  {tab.badge && (
                    <span className="absolute -top-1.5 -right-1 bg-red-600 text-white rounded-full px-1 py-0.2 text-[8px] font-black border border-stone-800 shadow animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {focusedRestaurant&&!selectedProperty&&<div className="shift-dashboard absolute z-20 rounded-xl bg-[#faf7ef]/95 border border-stone-300 px-4 py-2 shadow-sm">
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
          <strong>{shiftLabel(state)}</strong>
          <span>{state.phase === 'planning' ? '3 minutes of service per week at 1×' : `Week ${state.week} · Day ${dayOfWeek}`}</span>
        </div>
        <button className="text-left text-sm mt-1 text-emerald-800 font-semibold" onClick={() => setActiveTab('upgrades')}>{milestone.text} · {milestone.current}/{milestone.target}</button>
        {payroll && <p className="text-xs text-stone-600 mt-1">Wages owed: ${payroll.amount.toFixed(2)} · paid after Day 3, Week {payroll.dueWeek}</p>}
        <p className="text-xs text-stone-500 mt-1">{Object.keys(empire.district.businesses).length} business{Object.keys(empire.district.businesses).length===1?'':'es'} · cash stays with {businessName} · {saveError?'saving unavailable':'autosaved'}</p>
      </div>}

      {!focusedRestaurant&&!selectedProperty&&!nonFood&&<div className="world-context"><strong>{focusedProperty?`${businessName} · inside`:'Your neighborhood · click a building'}</strong><p>{nonFood?'Click visitors or service areas to work here. Staff, stock, and finances are in the bottom bar.':empire.testingUnlocked?'Testing mode · all 7 properties unlocked · separate accounts':'Select a property to buy, rent, or run it.'}</p>{district.notice.startsWith('Finish this week')&&<p role="status">{district.notice}</p>}</div>}
      {nonFood&&!selectedProperty&&<VenueHUD p={shownProperty} b={district.businesses[shownId]} onAction={interactWithVenue}/>}
      {selectedProperty&&<WorldPropertyPanel key={selectedProperty} id={selectedProperty} state={district} restaurants={empire.restaurants} onChange={actions.updateDistrict} onEnter={enterBuilding} onClose={()=>setSelectedProperty(null)} initialTab={propertyTab} selectedUnit={selectedUnit} inside={insideVenue===selectedProperty}/>}
      {showDistrictReport&&<WorldWeekReport state={district} onClose={()=>setShowDistrictReport(false)}/>}

      {/* Onboarding / Welcome Modal */}
      <AnimatePresence>
        {showWelcome && gamePhase === 'playing' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="mc-panel w-full max-w-lg max-h-[90dvh] overflow-y-auto p-6 flex flex-col font-mono text-center items-center gap-4 shadow-2xl"
            >
              <div className="w-14 h-14 mc-slot flex items-center justify-center text-3xl bg-[#475569]">
                👨‍🍳
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-[#2b2b2b] uppercase tracking-wider border-b-4 border-[#8b8b8b] pb-2 w-full">
                Welcome to Bite Tycoon!
              </h2>

              <p className="text-xs font-bold text-[#555555] uppercase tracking-wide">
                Your first week is ready. Your restaurant is <span className="text-[#ef4444] font-black">CLOSED</span> while you plan.
              </p>

              <div className="mc-inner-panel p-4 w-full text-left space-y-2.5 text-xs font-bold text-[#2b2b2b] uppercase tracking-wide bg-[#f8fafc]">
                <p className="font-black text-[#1565c0]">Your first goal: serve 6 guests</p>
                <div className="space-y-1.5 text-[11px] text-[#475569]">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 mc-slot bg-[#334155] text-white flex items-center justify-center text-[10px] font-black">1</span>
                    <span><strong>Your chef is ready:</strong> You have two tables and three active dishes. Start Week 1 when ready.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 mc-slot bg-[#334155] text-white flex items-center justify-center text-[10px] font-black">2</span>
                    <span><strong>Run the floor:</strong> Take orders, serve completed tables, and click dirty tables to clean them.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 mc-slot bg-[#334155] text-white flex items-center justify-center text-[10px] font-black">3</span>
                    <span><strong>Earn your first helper:</strong> Serve 6 guests to unlock a waiter. Watch for the lunch rush at 40% of the week.</span>
                  </div>
                </div>
              </div>

              <p className="text-[10px] font-black text-[#64748b] uppercase">
                Each week ends with a paused report. Wages are paid three game days after the week ends.
              </p>

              <button
                onClick={() => setShowWelcome(false)}
                className="mt-1 px-8 py-3 mc-button-green font-black text-lg w-full tracking-wider shadow"
              >
                LET’S OPEN THE DINER
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Feature Modals Overlay */}
      <AnimatePresence>
        {activeTab !== 'restaurant' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 pointer-events-auto"
            onClick={() => setActiveTab('restaurant')}
          >
            <motion.div
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16 }}
              className="mc-panel w-full max-w-5xl max-h-[90vh] flex flex-col font-mono shadow-2xl border-4 border-[#373737]"
              onClick={e => e.stopPropagation()}
            >
              {/* Window Title Bar */}
              <div className="mc-panel-header p-3 sm:p-4 flex justify-between items-center shrink-0 border-b-4 border-[#8b8b8b]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 mc-slot flex items-center justify-center bg-[#475569] text-yellow-300">
                    {activeTab === 'upgrades' ? <ArrowUpCircle size={20} /> :
                     activeTab === 'recipes' ? <BookOpen size={20} /> :
                     activeTab === 'lab' ? <Beaker size={20} /> :
                     activeTab === 'stats' ? <Users size={20} /> :
                     activeTab === 'layouts' ? <PaintBucket size={20} /> :
                     activeTab === 'analysis' ? <TrendingUp size={20} /> :
                     <Package size={20} />}
                  </div>
                  <div>
                    <h2 className="text-base sm:text-xl font-black uppercase tracking-wider text-[#2b2b2b] drop-shadow-sm leading-none">
                      {activeTab === 'upgrades' ? 'Staff, Equipment & Operations' :
                       activeTab === 'recipes' ? 'Menu & Prices' :
                       activeTab === 'lab' ? 'Culinary Research & Development' :
                       activeTab === 'stats' ? 'Financial Reports' :
                       activeTab === 'layouts' ? 'Diner Architecture & Decor' :
                       activeTab === 'analysis' ? 'Sales Mix & Performance Analytics' :
                       nonFood?'Inventory':'Pantry'}
                    </h2>
                    <span className="text-[9px] font-bold text-[#555555] uppercase">
                      Bite Tycoon Management Console
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('restaurant')}
                  className="w-8 h-8 sm:w-9 sm:h-9 mc-button-red flex items-center justify-center font-black text-sm shadow active:scale-95"
                  title="Close Window"
                  aria-label="Close Window"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body Container */}
              <div className="p-3 sm:p-4 overflow-y-auto custom-scrollbar flex-1 bg-[#bebebe]/30">
                {activeTab === 'lab' && (
                  <ResearchLabModal
                    money={state.money}
                    existingRecipesCount={state.recipes.length}
                    onPayResearchCost={actions.payResearchCost}
                    onAddCustomRecipe={actions.addCustomRecipe}
                  />
                )}

                {activeTab === 'inventory' && !nonFood && (
                  <InventoryModal
                    inventory={state.inventory}
                    inventoryBatches={state.inventoryBatches}
                    money={state.money}
                    unlockedRecipes={activeRecipes(state)}
                    onBuyIngredient={actions.buyIngredient}
                  />
                )}

                {activeTab === 'inventory' && nonFood && (
                  <>
                    <BusinessInventory key={shownId} p={shownProperty} b={district.businesses[shownId]} onChange={actions.updateDistrict}/>
                    <BusinessPurchasing p={shownProperty} b={district.businesses[shownId]} onChange={actions.updateDistrict}/>
                  </>
                )}

                {activeTab === 'recipes' && (
                  <RecipesModal
                    recipes={state.recipes}
                    inventory={state.inventory}
                    money={state.money}
                    onUnlockRecipe={actions.unlockRecipe}
                    onChangePrice={actions.changeRecipePrice}
                    activeMenu={state.activeMenu}
                      hasManager={state.staff.hasManager}
                      manager={state.manager}
                    onToggleActive={actions.toggleActiveRecipe}
                  />
                )}

                {activeTab === 'stats' && (
                  <StatsModal
                    state={state}
                    account={businessFinance(empire,empire.activeRestaurantId)}
                  />
                )}

                {activeTab === 'analysis' && (
                  <AnalysisModal
                    itemsSold={state.stats.itemsSold}
                    itemRevenues={state.stats.itemRevenues}
                    recipes={state.recipes}
                  />
                )}

                {activeTab === 'layouts' && (
                  <LayoutsModal
                    restaurantLayout={state.restaurantLayout}
                    wallColor={state.wallColor}
                    frameColor={state.frameColor}
                    onSetLayout={actions.setRestaurantLayout}
                    onSetWallColor={actions.setWallColor}
                    onSetFrameColor={actions.setFrameColor}
                  />
                )}

                {activeTab === 'upgrades' && (
                  <UpgradesModal
                    state={state}
                    onBuyUpgrade={actions.buyUpgrade}
                    onBuyLevelUpgrade={actions.buyLevelUpgrade}
                    onHireManager={actions.hireManager}
                    onUnlockApp={actions.unlockApp}
                    onUpdateManager={actions.updateManager}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time Floating Notification Events */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
        <AnimatePresence>
          {(state.floatingEvents || []).map((ev) => (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, x: 50, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              className={`px-3 py-2 rounded-lg border-2 font-black text-xs shadow-2xl flex items-center gap-2 ${
                ev.type === 'tip' ? 'bg-emerald-500 border-emerald-700 text-white' :
                ev.type === 'vip' ? 'bg-amber-400 border-amber-600 text-amber-950 animate-bounce' :
                ev.type === 'event' ? 'bg-purple-600 border-purple-800 text-white' :
                'bg-stone-800 border-stone-950 text-stone-100'
              }`}
            >
              <span>{ev.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* End-of-Day Financial Summary & Ledger Modal */}
      {state.weekSummary && allPlanning && (
        <WeekSummaryModal summary={state.weekSummary} onClose={actions.dismissWeekSummary} />
      )}
    </div>
  );
}
