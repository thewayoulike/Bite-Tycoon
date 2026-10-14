import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,advanceGame} from '../src/hooks/useGameLoop';
import {createFastTrackEmpire,createEmpire,unlockTestDistrict,applyDistrictUpdate,startEmpireWeek,advanceEmpire} from '../src/empire/empire';
import {acquire,propertyById,finishWeek,type Business} from '../src/prototype/expansionModel';
import {startVenueWeek} from '../src/empire/venueSimulation';
import {ensureCrew} from '../src/career/crew';
import {RETAIL_PRODUCTS,retailProductFloor,retailItemValue} from '../src/empire/retail';
import {retailStorage} from '../src/empire/retailRange';
import {supermarketDisplays} from '../src/empire/supermarketLayout';
import {supermarketStockUnits,supermarketStockGeometry} from '../src/components/SupermarketInterior3D';
import {supermarketShelfStatus,replenishShelf,confirmShelfPlan,storeLossSummary,shelfQuantity,basketQuantity,storeBasket} from '../src/empire/supermarket';
import {advanceSupermarket,collectStoreBasket,checkoutStore} from '../src/empire/supermarketSimulation';
import {advanceBusinessStockroom,businessStockViews,manageBusinessStockroom,ensureBusinessStockroom,setBusinessReorder} from '../src/inventory/businessStockroom';
import {openBusinessBooks,venueFinancials} from '../src/empire/venueFinance';
import {stampBatches} from '../src/inventory/stockroom';
const p=propertyById('shop')!;
const fresh=()=>unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE).district;
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.02,`${a} != ${b}`);
const withShopper=(b:Business,item='apples',quantity=3):Business=>({...b,venue:{...b.venue!,running:true,clock:30,arrivalTimer:1000,visitors:[{id:1,seed:1,state:'waiting',remaining:0,unit:null,patience:50,shoppingTime:100,productId:item,quantity}]}});

test('a first supermarket can serve a busy opening week with its included cashier and stock assistant',()=>{
 let e=createFastTrackEmpire(structuredClone(INITIAL_STATE));e.district.weatherSeed=123;
 e=applyDistrictUpdate(e,s=>acquire(s,'shop','owned'),INITIAL_STATE);
 assert.ok(e.district.businesses.shop);
 e=startEmpireWeek(e);
 for(let i=0;i<600&&e.district.week===1;i++)e=advanceEmpire(e,1,advanceGame);
 assert.equal(e.district.week,2);
 const b=e.district.businesses.shop,report=e.district.closedWeek!.reports.find(r=>r.id==='shop')!;
 assert.ok(b.venue!.totalServed>=45,`${b.venue!.totalServed} served`);
 assert.ok(b.venue!.week.lost<=5,`${b.venue!.week.lost} lost`);
 assert.ok(report.revenue>=450,`${report.revenue} sales`);
 assert.ok(report.profit>0,`${report.profit} operating profit`);
 const f=venueFinancials(p,b,e.district);near(f.assets,f.liabilities+f.equity);near(f.closingCash,b.cash);
});

test('selecting the full range does not send every shopper to unpurchased products',()=>{
 let s=confirmShelfPlan(fresh(),'shop',0),b=startVenueWeek(p,s.businesses.shop,1);
 const openingStock=Object.values(b.retail!.stock).reduce((n,v)=>n+v,0),cash=b.cash;
 for(let t=0;t<180;t++)b=advanceSupermarket(p,b,1,1,1);
 assert.ok(b.venue!.week.served>=45);assert.ok(b.venue!.week.lost<=5);
 assert.equal(b.retail!.stock.mugs,undefined,'no free stock for newly selected products');
 const sold=Object.values(b.retail!.store!.metrics).reduce((n,m)=>n+(m?.units??0),0);
 near(Object.values(b.retail!.stock).reduce((n,v)=>n+v,0),openingStock-sold);
 near(b.cash,cash+b.venue!.week.revenue);
});

test('a shopper buys the last available unit instead of waiting forever for an impossible three-unit basket',()=>{
 let b=withShopper(fresh().businesses.shop);b={...b,retail:{...b.retail!,stock:{apples:1},batches:{apples:[{qty:1,costPerUnit:1.2}]},store:{...b.retail!.store!,shelf:{apples:1}}}};
 b=collectStoreBasket(b,1);assert.ok(b.venue!.visitors[0].basket);assert.equal(b.venue!.visitors[0].quantity,1);
 b={...b,venue:{...b.venue!,clock:b.venue!.visitors[0].checkoutReadyAt!}};const cash=b.cash;
 b=checkoutStore(b,1,1);near(b.cash,cash+3);assert.equal(b.retail!.stock.apples,0);assert.equal(shelfQuantity(b,'apples'),0);
});

