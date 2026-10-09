import {useEffect,useMemo} from 'react';
import {Color} from 'three';
import {getSurfaceMaterial} from '../graphics/surfaceMaterials';

/** One asphalt texture, world-scale grain and weather treatment across the entire map. */
export function CityRoadMaterial({wet=0,snow=0}:{wet?:number;snow?:number}){
 const material=useMemo(()=>{
  const m=getSurfaceMaterial('asphalt','#494c51',1,1).clone();
  m.color.set(wet?'#b1b6be':'#ffffff');m.roughness=wet?.24:.92;m.metalness=wet?.25:0;
  m.onBeforeCompile=shader=>{
   shader.uniforms.roadSnow={value:snow};shader.uniforms.roadSnowColor={value:new Color('#818990')};
   shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
    vec2 streetUv=(modelMatrix*vec4(position,1.)).xz*.27;
    vMapUv=streetUv;vBumpMapUv=streetUv;`);
   shader.fragmentShader='uniform float roadSnow;uniform vec3 roadSnowColor;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb=mix(diffuseColor.rgb,roadSnowColor,roadSnow*.82);');
  };
  m.customProgramCacheKey=()=>`city-asphalt-v1-${snow}`;
  return m;
 },[wet,snow]);
 useEffect(()=>()=>material.dispose(),[material]);
 return <primitive attach="material" object={material}/>;
}
