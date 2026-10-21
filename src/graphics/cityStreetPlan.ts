import {outerCityZone} from './cityZoning';

/** Addresses stay fixed. Joining plots into larger urban blocks and courtyards
 * changes the city streets without moving existing businesses or saved sites. */
export type CityStreetSegment={id:string;x:number;z:number;vertical:boolean;width:number;road:boolean;curve:number;zone:ReturnType<typeof outerCityZone>};
export const STREET_LINES=Array.from({length:22},(_,i)=>-262.5+i*25);
export const CITY_STREET_PLAN:CityStreetSegment[]=STREET_LINES.flatMap((fixed,index)=>
 Array.from({length:21},(_,j)=>-250+j*25).flatMap((along,j)=>[true,false].flatMap(vertical=>{
  const x=vertical?fixed:along,z=vertical?along:fixed;
  if(Math.abs(x)<63&&Math.abs(z)<63)return [];
  const zone=outerCityZone(x,z);
  const main=vertical?[-262.5,-162.5,-62.5,62.5,162.5,262.5].includes(fixed):[-262.5,-187.5,-62.5,62.5,187.5,262.5].includes(fixed);
  let road=true;
  if(!main){
   if(zone==='homes')road=vertical?index%3!==1||j%5===2:index%3===0||j%4===1;
   else if(zone==='industry')road=vertical?index%2===0:index%3===0;
   else if(zone==='commercial')road=vertical||index%2===0||j%5===0;
   else road=vertical||index%3===0;
   if(!vertical&&Math.abs(x)<13)road=false;
  }
  return [{id:`${vertical?'v':'h'}:${index}:${j}`,x,z,vertical,road,zone,width:main?6.5:zone==='homes'?4.4:5.2,curve:!main&&zone==='homes'?Math.sin(index*7+j*3)*1.1:0}];
 })));

export function plotStreetEdges(x:number,z:number){
 return CITY_STREET_PLAN.filter(s=>s.road&&(s.vertical?Math.abs(s.x-x)===12.5&&s.z===z:Math.abs(s.z-z)===12.5&&s.x===x));
}
