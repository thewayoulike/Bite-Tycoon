import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,parseEmpireSave} from '../src/empire/empire';
import {propertyById} from '../src/prototype/expansionModel';
import {RETAIL_PRODUCTS,createRetail,retailPrice,retailProductFloor} from '../src/empire/retail';
import {retailStorage,SUPERMARKET_STARTER_IDS} from '../src/empire/retailRange';
import {advanceStoreLevel,confirmShelfPlan,shelfPlan,productUnlocked,receiveStoreGoods,replenishShelf,shelfQuantity,department} from '../src/empire/supermarket';
import {orderBusinessStock,businessStockDefinitions} from '../src/inventory/businessStockroom';
import {collectStoreBasket,checkoutStore} from '../src/empire/supermarketSimulation';
import {venueFinancials} from '../src/empire/venueFinance';
import {supermarketDisplays} from '../src/empire/supermarketLayout';
import {supermarketStockGeometry} from '../src/components/SupermarketInterior3D';
const fresh=()=>unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.001,`${a} != ${b}`);

test('full supermarket range covers daily life with unique priced products and correct storage',()=>{
 assert.ok(RETAIL_PRODUCTS.length>=150);assert.equal(new Set(RETAIL_PRODUCTS.map(p=>p.id)).size,RETAIL_PRODUCTS.length);
 for(const p of RETAIL_PRODUCTS){assert.ok(p.cost>0&&p.price>p.cost,p.id);assert.ok(p.name&&p.icon&&p.color);}
 for(const category of ['Produce','Bakery','Pantry','Chilled','Meat & Fish','Frozen','Household','Personal care','Baby care','Pet care','Home & kitchen','Stationery','Clothing basics'])assert.ok(RETAIL_PRODUCTS.filter(p=>p.category===category).length>=4,category);
 const defs=businessStockDefinitions(propertyById('shop')!,fresh().district.businesses.shop);
 for(const id of ['soap','shampoo','baby_wipes','dog_food','socks','notebook']){assert.equal(defs.find(d=>d.id===id)!.shelfLife,undefined);assert.equal(defs.find(d=>d.id===id)!.location,'Household stockroom');}
 assert.equal(defs.find(d=>d.id==='ice_cream')!.location,'Freezer');assert.equal(defs.find(d=>d.id==='salmon')!.location,'Chilled store');
 assert.equal(retailStorage(RETAIL_PRODUCTS.find(p=>p.id==='bread')!).location,'Bakery racks');
});

test('new stores have twenty stocked selections; old saves never receive unpurchased new stock',()=>{
 const retail=createRetail();assert.equal(retail.shelves.length,20);assert.deepEqual(retail.shelves,SUPERMARKET_STARTER_IDS);
 const empire=fresh(),b=empire.district.businesses.shop;
 for(const id of retail.shelves){assert.ok(productUnlocked(b,id));assert.ok(shelfQuantity(b,id)>0);assert.ok((retail.stock[id]??0)>=retail.store!.shelf[id]);}
 b.retail!.shelves=['apples','bread','milk'];const before=structuredClone(b.retail),cash=b.cash;
 const loaded=parseEmpireSave(JSON.stringify(empire))!.district.businesses.shop;
 assert.deepEqual(loaded.retail,JSON.parse(JSON.stringify(before)));assert.equal(loaded.cash,cash);assert.equal(loaded.retail!.stock.dog_food,undefined);
});

test('department plans include existing selections, charge fixtures once and respect level locks',()=>{
 let s=fresh().district;const b=s.businesses.shop,plan=shelfPlan(b,0,'Personal care');
 assert.equal(plan.ids.length,10);assert.ok(plan.addDry>0);assert.deepEqual(shelfPlan(b,0,'Baby care').ids,[]);
 s=confirmShelfPlan(s,'shop',0,'Personal care');const after=s.businesses.shop;
 near(after.cash,b.cash-plan.cost);assert.deepEqual(after.retail!.stock,b.retail!.stock);
 assert.ok(b.retail!.shelves.every(id=>after.retail!.shelves.includes(id)));assert.ok(plan.ids.every(id=>after.retail!.shelves.includes(id)));
 const repeated=confirmShelfPlan(s,'shop',0,'Personal care');near(repeated.businesses.shop.cash,after.cash);assert.deepEqual(repeated.businesses.shop.retail,after.retail);
 const f=venueFinancials(propertyById('shop')!,after,s);near(f.assets,f.liabilities+f.equity);
});

test('each category can be ordered, received, put on a shelf and sold through a real checkout',()=>{
 let s=fresh().district;s.businesses.shop.venue!.totalServed=1000;
 for(let i=1;i<5;i++)s=advanceStoreLevel(s,'shop');s=confirmShelfPlan(s,'shop',0);
 for(const [index,id] of ['toothbrushes','baby_wipes','dog_food','bath_towel','notebook','socks','salmon','ice_cream'].entries()){
  const before=s.businesses.shop;s=orderBusinessStock(s,'shop',id,2,'emergency');let b=s.businesses.shop;
  assert.equal(b.retail!.stock[id],2,id);assert.ok(b.cash<before.cash);assert.equal(b.retail!.store!.receiving[id],2);
  b=receiveStoreGoods(b);b=replenishShelf(b,id);assert.equal(shelfQuantity(b,id),2);
  b={...b,venue:{...b.venue!,running:true,clock:index*100,visitors:[{id:index+1,seed:index,state:'waiting',patience:100,remaining:0,unit:null,productId:id,quantity:1,shoppingTime:100}]}};
  b=collectStoreBasket(b,index+1,true);assert.ok(b.venue!.visitors[0].basket,id);
  b={...b,venue:{...b.venue!,clock:b.venue!.visitors[0].checkoutReadyAt!}};const cash=b.cash;
  b=checkoutStore(b,1,1,index+1);near(b.cash,cash+retailPrice(b,id));assert.equal(b.retail!.stock[id],1);assert.equal(b.retail!.store!.metrics[department(id)]!.units,1);
  s={...s,businesses:{...s.businesses,shop:b}};const f=venueFinancials(propertyById('shop')!,b,s);near(f.assets,f.liabilities+f.equity);
 }
});

test('all stocked products have stable shelf bays and bounded render geometry',()=>{
 const ids=RETAIL_PRODUCTS.filter(p=>!retailProductFloor(p.id)).map(p=>p.id),slots=supermarketDisplays(ids);
 assert.equal(slots.length,ids.length);assert.ok(slots.every(s=>[s.x,s.y,s.z].every(Number.isFinite)&&s.y>=.3&&s.y<2));
 for(const slot of slots)assert.deepEqual(supermarketDisplays([slot.id])[0],slot);
 assert.equal(new Set(slots.map(s=>[s.x,s.y,s.z].join(':'))).size,ids.length);
 const b=fresh().district.businesses.shop;b.retail={...b.retail!,shelves:ids,stock:Object.fromEntries(ids.map(id=>[id,18])),store:{...b.retail!.store!,shelf:Object.fromEntries(ids.map(id=>[id,18]))}};
 const model=supermarketStockGeometry(b);assert.ok(model.getAttribute('position').count<350000);
 for(const key of ['position','normal','color'])assert.ok(Array.from(model.getAttribute(key).array).every(Number.isFinite));
 model.computeBoundingBox();assert.ok(model.boundingBox!.min.x>=-9&&model.boundingBox!.max.x<=9);assert.ok(model.boundingBox!.min.z>=-10&&model.boundingBox!.max.z<=10);model.dispose();
});
