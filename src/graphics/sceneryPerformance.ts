import * as THREE from 'three';

/** Wide city shots need depth precision; close interior cameras need a short near plane. */
export function cityCameraNear(distance:number,closeView=false){
 return closeView&&distance<50?.1:Math.max(.2,Math.min(8,distance/50));
}
/** A single choice shared by every material of an instance prevents gaps or double LODs. */
export function sceneryLod(distance:number,previous:number|undefined,thresholds:number[]){
 let level=previous??thresholds.filter(t=>distance>=t).length;
 while(level<thresholds.length&&distance>thresholds[level]*1.12)level++;
 while(level>0&&distance<thresholds[level-1]*.88)level--;
 return level;
}

/** Vertex clustering keeps the original silhouette/material instead of substituting a box. */
export function simplifySceneryGeometry(source:THREE.BufferGeometry,cell:number){
 const pos=source.getAttribute('position'),normal=source.getAttribute('normal'),uv=source.getAttribute('uv'),color=source.getAttribute('color');
 const groups=new Map<string,number>(),vertices:{p:number[];n:number[];uv:number[];color:number[];count:number}[]=[],remap:number[]=[];
 for(let i=0;i<pos.count;i++){
   const n=normal?[normal.getX(i),normal.getY(i),normal.getZ(i)]:[0,1,0];
   const axis=n.reduce((best,v,a)=>Math.abs(v)>Math.abs(n[best])?a:best,0);
   const tint=color?Array.from({length:color.itemSize},(_,a)=>color.getComponent(i,a)):[];
   const key=[Math.round(pos.getX(i)/cell),Math.round(pos.getY(i)/cell),Math.round(pos.getZ(i)/cell),axis,n[axis]<0?0:1,...tint.map(c=>Math.round(c*255))].join(':');
   let index=groups.get(key);if(index===undefined){index=vertices.length;groups.set(key,index);vertices.push({p:[0,0,0],n:[0,0,0],uv:[0,0],color:tint.map(()=>0),count:0});}
   const v=vertices[index];v.count++;v.p[0]+=pos.getX(i);v.p[1]+=pos.getY(i);v.p[2]+=pos.getZ(i);n.forEach((x,a)=>v.n[a]+=x);
   if(uv){v.uv[0]+=uv.getX(i);v.uv[1]+=uv.getY(i);}tint.forEach((c,a)=>v.color[a]+=c);remap.push(index);
 }
 const indices:number[]=[],seen=new Set<string>(),count=source.index?.count??pos.count;
 for(let i=0;i<count;i+=3){const a=remap[source.index?source.index.getX(i):i],b=remap[source.index?source.index.getX(i+1):i+1],c=remap[source.index?source.index.getX(i+2):i+2];if(a===b||b===c||a===c)continue;const key=[a,b,c].sort((a,b)=>a-b).join(':');if(seen.has(key))continue;seen.add(key);indices.push(a,b,c);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flatMap(v=>v.p.map(x=>x/v.count)),3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(vertices.flatMap(v=>new THREE.Vector3(...v.n as [number,number,number]).normalize().toArray()),3));
 if(uv)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(vertices.flatMap(v=>v.uv.map(x=>x/v.count)),2));
 if(color)geometry.setAttribute('color',new THREE.Float32BufferAttribute(vertices.flatMap(v=>v.color.map(x=>x/v.count)),color.itemSize));
 geometry.setIndex(indices);geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;
}

/** Distant foliage keeps representative textured leaf cards, including all canopy extremities. */
export function distantLeafGeometry(source:THREE.BufferGeometry){
 const pos=source.getAttribute('position'),count=source.index?.count??pos.count,indices:number[]=[],cards=new Map<string,number>();
 const extrema=Array.from({length:6},()=>({value:-Infinity,card:0}));
 for(let offset=0;offset<count;offset+=6){
   const points=Array.from({length:Math.min(6,count-offset)},(_,i)=>source.index?source.index.getX(offset+i):offset+i);
   const center=points.reduce((v,i)=>v.add(new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i))),new THREE.Vector3()).multiplyScalar(1/points.length);
   const key=[center.x,center.y,center.z].map(x=>Math.round(x/1.05)).join(':');if(!cards.has(key))cards.set(key,offset);
   for(const i of points)for(let axis=0;axis<3;axis++)for(let sign=0;sign<2;sign++){const value=(axis===0?pos.getX(i):axis===1?pos.getY(i):pos.getZ(i))*(sign?1:-1),e=extrema[axis*2+sign];if(value>e.value){e.value=value;e.card=offset;}}
 }
 for(const offset of new Set([...cards.values(),...extrema.map(e=>e.card)]))for(let i=offset;i<Math.min(offset+6,count);i++)indices.push(source.index?source.index.getX(i):i);
 const g=source.clone();g.setIndex(indices);g.computeBoundingSphere();return g;
}
