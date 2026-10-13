import {memo,useEffect,useMemo,useRef} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls,RoundedBox,Sky} from '@react-three/drei';
import * as THREE from 'three';
import {surface,lettering} from './materials';
import {RestaurantShell3D} from './LegacyRestaurantShell3D';
import {restaurantAppearance} from '../graphics/propertyArchitecture';
import {useResidentialHouseParts} from '../components/ResidentialHouses3D';
import {houseMaterialTint} from '../graphics/residentialAppearance';
import {StylizedTree3D,RoundedCarBody3D} from '../components/StreetAssets3D';
import {RealCharacter3D} from '../components/RealCharacter3D';
import {OutdoorReflections3D} from '../components/OutdoorReflections3D';

export type Mood='day'|'sunset'|'night'|'rain';
export type View='street'|'walk'|'inside';
type V3=[number,number,number];
const GREEN='#25443c',BRASS='#aa8956',CREAM='#e5dbc6',DARK='#252f2e';
function Box({p,s,c=CREAM,mat,rotation,shadow=true}:{p:V3;s:V3;c?:string;mat?:THREE.Material;rotation?:V3;shadow?:boolean}){
  return <mesh position={p} rotation={rotation} castShadow={shadow} receiveShadow material={mat}><boxGeometry args={s}/>{!mat&&<meshStandardMaterial color={c} roughness={.73}/>}</mesh>;
}
function Sign({text,sub='',p,w=5,h=1,color='#f7e8c8'}:{text:string;sub?:string;p:V3;w?:number;h?:number;color?:string}){return <mesh position={p}><planeGeometry args={[w,h]}/><meshBasicMaterial map={lettering(text,color,sub)} transparent depthWrite={false}/></mesh>;}
function Cylinder({p,r,h,c=BRASS}:{p:V3;r:number;h:number;c?:string}){return <mesh position={p} castShadow receiveShadow><cylinderGeometry args={[r,r,h,16]}/><meshStandardMaterial color={c} roughness={.5} metalness={c===BRASS?.55:0}/></mesh>;}

function Plant({p,scale=1}:{p:V3;scale?:number}){return <group position={p} scale={scale}>
  <mesh position={[0,.3,0]} castShadow><cylinderGeometry args={[.3,.22,.6,20]}/><meshStandardMaterial color="#a89278" roughness={.9}/></mesh>
  <Cylinder p={[0,.85,0]} r={.035} h={1} c="#69513b"/>
  {Array.from({length:9},(_,i)=><mesh key={i} position={[Math.sin(i*2.4)*.23,.75+i*.065,Math.cos(i*2.4)*.23]} rotation={[.4,i*2.4,.65]} scale={[.2,.035,.35]} castShadow><sphereGeometry args={[1,8,6]}/><meshStandardMaterial color={i%2?'#436b42':'#658151'} roughness={.85}/></mesh>)}
  </group>;}

function Chair({p,angle=0}:{p:V3;angle?:number}){return <group position={p} rotation={[0,angle,0]}>
  <RoundedBox args={[.48,.085,.48]} radius={.04} position={[0,.47,0]} castShadow><meshStandardMaterial color="#916c46" roughness={.65}/></RoundedBox>
  <RoundedBox args={[.49,.37,.06]} radius={.035} position={[0,.76,-.22]} castShadow><meshStandardMaterial color={GREEN} roughness={.75}/></RoundedBox>
  {[-1,1].flatMap(x=>[-1,1].map(z=><Box key={`${x}${z}`} p={[x*.19,.235,z*.19]} s={[.035,.47,.035]} c={DARK}/>))}
  <Box p={[-.2,.69,-.21]} s={[.028,.43,.03]} c={DARK}/><Box p={[.2,.69,-.21]} s={[.028,.43,.03]} c={DARK}/>
  </group>;}

