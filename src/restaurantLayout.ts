import type {GameState,Table} from './hooks/useGameLoop';

export const ROOM={left:-20,right:20,back:-15,front:23,entry:27};
export const TABLE_RADIUS=3.5;
export const mapPos=(value:number)=>value/5-10;
export const storedPos=(value:number)=>(value+10)*5;
export const TABLE_POSITIONS=[7.5,-2,17].flatMap(z=>[-15,-5.5,5.5,15].map(x=>({x:storedPos(x),y:storedPos(z)})));
export type Point={x:number;z:number};

export function layoutProblem(tables:Pick<Table,'id'|'x'|'y'>[]):string|null{
 for(const t of tables){
  const x=mapPos(t.x),z=mapPos(t.y);
  if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>15.5||z< -2.8||z>18.5)return 'Keep tables inside the dining area, clear of the kitchen and walls.';
  if(Math.abs(x)<5.3)return 'Keep the central walking aisle clear.';
  for(const other of tables)if(other.id!==t.id&&Math.abs(x-mapPos(other.x))<8.8&&Math.abs(z-mapPos(other.y))<8.8)return 'Leave room between both sets of chairs for people to walk.';
 }
 return null;
}

export function normalizeTableLayout(state:GameState):GameState{
 if(state.tableLayoutVersion===1&&!layoutProblem(state.tables))return state;
 return {...state,tableLayoutVersion:1,tables:state.tables.map((t,i)=>({...t,...TABLE_POSITIONS[i]})),
  waiterEntities:state.waiterEntities.map(w=>({...w,x:0,y:-7,walkRoute:[],walkDestination:'',walkStep:1})),
  cleanerEntities:state.cleanerEntities.map((c,i)=>({...c,x:-18+i*1.1,y:-7,walkRoute:[],walkDestination:'',walkStep:1}))};
}
export function applyTableLayout(state:GameState,tables:Table[]):GameState{
 if(state.phase!=='planning'||tables.length!==state.tables.length||new Set(tables.map(t=>t.id)).size!==tables.length||tables.some(t=>!state.tables.some(old=>old.id===t.id))||layoutProblem(tables))return state;
 return {...state,tableLayoutVersion:1,tables:state.tables.map(t=>{const position=tables.find(next=>next.id===t.id)!;return {...t,x:position.x,y:position.y};})};
}
export function nextTablePosition(tables:Table[]){
 for(const position of TABLE_POSITIONS)if(!layoutProblem([...tables,{id:'new-table-position',...position}]))return position;
 // An adjusted layout may need the new table nudged within an open bay.
 for(let z=-2.5;z<=18.5;z+=.5)for(let x=-15.5;x<=15.5;x+=.5){
  const position={x:storedPos(x),y:storedPos(z)};
  if(!layoutProblem([...tables,{id:'new-table-position',...position}]))return position;
 }
 return null;
}

export const layoutKey=(tables:Table[])=>tables.map(t=>`${t.id}:${t.x}:${t.y}`).join('|');
export const servicePoint=(table:Table):Point=>({x:mapPos(table.x),z:mapPos(table.y)+4.1});
export const DINING_OBSTACLES=[{x:-18.5,z:21,radius:1.65},{x:18.5,z:21,radius:1.65}];
export function blockedAt(point:Point,tables:Table[],ignoreId?:string){
 return DINING_OBSTACLES.some(p=>Math.hypot(point.x-p.x,point.z-p.z)<p.radius)||tables.some(t=>t.id!==ignoreId&&Math.abs(point.x-mapPos(t.x))<3.8&&Math.abs(point.z-mapPos(t.y))<3.8);
}

