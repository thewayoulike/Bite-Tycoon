import fs from 'node:fs';
import {buildCityTraffic} from '../src/graphics/cityTraffic';
import {CITY_STREET_PLAN} from '../src/graphics/cityStreetPlan';
import {cityPosition} from '../src/graphics/cityTerrainLayout';
const source='UnityComparison/Assets/Prototype/SharedCity/city.json';
const destination='UnityComparison/Assets/ComparisonPrepared/city.json';
const city=JSON.parse(fs.readFileSync(source,'utf8'));
city.traffic=buildCityTraffic(96,{galleriaSuperblock:true});
city.pedestrians=CITY_STREET_PLAN.filter(s=>s.road&&s.zone==='commercial'&&!s.vertical)
 .filter((_,i)=>i%2===0).slice(0,64).map(s=>{
  const z=s.z+s.width/2+.55;
  const [ax,az]=cityPosition(s.x-7,z),[bx,bz]=cityPosition(s.x+7,z);
  return {start:{x:ax,y:.42,z:az},end:{x:bx,y:.42,z:bz}};
 });
// Clear pavement stretches outside the central shopfronts, short of crossings.
for(const x of [-37.5,-12.5,12.5,37.5,62.5])for(const z of [-25,0,25,50]){
 city.pedestrians.push({start:{x:x-3.7,y:.42,z:z-6},end:{x:x-3.7,y:.42,z:z+6}});
}
fs.writeFileSync(destination,JSON.stringify(city));
// Keep the four-plot mall's closed street and replacement pavement routes when
// regenerating the comparison city's ambient traffic.
await import('./prepare-comparison-mall');
