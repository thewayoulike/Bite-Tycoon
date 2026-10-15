import {MOUSE,TOUCH,Vector3} from 'three';
import {SCENIC_BOUNDS} from './airportAndCoast';

export const MAP_MOUSE_BUTTONS={LEFT:MOUSE.PAN,MIDDLE:MOUSE.DOLLY,RIGHT:MOUSE.ROTATE};
export const MAP_TOUCHES={ONE:TOUCH.PAN,TWO:TOUCH.DOLLY_ROTATE};
export const CITY_CAMERA_MIN_HEIGHT=1.65;
export const CITY_STREET_MAX_POLAR=Math.PI/2-.025;
export type CityArea='town'|'center'|'residential'|'commercial'|'civic'|'industrial'|'railway'|'airport'|'seafront';
export const CITY_VIEWS:Record<CityArea,{target:[number,number,number];position:[number,number,number]}>= {
  town:{target:[90,2,35],position:[350,280,390]},
  center:{target:[0,2,0],position:[82,64,116]},
  residential:{target:[-142,2,8],position:[-92,90,122]},
  commercial:{target:[146,2,28],position:[204,88,144]},
  civic:{target:[10,2,-48],position:[68,48,-5]},
  industrial:{target:[165,3,-170],position:[230,100,-70]},
  railway:{target:[274,2,90],position:[319,38,136]},
  airport:{target:[416,3,-50],position:[590,155,170]},
  seafront:{target:[-15,2,344],position:[45,115,520]},
};

/** Translate both ends of the view together so reaching an edge never changes its angle. */
export function constrainCityPan(position:Vector3,target:Vector3,edge?:number){
  const bounds=edge===undefined?SCENIC_BOUNDS:{minX:-edge,maxX:edge+30,minZ:-edge,maxZ:edge};
  const x=Math.max(bounds.minX,Math.min(bounds.maxX,target.x)),z=Math.max(bounds.minZ,Math.min(bounds.maxZ,target.z));
  position.x+=x-target.x;position.z+=z-target.z;target.x=x;target.z=z;
}

/** Outdoor camera floor applies after orbit, zoom and pan so the sea and
 * terrain can never be viewed from underneath. Interior floor views are separate. */
export function constrainCityHeight(position:Vector3,target:Vector3){
  let changed=false;
  if(target.y<.8){position.y+=.8-target.y;target.y=.8;changed=true;}
  if(position.y<CITY_CAMERA_MIN_HEIGHT){position.y=CITY_CAMERA_MIN_HEIGHT;changed=true;}
  return changed;
}