test('shelf refill prioritizes a waiting shopper over unrelated low-stock products',()=>{
 let b=withShopper(fresh().businesses.shop,'rice');b={...b,retail:{...b.retail!,shelves:['apples','rice'],store:{...b.retail!.store!,shelf:{apples:0,rice:1}}}};
 b=replenishShelf(b);assert.equal(b.retail!.store!.job,'rice');assert.ok(shelfQuantity(b,'rice')>=3);assert.equal(shelfQuantity(b,'apples'),0);
});

test('each lost shopper has a cause, and an off-duty cashier cannot complete sales',()=>{
 for(const reason of ['stock','receiving','refill','checkout'] as const){
  let b=withShopper(fresh().businesses.shop);b={...b,crew:ensureCrew(p,b).map(e=>({...e,training:999})),retail:{...b.retail!,stock:{apples:reason==='stock'?0:5},store:{...b.retail!.store!,shelf:{apples:0},receiving:reason==='receiving'?{apples:5}:{}}},venue:{...b.venue!,visitors:b.venue!.visitors.map(v=>({...v,patience:2,basket:reason==='checkout',checkoutReadyAt:0,agreedRate:3}))}};
  const cash=b.cash;b=advanceSupermarket(p,b,1,1,1);assert.equal(b.cash,cash);assert.equal(b.venue!.week.served,0);
  b=advanceSupermarket(p,b,2,1,1);assert.equal(b.venue!.week.lost,1);assert.equal(b.retail!.store!.losses?.[reason],1);assert.ok(storeLossSummary(b));
  b=startVenueWeek(p,{...b,venue:{...b.venue!,running:false}},2);assert.equal(b.venue!.week.lost,0);assert.deepEqual(b.retail!.store!.losses,{});
 }
});

test('week closing records unfinished shoppers, while old unrecorded departures stay explicitly unknown',()=>{
 let s=fresh(),b=withShopper(s.businesses.shop);b.venue!.week.lost=19;
 assert.match(storeLossSummary(b),/19 earlier departures/);
 s=finishWeek({...s,businesses:{shop:b}},false);assert.equal(s.businesses.shop.venue!.week.lost,20);assert.equal(s.businesses.shop.retail!.store!.losses?.closing,1);
});

test('automatic grocery forecasts keep a small usable minimum even after a long slow-sales spell',()=>{
 let s=fresh(),b=ensureBusinessStockroom(p,s.businesses.shop,1,1);
 b={...b,manager:{enabled:true,budget:1000,spent:0,reserve:150},stockroom:{...b.stockroom!,usage:{apples:{day:1,used:0,rate:1e-12}}},retail:{...b.retail!,stock:{...b.retail!.stock,apples:1}}};s={...s,businesses:{shop:b}};
 const view=businessStockViews(p,b,s).find(v=>v.definition.id==='apples')!;assert.ok(view.rule.minimum>=2);assert.ok(view.rule.target>=3);
 s=manageBusinessStockroom(s,'shop',true);assert.ok(s.businesses.shop.stockroom!.orders.some(o=>o.itemId==='apples'));
});

test('full-range displays use all shelf tiers and cabinets, but never render unowned or backroom stock',()=>{
 const ids=RETAIL_PRODUCTS.filter(p=>!retailProductFloor(p.id)).map(p=>p.id),slots=supermarketDisplays(ids);
 for(const aisle of [0,1,2])assert.equal(new Set(slots.filter(s=>s.aisle===aisle).map(s=>s.y)).size,4);
 assert.equal(new Set(slots.filter(s=>s.kind==='bakery').map(s=>s.y)).size,3);
 for(const center of [-2.1,.45,3])assert.equal(new Set(slots.filter(s=>s.kind==='chilled'&&Math.abs(s.x-center)<1.1).map(s=>s.y)).size,3);
 let b=fresh().businesses.shop;b={...b,retail:{...b.retail!,shelves:ids,stock:Object.fromEntries(ids.map(id=>[id,20])),store:{...b.retail!.store!,shelf:{}}}};
 assert.equal(supermarketStockUnits(b).length,0);assert.equal(supermarketShelfStatus(b).stocked,0);assert.equal(supermarketShelfStatus(b).refill,145);
 b.retail!.store!.shelf=Object.fromEntries(ids.map(id=>[id,12]));assert.equal(supermarketShelfStatus(b).stocked,145);
 const units=supermarketStockUnits(b);for(const id of ids)assert.ok(units.filter(u=>u.id===id).length<=12);
 assert.ok(units.filter(s=>s.kind==='grocery').every(s=>Math.abs(s.x-[-5,0,5][s.aisle!])>.2));
 const geometry=supermarketStockGeometry(b);assert.ok(geometry.getAttribute('position').count<350000);geometry.dispose();
});

