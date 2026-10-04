import {LodgingLayout,FloorPoint,walkablePoint,lodgingWalkingPath} from '../empire/lodgingLayout';
const centers:Record<string,FloorPoint>={restaurant:{x:-5,z:-5.5},gym:{x:5.5,z:-5},conference:{x:5.2,z:2.5},rooftop:{x:-5.4,z:3},'resident-laundry':{x:-5.5,z:-7},bikes:{x:-7.4,z:6},'work-lounge':{x:5,z:-6},playroom:{x:-5.5,z:1},fitness:{x:5.5,z:2.8},terrace:{x:-3,z:7},'roof-garden':{x:-3,z:7}};
/** Choose an accessible point next to the fixture, never on or through it. */
export function amenityDestination(layout:LodgingLayout,facility:string,place=0):FloorPoint{
 const center=centers[facility]??{x:0,z:0},candidates:FloorPoint[]=[];
 for(let x=-8;x<=8;x+=.5)for(let z=-8;z<=8;z+=.5)if(walkablePoint(layout,{x,z}))candidates.push({x,z});
 const target={x:center.x+(place%3-1)*.7,z:center.z+Math.floor(place/3)*.8};
 candidates.sort((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z));
 return candidates.find(p=>lodgingWalkingPath(layout,layout.elevator,p).length>0)??layout.elevator;
}
