import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,Table,GameState} from '../src/hooks/useGameLoop';
import {hireStaff} from '../src/gameplay';
import {TABLE_POSITIONS,applyTableLayout,normalizeTableLayout,layoutProblem,walkingPath,blockedAt,mapPos,storedPos,servicePoint,walkStaff,nextTablePosition,customerSeatPath,customerTravelTime,seatPoint,DINING_SEATS,DINING_OBSTACLES,pathLength} from '../src/restaurantLayout';

const full=():Table[]=>TABLE_POSITIONS.map((p,i)=>({...p,id:`table-${i}`,customerId:null,isDirty:false}));
test('all 12 table-and-chair sets fit with a clear central aisle; old saves migrate once',()=>{
 const old={...structuredClone(INITIAL_STATE),tables:full().map(t=>({...t,x:50,y:50}))};
 const next=normalizeTableLayout(old);
 assert.equal(next.tables.length,12);assert.equal(layoutProblem(next.tables),null);
 assert.equal(next.money,old.money);assert.deepEqual(next.inventory,old.inventory);
 assert.equal(normalizeTableLayout(next),next);
});
test('layout editing rejects overlaps, blocked entrances and live service; valid positions survive saves',()=>{
 const s=normalizeTableLayout({...structuredClone(INITIAL_STATE),tables:full()});
 const changed=s.tables.map((t,i)=>i===0?{...t,x:storedPos(-15.5)}:t);
 const saved=applyTableLayout(s,changed);
 assert.equal(mapPos(saved.tables[0].x),-15.5);
 assert.deepEqual(normalizeTableLayout(JSON.parse(JSON.stringify(saved))).tables,changed);
 assert.equal(applyTableLayout(s,changed.map((t,i)=>i===0?{...t,x:50}:t)),s);
 assert.equal(applyTableLayout(s,changed.map((t,i)=>i===0?{...t,x:changed[1].x,y:changed[1].y}:t)),s);
 const live={...s,phase:'service' as const};assert.equal(applyTableLayout(live,changed),live);
 const missing=changed.slice(1);const position=nextTablePosition(missing)!;
 assert.ok(position);assert.equal(layoutProblem([...missing,{id:'new',...position}]),null);
});
test('guests and staff reach every table in a full restaurant without crossing other chairs',()=>{
 const tables=full();
 for(const table of tables){
  for(const customer of [true,false]){
   const from=customer?{x:0,z:27}:{x:0,z:-7},end=customer?{x:mapPos(table.x),z:mapPos(table.y)}:servicePoint(table);
   const route=walkingPath(from,end,tables,customer?table.id:undefined);
   assert.ok(route.length>1,`${table.id} must be reachable`);assert.deepEqual(route.at(-1),end);
   for(let i=1;i<route.length;i++)for(let t=0;t<=1;t+=.05){
    const p={x:route[i-1].x+(route[i].x-route[i-1].x)*t,z:route[i-1].z+(route[i].z-route[i-1].z)*t};
    assert.equal(blockedAt(p,tables,customer?table.id:undefined),false,`${table.id} route crosses another table`);
   }
  }
  const staff={x:0,y:-7};for(let i=0;i<300;i++)walkStaff(staff,servicePoint(table),tables,.5);
  assert.ok(Math.hypot(staff.x-servicePoint(table).x,staff.y-servicePoint(table).z)<.01);
 }
});
test('new cleaners spawn clear of furniture and can reach every table',()=>{
 let state:GameState={...structuredClone(INITIAL_STATE),tables:full(),money:25000,testingUnlocked:true};
 for(let i=0;i<3;i++)state=hireStaff(state,'cleaner');
 assert.equal(state.cleanerEntities.length,3);
 for(const cleaner of state.cleanerEntities){
  const from={x:cleaner.x,z:cleaner.y};assert.equal(blockedAt(from,state.tables),false);
  for(const table of state.tables)assert.deepEqual(walkingPath(from,servicePoint(table),state.tables).at(-1),servicePoint(table));
 }
});

test('every guest approaches their own chair without crossing any tabletop or other chair, including on departure',()=>{
 for(const tables of [full(),full().map((t,i)=>i===0?{...t,x:storedPos(-15.5)}:t)])for(const table of tables)for(let seat=0;seat<4;seat++){
  const route=customerSeatPath(table,seat,tables);
  assert.ok(route.length>2,table.id+' chair '+seat+' reachable');
  assert.deepEqual(route.at(-1),seatPoint(table,seat));
  assert.ok(customerTravelTime(table,4,tables)>=pathLength(route)/4+seat*.35);
  for(const path of [route,[...route].reverse()])for(let n=1;n<path.length;n++){
   const a=path[n-1],b=path[n],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.05));
   for(let j=0;j<=steps;j++){
    const point={x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps};
    for(const obstacle of DINING_OBSTACLES)assert.ok(Math.hypot(point.x-obstacle.x,point.z-obstacle.z)>=obstacle.radius,'Must walk around planters');
    for(const other of tables){
     const x=mapPos(other.x),z=mapPos(other.y);
     assert.ok(Math.hypot(point.x-x,point.z-z)>=2.7,'Must stay outside every tabletop, including the assigned table');
     for(let chair=0;chair<4;chair++)if(other.id!==table.id||chair!==seat){
      const c=seatPoint(other,chair);assert.ok(Math.hypot(point.x-c.x,point.z-c.z)>=.95,'Must not cross another chair');
     }
    }
   }
  }
 }
});