test('only perishable product batches expire; durable home goods retain value even with an obsolete saved expiry date',()=>{
 let s=fresh(),b=s.businesses.shop;const stock=Object.fromEntries(RETAIL_PRODUCTS.map(p=>[p.id,2]));
 b={...b,books:undefined,stockroom:undefined,retail:{...b.retail!,stock,batches:Object.fromEntries(RETAIL_PRODUCTS.map(p=>[p.id,[{qty:2,costPerUnit:p.cost,receivedDay:1,expiresDay:2}]])),store:{...b.retail!.store!,shelf:{...stock},receiving:{}}}};
 b=ensureBusinessStockroom(p,b,1,1);b=openBusinessBooks(p,b,s);const cash=b.cash;
 const expected=RETAIL_PRODUCTS.filter(p=>retailStorage(p).shelfLife).reduce((n,p)=>n+p.cost*2,0);
 b=advanceBusinessStockroom(p,b,1,2);
 for(const item of RETAIL_PRODUCTS){const perishable=!!retailStorage(item).shelfLife;assert.equal(b.retail!.stock[item.id],perishable?0:2,item.id);near(retailItemValue(b.retail!,item.id),perishable?0:item.cost*2);}
 near(b.cash,cash);near(b.stockroom!.spoilage!,expected);
 const f=venueFinancials(p,b,s);near(f.spoilage,expected);near(f.costOfSupplies,0);near(f.assets,f.liabilities+f.equity);
 const repeated=advanceBusinessStockroom(p,b,1,2);near(repeated.stockroom!.spoilage!,expected);
 near(Object.values(b.retail!.store!.metrics).reduce((n,m)=>n+(m?.waste??0),0),expected);
});

test('food expiry follows each delivered batch date and does not renew when a save is read',()=>{
 const def=businessStockViews(p,ensureBusinessStockroom(p,fresh().businesses.shop,1,1),fresh()).find(v=>v.definition.id==='apples')!.definition;
 const batches=stampBatches([{qty:3,costPerUnit:1,receivedDay:1},{qty:4,costPerUnit:2}],def,5);
 assert.equal(batches[0].expiresDay,8);assert.equal(batches[1].expiresDay,12);assert.deepEqual(stampBatches(batches,def,7),batches);
 let b=fresh().businesses.shop;b={...b,retail:{...b.retail!,stock:{apples:7},batches:{apples:batches},store:{...b.retail!.store!,shelf:{apples:7}}},stockroom:undefined};b=ensureBusinessStockroom(p,b,1,5);
 b=advanceBusinessStockroom(p,b,2,1);assert.equal(b.retail!.stock.apples,4);near(b.stockroom!.spoilage!,3);assert.equal(shelfQuantity(b,'apples'),4);
 b=advanceBusinessStockroom(p,b,2,5);assert.equal(b.retail!.stock.apples,0);near(b.stockroom!.spoilage!,11);
});

test('mixed baskets walk between products, reserve every item and charge FIFO costs once at the collected prices',()=>{
 let b=withShopper(fresh().businesses.shop,'apples',2);
 b={...b,venue:{...b.venue!,visitors:b.venue!.visitors.map(v=>({...v,basketItems:[],shoppingList:[{id:'bread',quantity:1},{id:'rice',quantity:2}]}))}};
 const before=b,cash=b.cash;
 b=collectStoreBasket(b,1);assert.equal(b.venue!.visitors[0].basket,false);assert.equal(basketQuantity(b,'apples'),2);assert.equal(b.venue!.visitors[0].productId,'bread');
 assert.equal(collectStoreBasket(b,1),b,'no pickup while still walking');
 for(let i=0;i<2;i++){b={...b,venue:{...b.venue!,clock:b.venue!.visitors[0].browseReadyAt!}};b=collectStoreBasket(b,1);}
 const shopper=b.venue!.visitors[0];assert.equal(storeBasket(b,shopper).length,3);assert.equal(basketQuantity(b,'rice'),2);assert.ok(shopper.basket);
 // Changing today's menu cannot reprice groceries already picked up.
 b={...b,menu:{...b.menu,apples:{enabled:true,price:99}},venue:{...b.venue!,clock:shopper.checkoutReadyAt!}};
 b=checkoutStore(b,1,1);near(b.cash-cash,22);assert.equal(b.venue!.week.served,1);
 for(const [id,qty]of [['apples',2],['bread',1],['rice',2]] as const){assert.equal(b.retail!.stock[id],before.retail!.stock[id]-qty);assert.equal(basketQuantity(b,id),0);}
 near(b.retail!.store!.sales.slice(-3).reduce((n,s)=>n+s.cost*s.qty,0),2.4+1.5+5);
 assert.equal(checkoutStore(b,1,1,1),b,'a completed basket cannot be billed twice');
});

