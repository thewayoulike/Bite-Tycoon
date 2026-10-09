import {memo,useEffect,useMemo,useState} from 'react';
import * as THREE from 'three';
import {HousePart,loadResidentialHouse,residentialHouseParts} from '../graphics/residentialHouseLibrary';
import type {HousePlacement} from '../graphics/residentialLayout';
import {houseMaterialTint} from '../graphics/residentialAppearance';
import {SceneryInstances} from './OuterStreetAssets3D';

export function useResidentialHouseParts(){
  const [parts,setParts]=useState(residentialHouseParts);
  useEffect(()=>{let active=true;loadResidentialHouse().then(value=>{if(active)setParts(value);});return()=>{active=false;};},[]);
  return parts;
}
const HouseInstances=memo(function HouseInstances({part,placements,isNight,snow}:{part:HousePart;placements:HousePlacement[];isNight:boolean;snow:number}){
  const visiblePlacements=useMemo(()=>part.styles?placements.filter(item=>part.styles!.includes(item.style)):placements,[part,placements]);
  const snowUniform=useMemo(()=>({value:snow}),[]);snowUniform.value=snow;
  const material=useMemo(()=>{
    const m=part.material.clone();
    m.onBeforeCompile=shader=>{
      shader.uniforms.houseSnow=snowUniform;
      shader.vertexShader='varying float houseUp;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nhouseUp=max(0.,normalize(objectNormal).y);');
      shader.fragmentShader='uniform float houseSnow; varying float houseUp;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.83,.87),houseSnow*smoothstep(.65,.96,houseUp));');
    };
    m.customProgramCacheKey=()=> 'residential-house-snow-v1';
    return m;
  },[part,snowUniform]);
  useEffect(()=>()=>material.dispose(),[material]);
  useEffect(()=>{if(material.name==='window_lit'||material.name==='lamp')material.emissiveIntensity=isNight?1.1:.08;},[material,isNight]);
  const batch=useMemo(()=>{
    const transform=new THREE.Object3D();
    const instances=visiblePlacements.map(item=>{transform.position.set(...item.position);transform.rotation.set(0,item.rotation,0);transform.scale.set(...item.scale);transform.updateMatrix();return {position:transform.position.clone(),matrix:transform.matrix.clone(),color:houseMaterialTint(part.material,item.palette)};});
    return {geometry:part.geometry,material,instances,minDistance:0,maxDistance:850};
  },[visiblePlacements,part,material]);
  if(!visiblePlacements.length)return null;
  return <SceneryInstances batch={batch}/>;
});
export const ResidentialHouses3D=memo(function ResidentialHouses3D({parts,placements,isNight,snow=0}:{parts:HousePart[];placements:HousePlacement[];isNight:boolean;snow?:number}){
  return <group name="approved-cedar-houses">{parts.map((part,i)=><HouseInstances key={i} {...{part,placements,isNight,snow}}/>)}</group>;
});
