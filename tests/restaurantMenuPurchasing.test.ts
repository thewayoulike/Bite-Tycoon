import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,GameState} from '../src/hooks/useGameLoop';
import {chooseRestaurantType,normalizeRestaurantCatalog} from '../src/restaurantTypes';
import {RESTAURANT_TYPES,restaurantCatalog} from '../src/data/restaurantCatalogs';
import {INGREDIENTS,Recipe} from '../src/data/recipes';
import {menuUsage,visibleRestaurantRecipes} from '../src/restaurantMenu';
import {restaurantStockPlan} from '../src/restaurantPurchasing';
import {toggleMenuRecipe,purchasingPlan,applyManagerPurchases,finishShift} from '../src/gameplay';
const fresh=()=>chooseRestaurantType({...structuredClone(INITIAL_STATE),money:50000},'diner');
const lab=(i:number):Recipe=>({id:`custom_test_${i}`,name:`Lab ${i}`,price:30,basePrice:30,ingredients:{rice:1,fish:1},cookingTime:1,unlockCost:0,unlocked:true});
test('every type has 30 distinct valid recipes',()=>{
 const all=RESTAURANT_TYPES.flatMap(t=>{const r=restaurantCatalog(t.id).recipes;assert.equal(r.length,30);return r});
 assert.equal(new Set(all.map(r=>r.id)).size,RESTAURANT_TYPES.length*30);assert.equal(new Set(all.map(r=>r.name)).size,RESTAURANT_TYPES.length*30);
 for(const r of all)for(const [id,qty] of Object.entries(r.ingredients)){assert.ok(INGREDIENTS[id],`${r.name}: ${id}`);assert.ok(qty>0)}
});
test('30 native plus 10 research dishes; replacing research preserves learning and independent slots',()=>{
 let s:GameState={...fresh(),restaurantLevel:6};s.recipes=[...s.recipes.map(r=>({...r,unlocked:true})),...Array.from({length:12},(_,i)=>lab(i))];
 for(const r of s.recipes)if(!s.activeMenu.includes(r.id))s=toggleMenuRecipe(s,r.id);
 assert.deepEqual(menuUsage(s),{type:30,research:10,total:40});assert.equal(toggleMenuRecipe(s,'custom_test_10'),s);
 s=toggleMenuRecipe(s,s.recipes[0].id);assert.equal(toggleMenuRecipe(s,'custom_test_10'),s,'native removal does not free a lab slot');
 const cash=s.money;s=toggleMenuRecipe(s,'custom_test_0');s=toggleMenuRecipe(s,'custom_test_10');
 assert.equal(menuUsage(s).research,10);assert.equal(s.recipes.filter(r=>r.id.startsWith('custom_')).length,12);assert.equal(s.money,cash);
 assert.ok(s.recipes.find(r=>r.id==='custom_test_0')?.unlocked);
});
test('old catalogs migrate without losing cash, FIFO, prices, history or in-flight recipe lookup',()=>{
 const s=fresh();s.recipes=s.recipes.slice(0,24);s.recipes[0].price=75;
 s.recipes.push(...structuredClone(INITIAL_STATE.recipes),...Array.from({length:12},(_,i)=>lab(i)));
 s.activeMenu=[s.recipes[0].id,'coffee_black',...Array.from({length:12},(_,i)=>lab(i).id)];
 const n=normalizeRestaurantCatalog(s);assert.equal(visibleRestaurantRecipes(n).length,42);assert.equal(menuUsage(n).research,10);
 assert.ok(n.recipes.some(r=>r.id==='coffee_black'));assert.equal(toggleMenuRecipe(n,'coffee_black'),n);
 assert.equal(n.money,s.money);assert.equal(n.inventory,s.inventory);assert.equal(n.inventoryBatches,s.inventoryBatches);assert.equal(n.stats,s.stats);assert.equal(n.recipes[0].price,75);
 assert.deepEqual(normalizeRestaurantCatalog(n),n);
});
test('popular, slow and new dishes get distinct targets and shared stock is combined',()=>{
 const s=fresh();s.recipes=[lab(0),{...lab(1),ingredients:{rice:2}}, {...lab(2),ingredients:{milk:1}}];s.activeMenu=s.recipes.map(r=>r.id);s.week=2;
 s.lastWeekItemSales={custom_test_0:35,custom_test_1:1};s.stats.itemsSold={custom_test_0:35,custom_test_1:1};s.manager.target=30;
 const p=restaurantStockPlan(s);assert.deepEqual(p.dishes.map(d=>d.portions),[15,1,2]);assert.equal(p.ingredients.rice.target,17);
 s.phase='service';s.inventory={};s.inventoryBatches={};s.staff.hasManager=true;s.manager.budget=1000;
 const plan=purchasingPlan(s);assert.equal(plan.filter(p=>p.id==='rice').length,1);
 const stocked=applyManagerPurchases(s);for(const[id,t]of Object.entries(restaurantStockPlan(s).ingredients))assert.equal(stocked.inventory[id],t.target);
 assert.deepEqual(purchasingPlan(stocked),[]);assert.ok(Math.abs(s.money-stocked.money-stocked.manager.spent)<1e-7);
 for(const[id,qty]of Object.entries(stocked.inventory))assert.equal(stocked.inventoryBatches[id].reduce((n,b)=>n+b.qty,0),qty);
 const off=toggleMenuRecipe(stocked,'custom_test_2');assert.equal(restaurantStockPlan(off).ingredients.milk,undefined);assert.equal(off.inventory.milk,2);
});
test('obligations and buffer limit orders; zero-sales history survives week close',()=>{
 const s=fresh();s.phase='service';s.staff.hasManager=true;s.money=300;s.inventory={};s.manager.reserve=100;
 s.cashProtection={wages:80,rent:50,loans:70,deposits:0,arrears:0,total:200};assert.deepEqual(purchasingPlan(s),[]);
 s.cashProtection.total=180;const cost=purchasingPlan(s).reduce((n,p)=>n+p.cost,0);assert.ok(cost>0&&cost<=20);
 const closed=finishShift(s);for(const id of s.activeMenu)assert.equal(closed.lastWeekItemSales?.[id],0);
 assert.ok(restaurantStockPlan(closed).dishes.every(d=>d.portions===1));
});
