import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import App from '../App';
import {GameWorld3D} from '../components/GameWorld3D';
import {OutdoorReflections3D} from '../components/OutdoorReflections3D';
import {PROPERTIES,propertyById} from '../prototype/expansionModel';
import {worldTime} from '../empire/worldTime';
import {CozyNeighborhood,LOTS} from './CozyNeighborhood';
import '../index.css';
import './prototype.css';

type WorldProps=React.ComponentProps<typeof GameWorld3D>;
function Camera({street,revision}:{street:boolean;revision:number}){
 const controls=useRef<React.ElementRef<typeof OrbitControls>>(null),{camera}=useThree();
 useEffect(()=>{camera.position.set(...(street?[29,7,32]:[45,33,58]) as [number,number,number]);controls.current?.target.set(...(street?[-12,4,0]:[-9,1,-16]) as [number,number,number]);controls.current?.update();},[street,revision,camera]);
 return <OrbitControls ref={controls} makeDefault enableDamping minDistance={6} maxDistance={150} maxPolarAngle={1.49}/>;
}
function CozyWorld(props:WorldProps){
 const seeded=useRef(false),[street,setStreet]=useState(false),[revision,setRevision]=useState(0),[labels,setLabels]=useState(false);
 useEffect(()=>{if(!seeded.current){seeded.current=true;if(!props.testing)props.onTestUnlock();}},[props.testing,props.onTestUnlock]);
 const {isNight}=worldTime(props.worldProgress);
 if(props.focus){
  const original=propertyById(props.focus)!,lot=LOTS[props.focus];
  return <GameWorld3D {...props} isolatedInterior onExteriorView={props.onOverview} prototypeScenery={(floor,night)=><group position={[original.position[0]-lot[0],0,original.position[2]-lot[2]]}><CozyNeighborhood restaurants={props.restaurants} district={props.district} night={night} speed={props.state.gameSpeed} onSelect={props.onSelect} labels={false} inside={props.focus} floor={floor}/></group>}/>;
 }
 return <div className="cozy-world">
  <Canvas shadows={{type:THREE.PCFSoftShadowMap}} dpr={[1,1.35]} camera={{position:[64,48,79],fov:42,near:.1,far:500}} gl={{antialias:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.07}}>
   <color attach="background" args={[isNight?'#303d51':'#d9dfe2']}/><fog attach="fog" args={[isNight?'#303d51':'#d9dfe2',140,280]}/>
   <hemisphereLight color={isNight?'#97b0d9':'#e8edf3'} groundColor="#827369" intensity={isNight?.5:1.05}/>
   <directionalLight position={[-35,55,35]} intensity={isNight?.65:2.7} color={isNight?'#a4b8db':'#fff0dc'} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-75} shadow-camera-right={75} shadow-camera-top={75} shadow-camera-bottom={-75} shadow-normalBias={.035}/>
   <OutdoorReflections3D isNight={isNight}/>
   <CozyNeighborhood restaurants={props.restaurants} district={props.district} night={isNight} speed={props.state.gameSpeed} onSelect={props.onSelect} labels={labels}/>
   <Camera street={street} revision={revision}/>
  </Canvas>
  <div className="cozy-caption"><b>A neighborhood to call your own.</b><span>Homes, adjoining shops and a local park. Select a building to enter.</span></div>
  <nav className="cozy-properties" aria-label="Prototype properties"><label>Enter a property <select aria-label="Choose a property to enter" value="" onChange={e=>{if(e.target.value)props.onSelect(e.target.value);}}><option value="" disabled>Select building…</option>{PROPERTIES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><span>Or click a building in the street</span></nav>
  <div className="cozy-controls"><button className="mc-button" onClick={()=>setStreet(v=>!v)}>{street?'Neighborhood view':'Street-level view'}</button><button className="mc-button" onClick={()=>setRevision(n=>n+1)}>Reset view</button><label className="mc-button"><input type="checkbox" checked={labels} onChange={e=>setLabels(e.target.checked)}/>Labels</label></div>
 </div>;
}
function Prototype(){
 const [reference,setReference]=useState(false);
 return <div className="cozy-prototype">
  <header className="cozy-header"><div><strong>COZY NEIGHBORHOOD</strong><span>Playable prototype · separate test save · $25,000 per business</span></div><button onClick={()=>setReference(true)}>View concept image</button><a href="/">Main game ↗</a></header>
  <App prototype WorldComponent={CozyWorld} gameOptions={{saveKey:'bite_tycoon_cozy_prototype_v1'}}/>
  {reference&&<div className="cozy-reference" role="dialog" aria-modal="true" aria-label="Visual concept"><button className="mc-button" onClick={()=>setReference(false)}>Back to prototype ×</button><img src="/previews/cozy-neighborhood-concept.png" alt="Concept image showing a cozy brick neighborhood and matching cafe cutaway"/><p>Art direction reference. The playable prototype uses simplified 3D models and the existing game interiors.</p></div>}
 </div>;
}
createRoot(document.getElementById('root')!).render(<Prototype/>);
