import React, { useState } from 'react';
import { Beaker, Search, Trash2, Sparkles, DollarSign, Clock, ChefHat, Check, ArrowRight } from 'lucide-react';
import { INGREDIENTS, Recipe } from '../data/recipes';
import { INGREDIENT_ICONS, INGREDIENT_CATEGORIES, CATEGORY_LABELS, IngredientCategory } from '../data/categories';

interface ResearchLabModalProps {
  money: number;
  existingRecipesCount: number;
  researchActiveCount?:number;
  onOpenMenu?:()=>void;
  onPayResearchCost: (cost: number) => void;
  onAddCustomRecipe: (recipe: Recipe) => void;
}

const RESEARCH_FEE = 2500;

export const generateRecipeOptions = (selectedIngredients: Record<string, number>, baseRecipesCount: number): Recipe[] => {
  const keys = Object.keys(selectedIngredients);
  const mainIng = INGREDIENTS[keys[0]]?.name || 'Chef';
  const secIng = keys[1] ? INGREDIENTS[keys[1]]?.name : '';
  
  let rawCost = 0;
  let totalItems = 0;
  Object.entries(selectedIngredients).forEach(([id, qty]) => {
    rawCost += (INGREDIENTS[id]?.cost || 1) * qty;
    totalItems += qty;
  });

  const baseTime = Math.max(0.8, Number((totalItems * 0.4 + 0.8).toFixed(1)));
  const isCarb = keys.some(k => ['bun', 'bread', 'tortilla'].includes(k));
  const isNoodle = keys.some(k => ['noodle', 'pasta'].includes(k));
  
  const forms = isCarb ? ['Sandwich', 'Burger', 'Wrap', 'Sub'] : isNoodle ? ['Pasta', 'Noodles', 'Ramen', 'Bowl'] : ['Skillet', 'Platter', 'Bites', 'Delight', 'Special', 'Feast'];
  const getForm = (seed: number) => forms[seed % forms.length];

  // 1. House Favorite (Balanced)
  const opt1: Recipe = {
    id: `custom_${baseRecipesCount}_1_${Date.now()}`,
    name: `Signature ${mainIng} ${secIng ? '& ' + secIng : ''} ${getForm(1)}`.trim(),
    cookingTime: baseTime,
    price: Math.max(8, Math.round(rawCost * 3.6)),
    ingredients: { ...selectedIngredients },
    unlocked: true,
    unlockCost: 0,
    basePrice: Math.max(8, Math.round(rawCost * 3.6))
  };

  // 2. Gourmet Masterpiece (Premium pricing, longer cook)
  const opt2: Recipe = {
    id: `custom_${baseRecipesCount}_2_${Date.now()}`,
    name: `Gourmet ${secIng || mainIng} ${getForm(2)}`.trim(),
    cookingTime: Number((baseTime + 1.2).toFixed(1)),
    price: Math.max(12, Math.round(rawCost * 4.8)),
    ingredients: { ...selectedIngredients },
    unlocked: true,
    unlockCost: 0,
    basePrice: Math.max(12, Math.round(rawCost * 4.8))
  };

  // 3. Fast-Casual Express (Quick prep, slightly lower margin)
  const opt3: Recipe = {
    id: `custom_${baseRecipesCount}_3_${Date.now()}`,
    name: `Express ${mainIng} ${getForm(3)}`.trim(),
    cookingTime: Math.max(0.5, Number((baseTime - 0.6).toFixed(1))),
    price: Math.max(6, Math.round(rawCost * 2.8)),
    ingredients: { ...selectedIngredients },
    unlocked: true,
    unlockCost: 0,
    basePrice: Math.max(6, Math.round(rawCost * 2.8))
  };

  return [opt1, opt2, opt3];
};

