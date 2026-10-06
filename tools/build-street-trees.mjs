// Offline build: npm pack @dgreenheck/ez-tree@1.1.0 into artifacts/street-build,
// then extract it there. No tree generator or bundled texture library runs in-game.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
const root=path.resolve('artifacts/street-build/package/src/lib'),out=path.resolve('public/models/street-assets');
fs.mkdirSync(out,{recursive:true});
await build({entryPoints:[path.join(root,'tree.js')],outfile:'artifacts/street-build/tree-generator.mjs',bundle:true,platform:'node',format:'esm',external:['three'],plugins:[{name:'offline-textures',setup(b){b.onResolve({filter:/\/textures$/},()=>({path:'textures',namespace:'offline'}));b.onLoad({filter:/.*/,namespace:'offline'},()=>({contents:"import {Texture} from 'three'; export const getBarkTexture=()=>new Texture(); export const getLeafTexture=()=>new Texture();",loader:'js'}));}}]});
const {Tree}=await import(pathToFileURL(path.resolve('artifacts/street-build/tree-generator.mjs')));
const doc={asset:{version:'2.0',generator:'Bite Tycoon / EZ-Tree 1.1.0 offline build'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],materials:[],textures:[],images:[],samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}],bufferViews:[],accessors:[],buffers:[{byteLength:0}]};
let offset=0;const chunks=[],imageCache=new Map();
function bytes(data){const raw=Buffer.from(data.buffer??data,data.byteOffset??0,data.byteLength??data.length),index=doc.bufferViews.length;doc.bufferViews.push({buffer:0,byteOffset:offset,byteLength:raw.length});chunks.push(raw);offset+=raw.length;const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}return index;}
function attribute(values,size,indices=false){const data=indices?new Uint32Array(values):new Float32Array(values),accessor={bufferView:bytes(data),componentType:indices?5125:5126,count:values.length/size,type:indices?'SCALAR':size===2?'VEC2':'VEC3'};if(!indices&&size===3){accessor.min=[0,1,2].map(c=>values.reduce((n,v,i)=>i%3===c?Math.min(n,v):n,Infinity));accessor.max=[0,1,2].map(c=>values.reduce((n,v,i)=>i%3===c?Math.max(n,v):n,-Infinity));}return doc.accessors.push(accessor)-1;}
function image(relative){if(imageCache.has(relative))return imageCache.get(relative);const bufferView=bytes(fs.readFileSync(path.join(root,'assets',relative))),source=doc.images.push({bufferView,mimeType:relative.endsWith('.png')?'image/png':'image/jpeg'})-1,index=doc.textures.push({source,sampler:0})-1;imageCache.set(relative,index);return index;}
const specs=[{id:'oak',preset:'oak_medium',height:5.5,seed:781},{id:'aspen',preset:'aspen_small',height:6.1,seed:532},{id:'ash',preset:'ash_medium',height:5.8,seed:112}];
const manifest=[];
function sparseLeaves(data,maxY){
 const result={verts:[],normals:[],uvs:[],indices:[]};
 const highest=Math.floor(data.verts.findIndex((v,i)=>i%3===1&&v===maxY)/24);
 for(let leaf=0;leaf<data.verts.length/24;leaf++){
  if(leaf%3!==0&&leaf!==highest)continue;
  const base=leaf*24,start=result.verts.length/3,centre=[0,1,2].map(c=>Array.from({length:8},(_,j)=>data.verts[base+j*3+c]).reduce((a,b)=>a+b,0)/8);
  for(let i=0;i<24;i++){
   const c=i%3,value=centre[c]+(data.verts[base+i]-centre[c])*1.45;
   result.verts.push(c===1?Math.min(maxY,Math.max(0,value)):value);result.normals.push(data.normals[base+i]);
  }
  result.uvs.push(...data.uvs.slice(leaf*16,leaf*16+16));
  result.indices.push(start,start+1,start+2,start,start+2,start+3,start+4,start+5,start+6,start+4,start+6,start+7);
 }
 return result;
}
for(const spec of specs){
 const preset=JSON.parse(fs.readFileSync(path.join(root,'presets',spec.preset+'.json')));preset.seed=spec.seed;
 const bark=doc.materials.push({name:spec.id+'_bark',pbrMetallicRoughness:{baseColorTexture:{index:image('bark/'+preset.bark.type+'_color_1k.jpg')},metallicFactor:0,roughnessFactor:.95},normalTexture:{index:image('bark/'+preset.bark.type+'_normal_1k.jpg'),scale:.55}})-1;
 const leaf=doc.materials.push({name:spec.id+'_leaves',doubleSided:true,alphaMode:'MASK',alphaCutoff:.45,pbrMetallicRoughness:{baseColorTexture:{index:image('leaves/'+preset.leaves.type+'_color.png')},metallicFactor:0,roughnessFactor:.88}})-1;
 for(const lod of [0,1]){
  // Keep the random sequence identical across LODs: changing leaf count during
  // generation would move later branches. Prune leaf cards after generation.
  const tree=new Tree(),options=structuredClone(preset);options.leaves.count=14;options.leaves.size*=1.08;
  if(lod)for(const i of Object.keys(options.branch.segments))options.branch.segments[i]=Math.max(3,Math.floor(options.branch.segments[i]*.7));
  tree.options.copy(options);tree.generate();
  const maxY=tree.leaves.verts.reduce((n,v,i)=>i%3===1?Math.max(n,v):n,0),scale=spec.height/maxY;
  const leaves=lod?sparseLeaves(tree.leaves,maxY):tree.leaves;
  const group=doc.nodes.push({name:spec.id+'_lod'+lod,children:[]})-1;doc.scenes[0].nodes.push(group);let triangles=0;
  for(const [part,data,mat] of [['bark',tree.branches,bark],['leaves',leaves,leaf]]){
   const verts=data.verts.map(v=>v*scale),normals=[...data.normals],uvs=[...data.uvs];
   if(part==='bark')for(let i=0;i<uvs.length;i++)uvs[i]*=i%2?1/options.bark.textureScale.y:options.bark.textureScale.x;
   if(part==='leaves')for(let i=0;i<normals.length;i+=3){const nx=verts[i]*.25,ny=.8+Math.max(0,verts[i+1]-2)*.15,nz=verts[i+2]*.25,l=Math.hypot(nx,ny,nz);normals[i]=nx/l;normals[i+1]=ny/l;normals[i+2]=nz/l;}
   const mesh=doc.meshes.push({name:spec.id+'_'+part+'_lod'+lod,primitives:[{attributes:{POSITION:attribute(verts,3),NORMAL:attribute(normals,3),TEXCOORD_0:attribute(uvs,2)},indices:attribute(data.indices,1,true),material:mat}]})-1;
   doc.nodes[group].children.push(doc.nodes.push({name:spec.id+'_'+part+'_lod'+lod,mesh})-1);triangles+=data.indices.length/3;
  }
  manifest.push({id:spec.id,lod,height:spec.height,triangles});
 }
}
doc.buffers[0].byteLength=offset;
let json=Buffer.from(JSON.stringify(doc)),padding=(4-json.length%4)%4;json=Buffer.concat([json,Buffer.alloc(padding,32)]);
const binary=Buffer.concat(chunks),header=Buffer.alloc(12),jheader=Buffer.alloc(8),bheader=Buffer.alloc(8);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+binary.length,8);jheader.writeUInt32LE(json.length);jheader.writeUInt32LE(0x4e4f534a,4);bheader.writeUInt32LE(binary.length);bheader.writeUInt32LE(0x004e4942,4);
fs.writeFileSync(path.join(out,'trees.glb'),Buffer.concat([header,jheader,json,bheader,binary]));
fs.writeFileSync(path.join(out,'trees-manifest.json'),JSON.stringify(manifest,null,2));
fs.copyFileSync(path.resolve(root,'../..','LICENSE'),path.join(out,'EZ-TREE-LICENSE.txt'));
console.log({bytes:28+json.length+binary.length,models:manifest});
