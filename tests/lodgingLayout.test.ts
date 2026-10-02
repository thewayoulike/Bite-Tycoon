import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceFloorWalker,clearWalkingSegment,createLodgingLayout,FloorPoint,FloorWalker,LodgingLayout,lodgingWalkingPath,walkablePoint} from '../src/empire/lodgingLayout';
import {lodgingFurnitureGeometry} from '../src/components/LodgingInterior3D';

function route(layout:LodgingLayout,a:FloorPoint,b:FloorPoint){
  const path=lodgingWalkingPath(layout,a,b);
  assert.ok(path.length>1,`${layout.kind} floor ${layout.floor}: ${JSON.stringify(a)} must reach ${JSON.stringify(b)}`);
  assert.deepEqual(path[0],a);assert.deepEqual(path.at(-1),b);
  for(let n=1;n<path.length;n++)assert.ok(clearWalkingSegment(layout,path[n-1],path[n]),'Route must clear every wall, doorway, and furniture footprint');
  return path;
}

test('hotel and apartment lobbies have clear arrival, queue, lift, and exit routes',()=>{
  for(const kind of ['hotel','apartments'] as const){
    const layout=createLodgingLayout(kind,0);
    for(const point of [...layout.staff,...layout.care,layout.manager])assert.ok(walkablePoint(layout,point),`${kind} staff spawn ${JSON.stringify(point)} is clear`);
    for(const queue of layout.queue){route(layout,layout.entrance,queue);route(layout,queue,layout.elevator);route(layout,queue,layout.entrance);}
    route(layout,layout.elevator,layout.entrance);
  }
});

test('every hotel room and apartment type is accessible on every unlocked floor',()=>{
  for(const kind of ['hotel','apartments'] as const)for(let floor=1;floor<=(kind==='hotel'?5:10);floor++){
    const variants=kind==='hotel'?['standard','double','family','suite']:['studio','onebed','twobed','penthouse'];
    for(const type of variants){
      const layout=createLodgingLayout(kind,floor,Array(kind==='hotel'?4:3).fill(type));
      for(const point of [...layout.care,layout.manager])assert.ok(walkablePoint(layout,point),'Staff must spawn in the shared corridor');
      for(const room of layout.rooms){route(layout,layout.elevator,room.destination);route(layout,room.destination,layout.elevator);route(layout,room.destination,room.bedside);}
    }
  }
});

test('rerouting midway and fast-forwarding follow bends without cutting through objects',()=>{
  const layout=createLodgingLayout('hotel',1,['family','suite','double','standard']);
  const path=route(layout,layout.elevator,layout.rooms[3].destination);
  const walker:FloorWalker={position:{...path[0]},path,next:0,heading:0};
  for(let i=0;i<12;i++)advanceFloorWalker(walker,.173);
  walker.path=route(layout,walker.position,layout.rooms[0].destination);walker.next=0;
  for(let i=0;i<2000&&walker.next<walker.path.length;i++){
    const before={...walker.position};advanceFloorWalker(walker,.03);
    assert.ok(walkablePoint(layout,walker.position));assert.ok(clearWalkingSegment(layout,before,walker.position));
  }
  assert.ok(Math.hypot(walker.position.x-layout.rooms[0].destination.x,walker.position.z-layout.rooms[0].destination.z)<1e-6);
  const fast:FloorWalker={position:{...path[0]},path,next:0,heading:0};advanceFloorWalker(fast,1000);assert.deepEqual(fast.position,path.at(-1));
});

test('blocked destinations never fall back to crossing furniture; all amenities leave a central aisle',()=>{
  const room=createLodgingLayout('apartments',1);
  const bed=room.items.find(item=>item.kind==='bed')!;
  assert.deepEqual(lodgingWalkingPath(room,room.elevator,bed),[]);
  for(const kind of ['hotel','apartments'] as const){
    const amenities=createLodgingLayout(kind,3,[],['restaurant','gym','conference','rooftop']);
    for(const target of amenities.care)route(amenities,amenities.elevator,target);
  }
});

test('detailed interiors use a bounded batched mesh with valid geometry',()=>{
  for(const kind of ['hotel','apartments'] as const)for(const floor of [0,1]){
    const geometry=lodgingFurnitureGeometry(createLodgingLayout(kind,floor));
    assert.ok(geometry.getAttribute('position').count<180000,'Keep interior geometry within the detailed graphics budget');
    for(const attribute of ['position','normal','color'])assert.ok(Array.from(geometry.getAttribute(attribute).array).every(Number.isFinite));
    geometry.dispose();
  }
});
