import {ModelParts,type Vec3} from './modelParts';
import {CITY_STREET_PLAN} from './cityStreetPlan';
import {shapeCityGeometry} from './cityTerrainLayout';
export function buildOuterRoads(){
 const road=new ModelParts(),marks=new ModelParts(),land=new ModelParts(),details=new ModelParts();
 const junctions=new Map<string,{x:number;z:number;width:number;vertical:boolean;horizontal:boolean}>();
 for(const s of CITY_STREET_PLAN.filter(s=>s.road))for(const end of [-1,1]){
  const x=s.x+(s.vertical?0:end*12.5),z=s.z+(s.vertical?end*12.5:0),key=`${x}:${z}`;
  const j=junctions.get(key)??{x,z,width:0,vertical:false,horizontal:false};
  j.width=Math.max(j.width,s.width);j.vertical||=s.vertical;j.horizontal||=!s.vertical;junctions.set(key,j);
 }
 // Paved junction centres also cover the outside of L-shaped perimeter turns.
 for(const j of junctions.values())if(j.vertical&&j.horizontal)road.box([j.x,.013,j.z],[j.width,.025,j.width],'#494c51');
 const line=(parts:ModelParts,a:Vec3,b:Vec3,width:number,color:string,height=.025)=>{
  const dx=b[0]-a[0],dz=b[2]-a[2];
  parts.box([(a[0]+b[0])/2,a[1],(a[2]+b[2])/2],[width,height,Math.hypot(dx,dz)+.04],color,[0,Math.atan2(dx,dz),0]);
 };
 for(const s of CITY_STREET_PLAN){
  const point=(d:number,y:number):Vec3=>{
   const bend=Math.sin((d+12.5)/25*Math.PI)*s.curve;
   return [s.x+(s.vertical?bend:d),y,s.z+(s.vertical?d:bend)];
  };
  if(s.road){
   const pieces=s.curve||s.x< -62.5?8:1;
   for(let i=0;i<pieces;i++)line(road,point(-12.5+i*25/pieces,.013),point(-12.5+(i+1)*25/pieces,.013),s.width,'#494c51');
   if(s.width>5)for(const d of [-7.5,-2.5,2.5,7.5])line(marks,point(d,.043),point(d+2.2,.043),.1,'#d9d1ac',.015);
   if(s.width===6.5)for(const end of [-1,1])for(let stripe=-2;stripe<=2;stripe++){
    const p=point(end*8.3,.047);p[s.vertical?0:2]+=stripe;
    marks.box(p,s.vertical?[.48,.02,1.5]:[1.5,.02,.48],'#dedbd0');
   }
   // Separate curb stones follow the street curve and stop before junctions.
   // Gaps in the curb align with crossings, so they never block a through-road.
   for(const side of [-1,1])for(let d=-7.2;d<7;d+=1.2){
    const a=point(d,.11),b=point(d+1.12,.11);
    a[s.vertical?0:2]+=side*(s.width/2+.12);b[s.vertical?0:2]+=side*(s.width/2+.12);
    line(details,a,b,.22,'#aaa99f',.18);
   }
   for(const side of [-1,1]){
    const p=point(side*6,.044);p[s.vertical?0:2]+=side*(s.width/2-.28);
    details.box(p,s.vertical?[.34,.025,.65]:[.65,.025,.34],'#303b3d');
    for(let bar=-2;bar<=2;bar++){
     const q:[number,number,number]=[...p];q[1]=.061;q[s.vertical?2:0]+=bar*.105;
     details.box(q,s.vertical?[.3,.016,.033]:[.033,.016,.3],'#6d7371');
    }
   }
  }else{
   const green=s.zone==='homes'||s.zone==='civic';
   // Keep junctions clear: planting must not cap the adjoining through-road.
   line(land,point(-9,.07),point(9,.07),6.65,green?'#7a8466':s.zone==='industry'?'#96968a':'#b3a18c',.06);
   // A few footpaths cross the larger gardens; most former streets become greenery.
   if(!green||s.zone==='civic'||s.id.endsWith(':7')||s.id.endsWith(':14'))
    line(marks,point(-9,.113),point(9,.113),green?1.65:2.2,green?'#c1b69e':'#d1c3aa',.02);
   if(s.zone==='commercial')for(const d of [-7,7]){
    const p=point(d,.55);p[s.vertical?0:2]+=1.8;
    details.box(p,[1.7,.45,.6],'#6d533b');
    details.box([p[0],.88,p[2]+.24],[1.7,.5,.1],'#6d533b');
   }
  }
 }
 return {road:shapeCityGeometry(road.finish()),marks:shapeCityGeometry(marks.finish()),land:shapeCityGeometry(land.finish()),details:shapeCityGeometry(details.finish())};
}
