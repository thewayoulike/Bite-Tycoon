import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict} from '../src/empire/empire';
import {propertyById,type Business} from '../src/prototype/expansionModel';
import {startVenueWeek} from '../src/empire/venueSimulation';
import {advanceSupermarket,collectStoreBasket,storeShopperHelp} from '../src/empire/supermarketSimulation';
import {storeBasket} from '../src/empire/supermarket';
import {supermarketPurchasingLimits,supermarketLossAdvice} from '../src/empire/supermarketAdvice';

const p=propertyById('shop')!;
function fresh():Business {
 const b=startVenueWeek(p,unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE).district.businesses.shop,1);
 return {...b,venue:{...b.venue!,arrivalTimer:10000,visitors:[{id:1,seed:1,state:'waiting',remaining:0,unit:null,patience:70,shoppingTime:0,productId:'apples',quantity:1,basketItems:[]}]}};
}
function finishBasket(b:Business){
 for(let t=0;t<90&&!b.venue!.week.served;t+=.25)b=advanceSupermarket(p,b,.25,1,1);
 return b;
}

test('grocery shopping and checkout run automatically without using patience for the walk',()=>{
 let b=fresh();b.venue!.visitors[0].patience=3;
 assert.equal(storeShopperHelp(b,b.venue!.visitors[0]).label,null);
 b=advanceSupermarket(p,b,1,1,1);
 assert.equal(b.venue!.visitors[0].patience,3);
 assert.equal(b.venue!.week.served,0,'no checkout before walking to products and the till');
 b=finishBasket(b);
 assert.equal(b.venue!.week.served,1);assert.equal(b.venue!.week.lost,0);
});

test('a blocked chilled extra does not discard the goods already collected',()=>{
 let b=fresh();
 b.retail!.store!.events=[{id:1,kind:'fridge',title:'Fault',day:1,until:999}];
 b.venue!.visitors[0]={...b.venue!.visitors[0],productId:'milk',shoppingTime:100,basketItems:[{id:'rice',quantity:1,rate:6}]};
 const cash=b.cash,rice=b.retail!.stock.rice,milk=b.retail!.stock.milk;
 b=advanceSupermarket(p,b,.25,1,1);
 assert.ok(b.venue!.visitors[0].basket);
 assert.deepEqual(storeBasket(b,b.venue!.visitors[0]),[{id:'rice',quantity:1,rate:6}]);
 b=finishBasket(b);
 assert.equal(b.venue!.week.served,1);assert.equal(b.venue!.week.lost,0);
 assert.equal(b.cash,cash+6);assert.equal(b.retail!.stock.rice,rice-1);assert.equal(b.retail!.stock.milk,milk);
 assert.equal(b.retail!.store!.sales.length,1);
});

test('a missing first item moves the shopper to their next item without skipping the walk',()=>{
 let b=fresh();b.retail!.stock.apples=0;
 b.venue!.visitors[0]={...b.venue!.visitors[0],shoppingTime:100,shoppingList:[{id:'bread',quantity:1}]};
 b=advanceSupermarket(p,b,.25,1,1);
 assert.equal(b.venue!.visitors[0].productId,'bread');
 assert.equal(collectStoreBasket(b,1),b);
 b=finishBasket(b);
 assert.equal(b.venue!.week.served,1);assert.equal(b.venue!.week.lost,0);
 assert.deepEqual(b.retail!.store!.sales.map(s=>s.item),['bread']);
});

test('an empty-basket shopper can choose an in-stock substitute in the same category',()=>{
 let b=fresh();b.retail!.shelves=['apples','bananas'];b.retail!.stock.apples=0;
 b.retail!.stock.bananas=4;b.retail!.store!.shelf.bananas=4;
 b.venue!.visitors[0].shoppingTime=100;
 b=advanceSupermarket(p,b,.25,1,1);
 assert.equal(b.venue!.visitors[0].productId,'bananas');
 b=finishBasket(b);
 assert.equal(b.venue!.week.served,1);assert.equal(b.venue!.week.lost,0);
 assert.equal(b.retail!.stock.apples,0);assert.equal(b.retail!.stock.bananas,3);
});

test('genuine stockouts are recorded once and free space without manufacturing stock',()=>{
 let b=fresh();b.retail!.stock={};b.retail!.store!.receiving={};b.venue!.visitors[0].shoppingTime=100;
 const cash=b.cash;
 for(let t=0;t<10;t++)b=advanceSupermarket(p,b,1,1,1);
 assert.equal(b.venue!.week.lost,1);assert.equal(b.retail!.store!.losses?.stock,1);
 assert.equal(b.retail!.store!.metrics['Produce & bakery']?.stockouts,1);
 assert.equal(b.venue!.visitors.length,0);assert.equal(b.cash,cash);assert.deepEqual(b.retail!.stock,{});
});

