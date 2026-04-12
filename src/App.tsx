import React, { useState } from 'react';
import { useGameLoop, UPGRADE_COSTS, SALARIES } from './hooks/useGameLoop';
import { ChefHat, Coffee, Utensils, DollarSign, Users, Clock, Plus, ArrowUpCircle, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Scene3D } from './components/Scene3D';

export default function App() {
  const { state, actions } = useGameLoop();
  const [activeTab, setActiveTab] = useState<'restaurant' | 'upgrades' | 'recipes'>('restaurant');
  const [gamePhase, setGamePhase] = useState<'menu' | 'playing'>('menu');

  // Calculate levels based on current upgrade values
  const mealPriceLevel = Math.round((state.upgrades.mealPrice - 10) / 5);
  const cookingSpeedLevel = Math.round((state.upgrades.cookingSpeed - 1) / 0.5);
  const spawnRateLevel = Math.round((state.upgrades.spawnRate - 1) / 0.5);

  if (gamePhase === 'menu') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans select-none">
        <div className="w-full max-w-[900px] aspect-[4/3] bg-blue-400 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] border-8 border-stone-800 relative overflow-hidden flex flex-col items-center justify-center">
          {/* Sunburst background */}
          <div className="absolute inset-0 bg-[repeating-conic-gradient(from_0deg,#60a5fa_0deg_15deg,#3b82f6_15deg_30deg)] opacity-50 animate-[spin_60s_linear_infinite]" />
          
          {/* Title */}
          <motion.div 
            initial={{ scale: 0.5, y: -50 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', bounce: 0.6 }}
            className="z-10 flex flex-col items-center"
          >
            <h1 className="text-7xl md:text-8xl font-black text-white drop-shadow-[0_8px_0_#1e3a8a] tracking-tighter" style={{ WebkitTextStroke: '4px #1e3a8a' }}>
              PAPA'S
            </h1>
            <h2 className="text-5xl md:text-6xl font-black text-yellow-300 drop-shadow-[0_6px_0_#b45309] -mt-4 tracking-tight rotate-2" style={{ WebkitTextStroke: '3px #b45309' }}>
              RESTAURANT 3D
            </h2>
          </motion.div>

          {/* Play Button */}
          <motion.button 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring' }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setGamePhase('playing')} 
            className="mt-16 px-16 py-4 bg-green-500 rounded-full text-white font-black text-4xl border-4 border-green-900 shadow-[0_8px_0_#14532d] hover:shadow-[0_4px_0_#14532d] hover:translate-y-1 active:translate-y-2 active:shadow-none z-10 transition-all"
          >
            PLAY
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans select-none">
      {/* Flash Player Container */}
      <div className="w-full max-w-[1000px] bg-stone-100 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] border-8 border-stone-800 relative overflow-hidden flex flex-col h-[800px]">
        {/* Header */}
        <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10 border-b-4 border-stone-800">
        <div className="flex items-center gap-2">
          <div className="bg-amber-500 text-white p-2 rounded-lg">
            <Utensils size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Bite Tycoon 3D</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full font-semibold border-2 border-green-200">
            <DollarSign size={20} />
            <span>{state.money.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-stone-600 font-medium">
            <Clock size={20} />
            <span>Day {state.day}</span>
            <div className="w-24 h-2 bg-stone-200 rounded-full overflow-hidden ml-2 border border-stone-300">
              <div 
                className="h-full bg-blue-500 transition-all duration-100 ease-linear"
                style={{ width: `${state.time}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full p-4 flex flex-col md:flex-row gap-6 overflow-hidden">
        
        {/* Mobile Tabs */}
        <div className="flex md:hidden bg-white rounded-xl p-1 shadow-sm border border-stone-200 mb-2">
          <button 
            onClick={() => setActiveTab('restaurant')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'restaurant' ? 'bg-stone-100 text-stone-900' : 'text-stone-500'}`}
          >
            Restaurant
          </button>
          <button 
            onClick={() => setActiveTab('upgrades')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'upgrades' ? 'bg-stone-100 text-stone-900' : 'text-stone-500'}`}
          >
            Upgrades
          </button>
          <button 
            onClick={() => setActiveTab('recipes')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'recipes' ? 'bg-stone-100 text-stone-900' : 'text-stone-500'}`}
          >
            Recipes
          </button>
        </div>

        {/* Desktop Tabs (Sidebar) */}
        <div className="hidden md:flex flex-col gap-2 w-32 shrink-0">
          <button 
            onClick={() => setActiveTab('restaurant')}
            className={`py-3 px-4 text-sm font-bold rounded-xl transition-colors border-2 ${activeTab === 'restaurant' ? 'bg-blue-100 border-blue-500 text-blue-900' : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'}`}
          >
            Restaurant
          </button>
          <button 
            onClick={() => setActiveTab('upgrades')}
            className={`py-3 px-4 text-sm font-bold rounded-xl transition-colors border-2 ${activeTab === 'upgrades' ? 'bg-purple-100 border-purple-500 text-purple-900' : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'}`}
          >
            Upgrades
          </button>
          <button 
            onClick={() => setActiveTab('recipes')}
            className={`py-3 px-4 text-sm font-bold rounded-xl transition-colors border-2 ${activeTab === 'recipes' ? 'bg-orange-100 border-orange-500 text-orange-900' : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300'}`}
          >
            Recipes
          </button>
        </div>

        {/* Left Column: Game Area */}
        <div className={`flex-1 flex-col gap-6 h-full ${activeTab === 'restaurant' ? 'flex' : 'hidden md:flex'}`}>
          <Scene3D state={state} actions={actions} />
        </div>

        {/* Right Column: Upgrades & Stats */}
        <div className={`w-full md:w-80 flex-col gap-4 h-full overflow-y-auto ${activeTab === 'upgrades' || activeTab === 'recipes' ? 'flex' : 'hidden md:flex'}`}>
          
          {/* Stats */}
          <section className="bg-white rounded-2xl shadow-sm border-4 border-stone-800 p-4">
            <h2 className="text-lg font-black mb-2">STATS</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">Total Earned</span>
                <span className="font-black text-green-600">${state.stats.totalEarned.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">Served</span>
                <span className="font-black text-blue-600">{state.stats.customersServed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-bold">Lost (Angry)</span>
                <span className="font-black text-red-600">{state.stats.customersLost}</span>
              </div>
            </div>
          </section>

          {/* Upgrades or Recipes */}
          {activeTab !== 'recipes' ? (
            <section className="bg-white rounded-2xl shadow-sm border-4 border-stone-800 p-4 flex-1 flex flex-col">
              <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                <ArrowUpCircle className="text-purple-500" /> UPGRADES
              </h2>
              
              <div className="space-y-3 overflow-y-auto pr-2 flex-1">
                
                {/* Add Table */}
                <UpgradeCard 
                  title="Add Table" 
                  description="Increase max capacity"
                  cost={UPGRADE_COSTS.table(state.tables.length)}
                  canAfford={state.money >= UPGRADE_COSTS.table(state.tables.length)}
                  currentValue={state.tables.length}
                  onBuy={() => actions.buyUpgrade('table')}
                  icon={<Coffee size={20} />}
                />

                {/* Hire Waiter */}
                <UpgradeCard 
                  title="Hire Waiter" 
                  description={`$${SALARIES.waiter}/day salary`}
                  cost={UPGRADE_COSTS.waiter(state.staff.waiters)}
                  canAfford={state.money >= UPGRADE_COSTS.waiter(state.staff.waiters)}
                  currentValue={state.staff.waiters}
                  onBuy={() => actions.buyUpgrade('waiter')}
                  icon={<Users size={20} />}
                  costLabel="HIRE"
                />

                {/* Hire Chef */}
                <UpgradeCard 
                  title="Hire Chef" 
                  description={`$${SALARIES.chef}/day salary`}
                  cost={UPGRADE_COSTS.chef(state.staff.chefs)}
                  canAfford={state.money >= UPGRADE_COSTS.chef(state.staff.chefs)}
                  currentValue={state.staff.chefs}
                  onBuy={() => actions.buyUpgrade('chef')}
                  icon={<ChefHat size={20} />}
                  costLabel="HIRE"
                />

                {/* Better Ingredients */}
                <UpgradeCard 
                  title="Better Ingredients" 
                  description={`Meal Price: +$${state.upgrades.mealPrice}`}
                  cost={UPGRADE_COSTS.mealPrice(mealPriceLevel)}
                  canAfford={state.money >= UPGRADE_COSTS.mealPrice(mealPriceLevel)}
                  currentValue={`Lvl ${mealPriceLevel}`}
                  onBuy={() => actions.buyLevelUpgrade('mealPrice', mealPriceLevel)}
                  icon={<Utensils size={20} />}
                />

                {/* Faster Cooking */}
                <UpgradeCard 
                  title="Faster Cooking" 
                  description="Chefs cook faster"
                  cost={UPGRADE_COSTS.cookingSpeed(cookingSpeedLevel)}
                  canAfford={state.money >= UPGRADE_COSTS.cookingSpeed(cookingSpeedLevel)}
                  currentValue={`Lvl ${cookingSpeedLevel}`}
                  onBuy={() => actions.buyLevelUpgrade('cookingSpeed', cookingSpeedLevel)}
                  icon={<Clock size={20} />}
                />

                {/* Marketing */}
                <UpgradeCard 
                  title="Marketing" 
                  description="Customers arrive faster"
                  cost={UPGRADE_COSTS.spawnRate(spawnRateLevel)}
                  canAfford={state.money >= UPGRADE_COSTS.spawnRate(spawnRateLevel)}
                  currentValue={`Lvl ${spawnRateLevel}`}
                  onBuy={() => actions.buyLevelUpgrade('spawnRate', spawnRateLevel)}
                  icon={<Users size={20} />}
                />

              </div>
            </section>
          ) : (
            <section className="bg-white rounded-2xl shadow-sm border-4 border-stone-800 p-4 flex-1 flex flex-col">
              <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                <BookOpen className="text-orange-500" /> RECIPES
              </h2>
              
              <div className="space-y-3 overflow-y-auto pr-2 flex-1">
                {state.recipes.map(recipe => (
                  <div key={recipe.id} className="bg-stone-50 border-2 border-stone-800 rounded-xl p-3 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="text-stone-500"><Utensils size={20} /></div>
                        <div>
                          <h3 className="font-black text-sm text-stone-800 uppercase">{recipe.name}</h3>
                          <p className="text-[10px] font-bold text-stone-500">Price: ${recipe.price} | Time: {recipe.cookingTime}x</p>
                        </div>
                      </div>
                      <div className={`text-[10px] font-black px-2 py-1 rounded border ${recipe.unlocked ? 'bg-green-200 text-green-800 border-green-300' : 'bg-stone-200 text-stone-600 border-stone-300'}`}>
                        {recipe.unlocked ? 'UNLOCKED' : 'LOCKED'}
                      </div>
                    </div>
                    
                    {!recipe.unlocked && (
                      <button 
                        onClick={() => actions.unlockRecipe(recipe.id)}
                        disabled={state.money < recipe.unlockCost}
                        className={`w-full py-1.5 rounded-lg text-sm font-black flex items-center justify-center gap-1 transition-colors border-2 border-stone-800 ${
                          state.money >= recipe.unlockCost 
                            ? 'bg-orange-400 hover:bg-orange-500 text-stone-900 shadow-[0_4px_0_#9a3412] hover:translate-y-0.5 hover:shadow-[0_2px_0_#9a3412] active:translate-y-1 active:shadow-none' 
                            : 'bg-stone-300 text-stone-500 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <DollarSign size={16} />
                        {recipe.unlockCost.toLocaleString()} TO UNLOCK
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
    </div>
  );
}

function UpgradeCard({ 
  title, description, cost, canAfford, currentValue, onBuy, icon, costLabel
}: { 
  title: string, description: string, cost: number, canAfford: boolean, currentValue: string | number, onBuy: () => void, icon: React.ReactNode, costLabel?: string
}) {
  return (
    <div className="bg-stone-50 border-2 border-stone-800 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className="text-stone-500">{icon}</div>
          <div>
            <h3 className="font-black text-sm text-stone-800 uppercase">{title}</h3>
            <p className="text-[10px] font-bold text-stone-500">{description}</p>
          </div>
        </div>
        <div className="text-[10px] font-black bg-stone-200 text-stone-600 px-2 py-1 rounded border border-stone-300">
          {currentValue}
        </div>
      </div>
      
      <button 
        onClick={onBuy}
        disabled={!canAfford}
        className={`w-full py-1.5 rounded-lg text-sm font-black flex items-center justify-center gap-1 transition-colors border-2 border-stone-800 ${
          canAfford 
            ? 'bg-green-400 hover:bg-green-500 text-stone-900 shadow-[0_4px_0_#14532d] hover:translate-y-0.5 hover:shadow-[0_2px_0_#14532d] active:translate-y-1 active:shadow-none' 
            : 'bg-stone-300 text-stone-500 cursor-not-allowed opacity-50'
        }`}
      >
        {cost > 0 ? (
          <>
            <DollarSign size={16} />
            {cost.toLocaleString()}
          </>
        ) : (
          costLabel || "FREE"
        )}
      </button>
    </div>
  );
}
