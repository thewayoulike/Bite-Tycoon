import * as THREE from 'three';
import {ModelParts,seededRandom} from './modelParts';
import {outerCityZone,isOuterPark} from './cityZoning';
import {commercialParcelAt} from './commercialParcels';
import {addIndustrialLot} from './industrialScenery';

export const CITY_EDGE=262.5;
export const OUTER_LOTS=Array.from({length:21},(_,i)=>(i-10)*25).flatMap(x=>Array.from({length:21},(_,i)=>(i-10)*25).filter(z=>Math.abs(x)>50||Math.abs(z)>50).map(z=>({x,z,zone:outerCityZone(x,z)})));
export const OUTER_ROADS=Array.from({length:22},(_,i)=>-CITY_EDGE+i*25).filter(v=>Math.abs(v)>63);
export {isOuterPark} from './cityZoning';
export type OuterTreePlacement={x:number;z:number;seed:number;scale:number};
export type OuterCarPlacement={x:number;z:number;color:string;style:'sedan'|'hatchback'|'suv'|'truck'};
export type OuterStreetModels={trees:boolean;cars:boolean;placements:{trees:OuterTreePlacement[];cars:OuterCarPlacement[]}};

/** Batched scenery: hundreds of addresses, four material draws per city quadrant. */
export function buildOuterCity(quadrant:number,modeledHomes=false,street?:OuterStreetModels,market?:{developed:ReadonlySet<string>}){
 const solid=new ModelParts(),glass=new ModelParts(),lit=new ModelParts(),land=new ModelParts(),random=seededRandom(934+quadrant);
 let cleared=false;
 const walls=['#a69580','#96705b','#b3ab9b','#826c5e','#ae9c86','#9a8c80'];
 function tree(x:number,z:number){
  const seed=Math.abs(Math.round(x*17+z*31));
  street?.placements.trees.push({x,z,seed,scale:.72+(seed%4)*.045});
  if(!street?.trees){
  solid.branch([x,.2,z],[x,2.6,z],.14,.09,'#665549',5);
  for(let i=0;i<3;i++)land.add(new THREE.IcosahedronGeometry(1,1),['#687450','#7c815c','#596848'][i],[x+(i-1)*.6,3+i*.35,z+i*.15],[1.05,1.35,.95]);
  }
  solid.box([x,.22,z],[2,.18,2],'#9b9588');
 }
 function car(x:number,z:number,appearance?:Pick<OuterCarPlacement,'color'|'style'>){
  const color=appearance?.color??['#82776a','#455563','#845951','#c1bcb1'][Math.floor(random()*4)];
  const style=appearance?.style??(['sedan','hatchback','suv'] as const)[Math.abs(Math.round(x+z))%3];
  if(cleared)return;
  street?.placements.cars.push({x,z,color,style});
  if(street?.cars||style==='truck')return;
  solid.box([x,.65,z],[1.65,.85,3.5],color);
  glass.box([x,1.15,z-.2],[1.42,.6,1.85],'#3a4850');
  for(const dx of [-.83,.83])for(const dz of [-1.1,1.1])solid.box([x+dx,.35,z+dz],[.16,.6,.55],'#303232');
 }
 function building(x:number,z:number,w:number,d:number,floors:number,house:boolean,shop:boolean){
  // Keep the same random sequence for all other scenery when the houses are replaced.
  const discard={box(..._args:Parameters<ModelParts['box']>){}};
  const hidden=cleared||(house&&modeledHomes);
  const bodySolid=hidden?discard:solid,bodyGlass=hidden?discard:glass,bodyLit=hidden?discard:lit;
  const h=floors*2.9+.35,color=walls[Math.floor(random()*walls.length)];
  bodySolid.box([x,h/2+.16,z],[w,h,d],color);
  bodySolid.box([x,.32,z],[w+.12,.32,d+.12],'#b9b1a1');
  for(let f=0;f<floors;f++)for(const side of [-1,1]){
   const y=1.8+f*2.9;
   for(let dx=-w/2+1.25;dx<w/2-.7;dx+=2.3){
    bodySolid.box([x+dx,y,z+side*(d/2+.04)],[1.25,1.68,.12],'#c3b8a5');
    (random()<.24?bodyLit:bodyGlass).box([x+dx,y+.02,z+side*(d/2+.11)],[1.02,1.4,.045],random()<.3?'#6a7980':'#465966');
   }
   for(let dz=-d/2+1.4;dz<d/2-.8;dz+=2.7){
    (random()<.2?bodyLit:bodyGlass).box([x+side*(w/2+.02),y,z+dz],[.06,1.4,1.15],'#526570');
   }
   if(!house)bodySolid.box([x,y+1.3,z+side*(d/2+.06)],[w,.12,.15],'#b4a997');
  }
  if(house){
   const rise=1.75,half=w/2+.3,roof=Math.sqrt(half*half+rise*rise);
   for(const side of [-1,1])bodySolid.box([x+side*half/2,h+.16+rise/2,z],[roof,.17,d+.65],'#514f4c',[0,0,-side*Math.atan2(rise,half)]);
   bodySolid.box([x+w*.25,h+1.3,z-1],[.55,1.8,.65],'#7c5c4d');
  }else{
   bodySolid.box([x,h+.22,z],[w+.4,.24,d+.4],'#8d8b82');
   bodySolid.box([x+1,h+.64,z-1],[2,.6,2.3],'#777d7b');
   for(const side of [-1,1])bodySolid.box([x+side*w/2,h+.52,z],[.16,.7,d],'#aea99c');
  }
  bodyGlass.box([x,1.28,z+d/2+.1],[.96,2.2,.08],'#3a484e');
  bodySolid.box([x,.2,z+d/2+.55],[1.75,.18,.95],'#c7bcac');
  if(shop){
   for(const side of [-1,1])bodyGlass.box([x+side*w*.28,1.5,z+d/2+.13],[w*.28,2.05,.08],'#576c70');
   bodySolid.box([x,2.85,z+d/2+.18],[w-.4,.45,.25],['#485f5a','#86594a','#796f55'][Math.floor(random()*3)]);
   bodySolid.box([x,2.6,z+d/2+.8],[w-.5,.12,1.35],'#a29173',[.08,0,0]);
  }
 }
 for(const {x,z,zone} of OUTER_LOTS.filter(l=>(l.x<0?1:0)+(l.z<0?2:0)===quadrant)){
  const parcel=market&&commercialParcelAt(x,z);
  cleared=!!parcel&&(parcel.vacant||market!.developed.has(parcel.id));
  solid.box([x,.1,z],[18.5,.2,18.5],'#aca69a');
  const park=isOuterPark(x,z);
  if(park){
   land.box([x,.22,z],[15,.06,15],'#7f8565');
   solid.box([x,.26,z],[2.2,.05,16],'#c3b7a2');solid.box([x,.26,z],[16,.05,2.2],'#c3b7a2');
   for(const dx of [-5,5])for(const dz of [-5,5])tree(x+dx,z+dz);
   for(const dx of [-3,3]){solid.box([x+dx,.6,z+3],[1.8,.2,.55],'#80694e');solid.box([x+dx,.9,z+3.2],[1.8,.65,.1],'#80694e');}
  }else if(zone==='homes'){
   for(const side of [-1,1]){
    const bx=x+side*4.35;
    building(bx,z-2,7.5,8,2,true,false);
    land.box([bx,.24,z+5.6],[6.8,.05,3.8],'#838767');
    solid.box([bx,.29,z+5.7],[1.3,.08,4.1],'#bfb3a0');
    solid.box([bx,.65,z+7.7],[6.9,.85,.1],'#786d5a');
    solid.box([bx,.6,z-7.1],[6.9,.9,.1],'#867b66');
   }
   tree(x+7.7,z+7.5);
  }else if(zone==='industry'){
   addIndustrialLot(solid,glass,land,x,z);
   car(x-3.5,z+6.5,{style:'truck',color:['#626e7d','#69847e','#c1bcb1'][Math.abs(x/25+z/25)%3]});
  }else if(zone==='civic'){
   building(x,z-2,14,10,2,false,false);
   solid.box([x,6.65,z+3.25],[11,.55,.28],'#65716c');
   for(const dx of [-6,6])tree(x+dx,z+6.5);
   solid.box([x,.26,z+6],[2,.06,5],'#c5bbac');
  }else{
   const floors=(x>=100&&Math.abs(z)<100?5:2)+Math.floor(random()*3);
   building(x-4.3,z-1.8,7.8,10,floors,false,true);
   building(x+4.3,z-1.8,7.8,10,Math.max(2,floors-1),false,true);
   if(!cleared){solid.box([x,.23,z+6.3],[16,.045,4],'#737473');
   for(const dx of [-5,-2,1,4])solid.box([x+dx,.26,z+6.3],[.08,.02,3.5],'#d0c7ab');}
   car(x-3.4,z+6.1);if(random()>.4)car(x+2.5,z+6.1);
   tree(x+8,z+6.6);
  }
  solid.box([x-8.5,1.8,z+8.5],[.1,3.3,.1],'#444c4e');
  lit.box([x-8.5,3.5,z+8.5],[.48,.13,.3],'#d9cbaa');
  solid.box([x-8.3,.55,z+5.8],[.55,.8,.55],'#5b655d');
 }
 return {solid:solid.finish(),glass:glass.finish(),lit:lit.finish(),land:land.finish()};
}
