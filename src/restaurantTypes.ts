import type {GameState} from './hooks/useGameLoop';
import {INGREDIENTS} from './data/recipes';
import {restaurantCatalog,RestaurantType,RESTAURANT_TYPES} from './data/restaurantCatalogs';
import {INITIAL_INVENTORY_VALUE,STARTING_INVENTORY} from './gameplay';
import {RESTAURANT_LEVELS,restaurantLevel} from './restaurantProgression';
import {RESTAURANT_IDENTITIES} from './empire/restaurantIdentity';
import {typePreparationTime} from './restaurantPersonality';

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
  return {...state,restaurantType:type,restaurantIdentity:type,identityVersion:2,wallColor:theme.wall,frameColor:theme.frame,restaurantLevel:restaurantLevel(state),recipes:[...recipes,...legacy],legacyRecipeIds:legacy.map(r=>r.id),activeMenu:profile.starterIds,inventory,inventoryBatches};
}
export function restaurantPantryIds(state:GameState){
  if(!state.restaurantType)return undefined;
  const legacy=new Set(state.legacyRecipeIds??[]);
  return [...new Set([...restaurantCatalog(state.restaurantType).ingredientIds,...state.recipes.filter(r=>r.id.startsWith('custom_')||legacy.has(r.id)&&state.activeMenu.includes(r.id)).flatMap(r=>Object.keys(r.ingredients)),...Object.keys(state.inventory).filter(id=>state.inventory[id]>0)])];
}
