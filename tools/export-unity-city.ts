import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import {buildOuterCity,OUTER_LOTS,type OuterStreetModels} from '../src/graphics/outerCity';
import {buildCityLot} from '../src/graphics/cityLotModel';
import {buildOuterRoads} from '../src/graphics/cityRoadModel';
import {CITY_LOTS,CITY_AVENUES,CITY_CROSS_STREETS} from '../src/graphics/cityDistrictLayout';
import {COMMERCIAL_PARCELS} from '../src/graphics/commercialParcels';
import {buildAirport,buildCoast,buildAirliner,buildFishingBoat,buildLeisureBoat,cityGroundGeometry,flightPose} from '../src/graphics/airportAndCoast';
import {buildRailCorridor,buildTrain} from '../src/graphics/cityRailway';
import {DISTRICT_HOUSES,OUTER_HOUSES} from '../src/graphics/residentialLayout';
import {HOUSE_PALETTES} from '../src/graphics/residentialAppearance';
import {industrialStacks} from '../src/graphics/industrialScenery';
import {ModelParts} from '../src/graphics/modelParts';
import {CITY_VIEWS} from '../src/graphics/cityNavigation';
import {buildCityTraffic} from '../src/graphics/cityTraffic';

// Export the actual game's geometry and stable addresses, rather than maintaining
// a second, simplified city. Binary vertex data is imported as native Unity meshes.
const out=path.resolve('artifacts/unity-setup/shared-city');fs.mkdirSync(out,{recursive:true});
const meshes:{name:string;group:string;file:string;surface:string}[]=[];
function mesh(name:string,geometry:THREE.BufferGeometry,group='City',surface=name){
 const g=geometry.index?geometry.toNonIndexed():geometry,p=g.getAttribute('position');if(!p?.count)return;
 const n=g.getAttribute('normal'),c=g.getAttribute('color'),uv=g.getAttribute('uv');
 const data=Buffer.allocUnsafe(4+p.count*44);data.writeInt32LE(p.count,0);
 let offset=4;for(let i=0;i<p.count;i++){
  const values=[p.getX(i),p.getY(i),p.getZ(i),n?.getX(i)??0,n?.getY(i)??1,n?.getZ(i)??0,c?.getX(i)??1,c?.getY(i)??1,c?.getZ(i)??1,uv?.getX(i)??p.getX(i)/4,uv?.getY(i)??(Math.abs(n?.getY(i)??1)>.7?p.getZ(i):p.getY(i))/4];
  for(const value of values){data.writeFloatLE(value,offset);offset+=4;}
 }
 const file=`mesh-${meshes.length}.bytes`;fs.writeFileSync(path.join(out,file),data);meshes.push({name,group,file,surface});
 g.dispose();if(g!==geometry)geometry.dispose();
}
function model(name:string,parts:Record<string,THREE.BufferGeometry>,group='City'){for(const [key,g]of Object.entries(parts))mesh(`${name} ${key}`,g,group,key);}
const placements:OuterStreetModels['placements']={trees:[],cars:[]};
function triangleKey(g:THREE.BufferGeometry,i:number){const p=g.getAttribute('position');return [0,1,2].map(n=>[p.getX(i+n),p.getY(i+n),p.getZ(i+n)].join(',')).join(';');}
function parcelBuildings(full:Record<string,THREE.BufferGeometry>,empty:Record<string,THREE.BufferGeometry>){
 // Subtract the shared pavement/fixtures from the original batches. Remaining
 // triangles are grouped by stable parcel address for acquisition-time hiding.
 for(const key of ['solid','glass','lit','masonry']){
  const g=full[key],base=empty[key],existing=new Set<string>();
  for(let i=0;i<base.getAttribute('position').count;i+=3)existing.add(triangleKey(base,i));
  const groups=new Map<string,number[]>(),p=g.getAttribute('position');
  for(let i=0;i<p.count;i+=3){if(existing.has(triangleKey(g,i)))continue;
   const x=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,z=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;
   const plot=COMMERCIAL_PARCELS.find(plot=>!plot.vacant&&Math.abs(plot.position[0]-x)<10&&Math.abs(plot.position[2]-z)<10);if(!plot)continue;
   const list=groups.get(plot.id)??[];list.push(i,i+1,i+2);groups.set(plot.id,list);
  }
  for(const [id,indices]of groups){const part=new THREE.BufferGeometry();for(const [name,attribute]of Object.entries(g.attributes)){const values=new Float32Array(indices.length*attribute.itemSize);indices.forEach((index,j)=>{for(let n=0;n<attribute.itemSize;n++)values[j*attribute.itemSize+n]=attribute.array[index*attribute.itemSize+n];});part.setAttribute(name,new THREE.BufferAttribute(values,attribute.itemSize));}mesh(id+' '+key,part,'Parcel:'+id,key);}
 }
}
for(let q=0;q<4;q++){
 const full=buildOuterCity(q,true,{trees:true,cars:true,placements}),empty=buildOuterCity(q,true,{trees:true,cars:true,placements:{trees:[],cars:[]}},{developed:new Set(COMMERCIAL_PARCELS.map(p=>p.id))});
 parcelBuildings(full,empty);model(`Original district ${q}`,full,'OuterLegacy');model(`Market district ${q}`,empty,'OuterMarket');
}
model('Outer roads',buildOuterRoads());
mesh('Ground',cityGroundGeometry(),'City','ground');
const streets=new ModelParts(),marks=new ModelParts(),pavement=new ModelParts(),curbs=new ModelParts();
for(const x of CITY_AVENUES)streets.box([x,.0255,0],[6.5,.025,131.5],'#494c51');
for(const z of CITY_CROSS_STREETS)streets.box([0,.026,z],[131.5,.025,6.5],'#494c51');
for(const x of [-50,-25,0,25,50])for(const z of [-37.5,12.5,50]){
 const length=z===50?18.5:43.5;
 pavement.box([x,.045,z],[18.5,.085,length],'#bdb7a9');
 for(const side of [-1,1]){
  for(let d=-length/2+.6;d<length/2;d+=1.2)curbs.box([x+side*9.2,.12,z+d],[.2,.18,1.12],'#b5b4ab');
  for(let d=-8.6;d<9;d+=1.2)curbs.box([x+d,.12,z+side*length/2],[1.12,.18,.2],'#b5b4ab');
 }
}
for(const x of CITY_AVENUES)for(const z of CITY_CROSS_STREETS)for(const side of [-1,1])for(let i=0;i<6;i++){
 marks.box([x-2.6+i*.9,.055,z+side*5],[.5,.016,2],'#e4e5d9');marks.box([x+side*5,.055,z-2.6+i*.9],[2,.016,.5],'#e4e5d9');
}
model('Central roads',{road:streets.finish(),marks:marks.finish(),paving:pavement.finish(),details:curbs.finish()});
for(const [index,lot]of CITY_LOTS.entries()){
 const group=lot.zone==='commercial'?'Lot:'+lot.id:'City',parts=buildCityLot(lot,index,true);
 const body=new ModelParts(),homes=lot.kind==='homes',park=lot.kind==='square'||lot.kind==='playground';
 if(homes||park)body.box([0,.125,0],[17.9,.09,17.9],lot.kind==='square'?'#bcb4a5':'#788068');
 else {
  const retail=lot.kind==='shops',supermarket=lot.kind==='supermarket',garage=lot.kind==='garage'||lot.kind==='firestation';
  const height=retail?6.6:supermarket?4.5:garage?4.8:lot.kind==='offices'?12.6:7.2;
  body.box([0,height/2,supermarket?-2.3:0],[16,height,supermarket?11:12],lot.kind==='clinic'?'#c8c4ba':lot.kind==='firestation'?'#955c48':'#ab8e74');
 }
 const facade=body.finish();
 if(!homes&&!park&&lot.kind!=='firestation'){
  const palette=['#d7dfdf','#c3cbbb','#dfd9c5','#78939d','#b8bdc7','#dac7b1'];
  const color=new THREE.Color(lot.kind==='clinic'?'#e3e6e0':palette[index%palette.length]),colors=facade.getAttribute('color');
  for(let i=0;i<colors.count;i++)colors.setXYZ(i,color.r,color.g,color.b);
 }
 for(const[key,g]of Object.entries({...parts,facade})){g.rotateY(lot.rotation??0);g.translate(...lot.position);mesh(`${lot.id} ${key}`,g,group,key==='facade'&&(homes||park||lot.kind==='firestation')?'masonry':key);}
}
model('Eastport Airport',buildAirport());model('Seabright Waterfront',buildCoast());model('Railway',buildRailCorridor());
model('Airliner',buildAirliner(),'Airliner');model('Fishing boat',buildFishingBoat(),'FishingBoat');model('Yacht',buildLeisureBoat(false),'Yacht');model('Sailboat',buildLeisureBoat(true),'Sailboat');model('Passenger train',buildTrain(false),'PassengerTrain');model('Freight train',buildTrain(true),'FreightTrain');
const flights=[false,true].map(coastal=>({duration:coastal?210:150,points:Array.from({length:421},(_,i)=>{const pose=flightPose(i/420*(coastal?210:150),coastal);return {x:pose.position.x,y:pose.position.y,z:pose.position.z};})}));
fs.writeFileSync(path.join(out,'city.json'),JSON.stringify({meshes,parcels:COMMERCIAL_PARCELS.map(p=>({id:p.id,x:p.position[0],z:p.position[2]})),lots:CITY_LOTS.filter(l=>l.zone==='commercial').map(l=>({id:l.id,x:l.position[0],z:l.position[2]})),trees:placements.trees,cars:placements.cars,traffic:buildCityTraffic(),houses:[...DISTRICT_HOUSES,...OUTER_HOUSES.flat()].map(h=>({x:h.position[0],y:h.position[1],z:h.position[2],angle:h.rotation*180/Math.PI,width:6.4*h.scale[0]/.66,palette:h.palette,style:h.style})),palettes:HOUSE_PALETTES,stacks:OUTER_LOTS.filter(p=>p.zone==='industry').flatMap(p=>industrialStacks(p.x,p.z)),flights,views:Object.entries(CITY_VIEWS).map(([id,v])=>({id,target:v.target,position:v.position}))}));
console.log(`Exported ${meshes.length} native mesh batches from the existing city, plus its houses, airport, coast, railway and flight paths.`);
