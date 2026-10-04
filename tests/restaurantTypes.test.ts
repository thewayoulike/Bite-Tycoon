import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,GameState} from '../src/hooks/useGameLoop';
import {chooseRestaurantType,restaurantPantryIds} from '../src/restaurantTypes';
import {restaurantCatalog,RESTAURANT_TYPES} from '../src/data/restaurantCatalogs';
import {INITIAL_INVENTORY_VALUE,UPGRADE_COSTS,applyManagerPurchases,toggleMenuRecipe} from '../src/gameplay';
import {createEmpire,applyDistrictUpdate,parseEmpireSave} from '../src/empire/empire';
import {acquire} from '../src/prototype/expansionModel';
import {RESTAURANT_LEVELS,restaurantMenuLimit,restaurantUnlockBlocker,upgradeRestaurant,restaurantLevel} from '../src/restaurantProgression';
import {buyDiningTable,tablePurchaseBlocker} from '../src/tablePurchases';
import {TABLE_POSITIONS,storedPos,layoutProblem,nextTablePosition} from '../src/restaurantLayout';
import {restaurantRush,serviceProfile,typePreparationTime} from '../src/restaurantPersonality';
import {getFoodKind} from '../src/graphics/foodModels';
const starter=()=>structuredClone(INITIAL_STATE);

