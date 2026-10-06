import {RESIDENTIAL_HOUSE} from '../graphics/residentialHouseLibrary';
export type BuildingDesign={id:'house';name:string;kind:string;description:string;width:number;depth:number;floorHeight:number;floors:number;maxFloors:number;color:string;ground:string[];upper:string[]};
export const buildingDesigns:BuildingDesign[]=[{
  ...RESIDENTIAL_HOUSE,id:'house',name:'Cedar House',kind:'Residential street',maxFloors:2,color:'#737e75',
  description:'The approved two-storey family home, with clapboard siding, a pitched slate roof, chimney and sheltered porch. Used in pairs throughout the game’s residential neighborhood.',
  ground:['Living room','Kitchen & dining','Staircase'],upper:['Two bedrooms','Bathroom','Reading nook'],
}];
export function readPreviewSelection(search:string) {
  const params=new URLSearchParams(search),raw=Number(params.get('floor'));
  return {design:buildingDesigns[0],floors:2,floor:Number.isFinite(raw)?Math.max(0,Math.min(1,Math.trunc(raw))):0,inside:params.get('view')==='inside',night:params.get('time')==='night'};
}
