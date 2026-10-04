import type {GameState} from './hooks/useGameLoop';
import {visibleRestaurantRecipes} from './restaurantMenu';

export type StockTarget={target:number;reorderAt:number};
/** Sales belong to this restaurant. Old saves fall back to their own lifetime sales. */
export function restaurantStockPlan(state:GameState){
  const coverageDays=Math.max(2,Math.min(5,state.manager.target/10));
  const elapsed=Math.max(1/7,Math.min(1,state.time/100));
  const ingredients:Record<string,StockTarget>={};
  const dishes=visibleRestaurantRecipes(state).filter(r=>r.unlocked&&state.activeMenu.includes(r.id)).map(recipe=>{
    const sold=state.weekStats.itemsSold[recipe.id]??0;
    const lifetime=state.stats.itemsSold[recipe.id]??0;
    const previous=state.lastWeekItemSales?.[recipe.id];
    const history=previous??Math.max(0,lifetime-sold)/Math.max(1,state.week-1);
    const isNew=previous===undefined&&lifetime===0&&sold===0;
    const currentWeight=state.phase==='planning'?0:Math.min(.85,elapsed);
    const weeklyDemand=history*(1-currentWeight)+(sold/elapsed)*currentWeight;
    const portions=isNew?2:Math.max(1,Math.ceil(weeklyDemand*coverageDays/7));
    const pace=isNew?'New · trial':weeklyDemand<7?'Slow seller':weeklyDemand<21?'Steady':'Popular';
    for(const [id,qty] of Object.entries(recipe.ingredients)){
      const target=ingredients[id]??{target:0,reorderAt:0};
      target.target+=qty*portions;
      // Keep enough for one serving of every dish that shares this ingredient.
      target.reorderAt+=qty*Math.max(1,Math.ceil(portions/2));
      ingredients[id]=target;
    }
    return {id:recipe.id,name:recipe.name,sold,weeklyDemand,portions,pace};
  });
  return {coverageDays,dishes,ingredients};
}
