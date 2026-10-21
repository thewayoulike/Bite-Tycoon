import fs from 'node:fs';
import assert from 'node:assert/strict';
import {buildCityTraffic} from '../src/graphics/cityTraffic';
const file='UnityComparison/Assets/ComparisonPrepared/city.json';
const city=JSON.parse(fs.readFileSync(file,'utf8'));
city.traffic=buildCityTraffic(96,{galleriaSuperblock:true});
for(const route of city.traffic){
 assert.deepEqual(route.points[0],route.points.at(-1));
 for(const p of route.points)assert.ok(!(p.x>-9.2&&p.x<34.2&&p.z>-59.2&&p.z< -15.8),'Traffic enters the mall site');
}
// Keep original safe city walks. Redirect the closed street to four perimeter pavements.
const blocked=[[-8.5,33.5,-58.5,-16.5],[-58.6,-41.4,43.4,56.6],[-7.5,7.5,40.6,59.4]];
city.pedestrians=city.pedestrians.filter((w:any)=>!blocked.some(([x0,x1,z0,z1])=>{
 for(let n=0;n<=100;n++){const x=w.start.x+(w.end.x-w.start.x)*n/100,z=w.start.z+(w.end.z-w.start.z)*n/100;if(x>x0&&x<x1&&z>z0&&z<z1)return true;}return false;
}));
const walks=[[-8.65,-56,-8.65,-19],[33.65,-56,33.65,-19],[-6,-16.25,31,-16.25],[-6,-58.75,31,-58.75]];
for(const [x,z,bx,bz]of walks)if(!city.pedestrians.some((w:any)=>w.start.x===x&&w.start.z===z))city.pedestrians.push({start:{x,y:.42,z},end:{x:bx,y:.42,z:bz}});
fs.writeFileSync(file,JSON.stringify(city));
console.log(`${city.traffic.length} closed road circuits route around the four-plot mall; ${city.pedestrians.length} pavement walks.`);
