import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,GameState,advanceGame,Order} from '../src/hooks/useGameLoop';
import {chooseRestaurantType} from '../src/restaurantTypes';
import {RestaurantType} from '../src/data/restaurantCatalogs';
import {changeServicePlan,servicePlan,bookBistroTable,bistroOffers,advanceBistroBookings,reservedTableIds,preparationTime,freshnessModifier,chooseServiceRecipe,walkInCapacity} from '../src/restaurantOperations';
import {serveReadyTable} from '../src/gameplay';
import {createEmpire,parseEmpireSave,startEmpireWeek,advanceEmpire} from '../src/empire/empire';
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
test('a completed delivery counts as one guest and keeps the commission',()=>{
 const r=restaurant('diner',2),recipe=r.recipes[0];r.phase='service';r.isRestaurantOpen=false;
 r.customers=[{id:'delivery',state:'eating',tableId:'online_bitedash_test',actionTimer:.1,currentBill:20,isVIP:false,vipBonus:0,partySize:1,patience:100,maxPatience:100}];
 r.orders=[{id:'del-order',customerId:'delivery',tableId:'online_bitedash_test',recipeId:recipe.id,state:'ready',progress:100,isOnFire:false,price:20}];
 const paid=advanceGame(r,.2);
 assert.equal(paid.stats.customersServed,1);
 assert.equal(paid.money,r.money+16);
 assert.equal(paid.stats.onlineEarned,20);
 assert.equal(paid.stats.onlineFees,4);
 assert.equal(paid.weekStats.served,1);
 assert.equal(paid.weekStats.fees,4);
});
test('pickup collection pays once with no app fee, counts service, and lets the customer walk out',()=>{
 const r=restaurant('diner',2),recipe=r.recipes[0];r.phase='service';r.isRestaurantOpen=false;r.customers=[{id:'pickup',state:'eating',tableId:'online_pickup_test',actionTimer:.1,currentBill:20,isVIP:false,vipBonus:0,partySize:1,patience:100,maxPatience:100,pickupElapsed:20,pickupSlot:0}];r.orders=[{id:'pick-order',customerId:'pickup',tableId:'online_pickup_test',recipeId:recipe.id,state:'ready',progress:100,isOnFire:false,price:20}];
 const paid=advanceGame(r,.2);assert.equal(paid.money,r.money+20);assert.equal(paid.stats.onlineFees,0);assert.equal(paid.stats.onlineEarned,0);assert.equal(paid.stats.customersServed,1);assert.equal(paid.stats.itemsSold[recipe.id],1);assert.equal(paid.customers[0].state,'leaving');assert.ok(paid.customers[0].actionTimer>0);
 const next=advanceGame(paid,.2);assert.equal(next.money,paid.money);assert.equal(next.stats.itemsSold[recipe.id],1);
});
test('a delivery the kitchen cannot cook is cancelled so the week can close',()=>{
 const r=restaurant('diner',2),recipe=r.recipes.find(item=>r.activeMenu.includes(item.id))!;
 r.phase='closing';r.time=100;r.isRestaurantOpen=false;
 r.advanced={schedules:[],stations:{grill:0,oven:0,cold:0,drinks:0},catering:[],terrace:false,lastDay:7,notice:''};
 r.customers=[{id:'delivery',state:'waiting_food',patience:9999,maxPatience:9999,tableId:'online_bitedash_1',actionTimer:0,currentBill:recipe.price,isVIP:false,vipBonus:0,partySize:1}];
 r.orders=[{id:'ticket',customerId:'delivery',tableId:'online_bitedash_1',recipeId:recipe.id,state:'cooking',progress:0,isOnFire:false,price:recipe.price}];
 const closed=advanceGame(r,.2);
 assert.equal(closed.phase,'planning');assert.equal(closed.week,r.week+1);assert.equal(closed.customers.length,0);assert.equal(closed.orders.length,0);
 assert.equal(closed.stats.customersLost,1);assert.equal(closed.money,r.money);assert.equal(closed.weekSummary?.lost,1);
});
test('delivery tickets wait a limited time and a working kitchen can still finish one',()=>{
 const blocked=restaurant('diner',2),recipe=blocked.recipes.find(item=>blocked.activeMenu.includes(item.id))!;
 blocked.phase='service';blocked.time=0;blocked.isRestaurantOpen=false;
 blocked.advanced={schedules:[],stations:{grill:0,oven:0,cold:0,drinks:0},catering:[],terrace:false,lastDay:1,notice:''};
 blocked.customers=[{id:'delivery',state:'waiting_food',patience:9999,maxPatience:9999,tableId:'online_bitedash_2',actionTimer:0,currentBill:recipe.price,isVIP:false,vipBonus:0,partySize:1}];
 blocked.orders=[{id:'ticket',customerId:'delivery',tableId:'online_bitedash_2',recipeId:recipe.id,state:'pending',progress:0,isOnFire:false,price:recipe.price}];
 let expired=blocked;
 for(let tick=0;tick<9;tick++)expired=advanceGame(expired,10);
 assert.equal(expired.phase,'service');assert.equal(expired.orders.length,0);assert.equal(expired.stats.customersLost,1);assert.equal(expired.money,blocked.money);
 const open=restaurant('diner',2);
 open.phase='closing';open.time=100;open.isRestaurantOpen=false;
 open.advanced={schedules:[],stations:{grill:100,oven:100,cold:100,drinks:100},catering:[],terrace:false,lastDay:7,notice:''};
 open.customers=[{id:'delivery',state:'waiting_food',patience:90,maxPatience:90,tableId:'online_bitedash_3',actionTimer:0,currentBill:recipe.price,isVIP:false,vipBonus:0,partySize:1}];
 open.orders=[{id:'ticket',customerId:'delivery',tableId:'online_bitedash_3',recipeId:recipe.id,state:'pending',progress:0,isOnFire:false,price:recipe.price}];
 const cooking=advanceGame(open,1);
 assert.equal(cooking.phase,'closing');assert.equal(cooking.money,open.money);assert.equal(cooking.stats.customersLost,0);
 assert.ok(cooking.customers.some(c=>c.id==='delivery'));
});
test('one uncookable delivery still lets the neighborhood week close',()=>{
 let e=startEmpireWeek(createEmpire(restaurant('diner',2)));
 const recipe=e.restaurants.diner.recipes.find(item=>e.restaurants.diner.activeMenu.includes(item.id))!;
 e={...e,restaurants:{diner:{...e.restaurants.diner,phase:'closing',time:100,isRestaurantOpen:false,advanced:{schedules:[],stations:{grill:0,oven:0,cold:0,drinks:0},catering:[],terrace:false,lastDay:7,notice:''},customers:[{id:'delivery',state:'waiting_food',patience:9999,maxPatience:9999,tableId:'online_bitedash_9',actionTimer:0,currentBill:recipe.price,isVIP:false,vipBonus:0,partySize:1}],orders:[{id:'ticket',customerId:'delivery',tableId:'online_bitedash_9',recipeId:recipe.id,state:'cooking',progress:0,isOnFire:false,price:recipe.price}]}}};
 e=advanceEmpire(e,.2,advanceGame);
 assert.equal(e.restaurants.diner.phase,'planning');
 assert.equal(e.district.week,2);
 assert.equal(e.restaurants.diner.customers.length,0);
});
