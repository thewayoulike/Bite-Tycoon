import {memo,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Html} from '@react-three/drei';
import {InstancedMesh,Matrix4} from 'three';
import {LAND_PLOTS} from '../empire/propertyMarket';
import {ModelParts} from '../graphics/modelParts';
import {SnowSurfaceMaterial} from './SnowSurfaceMaterial';

/** One batched set of signs and one hit surface. Only the hovered address gets an HTML label. */
export const CommercialPlots3D=memo(function CommercialPlots3D({developmentKey,onSelect,labels}:{developmentKey:string;onSelect:(id:string)=>void;labels:boolean}){
 const [hovered,setHovered]=useState<string|null>(null),hits=useRef<InstancedMesh>(null);
 const plots=useMemo(()=>LAND_PLOTS.filter(p=>!developmentKey.split('|').includes(p.id)),[developmentKey]);
 const signs=useMemo(()=>{const m=new ModelParts();for(const p of plots){
   const [x,,z]=p.position,depth=p.id==='large'?24:18;
   if(p.vacant){
     m.box([x,.24,z],[18,.06,depth],'#b4aa94');
     for(const dx of [-8.6,8.6])m.box([x+dx,.48,z],[.08,.45,depth],'#877960');
   }
   m.box([x,1,z+8.8],[2.8,1.1,.13],p.vacant?'#3b7859':'#987647');
   for(const dx of [-.95,.95])m.box([x+dx,.55,z+8.8],[.07,1.1,.07],'#4e4b44');
   // A light inset makes even distant signs read as sale boards.
   m.box([x,1,z+8.88],[2.3,.14,.02],'#f0e9d2');
 }return m.finish();},[plots]);
 useEffect(()=>()=>signs.dispose(),[signs]);
 useLayoutEffect(()=>{if(!hits.current)return;const transform=new Matrix4();plots.forEach((p,i)=>{
   const height=.08;transform.makeScale(18,height,p.id==='large'?24:18);transform.setPosition(p.position[0],.28,p.position[2]);hits.current!.setMatrixAt(i,transform);
 });hits.current.instanceMatrix.needsUpdate=true;hits.current.computeBoundingSphere();},[plots]);
 const p=plots.find(p=>p.id===hovered);
 return <group name="commercial-property-sites">
   <mesh geometry={signs} receiveShadow><SnowSurfaceMaterial/></mesh>
   <instancedMesh ref={hits} args={[undefined,undefined,plots.length]} onPointerMove={e=>{if(e.instanceId!==undefined){e.stopPropagation();setHovered(plots[e.instanceId].id);}}} onPointerOut={()=>setHovered(null)} onClick={e=>{if(e.delta>4||e.instanceId===undefined)return;e.stopPropagation();onSelect('plot-'+plots[e.instanceId].id);}}>
     <boxGeometry args={[1,1,1]}/><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false}/>
   </instancedMesh>
   {p&&labels&&<Html position={[p.position[0],p.vacant?3:27,p.position[2]]} center zIndexRange={[4,0]}><button className="map-pin" onClick={()=>onSelect('plot-'+p.id)}>{p.name}<small>{p.vacant?'Empty land · buy & build':'Commercial site · buy & redevelop'}</small></button></Html>}
 </group>;
});
