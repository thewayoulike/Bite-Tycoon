import {useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {ModelParts} from '../graphics/modelParts';
import {getSurfaceMaterial,getSignTexture} from '../graphics/surfaceMaterials';
import {RESTAURANT_IDENTITIES,RestaurantIdentity} from '../empire/restaurantIdentity';

export function RestaurantIdentity3D({identity,isNight,level=1}:{identity:RestaurantIdentity;isNight:boolean;level?:number}){
  const theme=RESTAURANT_IDENTITIES[identity];
  const floor=useMemo(()=>{
    const m=new ModelParts();
    for(let x=-14;x<=14;x+=2)for(let z=-14;z<=14;z+=2)m.box([x,-.06,z],[1.98,.12,1.98],identity==='diner'?((x+z)%4===0?'#e7e2cf':'#556269'):identity==='bistro'?((x+z)%4===0?'#ad7960':'#bf9174'):'#c2a67d');
    return m.finish();
  },[identity]);
  const decor=useMemo(()=>{
    const m=new ModelParts();
    if(identity==='fastfood'){
      m.box([0,1.05,-10],[29,2.1,3.2],'#9d4333');m.box([0,2.18,-10],[29.4,.18,3.4],'#ddd5c5');
      for(const x of [-10,-3,4]){m.box([x,5.4,-13.8],[5.8,2.2,.22],'#242b2e');for(let j=0;j<3;j++){m.box([x-1.7+j*1.7,5.5,-13.65],[1.25,.65,.03],['#d69b47','#9e5940','#e0d7ba'][j]);m.box([x-1.7+j*1.7,4.9,-13.63],[.9,.09,.02],'#faf1d2');}}
      m.box([-10,2.5,-10],[5,.55,2.3],'#9da5a5');for(const x of [-11,-9]){m.box([x,2.8,-10],[1.4,.15,1.5],'#313333');for(let i=0;i<5;i++)m.box([x-.5+i*.25,2.9,-10],[.06,.04,1.3],'#b8b3a2');}
      for(let i=0;i<5;i++)m.box([2+i*.4,2.4,-9.5],[.3,.1,1],'#a84030');
      m.box([16.8,1.5,-11],[2.2,3,2],'#4b5657');m.box([16.8,3.2,-10.7],[2,1.5,.25],'#222c33');m.box([16.8,3.2,-10.54],[1.6,1.1,.03],'#d8c48d');
    }else if(identity==='italian'){
      m.box([-3,1.1,-10],[25,2.2,3.1],'#87624c');m.box([-3,2.28,-10],[25.3,.18,3.4],'#d9cbb3');
      m.box([15.5,1.2,-12],[5,2.4,3.4],'#785646');m.ellipsoid([15.5,3.1,-12],[2.5,2,1.7],'#af7857');m.box([15.5,2.65,-10.28],[2.8,1.3,.12],'#282421');m.box([15.5,2.1,-10.14],[2.6,.13,.4],'#bd7744');
      for(let i=0;i<5;i++)m.add(new THREE.CylinderGeometry(.5,.5,.08,12),'#d7b883',[-9+i*1.4,2.43,-10]);
      for(const x of [-13,-7,0,7]){m.box([x,3.5,-14.4],[3.2,.15,.75],'#6e5943');for(let j=0;j<4;j++)m.add(new THREE.CylinderGeometry(.2,.22,.75,8),'#d9cc98',[x-1+j*.65,3.9,-14.3]);}
    }else if(identity==='diner'){
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
    if(level>=2){m.box([11.5,2.48,-10],[2.7,.5,1.5],'#455858');m.box([11.5,3.3,-10.5],[2.5,1.2,.12],'#344845');}
    if(identity==='cafe'&&level>=2){m.box([-11,2.85,-10],[2.7,1.2,1.6],'#788a88');m.box([-11,2.9,-9.17],[2.3,.55,.07],'#263e42');for(const x of [-11.7,-10.4])m.add(new THREE.CylinderGeometry(.17,.15,.32,8),'#eae0ca',[x,2.45,-9.1]);}
    if(level>=3){m.box([-12,1.1,-13],[5.2,2.2,2.1],'#909995');m.box([-12,2.3,-13],[5.5,.15,2.3],'#d2d2c4');for(let i=0;i<4;i++)m.add(new THREE.CylinderGeometry(.25,.22,.35,8),identity==='cafe'?'#f0e1c7':'#627b55',[-13.5+i,2.55,-13]);}
    if(level>=4){m.box([7,2.65,-10],[3.2,.65,1.8],'#c1b99f');for(let i=0;i<4;i++)m.ellipsoid([6+i*.6,3.05,-10],[.23,.2,.23],identity==='bistro'?'#815a45':'#c69864');}
    if(level>=5){m.box([1,4.1,-12.5],[7,.16,1.1],'#a8aaa0');for(const x of [-2,4])m.box([x,3.2,-12.5],[.12,1.8,.12],'#777b74');}
    if(level>=6){for(const x of [-1,1,3]){m.add(new THREE.CylinderGeometry(.36,.5,.22,12),'#b49c69',[x,3.8,-12.4]);m.box([x,2.48,-12.4],[1.5,.06,.85],'#e5dfce');}m.box([-17,2.1,-11],[1.6,4.2,2.1],'#74827d');m.box([-17,2.3,-9.91],[1.4,3.2,.06],'#c6cecb');}
    return m.finish();
  },[identity,level]);
  useEffect(()=>()=>floor.dispose(),[floor]);
  useEffect(()=>()=>decor.dispose(),[decor]);
  return <>
    {(identity==='diner'||identity==='fastfood')&&<mesh geometry={floor} position={[0,.055,4]} scale={[40/30,1,38/30]} receiveShadow><meshStandardMaterial vertexColors roughness={.8}/></mesh>}
    <mesh geometry={decor} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.65}/></mesh>
    <mesh position={[0,7.8,-14.82]}><planeGeometry args={[17,2.1]}/><meshBasicMaterial map={getSignTexture(theme.name.toUpperCase())} transparent/></mesh>
    <mesh position={[0,5.9,-14.8]}><planeGeometry args={[13,1]}/><meshBasicMaterial map={getSignTexture(theme.tagline.toUpperCase())} transparent/></mesh>
    {level>=2&&<mesh position={[11.5,3.35,-10.42]}><planeGeometry args={[2.3,.6]}/><meshBasicMaterial map={getSignTexture(identity==='bistro'?'RESERVED':identity==='fastfood'?'COLLECT':identity==='cafe'?'COFFEE':'PICKUP')} transparent/></mesh>}
    {identity==='bistro'&&level>=5&&<mesh position={[-19.65,4.7,7.5]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[5,1]}/><meshBasicMaterial map={getSignTexture('PRIVATE DINING')} transparent/></mesh>}
    <mesh position={[0,.025,21]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[7,2]}/><meshStandardMaterial color={identity==='cafe'?'#537967':identity==='bistro'?'#61734c':'#974438'} emissive={isNight?'#211d12':'#000000'} roughness={1}/></mesh>
  </>;
}
