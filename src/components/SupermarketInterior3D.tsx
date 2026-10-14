import {useEffect,useMemo} from 'react';
import * as THREE from 'three';
import type {Business} from '../prototype/expansionModel';
import {retailProduct,retailProductFloor} from '../empire/retail';
import {ModelParts,Vec3} from '../graphics/modelParts';
import {getSignTexture} from '../graphics/surfaceMaterials';

import {supermarketDisplays,electronicsDisplays} from '../empire/supermarketLayout';
export {supermarketDisplays} from '../empire/supermarketLayout';
import {storeLevel,shelfQuantity,productUnlocked} from '../empire/supermarket';

function DepartmentSign({text,position,width=3,color='#315e59'}:{text:string;position:Vec3;width?:number;color?:string}){
  return <group position={position}>
    <mesh><boxGeometry args={[width,.4,.08]}/><meshStandardMaterial color={color} roughness={.7}/></mesh>
    <mesh position={[0,0,.045]}><planeGeometry args={[width-.12,.3]}/><meshBasicMaterial map={getSignTexture(text)} transparent depthWrite={false}/></mesh>
  </group>;
}

function RetailLighting({electronics=false}:{electronics?:boolean}){
  return <group>{[-5,0,5].map(x=><group key={x} position={[x,3.28,-2]}>
    <mesh><boxGeometry args={[.14,.1,6.2]}/><meshStandardMaterial color={electronics?'#56656d':'#526254'} roughness={.6}/></mesh>
    <mesh position={[0,-.058,0]}><boxGeometry args={[.095,.015,6.05]}/><meshStandardMaterial color="#fff6e7" emissive={electronics?'#d9edf7':'#ffe6b5'} emissiveIntensity={.85}/></mesh>
  </group>)}</group>;
}