function Table({p,guests=false,seed=0}:{p:V3;guests?:boolean;seed?:number}){return <group position={p}>
  <Cylinder p={[0,.72,0]} r={.64} h={.065} c="#ae8a5e"/>
  <Cylinder p={[0,.35,0]} r={.045} h={.7} c={DARK}/><Cylinder p={[0,.03,0]} r={.28} h={.05} c={DARK}/>
  {[-1,1].map((side,i)=><group key={side}><Chair p={[side*.88,0,0]} angle={side>0?-Math.PI/2:Math.PI/2}/>
    {guests&&<group position={[side*.88,0,0]} rotation={[0,side>0?-Math.PI/2:Math.PI/2,0]}><RealCharacter3D seed={seed+i} isSitting seatHeight={.51} isEating gameSpeed={1}/></group>}
    <mesh position={[side*.3,.763,0]}><cylinderGeometry args={[.16,.16,.012,24]}/><meshStandardMaterial color="#eee9dd" roughness={.3}/></mesh>
    <Cylinder p={[side*.32,.81,.25]} r={.04} h={.1} c="#ede3ce"/>
  </group>)}
  <Cylinder p={[0,.81,0]} r={.045} h={.15} c={BRASS}/>
  <mesh position={[0,.9,0]}><sphereGeometry args={[.06,8,6]}/><meshStandardMaterial color="#a8875a"/></mesh>
  </group>;}

function Pendant({x,z,night}:{x:number;z:number;night:boolean}){return <group position={[x,0,z]}>
  <Cylinder p={[0,3.55,0]} r={.012} h={1.1} c={DARK}/>
  <mesh position={[0,2.96,0]} castShadow><coneGeometry args={[.37,.22,28,1,true]}/><meshStandardMaterial color={BRASS} side={THREE.DoubleSide} metalness={.7} roughness={.4}/></mesh>
  <mesh position={[0,2.86,0]} rotation={[Math.PI/2,0,0]}><circleGeometry args={[.29,24]}/><meshStandardMaterial color="#fff4c8" emissive="#ffd4a0" emissiveIntensity={night?3:1} side={THREE.DoubleSide}/></mesh>
  </group>;}

const Dining=memo(function Dining({night}:{night:boolean}){return <group>
  <Box p={[0,.12,-3]} s={[13.8,.16,9.8]} mat={surface('wood','#a78560',3,3)}/>
  <Box p={[0,.7,-6.1]} s={[9,1.05,1.2]} mat={surface('wood','#766044',2,1)}/>
  <Box p={[0,1.26,-6.1]} s={[9.2,.1,1.4]} mat={surface('stone','#d7cbb5',2,1)}/>
  {Array.from({length:39},(_,i)=><Box key={i} p={[-4.35+i*.23,.7,-5.46]} s={[.07,.9,.05]} c="#aa8960"/>)}
  <Box p={[0,2.9,-7.83]} s={[10,1.7,.12]} c={GREEN}/>
  <Sign text="MAPLE & MAIN" sub="GOOD FOOD. GOOD NEIGHBORS." p={[0,3,-7.73]} w={4.6} h={1.05}/>
  <Box p={[-3,1.55,-6.08]} s={[1.2,.45,.6]} c="#505855"/>
  {[-3.3,-3,-2.7].map(x=><Cylinder key={x} p={[x,1.84,-6.1]} r={.07} h={.12} c="#e7ddc8"/>)}
  <Box p={[3,1.47,-5.97]} s={[.28,.3,.24]} c={DARK}/>
  {[-3.9,0,3.9].flatMap((x,i)=>[-3.4,-.15].map((z,j)=><Table key={`${x}${z}`} p={[x,.2,z]} guests={i===0||i===2&&j===1} seed={i*7+j*13+3}/>))}
  {[-3.9,0,3.9].flatMap(x=>[-3.4,-.15].map(z=><Pendant key={`${x}${z}`} {...{x,z,night}}/>))}
  <Plant p={[-6,.2,-6.4]} scale={1.1}/><Plant p={[6,.2,-6.4]} scale={1.1}/>
  <group position={[1.5,.2,-7.05]}><RealCharacter3D role="chef" seed={2} isWorking gameSpeed={1}/></group>
  <group position={[2,0,-3.5]}><RealCharacter3D role="waiter" seed={4} hasTray gameSpeed={1}/></group>
  {[-4,4].map(x=><pointLight key={x} position={[x,2.65,-2.5]} color="#ffd1a0" intensity={night?38:14} distance={10} decay={2}/>)}
  </group>;});

