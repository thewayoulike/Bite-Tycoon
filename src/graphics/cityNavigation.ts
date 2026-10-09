import {MOUSE,TOUCH,Vector3} from 'three';
import {CITY_EDGE} from './outerCity';

export const MAP_MOUSE_BUTTONS={LEFT:MOUSE.PAN,MIDDLE:MOUSE.DOLLY,RIGHT:MOUSE.ROTATE};
export const MAP_TOUCHES={ONE:TOUCH.PAN,TWO:TOUCH.DOLLY_ROTATE};
export type CityArea='town'|'center'|'residential'|'commercial'|'civic'|'industrial'|'railway';
export const CITY_VIEWS:Record<CityArea,{target:[number,number,number];position:[number,number,number]}>= {
  town:{target:[0,2,0],position:[260,260,330]},
  center:{target:[0,2,0],position:[82,64,116]},
  residential:{target:[-142,2,8],position:[-92,90,122]},
  commercial:{target:[146,2,28],position:[204,88,144]},
  civic:{target:[10,2,-48],position:[68,48,-5]},
  industrial:{target:[165,3,-170],position:[230,100,-70]},
  railway:{target:[274,2,90],position:[319,38,136]},
};

/** Translate both ends of the view together so reaching an edge never changes its angle. */
export function constrainCityPan(position:Vector3,target:Vector3,edge=CITY_EDGE){
  const x=Math.max(-edge,Math.min(edge+30,target.x)),z=Math.max(-edge,Math.min(edge,target.z));
  position.x+=x-target.x;position.z+=z-target.z;target.x=x;target.z=z;
}