export function supermarketFixtureGeometry(level=3){
  const m=new ModelParts();
  // Low gondolas preserve sightlines, with 3m-wide aisles between their edges.
  for(const x of [-5,0,5]){
    m.box([x,.13,-2],[1.85,.26,7.2],'#5b6265');
    m.box([x,1.12,-2],[.15,2.1,7],'#e2e0d5');
    for(const y of [.3,.84,1.38,1.92]){
      m.box([x,y,-2],[1.8,.075,7.1],'#d3d7d5');
      for(const side of [-1,1]){
        m.box([x+side*.88,y+.045,-2],[.035,.08,7.1],'#315e59');
        for(let z=-5.1;z<=1.1;z+=.7)m.box([x+side*.905,y+.045,z],[.012,.045,.24],'#f6eed3');
      }
    }
    for(const z of [-5.5,1.5])m.box([x,1.1,z],[.1,2.2,.08],'#7b8484');
  }
  // Bakery shelves and slatted wooden trays at the rear left.
  m.box([-6.1,1,-8.65],[4,2,.16],'#8c7457');
  for(const y of [.4,.98,1.56]){
    m.box([-6.1,y,-8.15],[4,.1,1.1],'#b6986e');
    m.box([-6.1,y+.1,-7.62],[4,.16,.06],'#a5855f');
  }
  // Open-front chilled cabinets: visible stock, metal shelves and light strips.
  for(const x of [-2.1,.45,3]){
    m.box([x,1.12,-8.65],[2.3,2.24,.15],'#b5c4c6');
    m.box([x,.12,-8.2],[2.3,.24,1.15],'#52636b');
    for(const dx of [-1.12,1.12])m.box([x+dx,1.12,-8.2],[.09,2.24,1.15],'#d4dcdb');
    for(const y of [.37,.92,1.47])m.box([x,y,-8.2],[2.2,.06,1.05],'#d5deda');
    m.box([x,2.2,-8.2],[2.3,.13,1.15],'#e4ebe5');
    m.box([x,2.12,-7.65],[2.12,.035,.045],'#fff8d6');
  }
  // Chest freezer and two produce bins, set back from the customer exit route.
  m.box([6.35,.5,-8.25],[2.65,1,1.55],'#d9dfdd');
  m.box([6.35,1.02,-8.25],[2.43,.04,1.34],'#718e98');
  for(const x of [5.07,7.63])m.box([x,1.17,-8.25],[.09,.3,1.55],'#d9dfdd');
  for(const z of [-8.98,-7.52])m.box([6.35,1.17,z],[2.65,.3,.09],'#d9dfdd');
  for(const x of [5.72,6.98])m.box([x,1.36,-7.69],[.36,.05,.04],'#e9eeeb');
  for(const x of [4.15,6.55]){
    m.box([x,.47,3.3],[2.15,.94,1.7],'#9c8058');
    m.box([x,.97,3.3],[2.08,.09,1.63],'#544c35');
    for(const z of [2.49,4.11])m.box([x,1.05,z],[2.15,.18,.07],'#bd9a6a');
    for(const dx of [-1.04,0,1.04])m.box([x+dx,1.04,3.3],[.05,.16,1.6],'#bfa477');
  }
  // Checkout belt, scanner, payment terminal and bagging surface.
  m.box([-4.6,.6,6.5],[5.6,1.2,1.3],'#315e59');
  m.box([-4.6,1.25,6.5],[5.8,.12,1.4],'#dce0dc');
  m.box([-2.75,1.33,6.5],[1.85,.035,1.08],'#30383a');
  for(let x=-3.58;x<=-1.9;x+=.18)m.box([x,1.35,6.5],[.018,.009,1.02],'#505b5b');
  m.box([-4.25,1.34,6.5],[.55,.025,.52],'#aab9bb');
  m.box([-4.25,1.355,6.5],[.37,.012,.3],'#334e54');
  m.box([-5.1,1.57,6.3],[.56,.39,.09],'#303d41');
  m.box([-5.1,1.57,6.354],[.46,.28,.012],'#8eaeb0');
  m.box([-4.8,1.42,6.95],[.17,.22,.12],'#3a494c');
  for(let i=0;i<3;i++)m.box([-6.6+i*.34,1.54,6.5],[.27,.48,.33],'#c7af88');
  // Nested shopping carts and a stack of hand baskets, clear of the doorway.
  for(let i=0;i<3;i++){
    const z=8+i*.28;
    m.box([-7.5,.69,z],[.8,.04,.65],'#919fa0');
    for(const dx of [-.38,.38]){
      m.box([-7.5+dx,.87,z],[.025,.38,.65],'#a9b8b7');
      m.branch([-7.5+dx,.3,z+.3],[-7.5+dx,1.15,z+.42],.025,.025,'#879697');
      m.ellipsoid([-7.5+dx,.14,z-.25],[.085,.12,.07],'#384345');
    }
    m.box([-7.5,1.15,z+.42],[.85,.055,.055],'#315e59');
  }
  for(let i=0;i<4;i++)m.box([-8.1,.2+i*.12,6.2],[.65,.17,.45],'#426d60');
  for(const x of [3.1,7.6])m.box([x,1.65,2.4],[.045,1.1,.045],'#8b9692');
  for(const x of [-5.95,-3.25])m.box([x,1.95,6.3],[.045,1.1,.045],'#8b9692');
  // Receiving rack and its marked working space, expanded with Level 3.
  const depth=level>=3?5:3;
  m.box([7.9,.05,-4],[1.2,.1,depth],'#ac9674');
  for(const y of [.2,1,1.8])m.box([7.9,y,-4],[1.1,.07,depth],'#9aa5a2');
  for(const z of [-4-depth/2,-4+depth/2])for(const x of [7.4,8.4])m.box([x,1,z],[.05,2,.05],'#60716d');
  if(level>=3){
    m.box([4.1,.6,6.5],[3.5,1.2,1.3],'#315e59');m.box([4.1,1.25,6.5],[3.6,.12,1.4],'#dce0dc');
    m.box([5,1.33,6.5],[1.25,.035,1.08],'#30383a');m.box([3.7,1.54,6.3],[.56,.4,.09],'#303d41');
  }
  return m.finish();
}

