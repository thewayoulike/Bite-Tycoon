import {ModelParts} from './modelParts';
import {CylinderGeometry} from 'three';

export function industrialProfile(x:number,z:number){
  const variant=Math.abs(x/25+z/25)%3;
  return {variant,height:[11.5,14,10][variant]};
}
export function industrialStacks(x:number,z:number){
  const {variant,height}=industrialProfile(x,z);
  return (variant===1?[-5.3,5.3]:[5.3]).map((dx,i)=>({x:x+dx,z:z-5.5,base:height+.5,top:height+12+i*3,radius:variant===2?.85:.7}));
}

/** Non-interactive industrial scenery: no businesses, staff, stock or saved accounts. */
export function addIndustrialLot(solid:ModelParts,glass:ModelParts,land:ModelParts,x:number,z:number){
  const {variant,height:h}=industrialProfile(x,z);
  const wall=variant===0?'#9d9c94':variant===1?'#9b806b':'#829197',roof='#5f686c';
  solid.box([x,.23,z],[17.5,.04,17.5],'#858783');
  solid.box([x,h/2+.3,z-2.2],[15,h,10.4],wall);
  solid.box([x,h+.38,z-2.2],[15.4,.25,10.8],roof);
  // Corrugated elevations, roof vents and a clerestory window band.
  for(let dx=-7;dx<=7;dx+=.85)solid.box([x+dx,h/2+.3,z+3.06],[.06,h,.06],'#a7aba7');
  for(const side of [-1,1])for(const dz of [-5.6,-2.3,1])glass.box([x+side*7.54,h-1,z+dz],[.035,.65,2.6],'#596f79');
  for(const dx of [-4,4]){solid.box([x+dx,h+.84,z-3.8],[1.8,.75,1.4],'#8c989a');for(let i=0;i<5;i++)solid.box([x+dx-.6+i*.3,h+.86,z-3.07],[.07,.55,.035],'#4b585c');}
  // Multi-storey production halls, steel frames and roof-level service walkways.
  for(const y of [4.8,8.2]){
    solid.box([x,y,z+3.16],[15,.2,.16],'#56646b');
    for(const dx of [-5.6,-1.8,2,5.8]){
      solid.box([x+dx,y+1.1,z+3.17],[2.9,1.65,.12],'#b1b3aa');
      glass.box([x+dx,y+1.1,z+3.25],[2.65,1.4,.04],'#566d79');
      solid.box([x+dx,y+1.1,z+3.28],[.06,1.4,.05],'#b7bbb7');
    }
  }
  for(const dx of [-7.35,-3.7,0,3.7,7.35])solid.box([x+dx,h/2+.4,z+3.32],[.18,h,.2],'#5d6c71');
  if(variant===0){
    // Sawtooth roof lights identify the manufacturing halls.
    for(const dx of [-4.8,-1.5,1.8]){
      solid.box([x+dx,h+1.2,z-.8],[2.6,1.3,6],'#8b9291');
      glass.box([x+dx,h+1.94,z-.8],[2.6,.07,6],'#8da1a5',[0,0,.16]);
      solid.box([x+dx-1.35,h+1.65,z-.8],[.12,1.2,6.1],'#536167');
    }
  }else if(variant===1){
    // Tall processing vessels with collars, pipework and access platforms.
    for(const dx of [-3.4,0,3.4]){
      solid.add(new CylinderGeometry(1.15,1.15,6,14),'#b1b8b5',[x+dx,h+3.5,z-.5]);
      solid.add(new CylinderGeometry(.55,1.17,1.15,14),'#8f9e9f',[x+dx,h+7.05,z-.5]);
      for(const dy of [1.1,5.5])solid.add(new CylinderGeometry(1.22,1.22,.17,14),'#718389',[x+dx,h+dy,z-.5]);
      solid.branch([x+dx,h+6.6,z-.5],[x+dx,h+6.6,z+2.6],.15,.15,'#6b7d85',8);
    }
    solid.box([x,h+1.15,z+2.7],[11,.16,1.1],'#7b898d');
    for(const dx of [-5,0,5])solid.box([x+dx,h+1.8,z+3.2],[.07,1.3,.07],'#a5afaa');
    solid.box([x,h+2.4,z+3.2],[11,.07,.07],'#a5afaa');
  }else{
    for(const dx of [-4.5,-1.2]){
      solid.add(new CylinderGeometry(1.3,1.3,4.4,14),'#899aa0',[x+dx,h+2.7,z-.6]);
      solid.add(new CylinderGeometry(.2,1.3,.8,14),'#a4b0b1',[x+dx,h+5.3,z-.6]);
      solid.branch([x+dx,h+3,z-.6],[x+dx,h+3,z-4],.23,.23,'#6b7c85',8);
    }
  }
  for(const stack of industrialStacks(x,z)){
    const length=stack.top-stack.base;
    solid.add(new CylinderGeometry(stack.radius*.8,stack.radius,length,14),variant===1?'#a08673':'#7c8587',[stack.x,(stack.top+stack.base)/2,stack.z]);
    for(const y of [stack.top-5,stack.top-2])solid.add(new CylinderGeometry(stack.radius*.93,stack.radius*.96,.55,14),'#b9b6a7',[stack.x,y,stack.z]);
    solid.add(new CylinderGeometry(stack.radius*.9,stack.radius*.9,.22,14),'#3b464c',[stack.x,stack.top,stack.z]);
    solid.box([stack.x-stack.radius-.18,(stack.base+stack.top)/2,stack.z],[.09,length,.09],'#5f6e73');
    for(let y=stack.base;y<stack.top;y+=.6)solid.box([stack.x-stack.radius-.18,y,stack.z],[.48,.06,.08],'#75858a');
  }
  // Loading bays open onto a service yard, with room for vehicles to turn.
  for(const dx of [-4.6,.2]){
    solid.box([x+dx,2.08,z+3.15],[3.8,3.5,.15],'#525f64');
    for(let y=.6;y<3.8;y+=.36)solid.box([x+dx,y,z+3.25],[3.65,.035,.035],'#93a0a0');
    solid.box([x+dx,.5,z+3.65],[4,.65,1.1],'#a5a49b');
    for(const side of [-1,1])solid.box([x+dx+side*2,1,z+4.2],[.12,1.5,.12],'#c0a258');
  }
  glass.box([x+5.5,1.8,z+3.2],[1.35,2.6,.1],'#3c555d');
  solid.box([x+5.5,3.3,z+3.65],[2.4,.1,1.1],roof);
  for(const dx of [-6,-1,4])solid.box([x+dx,.28,z+6.7],[.1,.025,3.5],'#cebea0');
  // Vehicles are supplied by the same shared street-model library as every other district.
  for(const dx of [5.1,6.7]){solid.box([x+dx,.36,z+5],[1.3,.18,1.1],'#8e7857');solid.box([x+dx,.94,z+5],[1.2,.95,1],'#ac9473');}
  // Low planted edges soften the service area without masking the loading access.
  for(const side of [-1,1])land.box([x+side*8.2,.4,z-2.5],[.5,.35,11.5],'#727d61');
}
