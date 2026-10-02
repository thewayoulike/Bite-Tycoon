import * as THREE from 'three';
import { seededRandom } from './modelParts';

type Surface = 'brick'|'concrete'|'asphalt'|'grass'|'wood'|'plaster';
const surfaces = new Map<string,THREE.MeshStandardMaterial>();
let contactShadow:THREE.CanvasTexture|undefined;

export function getContactShadow(){
  if(contactShadow)return contactShadow;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d')!,gradient=ctx.createRadialGradient(64,64,30,64,64,64);
  gradient.addColorStop(0,'rgba(20,23,27,.9)');gradient.addColorStop(.65,'rgba(20,23,27,.55)');gradient.addColorStop(1,'rgba(20,23,27,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  contactShadow=new THREE.CanvasTexture(canvas);return contactShadow;
}

// Small, shared, local textures: no image downloads or per-frame texture work.
export function getSurfaceMaterial(type: Surface, color: string, repeatX=1, repeatY=1) {
  const key=`${type}:${color}:${repeatX}:${repeatY}`;
  if(surfaces.has(key))return surfaces.get(key)!;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d')!;
  ctx.fillStyle=color;ctx.fillRect(0,0,256,256);
  const random=seededRandom(7153);
  if(type==='brick') {
    ctx.fillStyle='#9c9788';ctx.fillRect(0,0,256,256);
    for(let row=0;row<16;row++)for(let col=-1;col<5;col++) {
      const tint=new THREE.Color(color).multiplyScalar(.78+random()*.34);
      ctx.fillStyle=tint.getStyle();ctx.fillRect(col*64+(row%2)*32+1,row*16+1,62,14);
      ctx.fillStyle='#ffffff12';ctx.fillRect(col*64+(row%2)*32+2,row*16+2,60,1);
    }
  }
  const pixels=ctx.getImageData(0,0,256,256);
  const strength=type==='asphalt'?24:type==='grass'?28:12;
  for(let i=0;i<pixels.data.length;i+=4){const n=(random()-.5)*strength;for(let c=0;c<3;c++)pixels.data[i+c]=Math.max(0,Math.min(255,pixels.data[i+c]+n));}
  ctx.putImageData(pixels,0,0);
  if(type==='wood')for(let i=0;i<100;i++) {
    ctx.strokeStyle=i%3?'#32281625':'#f6dfba20';ctx.lineWidth=.5+random();ctx.beginPath();
    const y=random()*256;ctx.moveTo(0,y);ctx.bezierCurveTo(80,y+random()*8,180,y-random()*8,256,y);ctx.stroke();
  }
  if(type==='concrete') {ctx.strokeStyle='#55514b38';ctx.lineWidth=1.3;ctx.strokeRect(1,1,254,254);}
  // Low-frequency weathering avoids the perfectly clean, uniformly coloured model look.
  if(type==='brick'||type==='concrete'||type==='plaster'||type==='asphalt')for(let i=0;i<35;i++){
    const x=random()*256,y=random()*256,r=12+random()*60,g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,i%2?'#312c2409':'#ffffff07');g.addColorStop(1,'#00000000');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeatX,repeatY);texture.anisotropy=4;
  const material=new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:type==='brick'?.045:.018,
    roughness:type==='wood'?.82:.96});
  surfaces.set(key,material);return material;
}

const signs=new Map<string,THREE.CanvasTexture>();
export function getSignTexture(text:string) {
  if(signs.has(text))return signs.get(text)!;
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;
  const ctx=canvas.getContext('2d')!;ctx.font='600 66px Georgia';ctx.fillStyle='#eee4ca';
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,512,65,950);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
  signs.set(text,map);return map;
}
