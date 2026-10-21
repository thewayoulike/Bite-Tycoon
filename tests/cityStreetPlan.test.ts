import test from 'node:test';
import assert from 'node:assert/strict';
import {CITY_STREET_PLAN,plotStreetEdges} from '../src/graphics/cityStreetPlan';
import {COMMERCIAL_PARCELS} from '../src/graphics/commercialParcels';
import {cityPosition,cityHeading} from '../src/graphics/cityTerrainLayout';
import {OUTER_LOTS,isOuterPark} from '../src/graphics/outerCity';
import {residentialPlot} from '../src/graphics/residentialPlots';

test('larger city blocks preserve commercial street access',()=>{
 assert.equal(new Set(CITY_STREET_PLAN.map(s=>s.id)).size,CITY_STREET_PLAN.length);
 assert.ok(CITY_STREET_PLAN.filter(s=>!s.road).length>200);
 assert.ok(CITY_STREET_PLAN.some(s=>s.road&&s.curve!==0));
 assert.ok(new Set(CITY_STREET_PLAN.filter(s=>s.road).map(s=>s.width)).size>=3);
 for(const p of COMMERCIAL_PARCELS){
  const [x,,z]=p.position;if(Math.abs(x)<=50&&Math.abs(z)<=50)continue;
  assert.ok(plotStreetEdges(x,z).length>0,`${p.id} must keep access to a street`);
 }
});

test('every retained street connects to the city road network',()=>{
 const graph=new Map<string,Set<string>>();
 for(const s of CITY_STREET_PLAN.filter(s=>s.road)){
  const a=s.vertical?`${s.x}:${s.z-12.5}`:`${s.x-12.5}:${s.z}`;
  const b=s.vertical?`${s.x}:${s.z+12.5}`:`${s.x+12.5}:${s.z}`;
  if(!graph.has(a))graph.set(a,new Set());if(!graph.has(b))graph.set(b,new Set());
  graph.get(a)!.add(b);graph.get(b)!.add(a);
 }
 const seen=new Set<string>(),queue=[graph.keys().next().value!];
 while(queue.length){const p=queue.pop()!;if(seen.has(p))continue;seen.add(p);for(const q of graph.get(p)!)if(!seen.has(q))queue.push(q);}
 assert.equal(seen.size,graph.size,'No disconnected road islands');
});

test('organic residential layout keeps saved business coordinates and clear roads',()=>{
 for(const p of COMMERCIAL_PARCELS){
  const [x,,z]=p.position;
  assert.deepEqual(cityPosition(x,z),[x,z],`${p.id}: saved business address must not move`);
 }
 const styles=new Set<number>(),facings=new Set<number>();
 for(const lot of OUTER_LOTS.filter(l=>l.zone==='homes'&&!isOuterPark(l.x,l.z))){
  const plan=residentialPlot(lot.x,lot.z);styles.add(plan.houses.length);facings.add(plan.angle);
  for(const house of plan.houses){
   // Buildings, including their canopies, stay inside the planting/footpath edge.
   assert.ok(Math.abs(house.x)+house.width/2<9);
   assert.ok(Math.abs(house.z)+4<9);
   const [x,z]=plan.point(house.x,house.z);
   assert.ok(cityPosition(x,z).every(Number.isFinite));
   assert.ok(Number.isFinite(cityHeading(x,z,plan.angle)));
  }
 }
 assert.equal(styles.size,2,'Mix detached homes and pairs');
 assert.ok(facings.size>=3,'Homes face the available street');
 assert.notDeepEqual(cityPosition(-150,75),[-150,75]);
});
