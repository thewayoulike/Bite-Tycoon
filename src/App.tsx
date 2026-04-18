import React, { useState } from 'react';
import { useGameLoop, UPGRADE_COSTS, SALARIES, ONLINE_APPS } from './hooks/useGameLoop';
import { INGREDIENTS } from './data/recipes';
import { ChefHat, Coffee, Utensils, DollarSign, Users, Clock, ArrowUpCircle, BookOpen, Package, PaintBucket, TrendingUp, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Scene3D } from './components/Scene3D';

const INGREDIENT_ICONS: Record<string, string> = {
  rice: "🍚", noodle: "🍜", beef: "🥩", chicken: "🍗", fish: "🐟", shrimp: "🍤", vegetable: "🥦", egg: "🥚",
  flour: "🌾", sugar: "🍬", milk: "🥛", cheese: "🧀", potato: "🥔", tomato: "🍅", onion: "🧅", garlic: "🧄",
  spices: "🌶️", soy_sauce: "🍶", oil: "🛢️", bread: "🍞", sushi: "🍣", ramen: "🍜", tempura: "🍤", wagyu: "🥩",
  bun: "🍔", lettuce: "🥬", sausage: "🌭", fruit: "🍎", coffee_bean: "☕", water: "💧", soda_syrup: "🥤"
};

