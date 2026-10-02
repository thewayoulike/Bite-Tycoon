import {useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';

/** A gradient sky keeps daylight blue rather than interpolating morning to muddy grey. */
export function NaturalSky3D({daylight,isNight}:{daylight:number;isNight:boolean}){
 const dome=useRef<THREE.Mesh>(null);
 useFrame(({camera})=>{dome.current?.position.copy(camera.position);});
 const light=isNight?0:Math.min(1,daylight*2.8);
 const uniforms=useMemo(()=>({
  zenith:{value:new THREE.Color('#142239').lerp(new THREE.Color('#789fbe'),light)},
  horizon:{value:new THREE.Color('#263248').lerp(new THREE.Color('#e1e5e5'),light)},
 }),[light]);
 return <mesh ref={dome} renderOrder={-100} frustumCulled={false}>
  <sphereGeometry args={[200,32,16]}/>
  <shaderMaterial side={THREE.BackSide} depthWrite={false} uniforms={uniforms}
   vertexShader={'varying vec3 direction; void main(){direction=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'}
   fragmentShader={'uniform vec3 zenith; uniform vec3 horizon; varying vec3 direction; void main(){float h=max(0.0,normalize(direction).y);vec3 color=mix(horizon,zenith,pow(h,.5));gl_FragColor=vec4(color,1.0);\n #include <tonemapping_fragment>\n #include <colorspace_fragment>\n }'}/>
 </mesh>;
}
