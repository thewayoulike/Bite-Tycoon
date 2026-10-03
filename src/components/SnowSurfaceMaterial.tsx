import {useMemo} from 'react';
import * as THREE from 'three';

/** A dusting settles on upward-facing roofs and paving without duplicating city geometry. */
export function SnowSurfaceMaterial({snow}:{snow:number}){
 const uniform=useMemo(()=>({value:snow}),[]);uniform.value=snow;
 const compile=useMemo(()=>(shader:THREE.WebGLProgramParametersWithUniforms)=>{
  shader.uniforms.snowCover=uniform;
  shader.vertexShader='varying float snowFacing;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsnowFacing=max(0.,normalize(mat3(modelMatrix)*objectNormal).y);');
  shader.fragmentShader='uniform float snowCover; varying float snowFacing;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.83,.87),snowCover*smoothstep(.65,.96,snowFacing));');
 },[uniform]);
 return <meshStandardMaterial vertexColors roughness={.85} onBeforeCompile={compile} customProgramCacheKey={()=>'city-snow-surface-v1'}/>;
}
