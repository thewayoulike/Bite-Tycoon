import {CITY_STREET_PLAN} from './cityStreetPlan';
import {CITY_AVENUES,CITY_CROSS_STREETS} from './cityDistrictLayout';
import {cityPosition} from './cityTerrainLayout';

type Point=[number,number];
type Edge={a:Point;b:Point};
export type TrafficRoute={length:number;points:{x:number;y:number;z:number}[]};
const key=(p:Point)=>p.join(':');
const add=(a:Point,b:Point,k=1):Point=>[a[0]+b[0]*k,a[1]+b[1]*k];
const direction=(a:Point,b:Point):Point=>{const d=Math.hypot(b[0]-a[0],b[1]-a[1]);return [(b[0]-a[0])/d,(b[1]-a[1])/d];};
const right=(v:Point):Point=>[v[1],-v[0]];

/** Retained streets only, with the same terrain bend as the asphalt. */
export function buildCityTraffic(routeCount=16,options:{galleriaSuperblock?:boolean}={}):TrafficRoute[]{
 const edges:Edge[]=CITY_STREET_PLAN.filter(s=>s.road&&s.width>=5.2).map(s=>({
  a:[s.x-(s.vertical?0:12.5),s.z-(s.vertical?12.5:0)],
  b:[s.x+(s.vertical?0:12.5),s.z+(s.vertical?12.5:0)]
 }));
 for(const x of CITY_AVENUES)for(let z=-62.5;z<62.5;z+=25)edges.push({a:[x,z],b:[x,z+25]});
 for(const z of CITY_CROSS_STREETS)for(let x=-62.5;x<62.5;x+=25)edges.push({a:[x,z],b:[x+25,z]});
 const nodes=new Map<string,Point>(),graph=new Map<string,string[]>();
 const retained=edges.filter(e=>!options.galleriaSuperblock||!(e.a[0]===12.5&&e.b[0]===12.5&&Math.min(e.a[1],e.b[1])>=-62.5&&Math.max(e.a[1],e.b[1])<=-12.5));
 for(const e of retained){const a=key(e.a),b=key(e.b);nodes.set(a,e.a);nodes.set(b,e.b);graph.set(a,[...(graph.get(a)??[]),b]);graph.set(b,[...(graph.get(b)??[]),a]);}
 const routes:TrafficRoute[]=[];
 for(let index=0;index<routeCount;index++){
  const e=retained[Math.floor(index*retained.length/routeCount)],start=key(e.a),next=key(e.b);
  // An alternate path back creates a closed circuit without teleporting.
  const queue=[next],previous=new Map<string,string|null>([[next,null]]);
  for(let head=0;head<queue.length&&!previous.has(start);head++){
   const at=queue[head];
   for(const to of graph.get(at)??[]){
    if((at===next&&to===start)||(at===start&&to===next)||previous.has(to))continue;
    previous.set(to,at);queue.push(to);
   }
  }
  if(!previous.has(start))continue;
  const reverse:string[]=[];let at:string|null=start;
  while(at!==null){reverse.push(at);at=previous.get(at)??null;}
  const cycle=[start,...reverse.reverse().slice(0,-1)].map(id=>nodes.get(id)!);
  if(index%2)cycle.reverse();
  const raw:Point[]=[];
  for(let i=0;i<cycle.length;i++){
   const p=cycle[i],incoming=direction(cycle[(i+cycle.length-1)%cycle.length],p),outgoing=direction(p,cycle[(i+1)%cycle.length]);
   const a=add(add(p,incoming,-3.4),right(incoming),1.05);
   const b=add(add(p,outgoing,3.4),right(outgoing),1.05);
   const corner=add(add(p,right(incoming),1.05),right(outgoing),1.05);
   const straight=incoming[0]*outgoing[0]+incoming[1]*outgoing[1]>.99;
   if(raw.length){const last=raw.at(-1)!,count=Math.ceil(Math.hypot(a[0]-last[0],a[1]-last[1]));for(let n=1;n<count;n++)raw.push(add(last,direction(last,a),n*Math.hypot(a[0]-last[0],a[1]-last[1])/count));}
   for(let n=0;n<=12;n++){const t=n/12,u=1-t;raw.push(straight?add(a,[b[0]-a[0],b[1]-a[1]],t):[u*u*a[0]+2*u*t*corner[0]+t*t*b[0],u*u*a[1]+2*u*t*corner[1]+t*t*b[1]]);}
  }
  // Sample the closing street before warping too; a long straight shortcut
  // between transformed endpoints would cut across western gardens.
  const last=raw.at(-1)!,first=raw[0],closing=Math.ceil(Math.hypot(first[0]-last[0],first[1]-last[1]));
  for(let n=1;n<closing;n++)raw.push(add(last,[first[0]-last[0],first[1]-last[1]],n/closing));
  raw.push(first);
  const world=raw.map(p=>cityPosition(...p)),distances=[0];
  for(let i=1;i<world.length;i++)distances.push(distances[i-1]+Math.hypot(world[i][0]-world[i-1][0],world[i][1]-world[i-1][1]));
  const length=distances.at(-1)!,count=Math.ceil(length/.65),points:TrafficRoute['points']=[];
  let segment=1;
  for(let i=0;i<=count;i++){
   const d=length*i/count;while(segment<world.length-1&&distances[segment]<d)segment++;
   const a=world[segment-1],b=world[segment],t=(d-distances[segment-1])/(distances[segment]-distances[segment-1]||1);
   points.push({x:a[0]+(b[0]-a[0])*t,y:.12,z:a[1]+(b[1]-a[1])*t});
  }
  points[points.length-1]={...points[0]};
  routes.push({length,points});
 }
 return routes;
}
