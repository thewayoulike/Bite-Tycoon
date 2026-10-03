import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,parseEmpireSave} from '../src/empire/empire';
import {RETAIL_PRODUCTS,retailDisplayCapacity,placeAllRetailProducts,setShelfProduct,orderRetailStock,retailProductFloor,unlockElectronicsFloor,ELECTRONICS_FLOOR_COST,ELECTRONICS_FLOOR_CUSTOMERS,autoRetailStock,setProductPrice,retailOrderCost,retailItemValue,consumeRetailStock} from '../src/empire/retail';
import {propertyById,setBusinessManager,hireBusinessStaff} from '../src/prototype/expansionModel';
import {retailManagerStatus,recommendedRetailBudget,retailRestockNeeds,SUPERMARKET_MAX_BUDGET} from '../src/empire/retail';
import {venueFinancials} from '../src/empire/venueFinance';
import {supermarketDisplays,supermarketFixtureGeometry,electronicsGeometry} from '../src/components/SupermarketInterior3D';
import {serveVenueVisitor,startVenueWeek} from '../src/empire/venueSimulation';

test('supermarket supports all grocery selections without losing existing stock or money',()=>{
 const empire=unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);
 let s=empire.district;const before=s.businesses.shop;
 s=placeAllRetailProducts(s,'shop',0);assert.equal(placeAllRetailProducts(s,'shop',0),s);
 for(const p of RETAIL_PRODUCTS)if(!s.businesses.shop.retail!.shelves.includes(p.id))s=setShelfProduct(s,'shop',p.id);
 assert.equal(s.businesses.shop.retail!.shelves.length,retailDisplayCapacity(0));
 assert.equal(s.businesses.shop.cash,before.cash);assert.deepEqual(s.businesses.shop.retail!.stock,before.retail!.stock);
 const unselected=RETAIL_PRODUCTS.find(p=>!s.businesses.shop.retail!.shelves.includes(p.id))!;
 assert.equal(setShelfProduct(s,'shop',unselected.id),s);
 const loaded=parseEmpireSave(JSON.stringify({...empire,district:s}))!;
 assert.deepEqual(loaded.district.businesses.shop.retail,s.businesses.shop.retail);
 for(const product of RETAIL_PRODUCTS.slice(12).filter(p=>retailProductFloor(p.id)===0)){
  const cash=s.businesses.shop.cash;s=orderRetailStock(s,'shop',product.id,10);
  assert.equal(s.businesses.shop.retail!.stock[product.id],10);assert.ok(Math.abs(s.businesses.shop.cash-(cash-product.cost*10))<.001);
 }
 const f=venueFinancials(propertyById('shop')!,s.businesses.shop,s);assert.ok(Math.abs(f.assets-f.liabilities-f.equity)<.001);
});

test('supermarket display slots stay distinct for every selectable product and fixtures stay within a bounded mesh',()=>{
 const slots=supermarketDisplays(RETAIL_PRODUCTS.map(p=>p.id));
 assert.equal(new Set(slots.map(s=>`${s.x}:${s.z}`)).size,RETAIL_PRODUCTS.filter(p=>retailProductFloor(p.id)===0).length);
 const geometry=supermarketFixtureGeometry();assert.ok(geometry.getAttribute('position').count<120000);
 for(const name of ['position','normal','color'])assert.ok(Array.from(geometry.getAttribute(name).array).every(Number.isFinite));
 geometry.computeBoundingBox();assert.ok(geometry.boundingBox!.min.x>=-9&&geometry.boundingBox!.max.x<=9);assert.ok(geometry.boundingBox!.min.z>=-10&&geometry.boundingBox!.max.z<=10);geometry.dispose();
});

