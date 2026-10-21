import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCityTraffic} from '../src/graphics/cityTraffic';
import {buildOuterRoads} from '../src/graphics/cityRoadModel';
import {CITY_AVENUES,CITY_CROSS_STREETS} from '../src/graphics/cityDistrictLayout';
import {ModelParts} from '../src/graphics/modelParts';
import {buildOuterCity,type OuterStreetModels} from '../src/graphics/outerCity';

test('whole moving cars stay on the rendered asphalt through bends, turns and loop joins',()=>{
 const outer=buildOuterRoads(),central=new ModelParts();
 for(const x of CITY_AVENUES)central.box([x,0,0],[6.5,.025,131.5],'#ffffff');
 for(const z of CITY_CROSS_STREETS)central.box([0,0,z],[131.5,.025,6.5],'#ffffff');
 const core=central.finish(),grid=new Map<string,number[][]>();
 for(const g of [outer.road,core]){
  const p=g.getAttribute('position'),norm=g.getAttribute('normal');
  for(let i=0;i<p.count;i+=3){
   if(norm.getY(i)<.9)continue;
   const t=[0,1,2].map(n=>[p.getX(i+n),p.getZ(i+n)]);
   for(let x=Math.floor(Math.min(...t.map(p=>p[0]))/5);x<=Math.floor(Math.max(...t.map(p=>p[0]))/5);x++)
    for(let z=Math.floor(Math.min(...t.map(p=>p[1]))/5);z<=Math.floor(Math.max(...t.map(p=>p[1]))/5);z++){
     const k=`${x}:${z}`;grid.set(k,[...(grid.get(k)??[]),t.flat()]);
    }
  }
 }
 const onRoad=(x:number,z:number)=>(grid.get(`${Math.floor(x/5)}:${Math.floor(z/5)}`)??[]).some(t=>{
  const [ax,az,bx,bz,cx,cz]=t,d=(bx-ax)*(cz-az)-(bz-az)*(cx-ax);
  const u=((x-ax)*(cz-az)-(z-az)*(cx-ax))/d,v=((bx-ax)*(z-az)-(bz-az)*(x-ax))/d;
  return u>=-.0001&&v>=-.0001&&u+v<=1.0001;
 });
 const routes=buildCityTraffic();assert.equal(routes.length,16);
 const comparisonRoutes=buildCityTraffic(96);assert.ok(comparisonRoutes.length>=80);
 const mallRoutes=buildCityTraffic(96,{galleriaSuperblock:true});assert.ok(mallRoutes.length>=80);
 for(const [r,route] of [...routes,...comparisonRoutes,...mallRoutes].entries()){
  assert.deepEqual(route.points.at(-1),route.points[0],'Route must join without teleporting');
  const p=route.points;
  for(let i=0;i<p.length-1;i++){
   const a=p[i],b=p[i+1],dist=Math.hypot(b.x-a.x,b.z-a.z);
   assert.ok(dist>0&&dist<.7,'Uniform short samples must not jump across a block');
   const c=p[(i+2)%(p.length-1)];
   // Match the runtime's smoothly interpolated heading between samples.
   for(const blend of [0,.5]){
    const hx=(b.x-a.x)*(1-blend)+(c.x-b.x)*blend,hz=(b.z-a.z)*(1-blend)+(c.z-b.z)*blend,h=Math.hypot(hx,hz);
    const dx=hx/h,dz=hz/h;
    for(const length of [-2.05,0,2.05])for(const width of [-.9,0,.9]){
     const x=a.x+(b.x-a.x)*blend+dx*length+dz*width,z=a.z+(b.z-a.z)*blend+dz*length-dx*width;
     assert.ok(onRoad(x,z),`Route ${r}, sample ${i}: car leaves asphalt at ${x.toFixed(2)}, ${z.toFixed(2)}`);
     if(r>=routes.length+comparisonRoutes.length)assert.ok(!(x>9.25&&x<15.75&&z> -59.25&&z< -15.75),'Car enters the closed street through the mall');
    }
   }
  }
 }
 core.dispose();Object.values(outer).forEach(g=>g.dispose());
});

test('parked scenery cars occupy paved commercial or industrial yards',()=>{
 const placements:OuterStreetModels['placements']={cars:[],trees:[]};
 for(let q=0;q<4;q++){const model=buildOuterCity(q,true,{cars:true,trees:true,placements});Object.values(model).forEach(g=>g.dispose());}
 assert.ok(placements.cars.length>20);
 for(const car of placements.cars){
  assert.ok(car.lotX!==undefined&&car.lotZ!==undefined,'Generated parking must identify its owning plot');
  assert.ok(car.lotX>=25,'No cars on residential lawns');
  assert.ok(Math.abs(car.x-car.lotX)+.9<9.25);
  assert.ok(Math.abs(car.z-car.lotZ)+2.05<9.25);
 }
});
