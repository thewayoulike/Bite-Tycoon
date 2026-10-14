import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,parseEmpireSave} from '../src/empire/empire';
import {propertyById,hireBusinessStaff,businessWages} from '../src/prototype/expansionModel';
import {ensureCrew} from '../src/career/crew';
import {advanceStoreMaintenance,advanceSupermarket,storeRepairStatus,storeWaitReason} from '../src/empire/supermarketSimulation';
import {resolveStoreEvent} from '../src/empire/supermarket';
import {supermarketLossAdvice} from '../src/empire/supermarketAdvice';
const p=propertyById('shop')!;
const fresh=()=>unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);
const broken=()=>{
 let e=fresh();e.district=hireBusinessStaff(e.district,'shop','maintenance');
 const b=e.district.businesses.shop;
 b.venue!.running=true;b.venue!.clock=0;
 b.retail!.store!.level=1;b.retail!.store!.lastEventDay=1;
 b.retail!.store!.events=[{id:900,kind:'fridge',title:'Fridge fault',day:1,until:2}];
 b.crew=ensureCrew(p,b);return {e,b};
};

test('maintenance is hireable from opening, earns wages and repairs once through the normal books',()=>{
 const original=fresh(),cash=original.district.businesses.shop.cash,wages=businessWages(p,original.district.businesses.shop);
 let {e,b}=broken();assert.equal(b.cash,cash-120);assert.equal(businessWages(p,b),wages+35);
 const before=b.cash,maintenance=b.books!.maintenance;
 b=advanceStoreMaintenance(p,b,2,1,1);assert.equal(b.retail!.store!.events[0].repairProgress,2);assert.equal(b.cash,before);
 e.district.businesses.shop=b;e=parseEmpireSave(JSON.stringify(e))!;b=e.district.businesses.shop;
 assert.equal(b.retail!.store!.events[0].repairProgress,2);
 b=advanceStoreMaintenance(p,b,2,1,1);assert.equal(b.retail!.store!.events[0].resolved,'Repaired');
 assert.equal(b.cash,before-60);assert.equal(b.books!.maintenance,maintenance+60);
 assert.equal(advanceStoreMaintenance(p,b,10,1,1),b);
 const state={...e.district,businesses:{...e.district.businesses,shop:b}};
 assert.equal(resolveStoreEvent(state,'shop',900,true),state);
});

test('automatic repairs wait for cash, an available ground-floor worker and a running week',()=>{
 const {b}=broken();
 for(const change of [{shift:'night'},{training:20},{energy:10},{task:'On break'},{zone:1}] as const){
  const blocked={...b,crew:b.crew!.map(e=>e.role==='maintenance'?{...e,...change}:e)};
  assert.equal(advanceStoreMaintenance(p,blocked,5,1,1),blocked);
  assert.match(storeRepairStatus(blocked,blocked.retail!.store!.events[0]),/available maintenance worker/);
 }
 const poor={...b,cash:59};assert.equal(advanceStoreMaintenance(p,poor,5,1,1),poor);
 assert.match(storeRepairStatus(poor,poor.retail!.store!.events[0]),/waiting for \$60/);
 const funded=advanceStoreMaintenance(p,{...poor,cash:60},4,1,1);assert.equal(funded.cash,0);assert.equal(funded.retail!.store!.events[0].resolved,'Repaired');
 const paused={...b,venue:{...b.venue!,running:false}};assert.equal(advanceStoreMaintenance(p,paused,5,1,1),paused);
 const unstaffed={...b,hires:{...b.hires,maintenance:0},crew:[]};assert.equal(advanceStoreMaintenance(p,unstaffed,5,1,1),unstaffed);
});

test('live supermarket ticks repair faults and restore chilled shopping without rewriting past losses',()=>{
 let {b}=broken();const cash=b.cash;b.retail!.store!.losses={cold:8};b.venue!.week.lost=8;b.venue!.arrivalTimer=999;
 assert.match(supermarketLossAdvice(b)[0].tip,/maintenance worker repairs faults automatically/);
 for(let i=0;i<8;i++)b=advanceSupermarket(p,b,.5,1,1);
 assert.equal(b.retail!.store!.events[0].resolved,'Repaired');assert.equal(b.cash,cash-60);
 assert.equal(b.retail!.store!.losses.cold,8);assert.equal(b.venue!.week.lost,8);
 assert.notEqual(storeWaitReason(b,{id:1,seed:1,state:'waiting',remaining:0,unit:null,patience:50,productId:'milk',quantity:1}),'cold');
});
