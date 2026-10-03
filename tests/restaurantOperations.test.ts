import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,GameState,advanceGame,Order} from '../src/hooks/useGameLoop';
import {chooseRestaurantType} from '../src/restaurantTypes';
import {RestaurantType} from '../src/data/restaurantCatalogs';
import {changeServicePlan,servicePlan,bookBistroTable,bistroOffers,advanceBistroBookings,reservedTableIds,preparationTime,freshnessModifier,chooseServiceRecipe,walkInCapacity} from '../src/restaurantOperations';
import {serveReadyTable} from '../src/gameplay';
import {createEmpire,parseEmpireSave} from '../src/empire/empire';
const restaurant=(type:RestaurantType,level=3):GameState=>({...chooseRestaurantType(structuredClone(INITIAL_STATE),type),restaurantLevel:level});

test('service choices are type-specific, level gated and survive saving',()=>{
 let cafe=restaurant('cafe',1);cafe=changeServicePlan(cafe,{pickup:true,pastryBatch:4,coffeeFirst:true});assert.equal(servicePlan(cafe).pickup,false);assert.equal(servicePlan(cafe).pastryBatch,1);assert.equal(servicePlan(cafe).coffeeFirst,true);
 cafe=changeServicePlan({...cafe,restaurantLevel:3},{pickup:true,pastryBatch:4});assert.equal(servicePlan(cafe).pickup,true);assert.equal(servicePlan(cafe).pastryBatch,4);
 assert.deepEqual(parseEmpireSave(JSON.stringify(createEmpire(cafe)))!.restaurants.diner.servicePlan,cafe.servicePlan);
 assert.equal(servicePlan(changeServicePlan(restaurant('diner'),{pastryBatch:4})).pastryBatch,1);
 assert.equal(servicePlan(changeServicePlan(restaurant('bistro'),{pickup:true})).pickup,false);
});
test('booked bistro tables are held, served once, and missing a sitting counts the affected guests',()=>{
 let bistro=restaurant('bistro'),offer=bistroOffers(bistro)[0];bistro=bookBistroTable(bistro,offer.id);assert.equal(bistro.bookings!.length,1);assert.equal(bookBistroTable(bistro,offer.id),bistro);
 assert.equal(reservedTableIds({...bistro,time:offer.time-1}).length,1);
 let arrived=advanceBistroBookings({...bistro,time:offer.time,phase:'service',isRestaurantOpen:true});assert.equal(arrived.customers.length,1);assert.equal(arrived.bookings![0].status,'seated');assert.equal(arrived.customers[0].bookingName,offer.name);assert.equal(advanceBistroBookings(arrived),arrived);
 const missed=advanceBistroBookings({...bistro,time:offer.time+5,phase:'service',isRestaurantOpen:false});assert.equal(missed.bookings![0].status,'missed');assert.equal(missed.weekStats.lost,offer.party);assert.equal(missed.money,bistro.money);
});
test('bistro pacing limits walk-ins and featuring a dish changes orders without raising its price',()=>{
 let bistro=restaurant('bistro');bistro=changeServicePlan(bistro,{pace:'relaxed',specialId:bistro.activeMenu[0]});assert.equal(walkInCapacity(bistro),1);
 const recipes=bistro.recipes.filter(r=>bistro.activeMenu.includes(r.id)).slice(0,2);
 assert.equal(chooseServiceRecipe(bistro,recipes,()=>.55).id,recipes[0].id);assert.equal(chooseServiceRecipe({...bistro,servicePlan:undefined},recipes,()=>.55).id,recipes[1].id);
});
test('bakery batches only speed up matching ordered pastries and stale baked orders reduce tips',()=>{
 const cafe=changeServicePlan(restaurant('cafe'),{pastryBatch:4}),pastry=cafe.recipes.find(r=>r.id==='cuisine_cafe_11')!;
 const orders:Order[]=Array.from({length:4},(_,i)=>({id:String(i),customerId:'guest',tableId:'t1',recipeId:pastry.id,state:'pending',progress:0,isOnFire:false,price:pastry.price}));
 assert.equal(preparationTime(cafe,pastry,orders),pastry.cookingTime*.65);assert.equal(preparationTime(cafe,pastry,orders.slice(0,1)),pastry.cookingTime);
 const ready=orders.map(o=>({...o,state:'ready' as const,progress:100,readyAt:0}));assert.equal(freshnessModifier({...cafe,time:1},ready),1);assert.equal(freshnessModifier({...cafe,time:10},ready),.65);
 const served=serveReadyTable({...cafe,time:10,orders:ready,customers:[{id:'guest',tableId:'t1',state:'waiting_food',partySize:1,patience:150,maxPatience:100,actionTimer:0,currentBill:20,isVIP:false,vipBonus:0}]},ready[0].id);assert.equal(served.customers[0].tipModifier,.65);assert.deepEqual(served.inventory,cafe.inventory);
});
test('pickup collection pays once with no app fee, counts service, and lets the customer walk out',()=>{
 const r=restaurant('diner',2),recipe=r.recipes[0];r.phase='service';r.isRestaurantOpen=false;r.customers=[{id:'pickup',state:'eating',tableId:'online_pickup_test',actionTimer:.1,currentBill:20,isVIP:false,vipBonus:0,partySize:1,patience:100,maxPatience:100,pickupElapsed:20,pickupSlot:0}];r.orders=[{id:'pick-order',customerId:'pickup',tableId:'online_pickup_test',recipeId:recipe.id,state:'ready',progress:100,isOnFire:false,price:20}];
 const paid=advanceGame(r,.2);assert.equal(paid.money,r.money+20);assert.equal(paid.stats.onlineFees,0);assert.equal(paid.stats.onlineEarned,0);assert.equal(paid.stats.customersServed,1);assert.equal(paid.stats.itemsSold[recipe.id],1);assert.equal(paid.customers[0].state,'leaving');assert.ok(paid.customers[0].actionTimer>0);
 const next=advanceGame(paid,.2);assert.equal(next.money,paid.money);assert.equal(next.stats.itemsSold[recipe.id],1);
});
