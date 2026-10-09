import {memo,useContext,useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {OUTER_LOTS,isOuterPark} from '../graphics/outerCity';
import {industrialStacks} from '../graphics/industrialScenery';
import {WeatherMotionContext} from './Weather3D';

/** Ambient smoke uses real time even when business simulation is paused. */
export const IndustrialSmoke3D=memo(function IndustrialSmoke3D({isNight=false}:{isNight?:boolean}){
  const weather=useContext(WeatherMotionContext),elapsed=useRef(0),material=useRef<THREE.ShaderMaterial>(null);
  const geometry=useMemo(()=>{
    const positions:number[]=[],phases:number[]=[],puffSeeds:number[]=[];
    for(const lot of OUTER_LOTS.filter(l=>l.zone==='industry'&&!isOuterPark(l.x,l.z))){
      for(const stack of industrialStacks(lot.x,lot.z))for(let i=0;i<20;i++){
        positions.push(stack.x,stack.top+.25,stack.z);phases.push(i/20);
        puffSeeds.push(Math.abs(Math.sin(stack.x*12.9898+stack.z*78.233+i*31.7))*43758.5453%1);
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('phase',new THREE.Float32BufferAttribute(phases,1));g.setAttribute('puffSeed',new THREE.Float32BufferAttribute(puffSeeds,1));return g;
  },[]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  const uniforms=useMemo(()=>THREE.UniformsUtils.merge([THREE.UniformsLib.fog,{
    time:{value:0},wind:{value:1},pixelScale:{value:600},tint:{value:new THREE.Color('#8c9398')},
  }]),[]);
  useFrame(({size,gl},delta)=>{
    elapsed.current+=Math.min(delta,.08);
    const shader=material.current;if(!shader)return;
    // Update the rendered material explicitly, including when the business clock is paused.
    shader.uniforms.time.value=elapsed.current;shader.uniforms.wind.value=(weather?.wind??8)/12;
    shader.uniforms.tint.value.set(isNight?'#626b78':'#92999d');
    shader.uniforms.pixelScale.value=size.height*gl.getPixelRatio();
    shader.uniformsNeedUpdate=true;
  });
  return <points name="industrial-chimney-smoke" geometry={geometry} frustumCulled={false} renderOrder={2}>
    <shaderMaterial ref={material} transparent depthWrite={false} fog uniforms={uniforms}
      vertexShader={`attribute float phase,puffSeed;uniform float time,wind,pixelScale;varying float life,swirl,shade;
      #include <fog_pars_vertex>
      void main(){
        float seed=position.x*.11+position.z*.07;
        // A puff's identity travels with it; evenly spaced identical sprites look like a static ribbon.
        life=fract(phase+time*(.062+.006*sin(seed)));
        float age=life*16.;
        float spread=smoothstep(0.,.65,life);
        float gust=wind*(.8+.2*sin(time*.65+seed));
        swirl=puffSeed*6.283+age*(.35+puffSeed*.3);
        shade=.72+puffSeed*.45;
        vec3 p=position;p.y+=life*24.+sin(age*.9+puffSeed*6.283)*spread*1.2;
        p.x+=life*life*(5.+gust*13.)+sin(seed+age*.8+puffSeed*6.283)*spread*2.8;
        p.z+=life*life*gust*5.+cos(seed+age*.65+puffSeed*6.283)*spread*2.4;
        vec4 mvPosition=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mvPosition;
        gl_PointSize=clamp(pixelScale*(1.8+life*7.)*(.75+puffSeed*.55)/max(2.,-mvPosition.z),1.,180.);
        #include <fog_vertex>
      }`}
      fragmentShader={`uniform vec3 tint;varying float life,swirl,shade;
      #include <fog_pars_fragment>
      void main(){vec2 uv=gl_PointCoord-.5;float d=length(uv);if(d>.5)discard;
        float angle=atan(uv.y,uv.x)+swirl;
        float billow=1.+.15*sin(angle*3.+swirl)+.09*cos(angle*5.-swirl);
        float soft=exp(-d*d*14.)*(1.-smoothstep(.28,.5,d*billow));
        float alpha=soft*.29*shade*smoothstep(0.,.045,life)*(1.-smoothstep(.48,1.,life));
        gl_FragColor=vec4(tint*shade,alpha);
        #include <fog_fragment>
      }`}/>
  </points>;
});