test('electronics floor is earned and paid once, persists, and has separate display capacity with shared supermarket books',()=>{
 const empire=unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);let s=empire.district;
 for(const action of [setShelfProduct(s,'shop','tv'),orderRetailStock(s,'shop','tv',1),setProductPrice(s,'shop','tv',410)])assert.equal(action,s);
 assert.equal(unlockElectronicsFloor(s,'shop').businesses.shop,s.businesses.shop);
 const base=s.businesses.shop;s={...s,businesses:{...s.businesses,shop:{...base,venue:{...base.venue!,totalServed:ELECTRONICS_FLOOR_CUSTOMERS}}}};
 const poor={...s,businesses:{...s.businesses,shop:{...s.businesses.shop,cash:ELECTRONICS_FLOOR_COST-1}}};assert.equal(unlockElectronicsFloor(poor,'shop').businesses.shop,poor.businesses.shop);
 s=unlockElectronicsFloor(s,'shop');assert.equal(s.businesses.shop.cash,base.cash-ELECTRONICS_FLOOR_COST);assert.ok(s.businesses.shop.retail!.electronicsUnlocked);assert.equal(unlockElectronicsFloor(s,'shop'),s);
 for(const p of RETAIL_PRODUCTS)if(!s.businesses.shop.retail!.shelves.includes(p.id))s=setShelfProduct(s,'shop',p.id);
 assert.equal(s.businesses.shop.retail!.shelves.length,36);
 for(const p of RETAIL_PRODUCTS.filter(p=>retailProductFloor(p.id)===1))s=orderRetailStock(s,'shop',p.id,2);
 const geometry=electronicsGeometry(s.businesses.shop);assert.ok(geometry.getAttribute('position').count<120000);geometry.dispose();
 const stock=s.businesses.shop.retail!.stock.tv,cash=s.businesses.shop.cash,p=propertyById('shop')!;
 let b=startVenueWeek(p,s.businesses.shop,s.week);b={...b,venue:{...b.venue!,visitors:[{id:99,seed:9,state:'waiting',patience:30,remaining:0,unit:null,productId:'tv',quantity:1}]}};
 b=serveVenueVisitor(p,b,s.week,s.day,99);assert.equal(b.cash,cash+390);assert.equal(b.retail!.stock.tv,stock-1);
 s={...s,businesses:{...s.businesses,shop:b}};
 const f=venueFinancials(p,b,s);assert.ok(Math.abs(f.assets-f.liabilities-f.equity)<.001);assert.ok(Math.abs(f.closingCash-b.cash)<.001);
 const saved=parseEmpireSave(JSON.stringify({...empire,district:s}))!;assert.deepEqual(saved.district.businesses.shop.retail,b.retail);
 assert.deepEqual(s.businesses.diner,empire.district.businesses.diner);
});

test('electronics purchasing manager respects reserve and budget without buying grocery-sized appliance orders',()=>{
 let s=unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE).district;const base=s.businesses.shop;
 s={...s,businesses:{...s.businesses,shop:{...base,retail:{...base.retail!,electronicsUnlocked:true,shelves:['tv'],stock:{tv:0}},manager:{enabled:true,budget:1000,spent:0,reserve:base.cash-500}}}};
 s=autoRetailStock(s,'shop');assert.equal(s.businesses.shop.retail!.stock.tv,2);assert.equal(s.businesses.shop.manager!.spent,480);assert.equal(s.businesses.shop.cash,base.cash-480);
 assert.equal(autoRetailStock(s,'shop'),s);
});

test('an existing supermarket manager can fund every displayed product on both floors with the suggested budget',()=>{
 let s=unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE).district;const base=s.businesses.shop;
 s={...s,businesses:{...s.businesses,shop:{...base,retail:{...base.retail!,electronicsUnlocked:true,shelves:RETAIL_PRODUCTS.map(p=>p.id),stock:{},batches:{}},manager:{enabled:true,budget:80,spent:80,reserve:5000}}}};
 assert.match(retailManagerStatus(s.businesses.shop),/Weekly budget too low/);
 const budget=recommendedRetailBudget(s.businesses.shop);assert.ok(budget>300);
 s=setBusinessManager(s,'shop',{budget});
 for(const p of RETAIL_PRODUCTS)assert.equal(s.businesses.shop.retail!.stock[p.id],retailProductFloor(p.id)===1?3:30,p.name);
 const spent=RETAIL_PRODUCTS.reduce((sum,p)=>sum+retailOrderCost(p.id,retailProductFloor(p.id)===1?3:30),0);
 assert.ok(Math.abs(s.businesses.shop.manager!.spent-(80+spent))<.001);
 assert.ok(Math.abs(s.businesses.shop.cash-(base.cash-spent))<.001);
 assert.equal(s.businesses.shop.manager!.reserve,5000);assert.ok(s.businesses.shop.cash>=5000);
 assert.equal(retailRestockNeeds(s.businesses.shop).length,0);assert.match(retailManagerStatus(s.businesses.shop),/No displayed products need/);
 assert.equal(autoRetailStock(s,'shop'),s);assert.equal(s.businesses.diner.cash,25000);
});