function Sconce({x,night}:{x:number;night:boolean}){return <group position={[x,3.15,2.38]}>
  <Box p={[0,0,0]} s={[.12,.3,.12]} c={DARK}/>
  <mesh position={[0,-.13,.1]}><sphereGeometry args={[.09,12,8]}/><meshStandardMaterial color="#ffe1a7" emissive="#ffb95e" emissiveIntensity={night?3:.3}/></mesh>
  {night&&<pointLight position={[0,-.1,.4]} color="#ffc582" intensity={7} distance={4}/>}
  </group>;}

function ProposedRestaurant({inside,night,onEnter}:{inside:boolean;night:boolean;onEnter:()=>void}){
  const brick=surface('brick','#805740',3,1.5);
  return <group name="proposed-restaurant">
    <Box p={[0,.1,-3]} s={[14.4,.2,10.4]} c="#797161"/>
    <Box p={[0,2.3,-8]} s={[14.3,4.6,.28]} mat={brick}/>
    <Box p={[-7,2.3,-3]} s={[.28,4.6,10.2]} mat={brick}/>
    <Box p={[7,2.3,-3]} s={[.28,4.6,10.2]} mat={brick}/>
    {[-1,1].map(side=><group key={side}>
      <Box p={[side*6.83,2.75,-3]} s={[.03,3.55,9.8]} mat={surface('plaster','#d4c9b0',3,1)}/>
      <Box p={[side*6.8,.75,-3]} s={[.055,1.1,9.8]} c={GREEN}/>
      <Box p={[side*6.78,1.32,-3]} s={[.09,.06,9.8]} c={BRASS}/>
      {[-4.7,-1.3].map(z=><group key={z} position={[side*6.72,2.6,z]} rotation={[0,-side*Math.PI/2,0]}><Box p={[0,0,0]} s={[1.7,1.18,.09]} c={BRASS}/><Box p={[0,0,.05]} s={[1.54,1.02,.02]} c="#aaa288"/><Sign text={z< -3?'GATHER':'SAVOR'} sub="MAPLE & MAIN" p={[0,0,.07]} w={1.35} h={.5} color="#385345"/></group>)}
    </group>)}
    <Box p={[0,.62,2]} s={[14,.95,.32]} mat={surface('stone','#bcae92',6,1)}/>
    {!inside&&<group onClick={e=>{if(e.delta<5){e.stopPropagation();onEnter();}}}>
      <Box p={[0,3.72,2]} s={[14.3,1.76,.35]} mat={brick}/>
      {[-6.75,-2.7,2.7,6.75].map(x=><Box key={x} p={[x,1.94,2]} s={[.48,2.1,.42]} mat={brick}/>)}
      {[-4.7,4.7].map(x=><group key={x}>
        <Box p={[x,.9,2.18]} s={[3.4,.12,.1]} c={GREEN}/>
        <Box p={[x,3.0,2.18]} s={[3.4,.12,.1]} c={GREEN}/>
        <mesh position={[x,1.96,2.26]}><planeGeometry args={[3.21,2.0]}/><meshPhysicalMaterial color="#b5c9c5" transparent opacity={.15} roughness={.12} metalness={.3} side={THREE.DoubleSide} depthWrite={false}/></mesh>
        {/* The frame is open so the visible dining room sits behind the glazing. */}
        {[-1,1].map(side=><Box key={side} p={[x+side*1.7,1.94,2.3]} s={[.1,2.2,.16]} c={GREEN}/>)}
        <Box p={[x,1.95,2.34]} s={[.07,2.1,.1]} c={BRASS}/>
        <Box p={[x,2.63,2.34]} s={[3.35,.07,.1]} c={BRASS}/>
        <Box p={[x,2.91,2.85]} s={[3.8,.14,1.6]} c={GREEN} rotation={[-.12,0,0]}/>
        <Box p={[x,2.68,3.62]} s={[3.8,.27,.08]} c={GREEN}/>
        <Sign text="KITCHEN · COFFEE" p={[x,2.68,3.67]} w={2.5} h={.22}/>
      </group>)}
      {[-1.3,1.3].map(x=><Box key={x} p={[x,1.54,2.07]} s={[.11,3.1,.12]} c={GREEN}/>)}
      <Box p={[0,3.04,2.07]} s={[2.7,.12,.12]} c={GREEN}/>
      <mesh position={[0,1.62,2.15]}><planeGeometry args={[2.35,2.7]}/><meshPhysicalMaterial color="#b8c9c0" roughness={.13} metalness={.2} transparent opacity={.22} depthWrite={false}/></mesh>
      <Box p={[0,1.55,2.23]} s={[.065,3.04,.12]} c={BRASS}/>
      {[-.15,.15].map(x=><Box key={x} p={[x,1.3,2.3]} s={[.035,.38,.06]} c={BRASS}/>)}
      <Box p={[0,3.88,2.27]} s={[9.7,1.14,.18]} c={GREEN}/>
      <Sign text="MAPLE & MAIN" sub="NEIGHBORHOOD KITCHEN" p={[0,3.88,2.38]} w={7.0} h={.89}/>
      {[-6.5,-2.3,2.3,6.5].map(x=><Sconce key={x} x={x} night={night}/>)}
      <Box p={[0,4.65,-3]} s={[14.8,.23,10.8]} mat={surface('stone','#bcae92',6,3)}/>
      <Box p={[0,4.79,-3]} s={[14.2,.12,10.2]} mat={surface('road','#635f56',2,2)}/>
      <Box p={[3,5.1,-5]} s={[1.6,.5,1.3]} c="#7b8480"/>
      {Array.from({length:7},(_,i)=><Box key={i} p={[2.35+i*.22,5.36,-5]} s={[.05,.02,1.1]} c="#3e4948"/>)}
      <Box p={[-2.8,5.0,-2.8]} s={[4.1,.4,3]} c={GREEN}/>
      <mesh position={[-2.8,5.22,-2.8]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[3.9,2.8]}/><meshPhysicalMaterial color="#93b7b7" roughness={.14} metalness={.5}/></mesh>
      {[-4.7,-3.75,-2.8,-1.85,-.9].map(x=><Box key={x} p={[x,5.26,-2.8]} s={[.045,.055,2.9]} c={BRASS}/>)}
      <group position={[7.19,2.8,-3.5]} rotation={[0,Math.PI/2,0]}><Box p={[0,0,0]} s={[4.4,1.85,.06]} c={GREEN}/><Sign text="MAPLE & MAIN" sub="YOUR NEIGHBORHOOD TABLE" p={[0,0,.045]} w={3.8} h={1.3}/></group>
    </group>}
    <Dining night={night}/>
    <Plant p={[-1.8,.2,3.05]} scale={.9}/><Plant p={[1.8,.2,3.05]} scale={.9}/>
    <Box p={[0,.1,3]} s={[3.1,.15,1.9]} mat={surface('stone','#c5b99f',2,1)}/>
    <group position={[-3,0,4.5]} rotation={[-.1,.1,0]}><Box p={[0,.6,0]} s={[.72,1.2,.09]} c="#a5845c"/><Box p={[0,.63,.06]} s={[.6,.96,.02]} c={GREEN}/><Sign text="OPEN" sub="COME ON IN" p={[0,.7,.08]} w={.52} h={.55}/></group>
  </group>;
}