/** Aisle routing on a half-unit grid; called once per destination, never every frame. */
export function walkingPath(start:Point,end:Point,tables:Table[],ignoreId?:string):Point[]{
 const key=(p:Point)=>`${p.x},${p.z}`;
 const from={x:Math.round(start.x*2)/2,z:Math.round(start.z*2)/2},to={x:Math.round(end.x*2)/2,z:Math.round(end.z*2)/2};
 const open=[from],cost=new Map([[key(from),0]]),parent=new Map<string,Point>(),closed=new Set<string>();
 const estimate=(p:Point)=>Math.abs(p.x-to.x)+Math.abs(p.z-to.z);
 while(open.length){
  let best=0;
  for(let i=1;i<open.length;i++)if(cost.get(key(open[i]))!+estimate(open[i])<cost.get(key(open[best]))!+estimate(open[best]))best=i;
  const current=open.splice(best,1)[0],id=key(current);
  if(id===key(to)){
   const route:Point[]=[end];let step:Point|undefined=current;
   while(step){route.push(step);step=parent.get(key(step));}
   route.reverse();route.unshift(start);
   const unique=route.filter((p,i)=>i===0||Math.hypot(p.x-route[i-1].x,p.z-route[i-1].z)>.0001);
   return unique.filter((p,i)=>{
    if(i===0||i===unique.length-1)return true;
    const a=unique[i-1],b=unique[i+1];
    return Math.abs((p.x-a.x)*(b.z-p.z)-(p.z-a.z)*(b.x-p.x))>.0001;
   });
  }
  closed.add(id);
  for(const [dx,dz] of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){
   const n={x:current.x+dx,z:current.z+dz},nid=key(n);
   if(n.x< -19.5||n.x>19.5||n.z< -8||n.z>ROOM.entry||closed.has(nid)||blockedAt(n,tables,ignoreId))continue;
   const next=cost.get(id)!+.5;
   if(next<(cost.get(nid)??Infinity)){cost.set(nid,next);parent.set(nid,current);if(!open.some(p=>key(p)===nid))open.push(n);}
  }
 }
 return [start]; // A blocked route never cuts through furniture.
}
export const pathLength=(route:Point[])=>route.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-route[i].x,p.z-route[i].z),0);

export const DINING_SEATS=[
 {x:-2.8,z:0,rotation:Math.PI/2}, {x:2.8,z:0,rotation:-Math.PI/2},
 {x:0,z:-2.8,rotation:0}, {x:0,z:2.8,rotation:Math.PI},
];
export const seatPoint=(table:Table,index:number):Point=>({x:mapPos(table.x)+DINING_SEATS[index%4].x,z:mapPos(table.y)+DINING_SEATS[index%4].z});
/** Approach beside the assigned chair; only the final seating motion enters its footprint. */
const seatRoutes=new Map<string,Point[]>();
export function customerSeatPath(table:Table,index:number,tables:Table[]):Point[]{
 const cacheKey=layoutKey(tables)+':'+table.id+':'+index;
 const cached=seatRoutes.get(cacheKey);if(cached)return cached;
 const seat=DINING_SEATS[index%4],cx=mapPos(table.x),cz=mapPos(table.y);
 const ux=seat.x/2.8,uz=seat.z/2.8,tx=-uz,tz=ux;
 const approach={x:cx+ux*4.1+tx*1.25,z:cz+uz*4.1+tz*1.25};
 const beside={x:cx+seat.x+tx*1.25,z:cz+seat.z+tz*1.25};
 const aisle=walkingPath({x:0,z:ROOM.entry},approach,tables);
 if(aisle.length<2)return aisle;
 const route=[...aisle,beside,seatPoint(table,index)];
 if(seatRoutes.size>=128)seatRoutes.delete(seatRoutes.keys().next().value!);
 seatRoutes.set(cacheKey,route);
 return route;
}
export function customerTravelTime(table:Table,partySize:number,tables:Table[]){
 return Math.max(...Array.from({length:Math.max(1,Math.min(4,partySize))},(_,i)=>pathLength(customerSeatPath(table,i,tables))/4+i*.35))+.6;
}
type Walker={x:number;y:number;walkRoute?:Point[];walkDestination?:string;walkStep?:number};
export function walkStaff(walker:Walker,end:Point,tables:Table[],distance:number){
 const destination=`${end.x}:${end.z}:${layoutKey(tables)}`;
 if(walker.walkDestination!==destination){walker.walkRoute=walkingPath({x:walker.x,z:walker.y},end,tables);walker.walkStep=1;walker.walkDestination=destination;}
 const route=walker.walkRoute!;
 while(distance>0&&(walker.walkStep??1)<route.length){
  const p=route[walker.walkStep??1],length=Math.hypot(p.x-walker.x,p.z-walker.y);
  if(length<=distance){walker.x=p.x;walker.y=p.z;distance-=length;walker.walkStep=(walker.walkStep??1)+1;}
  else {walker.x+=(p.x-walker.x)/length*distance;walker.y+=(p.z-walker.y)/length*distance;distance=0;}
 }
}
