import { memo,useMemo } from 'react';
import { ModelParts } from '../graphics/modelParts';
import { getSurfaceMaterial } from '../graphics/surfaceMaterials';

export const StreetDetails3D=memo(function StreetDetails3D(){
  const details=useMemo(()=>{
    const m=new ModelParts();
    for(const side of [-1,1])for(const z of [-13,11]) {
      m.box([side*18.72,.052,z],[.38,.04,.8],'#3c4341');
      for(let i=0;i<8;i++)m.box([side*18.72,.076,z-.34+i*.096],[.31,.012,.025],'#777d73');
    }
    for(const x of [-16.9,16.9])for(const z of [-19.1,19.1]) {
      m.branch([x,.1,z],[x,2.75,z],.037,.037,'#727c73');
      m.box([x,2.5,z],[1.05,.32,.045],'#43675e');
      m.box([x,2.5,z+.025],[.72,.028,.008],'#ece6d4');
      m.box([x,2.16,z],[.55,.6,.045],'#d9d6c8');
      m.box([x,2.16,z+.025],[.22,.04,.009],'#58665f');
    }
    return m.finish();
  },[]);
  return <group>
    <mesh geometry={details} dispose={null} castShadow><meshStandardMaterial vertexColors roughness={.7} metalness={.2}/></mesh>
    {[-31, -19, 19, 31].flatMap(edge=>[[-105,-31],[-19,19],[31,105]].flatMap(([start,end])=>[
      <mesh key={`x:${edge}:${start}`} position={[edge,.08,(start+end)/2]} material={getSurfaceMaterial('concrete','#b1b0a5',1,4)} receiveShadow><boxGeometry args={[.22,.16,end-start]}/></mesh>,
      <mesh key={`z:${edge}:${start}`} position={[(start+end)/2,.08,edge]} material={getSurfaceMaterial('concrete','#b1b0a5',4,1)} receiveShadow><boxGeometry args={[end-start,.16,.22]}/></mesh>,
    ]))}
  </group>;
});