test('manager prioritizes sold-out electronics over grocery top-ups and can afford discounted appliance bundles',()=>{
 let s=unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE).district;const base=s.businesses.shop;
 s={...s,businesses:{...s.businesses,shop:{...base,retail:{...base.retail!,electronicsUnlocked:true,shelves:['apples','laptop'],stock:{apples:14,laptop:0},batches:{}},manager:{enabled:true,budget:350,spent:0,reserve:150}}}};
 let ordered=autoRetailStock(s,'shop');assert.equal(ordered.businesses.shop.retail!.stock.laptop,1);assert.equal(ordered.businesses.shop.retail!.stock.apples,14);
 s={...s,businesses:{...s.businesses,shop:{...s.businesses.shop,retail:{...s.businesses.shop.retail!,shelves:['tv'],stock:{tv:0}},manager:{enabled:true,budget:684,spent:0,reserve:150}}}};
 ordered=autoRetailStock(s,'shop');assert.equal(ordered.businesses.shop.retail!.stock.tv,3);assert.equal(ordered.businesses.shop.manager!.spent,684);
});

test('supermarket manager keeps pause, floor locks and cash reserve controls; new hires get a suitable budget',()=>{
 let s=unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE).district;const base=s.businesses.shop;
 s={...s,businesses:{...s.businesses,shop:{...base,retail:{...base.retail!,electronicsUnlocked:true,shelves:['laptop'],stock:{laptop:0}},manager:{enabled:false,budget:300,spent:0,reserve:base.cash}}}};
 assert.equal(autoRetailStock(s,'shop'),s);assert.match(retailManagerStatus(s.businesses.shop),/paused/);
 s=setBusinessManager(s,'shop',{enabled:true,budget:1000});assert.equal(s.businesses.shop.cash,base.cash);assert.equal(s.businesses.shop.retail!.stock.laptop,0);assert.match(retailManagerStatus(s.businesses.shop),/reserve/);
 s=setBusinessManager(s,'shop',{budget:999999});assert.equal(s.businesses.shop.manager!.budget,SUPERMARKET_MAX_BUDGET);
 assert.equal(setBusinessManager(s,'shop',{budget:NaN}),s);assert.equal(setBusinessManager(s,'shop',{reserve:Infinity}),s);
 const locked={...s,businesses:{...s.businesses,shop:{...s.businesses.shop,retail:{...s.businesses.shop.retail!,electronicsUnlocked:false},manager:{...s.businesses.shop.manager!,reserve:0}}}};
 assert.equal(autoRetailStock(locked,'shop'),locked);
 s={...s,businesses:{...s.businesses,shop:{...s.businesses.shop,manager:undefined}}};
 s=hireBusinessStaff(s,'shop','manager');assert.ok(s.businesses.shop.manager!.budget>=1000);assert.equal(s.businesses.shop.retail!.stock.laptop,3);
});

test('bulk discounts use actual order size and FIFO purchase costs keep stock and financial statements balanced',()=>{
 assert.equal(retailOrderCost('apples',10),12);assert.equal(retailOrderCost('apples',25),28.5);assert.equal(retailOrderCost('apples',50),54);
 assert.equal(retailOrderCost('tv',1),240);assert.equal(retailOrderCost('tv',3),684);assert.equal(retailOrderCost('tv',5),1080);
 let s=unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE).district;
 const p=propertyById('shop')!,before=s.businesses.shop,initialStock=before.retail!.stock.apples;
 s=orderRetailStock(s,'shop','apples',25);s=orderRetailStock(s,'shop','apples',50);
 const b=s.businesses.shop;assert.equal(b.cash,before.cash-82.5);assert.ok(Math.abs(retailItemValue(b.retail!,'apples')-(initialStock*1.2+82.5))<.001);
 const consumed=consumeRetailStock(b.retail!,'apples',initialStock+5);assert.equal(consumed.stock.apples,70);assert.ok(Math.abs(retailItemValue(consumed,'apples')-(20*1.14+50*1.08))<.001);
 let checkedOut=startVenueWeek(p,b,s.week);checkedOut={...checkedOut,venue:{...checkedOut.venue!,visitors:[{id:80,seed:8,state:'waiting',patience:50,remaining:0,unit:null,productId:'apples',quantity:initialStock+5}]}};
 checkedOut=serveVenueVisitor(p,checkedOut,s.week,s.day,80);s={...s,businesses:{...s.businesses,shop:checkedOut}};
 const f=venueFinancials(p,checkedOut,s);assert.ok(Math.abs(f.costOfSupplies-(initialStock*1.2+5*1.14))<.001);assert.ok(Math.abs(f.assets-f.liabilities-f.equity)<.001);assert.ok(Math.abs(f.closingCash-checkedOut.cash)<.001);
 const almostFull={...s,businesses:{...s.businesses,shop:{...checkedOut,retail:{...checkedOut.retail!,stock:{...checkedOut.retail!.stock,apples:95},batches:undefined}}}};
 const clipped=orderRetailStock(almostFull,'shop','apples',50);assert.equal(clipped.businesses.shop.cash,checkedOut.cash-6);assert.equal(clipped.businesses.shop.retail!.stock.apples,100);
});
