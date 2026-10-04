import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,advanceGame} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,parseEmpireSave,startEmpireWeek,advanceEmpire} from '../src/empire/empire';
import {propertyById,hireBusinessStaff} from '../src/prototype/expansionModel';
import type {Business,ExpansionState} from '../src/prototype/expansionModel';
import {RETAIL_PRODUCTS,retailProductFloor,retailItemValue,setShelfProduct,setProductPrice} from '../src/empire/retail';
import {STORE_LEVELS,advanceStoreLevel,productUnlocked,shelfPlan,confirmShelfPlan,ensureSupermarket,replenishShelf,receiveStoreGoods,shelfQuantity,backroomQuantity,basketQuantity,storeRules,envelopeRemaining,startStoreWeek,markEnvelopeSpent,resolveStoreEvent,dispatchStoreDelivery} from '../src/empire/supermarket';
import {advanceSupermarket,collectStoreBasket,checkoutStore,storeServiceBlocker} from '../src/empire/supermarketSimulation';
import {startVenueWeek} from '../src/empire/venueSimulation';
import {orderBusinessStock,advanceBusinessStockroom,manageBusinessStockroom,setBusinessReorder} from '../src/inventory/businessStockroom';
import {venueFinancials} from '../src/empire/venueFinance';
import {protectedObligations} from '../src/empire/cashProtection';
import {supermarketNavigation,supermarketProductPoint,supermarketTravelSeconds} from '../src/empire/supermarketLayout';
import {lodgingWalkingPath,clearWalkingSegment,walkablePoint} from '../src/empire/lodgingLayout';
import {supermarketFixtureGeometry,electronicsGeometry} from '../src/components/SupermarketInterior3D';
const p=propertyById('shop')!;
const fresh=()=>unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.001,`${a} != ${b}`);
const put=(s:ExpansionState,b:Business)=>({...s,businesses:{...s.businesses,shop:b}});
function level(n:number){let s=fresh().district;s=put(s,{...s.businesses.shop,venue:{...s.businesses.shop.venue!,totalServed:1000}});for(let i=1;i<n;i++)s=advanceStoreLevel(s,'shop');return s;}
function shopper(b:Business,item='apples',id=1,quantity=2):Business{return {...b,venue:{...b.venue!,running:true,visitors:[...b.venue!.visitors,{id,seed:id,state:'waiting',patience:50,remaining:0,unit:null,productId:item,quantity,shoppingTime:30}]}};}
function readyCheckout(b:Business){return {...b,venue:{...b.venue!,clock:Math.max(b.venue!.clock,...b.venue!.visitors.map(v=>v.checkoutReadyAt??0))}};}
function balanced(b:Business,s:ExpansionState){const f=venueFinancials(p,b,s);near(f.assets,f.liabilities+f.equity);near(f.closingCash,b.cash);}

test('supermarket starts with grocery departments and earns five sequential fit-outs; clicks cannot skip milestones or charge twice',()=>{
 let s=fresh().district;const original=s.businesses.shop;
 assert.equal(original.retail!.store!.level,1);assert.ok(productUnlocked(original,'milk'));assert.equal(productUnlocked(original,'fish'),false);assert.equal(productUnlocked(original,'tv'),false);
 assert.equal(advanceStoreLevel(s,'shop').businesses.shop,original);
 for(const spec of STORE_LEVELS.slice(1)){
  s=put(s,{...s.businesses.shop,venue:{...s.businesses.shop.venue!,totalServed:spec.shoppers-1}});const before=s.businesses.shop;
  assert.equal(advanceStoreLevel(s,'shop').businesses.shop,before);
  s=put(s,{...before,venue:{...before.venue!,totalServed:spec.shoppers}});
  const running=put(s,{...s.businesses.shop,venue:{...s.businesses.shop.venue!,running:true}});assert.equal(advanceStoreLevel(running,'shop').businesses.shop,running.businesses.shop);
  s=advanceStoreLevel(s,'shop');assert.equal(s.businesses.shop.retail!.store!.level,spec.level);near(s.businesses.shop.cash,before.cash-spec.cost);
  assert.equal(advanceStoreLevel(s,'shop').businesses.shop,s.businesses.shop);
  assert.equal(!!s.businesses.shop.retail!.electronicsUnlocked,spec.level>=4);assert.equal(productUnlocked(s.businesses.shop,'washing_machine'),spec.level>=5);
  balanced(s.businesses.shop,s);
 }
 assert.equal(advanceStoreLevel(s,'shop'),s);
 const parsed=parseEmpireSave(JSON.stringify({...fresh(),district:s}))!;assert.deepEqual(parsed.district.businesses.shop.retail,s.businesses.shop.retail);
});