test('optional counter assistance cannot skip walking, missing stock or a fridge fault',()=>{
 let b=fresh();b.venue!.visitors[0].productId='chicken';
 let help=storeShopperHelp(b,b.venue!.visitors[0]);
 assert.match(help.label!,/Help collect.*optional/);assert.match(help.blocker!,/Walking/);
 assert.equal(collectStoreBasket(b,1,true),b);
 b.venue!.visitors[0].shoppingTime=100;b.retail!.stock.chicken=0;
 assert.match(storeShopperHelp(b,b.venue!.visitors[0]).blocker!,/Out of stock/);
 assert.equal(collectStoreBasket(b,1,true),b);
 b.retail!.stock.chicken=4;b.retail!.store!.shelf.chicken=4;
 b.retail!.store!.events=[{id:1,kind:'fridge',title:'Fault',day:1,until:999}];
 assert.match(storeShopperHelp(b,b.venue!.visitors[0]).blocker!,/Refrigeration fault/);
 assert.equal(collectStoreBasket(b,1,true),b);
});

test('Day 6 evening and Day 7 still admit shoppers at every week length',()=>{
 for(const minutes of [3,5,10])for(const clock of [149,158]){
  let b=fresh();b.venue={...b.venue!,clock,activityClock:clock*minutes/3,arrivalTimer:0,visitors:[]};
  b=advanceSupermarket(p,b,.25,1,clock<154?6:7,1,3/minutes);
  assert.equal(b.venue!.serial,1,`${minutes} minute week at ${clock}`);
  assert.equal(b.venue!.visitors.length,1);assert.equal(b.venue!.arrivalsClosed,false);
 }
});

test('late trips shorten their basket and finish before closing, with only a brief admission cutoff',()=>{
 for(const minutes of [3,5,10]){
  let b=fresh();b.retail!.shelves=['apples','bread','rice'];
  b.venue={...b.venue!,clock:174,activityClock:174*minutes/3,arrivalTimer:0,visitors:[]};
  // Six calendar seconds leaves twenty activity seconds on a ten-minute week.
  b=advanceSupermarket(p,b,.25,1,7,1,3/minutes);
  if(minutes===10){
   assert.equal(b.venue!.visitors.length,1);
   assert.ok((b.venue!.visitors[0].shoppingList?.length??0)<3);
   b.venue!.arrivalTimer=10000;
   for(let t=0;t<25&&!b.venue!.week.served;t+=.25)b=advanceSupermarket(p,b,.25,1,7,1,3/minutes);
   assert.equal(b.venue!.week.served,1);assert.ok(b.venue!.clock<=180);
  }
  b={...b,venue:{...b.venue!,clock:179.9,arrivalTimer:0,visitors:[]}};
  const serial=b.venue!.serial;
  b=advanceSupermarket(p,b,.05,1,7,1,3/minutes);
  assert.equal(b.venue!.serial,serial);assert.equal(b.venue!.arrivalsClosed,true);
  b=startVenueWeek(p,{...b,venue:{...b.venue!,running:false}},2);
  assert.equal(b.venue!.arrivalsClosed,false);
 }
});

test('purchasing guidance exposes the grocery limit even when the overall budget has room',()=>{
 const b=fresh();b.manager={enabled:true,budget:6000,spent:980,reserve:150};
 b.retail!.store!.budgets={grocery:1000,electronics:1500};
 b.retail!.store!.spent={grocery:980,electronics:0};b.retail!.store!.budgetWeek=6;
 b.retail!.store!.losses={stock:43};b.venue!.week.lost=43;
 const before=structuredClone(b),grocery=supermarketPurchasingLimits(b,6)[0];
 assert.equal(grocery.remaining,20);assert.equal(grocery.overallRemaining,5020);assert.equal(grocery.allowance,20);
 assert.match(supermarketLossAdvice(b)[0].tip,/separate \$1,000.*\$6,000/);
 assert.deepEqual(b,before);
 const nextWeek={...b,manager:{...b.manager,spent:0}};
 assert.equal(supermarketPurchasingLimits(nextWeek,7)[0].remaining,1000);
 assert.equal(supermarketPurchasingLimits(nextWeek,7)[0].allowance,1000);
 delete b.retail!.store!.budgets;
 const shared=supermarketPurchasingLimits(b,6)[0];
 assert.equal(shared.separate,false);assert.equal(shared.allowance,5020);
});