export function supermarketStockUnits(b:Business){
  return supermarketDisplays(b.retail?.shelves??[]).flatMap(slot=>{
    const grocery=slot.kind==='grocery',small=slot.kind==='produce'||slot.kind==='frozen';
    const facings=small?2:Math.min(6,Math.max(2,Math.floor((slot.width??.8)/(slot.kind==='bakery'?.4:.29))));
    const count=Math.min(small?4:facings*(grocery?2:3),Math.floor(shelfQuantity(b,slot.id)));
    return Array.from({length:count},(_,i)=>{
      const facing=i%facings,row=Math.floor(i/facings),offset=(facing-(facings-1)/2)*(small?.25:((slot.width??.8)-.3)/facings);
      return {...slot,x:slot.x+(grocery?slot.side*(.18-row*.31):offset),z:slot.z+(grocery?offset:small?(row-.5)*.24:.32-row*.29)};
    });
  });
}
export function supermarketStockGeometry(b:Business){
  const m=new ModelParts();m.box([0,-.08,0],[.01,.01,.01],'#d4d2cd');
  for(const slot of supermarketStockUnits(b)){
    const product=retailProduct(slot.id)!;
    const form=product.form??(slot.kind==='produce'?'produce':slot.kind==='bakery'?'loaf':slot.kind==='chilled'?(slot.id==='milk'?'bottle':'tray'):['juice','soap','detergent'].includes(slot.id)?'bottle':slot.id==='flowers'?'flower':'box');
      const {x,y,z}=slot,scale=slot.kind==='grocery'?1.2:1;
      const at=(p:Vec3)=>[x+(p[0]-x)*scale,y+(p[1]-y)*scale,z+(p[2]-z)*scale] as Vec3;
      const size=(v:Vec3)=>v.map(n=>n*scale) as Vec3;
      const box=(p:Vec3,s:Vec3,c:string)=>m.box(at(p),size(s),c);
      const oval=(p:Vec3,s:Vec3,c:string)=>m.add(new THREE.SphereGeometry(1,8,6),c,at(p),size(s));
      const cylinder=(position:Vec3,radius:number,height:number,color:string,segments:number)=>m.add(new THREE.CylinderGeometry(radius*scale,radius*scale,height*scale,segments),color,at(position));
      const label=(height:number,width:number,depth:number)=>slot.kind==='grocery'?box([x+slot.side*depth,y+height,z],[.008,.1,width],'#f5ecd8'):box([x,y+height,z+depth],[width,.1,.008],'#f5ecd8');
      const color=product.color;
      if(form==='produce'){
        oval([x,y+.1,z],['bananas','carrots','cucumber'].includes(slot.id)?[.07,.055,.12]:[.10,.10,.095],color);
        box([x,y+.20,z],[.018,.05,.02],'#58744c');
      }else if(form==='loaf'){
        oval([x,y+.12,z],[.17,.11,.12],color);for(const dx of [-.08,0,.08])box([x+dx,y+.22,z],[.012,.01,.12],'#e6cc9a');
      }else if(form==='bottle'){
        cylinder([x,y+.14,z],.075,.26,color,10);cylinder([x,y+.30,z],.035,.075,color,8);cylinder([x,y+.35,z],.038,.028,'#49605a',8);
        label(.14,.09,.077);
      }else if(form==='can'||form==='jar'){
        cylinder([x,y+.12,z],.095,.23,color,10);cylinder([x,y+.245,z],.098,.02,form==='can'?'#bac2bd':'#697b67',10);
        label(.13,.12,.095);
      }else if(form==='roll'){
        cylinder([x,y+.125,z],.10,.24,'#eee9da',10);cylinder([x,y+.249,z],.032,.008,'#9d8c72',8);
      }else if(form==='textile'){
        for(let fold=0;fold<3;fold++)box([x,y+.035+fold*.055,z],[.23,.05,.21],fold%2?color:'#ddd4c2');
      }else if(form==='flower'){
        cylinder([x,y+.08,z],.07,.15,'#ba9873',8);m.branch(at([x,y+.14,z]),at([x,y+.36,z]),.015,.012,'#647a4f');oval([x,y+.35,z],[.11,.08,.1],color);
      }else if(form==='tray'){
        box([x,y+.025,z],[.25,.05,.22],'#e5dfd2');oval([x,y+.07,z],[.10,.045,.08],color);
      }else{
        box([x,y+.14,z],[.22,.28,.19],color);
        label(.14,.13,slot.kind==='grocery'?.114:.099);
        if(form==='bag')box([x,y+.29,z],[.23,.028,.12],'#ded3b7');
      }
  }
  return m.finish();
}
export function SupermarketLift3D(){return <group position={[8,0,8]}><mesh position={[0,1.35,0]}><boxGeometry args={[1.6,2.7,1.4]}/><meshStandardMaterial color="#a6b2b3" roughness={.35} metalness={.3}/></mesh><mesh position={[-.81,1.3,0]}><boxGeometry args={[.03,2.35,1.15]}/><meshStandardMaterial color="#d3d9d6" metalness={.5} roughness={.25}/></mesh><DepartmentSign text="LIFT" position={[0,2.95,.65]} width={1.6}/></group>;}

