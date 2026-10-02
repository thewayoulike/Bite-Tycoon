/** Interior geometry and navigation use the same furniture footprints, in metres. */
export type FloorPoint = {x:number;z:number};
export type LodgingKind = 'hotel'|'apartments';
export type FurnishingKind = 'wall'|'bed'|'sofa'|'table'|'chair'|'reception'|'cabinet'|'kitchen'|'fridge'|'shower'|'toilet'|'vanity'|'plant'|'luggage'|'elevator'|'door'|'cart'|'treadmill'|'media'|'mailboxes'|'parcels'|'minibar';
export interface Furnishing extends FloorPoint {id:string;kind:FurnishingKind;w:number;d:number;h:number;yaw:number;color?:string;}
export interface FloorFinish extends FloorPoint {w:number;d:number;surface:'wood'|'tile'|'carpet';color:string;}
export interface InteriorRoom {index:number;center:FloorPoint;door:FloorPoint;destination:FloorPoint;bedside:FloorPoint;}
export interface LodgingLayout {
  kind:LodgingKind;floor:number;items:Furnishing[];finishes:FloorFinish[];rooms:InteriorRoom[];
  entrance:FloorPoint;elevator:FloorPoint;queue:FloorPoint[];staff:FloorPoint[];care:FloorPoint[];manager:FloorPoint;
}
export const PERSON_CLEARANCE=.38;

