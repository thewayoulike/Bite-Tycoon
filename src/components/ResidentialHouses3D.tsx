import {memo,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import * as THREE from 'three';
import {HousePart,loadResidentialHouse,residentialHouseParts} from '../graphics/residentialHouseLibrary';
import type {HousePlacement} from '../graphics/residentialLayout';

export function useResidentialHouseParts(){
  const [parts,setParts]=useState(residentialHouseParts);
  useEffect(()=>{let active=true;loadResidentialHouse().then(value=>{if(active)setParts(value);});return()=>{active=false;};},[]);
  return parts;
}
const HouseInstances=memo(function HouseInstances({part,placements,isNight,snow}:{part:HousePart;placements:HousePlacement[];isNight:boolean;snow:number}){
  const ref=useRef<THREE.InstancedMesh>(null),snowUniform=useMemo(()=>({value:snow}),[]);snowUniform.value=snow;
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
  useLayoutEffect(()=>{
    if(!ref.current)return;
    const transform=new THREE.Object3D();
    placements.forEach((item,index)=>{transform.position.set(...item.position);transform.rotation.set(0,item.rotation,0);transform.scale.set(...item.scale);transform.updateMatrix();ref.current!.setMatrixAt(index,transform.matrix);});
    ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere();
  },[placements]);
  return <instancedMesh ref={ref} args={[part.geometry,material,placements.length]} castShadow receiveShadow dispose={null}/>;
});
export const ResidentialHouses3D=memo(function ResidentialHouses3D({parts,placements,isNight,snow=0}:{parts:HousePart[];placements:HousePlacement[];isNight:boolean;snow?:number}){
  return <group name="approved-cedar-houses">{parts.map((part,i)=><HouseInstances key={i} {...{part,placements,isNight,snow}}/>)}</group>;
});