test('expired basket items are removed without discarding surviving household goods or reserving the same unit twice',()=>{
 let b=withShopper(fresh().businesses.shop);
 b={...b,crew:ensureCrew(p,b).map(e=>({...e,training:999})),retail:{...b.retail!,stock:{apples:0,rice:1}},venue:{...b.venue!,visitors:[1,2].map(id=>({...b.venue!.visitors[0],id,basket:true,checkoutReadyAt:999,basketItems:[{id:'apples',quantity:1,rate:3},{id:'rice',quantity:1,rate:6}]}))}};
 b=advanceSupermarket(p,b,.25,1,1);
 assert.equal(basketQuantity(b,'apples'),0);assert.equal(basketQuantity(b,'rice'),1);
 assert.equal(b.venue!.visitors[0].basket,true);assert.equal(b.venue!.visitors[1].basket,false);
});

test('expanding the range shares the forecast instead of assigning a full small-store forecast to every item',()=>{
 let s=fresh(),b=ensureBusinessStockroom(p,s.businesses.shop,1,1);
 const narrow=businessStockViews(p,b,s).find(v=>v.definition.id==='apples')!;
 s=confirmShelfPlan({...s,businesses:{shop:b}},'shop',0);b=s.businesses.shop;
 const broad=businessStockViews(p,b,s).find(v=>v.definition.id==='apples')!;
 assert.ok(broad.rule.target<narrow.rule.target);assert.equal(broad.rule.target,3);
 s=setBusinessReorder(s,'shop','apples',{minimum:2,target:4,maximum:8});
 assert.deepEqual(businessStockViews(p,s.businesses.shop,s).find(v=>v.definition.id==='apples')!.rule,{minimum:2,target:4,maximum:8});
});

test('a full-range supermarket remains viable over six weeks including purchasing, wages, expiry and depreciation',()=>{
 let e=createFastTrackEmpire(structuredClone(INITIAL_STATE));e.district.weatherSeed=123;
 e=applyDistrictUpdate(e,s=>acquire(s,'shop','owned'),INITIAL_STATE);
 e=applyDistrictUpdate(e,s=>confirmShelfPlan(s,'shop',0),INITIAL_STATE);
 e=applyDistrictUpdate(e,s=>{const b=s.businesses.shop;return {...s,businesses:{shop:{...b,hires:{care:1,cleaner:1,specialist:1,service:1},manager:{enabled:true,budget:1000,spent:0,reserve:150}}}};},INITIAL_STATE);
 const startingCash=e.district.businesses.shop.cash;let totalProfit=0,totalSales=0;
 for(let week=1;week<=6;week++){
  e=startEmpireWeek(e);for(let tick=0;tick<800&&e.district.week===week;tick++)e=advanceEmpire(e,.25,advanceGame);
  assert.equal(e.district.week,week+1);
  const b=e.district.businesses.shop,r=e.district.closedWeek!.reports.find(r=>r.id==='shop')!,f=venueFinancials(p,b,e.district);
  totalProfit+=r.profit;totalSales+=r.revenue;
  assert.ok(r.revenue>1000,`week ${week}: sales ${r.revenue}`);assert.ok(r.profit>0,`week ${week}: profit ${r.profit}; spoilage ${r.spoilage}`);
  assert.ok(r.spoilage<r.revenue*.25,`week ${week}: spoilage ${r.spoilage} vs sales ${r.revenue}`);
  near(r.wages,285);assert.ok(r.depreciation!>200);near(f.assets,f.liabilities+f.equity);near(f.closingCash,b.cash);
  assert.ok(b.manager!.spent<=1000.01);assert.ok(b.cash>=0);
 }
 assert.ok(totalProfit>1500);assert.ok(totalSales>9000);assert.ok(e.district.businesses.shop.cash>startingCash);
});
