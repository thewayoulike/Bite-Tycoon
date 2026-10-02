import {useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {ModelParts} from '../graphics/modelParts';
import {getSurfaceMaterial,getSignTexture} from '../graphics/surfaceMaterials';
import {RESTAURANT_IDENTITIES,RestaurantIdentity} from '../empire/restaurantIdentity';

export function RestaurantIdentity3D({identity,isNight}:{identity:RestaurantIdentity;isNight:boolean}){
  const theme=RESTAURANT_IDENTITIES[identity];
  const floor=useMemo(()=>{
    const m=new ModelParts();
    for(let x=-14;x<=14;x+=2)for(let z=-14;z<=14;z+=2)m.box([x,-.06,z],[1.98,.12,1.98],identity==='diner'?((x+z)%4===0?'#e7e2cf':'#556269'):identity==='bistro'?((x+z)%4===0?'#ad7960':'#bf9174'):'#c2a67d');
    return m.finish();
  },[identity]);
  const decor=useMemo(()=>{
    const m=new ModelParts();
    if(identity==='diner'){
      m.box([18.1,1.9,-10],[2.4,3.8,1.5],'#637e86');m.box([18.1,2.2,-9.2],[1.8,1.7,.06],'#394951');
      for(let i=0;i<5;i++)m.box([17.3+i*.4,1.1,-9.2],[.12,.6,.08],'#c9af6f');
    }else{
      const cafe=identity==='cafe';
      m.box([-2,1.05,-10],[25,2.1,3.1],cafe?'#9c7b52':'#48664e');m.box([-2,2.2,-10],[25.3,.24,3.3],cafe?'#e5ddca':'#d6d0b9');
      for(let x=-13;x<10;x+=.7)m.box([x,1.1,-8.42],[.12,1.9,.08],cafe?'#b3966b':'#758360');
      if(cafe){
        m.box([-7,2.8,-10],[3,1.1,1.5],'#728b88');m.box([-7,2.85,-9.18],[2.7,.55,.05],'#354b4b');
        for(let i=0;i<5;i++)m.add(new THREE.CylinderGeometry(.18,.14,.32,10),'#fff1d5',[-5+i*.5,2.5,-10]);
        for(let i=0;i<8;i++)m.ellipsoid([1+i%4*.65,2.5,-10+Math.floor(i/4)*.7],[.27,.2,.23],'#b88751');
        m.box([2,3.4,-10.2],[4.4,.12,2.3],'#afc3b6');


        for(let y=2;y<7;y+=1.5){m.box([18.2,y,-10],[1.8,.14,5],'#a28661');for(let j=0;j<7;j++)m.box([18.2,y+.55,-12+j*.6],[1.1,1,.35],['#bfa678','#819779','#a57d6b'][j%3]);}
      }else{
        m.box([-7,2.5,-12],[6,.7,2.5],'#8c9e94');
        for(let x=-13;x<=13;x+=2){m.box([x,4,-14.4],[1.2,1.1,.8],'#9c8260');for(let i=0;i<5;i++)m.ellipsoid([x+Math.sin(i)*.35,4.9+i*.1,-14.2],[.3,.6,.22],'#658351');}
        m.box([18,2,-10],[3,4,4],'#6e7056');for(let z=-11.4;z<-8.5;z+=.6)for(let y=1;y<4;y+=.7)m.add(new THREE.CylinderGeometry(.18,.18,1.1,8),'#4c6651',[18,y,z],[1,1,1],[0,0,Math.PI/2]);
        for(const z of [-2,5,11]){m.box([-20.8,1,z],[1.6,2,2.2],'#b79e73');for(let i=0;i<6;i++)m.ellipsoid([-20.8+Math.sin(i)*.5,2.5+i*.25,z+Math.cos(i)*.6],[.4,.7,.25],'#698457');}
      }
    }
    return m.finish();
  },[identity]);
  useEffect(()=>()=>{floor.dispose();decor.dispose();},[floor,decor]);
  return <>
    <mesh geometry={decor} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.65}/></mesh>
    <mesh position={[0,7.8,-14.82]}><planeGeometry args={[17,2.1]}/><meshBasicMaterial map={getSignTexture(theme.name.toUpperCase())} transparent/></mesh>
    <mesh position={[0,5.9,-14.8]}><planeGeometry args={[13,1]}/><meshBasicMaterial map={getSignTexture(theme.tagline.toUpperCase())} transparent/></mesh>
    <mesh position={[0,.025,21]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[7,2]}/><meshStandardMaterial color={identity==='cafe'?'#537967':identity==='bistro'?'#61734c':'#974438'} emissive={isNight?'#211d12':'#000000'} roughness={1}/></mesh>
  </>;
}
