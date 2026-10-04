import {useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame} from '@react-three/fiber';
import {Html,OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import {Business,Property} from './expansionModel';
import {ModelParts,Vec3} from '../graphics/modelParts';
import {getSurfaceMaterial,getSignTexture} from '../graphics/surfaceMaterials';
import {OutdoorReflections3D} from '../components/OutdoorReflections3D';
import {RealCharacter3D} from '../components/RealCharacter3D';
import {ParkFountain3D} from '../components/CityScenery3D';
import {StylizedTree3D} from '../components/StreetAssets3D';
import {ElectronicsInterior3D,SupermarketInterior3D} from '../components/SupermarketInterior3D';
import {SupermarketPeople3D} from '../components/SupermarketPeople3D';
import {retailProductFloor} from '../empire/retail';
import {createVenue,serviceBlocker,VenueVisitor,venueRules} from '../empire/venueSimulation';
import {LodgingBusiness3D} from '../components/LodgingBusiness3D';
import {ShoppingPlaza3D} from '../components/ShoppingPlaza3D';

export type VenueInteraction='serve'|'clean'|'care'|'inventory'|'staff'|'finance'|'run'|'prices'|'bookings'|'upgrades';

function VenueFurniture({p}:{p:Property}){
  const model=useMemo(()=>{
    const m=new ModelParts();
    const counter=(x:number,z:number,w:number)=>{m.box([x,.65,z],[w,1.3,1.3],'#987552');m.box([x,1.33,z],[w+.15,.12,1.45],'#e9dfc9');m.box([x+.6,1.54,z],[.5,.4,.12],'#30434a');m.box([x+.6,1.36,z+.27],[.5,.05,.32],'#3d4d50');};
    const plant=(x:number,z:number)=>{m.add(new THREE.CylinderGeometry(.4,.3,.65,12),'#b29979',[x,.32,z]);for(let i=0;i<5;i++)m.ellipsoid([x+Math.sin(i)*.2,1+i*.13,z+Math.cos(i)*.18],[.23,.5,.14],'#55724c');};
    if(p.kind==='park'){
      for(const x of [-7,7])for(const z of [-3,3]){
        m.box([x,.62,z],[3,.14,.7],'#ac8d5d');m.box([x,1.06,z-.33],[3,.8,.1],'#ac8d5d');
        for(const dx of [-1.2,1.2])m.box([x+dx,.3,z],[.12,.65,.6],'#526551');
      }
      counter(7,-6,4.2);m.box([7,1.3,-7.4],[4.5,2.6,.15],'#b79c70');
      m.box([7,2.8,-6.7],[5,.3,3.6],'#5d7858');
      for(const x of [4.8,9.2])m.box([x,1.4,-5.2],[.12,2.8,.12],'#cfc2a1');
      for(const x of [-8,-4,0]){m.box([x,.15,-7],[3,.3,1.3],'#aa9374');for(let i=0;i<9;i++)m.ellipsoid([x-1+i%3,.45,-7.4+Math.floor(i/3)*.4],[.23,.26,.22],['#dcad67','#c8777e','#d5d8b2'][i%3]);}
      m.box([-8,.9,6],[1,1.8,1],'#73896a');m.box([-8,1.85,6],[1.2,.1,1.2],'#53694e');
      m.box([0,.2,7],[5,.4,2.4],'#bcac87');
      for(const x of [-9,9]){m.branch([x,0,0],[x,3.7,0],.07,.05,'#596456');m.ellipsoid([x,3.8,0],[.26,.38,.26],'#efe2ad');}
    }else counter(0,-5,12);
    if(p.kind!=='park'){plant(-8,7.8);plant(8,7.8);plant(8,-8);}
    return m.finish();
  },[p]);
  useEffect(()=>()=>model.dispose(),[model]);
  return <mesh geometry={model} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.72}/></mesh>;
}
function Hotspot({position,title,note,onClick,disabled=false}:{position:Vec3;title:string;note:string;onClick:()=>void;disabled?:boolean}){
  return <group position={position}><Html center zIndexRange={[6,0]}><button className="venue-hotspot" disabled={disabled} onClick={e=>{e.stopPropagation();onClick();}}><strong>{title}</strong><small>{note}</small></button></Html></group>;
}
function MovingPerson({person,p,index,speed,onServe,floor=0}:{person:VenueVisitor;p:Property;index:number;speed:number;onServe?:()=>void;floor?:number}){
  const ref=useRef<THREE.Group>(null),position=useRef(new THREE.Vector3(floor?6.4:0,0,floor?8.7:11));
  const[walking,setWalking]=useState(true),walkingRef=useRef(true);
  const target=useMemo(()=>new THREE.Vector3(),[]);
  useFrame((_,delta)=>{
    if(person.state==='waiting')target.set(-3+index*.8,0,8.9+Math.floor(index/4)*.65);
    else if(person.state==='leaving')target.set(floor?6.4:0,0,floor?8.7:11.5);
    else target.set(p.kind==='park'?Math.sin(person.seed)*7:6,0,p.kind==='park'?Math.cos(person.seed)*5:6.8);
    const distance=position.current.distanceTo(target),moving=distance>.08&&speed>0;
    if(moving)position.current.lerp(target,Math.min(1,delta*speed*2.8/distance));
    if(moving!==walkingRef.current){walkingRef.current=moving;setWalking(moving);}
    if(ref.current){ref.current.position.copy(position.current);if(moving)ref.current.rotation.y=Math.atan2(target.x-position.current.x,target.z-position.current.z);}
  });
  return <group ref={ref} onClick={e=>{e.stopPropagation();onServe?.();}}><RealCharacter3D role="customer" seed={person.seed} gameSpeed={speed} isWaitingFood={person.state==='waiting'} isWalking={walking}/></group>;
}
export function BusinessInterior({p,b}:{p:Property;b:Business}){
  return <Canvas shadows={{type:THREE.PCFShadowMap}} dpr={[1,1.5]} camera={{position:[15,19,24],fov:43}}><color attach="background" args={['#dce6df']}/><hemisphereLight intensity={1.8}/><directionalLight position={[-8,18,10]} intensity={2.5} castShadow/><OutdoorReflections3D isNight={false}/><BusinessContents3D p={p} b={b}/><OrbitControls target={[0,.7,0]} minDistance={8} maxDistance={45} maxPolarAngle={1.4}/></Canvas>;
}
export function BusinessContents3D({p,b,gameSpeed=1,interactive=false,onInteract,serviceActive=false,isNight=false,floor=0}:{p:Property;b:Business;gameSpeed?:number;interactive?:boolean;onInteract?:(action:VenueInteraction,id?:number)=>void;serviceActive?:boolean;isNight?:boolean;floor?:number}){
  const park=p.kind==='park',venue=b.venue??createVenue(p),rules=venueRules(p),visitors=p.kind==='shop'?venue.visitors.filter(v=>retailProductFloor(v.productId??'')===floor):venue.visitors,waiting=visitors.filter(v=>v.state==='waiting'&&(!b.retail?.store||v.basket));
  const blocker=waiting.length?serviceBlocker(p,b,waiting[0].id):'Waiting for arrivals';
  const housing=p.kind==='hotel'||p.kind==='apartments';
  const act=(action:VenueInteraction,id?:number)=>onInteract?.(action,id);
  if(p.kind==='plaza')return <ShoppingPlaza3D b={b} floor={floor} gameSpeed={gameSpeed} interactive={interactive} onInteract={onInteract} isNight={isNight}/>;
  if(housing)return <LodgingBusiness3D p={p} b={b} floor={floor} gameSpeed={gameSpeed} interactive={interactive} onInteract={onInteract} serviceActive={serviceActive} isNight={isNight}/>;
  return <>
    <mesh position={[0,-.16,0]} receiveShadow material={getSurfaceMaterial(park?'grass':p.kind==='shop'?'concrete':'wood',park?'#869f68':p.kind==='hotel'?'#ba9c78':p.kind==='shop'?'#d0cabe':'#bbac93',7,7)}><boxGeometry args={[park?22:18,.3,park?18:20]}/></mesh>
    {p.kind==='shop'?(floor===1&&b.retail?.electronicsUnlocked?<ElectronicsInterior3D b={b}/>:<SupermarketInterior3D b={b}/>):<VenueFurniture p={p}/>}
    {park?<><ParkFountain3D position={[0,0,-.5]}/>{[-9,9].flatMap((x,i)=>[-7,7].map((z,j)=><StylizedTree3D key={`${x}:${z}`} position={[x,0,z]} seed={i+j} scale={1}/>))}<mesh position={[0,.015,0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[4.5,6.2,48]}/><meshStandardMaterial color="#c8c1ad"/></mesh><mesh position={[0,.02,4.5]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[2.4,9]}/><meshStandardMaterial color="#c8c1ad"/></mesh></>:<>
      <mesh position={[0,1.7,-10]} receiveShadow><boxGeometry args={[18,3.4,.2]}/><meshStandardMaterial color={p.kind==='shop'?'#e5e2d9':'#d9dfcf'}/></mesh>
      <mesh position={[-9,1.7,0]} receiveShadow><boxGeometry args={[.2,3.4,20]}/><meshStandardMaterial color="#cbcaba"/></mesh>
      {[-6.3,-2.1,2.1,6.3].map(x=><group key={x}><mesh position={[x,1.8,-9.84]}><boxGeometry args={[3.3,2.3,.15]}/><meshStandardMaterial color="#eee3cc"/></mesh><mesh position={[x,1.8,-9.73]}><boxGeometry args={[2.9,1.9,.05]}/><meshStandardMaterial color={isNight?'#eecb89':'#8ca8aa'} emissive={isNight?'#e8b367':'#000000'} emissiveIntensity={.45} roughness={.25} metalness={.3}/></mesh></group>)}
      <mesh position={[0,3,-9.5]}><planeGeometry args={[7,.55]}/><meshBasicMaterial map={getSignTexture(p.name.toUpperCase())} transparent/></mesh>
      {[-5,5].map(x=><group key={x} position={[x,3.2,3]}><mesh><cylinderGeometry args={[.6,.8,.3,16]}/><meshStandardMaterial color="#eee3c2" emissive="#f4d394" emissiveIntensity={isNight?1:.15}/></mesh></group>)}
    </>}
    {b.retail?.store?<SupermarketPeople3D b={b} floor={floor} speed={gameSpeed} onAction={(a,id)=>{if(interactive)act(a,id);}}/>:<>
    {/* One opening service worker and one caretaker; hiring adds visible helpers. */}
    {Array.from({length:1+(b.hires?.service??0)},(_,i)=><group key={`service-${i}`} onClick={e=>{e.stopPropagation();if(interactive)act('staff');}} position={park?[6+i,0,-6.6]:[-5.2+i,0,5.6]}><RealCharacter3D role={park?"helper":"cashier"} seed={p.id.length*5+i} gameSpeed={gameSpeed} isWorking={serviceActive&&waiting.length>0}/></group>)}
    {Array.from({length:1+(b.hires?.care??0)},(_,i)=><group key={`care-${i}`} onClick={e=>{e.stopPropagation();if(interactive)act('staff');}} position={park?[-6+i,0,-6]:[7.8,0,-6+i*2]}><RealCharacter3D role={park?"gardener":"cleaner"} seed={21+i} gameSpeed={gameSpeed} isWorking={serviceActive}/></group>)}
    {b.manager&&<group position={park?[8,0,-7]:[-7.5,0,3]}><RealCharacter3D role="manager" seed={45} gameSpeed={gameSpeed}/></group>}
    {visitors.map(person=><MovingPerson key={person.id} person={person} p={p} floor={floor} index={Math.max(0,waiting.findIndex(v=>v.id===person.id))} speed={gameSpeed} onServe={interactive?()=>person.state==='waiting'?act('serve',person.id):act('bookings'):undefined}/>)}
    </>}
    {interactive&&rules&&<>
      {<Hotspot position={park?[6,3,-4.5]:[-4,2.9,7]} title={rules.verb} note={blocker??`${waiting.length} waiting · click to serve`} disabled={!!blocker} onClick={()=>act('serve',waiting[0]?.id)}/>}
      <Hotspot position={park?[-7,2.4,-5]:[7.5,2.7,-6]} title={p.kind==='hotel'?'Linen & supplies':p.kind==='apartments'?'Maintenance store':p.kind==='shop'?'Stockroom':'Garden supplies'} note={`${Math.round(b.stock)}% stocked · order supplies`} onClick={()=>act('inventory')}/>
      {floor===0&&<Hotspot position={park?[0,1.6,7]:[5.8,2.1,7.4]} title={p.kind==='hotel'?'Reception team':p.kind==='apartments'?'Property office':p.kind==='shop'?'Supermarket team':'Park team'} note="Hire staff & set purchasing rules" onClick={()=>act('staff')}/>}
    </>}
  </>;
}