test('older supermarkets preserve every selected department, stock, open electronics floor and cash',()=>{
 let b=fresh().district.businesses.shop;const retail={...b.retail!,store:undefined,electronicsUnlocked:true,shelves:RETAIL_PRODUCTS.map(p=>p.id)};b={...b,retail};
 const migrated=ensureSupermarket(b);assert.equal(migrated.cash,b.cash);assert.deepEqual(migrated.retail!.stock,b.retail!.stock);assert.deepEqual(migrated.retail!.shelves,b.retail!.shelves);
 assert.equal(migrated.retail!.store!.level,5);assert.equal(migrated.retail!.store!.budgets,undefined);assert.ok(RETAIL_PRODUCTS.every(p=>productUnlocked(migrated,p.id)));assert.equal(ensureSupermarket(migrated),migrated);
});

test('display plan previews physical fixture requirements, spends only on confirmation and supports the complete unlocked range',()=>{
 let s=level(2),b=s.businesses.shop;b={...b,retail:{...b.retail!,store:{...b.retail!.store!,fixtures:{dry:1,cold:1}}}};s=put(s,b);
 const plan=shelfPlan(b,0);assert.ok(plan.cost>0);assert.equal(plan.ids.length,24);assert.equal(s.businesses.shop.cash,b.cash);
 const poor=put(s,{...b,cash:0});assert.equal(confirmShelfPlan(poor,'shop',0).businesses.shop,poor.businesses.shop);
 const applied=confirmShelfPlan(s,'shop',0);near(applied.businesses.shop.cash,b.cash-plan.cost);assert.equal(applied.businesses.shop.retail!.shelves.length,24);
 near(confirmShelfPlan(applied,'shop',0).businesses.shop.cash,applied.businesses.shop.cash);balanced(applied.businesses.shop,applied);
 assert.equal(setShelfProduct(s,'shop','fish').businesses.shop,b);
});

test('stock travels through receiving, backroom, shelf and basket; only checkout records a sale and FIFO cost',()=>{
 let s=fresh().district,b=s.businesses.shop;const initialCash=b.cash,initialValue=retailItemValue(b.retail!,'apples');
 s=orderBusinessStock(s,'shop','apples',10);b=s.businesses.shop;assert.equal(b.retail!.stock.apples,20);near(b.cash,initialCash-12);
 b=advanceBusinessStockroom(p,b,1,2);assert.equal(b.retail!.store!.receiving.apples,10);assert.equal(b.retail!.stock.apples,30);near(retailItemValue(b.retail!,'apples'),initialValue+12);
 const balanceBefore=venueFinancials(p,b,s).assets;b=receiveStoreGoods(b);assert.equal(b.retail!.store!.receiving.apples,0);assert.equal(backroomQuantity(b,'apples'),22);
 b=replenishShelf(b,'apples');assert.equal(shelfQuantity(b,'apples'),12);assert.equal(backroomQuantity(b,'apples'),18);near(venueFinancials(p,b,s).assets,balanceBefore);
 b=shopper(startVenueWeek(p,b,1));b=collectStoreBasket(b,1);assert.equal(basketQuantity(b,'apples'),2);assert.equal(shelfQuantity(b,'apples'),10);assert.equal(b.cash,initialCash-12);assert.match(storeServiceBlocker(b,1)!,/walking/);
 assert.equal(checkoutStore(b,1,2,1),b);b=readyCheckout(b);b=checkoutStore(b,1,2,1);near(b.cash,initialCash-6);assert.equal(b.retail!.stock.apples,28);assert.equal(checkoutStore(b,1,2,1),b);
 const m=b.retail!.store!.metrics['Produce & bakery']!;near(m.sales,6);near(m.cogs,2.4);assert.equal(m.units,2);assert.ok(m.wait>0);balanced(b,s);
});

