import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,advanceGame} from '../src/hooks/useGameLoop';
import {chooseRestaurantType} from '../src/restaurantTypes';
import {ensureRestaurantStockroom,manageRestaurantStockroom,orderRestaurantStock,restaurantManagerStatus,setRestaurantReorder} from '../src/inventory/restaurantStockroom';
import {ensureCrew} from '../src/career/crew';
import {createEmpire} from '../src/empire/empire';
import {propertyById} from '../src/prototype/expansionModel';

function restaurant(){
 let r=ensureRestaurantStockroom(chooseRestaurantType(structuredClone(INITIAL_STATE),'italian'));
 r.phase='service';r.isRestaurantOpen=false;r.staff.hasManager=true;r.money=5000;
 r.activeMenu=[r.activeMenu[0]];r.manager={enabled:true,target:30,budget:1000,reserve:150,spent:0};
 r.inventory=Object.fromEntries(Object.keys(r.inventory).map(id=>[id,100]));
 return r;
}
test('automatic manager rechecks ingredients depleted after the morning check, without duplicate orders',()=>{
 let r=restaurant();r=manageRestaurantStockroom(r);assert.equal(r.stockroom!.orders.length,0);
 const recipe=r.recipes.find(x=>x.id===r.activeMenu[0])!;
 r={...r,inventory:{...r.inventory,...Object.fromEntries(Object.keys(recipe.ingredients).map(id=>[id,0]))}};
 r=advanceGame(r,1.2);
 assert.ok(r.stockroom!.orders.length>0,'stock used later that day must trigger replenishment');
 assert.ok(r.stockroom!.orders.every(o=>o.dueDay===2),'standard delivery remains next morning');
 const money=r.money,orders=r.stockroom!.orders;r=advanceGame(r,1.2);
 assert.equal(r.money,money);assert.deepEqual(r.stockroom!.orders,orders);
});
test('manager retries in the same day when funds become available and honors the remaining budget',()=>{
 let r=restaurant();r.inventory={};r.inventoryBatches={};r.manager.budget=0;
 r=manageRestaurantStockroom(r);assert.equal(r.stockroom!.orders.length,0);
 r={...r,manager:{...r.manager,budget:30}};r=advanceGame(r,1.2);
 assert.ok(r.stockroom!.orders.length>0);assert.ok(r.manager.spent<=30);
});
test('automatic orders protect accrued and unpaid wages even without an empire cash forecast',()=>{
 const r=restaurant();r.money=200;r.pendingPayroll=[{amount:80,dueWeek:2}];r.weekStats.wages=30;r.manager.reserve=100;
 assert.equal(orderRestaurantStock(r,'rice',1,'standard',true).money,r.money);
 r.inventory={};r.inventoryBatches={};assert.equal(manageRestaurantStockroom(r).money,r.money);
});
test('manager ignores custom reorder rules for ingredients removed from the active menu',()=>{
 let r=restaurant();r=setRestaurantReorder(r,'fish',{minimum:20,target:30,maximum:40});
 assert.ok(!r.recipes.find(x=>x.id===r.activeMenu[0])!.ingredients.fish);
 r.inventory.fish=0;r=manageRestaurantStockroom(r);assert.equal(r.stockroom!.orders.length,0);
});
test('manager respects duty, pause, planning and cash protection, and resumes without changing those rules',()=>{
 let r=restaurant();r.inventory={};r.inventoryBatches={};
 const e=createEmpire(r);r.crew=ensureCrew(propertyById('diner')!,e.district.businesses.diner,r);
 const manager=r.crew.find(x=>x.role==='manager')!;manager.shift='night';
 assert.equal(manageRestaurantStockroom(r),r);assert.match(restaurantManagerStatus(r).title,/unavailable/);
 manager.shift='all';r.manager.enabled=false;assert.equal(manageRestaurantStockroom(r),r);
 r.manager.enabled=true;r.phase='planning';assert.equal(manageRestaurantStockroom(r),r);
 r.phase='service';r.money=763.95;r.manager.budget=5000;r.manager.reserve=500;
 r.cashProtection={total:10103.25,wages:193,rent:0,loans:9910.25,deposits:0,arrears:0};
 r=manageRestaurantStockroom(r);assert.equal(r.stockroom!.orders.length,0);
 const blocked=restaurantManagerStatus(r);assert.match(blocked.title,/cash reserved/);
 assert.match(blocked.detail,/\$763\.95/);assert.match(blocked.detail,/\$10,103\.25/);assert.match(blocked.detail,/Available for stock: \$0\.00/);
 r={...r,money:12000};r=advanceGame(r,1.2);
 assert.ok(r.stockroom!.orders.length>0);assert.ok(r.money>=10603.25);
 assert.match(restaurantManagerStatus(r).detail,/Week 1, Day 2/);
 const saved=JSON.parse(JSON.stringify(r));assert.deepEqual(manageRestaurantStockroom(saved).stockroom!.orders,r.stockroom!.orders);
});
