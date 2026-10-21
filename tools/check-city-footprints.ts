import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildOuterRoads} from '../src/graphics/cityRoadModel';
import {CITY_AVENUES,CITY_CROSS_STREETS} from '../src/graphics/cityDistrictLayout';
import {ModelParts} from '../src/graphics/modelParts';
const outer=buildOuterRoads(),central=new ModelParts();
for(const x of CITY_AVENUES)central.box([x,0,0],[6.5,.025,131.5],'#ffffff');
for(const z of CITY_CROSS_STREETS)central.box([0,0,z],[131.5,.025,6.5],'#ffffff');
const core=central.finish(),grid=new Map<string,number[][]>();
for(const g of [outer.road,core]){
 const p=g.getAttribute('position'),normal=g.getAttribute('normal');
 for(let i=0;i<p.count;i+=3){
  if(normal.getY(i)<.9)continue;
  const t=[0,1,2].map(n=>[p.getX(i+n),p.getZ(i+n)]);
  for(let x=Math.floor(Math.min(...t.map(p=>p[0]))/5);x<=Math.floor(Math.max(...t.map(p=>p[0]))/5);x++)for(let z=Math.floor(Math.min(...t.map(p=>p[1]))/5);z<=Math.floor(Math.max(...t.map(p=>p[1]))/5);z++){
   const key=`${x}:${z}`;grid.set(key,[...(grid.get(key)??[]),t.flat()]);
  }
 }
}
const road=(x:number,z:number)=>(grid.get(`${Math.floor(x/5)}:${Math.floor(z/5)}`)??[]).some(t=>{
 const [ax,az,bx,bz,cx,cz]=t,d=(bx-ax)*(cz-az)-(bz-az)*(cx-ax);if(Math.abs(d)<1e-8)return false;
 const u=((x-ax)*(cz-az)-(z-az)*(cx-ax))/d,v=((bx-ax)*(z-az)-(bz-az)*(x-ax))/d;return u>=0&&v>=0&&u+v<=1;
});
const footprints=JSON.parse(fs.readFileSync('artifacts/unity-comparison/footprints.json','utf8')).buildings.slice(0,386);
const errors=[];
for(const f of footprints){
 const c=f.bounds.m_Center,e=f.bounds.m_Extent;let collision=false;
 for(let x=c.x-e.x;x<=c.x+e.x;x+=.25)for(let z=c.z-e.z;z<=c.z+e.z;z+=.25)if(road(x,z)){collision=true;break;}
 if(collision)errors.push({owner:f.owner,center:c});
}
console.log(JSON.stringify({checked:footprints.length,roadOverlaps:errors},null,2));
assert.equal(errors.length,0,'CITY buildings must remain off the road');
core.dispose();Object.values(outer).forEach(g=>g.dispose());