function Lamp({p,night}:{p:V3;night:boolean}){return <group position={p}>
  <Cylinder p={[0,1.8,0]} r={.045} h={3.6} c={DARK}/><Cylinder p={[0,.15,0]} r={.14} h={.3} c={DARK}/>
  <Box p={[.28,3.63,0]} s={[.68,.08,.12]} c={DARK}/>
  <Box p={[.53,3.53,0]} s={[.36,.13,.3]} c={DARK}/>
  <mesh position={[.53,3.45,0]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[.3,.24]}/><meshStandardMaterial color="#fff0cd" emissive="#ffcc87" emissiveIntensity={night?4:.1} side={THREE.DoubleSide}/></mesh>
  {night&&<pointLight position={[.53,3.2,0]} color="#ffd1a0" intensity={24} distance={10}/>}
  </group>;}

function Pedestrian({seed,z,reverse=false}:{seed:number;z:number;reverse?:boolean}){
  const ref=useRef<THREE.Group>(null),t=useRef(seed*3.9);
  useFrame((_,dt)=>{t.current+=Math.min(dt,.05)*.7;if(ref.current)ref.current.position.x=(reverse?-1:1)*((t.current%64)-32);});
  return <group ref={ref} position={[0,.18,z]} rotation={[0,reverse?-Math.PI/2:Math.PI/2,0]}><RealCharacter3D seed={seed} isWalking gameSpeed={1}/></group>;
}
function Traffic({night}:{night:boolean}){
  const ref=useRef<THREE.Group>(null),t=useRef(0);
  useFrame((_,dt)=>{t.current+=Math.min(dt,.05)*2.3;if(ref.current)ref.current.position.x=(t.current%100)-50;});
  return <group ref={ref} position={[-50,.025,15.7]} rotation={[0,Math.PI/2,0]}><RoundedCarBody3D color="#778a7c" isNight={night} speed={4} gameSpeed={1}/></group>;
}

