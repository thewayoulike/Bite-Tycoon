import * as THREE from 'three';
import {ModelParts,seededRandom} from './modelParts';
import {outerCityZone,isOuterPark} from './cityZoning';
import {commercialParcelAt} from './commercialParcels';
import {addIndustrialLot} from './industrialScenery';
import {architecturalUV} from './restaurantFinish';
import {residentialPlot} from './residentialPlots';
import {cityPosition,shapeCityGeometry} from './cityTerrainLayout';

export const CITY_EDGE=262.5;
export const OUTER_LOTS=Array.from({length:21},(_,i)=>(i-10)*25).flatMap(x=>Array.from({length:21},(_,i)=>(i-10)*25).filter(z=>Math.abs(x)>50||Math.abs(z)>50).map(z=>({x,z,zone:outerCityZone(x,z)})));
export const OUTER_ROADS=Array.from({length:22},(_,i)=>-CITY_EDGE+i*25).filter(v=>Math.abs(v)>63);
export {isOuterPark} from './cityZoning';
export type OuterTreePlacement={x:number;z:number;seed:number;scale:number};
export type OuterCarPlacement={x:number;z:number;lotX?:number;lotZ?:number;color:string;style:'sedan'|'hatchback'|'suv'|'truck'};
export type OuterStreetModels={trees:boolean;cars:boolean;placements:{trees:OuterTreePlacement[];cars:OuterCarPlacement[]}};

