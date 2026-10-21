import type {BufferGeometry} from 'three';

/** The residential streets follow a gentle bend around the western neighbourhood.
 * Commercial addresses and the original centre remain at their saved coordinates. */
export function cityPosition(x:number,z:number):[number,number]{
 const t=Math.max(0,Math.min(1,(-x-62.5)/200)),bend=Math.sin(t*Math.PI);
 return [x+bend*(7*Math.sin(z/70)+3*Math.sin(z/34)),
   z+bend*(15*Math.sin((x+62.5)/60)+7*Math.sin(z/95))];
}
export function cityHeading(x:number,z:number,angle:number){
 const a=cityPosition(x,z),b=cityPosition(x+Math.sin(angle),z+Math.cos(angle));
 return Math.atan2(b[0]-a[0],b[1]-a[1]);
}
export function shapeCityGeometry(g:BufferGeometry){
 const p=g.getAttribute('position');
 for(let i=0;i<p.count;i++){const [x,z]=cityPosition(p.getX(i),p.getZ(i));p.setXYZ(i,x,p.getY(i),z);}
 p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();return g;
}
