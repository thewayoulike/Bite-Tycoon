import {plotStreetEdges} from './cityStreetPlan';

/** Shared yard/house positions prevent the scenery and imported homes drifting apart. */
export function residentialPlot(x:number,z:number){
 const seed=Math.abs(Math.imul(x/25+37,73856093)^Math.imul(z/25+61,19349663));
 const roads=plotStreetEdges(x,z);
 const front=roads.find(r=>!r.vertical&&r.z>z)??roads.find(r=>!r.vertical)??roads[0];
 const angle=!front?0:front.vertical?(front.x>x?Math.PI/2:-Math.PI/2):front.z>z?0:Math.PI;
 const count=seed%5===0?1:2;
 const houses=Array.from({length:count},(_,i)=>({
  x:count===1?(seed%3-1)*1.2:(i===0?-4.6:4.3)+(seed%3-1)*.3,
  z:-1.5-((seed>>(i*3))%4)*.65,
  width:count===1?8.2:6.4,side:i,
 }));
 const point=(dx:number,dz:number):[number,number]=>[x+dx*Math.cos(angle)+dz*Math.sin(angle),z-dx*Math.sin(angle)+dz*Math.cos(angle)];
 return {seed,angle,houses,point,roads};
}
