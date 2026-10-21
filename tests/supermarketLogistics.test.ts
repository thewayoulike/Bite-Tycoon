import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict} from '../src/empire/empire';
import {propertyById,type Business} from '../src/prototype/expansionModel';
import {ensureCrew} from '../src/career/crew';
import {RETAIL_PRODUCTS,retailProductFloor} from '../src/empire/retail';
import {backroomQuantity,shelfQuantity,basketQuantity} from '../src/empire/supermarket';
import {advanceStoreLogistics,storeLogisticsStatus} from '../src/empire/supermarketLogistics';
import {advanceSupermarket} from '../src/empire/supermarketSimulation';
import {advanceVenues,startVenueWeek} from '../src/empire/venueSimulation';

const p=propertyById('shop')!;
const ids=RETAIL_PRODUCTS.filter(p=>!retailProductFloor(p.id)).map(p=>p.id);
function store(assistants=2,receivers=0,receiving=false):Business{
 const base=unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE).district.businesses.shop;
 const b=startVenueWeek(p,{...base,hires:{care:assistants-1,receiving:receivers}},1);
 return {...b,crew:ensureCrew(p,b),retail:{...b.retail!,shelves:ids,stock:Object.fromEntries(ids.map(id=>[id,12])),
  store:{...b.retail!.store!,shelf:{},receiving:receiving?Object.fromEntries(ids.map(id=>[id,12])):{},replenishTimer:0,receivingTimer:0}},
  venue:{...b.venue!,visitors:[],arrivalTimer:10000}};
}
const onShelves=(b:Business)=>ids.reduce((n,id)=>n+shelfQuantity(b,id),0);
const inReceiving=(b:Business)=>Object.values(b.retail!.store!.receiving).reduce((a,n)=>a+n,0);
function run(b:Business,seconds:number,step:number){for(let t=0;t<seconds-1e-9;t+=step)b=advanceStoreLogistics(b,Math.min(step,seconds-t));return b;}

test('two stock assistants perform twice the refill work, including at 5x-sized updates',()=>{
 for(const step of [.1,.25,1.25]){
  assert.equal(onShelves(run(store(1),6,step)),60);
  assert.equal(onShelves(run(store(2),6,step)),120);
 }
});

test('unpacking retains fractional work and processes all completed loads per update',()=>{
 for(const step of [.1,.25,1.25]){
  const one=store(1,0,true),two=store(2,0,true);
  assert.equal(inReceiving(one)-inReceiving(run(one,6,step)),72);
  assert.equal(inReceiving(two)-inReceiving(run(two,6,step)),144);
 }
});

test('small mixed-product deliveries share a cart instead of consuming one job per SKU',()=>{
 const original=store(2,0,true);
 original.retail!.stock=Object.fromEntries(ids.map(id=>[id,3]));
 original.retail!.store!.receiving={...original.retail!.stock};
 const b=run(original,23,.25);
 assert.equal(inReceiving(b),0);
 assert.equal(ids.filter(id=>shelfQuantity(b,id)===3).length,145);
 assert.deepEqual(b.retail!.stock,original.retail!.stock);
 assert.equal(b.cash,original.cash);assert.deepEqual(b.retail!.batches,original.retail!.batches);
 for(const id of ids)assert.equal(backroomQuantity(b,id)+shelfQuantity(b,id)+basketQuantity(b,id)+(b.retail!.store!.receiving[id]??0),b.retail!.stock[id]);
});

test('waiting shoppers get unpacking and shelf priority before patience expires',()=>{
 let b=store(2,0,true);
 b.venue!.visitors=[{id:1,seed:1,state:'waiting',remaining:0,unit:null,patience:.4,shoppingTime:100,browseReadyAt:0,productId:ids.at(-1)!,quantity:2,basketItems:[]}];
 b=advanceSupermarket(p,b,1.25,1,1);
 assert.equal(b.venue!.week.lost,0);
 assert.equal(b.venue!.visitors[0].basket,true);
 assert.equal(basketQuantity(b,ids.at(-1)!),2);
});

test('breaks, training, shifts and wrong-floor assignments stop stock work without banking it',()=>{
 for(const unavailable of [{task:'On break'},{training:20},{shift:'night' as const},{zone:1}]){
  let b=store(2,0,true);b.crew=b.crew!.map(e=>({...e,...unavailable}));
  b.retail!.store!.receivingTimer=.9;b.retail!.store!.replenishTimer=1;
  const stopped=run(b,6,1.25);
  assert.equal(onShelves(stopped),0);assert.equal(inReceiving(stopped),inReceiving(b));
  assert.equal(stopped.retail!.store!.receivingTimer,0);assert.equal(stopped.retail!.store!.replenishTimer,0);
  assert.match(storeLogisticsStatus(stopped),/0 stock assistants.*0 receiving clerks.*waiting for staff/);
  stopped.crew=ensureCrew(p,{...stopped,crew:undefined});
  const resumed=advanceStoreLogistics(stopped,.1);assert.equal(onShelves(resumed),0);assert.equal(inReceiving(resumed),inReceiving(b));
 }
});

test('a receiving clerk unpacks while stock assistants are unavailable, without stocking shelves',()=>{
 let b=store(2,1,true);b.crew=b.crew!.map(e=>e.role==='care'?{...e,training:99}:e);
 const next=advanceStoreLogistics(b,1);
 assert.equal(inReceiving(b)-inReceiving(next),80);assert.equal(onShelves(next),0);
 assert.match(storeLogisticsStatus(next),/0 stock assistants.*1 receiving clerk.*shelves need a stock assistant/);
});

test('idle and closed shops do not accumulate instant refill work or exhaust idle stock assistants',()=>{
 let b=store();b.retail!.store!.shelf={...b.retail!.stock};
 b=run(b,60,1.25);assert.equal(b.retail!.store!.replenishTimer,0);assert.equal(b.retail!.store!.receivingTimer,0);
 b.crew=b.crew!.map(e=>({...e,energy:50}));
 const district={week:1,day:1,businesses:{shop:b},loans:[],payroll:[],report:[],notice:''};
 const rested=advanceVenues(district,1).businesses.shop;
 assert.ok(rested.crew!.filter(e=>e.role==='care').every(e=>e.task==='Ready'&&e.energy>50));
 b.retail!.store!.shelf={};b=advanceStoreLogistics(b,.1);assert.equal(onShelves(b),0);
 b.venue!.running=false;assert.equal(advanceStoreLogistics(b,10),b);
});
