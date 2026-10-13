import * as THREE from 'three';

// This study owns its materials. It never modifies the materials in the live game.
const cache = new Map<string, THREE.MeshStandardMaterial>();
export function surface(kind: 'brick'|'stone'|'wood'|'road'|'tile'|'plaster', color: string, rx=1, ry=1, wet=false) {
  const key=[kind,color,rx,ry,wet].join(':');
  if(cache.has(key))return cache.get(key)!;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const c=canvas.getContext('2d')!;
  let seed=371;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  c.fillStyle=color;c.fillRect(0,0,512,512);
  if(kind==='brick') {
    c.fillStyle='#b5a391';c.fillRect(0,0,512,512);
    for(let y=0;y<16;y++)for(let x=-1;x<5;x++){
      c.fillStyle=new THREE.Color(color).multiplyScalar(.8+random()*.35).getStyle();
      c.fillRect(x*128+(y%2)*64+2,y*32+2,124,28);
      c.fillStyle='#ffffff19';c.fillRect(x*128+(y%2)*64+3,y*32+3,122,2);
    }
  } else if(kind==='wood') {
    for(let i=0;i<1400;i++) {c.strokeStyle=i%2?'#27130614':'#fff1c513';c.lineWidth=.3+random()*2;const y=random()*512;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(180,y+random()*10,350,y-random()*10,512,y);c.stroke();}
    c.fillStyle='#281d1360';for(let y=0;y<512;y+=64)c.fillRect(0,y,512,2);
    for(let y=0;y<8;y++){c.fillRect(y%2?140:340,y*64,2,64);}
  } else if(kind==='tile'||kind==='stone') {
    const size=kind==='stone'?128:64;
    for(let y=0;y<512;y+=size)for(let x=0;x<512;x+=size){c.fillStyle=new THREE.Color(color).multiplyScalar(.94+random()*.12).getStyle();c.fillRect(x+2,y+2,size-3,size-3);}
    c.strokeStyle='#76695d42';c.lineWidth=2;for(let v=0;v<=512;v+=size){c.beginPath();c.moveTo(v,0);c.lineTo(v,512);c.moveTo(0,v);c.lineTo(512,v);c.stroke();}
  }
  const pixels=c.getImageData(0,0,512,512);
  for(let i=0;i<pixels.data.length;i+=4){const n=(random()-.5)*(kind==='road'?32:14);for(let ch=0;ch<3;ch++)pixels.data[i+ch]+=n;}
  c.putImageData(pixels,0,0);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(rx,ry);map.anisotropy=8;
  const m=new THREE.MeshStandardMaterial({map,bumpMap:map,bumpScale:kind==='brick'?.045:.018,roughness:wet?.24:kind==='wood'?.62:.89,metalness:wet?.18:0});
  cache.set(key,m);return m;
}
const signs=new Map<string,THREE.CanvasTexture>();
export function lettering(text:string,color='#f7e8c8',sub=''){
  const key=text+color+sub;if(signs.has(key))return signs.get(key)!;
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
  const c=canvas.getContext('2d')!;c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';
  c.font='500 92px Georgia';c.fillText(text,512,sub?94:130,955);
  if(sub){c.font='500 28px Arial';c.fillText(sub,512,192,960);}
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;signs.set(key,map);return map;
}