export function SupermarketInterior3D({b}:{b:Business}){
  const level=storeLevel(b),stockKey=(b.retail?.shelves??[]).map(id=>id+':'+shelfQuantity(b,id)).join('|');
  const fixtures=useMemo(()=>supermarketFixtureGeometry(level),[level]),stock=useMemo(()=>supermarketStockGeometry(b),[stockKey]);
  useEffect(()=>()=>fixtures.dispose(),[fixtures]);useEffect(()=>()=>stock.dispose(),[stock]);
  return <group name="supermarket-interior">
    <RetailLighting/>
    <mesh geometry={fixtures} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.67}/></mesh>
    <mesh geometry={stock} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.7}/></mesh>
    <mesh position={[6.35,1.32,-8.25]}><boxGeometry args={[2.44,.025,1.34]}/><meshStandardMaterial color="#b9d7db" transparent opacity={.22} roughness={.14} depthWrite={false}/></mesh>
    <DepartmentSign text="BAKERY" position={[-6.1,2.57,-8.05]} width={4}/>
    <DepartmentSign text="DAIRY · MEAT · FISH" position={[.45,2.57,-8.05]} width={7.35}/>
    <DepartmentSign text="FROZEN" position={[6.35,1.68,-8.6]} width={2.5}/>
    <DepartmentSign text="FRESH PRODUCE" position={[5.35,2.2,2.4]} width={4.7}/>
    {[-5,0,5].map((x,i)=><DepartmentSign key={x} text={["1  FOOD & DRINK","2  HOUSEHOLD & CARE","3  HOME & EVERYDAY"][i]} position={[x,2.38,1.57]} width={2.45}/>)}
    <DepartmentSign text="CHECKOUT" position={[-4.6,2.6,6.3]} width={3}/>
    {level>=3&&<DepartmentSign text="CHECKOUT 2" position={[4.1,2.6,6.3]} width={3}/>}
    <DepartmentSign text={level>=3?"RECEIVING / BACKROOM":"RECEIVING"} position={[7.7,2.35,-4]} width={2.2}/>
    {Array.from({length:Math.min(10,Math.ceil(Object.values(b.retail?.store?.receiving??{}).reduce((n,v)=>n+v,0)/6))},(_,i)=><mesh key={i} position={[7.9,.42+Math.floor(i/5)*.8,-5+(i%5)*.48]}><boxGeometry args={[.65,.4,.4]}/><meshStandardMaterial color="#b79971"/></mesh>)}
    <SupermarketLift3D/>
  </group>;
}

