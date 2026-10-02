import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function OutdoorReflections3D({isNight}:{isNight:boolean}) {
  const {gl,scene}=useThree();
  useEffect(()=>{
    const faces=Array.from({length:6},(_,face)=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
      const ctx=canvas.getContext('2d')!,gradient=ctx.createLinearGradient(0,0,0,128);
      gradient.addColorStop(0,isNight?'#1e3046':'#a6c4d4');
      gradient.addColorStop(.56,isNight?'#53616e':'#e4e2df');
      gradient.addColorStop(1,isNight?'#262e31':'#77716b');
      ctx.fillStyle=face===2?(isNight?'#1e3046':'#b2cbd7'):face===3?'#726c67':gradient;ctx.fillRect(0,0,128,128);
      if(face!==2 && face!==3)for(let i=0;i<7;i++){
        const height=28+(i*17+face*7)%36;
        ctx.fillStyle=i%2?'#66656a':'#928a80';ctx.fillRect(i*21-6,128-height,18,height);
        ctx.fillStyle=isNight?'#d8b987':'#bdc8d0';for(let y=134-height;y<126;y+=9)ctx.fillRect(i*21-2,y,7,4);
      }
      return canvas;
    });
    const cube=new THREE.CubeTexture(faces);cube.colorSpace=THREE.SRGBColorSpace;cube.needsUpdate=true;
    const generator=new THREE.PMREMGenerator(gl), target=generator.fromCubemap(cube);
    const previous=scene.environment, intensity=scene.environmentIntensity;
    scene.environment=target.texture;scene.environmentIntensity=isNight?.3:.48;
    cube.dispose();generator.dispose();
    return ()=>{scene.environment=previous;scene.environmentIntensity=intensity;target.dispose();};
  },[gl,scene,isNight]);
  return null;
}
