import React, { useState } from 'react';
import { TrendingUp, Award, BarChart3, DollarSign, PackageCheck } from 'lucide-react';
import { Recipe } from '../data/recipes';
import { INGREDIENT_ICONS } from '../data/categories';

interface AnalysisModalProps {
  itemsSold: Record<string, number>;
  itemRevenues: Record<string, number>;
  recipes: Recipe[];
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({
  itemsSold = {},
  itemRevenues = {},
  recipes,
}) => {
  const [sortBy, setSortBy] = useState<'revenue' | 'volume'>('revenue');

  const recipeMap = new Map(recipes.map(r => [r.id, r]));

  // Find max revenue & volume for relative bar scaling
  const allEntries = Object.entries(itemsSold).map(([id, volume]) => ({
    id,
    volume,
    revenue: itemRevenues[id] || 0,
    recipe: recipeMap.get(id)
  })).filter(e => e.recipe !== undefined);

  const maxRevenue = Math.max(1, ...allEntries.map(e => e.revenue));
  const maxVolume = Math.max(1, ...allEntries.map(e => e.volume));
  const totalDishesSold = allEntries.reduce((sum, e) => sum + e.volume, 0);
  const totalDishesRevenue = allEntries.reduce((sum, e) => sum + e.revenue, 0);

  const sortedList = [...allEntries].sort((a, b) => {
    if (sortBy === 'revenue') return b.revenue - a.revenue;
    return b.volume - a.volume;
  });

  return (
    <div className="flex flex-col h-full font-mono">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-[#8b8b8b] pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 mc-slot flex items-center justify-center bg-[#475569]">
            <TrendingUp size={20} className="text-yellow-300" />
          </div>
          <div>
            <h3 className="font-black text-[#2b2b2b] text-base md:text-lg uppercase tracking-wider">
              Product Mix & Menu Velocity
            </h3>
            <p className="text-[10px] font-bold text-[#555555] uppercase">
              Identify your high-margin stars, cash-cow staples, and menu contributors
            </p>
          </div>
        </div>

        {/* Sort Controls & Totals */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => setSortBy('revenue')}
              className={`px-3 py-1 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                sortBy === 'revenue' ? 'mc-button-selected' : 'mc-button'
              }`}
            >
              <DollarSign size={13} />
              <span>By Revenue</span>
            </button>
            <button
              onClick={() => setSortBy('volume')}
              className={`px-3 py-1 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                sortBy === 'volume' ? 'mc-button-selected' : 'mc-button'
              }`}
            >
              <PackageCheck size={13} />
              <span>By Units</span>
            </button>
          </div>

          <div className="mc-slot px-3 py-1 text-xs font-black hidden sm:flex items-center gap-1">
            <span className="text-[#555555] text-[9px] uppercase">Sold:</span>
            <span className="text-[#1565c0]">{totalDishesSold} meals</span>
          </div>
        </div>
      </div>

      {sortedList.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-[#555555] text-center font-black uppercase tracking-widest mc-slot p-12">
          <TrendingUp size={48} className="mb-4 opacity-40 text-stone-700" />
          <span className="text-base text-stone-800">No sales recorded yet.</span>
          <span className="text-xs text-stone-600 mt-1">Open your restaurant to begin serving orders!</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 max-h-[460px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
            {sortedList.map((entry, index) => {
              const recipe = entry.recipe!;
              const mainIng = Object.keys(recipe.ingredients)[0];
              const revenueShare = totalDishesRevenue > 0 ? Math.round((entry.revenue / totalDishesRevenue) * 100) : 0;
              const barPercent = sortBy === 'revenue' 
                ? (entry.revenue / maxRevenue) * 100 
                : (entry.volume / maxVolume) * 100;

              const medal = index === 0
                ? { label: "🥇 #1 Best Seller", bg: "bg-amber-400 border-amber-700 text-amber-950" }
                : index === 1
                ? { label: "🥈 #2 Runner Up", bg: "bg-slate-300 border-slate-600 text-slate-900" }
                : index === 2
                ? { label: "🥉 #3 Favorite", bg: "bg-amber-600 border-amber-900 text-amber-100" }
                : { label: `#${index + 1}`, bg: "bg-[#e2e8f0] border-[#94a3b8] text-[#334155]" };

              return (
                <div
                  key={entry.id}
                  className="mc-inner-panel p-3.5 flex flex-col justify-between bg-[#f8fafc] border-2 border-[#373737] shadow-sm relative overflow-hidden"
                >
                  <div>
                    {/* Top Row */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-12 h-12 shrink-0 mc-slot flex items-center justify-center text-2xl bg-white border-2 border-[#373737] shadow"
                          style={{ imageRendering: 'pixelated' }}
                        >
                          {INGREDIENT_ICONS[mainIng] || "🍽️"}
                        </div>

                        <div className="truncate">
                          <h4 className="font-black text-xs sm:text-sm text-[#2b2b2b] uppercase tracking-wider truncate">
                            {recipe.name}
                          </h4>
                          <span className="text-[9px] font-bold text-[#64748b] uppercase">
                            Menu Retail: ${recipe.price}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border shadow-sm ${medal.bg}`}>
                        {medal.label}
                      </span>
                    </div>

                    {/* Stats Metric Boxes */}
                    <div className="grid grid-cols-3 gap-1.5 bg-[#e2e8f0] p-2 rounded border border-[#cbd5e1] text-center mb-2">
                      <div>
                        <span className="text-[8px] font-bold text-[#64748b] uppercase block">Units Sold</span>
                        <span className="text-sm font-black text-[#1565c0]">{entry.volume}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-[#64748b] uppercase block">Gross Sales</span>
                        <span className="text-sm font-black text-[#2e7d32]">${entry.revenue.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-bold text-[#64748b] uppercase block">Share of Sales</span>
                        <span className="text-sm font-black text-[#d97706]">{revenueShare}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Relative Velocity Bar */}
                  <div>
                    <div className="flex justify-between text-[8px] font-black uppercase text-[#64748b] mb-1">
                      <span>Relative Sales Velocity</span>
                      <span>{Math.round(barPercent)}% of Peak</span>
                    </div>
                    <div className="w-full bg-[#cbd5e1] h-2.5 rounded overflow-hidden shadow-inner">
                      <div
                        className={`h-full transition-all duration-300 ${
                          index === 0 ? 'bg-[#2e7d32]' : index < 3 ? 'bg-[#1565c0]' : 'bg-[#64748b]'
                        }`}
                        style={{ width: `${barPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