test('empty shelves block collection even with backroom stock; reservations cannot sell the same units twice',()=>{
 let b=startVenueWeek(p,fresh().district.businesses.shop,1);b={...b,retail:{...b.retail!,stock:{apples:2},batches:{apples:[{qty:2,costPerUnit:1.2}]},store:{...b.retail!.store!,shelf:{apples:0}}}};
 b=shopper(b);assert.equal(collectStoreBasket(b,1,true),b);b=replenishShelf(b,'apples');b=shopper(b,'apples',2);b=collectStoreBasket(b,1,true);assert.equal(basketQuantity(b,'apples'),2);assert.equal(collectStoreBasket(b,2,true),b);
 assert.equal(shelfQuantity(b,'apples')+backroomQuantity(b,'apples')+basketQuantity(b,'apples'),2);
});

test('electronics have separate budgets beneath the overall budget, reserve funds, and count orders before delivery',()=>{
 let s=level(4),b=s.businesses.shop;b={...b,manager:{enabled:true,budget:1000,spent:0,reserve:100},retail:{...b.retail!,shelves:['apples','tv'],stock:{apples:0,tv:0},batches:{}}};s=put(s,b);
 s=storeRules(s,'shop',{grocery:10,electronics:240,returnBuffer:200});s=setBusinessReorder(s,'shop','apples',{minimum:1,target:10,maximum:50});s=setBusinessReorder(s,'shop','tv',{minimum:1,target:3,maximum:10});
 s=manageBusinessStockroom(s,'shop',true);b=s.businesses.shop;assert.equal(b.stockroom!.orders.find(o=>o.itemId==='tv')!.qty,1);assert.ok(b.retail!.store!.spent.grocery<=10);assert.equal(b.retail!.store!.spent.electronics,240);assert.equal(envelopeRemaining(b,'tv',1),0);
 const again=manageBusinessStockroom(s,'shop',true);assert.equal(again.businesses.shop.cash,b.cash);assert.deepEqual(again.businesses.shop.stockroom!.orders,b.stockroom!.orders);
 assert.equal(protectedObligations(p,b,s).returnReserve,200);assert.ok(protectedObligations(p,b,s).total>=235);
 const newWeek=markEnvelopeSpent(b,'tv',240,2),started=startStoreWeek(newWeek,2);assert.equal(started.retail!.store!.spent.electronics,240);assert.equal(startStoreWeek(started,2),started);
 assert.equal(startStoreWeek(started,3).retail!.store!.spent.electronics,0);
 s=put(s,{...b,cash:335,manager:{...b.manager!,spent:0}});const protectedPurchase=manageBusinessStockroom(s,'shop',true);near(protectedPurchase.businesses.shop.cash,335);
});

test('electronics need an adviser or owner help, paid appliances dispatch once and refunds restore exact cost without inventing revenue',()=>{
 let s=level(5);s=orderBusinessStock(s,'shop','washing_machine',1,'emergency');let b=receiveStoreGoods(s.businesses.shop);b={...b,retail:{...b.retail!,shelves:['washing_machine']}};b=shopper(startVenueWeek(p,b,1),'washing_machine',3,1);
 assert.equal(collectStoreBasket(b,3),b);b=collectStoreBasket(b,3,true);assert.ok(b.venue!.visitors[0].basket);
 b=checkoutStore(readyCheckout(b),1,1,3);const cash=b.cash,sale=b.retail!.store!.sales.at(-1)!;assert.equal(b.retail!.store!.deliveries.length,1);
 s=dispatchStoreDelivery(put(s,b),'shop');assert.equal(s.businesses.shop.cash,cash);assert.equal(dispatchStoreDelivery(s,'shop'),s);
 b=s.businesses.shop;b={...b,retail:{...b.retail!,store:{...b.retail!.store!,events:[{id:999,kind:'return',title:'Sealed appliance return',saleId:sale.id,day:2,until:9}]}}};
 s=setProductPrice(put(s,b),'shop','washing_machine',700);s=resolveStoreEvent(s,'shop',999,true);b=s.businesses.shop;near(b.cash,cash-440);near(retailItemValue(b.retail!,'washing_machine'),sale.cost);near(b.retail!.store!.metrics['Large appliances']!.sales,0);near(b.retail!.store!.metrics['Large appliances']!.cogs,0);assert.equal(resolveStoreEvent(s,'shop',999,true),s);balanced(b,s);
});