export const ResearchLabModal: React.FC<ResearchLabModalProps> = ({
  money,
  existingRecipesCount,
  researchActiveCount=0,
  onOpenMenu,
  onPayResearchCost,
  onAddCustomRecipe,
}) => {
  const [labIngredients, setLabIngredients] = useState<Record<string, number>>({});
  const [category, setCategory] = useState<IngredientCategory>('all');
  const [search, setSearch] = useState('');
  const [labPhase, setLabPhase] = useState<'select' | 'options'>('select');
  const [labOptions, setLabOptions] = useState<Recipe[]>([]);
  const [savedRecipe,setSavedRecipe]=useState('');

  const totalIngredientsInPot = Object.values(labIngredients).reduce((a, b) => a + b, 0);
  const canAddMore = totalIngredientsInPot < 4;
  const canResearch = totalIngredientsInPot >= 2 && money >= RESEARCH_FEE;

  // Calculate projected raw cost
  const rawCost = Object.entries(labIngredients).reduce((sum, [id, qty]) => {
    return sum + (INGREDIENTS[id]?.cost || 0) * qty;
  }, 0);

  const handleAddIngredient = (id: string) => {
    if (!canAddMore) return;
    setLabIngredients(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }));
  };

  const handleRemoveIngredient = (id: string) => {
    setLabIngredients(prev => {
      const current = prev[id] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: current - 1 };
    });
  };

  const handleClearPot = () => {
    setLabIngredients({});
  };

  const handleStartResearch = () => {
    if (!canResearch) return;
    onPayResearchCost(RESEARCH_FEE);
    const options = generateRecipeOptions(labIngredients, existingRecipesCount);
    setLabOptions(options);
    setLabPhase('options');
  };

  const handleSelectRecipe = (recipe: Recipe) => {
    onAddCustomRecipe(recipe);
    setSavedRecipe(recipe.name);
    setLabIngredients({});
    setLabOptions([]);
    setLabPhase('select');
  };

  const ingredientList = Object.keys(INGREDIENTS).filter(id => {
    const item = INGREDIENTS[id];
    if (!item) return false;
    if (category !== 'all' && INGREDIENT_CATEGORIES[id] !== category) return false;
    if (search.trim() && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full font-mono">
      <div className="mc-inner-panel p-3 mb-3"><strong>Research menu: {researchActiveCount} / 10 active</strong><p className="text-sm">Keep as many learned recipes as you like. Activate up to 10 alongside your restaurant’s own dishes. Remove one research dish from the menu to make room for another; it stays learned.</p>{savedRecipe&&<p role="status">Saved {savedRecipe}. Add it under Menu & prices.</p>}{onOpenMenu&&<button className="mc-button px-3 py-2 mt-2" onClick={onOpenMenu}>Manage research menu</button>}</div>
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-[#8b8b8b] pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 mc-slot flex items-center justify-center text-xl bg-[#64748b]">
            <Beaker size={20} className="text-yellow-300" />
          </div>
          <div>
            <h3 className="font-black text-[#2b2b2b] text-base md:text-lg uppercase tracking-wider">
              Culinary Research & Development
            </h3>
            <p className="text-[10px] font-bold text-[#555555] uppercase">
              Combine 2 to 4 raw ingredients to engineer new exclusive menu creations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="mc-slot px-3 py-1.5 flex items-center gap-1.5 text-xs font-black">
            <span className="text-[#555555] uppercase text-[9px] mr-1">R&D Fee:</span>
            <span className="text-[#ef4444]">${RESEARCH_FEE.toLocaleString()}</span>
          </div>
          <div className="mc-slot px-3 py-1.5 flex items-center gap-1 text-xs font-black">
            <span className="text-[#555555] uppercase text-[9px] mr-1">Funds:</span>
            <span className={money >= RESEARCH_FEE ? "text-[#388e3c]" : "text-[#ef4444]"}>
              ${money.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {labPhase === 'select' ? (
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-[460px]">
          {/* Left: Ingredient Selector & Filters */}
          <div className="flex-1 flex flex-col mc-inner-panel p-3 min-w-0">
            {/* Search & Category Filter Pills */}
            <div className="flex flex-col gap-2 mb-3">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-[#666666]" />
                <input
                  type="text"
                  placeholder="SEARCH INGREDIENTS..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-[#f1f5f9] border-2 border-[#373737] pl-8 pr-3 py-1.5 text-xs font-bold uppercase text-[#2b2b2b] outline-none shadow-inner"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-2 text-[10px] font-black text-[#888888] hover:text-black"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category chips */}
              <div className="flex flex-wrap gap-1">
                {CATEGORY_LABELS.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${
                      category === cat.id ? 'mc-button-selected' : 'mc-button'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Grid of Ingredients */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[340px]">
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-1.5">
                {ingredientList.map(id => {
                  const ing = INGREDIENTS[id];
                  const inPot = labIngredients[id] || 0;
                  const isSelectable = canAddMore;

                  return (
                    <button
                      key={id}
                      onClick={() => isSelectable && handleAddIngredient(id)}
                      disabled={!isSelectable && inPot === 0}
                      title={`${ing.name} ($${ing.cost}/unit)`}
                      className={`aspect-square flex flex-col items-center justify-center relative p-1 transition-all ${
                        inPot > 0
                          ? 'mc-button-selected ring-2 ring-blue-500 scale-[0.98]'
                          : isSelectable
                          ? 'mc-button hover:bg-[#dedede]'
                          : 'mc-button opacity-40 grayscale cursor-not-allowed'
                      }`}
                    >
                      <span className="text-2xl drop-shadow-sm leading-none" style={{ imageRendering: 'pixelated' }}>
                        {INGREDIENT_ICONS[id] || "📦"}
                      </span>
                      <span className="text-[8px] font-black uppercase text-center truncate w-full px-0.5 mt-0.5 leading-tight">
                        {ing.name}
                      </span>
                      <span className="text-[7px] font-bold text-[#555555]">
                        ${ing.cost}
                      </span>

                      {inPot > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white border border-stone-800 rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-black shadow-md animate-scale-in">
                          {inPot}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: The Mixing Cauldron & Recipe Formulation Panel */}
          <div className="w-full lg:w-80 mc-inner-panel p-4 flex flex-col justify-between shrink-0 bg-[#d4d4d4]">
            <div>
              {/* Cauldron Title */}
              <div className="flex items-center justify-between border-b-2 border-[#8b8b8b] pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-xl">⚗️</div>
                  <h4 className="font-black text-xs uppercase tracking-widest text-[#2b2b2b]">
                    The Mixing Pot
                  </h4>
                </div>
                <div className="mc-slot px-2 py-0.5 text-[10px] font-black">
                  {totalIngredientsInPot} / 4 Slots
                </div>
              </div>

              {/* 4 Visual Crafting Slots */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[0, 1, 2, 3].map(slotIndex => {
                  const flattened: string[] = [];
                  Object.entries(labIngredients).forEach(([id, qty]) => {
                    for (let q = 0; q < qty; q++) flattened.push(id);
                  });
                  const ingId = flattened[slotIndex];
                  const ing = ingId ? INGREDIENTS[ingId] : null;

                  return (
                    <div
                      key={slotIndex}
                      className={`aspect-square flex flex-col items-center justify-center rounded border-2 relative transition-all ${
                        ing
                          ? 'mc-slot bg-[#64748b] border-[#373737]'
                          : 'border-dashed border-[#888888] bg-[#bebebe]/50'
                      }`}
                    >
                      {ing ? (
                        <>
                          <span className="text-2xl" style={{ imageRendering: 'pixelated' }}>
                            {INGREDIENT_ICONS[ing.id]}
                          </span>
                          <button
                            onClick={() => handleRemoveIngredient(ing.id)}
                            title="Remove from pot"
                            className="absolute -top-1 -right-1 bg-red-600 hover:bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-black shadow"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <span className="text-[9px] font-bold text-[#888888]">Empty</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Ingredients List in Cauldron */}
              <div className="mc-slot p-2.5 max-h-[140px] overflow-y-auto custom-scrollbar flex flex-col gap-1.5 mb-3 shadow-inner">
                {Object.keys(labIngredients).length === 0 ? (
                  <div className="text-center py-6 text-[10px] font-bold text-[#dddddd] uppercase">
                    No ingredients added yet.<br />Click ingredients on the left!
                  </div>
                ) : (
                  Object.entries(labIngredients).map(([id, qty]) => {
                    const ing = INGREDIENTS[id];
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between bg-white text-[#2b2b2b] px-2 py-1 border border-[#373737] shadow-sm rounded-sm"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-base" style={{ imageRendering: 'pixelated' }}>
                            {INGREDIENT_ICONS[id]}
                          </span>
                          <span className="text-[10px] font-black uppercase truncate max-w-[110px]">
                            {ing?.name || id}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-[#555555]">
                            x{qty} (${((ing?.cost || 0) * qty).toFixed(2)})
                          </span>
                          <button
                            onClick={() => handleRemoveIngredient(id)}
                            className="w-4 h-4 bg-red-500 hover:bg-red-400 text-white rounded flex items-center justify-center text-[10px] font-black"
                            title="Remove one"
                          >
                            -
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Pot Controls & Financial Estimate */}
              {totalIngredientsInPot > 0 && (
                <div className="flex justify-between items-center mb-3 text-[10px] font-black">
                  <button
                    onClick={handleClearPot}
                    className="text-[#b91c1c] hover:underline flex items-center gap-1 uppercase"
                  >
                    <Trash2 size={12} /> Clear Pot
                  </button>
                  <div className="text-[#2b2b2b]">
                    Estimated COGS: <span className="text-[#388e3c] font-black">${rawCost.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Big Action Research Button */}
            <div className="flex flex-col gap-2 pt-2 border-t-2 border-[#8b8b8b]">
              <button
                onClick={handleStartResearch}
                disabled={!canResearch}
                className={`w-full py-3 font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-md ${
                  totalIngredientsInPot < 2
                    ? 'mc-slot text-[#cccccc] cursor-not-allowed'
                    : money < RESEARCH_FEE
                    ? 'mc-button-red'
                    : 'mc-button-green'
                }`}
              >
                <Sparkles size={16} />
                {totalIngredientsInPot < 2
                  ? `Need ${2 - totalIngredientsInPot} More Ingredient(s)`
                  : money < RESEARCH_FEE
                  ? `Need $${(RESEARCH_FEE - money).toLocaleString()} More Funds`
                  : `Commence Research ($${RESEARCH_FEE.toLocaleString()})`}
              </button>
              <p className="text-[8px] text-center text-[#555555] uppercase font-bold">
                Formula outcome yields 3 tailored commercial recipe archetypes
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Discovery Phase (3 Archetype Options) */
        <div className="flex flex-col items-center justify-center flex-1 py-4">
          <div className="text-center mb-6">
            <span className="inline-block px-3 py-1 bg-yellow-400 border-2 border-yellow-700 text-yellow-950 text-[10px] font-black uppercase tracking-widest shadow mb-2 animate-bounce">
              ✨ Innovation Breakthrough ✨
            </span>
            <h4 className="text-2xl font-black text-[#2b2b2b] uppercase tracking-wider">
              3 Commercial Prototypes Discovered!
            </h4>
            <p className="text-xs font-bold text-[#555555] uppercase mt-1">
              Compare margin and prep speed. Save one to your research collection, then activate it under Menu & prices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl px-2">
            {labOptions.map((opt, i) => {
              const archetype = i === 0 
                ? { badge: "👑 House Classic", desc: "Balanced crowd-pleaser with steady margins", border: "border-blue-600", tagBg: "bg-blue-100 text-blue-800" }
                : i === 1 
                ? { badge: "💎 Gourmet Luxury", desc: "High ticket price with maximized gross profit", border: "border-amber-600", tagBg: "bg-amber-100 text-amber-900" }
                : { badge: "⚡ Speedster Express", desc: "Rapid kitchen prep for high-volume rush hours", border: "border-emerald-600", tagBg: "bg-emerald-100 text-emerald-900" };

              const estGrossMargin = Math.round(((opt.price - rawCost) / opt.price) * 100);

              return (
                <div
                  key={opt.id}
                  className={`mc-inner-panel p-4 flex flex-col justify-between items-center text-center bg-[#f8fafc] border-4 ${archetype.border} shadow-lg transition-transform hover:-translate-y-1`}
                >
                  <div className="w-full flex flex-col items-center">
                    <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full mb-3 border border-stone-800 ${archetype.tagBg}`}>
                      {archetype.badge}
                    </span>

                    <div
                      className="w-16 h-16 mc-slot flex items-center justify-center text-4xl bg-white rounded-full border-4 border-[#373737] mb-2 shadow"
                      style={{ imageRendering: 'pixelated' }}
                    >
                      {INGREDIENT_ICONS[Object.keys(opt.ingredients)[0]] || "🍽️"}
                    </div>

                    <h5 className="font-black text-[#2b2b2b] uppercase text-sm h-12 flex items-center justify-center leading-tight px-1">
                      {opt.name}
                    </h5>

                    <p className="text-[9px] font-bold text-[#64748b] uppercase mb-3 px-2">
                      {archetype.desc}
                    </p>

                    {/* Stats Grid */}
                    <div className="w-full grid grid-cols-2 gap-1.5 bg-[#e2e8f0] p-2 border-2 border-[#94a3b8] rounded text-left mb-3">
                      <div>
                        <span className="text-[8px] font-bold text-[#64748b] uppercase block">Prep Time</span>
                        <span className="text-xs font-black text-[#2b2b2b] flex items-center gap-1">
                          <Clock size={12} /> {opt.cookingTime}s
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-[#64748b] uppercase block">Menu Price</span>
                        <span className="text-sm font-black text-[#388e3c]">
                          ${opt.price}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-[#64748b] uppercase block">Unit COGS</span>
                        <span className="text-xs font-black text-[#ef4444]">
                          ${rawCost.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-[#64748b] uppercase block">Gross Margin</span>
                        <span className="text-xs font-black text-[#1565c0]">
                          {estGrossMargin}%
                        </span>
                      </div>
                    </div>

                    {/* Ingredients summary */}
                    <div className="flex flex-wrap justify-center gap-1 mb-4">
                      {Object.entries(opt.ingredients).map(([ingId, qty]) => (
                        <span
                          key={ingId}
                          className="mc-slot px-1.5 py-0.5 text-[8px] font-bold flex items-center gap-1 text-white bg-[#475569]"
                        >
                          <span>{INGREDIENT_ICONS[ingId]}</span>
                          <span>{qty}x</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectRecipe(opt)}
                    className="w-full py-2.5 mc-button-green font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow"
                  >
                    <Check size={14} /> Save research recipe
                  </button>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setLabPhase('select')}
            className="mt-6 text-xs font-black text-[#b91c1c] uppercase tracking-widest hover:underline flex items-center gap-1"
          >
            ← Abandon Prototypes & Formulate Another Mix
          </button>
        </div>
      )}
    </div>
  );
};