export function createLodgingLayout(kind:LodgingKind,floor:number,types:string[]=[],facilities:string[]=[]):LodgingLayout {
  const layout:LodgingLayout={kind,floor,items:[],finishes:[],rooms:[],entrance:{x:0,z:11},elevator:{x:0,z:-8.7},queue:[],staff:[],care:[],manager:{x:-7,z:-6}};
  const put=(kind:FurnishingKind,x:number,z:number,w:number,d:number,h=1,yaw=0,color?:string)=>layout.items.push({id:`${kind}-${layout.items.length}`,kind,x,z,w,d,h,yaw,color});
  const wall=(x:number,z:number,w:number,d:number,h=1.15)=>put('wall',x,z,w,d,h);
  const finish=(x:number,z:number,w:number,d:number,surface:FloorFinish['surface'],color:string)=>layout.finishes.push({x,z,w,d,surface,color});
  // Cutaway walls remain solid for walking even when drawn below eye level.
  wall(0,-9.95,18,.16,2.85);wall(-8.95,0,.16,20,1.15);wall(8.95,0,.16,20,1.15);
  if(floor===0){
    finish(0,0,17.7,19.7,'tile','#d6d0c6');finish(-5,4.3,6,5.2,'carpet',kind==='hotel'?'#aea08c':'#aaaeb1');
    put('reception',-3,-2.6,kind==='hotel'?7:4.8,1.35,1.18);layout.staff=[-5,-3.4,-1.8].map(x=>({x,z:-4}));
    // Lounge furniture stays to the side of the entrance-to-reception route.
    put('sofa',-6.6,4.1,3.7,1.05,1,Math.PI/2);put('sofa',-3.8,6.1,3.4,1.05,1,Math.PI);
    put('table',-4.3,3.9,1.65,1.2,.46);put('chair',-2.7,2.4,.85,.9,1,-Math.PI/4);
    put('plant',-7.8,7.9,.65,.65,1.7);put('plant',7.8,7.9,.65,.65,1.7);
    if(kind==='hotel'){put('elevator',0,-9.4,2.35,.8,2.8);layout.elevator={x:0,z:-8.4};}
    else{put('elevator',6,9.4,2.6,.8,2.8,Math.PI);layout.elevator={x:6,z:8.45};}
    put(kind==='hotel'?'cabinet':'parcels',7.7,-4.8,1,3,kind==='hotel'?1:1.85);
    if(kind==='hotel'){put('luggage',2.2,-6,.7,.6,.9);put('cart',3.2,-6.4,1,1.4,1.8);}
    wall(-5.6,-8.6,.14,2.5);wall(-5.6,-5.15,.14,.5);wall(-7.25,-4.9,3.3,.14);
    put('table',-7.2,-7.4,2,1.05,.78);put('chair',-7.2,-8.4,.65,.7,1.05);put('cabinet',-8.4,-6.1,.65,1.7,1.6);
    layout.manager={x:-7,z:-6.1};
    if(kind==='apartments')put('mailboxes',1,-9.4,4,.65,1.7,0,'#777f87');
    else put('cabinet',5.6,-9.3,4,.8,1.2);
    // Open access to the office is on its right rear side.
    layout.queue=Array.from({length:8},(_,i)=>({x:-1.6+(i%2)*1.35,z:-1.15+Math.floor(i/2)*1.05}));
    layout.care=[{x:7,z:1},{x:7,z:3}];
  }else if(facilities.length){
    layout.elevator=kind==='hotel'?{x:0,z:-8.4}:{x:6,z:8.45};put('elevator',layout.elevator.x,kind==='hotel'?-9.4:9.4,2.5,.8,2.8,kind==='hotel'?0:Math.PI);
    finish(0,0,17.7,19.7,'wood','#b6a18a');
    // Each facility has its own bay; a central aisle connects all four.
    if(facilities.includes('restaurant')){put('kitchen',-5.3,-8.7,5.3,.8,1);for(const x of [-6.8,-3.5]){put('table',x,-5.5,1.4,1.4,.8);for(const z of [-6.7,-4.3])put('chair',x,z,.6,.6,1);}}
    if(facilities.includes('gym'))for(const x of [3.3,5.5,7.7])put('treadmill',x,-6.4,1.5,2.8,1.5);
    if(facilities.includes('conference')){put('table',5.2,2.5,4.6,1.6,.8);for(const x of [3.7,5.2,6.7])for(const z of [.8,4.2])put('chair',x,z,.65,.65,1);}
    if(facilities.includes('rooftop')){put('sofa',-5.4,1,4,1.1,1);put('sofa',-5.4,5,4,1.1,1,Math.PI);put('table',-5.4,3,2,1,.5);put('plant',-8,6.6,.7,.7,1.8);}
    layout.care=[{x:0,z:2},{x:0,z:-4}];layout.manager={x:0,z:5};
  }else if(kind==='hotel'){
    finish(0,0,2.7,19.6,'carpet','#596b7a');put('elevator',0,-9.4,2.35,.8,2.8);layout.elevator={x:0,z:-8.4};
    for(let n=0;n<4;n++){
      const side=n%2===0?-1:1,cz=n<2?-5:4,index=(floor-1)*4+n,type=types[n]??'standard';
      finish(side*5.15,cz,7.35,8.8,'carpet',n%2?'#c7bca9':'#bcb3a5');
      // Corridor partition has a 1.8m opening into each room.
      wall(side*1.45,cz-1.6,.16,5.8);wall(side*1.45,cz+3.8,.16,1.2);
      put('door',side*1.57,cz+3.65,.09,1.45,2.45);
      if(n<2)wall(side*5.2,-.5,7.35,.16);
      const bedW=type==='standard'?1.65:type==='suite'?2.3:2;
      if(type==='family'){put('bed',side*5.25,cz-1.6,1.45,3.05,1);put('bed',side*7.35,cz-1.6,1.45,3.05,1);}
      else {put('bed',side*6,cz-1.6,bedW,3.05,1);put('cabinet',side*(6-bedW/2-.48),cz-2.7,.6,.65,.58);put('cabinet',side*(6+bedW/2+.48),cz-2.7,.6,.65,.58);}
      finish(side*2.95,cz-2.55,2.8,3.65,'tile','#c5c2ba');wall(side*4.45,cz-2.6,.14,3.65,1.55);
      wall(side*1.85,cz-.7,.65,.14,1.3);wall(side*4.1,cz-.7,.7,.14,1.3);
      put('shower',side*2.5,cz-3.5,1.4,1.35,2.3);put('vanity',side*3.8,cz-1.4,.8,.65,.85);put('toilet',side*3.85,cz-3.3,.58,.9,.85);
      put('cabinet',side*2.6,cz+.15,1.8,.7,2.1);
      put('minibar',side*3,cz+3.65,1.35,.7,.9);
      put('table',side*8.2,cz+1.25,.7,1.55,.8);put('chair',side*7.15,cz+1.25,.65,.65,1.05,side*Math.PI/2);
      if(type==='suite'){put('sofa',side*6.1,cz+3.5,3.3,1,1,Math.PI);put('table',side*6.1,cz+2.05,1.6,.6,.46);}
      put('luggage',side*8.2,cz+3.4,.6,.85,.65);
      const door={x:side*1.45,z:cz+2.2};
      layout.rooms.push({index,center:{x:side*5.2,z:cz+.4},door,destination:{x:side*4.9,z:cz+1.2},bedside:{x:side*4.95,z:cz+.65}});
    }
    layout.care=[{x:0,z:-5.5},{x:0,z:.5},{x:0,z:5.5}];layout.manager={x:0,z:8.3};
  }else{
    finish(0,6.5,17.7,3.2,'carpet','#858d94');put('elevator',6,9.4,2.6,.8,2.8,Math.PI);layout.elevator={x:6,z:8.45};
    for(let n=0;n<3;n++){
      const x=(n-1)*5.9,index=(floor-1)*3+n,type=types[n]??'studio';
      finish(x,-2.5,5.7,14.4,'wood',n===1?'#b7a38c':'#c4b29a');finish(x+1.65,-7.35,2.2,4.8,'tile','#c7c8c5');
      finish(x+1.6,1.5,2.35,4.2,'carpet',['#c2a289','#abb9b5','#bdaf94'][n]);
      if(n<2)wall(x+2.95,-2.5,.16,14.5);
      wall(x-1.9,4.8,1.95,.16);wall(x+1.9,4.8,1.95,.16);
      put('door',x+.94,4.05,.09,1.45,2.45);
      // Separate bedroom and bathroom, with usable internal doorways.
      wall(x+.45,-7.45,.14,4.65,1.4);wall(x+.8,-5.05,.7,.14,1.3);wall(x+2.7,-5.05,.35,.14,1.3);
      if(type!=='studio'){wall(x-1.9,-3.1,1.95,.14,1.3);wall(x+1.9,-3.1,1.95,.14,1.3);}
      put('bed',x-1.25,-7.2,type==='penthouse'?1.85:1.6,3.1,1,type==='studio'?Math.PI/2:0,['#667f94','#b17c65','#8a946e'][n]);put('cabinet',x-2.35,-4.7,.8,1.5,1.9,0,'#c6b699');
      put('shower',x+1.65,-8.8,1.7,1.6,2.25);put('toilet',x+2.25,-7.15,.6,.85,.85);put('vanity',x+2.4,-5.9,.65,.8,.85,Math.PI/2);
      put('kitchen',x-2.3,.5,3.6,.85,.92,Math.PI/2);put('fridge',x-2.3,-2,.85,.85,1.85);
      put('sofa',x+2.25,2,2.6,.9,1,-Math.PI/2);put('table',x+1.05,2,.55,1.2,.46);
      put('media',x-2.35,3.5,1.5,.55,.55,Math.PI/2);
      put('table',x+1.9,-.9,1.05,1.1,.78);put('chair',x+1.9,-2,.65,.65,1);put('chair',x+1.9,.2,.65,.65,1,Math.PI);
      if(type==='twobed'||type==='penthouse')put('bed',x+1.7,-3.95,1.25,2.3,1,Math.PI/2);
      else put('table',x+1.85,-4.05,1.55,.65,.76);
      layout.rooms.push({index,center:{x,z:.6},door:{x,z:4.8},destination:{x,z:1},bedside:{x:-.05+x,z:-4.5}});
    }
    layout.care=[{x:-5.9,z:6.4},{x:2.8,z:6.4},{x:6,z:6.4}];layout.manager={x:-2.4,z:8.6};
    put('plant',-7.8,8.5,.7,.7,1.7);put('plant',7.8,8.5,.7,.7,1.7);
  }
  return layout;
}

