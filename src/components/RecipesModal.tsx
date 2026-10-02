import React, { useState } from 'react';
import { BookOpen, Search, DollarSign, Clock, Check, AlertCircle, Sparkles, TrendingUp, Lock } from 'lucide-react';
import { demandFor, MENU_LIMIT } from '../gameplay';
import { Recipe, INGREDIENTS } from '../data/recipes';
import { INGREDIENT_ICONS } from '../data/categories';
import type { GameState } from '../hooks/useGameLoop';

interface RecipesModalProps {
  recipes: Recipe[];
  inventory: Record<string, number>;
  money: number;
  activeMenu: string[];
  hasManager: boolean;
  manager: GameState['manager'];
  onToggleActive: (id: string) => void;
  onUnlockRecipe: (id: string) => void;
  onChangePrice: (id: string, newPrice: number) => void;
}

export const RecipesModal: React.FC<RecipesModalProps> = ({
  recipes,
  inventory,
  money,
  activeMenu,
  hasManager,
  manager,
  onToggleActive,
  onUnlockRecipe,
  onChangePrice,
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'unlocked' | 'locked' | 'custom'>('active');
  const [search, setSearch] = useState('');
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const filteredRecipes = recipes.filter(r => {
    if (filter === 'active' && !activeMenu.includes(r.id)) return false;
    if (filter === 'unlocked' && !r.unlocked) return false;
    if (filter === 'locked' && r.unlocked) return false;
    if (filter === 'custom' && !r.id.startsWith('custom_')) return false;
    if (search.trim() && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    return a.basePrice - b.basePrice;
  });

  return (
    <div className="flex flex-col h-full font-mono">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-[#8b8b8b] pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 mc-slot flex items-center justify-center bg-[#475569]">
            <BookOpen size={20} className="text-yellow-300" />
          </div>
          <div>
            <h3 className="font-black text-[#2b2b2b] text-base md:text-lg uppercase tracking-wider">
              Choose your weekly menu
            </h3>
            <p className="text-[10px] font-bold text-[#555555] uppercase">
              Choose 1–6 dishes. Higher prices reduce demand; new recipes go into your collection.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="mc-slot px-3 py-1.5 flex items-center gap-1.5 text-xs font-black">
            <span className="text-[#555555] text-[9px] uppercase">Menu Offerings:</span>
            <span className="text-[#388e3c] font-black">
              {recipes.filter(r => r.unlocked).length} / {recipes.length} Unlocked
            </span>
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex gap-1">
          {[
            { id: 'active', label: `On menu (${activeMenu.length}/${MENU_LIMIT})` },
            { id: 'all', label: `All (${recipes.length})` },
            { id: 'unlocked', label: `Collection (${recipes.filter(r => r.unlocked).length})` },
            { id: 'locked', label: `Locked (${recipes.filter(r => !r.unlocked).length})` },
            { id: 'custom', label: `⭐ Lab (${recipes.filter(r => r.id.startsWith('custom_')).length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1 text-xs font-black uppercase tracking-wider transition-all ${
                filter === tab.id ? 'mc-button-selected' : 'mc-button'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-64">
          <Search size={14} className="absolute left-2.5 top-2.5 text-[#666666]" />
          <input
            type="text"
            placeholder="FIND DISH..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#f1f5f9] border-2 border-[#373737] pl-8 pr-3 py-1 text-xs font-bold uppercase text-[#2b2b2b] outline-none shadow-inner"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1.5 text-[10px] font-black text-[#888888] hover:text-black"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Recipe Cards Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[460px]">
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-16 text-[#555555] font-black uppercase text-sm">
            No recipes found matching current filters.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
            {filteredRecipes.map(recipe => {
              const isCustom = recipe.id.startsWith('custom_');

              // Calculate raw ingredient cost
              let rawCost = 0;
              let isMissingIngredients = false;
              Object.entries(recipe.ingredients || {}).forEach(([ingId, qty]) => {
                const ing = INGREDIENTS[ingId];
                rawCost += (ing?.cost || 1) * qty;
                if ((inventory[ingId] || 0) < qty) {
                  isMissingIngredients = true;
                }
              });

              const profit = recipe.price - rawCost;
              const marginPercent = Math.round((profit / Math.max(1, recipe.price)) * 100);

              // Price elasticity badge
              const markupRatio = recipe.price / Math.max(1, recipe.basePrice);
              const elasticity = markupRatio <= 1.05
                ? { label: "Fair Price (High Demand)", color: "text-emerald-700 bg-emerald-100" }
                : markupRatio <= 1.4
                ? { label: "Standard Margin", color: "text-blue-800 bg-blue-100" }
                : { label: "Premium Pricing", color: "text-amber-800 bg-amber-100" };

              return (
                <div
                  key={recipe.id}
                  className={`mc-inner-panel p-3.5 flex flex-col justify-between transition-all border-2 ${
                    !recipe.unlocked
                      ? 'border-[#777777] bg-[#bbbbbb]/70 opacity-90'
                      : isCustom
                      ? 'border-yellow-600 bg-amber-50/50 shadow-md'
                      : 'border-[#373737] bg-[#f8fafc] shadow-sm'
                  }`}
                >
                  <div>
                    {/* Header Row */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-12 h-12 flex items-center justify-center shrink-0 rounded border-2 border-[#373737] text-2xl ${
                            recipe.unlocked ? 'bg-white shadow' : 'bg-[#777777] opacity-60'
                          }`}
                          style={{ imageRendering: 'pixelated' }}
                        >
                          {INGREDIENT_ICONS[Object.keys(recipe.ingredients)[0]] || "🍽️"}
                        </div>
                        <div className="truncate">
                          <h4 className="font-black text-xs sm:text-sm text-[#2b2b2b] uppercase tracking-wider truncate">
                            {recipe.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-bold text-[#555555] uppercase flex items-center gap-1">
                              <Clock size={11} /> {recipe.cookingTime * 5}s base prep
                            </span>
                            {isCustom && (
                              <span className="text-[8px] font-black text-amber-700 bg-amber-200 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                                <Sparkles size={9} /> Lab Recipe
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {recipe.unlocked ? (
                          <span className="mc-slot px-2 py-0.5 text-[9px] font-black uppercase bg-[#2e7d32] text-white">
                            {activeMenu.includes(recipe.id) ? "On menu" : "In collection"}
                          </span>
                        ) : (
                          <span className="mc-slot px-2 py-0.5 text-[9px] font-black uppercase bg-[#64748b] text-white flex items-center gap-1">
                            <Lock size={10} /> Locked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ingredient Requirements & Pantry Readiness */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-[#666666] mb-1">
                        <span>Required Ingredients</span>
                        {recipe.unlocked && (
                          <span className={isMissingIngredients ? "text-red-600 font-black flex items-center gap-0.5" : "text-emerald-700 font-black flex items-center gap-0.5"}>
                            {isMissingIngredients ? (
                              <><AlertCircle size={10} /> Stock Shortage</>
                            ) : (
                              <><Check size={10} /> Ready to Cook</>
                            )}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {Object.entries(recipe.ingredients || {}).map(([ingId, reqQty]) => {
                          const inStock = inventory[ingId] || 0;
                          const hasEnough = inStock >= reqQty;

                          return (
                            <span
                              key={ingId}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1 border ${
                                hasEnough
                                  ? 'bg-white border-[#94a3b8] text-[#2b2b2b]'
                                  : 'bg-red-100 border-red-400 text-red-700'
                              }`}
                              title={`In Stock: ${inStock} / Needed: ${reqQty}`}
                            >
                              <span style={{ imageRendering: 'pixelated' }}>{INGREDIENT_ICONS[ingId]}</span>
                              <span>{reqQty}x {INGREDIENTS[ingId]?.name || ingId}</span>
                              <span className={`text-[8px] font-black ${hasEnough ? 'text-emerald-600' : 'text-red-600'}`}>
                                ({inStock})
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Financial Intelligence Breakdown */}
                    <div className="grid grid-cols-3 gap-1.5 bg-[#e2e8f0] p-2 rounded border border-[#cbd5e1] text-center mb-3">
                      <div>
                        <span className="text-[8px] font-bold text-[#64748b] uppercase block">Raw Cost</span>
                        <span className="text-xs font-black text-[#ef4444]">${rawCost.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-[#64748b] uppercase block">Unit Profit</span>
                        <span className="text-xs font-black text-[#2e7d32]">+${profit.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-[#64748b] uppercase block">Gross Margin</span>
                        <span className="text-xs font-black text-[#1565c0]">{marginPercent}%</span>
                      </div>
                    </div>
                  </div>

                  {recipe.unlocked && <button onClick={() => { setLastAdded(activeMenu.includes(recipe.id) ? null : recipe.id); onToggleActive(recipe.id); }}
                    disabled={activeMenu.includes(recipe.id) ? activeMenu.length === 1 : activeMenu.length >= MENU_LIMIT}
                    aria-pressed={activeMenu.includes(recipe.id)} className="mc-button px-3 py-2 mb-2 text-sm">
                    {activeMenu.includes(recipe.id) ? 'Remove from menu' : hasManager && manager.enabled ? 'Add to menu & auto-stock' : 'Add to menu'} · {recipe.name}
                  </button>}
                  {recipe.unlocked && <p role={lastAdded === recipe.id ? 'status' : undefined} className="text-[10px] leading-relaxed text-stone-600 mb-3">
                    {lastAdded === recipe.id && activeMenu.includes(recipe.id) ? 'Added to menu. ' : ''}
                    {!hasManager ? 'Stock ingredients in Pantry. A hired purchasing manager can order them for you.'
                      : !manager.enabled ? 'Manager purchasing is paused. Enable it in Staff & Shop to auto-stock.'
                      : !activeMenu.includes(recipe.id) ? 'Your manager will order ingredients immediately, within the weekly budget and cash reserve—even during planning.'
                      : !isMissingIngredients ? 'Ingredients ready. Automatic restocking stays within the purchasing budget and cash reserve.'
                      : manager.spent >= manager.budget ? 'Stock still needed: the manager’s weekly budget is used up. Increase it in Staff & Shop or buy ingredients in Pantry.'
                      : money <= manager.reserve ? 'Stock still needed: the manager is protecting your cash reserve. Adjust it in Staff & Shop or buy ingredients in Pantry.'
                      : 'Stock still needed: the remaining purchasing budget or available cash cannot cover the missing ingredients. Check Staff & Shop or Pantry.'}
                  </p>}
                  {/* Actions Row */}
                  {recipe.unlocked ? (
                    <div className="flex items-center justify-between bg-[#c6c6c6] p-2 border-2 border-[#8b8b8b] rounded">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase text-[#555555]">Menu Price</span>
                        <span className={`text-[8px] font-black px-1 rounded ${elasticity.color}`}>
                          {Math.round(demandFor(recipe) * 100)}% demand at this price
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onChangePrice(recipe.id, recipe.price - 1)}
                          aria-label={`Decrease ${recipe.name} price`}
                          disabled={recipe.price <= recipe.basePrice}
                          className={`w-7 h-7 flex items-center justify-center font-black rounded text-sm ${
                            recipe.price <= recipe.basePrice ? 'mc-slot text-[#888888] cursor-not-allowed' : 'mc-button-red'
                          }`}
                          title={`Base price minimum: $${recipe.basePrice}`}
                        >
                          -
                        </button>
                        <span className="font-black text-base text-[#1b5e20] w-10 text-center drop-shadow-sm">
                          ${recipe.price}
                        </span>
                        <button
                          onClick={() => onChangePrice(recipe.id, recipe.price + 1)}
                          disabled={recipe.price >= recipe.basePrice * 3}
                          aria-label={`Increase ${recipe.name} price`}
                          className="w-7 h-7 flex items-center justify-center font-black rounded text-sm mc-button-green"
                          title="Increase menu price"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => onUnlockRecipe(recipe.id)}
                      disabled={money < recipe.unlockCost}
                      className={`w-full py-2.5 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow transition-all ${
                        money >= recipe.unlockCost ? 'mc-button-green' : 'mc-slot text-[#888888] cursor-not-allowed opacity-75'
                      }`}
                    >
                      <DollarSign size={14} />
                      {money >= recipe.unlockCost
                        ? `Unlock Recipe ($${recipe.unlockCost.toLocaleString()})`
                        : `Need $${recipe.unlockCost.toLocaleString()} (Short $${(recipe.unlockCost - money).toLocaleString()})`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
