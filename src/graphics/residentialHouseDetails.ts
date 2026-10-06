import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type {HousePart} from './residentialHouseLibrary';
import type {HouseStyle} from './residentialAppearance';

/** Small exterior additions, each shared by every home of the corresponding style. */
export function buildResidentialHouseDetails():HousePart[] {
  const groups=new Map<string,{geometries:THREE.BufferGeometry[];styles:HouseStyle[];material:THREE.MeshStandardMaterial}>();
  const add=(geometry:THREE.BufferGeometry,position:[number,number,number],name:string,color:string,styles:HouseStyle[])=>{
    geometry.translate(...position);
    const surface=geometry.index?geometry.toNonIndexed():geometry;
    if(surface!==geometry)geometry.dispose();
    surface.deleteAttribute('uv');surface.clearGroups();
    const key=name+styles.join();
    if(!groups.has(key)){const material=new THREE.MeshStandardMaterial({color,roughness:name==='house_glass'?.28:.85});material.name=name;groups.set(key,{geometries:[],styles,material});}
    groups.get(key)!.geometries.push(surface);
  };
  const box=(position:[number,number,number],size:[number,number,number],name:string,color:string,styles:HouseStyle[])=>add(new THREE.BoxGeometry(...size),position,name,color,styles);
  // Louvered shutters: keep the middle bay and entrance clear.
  for(const y of [1.66,4.56])for(const x of [-10/3,10/3])for(const side of [-1,1]){
    const sx=x+side*1.12;
    box([sx,y,4.72],[.33,1.72,.075],'house_accent','#ffffff',[1]);
    for(let slat=0;slat<8;slat++)box([sx,y-.72+slat*.205,4.775],[.30,.035,.05],'house_accent','#ffffff',[1]);
  }
  // A clear central stair opening, with rails around the two porch seating areas.
  for(const side of [-1,1]){
    for(const y of [.62,1.24]){
      box([side*1.975,y,6.25],[1.65,.07,.075],'house_trim','#ffffff',[1,2]);
      box([side*2.8,y,5.48],[.075,.07,1.54],'house_trim','#ffffff',[1,2]);
    }
    for(let i=0;i<6;i++)box([side*(1.2+i*.31),.93,6.25],[.04,.58,.04],'house_trim','#ffffff',[1,2]);
    for(let i=0;i<5;i++)box([side*2.8,.93,4.78+i*.31],[.04,.58,.04],'house_trim','#ffffff',[1,2]);
    box([side*1.15,.87,6.25],[.11,.95,.11],'house_trim','#ffffff',[1,2]);
    // Upper window boxes stay against the wall, away from paths and entrance.
    const x=side*10/3;
    box([x,3.52,4.88],[1.92,.24,.38],'house_accent','#ffffff',[2]);
    box([x,3.67,4.87],[1.78,.13,.29],'house_foliage','#5f704c',[2]);
    for(let bloom=0;bloom<5;bloom++)box([x-.7+bloom*.35,3.77,4.92],[.16,.10,.15],'house_flowers','#b7a39b',[2]);
  }
  add(new THREE.TorusGeometry(.43,.065,6,18),[0,6.85,4.64],'house_trim','#ffffff',[2]);
  add(new THREE.CircleGeometry(.405,18),[0,6.85,4.625],'house_glass','#384b55',[2]);
  box([0,6.85,4.66],[.04,.82,.035],'house_trim','#ffffff',[2]);
  box([0,6.85,4.66],[.82,.04,.035],'house_trim','#ffffff',[2]);
  return [...groups.values()].map(({geometries,styles,material})=>{
    const geometry=mergeGeometries(geometries)!;geometries.forEach(g=>g.dispose());
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    return {geometry,material,styles};
  });
}