function House({x,z,palette}:{x:number;z:number;palette:number}){
  const parts=useResidentialHouseParts();
  const mats=useMemo(()=>parts?.map(part=>{const m=part.material.clone();m.color.multiply(houseMaterialTint(part.material,palette));return m;}),[parts,palette]);
  useEffect(()=>()=>mats?.forEach(m=>m.dispose()),[mats]);
  return <group position={[x,.2,z]} scale={[.85,.85,.85]}>
    {parts?.map((part,i)=>!part.styles||part.styles.includes((palette%3) as 0|1|2)?<mesh key={i} geometry={part.geometry} material={mats![i]} castShadow receiveShadow dispose={null}/>:null)}
  </group>;
}

function Bakery({night}:{night:boolean}){return <group position={[-18,0,-2]}>
  <Box p={[0,3.5,-2]} s={[9,7,10]} mat={surface('brick','#a98165',2,2)}/>
  <Box p={[0,7,-2]} s={[9.5,.3,10.5]} c="#cbbda4"/>
  <Box p={[0,1.8,3.04]} s={[8.3,3.5,.1]} c="#345150"/>
  {[-2.8,2.8].map(x=><group key={x}><Box p={[x,1.75,3.13]} s={[2.5,2.8,.07]} c={night?'#b8a276':'#718f92'}/><Box p={[x,2.5,3.19]} s={[2.55,.06,.1]} c={BRASS}/><Box p={[x,1.8,3.19]} s={[.06,2.8,.1]} c={BRASS}/></group>)}
  <Box p={[0,1.6,3.13]} s={[1.6,3.1,.09]} c="#415653"/>
  <Box p={[0,3.7,3.15]} s={[8.5,.64,.2]} c="#704934"/>
  <Sign text="THE DAILY LOAF" p={[0,3.7,3.28]} w={6.6} h={.55}/>
  {[-2.8,0,2.8].map(x=><group key={x}>
    <Box p={[x,5.5,3.1]} s={[1.65,2,.16]} c="#d9d0bb"/>
    <Box p={[x,5.5,3.21]} s={[1.4,1.8,.07]} c={night?'#b49a6c':'#4d696c'}/>
    <Box p={[x,5.5,3.26]} s={[.045,1.8,.06]} c="#dbd4c4"/>
    <Box p={[x,5.5,3.26]} s={[1.4,.045,.06]} c="#dbd4c4"/>
  </group>)}
  <Box p={[0,3.4,3.8]} s={[8.2,.1,1.7]} c="#a88250" rotation={[-.12,0,0]}/>
  <Plant p={[-3.7,.2,4]} scale={1.1}/><Plant p={[3.7,.2,4]} scale={1.1}/>
  </group>;}