test('each restaurant type starts with its own six recipes and equal-value ingredient package',()=>{
 for(const choice of RESTAURANT_TYPES){const r=chooseRestaurantType(starter(),choice.id);
  assert.equal(r.restaurantType,choice.id);assert.equal(r.recipes.length,30);assert.equal(r.activeMenu.length,6);assert.equal(r.recipes.filter(x=>x.unlocked).length,6);
  assert.equal(r.money,INITIAL_STATE.money);assert.equal(r.restaurantLevel,1);
  const value=Object.values(r.inventoryBatches).flat().reduce((sum,b)=>sum+b.qty*b.costPerUnit,0);assert.ok(Math.abs(value-INITIAL_INVENTORY_VALUE)<.001);
  for(const recipe of r.recipes.filter(x=>x.unlocked))for(const [id,qty] of Object.entries(recipe.ingredients))assert.ok(r.inventory[id]>=qty);
  assert.ok(r.recipes.every(recipe=>restaurantCatalog(choice.id).recipes.some(x=>x.id===recipe.id)));
 }
 assert.ok(!restaurantPantryIds(chooseRestaurantType(starter(),'cafe'))!.includes('beef'));
 assert.ok(!restaurantPantryIds(chooseRestaurantType(starter(),'fastfood'))!.includes('pasta'));
 assert.equal(getFoodKind(restaurantCatalog('fastfood').recipes[0].id),'burger');
});
test('buying and renting use the selected type, keep accounts separate, and save it across reloads',()=>{
 for(const tenure of ['owned','leased'] as const){const e=createEmpire({...starter(),money:30000}),next=applyDistrictUpdate(e,s=>acquire(s,'cafe',tenure,'diner','fastfood'),INITIAL_STATE);
  assert.equal(next.restaurants.cafe.restaurantType,'fastfood');assert.equal(next.restaurants.cafe.money,300);assert.equal(next.restaurants.cafe.staff.waiters,1);
  assert.ok(next.restaurants.cafe.recipes.every(r=>r.id.startsWith('cuisine_fastfood_')));
  assert.equal(next.restaurants.diner.restaurantType,undefined);assert.equal(parseEmpireSave(JSON.stringify(next))!.restaurants.cafe.restaurantType,'fastfood');
 }
});
test('existing businesses keep stock, recipes, prices, finances and table capacity when choosing a specialty',()=>{
 const r=starter();r.week=4;r.money=12345;r.inventory.water=17;r.recipes[0]={...r.recipes[0],price:999};r.tables=TABLE_POSITIONS.slice(0,11).map((p,i)=>({...p,id:String(i),customerId:null,isDirty:false}));
 const next=chooseRestaurantType(r,'italian');assert.equal(next.money,r.money);assert.deepEqual(next.inventory,r.inventory);assert.deepEqual(next.inventoryBatches,r.inventoryBatches);assert.deepEqual(next.stats,r.stats);
 assert.equal(next.recipes.find(x=>x.id===r.recipes[0].id)!.price,999);assert.ok(next.legacyRecipeIds!.includes(r.recipes[0].id));assert.equal(restaurantLevel(next),6);
 assert.equal(chooseRestaurantType(next,'cafe'),next);assert.equal(chooseRestaurantType({...r,phase:'service'},'cafe').restaurantType,undefined);
});
test('levels need 50% higher service targets, quality and profitable weeks; repeat clicks do not buy locked levels',()=>{
 assert.deepEqual(RESTAURANT_LEVELS.map(l=>l.guests),[0,60,180,450,975,1800]);
 let r={...chooseRestaurantType(starter(),'diner'),money:50000};r.stats={...r.stats,customersServed:59};assert.equal(upgradeRestaurant(r),r);
 r={...r,stats:{...r.stats,customersServed:60}};let next=upgradeRestaurant(r);assert.equal(next.restaurantLevel,2);assert.equal(next.money,r.money-750);assert.equal(restaurantMenuLimit(next),10);assert.equal(upgradeRestaurant(next),next);
 next={...next,stats:{...next.stats,customersServed:180}};assert.match(restaurantUnlockBlocker(next)!,/80%/);
 next=upgradeRestaurant({...next,performance:{bestServiceRate:80,profitableStreak:1,lastWeek:2}});assert.equal(next.restaurantLevel,3);
 next={...next,stats:{...next.stats,customersServed:450}};assert.match(restaurantUnlockBlocker(next)!,/two consecutive/);
 next=upgradeRestaurant({...next,performance:{bestServiceRate:80,profitableStreak:2,lastWeek:3}});assert.equal(next.restaurantLevel,4);
 const twentyFour={...next,restaurantLevel:6,recipes:next.recipes.map(x=>({...x,unlocked:true}))};let full:GameState=twentyFour;for(const recipe of full.recipes)if(!full.activeMenu.includes(recipe.id))full=toggleMenuRecipe(full,recipe.id);assert.equal(full.activeMenu.length,30);
});
test('the 12th table has a safe purchase path even when a custom layout uses its space',()=>{
 const tables=TABLE_POSITIONS.slice(0,11).map((p,i)=>({...p,id:`table-${i}`,customerId:null,isDirty:false}));tables[3].y=storedPos(10);
 assert.equal(layoutProblem(tables),null);assert.equal(nextTablePosition(tables),null);
 const r={...chooseRestaurantType(starter(),'diner'),tables,restaurantLevel:6,money:50000};assert.match(tablePurchaseBlocker(r)!,/Auto-arrange/);assert.equal(buyDiningTable(r),r);
 const next=buyDiningTable(r,true);assert.equal(next.tables.length,12);assert.equal(new Set(next.tables.map(t=>t.id)).size,12);assert.equal(layoutProblem(next.tables),null);assert.equal(next.money,r.money-UPGRADE_COSTS.table(11));assert.equal(buyDiningTable(next,true),next);
 assert.equal(buyDiningTable({...r,phase:'service'},true).tables.length,11);
});
test('automatic managers buy only their own active menu and restaurant types have different service patterns',()=>{
 const cafe={...chooseRestaurantType(starter(),'cafe'),inventory:{},inventoryBatches:{},phase:'service' as const,money:5000,staff:{...INITIAL_STATE.staff,hasManager:true},manager:{...INITIAL_STATE.manager,budget:1000}};
 const stocked=applyManagerPurchases(cafe);assert.ok(Object.keys(stocked.inventory).length>0);assert.ok(!('beef' in stocked.inventory));assert.ok(stocked.money<cafe.money);
 assert.ok(serviceProfile({restaurantType:'fastfood'}).eating>serviceProfile({restaurantType:'bistro'}).eating);assert.ok(typePreparationTime('cafe',0)<typePreparationTime('bistro',0));
 let different=false;for(let time=0;time<100;time++)if(restaurantRush({...cafe,time})!==restaurantRush({...cafe,time,restaurantType:'bistro'}))different=true;assert.equal(different,true);
});