export default function App() {
  const { state, actions } = useGameLoop();
  const [activeTab, setActiveTab] = useState<'restaurant' | 'upgrades' | 'recipes' | 'inventory' | 'stats' | 'layouts' | 'analysis'>('restaurant');
  const [gamePhase, setGamePhase] = useState<'menu' | 'playing'>('menu');
  const [showWelcome, setShowWelcome] = useState(true);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState<string | null>(null);
  const [inventoryTab, setInventoryTab] = useState<'needed' | 'all'>('needed');

  const mealPriceLevel = Math.round((state.upgrades.mealPrice - 10) / 5);
  const cookingSpeedLevel = Math.round((state.upgrades.cookingSpeed - 1) / 0.5);
  const spawnRateLevel = Math.round((state.upgrades.spawnRate - 1) / 0.5);

  const currentWeek = Math.floor((state.day - 1) / 7) + 1;
  const dayOfWeek = ((state.day - 1) % 7) + 1;

  if (gamePhase === 'menu') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans select-none">
        <div className="w-full max-w-[900px] aspect-[4/3] bg-blue-400 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] border-8 border-stone-800 relative overflow-hidden flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-[repeating-conic-gradient(from_0deg,#60a5fa_0deg_15deg,#3b82f6_15deg_30deg)] opacity-50 animate-[spin_60s_linear_infinite]" />
          <motion.div 
            initial={{ scale: 0.5, y: -50 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0.6 }}
            className="z-10 flex flex-col items-center"
          >
            <h1 className="text-7xl md:text-8xl font-black text-white drop-shadow-[0_8px_0_#1e3a8a] tracking-tighter" style={{ WebkitTextStroke: '4px #1e3a8a' }}>
              BITE
            </h1>
            <h2 className="text-5xl md:text-6xl font-black text-yellow-300 drop-shadow-[0_6px_0_#b45309] -mt-4 tracking-tight rotate-2" style={{ WebkitTextStroke: '3px #b45309' }}>
              TYCOON 3D
            </h2>
          </motion.div>
          <motion.button 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setGamePhase('playing')} 
            className="mt-16 px-16 py-4 mc-button-green font-black text-4xl z-10 transition-all font-mono"
          >
            PLAY
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden font-sans select-none relative bg-stone-900">
      <div className="absolute inset-0 z-0">
        <Scene3D state={state} actions={actions} />
      </div>

      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between">
        <header className="mc-panel p-3 flex justify-between items-center pointer-events-auto shadow-lg font-mono" style={{ imageRendering: 'pixelated' }}>
          <div className="flex items-center gap-3">
            <div className="bg-[#8b8b8b] text-[#3f3f3f] p-2 mc-slot hidden md:block">
              <Utensils size={20} />
            </div>
            <h1 className="text-xl font-black tracking-widest text-[#3f3f3f] uppercase hidden lg:block">Bite Tycoon</h1>
          </div>
          
          <button 
            onClick={() => actions.toggleRestaurantState()}
            className={`px-6 py-2 font-black text-sm md:text-base tracking-widest shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)] border-4 border-stone-800 transition-all active:scale-95 ${
              state.isRestaurantOpen 
                ? 'bg-red-500 hover:bg-red-400 text-white' 
                : 'bg-green-500 hover:bg-green-400 text-white animate-pulse'
            }`}
          >
            {state.isRestaurantOpen ? "CLOSE RESTAURANT" : "OPEN RESTAURANT"}
          </button>

          <div className="flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-2 mc-slot text-[#3f3f3f] px-4 py-2 font-black">
              <DollarSign size={16} className="text-[#388e3c]" />
              <span className="text-base tracking-widest">{state.money.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-[#3f3f3f] font-bold mc-slot px-4 py-2">
              <Clock size={16} className="text-[#d32f2f]" />
              <span className="tracking-widest uppercase text-xs">Wk {currentWeek}, Day {dayOfWeek}</span>
              <div className="w-24 h-3 bg-[#555555] overflow-hidden ml-2 mc-slot">
                <div 
                  className="h-full bg-[#388e3c] transition-all duration-100 ease-linear shadow-[inset_0_2px_0_rgba(255,255,255,0.4)]"
                  style={{ width: `${state.time}%` }}
                />
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 flex justify-center pointer-events-auto pb-6">
          <div className="mc-panel p-2 flex gap-2 font-mono" style={{ imageRendering: 'pixelated' }}>
            {[
              { id: 'upgrades', label: 'Upgrades', icon: <ArrowUpCircle size={20} /> },
              { id: 'recipes', label: 'Recipes', icon: <BookOpen size={20} /> },
              { id: 'inventory', label: 'Inventory', icon: <Package size={20} /> },
              { id: 'layouts', label: 'Layouts', icon: <PaintBucket size={20} /> },
              { id: 'stats', label: 'Stats', icon: <Users size={20} /> },
              { id: 'analysis', label: 'Analysis', icon: <TrendingUp size={20} /> }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(activeTab === tab.id ? 'restaurant' : tab.id as any)}
                className={`px-4 py-2 font-black flex items-center gap-2 transition-all outline-none ${
                  activeTab === tab.id 
                    ? 'mc-button-selected' 
                    : 'mc-button'
                }`}
              >
                {tab.icon}
                <span className="hidden md:inline uppercase tracking-widest text-[10px]">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showWelcome && gamePhase === 'playing' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="mc-panel w-full max-w-md p-6 flex flex-col font-mono text-center items-center gap-4"
            >
              <h2 className="text-3xl font-black text-[#3f3f3f] drop-shadow-md border-b-4 border-[#8b8b8b] pb-2 w-full">Welcome Boss!</h2>
              <p className="text-sm font-bold text-[#555555] uppercase tracking-wide">
                Your restaurant is currently <span className="text-red-500 font-black">CLOSED</span>.
              </p>
              <div className="mc-inner-panel p-4 w-full text-left space-y-2 text-xs font-bold text-[#3f3f3f] uppercase tracking-wide">
                <p>Before opening the doors, make sure to:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2 text-[#555555]">
                  <li>Hire at least 1 Chef & 1 Waiter</li>
                  <li>Unlock your first Recipes</li>
                  <li>Stock up on Ingredients</li>
                </ul>
              </div>
              <p className="text-[10px] font-black text-[#8b8b8b] uppercase">When you are ready, click <span className="text-green-500">"OPEN RESTAURANT"</span> at the top of the screen!</p>
              <button 
                onClick={() => setShowWelcome(false)}
                className="mt-2 px-8 py-3 mc-button-green font-black text-xl w-full"
              >
                START SETUP
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTab !== 'restaurant' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
            onClick={() => setActiveTab('restaurant')}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="mc-panel w-full max-w-4xl max-h-[85vh] flex flex-col font-mono"
              onClick={e => e.stopPropagation()}
            >
              <div className="mc-panel-header p-4 flex justify-between items-center shrink-0">
                <h2 className="text-2xl font-black flex items-center gap-3 drop-shadow-md">
                  {activeTab === 'upgrades' ? <ArrowUpCircle size={28} /> : 
                   activeTab === 'recipes' ? <BookOpen size={28} /> : 
                   activeTab === 'stats' ? <Users size={28} /> :
                   activeTab === 'layouts' ? <PaintBucket size={28} /> :
                   activeTab === 'analysis' ? <TrendingUp size={28} /> :
                   <Package size={28} />}
                  {activeTab}
                </h2>
                <button 
                  onClick={() => setActiveTab('restaurant')}
                  className="w-10 h-10 mc-button-red flex items-center justify-center font-black"
                >
                  X
                </button>
              </div>

              <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-transparent mc-inner-panel mx-4 mb-4">
                {activeTab === 'analysis' ? (
                  <div className="space-y-6">
                    <h3 className="font-black text-[#3f3f3f] text-lg uppercase border-b-4 border-[#8b8b8b] pb-2 tracking-widest drop-shadow-md">Sales Analysis</h3>
                    
                    {Object.keys(state.stats.itemsSold || {}).length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-[#555555] text-center font-black uppercase tracking-widest mc-slot p-8">
                        <TrendingUp size={48} className="mb-4 opacity-50" />
                        <span>No sales data yet.<br/>Open your restaurant to start selling!</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(state.stats.itemsSold)
                          .sort((a, b) => b[1] - a[1]) // Sort by quantity descending
                          .map(([recipeId, quantity], index) => {
                            const recipe = state.recipes.find(r => r.id === recipeId);
                            if (!recipe) return null;
                            const totalRevenue = recipe.price * quantity;
                            
                            return (
                              <div key={recipeId} className="mc-inner-panel p-4 flex items-center gap-4 relative overflow-hidden bg-[#e2e8f0]">
                                {/* Rank badge */}
                                <div className="absolute top-0 left-0 bg-[#f59e0b] border-r-2 border-b-2 border-[#b45309] text-[#451a03] w-8 h-8 flex items-center justify-center font-black shadow-md z-10 text-[10px]">
                                  #{index + 1}
                                </div>
                                
                                <div className="w-16 h-16 shrink-0 mc-slot flex items-center justify-center text-4xl mt-2 ml-2 bg-white" style={{ imageRendering: 'pixelated' }}>
                                  {INGREDIENT_ICONS[Object.keys(recipe.ingredients)[0]] || "🍽️"}
                                </div>
                                
                                <div className="flex-1 flex flex-col">
                                  <h4 className="font-black text-[#3f3f3f] uppercase tracking-widest text-sm drop-shadow-md truncate">{recipe.name}</h4>
                                  
                                  <div className="grid grid-cols-2 gap-2 mt-2">
                                    <div className="bg-[#f8fafc] border-2 border-[#94a3b8] p-1.5 flex flex-col items-center shadow-inner rounded-sm">
                                      <span className="text-[9px] font-bold text-[#64748b] uppercase tracking-widest">Units Sold</span>
                                      <span className="text-lg font-black text-[#1e88e5] drop-shadow-sm">{quantity}</span>
                                    </div>
                                    <div className="bg-[#f8fafc] border-2 border-[#94a3b8] p-1.5 flex flex-col items-center shadow-inner rounded-sm">
                                      <span className="text-[9px] font-bold text-[#64748b] uppercase tracking-widest">Revenue</span>
                                      <span className="text-lg font-black text-[#388e3c] drop-shadow-sm">${totalRevenue.toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                        })}
                      </div>
                    )}
                  </div>
                ) : activeTab === 'stats' ? (() => {
                  
                  // Clean Currency Formatter (Forces -$X,XXX instead of $-X,XXX)
                  const formatMoney = (val: number) => {
                    if (val === 0) return "$0";
                    return val < 0 ? `-$${Math.abs(val).toLocaleString()}` : `$${val.toLocaleString()}`;
                  };

                  // CALCULATE INVENTORY AS AN ASSET (GAAP Compliant)
                  // The initial starting array had exactly $900 worth of ingredients in it.
                  const INITIAL_INVENTORY_VALUE = 900;
                  const currentInventoryValue = Object.entries(state.inventory).reduce((total, [ingId, qty]) => {
                    return total + (qty * (INGREDIENTS[ingId]?.cost || 0));
                  }, 0);

                  // Cost of Goods Sold (COGS) = Starting + Purchases - Ending
                  const cogs = INITIAL_INVENTORY_VALUE + state.stats.inventoryCosts - currentInventoryValue;

                  // REVENUE
                  const inHouseSales = state.stats.totalEarned - (state.stats.totalTips || 0) - (state.stats.onlineEarned || 0);
                  const onlineSales = state.stats.onlineEarned || 0;
                  const tips = state.stats.totalTips || 0;
                  const totalRevenue = state.stats.totalEarned;
                  
                  const grossProfit = totalRevenue - cogs;

                  // OPERATING EXPENSES (Strictly non-capital expenses)
                  const salaries = state.stats.salaryCosts;
                  const managers = state.stats.managerCosts;
                  const onlineFees = state.stats.onlineFees || 0;
                  const totalOpex = salaries + managers + onlineFees;

                  const netProfit = grossProfit - totalOpex;

                  // CASH FLOW MATH
                  const inventoryChange = currentInventoryValue - INITIAL_INVENTORY_VALUE;
                  // If inventory increased, it sucked up cash. If it decreased, it preserved cash.
                  const netOperatingCash = netProfit - inventoryChange;

                  const upgrades = state.stats.upgradeCosts;
                  const recipes = state.stats.recipeCosts;
                  const apps = state.stats.appCosts || 0;
                  const totalInvestments = upgrades + recipes + apps;

                  // BALANCE SHEET MATH
                  const totalAssets = state.money + currentInventoryValue + upgrades + recipes + apps;
                  const startingEquity = 10000 + INITIAL_INVENTORY_VALUE; // $10,900
                  const ownersEquity = startingEquity + netProfit;

                  return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="mc-inner-panel p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[#3f3f3f] font-bold mb-1 uppercase tracking-widest text-[10px] drop-shadow-md">Total Revenue</span>
                        <span className="text-2xl font-black text-[#388e3c] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">${state.stats.totalEarned.toLocaleString()}</span>
                      </div>
                      <div className="mc-inner-panel p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[#3f3f3f] font-bold mb-1 uppercase tracking-widest text-[10px] drop-shadow-md">Total Tips</span>
                        <span className="text-2xl font-black text-[#f59e0b] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">${tips.toLocaleString()}</span>
                      </div>
                      <div className="mc-inner-panel p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[#3f3f3f] font-bold mb-1 uppercase tracking-widest text-[10px] drop-shadow-md">Served</span>
                        <span className="text-2xl font-black text-[#1e88e5] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{state.stats.customersServed}</span>
                      </div>
                      <div className="mc-inner-panel p-4 flex flex-col items-center justify-center text-center">
                        <span className="text-[#3f3f3f] font-bold mb-1 uppercase tracking-widest text-[10px] drop-shadow-md">Lost</span>
                        <span className="text-2xl font-black text-[#d32f2f] drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">{state.stats.customersLost}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                      <div className="mc-inner-panel p-4">
                        <h3 className="text-sm font-black text-[#555555] mb-3 border-b-4 border-[#8b8b8b] pb-2 uppercase tracking-widest drop-shadow-md">Profit & Loss</h3>
                        <div className="space-y-2 text-xs">
                          
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-black text-[#555555] uppercase tracking-widest">Revenue</div>
                            <div className="flex justify-between items-center text-[#3f3f3f]">
                              <span>In-House Food Sales</span>
                              <span className="text-[#388e3c]">{formatMoney(inHouseSales)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3f3f3f]">
                              <span>Online Food Sales</span>
                              <span className="text-[#388e3c]">{formatMoney(onlineSales)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3f3f3f]">
                              <span>Tips Collected</span>
                              <span className="text-[#388e3c]">{formatMoney(tips)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3f3f3f] font-bold border-t-2 border-[#555555] pt-1.5 mt-1">
                              <span>Total Revenue</span>
                              <span className="text-[#388e3c]">{formatMoney(totalRevenue)}</span>
                            </div>
                          </div>

                          <div className="border-t-2 border-[#8b8b8b] pt-2 mt-2 space-y-1.5">
                            <div className="text-[10px] font-black text-[#555555] uppercase tracking-widest">Cost of Goods Sold</div>
                            <div className="flex justify-between items-center text-[#3f3f3f]">
                              <span>Ingredients Used</span>
                              <span className="text-[#d32f2f]">{formatMoney(-cogs)}</span>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center text-xs font-black border-t-2 border-[#373737] pt-1 mt-1">
                            <span className="text-[#3f3f3f]">Gross Profit</span>
                            <span className={grossProfit >= 0 ? "text-[#388e3c]" : "text-[#d32f2f]"}>
                              {formatMoney(grossProfit)}
                            </span>
                          </div>

                          <div className="border-t-2 border-[#8b8b8b] pt-2 mt-2 space-y-1.5">
                            <div className="text-[10px] font-black text-[#555555] uppercase tracking-widest">Operating Expenses</div>
                            <div className="flex justify-between items-center text-[#3f3f3f]">
                              <span>Salaries</span>
                              <span className="text-[#d32f2f]">{formatMoney(-salaries)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3f3f3f]">
                              <span>Manager Fees</span>
                              <span className="text-[#d32f2f]">{formatMoney(-managers)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3f3f3f]">
                              <span>Online App Fees</span>
                              <span className="text-[#d32f2f]">{formatMoney(-onlineFees)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3f3f3f] font-bold border-t-2 border-[#555555] pt-1.5 mt-1">
                              <span>Total Opex</span>
                              <span className="text-[#d32f2f]">{formatMoney(-totalOpex)}</span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-sm font-black border-t-4 border-[#373737] pt-2 mt-3">
                            <span className="text-[#3f3f3f]">Net Profit</span>
                            <span className={netProfit >= 0 ? "text-[#388e3c]" : "text-[#d32f2f]"}>
                              {formatMoney(netProfit)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mc-inner-panel p-4">
                        <h3 className="text-sm font-black text-[#555555] mb-3 border-b-4 border-[#8b8b8b] pb-2 uppercase tracking-widest drop-shadow-md">Cash Flow</h3>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center text-[#3f3f3f] font-bold">
                            <span>Starting Cash</span>
                            <span className="text-[#3f3f3f]">$10,000</span>
                          </div>
                          
                          <div className="border-t-2 border-[#8b8b8b] pt-2 space-y-1.5">
                            <div className="text-[10px] font-black text-[#555555] uppercase tracking-widest">Operations</div>
                            <div className="flex justify-between items-center text-[#3f3f3f]">
                              <span>Net Profit</span>
                              <span className={netProfit >= 0 ? "text-[#388e3c]" : "text-[#d32f2f]"}>{formatMoney(netProfit)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3f3f3f]" title="Cash spent on un-sold inventory">
                              <span>Inventory Adjustment</span>
                              <span className={-inventoryChange >= 0 ? "text-[#388e3c]" : "text-[#d32f2f]"}>{formatMoney(-inventoryChange)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3f3f3f] font-bold border-t-2 border-[#555555] pt-1.5 mt-1">
                              <span>Net Operating Cash</span>
                              <span className={netOperatingCash >= 0 ? "text-[#388e3c]" : "text-[#d32f2f]"}>{formatMoney(netOperatingCash)}</span>
                            </div>
                          </div>

                          <div className="border-t-2 border-[#8b8b8b] pt-2 space-y-1.5">
                            <div className="text-[10px] font-black text-[#555555] uppercase tracking-widest">Investments</div>
                            <div className="flex justify-between items-center text-[#3f3f3f]">
                              <span>Upgrades & Tables</span>
                              <span className="text-[#d32f2f]">{formatMoney(-upgrades)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3f3f3f]">
                              <span>Recipe Unlocks</span>
                              <span className="text-[#d32f2f]">{formatMoney(-recipes)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3f3f3f]">
                              <span>App Subscriptions</span>
                              <span className="text-[#d32f2f]">{formatMoney(-apps)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3f3f3f] font-bold border-t-2 border-[#555555] pt-1.5 mt-1">
                              <span>Net Investing Cash</span>
                              <span className="text-[#d32f2f]">{formatMoney(-totalInvestments)}</span>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center text-sm font-black border-t-4 border-[#373737] pt-2 mt-3">
                            <span className="text-[#3f3f3f]">Ending Cash</span>
                            <span className="text-[#1e88e5]">{formatMoney(state.money)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mc-inner-panel p-4">
                        <h3 className="text-sm font-black text-[#555555] mb-3 border-b-4 border-[#8b8b8b] pb-2 uppercase tracking-widest drop-shadow-md">Balance Sheet</h3>
                        <div className="space-y-2 text-xs">
                          <div className="space-y-1.5">
                            <div className="text-[10px] font-black text-[#555555] uppercase tracking-widest">Assets</div>
                            <div className="flex justify-between items-center text-[#3f3f3f] font-bold">
                              <span>Cash</span>
                              <span className="text-[#1e88e5]">{formatMoney(state.money)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3f3f3f] font-bold">
                              <span>Inventory Asset</span>
                              <span>{formatMoney(currentInventoryValue)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3f3f3f] font-bold">
                              <span>Equipment (Tables)</span>
                              <span>{formatMoney(upgrades)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3f3f3f] font-bold">
                              <span>Intangibles (Apps/Recipes)</span>
                              <span>{formatMoney(recipes + apps)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3f3f3f] font-black border-t-2 border-[#8b8b8b] pt-1.5 mt-1">
                              <span>Total Assets</span>
                              <span className="text-[#3f3f3f]">{formatMoney(totalAssets)}</span>
                            </div>
                          </div>
                          <div className="border-t-2 border-[#8b8b8b] pt-2 space-y-1.5 mt-2">
                            <div className="text-[10px] font-black text-[#555555] uppercase tracking-widest">Liabilities & Equity</div>
                            <div className="flex justify-between items-center text-[#3f3f3f] font-bold">
                              <span>Liabilities</span>
                              <span>$0</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3f3f3f] font-bold">
                              <span>Owner's Equity</span>
                              <span>{formatMoney(ownersEquity)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[#3f3f3f] font-black border-t-2 border-[#8b8b8b] pt-1.5 mt-1">
                              <span>Total L & E</span>
                              <span className="text-[#3f3f3f]">{formatMoney(ownersEquity)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })() : activeTab === 'upgrades' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <UpgradeCard 
                      title="Add Table" description="Increase max capacity"
                      cost={UPGRADE_COSTS.table(state.tables.length)}
                      canAfford={state.money >= UPGRADE_COSTS.table(state.tables.length)}
                      currentValue={state.tables.length}
                      onBuy={() => actions.buyUpgrade('table')} icon={<Coffee size={24} />}
                    />
                    <UpgradeCard 
                      title="Hire Waiter" description={`$${SALARIES.waiter}/day salary`}
                      cost={UPGRADE_COSTS.waiter(state.staff.waiters)}
                      canAfford={state.money >= UPGRADE_COSTS.waiter(state.staff.waiters)}
                      currentValue={state.staff.waiters}
                      onBuy={() => actions.buyUpgrade('waiter')} icon={<Users size={24} />} costLabel="HIRE"
                    />
                    <UpgradeCard 
                      title="Hire Chef" description={`$${SALARIES.chef}/day salary`}
                      cost={UPGRADE_COSTS.chef(state.staff.chefs)}
                      canAfford={state.money >= UPGRADE_COSTS.chef(state.staff.chefs)}
                      currentValue={state.staff.chefs}
                      onBuy={() => actions.buyUpgrade('chef')} icon={<ChefHat size={24} />} costLabel="HIRE"
                    />
                    <UpgradeCard 
                      title="Better Ingredients" description={`Meal Price: +$${state.upgrades.mealPrice}`}
                      cost={UPGRADE_COSTS.mealPrice(mealPriceLevel)}
                      canAfford={state.money >= UPGRADE_COSTS.mealPrice(mealPriceLevel)}
                      currentValue={`Lvl ${mealPriceLevel}`}
                      onBuy={() => actions.buyLevelUpgrade('mealPrice', mealPriceLevel)} icon={<Utensils size={24} />}
                    />
                    <UpgradeCard 
                      title="Faster Cooking" description="Chefs cook faster"
                      cost={UPGRADE_COSTS.cookingSpeed(cookingSpeedLevel)}
                      canAfford={state.money >= UPGRADE_COSTS.cookingSpeed(cookingSpeedLevel)}
                      currentValue={`Lvl ${cookingSpeedLevel}`}
                      onBuy={() => actions.buyLevelUpgrade('cookingSpeed', cookingSpeedLevel)} icon={<Clock size={24} />}
                    />
                    <UpgradeCard 
                      title="Marketing" description="Customers arrive faster"
                      cost={UPGRADE_COSTS.spawnRate(spawnRateLevel)}
                      canAfford={state.money >= UPGRADE_COSTS.spawnRate(spawnRateLevel)}
                      currentValue={`Lvl ${spawnRateLevel}`}
                      onBuy={() => actions.buyLevelUpgrade('spawnRate', spawnRateLevel)} icon={<Users size={24} />}
                    />
                    <UpgradeCard 
                      title="Hire Manager" description={`Auto-buys inventory. $${SALARIES.manager}/day`}
                      cost={0} canAfford={!state.staff.hasManager}
                      currentValue={state.staff.hasManager ? "Hired" : "None"}
                      onBuy={() => actions.hireManager()} icon={<Users size={24} />} costLabel={state.staff.hasManager ? "HIRED" : "HIRE"}
                    />
                    
                    <div className="col-span-1 md:col-span-2 border-b-4 border-[#8b8b8b] my-2"></div>
                    <h3 className="col-span-1 md:col-span-2 text-sm font-black text-[#555555] uppercase tracking-widest">Delivery Apps</h3>
                    
                    {Object.entries(ONLINE_APPS).map(([id, app]) => (
                      <UpgradeCard 
                        key={id}
                        title={`App: ${app.name}`} 
                        description={`Takes ${app.fee * 100}% fee per order`}
                        cost={app.cost} 
                        canAfford={state.money >= app.cost}
                        currentValue={state.unlockedApps.includes(id) ? "Active" : "Locked"}
                        onBuy={() => actions.unlockApp(id)} 
                        icon={<Smartphone size={24} />} 
                        costLabel={state.unlockedApps.includes(id) ? "UNLOCKED" : "SUBSCRIBE"}
                      />
                    ))}
                  </div>
                ) : activeTab === 'recipes' ? (
                  <div className="flex flex-col h-[500px]">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                        {state.recipes.map(recipe => (
                          <div key={recipe.id} className={`mc-inner-panel p-3 flex flex-col gap-2 transition-all`}>
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 flex items-center justify-center shrink-0 ${recipe.unlocked ? 'mc-button' : 'mc-slot opacity-50'}`}>
                                  <Utensils size={24} />
                                </div>
                                <div className="flex flex-col">
                                  <h3 className="font-black text-sm sm:text-base text-[#3f3f3f] uppercase tracking-widest leading-tight">{recipe.name}</h3>
                                  <p className="text-[10px] font-bold text-[#555555] uppercase mt-0.5">Price: <span className="text-[#388e3c]">${recipe.price}</span> <span className="text-[#555555] px-1">•</span> Time: {recipe.cookingTime}x</p>
                                </div>
                              </div>
                              <div className={`text-[10px] shrink-0 font-black px-2 py-1 uppercase shadow-inner ${recipe.unlocked ? 'mc-button' : 'mc-slot text-[#555555]'}`}>
                                {recipe.unlocked ? 'Unlocked' : 'Locked'}
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-2">
                              {Object.entries(recipe.ingredients || {}).map(([ingId, qty]) => (
                                <span key={ingId} className="text-[10px] font-bold mc-slot text-[#ffffff] px-2 py-1 flex items-center gap-1 uppercase">
                                  <span style={{ imageRendering: 'pixelated' }}>{INGREDIENT_ICONS[ingId] || "📦"}</span> {qty}x {INGREDIENTS[ingId]?.name || ingId}
                                </span>
                              ))}
                            </div>
                            
                            {!recipe.unlocked && (
                              <button 
                                onClick={() => actions.unlockRecipe(recipe.id)}
                                disabled={state.money < recipe.unlockCost}
                                className={`w-full mt-2 py-2 text-xs font-black flex items-center justify-center gap-1 transition-all ${
                                  state.money >= recipe.unlockCost 
                                    ? 'mc-button-green' 
                                    : 'mc-slot text-[#555555] cursor-not-allowed'
                                }`}
                              >
                                <DollarSign size={14} />
                                {recipe.unlockCost.toLocaleString()} TO UNLOCK
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'layouts' ? (
                  <div className="space-y-6">
                    <h3 className="font-black text-[#3f3f3f] text-lg uppercase border-b-4 border-[#8b8b8b] pb-2 tracking-widest drop-shadow-md">Restaurant Layouts</h3>
                    
                    <div className="mc-inner-panel p-5 mb-8">
                      <h4 className="font-black text-[#555555] uppercase mb-4 flex items-center gap-2 text-sm tracking-widest drop-shadow-md">
                        <PaintBucket size={20} className="text-[#3f3f3f]" />
                        Custom Colors
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-[#555555] uppercase tracking-widest">Wall Paint</label>
                          <div className="flex items-center gap-3">
                            <div className="relative w-14 h-14 bg-[#8b8b8b] mc-slot">
                              <input type="color" value={state.wallColor || "#f1f5f9"} onChange={(e) => actions.setWallColor(e.target.value)} className="absolute inset-[-10px] w-20 h-20 cursor-pointer"/>
                            </div>
                            <button onClick={() => actions.setWallColor(null)} className="px-4 py-2 mc-button text-[10px]">Reset</button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-[#555555] uppercase tracking-widest">Window & Door Frame</label>
                          <div className="flex items-center gap-3">
                            <div className="relative w-14 h-14 bg-[#8b8b8b] mc-slot">
                              <input type="color" value={state.frameColor || "#451a03"} onChange={(e) => actions.setFrameColor(e.target.value)} className="absolute inset-[-10px] w-20 h-20 cursor-pointer"/>
                            </div>
                            <button onClick={() => actions.setFrameColor(null)} className="px-4 py-2 mc-button text-[10px]">Reset</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { name: "Standard", desc: "Classic windows with grids" },
                        { name: "Modern Wide", desc: "Large panoramic glass" },
                        { name: "Classic Tall", desc: "Elegant narrow windows" },
                        { name: "High Windows", desc: "Small windows near ceiling" },
                        { name: "Storefront", desc: "Floor-to-ceiling glass" },
                        { name: "Solid Wall", desc: "Maximum privacy, no windows" },
                      ].map((design, i) => (
                        <div key={i} className="mc-inner-panel p-4 flex flex-col gap-3">
                          <div className="flex justify-between items-center">
                            <h4 className="font-black text-[#3f3f3f] uppercase tracking-widest text-sm drop-shadow-md">{design.name}</h4>
                            {state.restaurantLayout === i && <span className="mc-slot text-[#388e3c] px-2 py-1 text-[10px] font-black tracking-widest uppercase">ACTIVE</span>}
                          </div>
                          <p className="text-[10px] uppercase font-bold text-[#555555]">{design.desc}</p>
                          <button 
                            onClick={() => actions.setRestaurantLayout(i)}
                            disabled={state.restaurantLayout === i}
                            className={`w-full py-2 text-[10px] font-black uppercase tracking-widest transition-all ${state.restaurantLayout === i ? 'mc-slot text-[#555555] cursor-not-allowed grayscale' : 'mc-button-green'}`}
                          >
                            {state.restaurantLayout === i ? "SELECTED" : "SELECT FORMAT"}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 pb-4">
                      <h4 className="font-black text-[#555555] uppercase mb-4 flex items-center gap-2 text-sm tracking-widest">
                        <PaintBucket size={20} className="text-[#3f3f3f]" /> Paint Color Themes
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { name: "Classic Wood", wall: "#f1f5f9", frame: "#451a03" },
                          { name: "Modern Slate", wall: "#e2e8f0", frame: "#1e293b" },
                          { name: "Warm Cafe", wall: "#fef3c7", frame: "#78350f" },
                          { name: "Mint Fresh", wall: "#dcfce7", frame: "#14532d" },
                          { name: "Rose Boutique", wall: "#fee2e2", frame: "#7f1d1d" },
                          { name: "Midnight", wall: "#1e293b", frame: "#fbbf24" },
                          { name: "Ocean", wall: "#e0f2fe", frame: "#0369a1" },
                          { name: "Monochrome", wall: "#f8fafc", frame: "#0f172a" },
                        ].map((theme, i) => (
                          <button key={i} onClick={() => { actions.setWallColor(theme.wall); actions.setFrameColor(theme.frame); }} className="mc-button p-3 flex flex-col items-center">
                            <div className="flex w-full h-8 mc-slot mb-2">
                              <div className="flex-1" style={{ backgroundColor: theme.wall }}></div>
                              <div className="flex-1" style={{ backgroundColor: theme.frame }}></div>
                            </div>
                            <span className="text-[10px] font-black text-[#3f3f3f] uppercase tracking-widest mt-1">{theme.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'inventory' ? (
                  <div className="flex h-[480px]">
                    <div className="w-14 flex flex-col items-center py-2 gap-3 mr-4 shrink-0 pr-4 mc-inner-panel bg-transparent !border-t-0 !border-b-0 !border-l-0 border-r-4">
                      <div className="w-12 h-12 mc-slot flex items-center justify-center shrink-0">
                        <Package size={24} className="text-[#3f3f3f]"/>
                      </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col overflow-hidden mr-4">
                      <div className="h-12 border-b-4 border-[#8b8b8b] flex items-center gap-3 mb-3 pb-3 shrink-0">
                        <button onClick={() => setInventoryTab('needed')} className={`px-4 h-9 font-black uppercase tracking-widest text-[11px] transition-all ${inventoryTab === 'needed' ? 'mc-button-selected' : 'mc-button'}`}>Needed</button>
                        <button onClick={() => setInventoryTab('all')} className={`px-4 h-9 font-black uppercase tracking-widest text-[11px] transition-all ${inventoryTab === 'all' ? 'mc-button-selected' : 'mc-button'}`}>All</button>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-2">
                        <div className="grid grid-cols-6 gap-2">
                          {(() => {
                            const allIngredientIds = Object.keys(INGREDIENTS);
                            let displayIds = allIngredientIds;
                            
                            if (inventoryTab === 'needed') {
                              const neededSet = new Set<string>();
                              state.recipes.forEach(recipe => {
                                if (recipe.unlocked) {
                                  Object.keys(recipe.ingredients).forEach(ingId => neededSet.add(ingId));
                                }
                              });
                              displayIds = Array.from(neededSet);
                            }

                            return Array.from({ length: Math.max(42, displayIds.length) }).map((_, i) => {
                              const item = i < displayIds.length ? INGREDIENTS[displayIds[i] as keyof typeof INGREDIENTS] : null;
                              const stock = item ? state.inventory[item.id] || 0 : 0;
                              
                              return (
                                <div key={i} onClick={() => item && setSelectedInventoryItem(item.id)} className={`aspect-square ${selectedInventoryItem === item?.id ? 'mc-button-selected' : 'mc-button'} flex items-center justify-center relative transition-all ${item ? 'cursor-pointer hover:bg-[#d0d0d0]' : 'opacity-50 grayscale pointer-events-none'}`}>
                                  {item && (
                                    <>
                                      <span className="text-3xl drop-shadow-[0_2px_0px_rgba(0,0,0,0.8)]" style={{ imageRendering: 'pixelated' }}>{INGREDIENT_ICONS[item.id] || "📦"}</span>
                                      <span className="absolute bottom-0 right-0 max-w-[90%] overflow-hidden text-clip text-[9px] text-[#ffffff] px-1 py-0.5 font-black uppercase">{stock}</span>
                                    </>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-64 mc-inner-panel p-3 flex flex-col gap-3 shrink-0">
                      {selectedInventoryItem ? (() => {
                        const item = INGREDIENTS[selectedInventoryItem as keyof typeof INGREDIENTS];
                        return (
                          <>
                            <div className="mc-slot p-3 font-black text-[#555555] text-center uppercase tracking-widest text-sm shadow-inner drop-shadow-md">{item.name}</div>
                            <div className="mc-slot p-3 flex justify-between items-center text-[#555555] font-bold text-[10px] uppercase shadow-inner">
                              <span className="text-[#555555] tracking-widest">UNIT COST</span>
                              <span className="flex items-center gap-1 text-[#388e3c] font-black"><DollarSign size={14}/> {item.cost}</span>
                            </div>
                            <div className="flex-1 mc-slot p-3 flex flex-col gap-2 shadow-inner">
                              <span className="text-[10px] font-black text-[#8b8b8b] uppercase tracking-widest border-b-4 border-[#555555] pb-2">Description</span>
                              <p className="text-[10px] text-[#ffffff] font-bold uppercase mt-1">Essential ingredient for cooking {item.name.toLowerCase()}-based dishes.</p>
                              <div className="mt-auto bg-[#c6c6c6] border-4 border-[#373737] p-2 text-center">
                                <span className="text-[10px] text-[#555555] font-black tracking-widest uppercase">CURRENT STOCK</span>
                                <div className="text-xl font-black text-[#3f3f3f] mt-0.5">{state.inventory[item.id] || 0}</div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <button onClick={() => actions.buyIngredient(item.id, 10)} disabled={state.money < item.cost * 10} className={`w-full py-2 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-between px-4 ${state.money < item.cost * 10 ? 'mc-slot text-[#555555] cursor-not-allowed' : 'mc-button hover:bg-[#d0d0d0]'}`}>
                                <span>Buy 10x</span><span className={`${state.money < item.cost * 10 ? 'text-[#8b8b8b]' : 'text-[#388e3c]'}`}>${item.cost * 10}</span>
                              </button>
                              <button onClick={() => actions.buyIngredient(item.id, 100)} disabled={state.money < item.cost * 100} className={`w-full py-2 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-between px-4 ${state.money < item.cost * 100 ? 'mc-slot text-[#555555] cursor-not-allowed' : 'mc-button-green hover:bg-[#43a047]'}`}>
                                <span>Buy 100x</span><span className={`${state.money < item.cost * 100 ? 'text-[#8b8b8b]' : 'text-[#ffffff]'}`}>${item.cost * 100}</span>
                              </button>
                            </div>
                          </>
                        );
                      })() : (
                        <div className="flex-1 flex flex-col items-center justify-center text-[#555555] text-center font-black uppercase tracking-widest mc-slot m-1 p-4">
                          <Package size={32} className="mb-2 opacity-50" /><span className="text-[10px]">Select an item<br/>to view details</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UpgradeCard({ 
  title, description, cost, canAfford, currentValue, onBuy, icon, costLabel
}: { 
  title: string, description: string, cost: number, canAfford: boolean, currentValue: string | number, onBuy: () => void, icon: React.ReactNode, costLabel?: string
}) {
  return (
    <div className="mc-inner-panel p-4 flex flex-col gap-3 transition-all">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center shrink-0 mc-slot">{icon}</div>
          <div className="flex flex-col">
            <h4 className="font-black text-[#3f3f3f] uppercase tracking-widest text-sm drop-shadow-md">{title}</h4>
            <span className="text-[10px] font-bold text-[#555555] uppercase tracking-widest self-start px-2 py-0.5 mt-1 border-b-2 border-r-2 border-[#8b8b8b]">{currentValue}</span>
          </div>
        </div>
      </div>
      <p className="text-[10px] font-bold text-[#555555] uppercase tracking-wide leading-relaxed">{description}</p>
      <button onClick={onBuy} disabled={!canAfford} className={`w-full mt-auto py-2.5 text-[11px] font-black flex items-center justify-center gap-1 transition-all ${canAfford ? 'mc-button-green' : 'mc-slot text-[#555555] cursor-not-allowed grayscale'}`}>
        {cost > 0 ? (<><DollarSign size={14} />{cost.toLocaleString()}</>) : (costLabel || "FREE")}
      </button>
    </div>
  );
}