export function furnishingBounds(item:Furnishing,padding=PERSON_CLEARANCE){
  const c=Math.abs(Math.cos(item.yaw)),s=Math.abs(Math.sin(item.yaw));
  const hw=(item.w*c+item.d*s)/2+padding,hd=(item.d*c+item.w*s)/2+padding;
  return {minX:item.x-hw,maxX:item.x+hw,minZ:item.z-hd,maxZ:item.z+hd};
}
export function walkablePoint(layout:LodgingLayout,p:FloorPoint){
  if(p.x< -8.5||p.x>8.5||p.z< -9.5||p.z>11.6)return false;
  if(p.z>9.8&&Math.abs(p.x)>1.1)return false;
  return !layout.items.some(item=>{const r=furnishingBounds(item);return p.x>r.minX&&p.x<r.maxX&&p.z>r.minZ&&p.z<r.maxZ;});
}
/** Slab intersection against inflated rectangles, including very thin walls. */
export function clearWalkingSegment(layout:LodgingLayout,a:FloorPoint,b:FloorPoint){
  if(!walkablePoint(layout,a)||!walkablePoint(layout,b))return false;
  if(Math.max(a.z,b.z)>9.8&&Math.min(a.z,b.z)<=9.8){const t=(9.8-a.z)/(b.z-a.z);if(Math.abs(a.x+(b.x-a.x)*t)>1.1)return false;}
  return !layout.items.some(item=>{
    const r=furnishingBounds(item);let low=0,high=1;
    for(const [start,delta,min,max] of [[a.x,b.x-a.x,r.minX,r.maxX],[a.z,b.z-a.z,r.minZ,r.maxZ]]){
      if(Math.abs(delta)<1e-9){if(start<=min||start>=max)return false;}
      else{const t1=(min-start)/delta,t2=(max-start)/delta;low=Math.max(low,Math.min(t1,t2));high=Math.min(high,Math.max(t1,t2));if(low>=high)return false;}
    }
    return low<high;
  });
}