const Block=memo(function Block({night,rain,proposed}:{night:boolean;rain:boolean;proposed:boolean}){return <group>
  <Box p={[0,-.28,0]} s={[150,.4,140]} c={proposed?'#949785':'#aeb3aa'} shadow={false}/>
  <Box p={[0,-.05,15]} s={[140,.1,9]} mat={surface('road',proposed?'#444b4a':'#7f8887',25,3,rain)} shadow={false}/>
  <Box p={[0,.04,7.2]} s={[140,.22,6.3]} mat={surface('stone',proposed?'#bfb9a8':'#bfc4bb',24,1)} shadow={false}/>
  <Box p={[0,.02,22.2]} s={[140,.22,5.6]} mat={surface('stone','#bfb9a8',24,1)} shadow={false}/>
  <Box p={[0,.16,10.38]} s={[140,.28,.25]} c="#ded7c6" shadow={false}/>
  <Box p={[0,.16,19.62]} s={[140,.28,.25]} c="#ded7c6" shadow={false}/>
  {Array.from({length:24},(_,i)=><Box key={i} p={[-68+i*6,.014,15]} s={[2.5,.016,.08]} c="#e3dcc0" shadow={false}/>)}
  {Array.from({length:8},(_,i)=><Box key={i} p={[12,.014,11+i*1.1]} s={[3,.017,.55]} c="#d7d7c9" shadow={false}/>)}
  {[-21,-13,22,30].map(x=><group key={x}><Box p={[x,.02,11.1]} s={[.08,.02,1.2]} c="#bdc1b6" shadow={false}/><Box p={[x+3,.02,12]} s={[5.8,.02,.06]} c="#bdc1b6" shadow={false}/></group>)}
  <Box p={[0,-.04,-15]} s={[100,.1,5]} mat={surface('road','#5f6460',15,2,rain)} shadow={false}/>
  {[-28,-14,1,16,31].map((x,i)=><group key={x}><House x={x} z={-26} palette={i}/><Box p={[x,.03,-21]} s={[11,.1,7]} c="#7d8967" shadow={false}/><Box p={[x,.11,-19]} s={[1.3,.13,6]} mat={surface('stone','#c6bba6',1,3)}/></group>)}
  <Bakery night={night}/>
  <Box p={[19,.07,-2]} s={[17,.17,17]} c="#85936b" shadow={false}/>
  <Box p={[19,.19,1]} s={[3,.09,10]} mat={surface('stone','#bcb39a',1,3)}/>
  {[[14,0,-6],[23,0,-4],[28,0,3],[-29,0,5],[-10,0,7.8],[26,0,8],[-35,0,-21],[9,0,-21]].map((p,i)=><group key={i}><StylizedTree3D position={p as V3} seed={i*7+1} scale={i===4?.85:1.25}/>{proposed&&<Box p={[p[0],.16,p[2]]} s={[1.7,.14,1.7]} c="#74694f" shadow={false}/>}</group>)}
  {[-25,-7,10,30].map(x=><Lamp key={x} p={[x,.18,9.5]} night={night}/>)}
  <group position={[-16,.02,11.5]} rotation={[0,Math.PI/2,0]}><RoundedCarBody3D color="#8d453a" isNight={night} speed={0} gameSpeed={0}/></group>
  <group position={[26,.02,11.5]} rotation={[0,Math.PI/2,0]}><RoundedCarBody3D color="#e0d8c6" isNight={night} speed={0} gameSpeed={0}/></group>
  <Traffic night={night}/>
  <Pedestrian seed={3} z={7.7}/><Pedestrian seed={15} z={8.5} reverse/><Pedestrian seed={23} z={7.65}/>
  {proposed&&<group>
    <group position={[19,.2,2]}><Box p={[0,.44,0]} s={[2,.13,.55]} mat={surface('wood','#96754b')}/><Box p={[0,.82,-.24]} s={[2,.48,.09]} mat={surface('wood','#96754b')}/>{[-.8,.8].map(x=><Box key={x} p={[x,.2,0]} s={[.08,.4,.48]} c={DARK}/>)}</group>
    {[-5.2,5.2].map((x,i)=><group key={x}><Table p={[x,.2,4.8]}/><Plant p={[x+(i?-1.5:1.5),.2,5.1]} scale={.65}/></group>)}
    <Cylinder p={[8.5,.6,9.1]} r={.25} h={.85} c={GREEN}/>
    <Box p={[3,.022,10.7]} s={[.8,.035,.38]} c="#303938" shadow={false}/>
    {Array.from({length:7},(_,i)=><Box key={i} p={[2.68+i*.1,.042,10.7]} s={[.03,.015,.33]} c="#697371" shadow={false}/>)}
  </group>}
  </group>;});

