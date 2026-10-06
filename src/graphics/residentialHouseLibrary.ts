import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {assembleBuilding} from './buildingAssembly';
import {buildResidentialHouseDetails} from './residentialHouseDetails';
import type {HouseStyle} from './residentialAppearance';

export const RESIDENTIAL_HOUSE={width:10,depth:9,floorHeight:2.9,floors:2};
export type HousePart={geometry:THREE.BufferGeometry;material:THREE.MeshStandardMaterial;styles?:HouseStyle[]};
export let residentialHouseParts:HousePart[]|null=null;
let request:Promise<HousePart[]|null>|undefined;

/** Bake the approved two-storey exterior once, grouped by material for instancing. */
export function compileResidentialHouse(source:THREE.Object3D):HousePart[] {
  const root=assembleBuilding(source,RESIDENTIAL_HOUSE,2,false,0),groups=new Map<THREE.MeshStandardMaterial,THREE.BufferGeometry[]>();
  root.updateMatrixWorld(true);
  root.traverseVisible(node=>{
    const mesh=node as THREE.Mesh;if(!mesh.isMesh)return;
    const material=mesh.material as THREE.MeshStandardMaterial;
    const transformed=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    const geometry=transformed.index?transformed.toNonIndexed():transformed;
    if(geometry!==transformed)transformed.dispose();
    for(const key of Object.keys(geometry.attributes))if(!['position','normal','uv'].includes(key))geometry.deleteAttribute(key);
    geometry.clearGroups();
    const list=groups.get(material)??[];list.push(geometry);groups.set(material,list);
  });
  return [...groups].map(([material,geometries])=>{
    const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
    if(!geometry)throw new Error('Could not combine the residential house geometry.');
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    if(material.map)material.map.anisotropy=4;
    if(material.normalMap)material.normalMap.anisotropy=4;
    return {geometry,material};
  });
}
export function loadResidentialHouse() {
  return request??=new GLTFLoader().loadAsync('/models/building-prototype/house.glb?v=1').then(gltf=>{
    residentialHouseParts=[...compileResidentialHouse(gltf.scene),...buildResidentialHouseDetails()];return residentialHouseParts;
  }).catch(error=>{console.warn('Residential house could not load; keeping the existing houses.',error);return null;});
}
