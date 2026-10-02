import {memo,useEffect,useMemo} from 'react';
import {ModelParts,seededRandom} from '../graphics/modelParts';

export const CitySkyline3D=memo(function CitySkyline3D({isNight}:{isNight:boolean}){
 const model=useMemo(()=>{
  const solid=new ModelParts(),glass=new ModelParts(),windows=new ModelParts(),random=seededRandom(946);
  // Taller offices cluster beyond the civic / commercial edge, away from the homes.
  const towers=[[82,-86,32,14,17],[100,-40,44,15,19],[50,-92,36,15,17]];
  const distant=[-105,-80,-55,-30,-5,20,45,70,95].map((x,i)=>[x,-112,10+(i%4)*4,17,16]);
  for(const [x,z,height,w,d] of [...towers,...distant]){
   const tall=height>28;
   solid.box([x,2,z],[w+2,4,d+2],'#8b867d');
   if(tall){
    glass.box([x,height/2+2,z],[w,height-4,d],'#485c6a');
    for(let y=4;y<height;y+=2.9){
     for(const side of [-1,1]){
      solid.box([x,y,z+side*(d/2+.03)],[w,.11,.09],'#727c80');
      solid.box([x+side*(w/2+.03),y,z],[.09,.11,d],'#727c80');
      for(let dx=-w/2+1;dx<w/2;dx+=1.8){
       solid.box([x+dx,y+1.3,z+side*(d/2+.06)],[.05,2.6,.08],'#7c8588');
       if(random()>.78)windows.box([x+dx+.7,y+1.3,z+side*(d/2+.065)],[1.3,1.5,.035],'#a39b88');
      }
     }
    }
    solid.box([x+2,height+1.3,z-2],[w*.63,2.6,d*.58],'#60686b');
    solid.box([x-3,height+.42,z+2],[2,.8,3],'#7a7f7e');
   }else{
    solid.box([x,height/2,z],[w,height,d],['#958b7d','#817c75','#8d7463'][Math.floor(random()*3)]);
    for(let y=2;y<height;y+=2.8)for(let dx=-w/2+1.8;dx<w/2;dx+=2.7)glass.box([x+dx,y,z+d/2+.06],[1.2,1.5,.06],'#50606a');
    solid.box([x,height+.12,z],[w+.25,.24,d+.25],'#777872');
   }
  }
  return {solid:solid.finish(),glass:glass.finish(),windows:windows.finish()};
 },[]);
 useEffect(()=>()=>Object.values(model).forEach(g=>g.dispose()),[model]);
 return <group>
  <mesh geometry={model.solid} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.85}/></mesh>
  <mesh geometry={model.glass} receiveShadow><meshStandardMaterial vertexColors metalness={.45} roughness={.26} envMapIntensity={.7}/></mesh>
  <mesh geometry={model.windows}><meshStandardMaterial vertexColors roughness={.7} emissive={isNight?'#e5bd89':'#000000'} emissiveIntensity={isNight?.65:0}/></mesh>
 </group>;
});