function Rain(){
  const ref=useRef<THREE.LineSegments>(null);
  const positions=useMemo(()=>{const a=new Float32Array(360*6);for(let i=0;i<360;i++){const x=((i*37.719)%94)-47,z=((i*29.17)%58)-20,y=(i*.237)%18;const safeZ=Math.abs(x)<24&&z<5?20+z%5:z;a.set([x,y,safeZ,x-.09,y+.45,safeZ],i*6);}return a;},[]);
  useFrame((_,dt)=>{if(!ref.current)return;const a=ref.current.geometry.attributes.position;for(let i=0;i<360;i++){const n=i*2;const y=(a.getY(n)-Math.min(dt,.05)*11+20)%20;a.setY(n,y);a.setY(n+1,y+.45);}a.needsUpdate=true;});
  return <lineSegments ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]}/></bufferGeometry><lineBasicMaterial color="#bdd1d5" transparent opacity={.42} depthWrite={false}/></lineSegments>;
}

const SHOTS:Record<View,{position:V3;target:V3}>={street:{position:[23,12,29],target:[0,1.7,-2]},walk:{position:[13,3.5,19],target:[-1,2,0]},inside:{position:[7,6.3,9.5],target:[0,1.25,-3.3]}};
function Camera({view,reset}:{view:View;reset:number}){
  const controls=useRef<any>(null);const {camera}=useThree();
  useEffect(()=>{camera.position.set(...SHOTS[view].position);controls.current?.target.set(...SHOTS[view].target);controls.current?.update();},[view,reset,camera]);
  return <OrbitControls ref={controls} makeDefault minDistance={5} maxDistance={70} maxPolarAngle={Math.PI*.47} enableDamping dampingFactor={.09} target={SHOTS[view].target}/>;
}
function Meter({onStats}:{onStats:(fps:number,draws:number)=>void}){
  const sample=useRef({time:0,frames:0});useFrame(({gl},dt)=>{sample.current.time+=dt;sample.current.frames++;if(sample.current.time>=1.5){onStats(Math.round(sample.current.frames/sample.current.time),gl.info.render.calls);sample.current={time:0,frames:0};}});return null;
}

export function PreviewScene({mood,view,proposed,reset,onEnter,onStats}:{mood:Mood;view:View;proposed:boolean;reset:number;onEnter:()=>void;onStats:(fps:number,draws:number)=>void}){
  const night=mood==='night',rain=mood==='rain',sunset=mood==='sunset',inside=view==='inside';
  const bg=night?'#182a39':rain?'#849b9f':sunset?'#e1c6a7':'#c0d3d5';
  return <Canvas shadows={{type:THREE.PCFShadowMap}} dpr={[1,1.5]} camera={{position:SHOTS.street.position,fov:44,near:.15,far:230}} gl={{antialias:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:proposed?1.05:1.08}}>
    <color attach="background" args={[bg]}/><fog attach="fog" args={[bg,65,145]}/>
    {!night&&!rain&&<Sky distance={4500} sunPosition={sunset?[-50,9,5]:[-25,38,30]} turbidity={sunset?5:2.5} rayleigh={sunset?1.7:.6}/>}
    <hemisphereLight color={night?'#a9c9ec':'#dfeefa'} groundColor={night?'#302e2b':'#a98c67'} intensity={night?.55:rain?1.4:proposed?.8:1.6}/>
    <directionalLight position={sunset?[-25,8,18]:[-20,30,25]} intensity={night?.35:rain?.7:proposed?3.2:3} color={night?'#b7d4ff':sunset?'#ffc18a':'#fff0d4'} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-36} shadow-camera-right={36} shadow-camera-top={35} shadow-camera-bottom={-35} shadow-camera-far={110} shadow-bias={-.0001} shadow-normalBias={.025}/>
    <OutdoorReflections3D isNight={night}/>
    <Block night={night} rain={rain} proposed={proposed}/>
    {proposed?<ProposedRestaurant inside={inside} night={night||sunset} onEnter={onEnter}/>:<group position={[0,.2,-3.5]} scale={.38}><RestaurantShell3D appearance={restaurantAppearance('diner',undefined,{name:'Maple & Main',design:'modern'})} isNight={night} cutaway={inside} roof={!inside}/></group>}
    {!proposed&&inside&&<Dining night={night}/>}
    {rain&&<Rain/>}
    <Camera view={view} reset={reset}/><Meter onStats={onStats}/>
  </Canvas>;
}