test('fridge faults block cold sales, cause costed waste if left, and repairs charge once; suppliers delay outstanding orders once',()=>{
 let s=level(2),b=startVenueWeek(p,s.businesses.shop,1);b=shopper(b,'milk');b=advanceSupermarket(p,b,.1,1,3);assert.ok(b.retail!.store!.events.some(e=>e.kind==='fridge'));assert.equal(collectStoreBasket(b,1,true),b);
 const value=retailItemValue(b.retail!,'milk');b=advanceSupermarket(p,b,.1,1,4);assert.ok(retailItemValue(b.retail!,'milk')<value);assert.ok(b.retail!.store!.metrics['Chilled & frozen']!.waste>0);balanced(b,s);
 const fridge=b.retail!.store!.events.find(e=>e.kind==='fridge')!,cash=b.cash;s=resolveStoreEvent(put(s,b),'shop',fridge.id,true);near(s.businesses.shop.cash,cash-60);assert.equal(resolveStoreEvent(s,'shop',fridge.id,true),s);balanced(s.businesses.shop,s);
 s=orderBusinessStock({...s,day:4},'shop','apples',10);b=s.businesses.shop;const due=b.stockroom!.orders[0].dueDay;b={...b,retail:{...b.retail!,store:{...b.retail!.store!,lastEventDay:3}}};b=advanceSupermarket(p,b,.1,1,4);assert.equal(b.stockroom!.orders[0].dueDay,due+1);assert.equal(advanceSupermarket(p,b,.1,1,4).stockroom!.orders[0].dueDay,due+1);
});

test('every supermarket shelf, checkout and staff aisle has a collision-free route at all store levels',()=>{
 for(let n=1;n<=5;n++){
  const s=level(n),b={...s.businesses.shop,retail:{...s.businesses.shop.retail!,shelves:RETAIL_PRODUCTS.filter(x=>productUnlocked(s.businesses.shop,x.id)).map(x=>x.id)}};
  for(const floor of n>=4?[0,1]:[0]){
   const layout=supermarketNavigation(b,floor),products=b.retail.shelves.filter(id=>retailProductFloor(id)===floor);
   for(const id of products){const target=supermarketProductPoint(b,id);assert.ok(walkablePoint(layout,target),`Level ${n} ${id} target ${JSON.stringify(target)}`);const path=lodgingWalkingPath(layout,layout.entrance,target);assert.ok(path.length,`Level ${n} ${id} entrance route`);for(let i=1;i<path.length;i++)assert.ok(clearWalkingSegment(layout,path[i-1],path[i]),id);assert.ok(Number.isFinite(supermarketTravelSeconds(b,id).checkout),`${id} checkout route`);}
   for(const point of [...layout.queue,...layout.care,...layout.staff])assert.ok(lodgingWalkingPath(layout,layout.entrance,point).length,`Level ${n} F${floor} staff/queue ${JSON.stringify(point)}`);
   const g=floor?electronicsGeometry(b):supermarketFixtureGeometry(n);assert.ok(g.getAttribute('position').count<120000);for(const attr of ['position','color','normal'])assert.ok(Array.from(g.getAttribute(attr).array).every(Number.isFinite));g.dispose();
  }
 }
});

test('specialists respect level gates and live supermarket weeks retain balanced separate accounts',()=>{
 let s=fresh().district;assert.equal(hireBusinessStaff(s,'shop','electronics').businesses.shop,s.businesses.shop);assert.equal(hireBusinessStaff(s,'shop','cleaner').businesses.shop,s.businesses.shop);
 s=level(4);s=hireBusinessStaff(s,'shop','electronics');assert.equal(s.businesses.shop.hires!.electronics,1);
 let e=fresh();e=startEmpireWeek(e);for(let i=0;i<500&&e.district.week===1;i++)e=advanceEmpire(e,1,advanceGame);
 assert.equal(e.district.week,2);assert.ok(e.district.businesses.shop.venue!.totalServed>0);balanced(e.district.businesses.shop,e.district);assert.ok(e.district.businesses.shop.retail!.store!.metrics['Produce & bakery']!.sales>0);
});
