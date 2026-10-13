import * as THREE from 'three';
import {seededRandom} from './modelParts';

export type InteriorFinish='oak'|'stone'|'terrazzo'|'carpet';
const cache=new Map<string,THREE.MeshStandardMaterial>();

/** Shared local finishes, generated once. No downloaded textures or reflection passes. */
export function interiorMaterial(kind:InteriorFinish,color:string,repeatX=1,repeatY=1){
  const key=[kind,color,repeatX,repeatY].join(':');
  if(cache.has(key))return cache.get(key)!;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const c=canvas.getContext('2d')!,random=seededRandom(812),base=new THREE.Color(color);
  c.fillStyle=color;c.fillRect(0,0,512,512);
  if(kind==='oak'){
    c.fillStyle=base.clone().multiplyScalar(.67).getStyle();c.fillRect(0,0,512,512);
    for(let row=0;row<8;row++)for(let col=-1;col<3;col++){
      const x=col*256+(row%2)*128,y=row*64;
      c.fillStyle=base.clone().multiplyScalar(.88+random()*.21).getStyle();c.fillRect(x+1,y+1,254,62);
      for(let line=0;line<40;line++){
        const ly=y+random()*61+1;c.strokeStyle=line%2?'#36261818':'#fff5d414';c.lineWidth=.4+random();c.beginPath();
        c.moveTo(x+2,ly);c.bezierCurveTo(x+80,ly+random()*5,x+180,ly-random()*5,x+254,ly);c.stroke();
      }
    }
  }else if(kind==='carpet'){
    for(let y=0;y<512;y+=2){c.strokeStyle=y%4?'#ffffff0e':'#15191312';c.beginPath();c.moveTo(0,y);c.lineTo(512,y);c.stroke();}
    for(let x=0;x<512;x+=3){c.strokeStyle=x%2?'#ffffff0d':'#1519130b';c.beginPath();c.moveTo(x,0);c.lineTo(x,512);c.stroke();}
    c.strokeStyle='#e7ddc31f';c.lineWidth=2;for(let x=-512;x<1024;x+=64){c.beginPath();c.moveTo(x,0);c.lineTo(x+512,512);c.stroke();}
  }else{
    for(let y=0;y<512;y+=128)for(let x=0;x<512;x+=128){
      c.fillStyle=base.clone().multiplyScalar(.96+random()*.075).getStyle();c.fillRect(x,y,128,128);
      c.strokeStyle='#5a53451e';c.lineWidth=1.3;c.strokeRect(x,y,128,128);
    }
    if(kind==='terrazzo')for(let i=0;i<2600;i++){
      c.fillStyle=['#4e605b27','#fffaf57a','#ae957d45','#6e62562b'][i%4];c.beginPath();
      const x=random()*512,y=random()*512,r=.4+random()*1.8;c.moveTo(x,y);c.lineTo(x+r,y+r*.4);c.lineTo(x-r*.2,y+r*1.3);c.fill();
    }
    else for(let i=0;i<35;i++){
      const x=random()*512,y=random()*512,r=25+random()*80,g=c.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,i%2?'#ffffff12':'#75664c0a');g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
    }
  }
  const pixels=c.getImageData(0,0,512,512);
  for(let i=0;i<pixels.data.length;i+=4){const noise=(random()-.5)*(kind==='carpet'?18:6);for(let channel=0;channel<3;channel++)pixels.data[i+channel]+=noise;}
  c.putImageData(pixels,0,0);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(repeatX,repeatY);map.anisotropy=4;
  const material=new THREE.MeshStandardMaterial({map,bumpMap:map,bumpScale:kind==='carpet'?.015:.008,roughness:kind==='carpet'?1:kind==='oak'?.66:.53});
  cache.set(key,material);return material;
}
