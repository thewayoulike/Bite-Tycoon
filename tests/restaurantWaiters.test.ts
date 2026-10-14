import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,advanceGame,type GameState,type WaiterEntity} from '../src/hooks/useGameLoop';
import {chooseRestaurantType} from '../src/restaurantTypes';
import {TABLE_POSITIONS,blockedAt,servicePoint} from '../src/restaurantLayout';
import {ensureCrew} from '../src/career/crew';
import {createEmpire} from '../src/empire/empire';
import {propertyById} from '../src/prototype/expansionModel';

const waiter=(i:number,extra:Partial<WaiterEntity>={}):WaiterEntity=>({id:`waiter-${i}`,state:'idle',x:-6+i*2.2,y:-8,stamina:100,targetTableId:null,targetCustomerId:null,targetOrderId:null,...extra});
function room():GameState{
 const r=chooseRestaurantType(structuredClone(INITIAL_STATE),'italian');
 r.phase='service';r.isRestaurantOpen=false;
 r.tables=TABLE_POSITIONS.map((p,i)=>({...p,id:`t${i}`,customerId:null,isDirty:false}));
 r.staff.waiters=2;r.waiterEntities=[waiter(0),waiter(1)];
 r.inventory=Object.fromEntries(Object.keys(r.inventory).map(id=>[id,100]));
 return r;
}
function guest(r:GameState,table=0,patience=100){
 const id=`guest-${table}`;r.tables[table].customerId=id;
 r.customers.push({id,tableId:`t${table}`,state:'waiting_order',patience,maxPatience:patience,actionTimer:0,currentBill:0,isVIP:false,vipBonus:0,partySize:1});
}

test('idle and resting waiters cannot reserve a table against an available colleague',()=>{
 for(const state of ['idle','on_break','walking_to_counter_empty'] as const){
  const r=room();guest(r);
  r.waiterEntities=[waiter(0),waiter(1,{state,targetTableId:'t0',stamina:10})];
  const next=advanceGame(r,.1);
  assert.equal(next.waiterEntities[0].state,'walking_to_order',state);
  assert.equal(next.waiterEntities[0].targetTableId,'t0',state);
  assert.equal(r.waiterEntities[1].targetTableId,'t0','previous state stays immutable');
 }
});

test('a waiter finishing a break can take the same table again instead of blocking themself',t=>{
 t.mock.method(Math,'random',()=>.25);
 let r=room();guest(r);r.staff.waiters=1;
 r.waiterEntities=[waiter(0,{state:'on_break',targetTableId:'t0',stamina:99})];
 r=advanceGame(r,14);
 assert.notEqual(r.customers[0]?.state,'waiting_order');
 assert.ok(r.orders.length>0||r.customers[0]?.state==='eating');
});

test('off-shift, training and resting employees hand their tables to an available waiter',()=>{
 for(const reason of ['shift','training','break']){
  const r=room();guest(r);const e=createEmpire(r);
  r.crew=ensureCrew(propertyById('diner')!,e.district.businesses.diner,r);
  const member=r.crew.find(x=>x.id==='waiter-1')!;
  if(reason==='shift')member.shift='night';
  if(reason==='training')member.training=20;
  if(reason==='break'){member.task='On break';member.energy=30;}
  r.waiterEntities[1]={...waiter(1),state:'walking_to_order',targetTableId:'t0'};
  const next=advanceGame(r,.1);
  assert.equal(next.waiterEntities[0].targetTableId,'t0',reason);
  assert.equal(next.waiterEntities[1].targetTableId,null,reason);
 }
});

test('a waiter returning empty takes a nearby order without an unnecessary trip to the kitchen',()=>{
 const r=room();guest(r,10);const point=servicePoint(r.tables[10]);
 r.staff.waiters=1;r.waiterEntities=[waiter(0,{state:'walking_to_counter_empty',x:point.x,y:point.z})];
 const next=advanceGame(r,.1);
 assert.equal(next.waiterEntities[0].state,'taking_order');
 assert.equal(next.waiterEntities[0].targetCustomerId,'guest-10');
});

test('cancelled deliveries and duplicate assignments do not strand waiters or double-order food',t=>{
 t.mock.method(Math,'random',()=>.25);
 let r=room();guest(r,0);guest(r,1);
 r.waiterEntities=[waiter(0,{state:'walking_to_serve',targetTableId:'t8'}),waiter(1)];
 r=advanceGame(r,.1);
 assert.deepEqual(r.waiterEntities.map(w=>w.targetTableId),['t0','t1']);
 r=room();guest(r,0);guest(r,1);
 r.waiterEntities=[waiter(0,{state:'taking_order',targetTableId:'t0',actionTimer:1}),waiter(1,{state:'taking_order',targetTableId:'t0',actionTimer:1})];
 r=advanceGame(r,.1);
 assert.deepEqual(r.waiterEntities.map(w=>w.targetTableId),['t0','t1']);
});

test('one waiter reaches and serves every table without crossing furniture, including after a saved route resumes',t=>{
 t.mock.method(Math,'random',()=>.25);
 for(let table=0;table<TABLE_POSITIONS.length;table++){
  let r=room();guest(r,table);r.staff.waiters=1;r.waiterEntities=[waiter(0)];
  let served=false;
  for(let step=0;step<480&&!served;step++){
   r=advanceGame(r,.1);
   const w=r.waiterEntities[0];assert.equal(blockedAt({x:w.x,z:w.y},r.tables),false,`table ${table}, step ${step}`);
   served=r.customers.some(c=>c.state==='eating');
   if(step===15)r=JSON.parse(JSON.stringify(r));
  }
  assert.ok(served,`table ${table} was never served`);
 }
});
