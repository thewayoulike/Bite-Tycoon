import * as THREE from 'three';
import type {RestaurantAppearance} from './propertyArchitecture';
import {RESTAURANT_IDENTITIES} from '../empire/restaurantIdentity';

/** Render-only finishes. Player paint and purchased architectural designs still win. */
export function restaurantFinish(appearance:RestaurantAppearance){
  const theme=RESTAURANT_IDENTITIES[appearance.identity];
  const originalWall=appearance.wall.toLowerCase()===theme.wall.toLowerCase();
  const originalFrame=appearance.frame.toLowerCase()===theme.frame.toLowerCase();
  const natural={diner:'#805740',cafe:'#99735b',bistro:'#b7ad93',italian:'#986a4e',fastfood:'#9e7761',indian:'#99674c',japanese:'#a09885'};
  const accents={diner:'#25443c',cafe:'#36564b',bistro:'#51604b',italian:'#3e5341',fastfood:'#813f32',indian:'#82573e',japanese:'#41463f'};
  return {
    wall:!appearance.design&&originalWall?natural[appearance.identity]:appearance.wall,
    frame:!appearance.design&&originalFrame?accents[appearance.identity]:appearance.frame,
    surface:appearance.design==='modern'?'concrete' as const:appearance.design==='garden'||['bistro','japanese'].includes(appearance.identity)?'plaster' as const:'brick' as const,
    stone:'#dfd3bb',plaster:'#e1d6c1',brass:'#aa8956',
  };
}

/** World-sized UVs keep brick courses continuous across separately batched wall pieces. */
export function architecturalUV(geometry:THREE.BufferGeometry){
  const positions=geometry.getAttribute('position'),normals=geometry.getAttribute('normal'),uv=new Float32Array(positions.count*2);
  for(let i=0;i<positions.count;i++){
    const nx=Math.abs(normals.getX(i)),ny=Math.abs(normals.getY(i)),nz=Math.abs(normals.getZ(i));
    uv[i*2]=(nx>nz?positions.getZ(i):positions.getX(i))/8;
    uv[i*2+1]=(ny>.8?positions.getZ(i):positions.getY(i))/8;
  }
  geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));return geometry;
}
