import type {GameState} from './hooks/useGameLoop';
import {INGREDIENTS} from './data/recipes';
import {restaurantCatalog,RestaurantType,RESTAURANT_TYPES} from './data/restaurantCatalogs';
import {INITIAL_INVENTORY_VALUE,STARTING_INVENTORY} from './gameplay';
import {RESTAURANT_LEVELS,restaurantLevel} from './restaurantProgression';
import {RESTAURANT_IDENTITIES} from './empire/restaurantIdentity';
import {typePreparationTime} from './restaurantPersonality';
import {isResearchRecipe,isTypeRecipe,RESEARCH_MENU_LIMIT} from './restaurantMenu';

export const validRestaurantType=(value:unknown):value is RestaurantType=>RESTAURANT_TYPES.some(t=>t.id===value);
export const defaultRestaurantType=(id:string):RestaurantType=>id==='cafe'?'cafe':id==='bistro'?'bistro':'diner';
export function isOpeningRestaurant(state:GameState){
  return !state.restaurantType&&state.week===1&&state.time===0&&state.stats.customersServed===0&&state.stats.customersLost===0&&state.stats.inventoryCosts===0&&state.stats.recipeCosts===0&&Object.keys(state.inventory).length===Object.keys(STARTING_INVENTORY).length&&Object.entries(STARTING_INVENTORY).every(([id,qty])=>state.inventory[id]===qty);
}
/** Choose once per business. Existing recipes, stock, money and history remain recoverable. */
export function chooseRestaurantType(state:GameState,type:RestaurantType,opening=isOpeningRestaurant(state)):GameState{
  if(!validRestaurantType(type)||state.restaurantType||state.phase!=='planning')return state;
  const profile=restaurantCatalog(type),ordered=[...profile.starterIds,...profile.recipes.map(r=>r.id).filter(id=>!profile.starterIds.includes(id))];
  const recipes=profile.recipes.map((r,i)=>({...r,cookingTime:typePreparationTime(type,i),unlocked:!!state.testingUnlocked||profile.starterIds.includes(r.id),requiredLevel:RESTAURANT_LEVELS.find(l=>ordered.indexOf(r.id)<l.slots)!.level}));
  const legacy=opening?[]:state.recipes.filter(r=>!recipes.some(item=>item.id===r.id));
  let inventory=state.inventory,inventoryBatches=state.inventoryBatches;
  if(opening){
    const amounts:Record<string,number>={};
    for(const r of recipes.filter(r=>profile.starterIds.includes(r.id)))for(const [id,qty] of Object.entries(r.ingredients))amounts[id]=(amounts[id]??0)+qty;
    const basket=Object.entries(amounts).reduce((sum,[id,qty])=>sum+qty*INGREDIENTS[id].cost,0);
    const portions=Math.floor(INITIAL_INVENTORY_VALUE/basket);
    inventory=Object.fromEntries(Object.entries(amounts).map(([id,qty])=>[id,qty*portions]));
    inventory.water=(inventory.water??0)+Math.round((INITIAL_INVENTORY_VALUE-basket*portions)/INGREDIENTS.water.cost);
    inventoryBatches=Object.fromEntries(Object.entries(inventory).map(([id,qty])=>[id,[{qty,costPerUnit:INGREDIENTS[id].cost}]]));
  }
  const theme=RESTAURANT_IDENTITIES[type];
  return {...state,restaurantType:type,restaurantIdentity:type,identityVersion:2,wallColor:theme.wall,frameColor:theme.frame,restaurantLevel:restaurantLevel(state),recipes:[...recipes,...legacy],legacyRecipeIds:legacy.filter(r=>!isResearchRecipe(r.id)).map(r=>r.id),activeMenu:[...profile.starterIds,...state.activeMenu.filter(id=>isResearchRecipe(id)&&legacy.some(r=>r.id===id&&r.unlocked)).slice(0,RESEARCH_MENU_LIMIT)],inventory,inventoryBatches};
}
/** Extend existing catalogs without changing prices, stock, books or orders already in progress. */
export function normalizeRestaurantCatalog(state:GameState):GameState {
 if(!state.restaurantType)return state;
 const profile=restaurantCatalog(state.restaurantType),ordered=[...profile.starterIds,...profile.recipes.map(r=>r.id).filter(id=>!profile.starterIds.includes(id))];
 const recipes=profile.recipes.map((r,i)=>({...r,cookingTime:typePreparationTime(state.restaurantType!,i),unlocked:!!state.testingUnlocked||profile.starterIds.includes(r.id),...state.recipes.find(old=>old.id===r.id),requiredLevel:RESTAURANT_LEVELS.find(l=>ordered.indexOf(r.id)<l.slots)!.level}));
 const retained=state.recipes.filter(r=>!isTypeRecipe(r.id,state.restaurantType!));
 const allowed=new Set([...recipes,...retained.filter(r=>isResearchRecipe(r.id))].filter(r=>r.unlocked).map(r=>r.id));
 const active=[...new Set(state.activeMenu)].filter(id=>allowed.has(id));
 const native=active.filter(id=>!isResearchRecipe(id)).slice(0,30),research=active.filter(isResearchRecipe).slice(0,RESEARCH_MENU_LIMIT);
 return {...state,recipes:[...recipes,...retained],legacyRecipeIds:retained.filter(r=>!isResearchRecipe(r.id)).map(r=>r.id),activeMenu:native.length||research.length?[...native,...research]:profile.starterIds};
}
export function restaurantPantryIds(state:GameState){
  if(!state.restaurantType)return undefined;
  return [...new Set([...restaurantCatalog(state.restaurantType).ingredientIds,...state.recipes.filter(r=>isResearchRecipe(r.id)).flatMap(r=>Object.keys(r.ingredients)),...Object.keys(state.inventory).filter(id=>state.inventory[id]>0)])];
}
