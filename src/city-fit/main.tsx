import React,{Component,Suspense,createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas,useThree} from '@react-three/fiber';
import {Html,OrbitControls,useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import App from '../App';
import {GameWorld3D} from '../components/GameWorld3D';
import {PROPERTIES} from '../prototype/expansionModel';
import {OutdoorReflections3D} from '../components/OutdoorReflections3D';
import {worldTime} from '../empire/worldTime';
import '../index.css';
import './prototype.css';

type City='street'|'toronto';
type V=[number,number,number];
type Plot={id:string;position:V;labelHeight:number};
const CITY = {
 street:{name:'Street City 7',author:'dasy444',source:'https://sketchfab.com/3d-models/street-city-7-for-games-free-493a69b451284ff88346c7b3e4e1b5a7',license:'Free Standard',scale:2,center:[11.4668,0,-.0394] as V,camera:[70,52,85] as V,target:[-15,4,0] as V},
 toronto:{name:'Downtown Toronto',author:'Daniel Boxer',source:'https://sketchfab.com/3d-models/downtown-toronto-yonge-and-dundas-a867077e68b8443297d682bf4a21a1af',license:'CC BY 4.0',scale:1,center:[0,0,0] as V,camera:[80,70,100] as V,target:[0,5,0] as V}
};
// Proposed tenancies are tied to visible building locations, not real-world occupants.
const STREET_PLOTS:Plot[]=[
 {id:'diner',position:[-13.5,0,10.4],labelHeight:17},
 {id:'cafe',position:[-41.3,0,-22.2],labelHeight:19.5},
 {id:'bistro',position:[-26.2,0,-40.6],labelHeight:17},
 {id:'hotel',position:[-48.5,0,1.8],labelHeight:26},
 {id:'apartments',position:[2,0,-9.6],labelHeight:26},
 {id:'shop',position:[-13.5,0,31.5],labelHeight:17},
 {id:'park',position:[26,0,15],labelHeight:2},
];
const CityContext=createContext<{city:City;setCity:(city:City)=>void}>({city:'street',setCity:()=>{}});
type WorldProps=React.ComponentProps<typeof GameWorld3D>;

function Asset({city,onSelect}:{city:City;onSelect:(id:string)=>void}){
 const {scene}=useGLTF(`/models/game-fit/${city}.glb`);
 const config=CITY[city];
 const group=useMemo(()=>{
  const clone=scene.clone(true);
  clone.traverse(object=>{
   if(object instanceof THREE.Mesh){object.castShadow=false;object.receiveShadow=false;}
  });
  return clone;
 },[scene]);
 const plots=STREET_PLOTS;
 return <group scale={config.scale}>
  <primitive object={group} position={config.center.map(n=>-n)} dispose={null} onClick={(event:any)=>{
   event.stopPropagation();
   const nearest=plots.reduce((best,plot)=>Math.hypot(event.point.x-plot.position[0],event.point.z-plot.position[2])<Math.hypot(event.point.x-best.position[0],event.point.z-best.position[2])?plot:best);
   if(Math.hypot(event.point.x-nearest.position[0],event.point.z-nearest.position[2])<18)onSelect(nearest.id);
  }}/>
 </group>;
}

function Camera({city,streetLevel,revision}:{city:City;streetLevel:boolean;revision:number}){
 const controls=useRef<React.ElementRef<typeof OrbitControls>>(null);
 const {camera,invalidate}=useThree();
 useEffect(()=>{
  const config=CITY[city];
  const position=streetLevel?(city==='street'?[-16,4,53] as V:[30,8,40] as V):config.camera;
  const target=streetLevel?(city==='street'?[-22,6,0] as V:[0,6,0] as V):config.target;
  camera.position.set(...position);controls.current?.target.set(...target);controls.current?.update();camera.lookAt(...target);invalidate();
 },[city,streetLevel,revision,camera,invalidate]);
 return <OrbitControls ref={controls} makeDefault enableDamping minDistance={3} maxDistance={400} maxPolarAngle={Math.PI*.495} minPolarAngle={.1}/>;
}

class ModelBoundary extends Component<{children:React.ReactNode;city:City},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div className="fit-load-error"><strong>The {CITY[this.props.city].name} model could not load.</strong><p>You can still enter a business using the property buttons below.</p><button className="mc-button" onClick={()=>location.reload()}>Reload prototype</button></div>:this.props.children;}
}

