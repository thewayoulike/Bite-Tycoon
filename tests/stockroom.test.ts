import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,advanceGame} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,parseEmpireSave,advanceEmpire,startEmpireWeek} from '../src/empire/empire';
import {propertyById} from '../src/prototype/expansionModel';
import {venueFinancials} from '../src/empire/venueFinance';
import {chooseRestaurantType} from '../src/restaurantTypes';
import {ingredientDefinition,ensureRestaurantStockroom,orderRestaurantStock,advanceRestaurantStockroom,restaurantStockViews,manageRestaurantStockroom,setRestaurantReorder} from '../src/inventory/restaurantStockroom';
import {businessStockViews,orderBusinessStock,advanceBusinessStockroom,manageBusinessStockroom,consumeBusinessSupplies,setBusinessReorder} from '../src/inventory/businessStockroom';
import {stockQuote,incoming,transitValue,dirtyValue,batchValue} from '../src/inventory/stockroom';
import {cumulativeProfitLoss} from '../src/empire/weeklyFinance';
const fresh=()=>unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.001,`${a} != ${b}`);
test('standard restaurant stock is paid once, delivered next morning, persisted and never counted as consumed in transit',()=>{
 let r=ensureRestaurantStockroom(chooseRestaurantType(structuredClone(INITIAL_STATE),'fastfood'));
 const cash=r.money,qty=r.inventory.bun??0;r=orderRestaurantStock(r,'bun',10);
 assert.equal(r.inventory.bun??0,qty);assert.equal(incoming(r.stockroom,'bun'),10);near(r.money,cash-stockQuote(ingredientDefinition('bun'),10));
 const empire=createEmpire(r),loaded=parseEmpireSave(JSON.stringify(empire))!;assert.deepEqual(loaded.restaurants.diner.stockroom,r.stockroom);
 const cost=r.stockroom!.orders[0].cost,beforeValue=Object.values(r.inventoryBatches).flat().reduce((n,b)=>n+b.qty*b.costPerUnit,0)+transitValue(r.stockroom);
 r=advanceRestaurantStockroom({...r,time:15});assert.equal(r.inventory.bun,qty+10);assert.equal(r.stockroom!.orders.length,0);near(r.money,cash-cost);
 assert.equal(advanceRestaurantStockroom(r),r);near(Object.values(r.inventoryBatches).flat().reduce((n,b)=>n+b.qty*b.costPerUnit,0),beforeValue);
});
test('emergency delivery is immediate, premiums and discounts enter exact batch cost, invalid orders are ignored',()=>{
 let r=ensureRestaurantStockroom(structuredClone(INITIAL_STATE));const cash=r.money,qty=r.inventory.rice??0;
 r=orderRestaurantStock(r,'rice',50,'emergency');assert.equal(r.inventory.rice,qty+50);near(r.money,cash-stockQuote(ingredientDefinition('rice'),50,'emergency'));
 near(r.inventoryBatches.rice.at(-1)!.costPerUnit,stockQuote(ingredientDefinition('rice'),50,'emergency')/50);
 assert.equal(orderRestaurantStock(r,'rice',-4),r);assert.equal(orderRestaurantStock(r,'rice',NaN),r);
 const before=r.stockroom;assert.equal(setRestaurantReorder(r,'rice',{minimum:20,target:10,maximum:30}).stockroom,before);
});
test('restaurant manager buys complete meal ingredients, counts shipments and respects custom maximum and protected funds',()=>{
 let r=ensureRestaurantStockroom(chooseRestaurantType(structuredClone(INITIAL_STATE),'fastfood'));
 r={...r,money:1000,inventory:{},inventoryBatches:{},phase:'service',staff:{...r.staff,hasManager:true},manager:{...r.manager,enabled:true,budget:800,reserve:150},cashProtection:{wages:600,rent:0,loans:0,deposits:0,total:600,arrears:0}};
 r=setRestaurantReorder(r,'bun',{minimum:2,target:4,maximum:4});r=manageRestaurantStockroom(r);
 assert.ok(r.stockroom!.orders.length);assert.ok(r.money>=750-.001);assert.ok(incoming(r.stockroom,'bun')<=4);
 const again=manageRestaurantStockroom(r,true);assert.ok(again.money<=r.money);assert.ok(again.money>=750-.001);
 const third=manageRestaurantStockroom(again,true);assert.equal(third.stockroom!.orders.length,again.stockroom!.orders.length);
 const views=restaurantStockViews(third);assert.ok(views.some(v=>v.reason==='Already on order'||v.reason==='Cash protected for bills'));
});
test('all business stockrooms use identical delivery, FIFO, reservation, capacity and lock rules',()=>{
 let s=fresh().district;
 for(const id of ['hotel','apartments','park','shop']){
  const p=propertyById(id)!,before=s.businesses[id],view=businessStockViews(p,before,s)[0];
  // Free space by a real service consumption, retaining actual FIFO costs.
  if(!before.retail)s={...s,businesses:{...s.businesses,[id]:consumeBusinessSupplies(p,before,{[view.definition.id]:10})!}};
  const current=s.businesses[id],openingCash=current.cash;
  s=orderBusinessStock(s,id,view.definition.id,5);const ordered=s.businesses[id];
  if(view.definition.kind==='reusable'){assert.equal(ordered.cash,openingCash);assert.ok(dirtyValue(ordered.stockroom)>0);continue;}
  assert.equal(incoming(ordered.stockroom,view.definition.id),5);
  const f=venueFinancials(p,ordered,s);near(f.assets,f.liabilities+f.equity);near(f.closingCash,ordered.cash);
  const delivered=advanceBusinessStockroom(p,ordered,s.week,2);assert.equal(incoming(delivered.stockroom,view.definition.id),0);assert.equal(delivered.cash,ordered.cash);assert.equal(advanceBusinessStockroom(p,delivered,s.week,2),delivered);
 }
 assert.equal(orderBusinessStock(s,'shop','tv',1),s);
 const shop=s.businesses.shop,withQueue={...shop,venue:{...shop.venue!,visitors:[{id:5,seed:1,state:'waiting' as const,patience:100,remaining:0,unit:null,productId:'apples',quantity:3,basket:true}]}};
 const apples=businessStockViews(propertyById('shop')!,withQueue,s).find(v=>v.definition.id==='apples')!;assert.equal(apples.reserved,3);assert.equal(apples.available,apples.onHand-3);
});
test('hotel linen stays an asset through laundry, uses cleaning supplies, loses condition and retires after ten uses',()=>{
 const s=fresh().district,p=propertyById('hotel')!;let b=s.businesses.hotel;const cash=b.cash;
 b={...b,hires:{laundry:20},lodging:{...b.lodging!,facilities:['laundry'],laundryMode:'inhouse'}};
 const before=venueFinancials(p,b,s);b=consumeBusinessSupplies(p,b,{'stock-0':100,'stock-3':100,'stock-2':2})!;
 near(dirtyValue(b.stockroom),70);near(venueFinancials(p,b,s).costOfSupplies-before.costOfSupplies,.5);
 b=advanceBusinessStockroom(p,b,1,2);assert.equal(b.inventory!['stock-0'],100);assert.equal(b.stockroom!.batches!['stock-0'][0].condition,90);assert.equal(b.cash,cash-20);
 for(let day=3;day<=11;day++){if(b.inventory!['stock-2']<20)b=orderBusinessStock({...s,week:Math.floor((day-2)/7)+1,day:(day-2)%7+1,businesses:{...s.businesses,hotel:b}},'hotel','stock-2',50,'emergency').businesses.hotel;b=consumeBusinessSupplies(p,b,{'stock-0':100})!;b=advanceBusinessStockroom(p,b,Math.floor((day-1)/7)+1,(day-1)%7+1);}
 assert.equal(b.inventory!['stock-0'],0);near(b.stockroom!.spoilage!,40);near(dirtyValue(b.stockroom),0);
 const f=venueFinancials(p,b,s);near(f.assets,f.liabilities+f.equity);near(f.closingCash,b.cash);
});
test('expired food is removed at exact purchased cost; electronics retain their value',()=>{
 let s=fresh().district;const p=propertyById('shop')!;s={...s,businesses:{...s.businesses,shop:{...s.businesses.shop,retail:{...s.businesses.shop.retail!,electronicsUnlocked:true,store:{...s.businesses.shop.retail!.store!,level:4}}}}};
 s=orderBusinessStock(s,'shop','tv',1,'emergency');s=orderBusinessStock(s,'shop','apples',25,'emergency');let b=s.businesses.shop;
 const value=batchValue(b.retail!.batches!.apples),cash=b.cash;b=advanceBusinessStockroom(p,b,2,2);
 assert.equal(b.retail!.stock.apples,0);assert.equal(b.retail!.stock.tv,1);near(b.cash,cash);assert.ok(b.stockroom!.spoilage!>=value);
 const f=venueFinancials(p,b,s);near(f.assets,f.liabilities+f.equity);near(f.closingCash,b.cash);
});
test('reorder controls persist, enforce min/target/max, and manager orders do not duplicate on repeated clicks',()=>{
 let s=fresh().district;s=setBusinessReorder(s,'shop','apples',{minimum:30,target:40,maximum:50});
 s={...s,businesses:{...s.businesses,shop:{...s.businesses.shop,manager:{enabled:true,budget:1000,spent:0,reserve:500}}}};
 s=manageBusinessStockroom(s,'shop',true);const cash=s.businesses.shop.cash,orders=s.businesses.shop.stockroom!.orders;
 s=manageBusinessStockroom(s,'shop',true);assert.equal(s.businesses.shop.cash,cash);assert.deepEqual(s.businesses.shop.stockroom!.orders,orders);
 assert.equal(setBusinessReorder(s,'shop','apples',{minimum:60,target:40,maximum:50}).businesses.shop.stockroom,s.businesses.shop.stockroom);
 const e=fresh();e.district=s;assert.deepEqual(parseEmpireSave(JSON.stringify(e))!.district.businesses.shop.stockroom,s.businesses.shop.stockroom);
});
test('live clock receives orders across properties and full weeks preserve financial balance',()=>{
 let e=fresh();e.district=orderBusinessStock(e.district,'shop','apples',10);e=startEmpireWeek(e);
 for(let i=0;i<500&&e.district.week===1;i++)e=advanceEmpire(e,1,advanceGame);
 assert.equal(e.district.week,2);assert.equal(e.district.businesses.shop.stockroom!.orders.length,0);
 for(const id of ['hotel','apartments','park','shop']){const b=e.district.businesses[id],f=venueFinancials(propertyById(id)!,b,e.district);near(f.assets,f.liabilities+f.equity);near(f.closingCash,b.cash);}
 const r=e.restaurants.diner,p=propertyById('diner')!,totals=cumulativeProfitLoss(p,e.district.businesses.diner,e.district,r);assert.ok(totals.cogs>=-.001);
});
