import {normalizeTableLayout} from '../restaurantLayout';
import type {GameState} from '../hooks/useGameLoop';
import {INGREDIENTS} from '../data/recipes';
import {INITIAL_INVENTORY_VALUE,STARTING_INVENTORY} from '../gameplay';
export type RestaurantIdentity='diner'|'cafe'|'bistro'|'italian'|'fastfood';
export const RESTAURANT_IDENTITIES={
  fastfood:{name:'Quick Bite',tagline:'Burgers · crispy chicken · wraps',wall:'#eee5d5',frame:'#a44232',menu:['coffee_black','fries','juice_fruit']},
  italian:{name:'Trattoria Locale',tagline:'Pizza · pasta · homemade favorites',wall:'#e6d6c0',frame:'#51634c',menu:['coffee_black','fries','juice_fruit']},
  diner:{name:'Your first diner',tagline:'Classic comfort food',wall:'#ece4d7',frame:'#913f38',menu:['coffee_black','fries','juice_fruit']},
  cafe:{name:'Corner café',tagline:'Espresso · bakery · light lunches',wall:'#eee4d6',frame:'#486c57',menu:['coffee_black','recipe_65','juice_fruit']},
  bistro:{name:'Garden bistro',tagline:'Seasonal plates · garden dining',wall:'#e1d3bd',frame:'#556747',menu:['recipe_11','recipe_91','recipe_92']},
};
/** Migrate untouched opening packages once; never replace an established menu or pantry. */
export function configureRestaurantIdentity(r:GameState,id:string):GameState {
  r=normalizeTableLayout(r);
  if(r.identityVersion===2)return r;
  const identity=(id in RESTAURANT_IDENTITIES?id:'diner') as RestaurantIdentity,theme=RESTAURANT_IDENTITIES[identity];
  const untouched=id!=='diner'&&r.stats.customersServed===0&&r.stats.inventoryCosts===0&&r.time===0&&r.activeMenu.join()===RESTAURANT_IDENTITIES.diner.menu.join()&&Object.keys(r.inventory).length===Object.keys(STARTING_INVENTORY).length&&Object.entries(STARTING_INVENTORY).every(([key,qty])=>r.inventory[key]===qty);

  let next={...r,identityVersion:2,restaurantIdentity:identity,wallColor:r.wallColor??theme.wall,frameColor:r.frameColor??theme.frame};
  if(untouched){
    const ingredients=[...new Set(r.recipes.filter(recipe=>theme.menu.includes(recipe.id)).flatMap(recipe=>Object.keys(recipe.ingredients)))];
    const quantity=Math.floor(INITIAL_INVENTORY_VALUE/ingredients.reduce((n,key)=>n+INGREDIENTS[key].cost,0));
    const inventory:Record<string,number>=Object.fromEntries(ingredients.map(key=>[key,quantity]));
    const spent=ingredients.reduce((n,key)=>n+inventory[key]*INGREDIENTS[key].cost,0);
    inventory.water=(inventory.water??0)+Math.round((INITIAL_INVENTORY_VALUE-spent)/INGREDIENTS.water.cost);
    next={...next,activeMenu:[...theme.menu],recipes:r.recipes.map(recipe=>theme.menu.includes(recipe.id)?{...recipe,unlocked:true}:recipe),inventory,inventoryBatches:Object.fromEntries(Object.entries(inventory).map(([key,qty])=>[key,[{qty,costPerUnit:INGREDIENTS[key].cost}]]))};
  }
  return next;
}
