import {Component,Suspense,useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas,useThree} from '@react-three/fiber';
import {Html,OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import {FreePerson} from './FreePerson';
import {PersonModel,PersonPose,PersonRole} from './rig';
import {Block,Chair,Scene,SCENES,SceneName} from './Scenes';
import './preview.css';

const ROLES:{id:PersonRole;label:string;model:PersonModel;action:string}[]=[
 {id:'waiter',label:'Waiter',model:'eric',action:'Carrying a tray'}, {id:'chef',label:'Chef',model:'eric',action:'Preparing food'},
 {id:'cleaner',label:'Cleaner',model:'claudia',action:'Cleaning the floor'}, {id:'helper',label:'Helper',model:'carla',action:'Carrying supplies'},
 {id:'customer',label:'Customer / resident',model:'carla',action:'Sitting and eating'}, {id:'receptionist',label:'Receptionist',model:'eric',action:'At the reception desk'},
 {id:'cashier',label:'Cashier',model:'claudia',action:'Serving at the counter'}, {id:'maintenance',label:'Maintenance',model:'eric',action:'Repairing a fixture'},
 {id:'gardener',label:'Gardener',model:'eric',action:'Caring for the park'},
];
function Loading(){return <Html center><div className="loading-card">Loading the three free 3D people…<br/><b>Preparing the preview</b></div></Html>;}
class PreviewError extends Component<{children:React.ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<div className="preview-error"><h2>The character preview could not load</h2><p>Please keep the local game server running and reload this page.</p><button onClick={()=>location.reload()}>Reload preview</button></div>:this.props.children;}}
function Camera({close,revision}:{close:boolean;revision:number}){
 const {camera}=useThree(),ref=useRef<React.ElementRef<typeof OrbitControls>>(null);
 useEffect(()=>{camera.position.set(...(close?[1.9,1.5,3.3]:[8.3,5.7,11.7]) as [number,number,number]);ref.current?.target.set(0,close?.85:.7,0);ref.current?.update();},[camera,close,revision]);
 return <OrbitControls ref={ref} makeDefault enableDamping minDistance={close?1.4:4} maxDistance={close?8:24} maxPolarAngle={1.5}/>;
}
function Preview(){
 const [scene,setScene]=useState<SceneName>('restaurant'),[close,setClose]=useState(false),[role,setRole]=useState<PersonRole>('waiter'),[pose,setPose]=useState<PersonPose>('work'),[model,setModel]=useState<PersonModel>('eric'),[paused,setPaused]=useState(false),[revision,setRevision]=useState(0);
 const aside=useRef<HTMLElement>(null);
 useEffect(()=>{if(aside.current)aside.current.scrollTop=0;},[close]);
 const active=ROLES.find(r=>r.id===role)!,seated=pose==='sit'||pose==='eat';
 return <div className="people-preview">
  <header><div className="brand-icon">BT</div><div><strong>PEOPLE, IN YOUR WORLD</strong><small>Bite Tycoon · free character prototype</small></div><span className="free-badge">3 FREE MODELS</span><a href="/">Back to game ↗</a></header>
  <aside ref={aside} className={close?'inspecting':''}><div className="section-label">01 / SEE THEM IN PLACE</div><nav aria-label="Property scenes">{close?<button onClick={()=>{setClose(false);setRevision(v=>v+1);}}>← Back to {SCENES[scene].title}</button>:(Object.entries(SCENES) as [SceneName,typeof SCENES[SceneName]][]).map(([key,data])=><button key={key} aria-pressed={scene===key} onClick={()=>{setScene(key);setClose(false);setRevision(v=>v+1);}}><span>{data.title}</span><span>↗</span></button>)}</nav>
   <div className="section-label">02 / INSPECT A PERSON</div><div className="role-grid">{ROLES.map(r=><button key={r.id} aria-pressed={close&&role===r.id} onClick={()=>{setRole(r.id);setModel(r.model);setPose(r.id==='customer'?'sit':'work');setClose(true);setRevision(v=>v+1);}}>{r.label}</button>)}</div>
   {close&&<div className="person-controls"><div className="section-label">03 / TRY A POSE</div><label>Free person <select aria-label="Free person" value={model} onChange={e=>setModel(e.target.value as PersonModel)}><option value="eric">Eric · waistcoat</option><option value="carla">Carla · dark jacket</option><option value="claudia">Claudia · light blouse</option></select></label><div className="poses" aria-label="Character poses">{(['idle','walk','sit','eat','work'] as PersonPose[]).map(p=><button key={p} aria-pressed={pose===p} onClick={()=>setPose(p)}>{({idle:'Stand',walk:'Walk',sit:'Sit',eat:'Eat',work:'Role action'})[p]}</button>)}</div></div>}
   <div className="source-note"><b>Actual free 3D scans</b><p>Eric, Carla & Claudia from Renderpeople. Staff accessories and motions are prototype demonstrations.</p><a href="https://renderpeople.com/free-3d-people/" target="_blank" rel="noreferrer">View free source models ↗</a></div>
  </aside>
  <main>
   <div className="scene-heading"><span>{close?'CHARACTER CLOSE-UP':'IN-GAME SCALE STUDY'}</span><h1>{close?active.label:SCENES[scene].title}</h1><p>{close?'Rotate and zoom to judge the face, clothing and movement.':SCENES[scene].caption}</p></div>
   <PreviewError><Canvas shadows dpr={[1,1.5]} camera={{position:[8.3,5.7,11.7],fov:38,near:.05,far:100}} gl={{antialias:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.1}}>
    <color attach="background" args={['#d8d9d4']}/><hemisphereLight color="#f1f2f5" groundColor="#827466" intensity={1.7}/><directionalLight position={[3,9,7]} color="#fff3df" intensity={2.5} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-normalBias={.025}/><directionalLight position={[-4,4,-1]} intensity={.7} color="#d2e2ee"/>
    <Suspense fallback={<Loading/>}>{close?<><Block p={[0,-.07,0]} s={[5,.14,4]} c="#c4bdad" surface="concrete"/><FreePerson key={model+role} model={model} role={role} pose={pose} paused={paused}/>{seated&&<Chair p={[0,0,-.04]}/>}</>:<Scene key={scene} scene={scene} paused={paused}/>}</Suspense>
    <Camera close={close} revision={revision}/>
   </Canvas></PreviewError>
   <div className="preview-controls"><button onClick={()=>setPaused(v=>!v)}>{paused?'▶ Play':'Ⅱ Pause'}</button><button onClick={()=>setRevision(v=>v+1)}>Reset view</button></div>
   <div className="scene-footer"><b>{close?(pose==='work'?active.action:`${model[0].toUpperCase()+model.slice(1)} · ${pose}`):SCENES[scene].people}</b><span>Drag to rotate · scroll to zoom</span></div>
  </main><footer>VISUAL PREVIEW ONLY <span>Separate scenes · your game and saved progress are unchanged · casual clothing with sample staff accessories</span></footer>
 </div>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);