const STEP=.25,WIDTH=69,HEIGHT=85;
const gridCache=new WeakMap<LodgingLayout,Uint8Array>();
const gridPoint=(id:number):FloorPoint=>({x:-8.5+id%WIDTH*STEP,z:-9.5+Math.floor(id/WIDTH)*STEP});
/** Routes are planned on destination changes, never in the animation loop. */
export function lodgingWalkingPath(layout:LodgingLayout,start:FloorPoint,end:FloorPoint):FloorPoint[]{
  if(!walkablePoint(layout,start)||!walkablePoint(layout,end))return [];
  if(clearWalkingSegment(layout,start,end))return [start,end];
  let grid=gridCache.get(layout);if(!grid){grid=Uint8Array.from({length:WIDTH*HEIGHT},(_,id)=>walkablePoint(layout,gridPoint(id))?1:0);gridCache.set(layout,grid);}
  const connector=(p:FloorPoint)=>{
    const gx=Math.round((p.x+8.5)/STEP),gz=Math.round((p.z+9.5)/STEP);let best=-1,distance=Infinity;
    for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
      const x=gx+dx,z=gz+dz,id=z*WIDTH+x;if(x<0||x>=WIDTH||z<0||z>=HEIGHT||!grid![id])continue;
      const point=gridPoint(id),d=Math.hypot(p.x-point.x,p.z-point.z);
      if(d<distance&&clearWalkingSegment(layout,p,point)){best=id;distance=d;}
    }return best;
  };
  const first=connector(start),last=connector(end);if(first<0||last<0)return [];
  const distance=new Float64Array(grid.length).fill(Infinity),previous=new Int32Array(grid.length).fill(-1),closed=new Uint8Array(grid.length);
  const heuristic=(id:number)=>Math.abs(id%WIDTH-last%WIDTH)+Math.abs(Math.floor(id/WIDTH)-Math.floor(last/WIDTH));
  const open=[first];distance[first]=0;
  while(open.length){
    let best=0;for(let i=1;i<open.length;i++)if(distance[open[i]]+heuristic(open[i])<distance[open[best]]+heuristic(open[best]))best=i;
    const current=open.splice(best,1)[0];if(closed[current])continue;if(current===last){
      const path:FloorPoint[]=[end];for(let n=current;n!==-1;n=previous[n])path.unshift(gridPoint(n));path.unshift(start);
      // Only remove a bend after testing the complete resulting segment.
      const smooth=[path[0]];let anchor=0;while(anchor<path.length-1){let next=path.length-1;while(next>anchor+1&&!clearWalkingSegment(layout,path[anchor],path[next]))next--;smooth.push(path[next]);anchor=next;}return smooth;
    }
    closed[current]=1;
    for(const next of [current-1,current+1,current-WIDTH,current+WIDTH]){
      if(next<0||next>=grid.length||!grid[next]||closed[next]||Math.abs(next%WIDTH-current%WIDTH)>1)continue;
      if(distance[current]+1>=distance[next]||!clearWalkingSegment(layout,gridPoint(current),gridPoint(next)))continue;
      distance[next]=distance[current]+1;previous[next]=current;open.push(next);
    }
  }
  // Never fall back to a straight line through a blocked room.
  return [];
}

export interface FloorWalker {position:FloorPoint;path:FloorPoint[];next:number;heading:number;}
export function advanceFloorWalker(walker:FloorWalker,distance:number){
  let remaining=Math.max(0,distance),moved=false;
  while(remaining>0&&walker.next<walker.path.length){
    const target=walker.path[walker.next],dx=target.x-walker.position.x,dz=target.z-walker.position.z,length=Math.hypot(dx,dz);
    if(length<1e-7){walker.next++;continue;}
    const step=Math.min(remaining,length);walker.heading=Math.atan2(dx,dz);walker.position={x:walker.position.x+dx/length*step,z:walker.position.z+dz/length*step};remaining-=step;moved=true;
    if(step===length)walker.next++;
  }return moved;
}