function PrototypeWorld(props:WorldProps){
 const {city}=useContext(CityContext);
 const [streetLevel,setStreetLevel]=useState(false),[revision,setRevision]=useState(0),[labels,setLabels]=useState(true);
 const seeded=useRef(false);
 useEffect(()=>{if(!seeded.current){seeded.current=true;if(!props.testing)props.onTestUnlock();}},[props.testing,props.onTestUnlock]);
 const plots=STREET_PLOTS;
 const {isNight}=worldTime(props.worldProgress);
 if(props.focus)return <GameWorld3D {...props} isolatedInterior onExteriorView={props.onOverview}/>;
 return <div className="fit-map">
  {city==='toronto'?<div className="fit-online"><iframe title="Downtown Toronto by Daniel Boxer — online exterior preview" src="https://sketchfab.com/models/a867077e68b8443297d682bf4a21a1af/embed?autostart=1" allow="autoplay; fullscreen" allowFullScreen/><div>Online exterior preview · choose a business below to try its interior. Toronto's download is currently unavailable; building placement is not mapped yet.</div></div>:<ModelBoundary city={city} key={city}>
   <Canvas frameloop="demand" dpr={[1,1.35]} camera={{position:CITY[city].camera,fov:47,near:.05,far:1500}} gl={{antialias:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.1}}>
    <color attach="background" args={[isNight?'#3c4a5c':'#c4cfd5']}/>
    <hemisphereLight args={[isNight?'#a5b8d7':'#eaf1f5','#79766e',isNight?.8:2.3]}/>
    <directionalLight position={[20,55,45]} intensity={isNight?.65:2.8} color={isNight?'#b6c4dd':'#fff5e9'}/>
    <OutdoorReflections3D isNight={isNight}/>
    <Suspense fallback={<Html center><div className="fit-loading">Loading {CITY[city].name}…<small>Preparing the local model</small></div></Html>}>
     <Asset city={city} onSelect={props.onSelect}/>
     {labels&&plots.map(plot=>{
      const p=PROPERTIES.find(p=>p.id===plot.id)!;
      return <Html key={plot.id} position={[plot.position[0],plot.labelHeight,plot.position[2]]} center zIndexRange={[9,1]}><button className="fit-plot" onClick={()=>props.onSelect(plot.id)}><span className="fit-plot-dot"/><strong>{p.name}</strong><small>{p.kind==='park'?'Enter garden':'Enter & manage'} ↗</small></button></Html>;
     })}
    </Suspense>
    <Camera city={city} streetLevel={streetLevel} revision={revision}/>
   </Canvas>
  </ModelBoundary>}
  {city==='street'&&<div className="fit-map-note"><strong>{CITY[city].name} · playable layout proposal</strong><span>Choose a marked property to enter. Business locations are proposed for this prototype.</span></div>}
  <div className="fit-properties" aria-label="Enter a prototype business">{PROPERTIES.map(p=><button className="mc-button" key={p.id} onClick={()=>props.onSelect(p.id)}>{p.name}<small>{p.kind==='hotel'?'Reception + up to 5 floors':p.kind==='apartments'?'Lobby + up to 10 floors':p.kind==='park'?'Gardens & kiosk':p.kind==='shop'?'Shelves & stockroom':'Dining room & kitchen'}</small></button>)}</div>
  <div className="fit-map-controls">{city==='street'&&<><button className="mc-button" aria-pressed={streetLevel} onClick={()=>setStreetLevel(v=>!v)}>{streetLevel?'City overview':'Street-level view'}</button><button className="mc-button" onClick={()=>setRevision(n=>n+1)}>Reset view</button><label className="mc-button"><input type="checkbox" checked={labels} onChange={e=>setLabels(e.target.checked)}/>Building labels</label></>}<a href={CITY[city].source} target="_blank" rel="noreferrer">Model: {CITY[city].author} · {CITY[city].license} ↗</a></div>
 </div>;
}

function Prototype(){
 const [city,setCity]=useState<City>(location.hash==='#toronto'?'toronto':'street');
 const [guide,setGuide]=useState(true);
 return <CityContext.Provider value={{city,setCity}}><div className="fit-prototype">
  <header className="fit-header"><div><strong>CITY + INTERIORS PROTOTYPE</strong><span>Separate test save · $25,000 per business</span></div><label>City model <select aria-label="Prototype city model" value={city} onChange={e=>{setCity(e.target.value as City);history.replaceState(null,'','#'+e.target.value);}}><option value="street">Street City 7</option><option value="toronto">Downtown Toronto</option></select></label><button onClick={()=>setGuide(v=>!v)}>How to try</button><a href="/">Main game ↗</a></header>
  {guide&&<div className="fit-guide" role="status"><span><b>1</b> Select a property <b>2</b> Enter & run business <b>3</b> Use the bottom management menu. Hotels and apartments have floor buttons.</span><small>Imported exteriors + your game's working interiors. Interior layouts are proposed fit-outs; the downloaded models do not include them.</small><button aria-label="Close prototype guide" onClick={()=>setGuide(false)}>×</button></div>}
  <App prototype WorldComponent={PrototypeWorld} gameOptions={{saveKey:'bite_tycoon_city_fit_prototype_v1'}}/>
 </div></CityContext.Provider>;
}
createRoot(document.getElementById('root')!).render(<Prototype/>);
