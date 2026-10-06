import {CITY_LOTS} from './cityDistrictLayout';
import {OUTER_LOTS,isOuterPark} from './outerCity';

export type HousePlacement={position:[number,number,number];rotation:number;scale:[number,number,number]};
// Narrow the approved house to the existing paired plots; preserve adult-height doors.
export const HOUSE_PLOT_SCALE:[number,number,number]=[.66,.9,.82];
export const DISTRICT_HOUSES:HousePlacement[]=CITY_LOTS.filter(lot=>lot.kind==='homes').flatMap(lot=>[-4.1,4.1].map(x=>{
  const angle=lot.rotation??0,z=-1;
  return {position:[lot.position[0]+x*Math.cos(angle)+z*Math.sin(angle),lot.position[1]+.22,lot.position[2]-x*Math.sin(angle)+z*Math.cos(angle)] as [number,number,number],rotation:angle,scale:HOUSE_PLOT_SCALE};
}));
export const OUTER_HOUSES:HousePlacement[][]=[0,1,2,3].map(q=>OUTER_LOTS.filter(lot=>lot.zone==='homes'&&!isOuterPark(lot.x,lot.z)&&(lot.x<0?1:0)+(lot.z<0?2:0)===q).flatMap(lot=>[-4.35,4.35].map(x=>({position:[lot.x+x,.24,lot.z-2] as [number,number,number],rotation:0,scale:HOUSE_PLOT_SCALE}))));
