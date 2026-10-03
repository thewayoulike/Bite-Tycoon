import type {GameState} from './hooks/useGameLoop';
import type {Recipe} from './data/recipes';
import {RestaurantType,RESTAURANT_RECIPE_COUNT} from './data/restaurantCatalogs';

export const RESEARCH_MENU_LIMIT=10;
export const isResearchRecipe=(id:string)=>id.startsWith('custom_');
export type MenuState=Pick<GameState,'recipes'|'activeMenu'|'restaurantType'>;
export function isTypeRecipe(id:string,type:RestaurantType){
 const prefix=`cuisine_${type}_`,index=Number(id.slice(prefix.length));
 return id.startsWith(prefix)&&Number.isInteger(index)&&index>=1&&index<=RESTAURANT_RECIPE_COUNT;
}
export const visibleRestaurantRecipes=(state:Pick<GameState,'recipes'|'restaurantType'>):Recipe[]=>state.restaurantType?state.recipes.filter(r=>isTypeRecipe(r.id,state.restaurantType!)||isResearchRecipe(r.id)):state.recipes;
export function menuUsage(state:MenuState){
 const active=visibleRestaurantRecipes(state).filter(r=>r.unlocked&&state.activeMenu.includes(r.id));
 return {type:active.filter(r=>!isResearchRecipe(r.id)).length,research:active.filter(r=>isResearchRecipe(r.id)).length,total:active.length};
}
export function menuRecipeBlocker(state:MenuState,id:string,typeLimit:number):string|null {
 const recipe=visibleRestaurantRecipes(state).find(r=>r.id===id&&r.unlocked);
 if(!recipe)return 'This recipe is not available for this restaurant type.';
 const usage=menuUsage(state);
 if(state.activeMenu.includes(id))return usage.total<=1?'Keep at least one dish on the menu.':null;
 if(!state.restaurantType)return state.activeMenu.length>=typeLimit?'Your menu is full. Remove a dish first.':null;
 if(isResearchRecipe(id))return usage.research>=RESEARCH_MENU_LIMIT?'All 10 research slots are full. Remove a research dish from the menu to add another.':null;
 return usage.type>=typeLimit?'Your restaurant-type menu is full. Remove a type dish or reach the next level.':null;
}
