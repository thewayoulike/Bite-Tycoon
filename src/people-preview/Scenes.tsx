import {createContext,useContext,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {FreePerson as OriginalPerson} from './FreePerson';
import {PersonModel,PersonRole} from './rig';
import {BistroChair3D} from '../components/BistroFurniture3D';
import {FoodPlate3D} from '../components/FoodPlate3D';
import {IndoorPlant3D} from '../components/RestaurantDecor3D';
import {StylizedTree3D} from '../components/StreetAssets3D';
import {getSurfaceMaterial} from '../graphics/surfaceMaterials';

export const ScenePersonContext=createContext<React.ComponentType<React.ComponentProps<typeof OriginalPerson>>|null>(null);
function FreePerson(props:React.ComponentProps<typeof OriginalPerson>){const Override=useContext(ScenePersonContext);return Override?<Override {...props}/>:<OriginalPerson {...props}/>;}

export type SceneName='restaurant'|'cafe'|'hotel'|'apartments'|'shop'|'park'|'street';
export const SCENES:Record<SceneName,{title:string;caption:string;people:string}>={
 restaurant:{title:'Restaurant',caption:'A waiter brings food through the aisle while guests eat and the kitchen stays busy.',people:'Waiter · chef · cleaner · seated customers'},
 cafe:{title:'Café & bistro',caption:'Counter service, table service and a relaxed sit-down visit.',people:'Server · barista/helper · seated customers'},
 hotel:{title:'Hotel',caption:'Reception and lounge in front; a guest room and housekeeping trolley behind.',people:'Receptionist · arriving guest · housekeeper'},
 apartments:{title:'Apartments',caption:'A lived-in home with its own kitchen, lounge and a visiting maintenance worker.',people:'Resident · maintenance · delivery helper'},
 shop:{title:'Shop',caption:'Customers browse the clear aisle while a cashier serves and a helper replenishes stock.',people:'Cashier · stock helper · shopper'},
 park:{title:'Park',caption:'A quiet bench, a gardener and people walking along a separate paved path.',people:'Gardener · seated visitor · walkers'},
 street:{title:'Outside',caption:'The same people and human scale outside the neighborhood’s local shops.',people:'Walking neighbors · seated visitor'},
};
type V3=[number,number,number];
export function Block({p,s,c='#d7cdbd',surface}:{p:V3;s:V3;c?:string;surface?:'wood'|'brick'|'concrete'|'asphalt'|'grass'|'plaster'}){
 const material=useMemo(()=>surface?getSurfaceMaterial(surface,c,s[0],s[2]):null,[surface,c,s[0],s[2]]);
 return <mesh position={p} castShadow receiveShadow><boxGeometry args={s}/>{material?<primitive attach="material" object={material}/>:<meshStandardMaterial color={c} roughness={.7}/>}</mesh>;
}
function Plant({p}:{p:V3}){return <group position={p} scale={.38}><IndoorPlant3D position={[0,0,0]}/></group>;}
export function Chair({p,rotation=0}:{p:V3;rotation?:number}){return <BistroChair3D position={p} rotation={[0,rotation,0]} cushionColor="#667a73"/>;}
function Table({p=[0,0,0] as V3,food=true}){return <group position={p}><mesh position={[0,.78,0]} castShadow receiveShadow><cylinderGeometry args={[.66,.66,.065,32]}/><meshStandardMaterial color="#ae8055" roughness={.5}/></mesh><mesh position={[0,.39,0]} castShadow><cylinderGeometry args={[.06,.09,.75,12]}/><meshStandardMaterial color="#363c3c" metalness={.6}/></mesh><Block p={[0,.03,0]} s={[.65,.06,.5]} c="#363c3c"/>{food&&<group position={[0,.83,-.22]}><FoodPlate3D recipeId="burger_classic" scale={.48}/></group>}<mesh position={[.26,.89,.07]}><cylinderGeometry args={[.045,.04,.17,14]}/><meshStandardMaterial color="#eedec5"/></mesh></group>;}
function Seat({p,model='carla',paused,eat=false,rotation=0}:{p:V3;model?:PersonModel;paused:boolean;eat?:boolean;rotation?:number}){return <group position={p} rotation={[0,rotation,0]}><Chair p={[0,0,-.04]}/><FreePerson model={model} pose={eat?'eat':'sit'} paused={paused}/></group>;}
function Counter({p=[0,0,-1.5] as V3,w=2.7}){return <group position={p}><Block p={[0,.47,0]} s={[w,.94,.62]} c="#94704d" surface="wood"/><Block p={[0,.96,0]} s={[w+.08,.06,.72]} c="#e0dbd0"/><Block p={[.65,1.15,0]} s={[.37,.3,.045]} c="#354346"/><Block p={[.65,1.015,-.12]} s={[.4,.025,.19]} c="#4b5654"/></group>;}
function Sofa({p=[0,0,0] as V3}){return <group position={p}><Block p={[0,.25,0]} s={[2.25,.5,.83]} c="#a7aaa0"/><Block p={[0,.8,-.35]} s={[2.25,.8,.17]} c="#b5b5a8"/>{[-1.08,1.08].map(x=><Block key={x} p={[x,.58,0]} s={[.17,.5,.84]} c="#b5b5a8"/>)}{[-.55,.55].map(x=><Block key={x} p={[x,.54,.04]} s={[.96,.15,.65]} c="#babeb2"/>)}</group>;}
function Bed({p=[0,0,0] as V3}){return <group position={p}><Block p={[0,.23,0]} s={[1.55,.46,2.1]} c="#8b6850"/><Block p={[0,.54,0]} s={[1.51,.2,2.04]} c="#f4eee3"/><Block p={[0,.67,.4]} s={[1.54,.065,1.3]} c="#6f8182"/><Block p={[0,1,-1.05]} s={[1.65,1.2,.13]} c="#968675"/><Block p={[-.36,.7,-.7]} s={[.56,.13,.38]} c="#fff9ec"/><Block p={[.36,.7,-.7]} s={[.56,.13,.38]} c="#fff9ec"/></group>;}
function Room({scene}:{scene:SceneName}){const cafe=scene==='cafe';return <>
 <Block p={[0,-.11,0]} s={[10.8,.22,7.6]} c="#c8ad85" surface="wood"/>
 <Block p={[0,1.5,-3.85]} s={[10.9,3,.15]} c={cafe?'#d8d6c9':'#e2ddd1'} surface="plaster"/>
 <Block p={[-5.45,1.5,0]} s={[.15,3,7.6]} c="#d8d5cc" surface="plaster"/>
 <Block p={[0,.31,-3.7]} s={[10.8,.62,.1]} c={cafe?'#798575':'#756a5c'}/>
 {[-3.8,0,3.8].map(x=><group key={x} position={[x,1.9,-3.72]}><Block p={[0,0,0]} s={[1.8,1.45,.07]} c="#918575"/><Block p={[0,0,.05]} s={[1.65,1.3,.03]} c="#a8bdc2"/><Block p={[0,0,.08]} s={[.04,1.35,.03]} c="#e7ded0"/></group>)}
 <Plant p={[-4.6,0,2.7]}/><Plant p={[4.7,0,-3]}/>
 </>;}

// Authored loops deliberately keep people out of tables, counters, beds and shelving.
export function Walker({points,model='eric',role='customer',paused=false,phase=0}:{points:V3[];model?:PersonModel;role?:PersonRole;paused?:boolean;phase?:number}){
 const ref=useRef<THREE.Group>(null),distance=useRef(phase);
 const route=useMemo(()=>{const segments=points.map((p,i)=>{const a=new THREE.Vector3(...p),b=new THREE.Vector3(...points[(i+1)%points.length]);return {a,b,length:a.distanceTo(b)};});return {segments,total:segments.reduce((a,s)=>a+s.length,0)};},[points]);
 useFrame((_,dt)=>{if(!ref.current)return;if(!paused)distance.current+=Math.min(dt,.05)*.72;let d=distance.current%route.total;for(const segment of route.segments){if(d<=segment.length){ref.current.position.lerpVectors(segment.a,segment.b,d/segment.length);ref.current.rotation.y=Math.atan2(segment.b.x-segment.a.x,segment.b.z-segment.a.z);break;}d-=segment.length;}});
 return <group ref={ref}><FreePerson model={model} role={role} pose="walk" paused={paused} phase={phase}/></group>;
}
function Shelves({p}:{p:V3}){return <group position={p}><Block p={[0,1,0]} s={[1.5,2,.16]} c="#b0a08b"/>{[.25,.8,1.35,1.9].map((y,i)=><group key={y}><Block p={[0,y,.25]} s={[1.55,.065,.6]} c="#d5c9b3"/>{Array.from({length:6},(_,n)=><Block key={n} p={[-.61+n*.24,y+.18,.24]} s={[.17,.28,.24]} c={['#9c684a','#bfa467','#7b8b78','#c5b596'][(n+i)%4]}/>)}</group>)}</group>;}
export function Scene({scene,paused}:{scene:SceneName;paused:boolean}){
 const outside=scene==='park'||scene==='street';
 return <>
 {outside?<><Block p={[0,-.13,0]} s={[13,.25,9]} c="#858e70" surface="grass"/><Block p={[0,-.025,1.8]} s={[13,.06,2.4]} c="#bcbab1" surface="concrete"/>{[-5,5].map(x=><StylizedTree3D key={x} position={[x,0,-1.6]} seed={x+7} scale={.65} gameSpeed={paused?0:1}/>)}</>:<Room scene={scene}/>}
 {(scene==='restaurant'||scene==='cafe')&&<>
  <Counter p={[-2.7,0,-1.3]} w={3.3}/><FreePerson role={scene==='restaurant'?'chef':'helper'} pose="work" position={[-2.9,0,-2]} paused={paused}/>
  <Table p={[-1.9,0,1.5]}/><Seat p={[-1.9,0,.65]} paused={paused} eat/><Seat p={[-1.9,0,2.35]} rotation={Math.PI} model="claudia" paused={paused} eat/>
  <Table p={[2.8,0,-1]} food={false}/><Seat p={[2.8,0,-1.85]} model="eric" paused={paused}/>
  <Walker points={[[.15,0,-2.7],[.15,0,2.9],[1.15,0,2.9],[1.15,0,-2.7]]} role="waiter" paused={paused} phase={2}/>
  <FreePerson role="cleaner" model="claudia" pose="work" position={[3.8,0,1.6]} paused={paused}/>
 </>}
 {scene==='hotel'&&<>
  <Counter p={[-2.9,0,-.3]} w={3}/><FreePerson role="receptionist" pose="work" position={[-3,0,-1]} paused={paused}/>
  <Sofa p={[-3.2,0,2]}/><FreePerson model="claudia" pose="sit" position={[-3.5,0,2.08]} paused={paused}/>
  <Block p={[1,1.1,-2]} s={[.15,2.2,3.3]} c="#dbd6c9"/><Bed p={[3.2,0,-2]}/><Block p={[4.45,.39,-2.4]} s={[.56,.78,.6]} c="#b09977"/>
  <Walker points={[[.15,0,2.7],[-.8,0,2.7],[-.8,0,.7],[.15,0,.7]]} model="carla" paused={paused}/>
  <FreePerson role="cleaner" model="claudia" pose="work" position={[2.8,0,1.2]} paused={paused}/>
  <Block p={[4,.45,1.3]} s={[.66,.85,.52]} c="#7a8c91"/>{[.65,.76,.87].map(y=><Block key={y} p={[4,y,1.3]} s={[.55,.07,.46]} c="#e8e3d7"/>)}
 </>}
 {scene==='apartments'&&<>
  <Sofa p={[-2.5,0,.5]}/><FreePerson model="carla" pose="sit" position={[-2.7,0,.62]} paused={paused}/><Block p={[-2.5,.27,1.6]} s={[1.4,.1,.6]} c="#947254"/>
  <Counter p={[-2.8,0,-3.2]} w={3.8}/><Block p={[-4.65,1.1,-3.2]} s={[.65,2.2,.72]} c="#d1d4ce"/>
  <Block p={[1.5,1.1,-2.5]} s={[.12,2.2,2.7]} c="#ded8c9"/><Bed p={[3.4,0,-2.4]}/>
  <Block p={[4.8,1.15,.1]} s={[.2,.65,.48]} c="#abb3af"/><FreePerson model="eric" role="maintenance" pose="work" position={[4.25,0,.1]} rotation={Math.PI/2} paused={paused}/>
  <FreePerson role="helper" model="claudia" pose="work" position={[.5,0,2.2]} paused={paused}/>
 </>}
 {scene==='shop'&&<>
  {[-3.8,-1.9,0,1.9].map(x=><Shelves key={x} p={[x,0,-3.25]}/>)}<Shelves p={[3.9,0,-.7]}/>
  <Counter p={[-2.8,0,1.4]} w={3.1}/><FreePerson role="cashier" model="carla" pose="work" position={[-2.8,0,.7]} paused={paused}/>
  <FreePerson role="helper" pose="work" position={[2.9,0,1.3]} paused={paused}/>
  <Walker points={[[.5,0,-2],[2,0,-2],[2,0,2.8],[.5,0,2.8]]} model="claudia" paused={paused}/>
 </>}
 {outside&&<>
  <Walker points={[[-5.4,0,1.35],[5.4,0,1.35],[5.4,0,2.4],[-5.4,0,2.4]]} model="carla" paused={paused} phase={2}/>
  <Walker points={[[-5.4,0,1.35],[5.4,0,1.35],[5.4,0,2.4],[-5.4,0,2.4]]} model="eric" paused={paused} phase={8}/>
  <Walker points={[[-5.4,0,1.35],[5.4,0,1.35],[5.4,0,2.4],[-5.4,0,2.4]]} model="claudia" paused={paused} phase={16}/>
  <Block p={[-2.4,.48,-.65]} s={[2.3,.12,.6]} c="#9d7953"/><Block p={[-2.4,.9,-.98]} s={[2.3,.7,.09]} c="#9d7953"/>{[-3.3,-1.5].map(x=><Block key={x} p={[x,.22,-.65]} s={[.08,.45,.6]} c="#3d4744"/>)}<FreePerson model="carla" pose="sit" position={[-2.65,0,-.63]} paused={paused}/>
  {scene==='park'?<><FreePerson role="gardener" pose="work" position={[2.5,0,-.6]} paused={paused}/><Block p={[2.5,.18,-2]} s={[3,.36,1]} c="#957b59"/>{[1.5,2,2.5,3,3.5].map(x=><Plant key={x} p={[x,.35,-2]}/>)}</>:<>
   <Block p={[0,2,-3.7]} s={[13,4,.3]} c="#ad7860" surface="brick"/>{[-3.4,1].map(x=><group key={x}><Block p={[x,1.55,-3.48]} s={[3.4,2.6,.15]} c="#576664"/><Block p={[x,1.55,-3.35]} s={[3.15,2.35,.05]} c="#8ca5ac"/><Block p={[x,2.95,-3.2]} s={[3.6,.25,.7]} c={x<0?'#5c725f':'#8b5847'}/><Block p={[x,1.6,-3.28]} s={[.06,2.4,.05]} c="#bfb6a5"/></group>)}<Block p={[0,-.01,3.8]} s={[13,.05,1.6]} c="#565c5e" surface="asphalt"/>
  </>}
 </>}
 </>;
}
