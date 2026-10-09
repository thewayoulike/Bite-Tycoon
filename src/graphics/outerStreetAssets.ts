import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type {OuterCarPlacement,OuterTreePlacement} from './outerCity';
import {getTreeParts,vehicleSource,type VehicleStyle} from './streetAssetLibrary';
import {simplifySceneryGeometry,distantLeafGeometry} from './sceneryPerformance';

export type StreetInstance={matrix:THREE.Matrix4;position:THREE.Vector3;color?:THREE.Color;lod?:number};
export type StreetBatch={geometry:THREE.BufferGeometry;material:THREE.MeshStandardMaterial;instances:StreetInstance[];minDistance:number;maxDistance:number;leaves?:boolean;lod?:number;thresholds?:number[]};
const distantTrees=new WeakMap<THREE.BufferGeometry,THREE.BufferGeometry>();
export function outerTreeBatches(library:THREE.Group,placements:OuterTreePlacement[]):StreetBatch[]{
  return ['oak','aspen','ash'].flatMap((species,index)=>{
    const instances=placements.filter(p=>p.seed%3===index).map(p=>({
      position:new THREE.Vector3(p.x,.3,p.z),
      matrix:new THREE.Matrix4().compose(new THREE.Vector3(p.x,.3,p.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),p.seed*.63),new THREE.Vector3(p.scale,p.scale,p.scale)),
    }));
    return [0,1,2].flatMap(lod=>Object.entries(getTreeParts(library,species,Math.min(lod,1))).map(([kind,mesh])=>{
      let geometry=mesh.geometry;
      if(lod===2){if(!distantTrees.has(geometry))distantTrees.set(geometry,kind==='leaves'?distantLeafGeometry(geometry):simplifySceneryGeometry(geometry,.24));geometry=distantTrees.get(geometry)!;}
      return {geometry,material:mesh.material,instances,minDistance:[0,55,145][lod],maxDistance:[55,145,850][lod],leaves:kind==='leaves',lod,thresholds:[55,145]};
    }));
  });
}
/** Bake local wheel/body transforms once; parked cars share a draw per material and body style. */
export function outerCarBatches(library:THREE.Group,placements:OuterCarPlacement[]):StreetBatch[]{
  return (['sedan','hatchback','suv','truck'] as VehicleStyle[]).flatMap(style=>{
    const spots=placements.filter(p=>p.style===style);
    if(!spots.length)return [];
    const source=vehicleSource(library,style)!;
    source.updateWorldMatrix(true,true);
    const inverse=new THREE.Matrix4().copy(source.matrixWorld).invert();
    const materials=new Map<THREE.MeshStandardMaterial,THREE.BufferGeometry[]>();
    source.traverse(node=>{
      const mesh=node as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
      if(!mesh.isMesh)return;
      const g=mesh.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld));
      const list=materials.get(mesh.material)??[];list.push(g);materials.set(mesh.material,list);
    });
    const sharedInstances=spots.map(p=>({position:new THREE.Vector3(p.x,.26,p.z),matrix:new THREE.Matrix4().compose(new THREE.Vector3(p.x,.26,p.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),style==='truck'?Math.PI/2:0),new THREE.Vector3(style==='truck'?1:.84,style==='truck'?1:.84,style==='truck'?1:.84))}));
    return [...materials].flatMap(([original,parts])=>{
      const geometry=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());
      const material=original.clone();
      if(material.name==='paint')material.color.set('#ffffff');
      // Parked cars are switched off, even when street lights come on.
      if(material.name==='headlights'||material.name==='taillights')material.emissiveIntensity=.04;
      const instances=sharedInstances.map((item,i)=>({...item,color:material.name==='paint'?new THREE.Color(spots[i].color):undefined}));
      return [{geometry,material,instances,minDistance:0,maxDistance:100,lod:0,thresholds:[100]}, {geometry:simplifySceneryGeometry(geometry,.18),material,instances,minDistance:100,maxDistance:850,lod:1,thresholds:[100]}];
    });
  });
}
