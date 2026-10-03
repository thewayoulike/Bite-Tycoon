import {createContext,useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {seededRandom} from '../graphics/modelParts';
import type {Weather} from '../empire/weather';

export const WeatherMotionContext=createContext<{wind:number;speed:number}|null>(null);
/** GPU particles move in world space; the cutaway's footprint is kept dry on every floor. */
export function Weather3D({weather,speed,fast,shelter}:{weather:Weather;speed:number;fast:boolean;shelter?:[number,number,number,number]}){
 const {camera}=useThree(),elapsed=useRef(0),materialRef=useRef<THREE.ShaderMaterial>(null),kind=weather.kind;
 const rain=kind==='rain',wind=kind==='wind',active=rain||wind||kind==='snow';
 const geometry=useMemo(()=>{
  const count=wind?(fast?70:180):fast?450:1800,random=seededRandom(127),positions:number[]=[],tails:number[]=[];
  for(let i=0;i<count;i++){
   const p=[(random()-.5)*130,random()*60,(random()-.5)*130];
   positions.push(...p);tails.push(0);
   if(rain){positions.push(...p);tails.push(1);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('tail',new THREE.Float32BufferAttribute(tails,1));return g;
 },[fast,rain,wind]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 const uniforms=useMemo(()=>({time:{value:0},center:{value:new THREE.Vector2()},shelter:{value:new THREE.Vector4(0,0,0,0)},hasShelter:{value:0},wind:{value:0},rain:{value:0},gust:{value:0},tint:{value:new THREE.Color()},opacity:{value:.7}}),[]);
 uniforms.shelter.value.set(...(shelter??[0,0,0,0]));uniforms.hasShelter.value=shelter?1:0;
 uniforms.wind.value=weather.wind/12;uniforms.rain.value=rain?1:0;uniforms.gust.value=wind?1:0;
 uniforms.tint.value.set(rain?'#b7d2e4':wind?'#b9a080':'#ffffff');uniforms.opacity.value=rain?.5:wind?.65:.85;
 useFrame((_,dt)=>{
  elapsed.current+=Math.min(dt,.08)*speed;
  uniforms.time.value=elapsed.current;
  // Keep particles ahead of the lens; no React state updates or particle arrays per frame.
  uniforms.center.value.set(camera.position.x,camera.position.z);
  if(materialRef.current)materialRef.current.uniformsNeedUpdate=true;
 });
 if(!active)return null;
 const material=<shaderMaterial ref={materialRef} transparent depthWrite={false} uniforms={uniforms}
  vertexShader={`attribute float tail; uniform float time,wind,rain,gust,hasShelter; uniform vec2 center; uniform vec4 shelter; varying float visible;
   void main(){
    float fall=mix(2.6,27.,rain);float height=mix(60.,5.,gust);
    vec3 p=position; p.y=mod(position.y-time*fall,height)+.25;
    p.x=mod(position.x+time*wind*(1.+gust*3.)+65.,130.)-65.+floor(center.x/30.)*30.;
    p.z=position.z+floor(center.y/30.)*30.+sin(time*.8+position.y)*(.4+gust);
    p.y+=tail*1.1;p.x-=tail*.14*wind;
    visible=1.-hasShelter*step(abs(p.x-shelter.x),shelter.z)*step(abs(p.z-shelter.y),shelter.w);
    vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;
    gl_PointSize=clamp((gust>.5?100.:65.)/max(2.,-mv.z),1.2,5.);
   }`}
  fragmentShader={`uniform vec3 tint;uniform float opacity,rain,gust;varying float visible;
   void main(){if(visible<.5)discard;float a=1.;if(rain<.5){float d=length(gl_PointCoord-.5);if(d>.5)discard;a=1.-smoothstep(.2,.5,d);}gl_FragColor=vec4(tint,opacity*a);}`}/>;
 return rain?<lineSegments geometry={geometry} frustumCulled={false} renderOrder={5}>{material}</lineSegments>:<points geometry={geometry} frustumCulled={false} renderOrder={5}>{material}</points>;
}