export function electronicsGeometry(b:Business){
  const m=new ModelParts();
  m.box([-4.6,.6,6.5],[5.6,1.2,1.3],'#3c4d68');m.box([-4.6,1.25,6.5],[5.8,.12,1.4],'#dedfda');
  m.box([-5.1,1.55,6.3],[.56,.42,.08],'#313d48');m.box([-5.1,1.55,6.35],[.45,.31,.015],'#8ba9bf');
  const selected=b.retail?.shelves??[];
  for(const [id,x,z] of electronicsDisplays){
    if(!productUnlocked(b,id))continue;
    const appliance=['fridge_appliance','washing_machine','vacuum'].includes(id),base=appliance?.14:1.05;
    const wide=id==='tv'?4.4:id==='console'?3.2:appliance?2:2.4;
    m.box([x,base/2,z],[wide,base,appliance?1.8:1.5],appliance?'#8d999e':'#c5b8a2');
    m.box([x,base+.025,z],[wide+.08,.05,appliance?1.9:1.6],'#e4e3dc');
    if(!selected.includes(id))continue;
    const tint=retailProduct(id)!.color;
    if(id==='tv'){
      m.box([x,base+.12,z],[1,.12,.48],'#3c454c');m.box([x,base+.3,z],[.08,.4,.08],'#4e5559');
      m.box([x,base+1.27,z],[3.7,2.08,.15],'#222c35');m.box([x,base+1.27,z+.082],[3.53,1.91,.012],'#498095');
      m.box([x,base+1.05,z+.09],[3.52,.32,.012],'#78a4ab');
    }else if(id==='fridge_appliance'){
      m.box([x,1.44,z],[1.4,2.6,1.35],tint);m.box([x,1.25,z+.68],[1.4,.03,.02],'#667780');
      for(const y of [.9,1.55])m.box([x-.51,y,z+.73],[.045,.4,.05],'#e1e5e2');
    }else if(id==='washing_machine'){
      m.box([x,1.02,z],[1.6,1.75,1.35],tint);m.ellipsoid([x,.88,z+.69],[.55,.55,.06],'#505d67');m.ellipsoid([x,.88,z+.75],[.4,.4,.04],'#79929b');m.box([x,1.64,z+.69],[1.4,.18,.025],'#89979c');
    }else if(id==='vacuum'){
      m.ellipsoid([x,.44,z],[.47,.28,.58],tint);m.branch([x,.5,z],[x,1.9,z-.4],.06,.04,'#424e54');m.box([x,1.92,z-.4],[.45,.12,.12],'#4f5c62');
    }else if(id==='microwave'){
      m.box([x,base+.4,z],[1.7,.75,1],tint);m.box([x-.13,base+.4,z+.51],[1.18,.55,.025],'#303e47');m.box([x+.69,base+.55,z+.52],[.14,.14,.025],'#b8d4ce');
    }else if(id==='console'){
      m.box([x,base+.38,z],[.6,.7,.7],tint);m.box([x,base+.39,z+.36],[.18,.62,.025],'#303b47');m.ellipsoid([x+.7,base+.13,z+.35],[.31,.12,.2],'#4d5c64');
    }else if(id==='headphones'){
      m.add(new THREE.TorusGeometry(.32,.045,8,20,Math.PI),tint,[x,base+.43,z]);
      for(const dx of [-.32,.32])m.ellipsoid([x+dx,base+.38,z],[.08,.18,.12],tint);
    }else if(id==='kettle'){
      m.ellipsoid([x,base+.34,z],[.28,.34,.28],tint);m.branch([x+.2,base+.35,z],[x+.36,base+.65,z],.085,.045,tint);m.add(new THREE.TorusGeometry(.2,.035,6,14), '#444f57',[x-.23,base+.38,z]);
    }else if(id==='toaster'){
      m.box([x,base+.26,z],[.85,.48,.5],tint);for(const dx of [-.2,.2])m.box([x+dx,base+.51,z],[.09,.015,.34],'#3d474b');
    }else{
      const phone=id==='smartphone',laptop=id==='laptop',count=phone?3:1;
      for(let i=0;i<count;i++){
        const px=x+(i-(count-1)/2)*.65,w=phone?.32:laptop?1.35:.65,h=phone?.65:laptop?.85:.95;
        m.box([px,base+.07,z],[w+.04,.09,.75],tint);m.box([px,base+h/2+.12,z-.2],[w,h,.06],'#333e4a');m.box([px,base+h/2+.12,z-.162],[w*.86,h*.88,.012],phone?'#709eb5':'#83a6a5');
      }
    }
  }
  if(storeLevel(b)>=5){
    for(const y of [.15,.9,1.65])m.box([-7.8,y,-3],[1.1,.08,3],'#6d7d83');
    for(const z of [-4.5,-1.5])m.box([-7.8,1,z],[1.1,2,.08],'#6d7d83');
    for(let i=0;i<Math.min(4,b.retail?.store?.deliveries.filter(d=>!d.done).length??0);i++)m.box([-7.8,.5+Math.floor(i/2)*.75,-3.6+(i%2)*1.2],[.85,.62,1],'#b9a384');
  }
  return m.finish();
}
export function ElectronicsInterior3D({b}:{b:Business}){
  const model=useMemo(()=>electronicsGeometry(b),[storeLevel(b),b.retail?.shelves.join('|'),b.retail?.store?.deliveries.filter(d=>!d.done).length]);useEffect(()=>()=>model.dispose(),[model]);
  return <group name="electronics-interior"><RetailLighting electronics/><mesh geometry={model} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.5}/></mesh><DepartmentSign text="ELECTRONICS & HOME APPLIANCES" position={[-1,3.15,-8.9]} width={10} color="#3c4d68"/>
    {electronicsDisplays.filter(([id])=>productUnlocked(b,id)).map(([id,x,z])=><DepartmentSign key={id} text={`${retailProduct(id)!.name.toUpperCase()}${b.retail?.shelves.includes(id)?(b.retail.stock[id]??0)>0?'':' · ORDER STOCK':' · CHOOSE STOCK'}`} position={[x,.72,z+.83]} width={id==='tv'?4:2.25} color="#3c4d68"/>)}
    {storeLevel(b)>=5&&<DepartmentSign text="DISPATCH" position={[-7.8,2.4,-3]} width={2.3} color="#3c4d68"/>}
    <DepartmentSign text={storeLevel(b)>=5?"SERVICE & RETURNS":"CHECKOUT"} position={[-4.6,2.6,6.3]} width={4} color="#3c4d68"/><SupermarketLift3D/>
  </group>;
}