/** Batched scenery: hundreds of addresses, six material draws per city quadrant. */
export function buildOuterCity(quadrant:number,modeledHomes=false,street?:OuterStreetModels,market?:{developed:ReadonlySet<string>}){
 const solid=new ModelParts(),glass=new ModelParts(),lit=new ModelParts(),land=new ModelParts(),masonry=new ModelParts(),paving=new ModelParts(),random=seededRandom(934+quadrant);
 let cleared=false;
 let parkingObstacles:{x:number;z:number;w:number;d:number}[]=[];
 const walls=['#deded4','#b9cbd1','#b9c4b1','#d8c9b9','#516c7d','#b8bec4','#eee7d5','#93624f'];
 function tree(x:number,z:number){
  const seed=Math.abs(Math.round(x*17+z*31));
  const [px,pz]=cityPosition(x,z);
  street?.placements.trees.push({x:px,z:pz,seed,scale:.72+(seed%4)*.045});
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
  if(parkingObstacles.some(b=>Math.abs(x-b.x)<b.w/2+.95&&Math.abs(z-b.z)<b.d/2+2.1))return;
  const [px,pz]=cityPosition(x,z);
  street?.placements.cars.push({x:px,z:pz,lotX:Math.round(x/25)*25,lotZ:Math.round(z/25)*25,color,style});
  if(street?.cars||style==='truck')return;
  solid.box([x,.65,z],[1.65,.85,3.5],color);
  glass.box([x,1.15,z-.2],[1.42,.6,1.85],'#3a4850');
  for(const dx of [-.83,.83])for(const dz of [-1.1,1.1])solid.box([x+dx,.35,z+dz],[.16,.6,.55],'#303232');
 }
 function building(x:number,z:number,w:number,d:number,floors:number,house:boolean,shop:boolean){
  // Keep the same random sequence for all other scenery when the houses are replaced.
  const discard={box(..._args:Parameters<ModelParts['box']>){}};
  const hidden=cleared||(house&&modeledHomes);
  if(!hidden)parkingObstacles.push({x,z,w,d});
  const bodySolid=hidden?discard:solid,bodyGlass=hidden?discard:glass,bodyLit=hidden?discard:lit;
  const h=floors*2.9+.35,color=walls[Math.floor(random()*walls.length)];
  const style=Math.abs(Math.round(x*7+z*13))%7;
  const curtain=!house&&style===4;
  if(!hidden)(house||style===6?masonry:solid).box([x,h/2+.16,z],[w,h,d],curtain?'#3c505b':color);
  bodySolid.box([x,.32,z],[w+.12,.32,d+.12],'#b9b1a1');
  for(let f=0;f<floors;f++)for(const side of [-1,1]){
   const y=1.8+f*2.9;
   for(let dx=-w/2+1.25;dx<w/2-.7;dx+=2.3){
    bodySolid.box([x+dx,y,z+side*(d/2+.04)],[curtain?2.25:1.25,curtain?2.85:1.68,.12],curtain?'#617780':'#e0dfd5');
    (random()<.24?bodyLit:bodyGlass).box([x+dx,y+.02,z+side*(d/2+.11)],[curtain?2.12:1.02,curtain?2.7:1.4,.045],random()<.3?'#8aa4b0':'#537884');
   }
   for(let dz=-d/2+1.4;dz<d/2-.8;dz+=2.7){
    (random()<.2?bodyLit:bodyGlass).box([x+side*(w/2+.02),y,z+dz],[.06,1.4,1.15],'#526570');
   }
   if(!house)bodySolid.box([x,y+1.3,z+side*(d/2+.16)],[w,.12,style===2?.4:.15],style===1?'#45545e':'#d8dcd9');
  }
  if(house){
   const rise=1.75,half=w/2+.3,roof=Math.sqrt(half*half+rise*rise);
   for(const side of [-1,1])bodySolid.box([x+side*half/2,h+.16+rise/2,z],[roof,.17,d+.65],'#514f4c',[0,0,-side*Math.atan2(rise,half)]);
   bodySolid.box([x+w*.25,h+1.3,z-1],[.55,1.8,.65],'#7c5c4d');
  }else{
   bodySolid.box([x,h+.22,z],[w+.4,.24,d+.4],style===1?'#46535b':'#a7b1af');
   bodySolid.box([x+1,h+.64,z-1],[2,.6,2.3],'#777d7b');
   for(const side of [-1,1])bodySolid.box([x+side*w/2,h+.52,z],[.16,.7,d],'#aea99c');
   if(style===1||style===4)for(let fin=-w/2+.5;fin<w/2;fin+=2.3)
    bodySolid.box([x+fin,h/2+.4,z+d/2+.22],[.12,h,.35],style===4?'#bdcbd0':'#e6e1d3');
   if(style===3)bodySolid.box([x-w*.2,h+.8,z+d/2-.5],[w*.5,1.2,1.2],'#e5dfd1');
  }
  bodyGlass.box([x,1.28,z+d/2+.1],[.96,2.2,.08],'#3a484e');
  bodySolid.box([x,.2,z+d/2+.55],[1.75,.18,.95],'#c7bcac');
  if(shop){
   for(const side of [-1,1])bodyGlass.box([x+side*w*.28,1.5,z+d/2+.13],[w*.28,2.05,.08],'#576c70');
   bodySolid.box([x,2.85,z+d/2+.18],[w-.4,.45,.25],['#485f5a','#86594a','#796f55'][Math.floor(random()*3)]);
   bodySolid.box([x,2.6,z+d/2+.8],[w-.5,.12,1.35],['#345c65','#a65f46','#d1b86c','#57664f'][style%4],[.08,0,0]);
  }
 }
 for(const {x,z,zone} of OUTER_LOTS.filter(l=>(l.x<0?1:0)+(l.z<0?2:0)===quadrant)){
  parkingObstacles=[];
  const parcel=market&&commercialParcelAt(x,z);
  cleared=!!parcel&&(parcel.vacant||market!.developed.has(parcel.id));
  if(zone!=='homes')paving.box([x,.1,z],[18.5,.2,18.5],'#ffffff');
  else{
   land.box([x,.1,z],[21,.2,21],'#84916d');
   for(const edge of residentialPlot(x,z).roads){
    paving.box([edge.vertical?x+Math.sign(edge.x-x)*9.1:x,.19,edge.vertical?z:z+Math.sign(edge.z-z)*9.1],
     edge.vertical?[1.4,.14,21]:[21,.14,1.4],'#ddd5bf');
   }
  }
  const park=isOuterPark(x,z);
  if(park){
   const style=Math.abs(x/25*3+z/25)%4;
   land.box([x,.22,z],[18,.06,18],style===2?'#8a8e6b':'#7f8565');
   solid.box([x+(style===1?4:0),.26,z],[style===3?3.2:1.8,.05,18],'#c3b7a2');
   if(style===0)solid.box([x,.26,z+3],[18,.05,1.8],'#c3b7a2');
   if(style===2){solid.box([x-2,.27,z],[8,.05,11],'#9c8270');for(const side of [-1,1])solid.box([x-2+side*3.6,.31,z],[.09,.02,10],'#ded7c2');}
   for(let n=0;n<(style===2?2:5);n++)tree(x-6+(n*7%12),z-6+(n*5%12));
   if(style===1)for(let n=0;n<4;n++)land.box([x-4,.45,z-5+n*3],[4,.4,1.5],n%2?'#897e65':'#6c7f56');
   for(const dx of [-3,3]){solid.box([x+dx,.6,z+6],[1.8,.2,.55],'#80694e');solid.box([x+dx,.9,z+6.2],[1.8,.65,.1],'#80694e');}
  }else if(zone==='homes'){
   const plan=residentialPlot(x,z);
   for(const h of plan.houses){
    const [bx,bz]=plan.point(h.x,h.z);
    building(bx,bz,h.width,8,2,true,false);
    const length=8.5-(h.z+4),[px,pz]=plan.point(h.x,h.z+4+length/2);
    solid.box([px,.24,pz],[1.25,.07,length],'#c8b99f',[0,plan.angle,0]);
    const [hx,hz]=plan.point(h.x-2,7.3);
    if(plan.seed%3!==0)land.box([hx,.65,hz],[2.5,1, .7],'#556b42',[0,plan.angle,0]);
    const [tx,tz]=plan.point(h.x, -8.3);tree(tx,tz);
   }
   if(plan.houses.length===1){const [tx,tz]=plan.point(-6,3);tree(tx,tz);}
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
   const form=Math.abs(x/25*7+z/25*3)%4;
   if(form===0)building(x,z-1.4,14.8,11.2,floors,false,true);
   else if(form===1){building(x-3.7,z-2,8.7,11.5,floors,false,true);building(x+5.3,z+1,5.1,7.2,2,false,true);}
   else if(form===2){building(x,z-2.5,11.8,10,floors+1,false,false);building(x+5.5,z+4,4.5,4,1,false,true);}
   else{building(x-4.5,z-1.8,7.1,12,floors,false,true);building(x+4.1,z-.7,7.5,8.6,Math.max(2,floors-2),false,true);}
   if(!cleared){solid.box([x,.23,z+6.3],[16,.045,4],'#737473');
   for(const dx of [-5,-2,1,4])solid.box([x+dx,.26,z+6.3],[.08,.02,3.5],'#d0c7ab');}
   car(x-3.4,z+6.1);if(random()>.4)car(x+2.5,z+6.1);
   tree(x+8,z+6.6);
  }
  solid.box([x-8.5,1.8,z+8.5],[.1,3.3,.1],'#444c4e');
  lit.box([x-8.5,3.5,z+8.5],[.48,.13,.3],'#d9cbaa');
  solid.box([x-8.3,.55,z+5.8],[.55,.8,.55],'#5b655d');
 }
 return {solid:shapeCityGeometry(solid.finish()),glass:shapeCityGeometry(glass.finish()),lit:shapeCityGeometry(lit.finish()),land:shapeCityGeometry(land.finish()),masonry:architecturalUV(shapeCityGeometry(masonry.finish())),paving:architecturalUV(shapeCityGeometry(paving.finish()))};
}
