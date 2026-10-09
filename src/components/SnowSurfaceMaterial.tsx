import {createContext,useContext,useMemo} from 'react';
import * as THREE from 'three';
export const CitySnowContext=createContext(0);

/** A dusting settles on upward-facing roofs and paving without duplicating city geometry. */
export function SnowSurfaceMaterial({snow:explicitSnow,vertexColors=true,color='#ffffff',map,roughness=.85,metalness=0}:{snow?:number;vertexColors?:boolean;color?:THREE.ColorRepresentation;map?:THREE.Texture|null;roughness?:number;metalness?:number}){
 const contextSnow=useContext(CitySnowContext),snow=explicitSnow??contextSnow;
 const uniform=useMemo(()=>({value:snow}),[]);uniform.value=snow;
 const compile=useMemo(()=>(shader:THREE.WebGLProgramParametersWithUniforms)=>{
  shader.uniforms.snowCover=uniform;
  shader.vertexShader='varying float snowFacing;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsnowFacing=max(0.,inverseTransformDirection(transformedNormal,viewMatrix).y);');
  shader.fragmentShader='uniform float snowCover; varying float snowFacing;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.83,.87),snowCover*smoothstep(.65,.96,snowFacing));');
 },[uniform]);
 return <meshStandardMaterial vertexColors={vertexColors} color={color} map={map} roughness={roughness} metalness={metalness} onBeforeCompile={compile} customProgramCacheKey={()=>'city-snow-surface-v1'}/>;
}
