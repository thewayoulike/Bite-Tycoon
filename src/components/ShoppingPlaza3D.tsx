import {useEffect,useMemo,useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import type {Business,Property} from '../prototype/expansionModel';
import type {VenueInteraction} from '../prototype/BusinessInterior';
import {ModelParts} from '../graphics/modelParts';
import {getSignTexture} from '../graphics/surfaceMaterials';
import {shopType,plazaUnitName,MALL_FLOORS,MALL_FACILITIES,MALL_FLOOR_HEIGHT,PLAZA_FLOORS,type MallFacility} from '../empire/plaza';
import {RealCharacter3D} from './RealCharacter3D';
import {CHILDREN} from '../people-preview/cast';

export const MALL_SIZE={width:24,depth:32};
export const plazaShopPosition=(slot:number):[number,number]=>[slot%2===0?-8.25:8.25,slot<2?-7.5:7.5];
/** People use the two atrium promenades and stop inside an unobstructed shop doorway. */
export function plazaShopRoute(slot:number):[number,number][]{const[x,z]=plazaShopPosition(slot),s=Math.sign(x);return [[0,15],[0,13],[s*3.1,13],[s*3.1,z],[s*5.6,z],[s*5.6,z-.8],[s*5.6,z],[s*3.1,z],[s*3.1,13],[0,13],[0,15]];}
export const mallPlayRoute:[number,number][]=[[-10.7,-1.9],[-10.7,1.9],[-5.1,1.9],[-5.1,-1.9],[-10.7,-1.9]];
function Sign({text,position,width=4,color='#35444a',rotation=0,height=.48}:{text:string;position:[number,number,number];width?:number;color?:string;rotation?:number;height?:number}){
 return <group position={position} rotation={[0,rotation,0]}><mesh><boxGeometry args={[width,height,.1]}/><meshStandardMaterial color={color}/></mesh><mesh position={[0,0,.056]}><planeGeometry args={[width-.16,height-.08]}/><meshBasicMaterial map={getSignTexture(text.toUpperCase())} transparent depthWrite={false}/></mesh></group>;
}
function plant(m:ModelParts,x:number,z:number,size=1){m.box([x,.28,z],[.75*size,.55,.75*size],'#b4ada1');m.branch([x,.5,z],[x,1.5*size,z],.04,.02,'#71644c');for(const d of [-1,1])m.ellipsoid([x+d*.15,1.4*size,z],[.33*size,.65*size,.32*size],'#647356');}
function chair(m:ModelParts,x:number,z:number,rotation=0,color='#b39776'){const dx=Math.sin(rotation),dz=Math.cos(rotation);m.box([x,.46,z],[.52,.12,.52],color);m.box([x-dx*.23,.78,z-dz*.23],[.52,.58,.1],color,[0,rotation,0]);for(const a of [-.2,.2])for(const b of [-.2,.2])m.box([x+a,.2,z+b],[.045,.45,.045],'#454a4d');}
function table(m:ModelParts,x:number,z:number){m.add(new THREE.CylinderGeometry(.58,.58,.08,20),'#d9cbbb',[x,.78,z]);m.add(new THREE.CylinderGeometry(.055,.055,.72,8),'#626260',[x,.36,z]);m.add(new THREE.CylinderGeometry(.3,.3,.05,12),'#626260',[x,.04,z]);for(const d of [-1,1])chair(m,x+d*.95,z,d>0?-Math.PI/2:Math.PI/2);m.add(new THREE.CylinderGeometry(.045,.035,.14,8),'#ede7dd',[x,.88,z]);}
function sofa(m:ModelParts,x:number,z:number){m.box([x,.43,z],[2.3,.6,.85],'#a19283');m.box([x,.83,z-.38],[2.3,.75,.16],'#b0a292');for(const d of [-1,1])m.box([x+d*1.05,.66,z],[.22,.75,.9],'#9a8d80');}
function shelf(m:ModelParts,x:number,z:number,color:string){m.box([x,1.15,z],[1.45,2.3,.5],'#8f7d68');for(const y of [.5,1,1.5,2]){m.box([x,y,z+.06],[1.55,.065,.64],'#d8c7af');for(let k=0;k<4;k++)m.box([x-.48+k*.32,y+.18,z+.1],[.22,.3,.24],k%2?color:'#d8d1ba');}}
function rails(m:ModelParts,x:number,z:number,length:number,rotate=false){for(let k=-length/2;k<=length/2+.01;k+=1.4)m.box([x+(rotate?0:k),.58,z+(rotate?k:0)],[.055,1.15,.055],'#687578');m.box([x,1.13,z],rotate?[.09,.07,length]:[length,.07,.09],'#aeb9ba');}
/** Merged opaque details: one draw call for shops, public spaces and furniture. */
export function plazaInteriorGeometry(types:string[],floor=0,facilities:readonly MallFacility[]=[]){
 const m=new ModelParts(),has=(id:MallFacility)=>facilities.includes(id);
 if(floor===0)m.box([0,-.15,0],[24,.3,32],'#d7cdbb');
 else {for(const x of [-7,7])m.box([x,-.15,0],[10,.3,32],'#d7cdbb');for(const z of [-10.6,10.6])m.box([0,-.15,z],[4,.3,10.8],'#d7cdbb');}
 // Tile joints and darker border strips give a sense of scale without extra draw calls.
 for(let x=-11;x<=11;x+=2)m.box([x,.008,0],[.014,.012,32],'#bfbab0');
 for(let z=-15;z<=15;z+=2){m.box([-7,.009,z],[10,.012,.014],'#bfbab0');m.box([7,.009,z],[10,.012,.014],'#bfbab0');if(Math.abs(z)>5||floor===0)m.box([0,.009,z],[4,.012,.014],'#bfbab0');}
 for(const x of [-4.02,4.02])m.box([x,.012,0],[.13,.016,31],'#9d8561');
 for(const x of [-11.85,11.85])m.box([x,.25,0],[.25,.5,32],'#c4beb2');
 for(const x of [-11.7,-4.15,4.15,11.7])for(const z of [-12.2,2.85,12.2]){m.box([x,2.2,z],[.24,4.4,.24],'#d1c4ae');m.box([x,4.34,z],[.36,.12,.36],'#9b805b');}
 // Back-of-house: paired lifts, toilets, service doors, bins and floor directory.
 m.box([0,2.1,-15.85],[24,4.2,.2],'#d4cfc5');
 for(const x of [-2,2]){m.box([x,1.4,-15.67],[2.8,2.8,.15],'#75828a');m.box([x,1.4,-15.56],[.035,2.8,.04],'#333f47');m.box([x+1.57,1.3,-15.53],[.12,.27,.07],'#b7a46d');}
 for(const x of [-8.5,8.5])m.box([x,1.4,-15.65],[1.6,2.8,.12],'#978b7d');
 for(const x of [-10.6,10.6]){plant(m,x,-13.7,.85);m.box([x,.45,13.4],[.6,.9,.6],'#65706f');}
 if(floor===0){m.add(new THREE.CylinderGeometry(1.6,1.6,.3,32),'#c3bfb3',[0,.15,0]);m.add(new THREE.CylinderGeometry(1.4,1.4,.035,32),'#7eafb6',[0,.32,0]);plant(m,0,0,1.7);}
 else {
  for(const x of [-2.03,2.03])rails(m,x,0,10.4,true);for(const z of [-5.2,5.2])rails(m,0,z,4.1);
  // Visible escalators descend into the atrium; pedestrian routes stay outside the balustrades.
  for(const x of [-.85,.85]){for(let k=0;k<22;k++){const z=-4.2+k*.38,y=-MALL_FLOOR_HEIGHT+k*MALL_FLOOR_HEIGHT/21;m.box([x,y-.12,z],[1.05,.22,.42],'#798084');}for(const dx of [-.58,.58])m.branch([x+dx,-MALL_FLOOR_HEIGHT+.95,-4.4],[x+dx,.95,4.1],.045,.045,'#4b5458');}
 }
 for(let slot=0;slot<4;slot++){
  const[x,z]=plazaShopPosition(slot),s=Math.sign(x),type=shopType(types[slot]);
  m.box([x,.018,z],[7.25,.03,8.8],['cafe','restaurant','bakery','books','home'].includes(type.id)?'#b9a48b':'#d7d3cb');
  for(const dz of [-4.45,4.45])m.box([x,.58,z+dz],[7.3,1.16,.12],'#e1d9cc');
  for(const dz of [-4.4,-1.15,1.15,4.4])m.box([s*4.45,1.8,z+dz],[.065,3.6,.065],'#4f5c61');
  m.box([s*4.45,3.63,z],[.12,.22,8.9],type.color);
  for(let k=0;k<12;k++)m.box([x-3.3+k*.6,3.65,z-4.36],[.28,.75,.13],k%2?'#c2a67e':'#a68a62');
  m.add(new THREE.TorusGeometry(.52,.035,6,24),'#a78c5b',[x,3.7,z],[1,1,1],[Math.PI/2,0,0]);m.add(new THREE.CylinderGeometry(.45,.45,.035,24),'#efe1ba',[x,3.7,z]);
  for(const dz of [-2.78,2.78])m.box([s*4.45,.18,z+dz],[.12,.36,3.25],type.color);
  m.box([x,.56,z+3.2],[4.2,1.1,.8],type.color);m.box([x,1.14,z+3.2],[4.4,.1,1],'#e3d9cb');m.box([x+s*1.4,1.38,z+3.25],[.42,.37,.15],'#303d45');
  if(['barber','beauty'].includes(type.id)){
   for(const dz of [-2.2,.1]){m.box([x+s*2,1.7,z+dz],[.06,1.45,1.5],'#9aafb6');chair(m,x+s*.8,z+dz,s>0?Math.PI/2:-Math.PI/2,'#615451');m.box([x+s*1.9,.95,z+dz],[.55,.12,1.5],'#cbbca9');for(const k of [-.45,.45])m.box([x+s*1.9,1.12,z+dz+k],[.1,.22,.13],k<0?'#dfcab2':'#8a9693');}
  }else if(['cafe','restaurant','dessert','bakery'].includes(type.id)){
   table(m,x+s*.5,z-2.35);table(m,x+s*.5,z+.25);
   m.box([x-1,1.48,z+3.15],[1.05,.55,.6],type.id==='cafe'?'#525b5e':'#b5c5c6');
   for(let k=0;k<5;k++)m.ellipsoid([x-.2+k*.35,1.28,z+3],[.13,.09,.13],type.id==='dessert'?'#c38d91':'#c69f6c');
   m.box([x+s*2.55,1.5,z-1.1],[.38,2.8,1.9],'#7c7063');for(let k=0;k<4;k++)m.box([x+s*2.35,1+k*.43,z-1.1],[.14,.09,1.75],'#d6c4a6');
  }else if(['fashion','sports'].includes(type.id)){
   for(const dz of [-2.3,.25]){for(const dd of [-.85,.85])m.box([x+s*.8,1.05,z+dz+dd],[.065,2.1,.065],'#656a6c');m.box([x+s*.8,2.05,z+dz],[.08,.08,1.85],'#656a6c');for(const k of [-.65,-.2,.25,.65]){m.box([x+s*.8,1.5,z+dz+k],[.55,.9,.15],k<0?type.color:'#ac9d89');m.box([x+s*.8,1.83,z+dz+k],[.8,.13,.17],k<0?type.color:'#ac9d89');}}
   shelf(m,x+s*2.2,z-3.5,type.color);
  }else if(type.id==='electronics'){
   for(const dz of [-2.2,.2]){m.box([x+s*.8,.5,z+dz],[2,1,1.1],'#666f76');m.box([x+s*.8,1.6,z+dz-.32],[1.8,1.15,.12],'#27343c');m.box([x+s*.8,1.6,z+dz-.24],[1.62,.94,.025],'#709bb4');for(const k of [-.4,.4])m.box([x+s*.8+k,1.07,z+dz+.2],[.22,.08,.38],'#acb4b7');}
  }else if(type.id==='home'){
   sofa(m,x+s*.8,z-2.3);m.box([x+s*.8,.35,z-.9],[1.6,.12,.9],'#b39876');m.add(new THREE.CylinderGeometry(.35,.52,.5,12),'#e9dac0',[x+s*2.3,1.8,z]);m.branch([x+s*2.3,0,z],[x+s*2.3,1.6,z],.04,.04,'#8c7759');
  }else if(type.id==='florist'){
   for(const dz of [-2.3,0])for(const dx of [.6,2]){plant(m,x+s*dx,z+dz,.85);m.ellipsoid([x+s*dx,1.55,z+dz],[.27,.17,.3],dz===0?'#bd8b80':'#d2b572');}
  }else if(type.id==='grocer'){
   for(const dz of [-2.3,.1]){m.box([x+s*1.2,.65,z+dz],[2.2,1.2,1.4],'#8f7658');for(let k=0;k<10;k++)m.ellipsoid([x+s*1.2-.85+(k%5)*.4,1.32,z+dz-.3+Math.floor(k/5)*.6],[.17,.14,.17],k%2?'#899c58':'#c88058');}
  }else {for(const dz of [-2.3,0])shelf(m,x+s*1.65,z+dz,type.id==='pharmacy'?'#b6c9c5':type.id==='toys'?'#c08a62':'#7e7583');}
 }
 // Distinct communal spaces on each floor sit outside the promenades and shop entrances.
 if(floor===1&&has('play')){
  m.box([-8,.07,0],[6.3,.12,4.7],'#98b4ae');m.box([-8,.14,0],[3.8,.02,3],'#dbc09b');
  m.box([-8.8,.72,-.7],[1.2,1.35,1.1],'#bd9367');m.box([-8.8,1.52,-.7],[1.6,.25,1.5],'#d2b26c');m.box([-7.9,.79,-.7],[1.65,.12,.7],'#b9876c',[0,0,-.65]);
  for(const x of [-9.25,-8.85])m.box([x,.3,.35],[.12,.6,.32],'#97a4aa');
  for(const x of [-7.1,-6.35])m.add(new THREE.CylinderGeometry(.28,.28,.36,12),'#bd8790',[x,.22,.8]);m.box([-6.7,.6,.8],[1.65,.1,.8],'#d9c59f');
  for(const z of [-2.48,2.48])m.box([-8,.32,z],[6.5,.6,.09],'#d2c1a5');
  sofa(m,8,-1.6);sofa(m,8,1.5);plant(m,10.8,0);
 }else if(floor===2&&has('foodcourt')){
  for(const x of [-9.6,-6.5,6.5,9.6])table(m,x,0);
  for(const x of [-11.1,11.1])m.box([x,.65,2.2],[.75,1.3,.55],'#7c8986');
 }else if(floor===3&&has('cinema')){
  m.box([-11.3,1.75,0],[.12,2.6,4.6],'#394955');m.box([-11.2,1.85,0],[.02,2.1,3.9],'#a8c3ce');
  for(const x of [-8.8,-6.7])for(const z of [-1.3,0,1.3])chair(m,x,z,-Math.PI/2,'#8b5554');
  for(const x of [6,8,10]){m.box([x,.8,-1],[1.2,1.6,.8],'#4c5968');m.box([x,1.63,-1.1],[1.1,.75,.15],'#94b4b7');m.box([x,1.03,-.47],[1.1,.12,.6],'#af9c7e');}
 }else if(floor===4&&has('roofgarden')){
  for(const x of [-8,8]){m.box([x,.06,0],[6.8,.09,5.3],'#ae9476');table(m,x,0);for(const dx of [-2.7,2.7])plant(m,x+dx,0,1.3);for(const dx of [-3,3])m.box([x+dx,1.7,-2.4],[.15,3.4,.15],'#82715c');for(let dz=-2.3;dz<=2.3;dz+=.65)m.box([x,3.4,dz],[6.1,.14,.16],'#a19074');}
 }else {for(const x of [-8,8]){sofa(m,x,-1.4);m.box([x,.39,.1],[1.5,.12,.8],'#b5a18a');plant(m,x+2.6,1,1.1);}}
 if(floor===0){m.box([7,.57,14.2],[4.2,1.1,1.1],'#a18c6e');m.box([7,1.15,14.2],[4.4,.12,1.25],'#e6ded0');m.box([7,1.45,14.3],[.45,.4,.1],'#36464d');m.box([-7,1.2,14.3],[1.25,2.3,.35],'#485f67');m.box([-7,1.4,14.5],[1,1.4,.025],'#bccecc');}
 return m.finish();
}
function MovingShopper({route,seed,speed,child=false}:{route:[number,number][];seed:number;speed:number;child?:boolean}){
 const group=useRef<THREE.Group>(null),elapsed=useRef(seed%17),legs=useMemo(()=>route.slice(1).map((p,i)=>Math.hypot(p[0]-route[i][0],p[1]-route[i][1])),[route]),length=legs.reduce((n,v)=>n+v,0);
 useFrame((_,delta)=>{elapsed.current+=Math.min(delta,.08)*speed;let distance=(elapsed.current*(child?.75:1.35))%length;for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],len=legs[i-1];if(distance<=len){group.current?.position.set(a[0]+(b[0]-a[0])*distance/len,0,a[1]+(b[1]-a[1])*distance/len);if(group.current)group.current.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);break;}distance-=len;}});
 return <group ref={group}><RealCharacter3D role="customer" seed={seed} castId={child?CHILDREN[seed%CHILDREN.length].id:undefined} gameSpeed={speed} isWalking={speed>0}/></group>;
}
function MallGlass({floor}:{floor:number}){return <group>{[-1,1].map(s=><mesh key={s} position={[s*11.95,2.2,0]}><boxGeometry args={[.045,4.4,32]}/><meshStandardMaterial color="#abc6d2" transparent opacity={.15} metalness={.3} roughness={.12} depthWrite={false}/></mesh>)}{floor>0&&[-1,1].map(s=><mesh key={s} position={[s*2.03,.63,0]}><boxGeometry args={[.035,1,10.4]}/><meshStandardMaterial color="#b3d3db" transparent opacity={.24} depthWrite={false}/></mesh>)}{[0,1,2,3].flatMap(slot=>{const[x,z]=plazaShopPosition(slot);return [-2.78,2.78].map(dz=><mesh key={`${slot}:${dz}`} position={[Math.sign(x)*4.45,1.97,z+dz]}><boxGeometry args={[.035,3.15,3.2]}/><meshStandardMaterial color="#bed1d3" transparent opacity={.12} roughness={.16} depthWrite={false}/></mesh>);})}</group>;}
function SeatedShopper({position,seed,gameSpeed,eating=true}:{position:[number,number,number];seed:number;gameSpeed:number;eating?:boolean}){return <group position={position} rotation={[0,-Math.PI/2,0]}><RealCharacter3D role="customer" seed={seed} gameSpeed={gameSpeed} isSitting isEating={eating} seatHeight={.46}/></group>;}
export function ShoppingPlaza3D({b,floor,gameSpeed,interactive,onInteract,isNight}:{b:Business;floor:number;gameSpeed:number;interactive:boolean;onInteract?:(a:VenueInteraction,id?:number)=>void;isNight:boolean}){
 const [labels,setLabels]=useState(false),units=(b.venue?.units??[]).slice(floor*4,floor*4+4),types=units.map(u=>u.shopType??'barber').join(','),facilities=b.plaza?.facilities??[],facilityKey=facilities.join(','),model=useMemo(()=>plazaInteriorGeometry(types.split(','),floor,facilityKey.split(',') as MallFacility[]),[types,floor,facilityKey]);
 const active=!isNight&&!!b.venue?.running,amenity=MALL_FACILITIES.find(f=>f.floor===floor),hasAmenity=!!amenity&&facilities.includes(amenity.id),routes=useMemo(()=>[0,1,2,3].map(plazaShopRoute),[]);
 useEffect(()=>()=>model.dispose(),[model]);
 return <><mesh geometry={model} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.68}/></mesh><MallGlass floor={floor}/>
  <Sign text={`${floor===0?'G':floor}  |  ${MALL_FLOORS[floor].name}`} position={[0,3.65,-15.5]} width={10} height={.65}/><Sign text="Toilets / baby care" position={[8.5,3,-15.5]} width={4.3}/><Sign text="Service / staff" position={[-8.5,3,-15.5]} width={4.3}/>
  {units.map((u,slot)=>{const[x,z]=plazaShopPosition(slot),type=shopType(u.shopType),index=floor*4+slot,food=['cafe','restaurant','dessert','bakery'].includes(type.id);return <group key={index}>
   <Sign text={type.name} position={[x,3.35,z-4.35]} width={6.6} color={type.color} height={.6}/>
   {u.occupied&&<><RealCharacter3D role={food?'chef':'cashier'} seed={70+index} position={[x,0,z+3.9]} gameSpeed={gameSpeed} isWorking={active}/>{active&&<><MovingShopper route={routes[slot]} seed={41+index*13} speed={gameSpeed}/>{food&&<SeatedShopper seed={122+index} position={[x+Math.sign(x)*.5+.95,0,z-2.35]} gameSpeed={gameSpeed}/>}</>}</>}
   {interactive&&<mesh position={[x,1.5,z]} onClick={e=>{e.stopPropagation();onInteract?.('prices',index);}}><boxGeometry args={[7,3,8.7]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>}
   {interactive&&labels&&<Html position={[x,2,z]} center zIndexRange={[6,0]}><button className="venue-hotspot" aria-label={`Manage ${plazaUnitName(index)} · ${type.name}`} onClick={e=>{e.stopPropagation();onInteract?.('prices',index);}}><strong>{plazaUnitName(index)} · {u.occupied?'Leased':'To let'}</strong><small>{type.name} · ${u.occupied?u.rent:u.rate}/week</small></button></Html>}
  </group>;})}
  {floor===0&&<><RealCharacter3D role="manager" seed={92} position={[7,0,15]} gameSpeed={gameSpeed}/><Sign text="Concierge / leasing" position={[7,2.8,14.3]} width={4.6}/></>}
  <RealCharacter3D role="cleaner" seed={39+floor} position={[-6,0,-14.1]} gameSpeed={gameSpeed} isWorking={active}/>
  {active&&hasAmenity&&floor===1&&<>{[5,19,26].map(seed=><MovingShopper key={seed} route={mallPlayRoute} seed={seed} speed={gameSpeed} child/>)}<RealCharacter3D role="customer" seed={133} position={[8,0,-1.4]} gameSpeed={gameSpeed} isSitting seatHeight={.5}/><RealCharacter3D role="helper" seed={44} position={[-4.8,0,2.7]} gameSpeed={gameSpeed}/></>}
  {active&&hasAmenity&&(floor===2||floor===4)&&[-1,1].map(s=><SeatedShopper key={s} seed={155+s} position={[s*(floor===2?9.6:8)+.95,0,0]} gameSpeed={gameSpeed}/>)}
  {active&&hasAmenity&&floor===3&&<SeatedShopper seed={194} position={[-6.7,0,0]} gameSpeed={gameSpeed} eating={false}/>}
  {amenity&&<Sign text={hasAmenity?amenity.name:'Future '+amenity.name} position={[-8,2.7,-2.8]} width={6.6} color={hasAmenity?'#686453':'#7b8081'}/>}
  {interactive&&<Html fullscreen style={{pointerEvents:'none'}} zIndexRange={[22,21]}><div className="mall-view-tools"><span>Click a shop to manage it</span><button className="mc-button" aria-pressed={labels} onClick={()=>setLabels(v=>!v)}>{labels?'Hide shop labels':'Show shop labels'}</button><button className="mc-button" onClick={()=>onInteract?.('bookings')}>Tenants & leases</button><button className="mc-button" onClick={()=>onInteract?.('upgrades')}>Floors & facilities</button></div></Html>}
 </>;
}
/** Shared signature architecture: stone wings, a bowed glass atrium and a barrel-vault skylight. */
export function mallExteriorGeometry(levels:number,openFloors:number,roof=true){
 const m=new ModelParts(),glass=new ModelParts(),height=levels*MALL_FLOOR_HEIGHT;
 const bronze='#9b805b',stone='#d0c3ae',frame='#536269';
 m.box([0,-.06,0],[24.3,.12,32.3],'#bdb3a2');
 for(let i=0;i<levels;i++){
  const y=i*MALL_FLOOR_HEIGHT,lit=i<openFloors;
  m.box([0,y+.13,0],[24,.26,31.5],'#c2b8a7');
  for(const x of [-8.35,8.35]){
   m.box([x,y+.42,15.77],[7.15,.58,.46],stone);
   glass.box([x,y+2.7,15.72],[6.7,3.95,.055],lit?'#a3bec6':'#69838e');
   for(const dx of [-2.25,0,2.25])m.box([x+dx,y+2.6,15.84],[.075,4.3,.16],bronze);
   if(i>0&&lit){m.box([x,y+.65,16.02],[5.9,.42,.55],'#b8ad94');for(let k=0;k<9;k++)m.ellipsoid([x-2.65+k*.66,y+.97,16.02],[.38,.3,.28],k%2?'#667955':'#7b8860');}
  }
  for(const x of [-12,12]){
   glass.box([x,y+2.55,0],[.05,4.2,31.3],lit?'#9ab8c1':'#657c89');
   m.box([x,y+.3,0],[.24,.6,31.8],stone);
   for(let z=-15.4;z<16;z+=2.8)m.box([x,y+2.55,z],[.12,4.55,.08],frame);
  }
  glass.box([0,y+2.55,-15.76],[23.7,4.2,.05],lit?'#91aeb8':'#657c89');
  m.box([0,y+.28,-15.8],[24,.55,.24],stone);
  for(let x=-11.5;x<=12;x+=2.8)m.box([x,y+2.55,-15.85],[.08,4.55,.12],frame);
  if(lit){for(const x of [-8,8])for(const z of [-10,8])m.box([x,y+1.3,z],[3,1.1,1.2],'#ac9676');for(const x of [-3.2,3.2])m.box([x,y+4.55,0],[.12,.06,29],'#e1cfa6');}
 }
 // Stone piers frame the full-height entrance rather than repeating an office-window grid.
 for(const x of [-11.85,-4.9,4.9,11.85])m.box([x,height/2,15.82],[.5,height,.55],stone);
 for(const x of [-12.15,12.15])for(let z=-14;z<16;z+=4.2)m.box([x,height/2,z],[.24,height,.65],bronze);
 for(const x of [-12,12])m.box([x,height/2,-15.7],[.42,height,.42],stone);
 // A gently curved, uninterrupted glass entrance, with bronze vertical mullions.
 for(let n=0;n<10;n++){
  const x1=-4.65+n*.93,x2=x1+.93,z1=15.05+Math.sqrt(Math.max(0,1-(x1/4.65)**2))*.95,z2=15.05+Math.sqrt(Math.max(0,1-(x2/4.65)**2))*.95;
  const angle=-Math.atan2(z2-z1,x2-x1),length=Math.hypot(x2-x1,z2-z1);
  glass.box([(x1+x2)/2,height/2,(z1+z2)/2],[length,height,.055],'#aac9d1',[0,angle,0]);
  m.box([x1,height/2,z1+.05],[.075,height,.09],bronze);
 }
 if(roof){
  // Two planted roof terraces flank a large curved skylight.
  for(const x of [-8.45,8.45]){m.box([x,height+.12,0],[7.3,.25,32],'#c5b59d');m.box([x,height+.35,0],[6.1,.18,28],'#b8a07d');for(const z of [-14.5,14.5]){m.box([x,height+.55,z],[6.25,.8,.7],stone);for(let k=0;k<9;k++)m.ellipsoid([x-2.6+k*.65,height+1.08,z],[.38,.4,.35],'#728164');}for(const z of [-6,6]){m.box([x,height+.65,z],[3.4,.18,1.2],'#9c8160');for(const dx of [-1.4,1.4])m.box([x+dx,height+.36,z],[.1,.6,.8],bronze);}}
  for(let n=0;n<16;n++){
   const a=n*Math.PI/16,b=(n+1)*Math.PI/16,x1=Math.cos(a)*4.65,x2=Math.cos(b)*4.65,y1=height+.25+Math.sin(a)*2.8,y2=height+.25+Math.sin(b)*2.8;
   const length=Math.hypot(x2-x1,y2-y1),angle=Math.atan2(y2-y1,x2-x1);
   glass.box([(x1+x2)/2,(y1+y2)/2,0],[length,.045,31],'#a2bec9',[0,0,angle]);
   for(const z of [-15.5,-8,0,8,15.5])m.branch([x1,y1,z],[x2,y2,z],.06,.06,bronze);
   const front=new THREE.BufferGeometry();front.setAttribute('position',new THREE.Float32BufferAttribute([0,height+.2,15.5,x1,y1,15.5,x2,y2,15.5],3));front.computeVertexNormals();glass.add(front,'#b4cdd3');
  }
  // Sculpted entrance canopy and a revolving glass door.
  m.box([0,3.65,16.2],[10.3,.18,2.1],bronze);glass.box([0,3.77,16.2],[9.9,.06,1.95],'#acc4ca');
  for(const x of [-4.9,4.9])m.box([x,1.85,15.9],[.15,3.7,.15],bronze);
  m.add(new THREE.CylinderGeometry(1.25,1.25,.13,32),bronze,[0,2.82,15.28]);
  glass.add(new THREE.CylinderGeometry(1.19,1.19,2.65,32,1,true),'#bfd0d1',[0,1.43,15.28]);
  m.box([0,1.4,15.28],[.08,2.8,.08],bronze);for(const y of [.1,2.7]){m.box([0,y,15.28],[2.3,.065,.05],frame);m.box([0,y,15.28],[.05,.065,2.3],frame);}glass.box([0,1.4,15.28],[2.3,2.6,.035],'#bfd0d1');glass.box([0,1.4,15.28],[.035,2.6,2.3],'#bfd0d1');
  // Leaf-shaped emblem above the entrance.
  m.ellipsoid([0,height+1.25,15.62],[.35,.67,.06],bronze);m.branch([0,height+.7,15.71],[0,height+1.8,15.71],.025,.008,'#e5d2a5');
 }
 return {frame:m.finish(),glass:levels>0?glass.finish():new THREE.BufferGeometry()};
}
export function PlazaBuilding3D({p,floors=1,selected=false,owned=false,labels=true,onSelect,cutawayFloor,isNight=false}:{p:Property;floors?:number;selected?:boolean;owned?:boolean;labels?:boolean;onSelect?:()=>void;cutawayFloor?:number;isNight?:boolean}){
 const levels=cutawayFloor??PLAZA_FLOORS,height=levels*MALL_FLOOR_HEIGHT,model=useMemo(()=>mallExteriorGeometry(levels,floors,cutawayFloor===undefined),[levels,floors,cutawayFloor]);
 useEffect(()=>()=>{model.frame.dispose();model.glass.dispose();},[model]);
 return <group position={p.position} scale={.75} onClick={e=>{if(onSelect){e.stopPropagation();onSelect();}}}>
  <mesh geometry={model.frame} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.5} metalness={.14}/></mesh>
  <mesh geometry={model.glass}><meshPhysicalMaterial vertexColors transparent opacity={.64} roughness={.12} metalness={.3} clearcoat={1} side={THREE.DoubleSide} envMapIntensity={1.4} emissive={isNight?'#b49a78':'#000000'} emissiveIntensity={.2} depthWrite={false}/></mesh>
  {cutawayFloor===undefined&&<><Sign text="WILLOW" position={[-8.4,height-1.2,16.2]} width={5.8} height={1.2} color="#5b624e"/><Sign text="GALLERIA" position={[-8.4,height-2.28,16.2]} width={5.8} height={.75} color="#5b624e"/><Sign text="SHOP / DINE / PLAY" position={[8.4,6.5,16.3]} width={6} height={.65} color="#826e51"/><Sign text="Willow Galleria" position={[0,3.2,17.28]} width={8.8} height={.6} color="#6a604c"/>{floors<PLAZA_FLOORS&&<Sign text={`${floors} floor${floors>1?'s':''} open / more coming soon`} position={[8.4,5.65,16.3]} width={6} height={.45} color="#637176"/>}</>}
  {selected&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.012,0]}><planeGeometry args={[24.5,32.5]}/><meshBasicMaterial color="#d8b866" transparent opacity={.22}/></mesh>}
  {labels&&onSelect&&<Html position={[0,height+3.5,0]} center zIndexRange={[4,0]}><button className={`map-pin ${selected?'selected':''}`} aria-label={`Select ${p.name}`} onClick={onSelect}><span className={owned?'owned-dot':'available-dot'}/>{p.name}<small>{owned?`${floors} / ${PLAZA_FLOORS} mall floors open`:'Shopping mall · available'}</small></button></Html>}
 </group>;
}
