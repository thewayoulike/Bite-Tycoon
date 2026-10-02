import {Component,Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas,useThree} from '@react-three/fiber';
import {Html,OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import {CastPerson} from './CastPerson';
import {CAST,CUSTOMERS,CHILDREN,STAFF,CastMember,sceneCastId,nextArrival} from './cast';
import {Block,Chair,Scene,SceneName,SCENES,ScenePersonContext} from './Scenes';
import type {FreePerson} from './FreePerson';
import type {PersonPose} from './rig';
import './cast.css';

type View='cast'|'person'|'scenes';
class PreviewBoundary extends Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div className="cast-error"><h2>The 3D view could not load</h2><p>Keep the local game server running, then reload this preview.</p><button onClick={()=>location.reload()}>Reload preview</button></div>:this.props.children;}
}
function Camera({view,face,revision,seated,height}:{view:View;face:boolean;revision:number;seated:boolean;height:number}){
 const {camera}=useThree(),ref=useRef<React.ElementRef<typeof OrbitControls>>(null);
 useEffect(()=>{
  const close=view==='person',head=seated?.66+height*.39:height-.13;
  camera.position.set(...(close?(face?[.28,head+.03,1.35]:[2.05,1.6,3.5]):[8.3,5.7,11.7]) as [number,number,number]);
  ref.current?.target.set(0,close?(face?head:.86):.7,0);ref.current?.update();
 },[camera,view,face,revision,seated,height]);
 return <OrbitControls ref={ref} makeDefault enableDamping minDistance={view==='person'?.7:4} maxDistance={view==='person'?7:24} maxPolarAngle={1.5}/>;
}
function App(){
 const [view,setView]=useState<View>('cast'),[filter,setFilter]=useState('all'),[member,setMember]=useState(CAST[0]),[scene,setScene]=useState<SceneName>('restaurant');
 const [pose,setPose]=useState<PersonPose>('idle'),[paused,setPaused]=useState(false),[face,setFace]=useState(false),[revision,setRevision]=useState(0),[arrival,setArrival]=useState(0);
 const [team,setTeam]=useState(0),[families,setFamilies]=useState(true),[search,setSearch]=useState(''),[outfits,setOutfits]=useState(false);
 const cast=CAST.filter(p=>(filter==='all'||p.group===filter)&&`${p.name} ${p.detail} ${p.role}`.toLowerCase().includes(search.toLowerCase().trim())),seated=pose==='sit'||pose==='eat';
 useEffect(()=>{window.scrollTo(0,0);},[view]);
 function inspect(person:CastMember){setMember(person);setView('person');setPose(person.group==='staff'?'work':'idle');setFace(false);setRevision(v=>v+1);}
 const People=useMemo(()=>function ScenePerson(props:React.ComponentProps<typeof FreePerson>){return <CastPerson {...props} id={sceneCastId(props.model,props.pose,props.role,arrival,team,families)}/>;},[arrival,team,families]);
 return <div className="cast-app">
  <header className="cast-header"><a className="cast-brand" href="/">BT<span>BITE TYCOON<small>Character studio</small></span></a><nav aria-label="Preview views"><button aria-pressed={view==='cast'} onClick={()=>setView('cast')}>Meet the cast <span>{CAST.length}</span></button><button aria-pressed={view==='scenes'} onClick={()=>{setView('scenes');setRevision(v=>v+1);}}>See them in your world ↗</button></nav><span className="cast-preview-badge">FREE ASSETS · PROTOTYPE</span><a className="cast-back" href="/">Back to game ↗</a></header>
  {view==='cast'?<main className="cast-gallery">
   <div className="cast-intro"><div><span className="cast-eyebrow">A NEIGHBORHOOD OF INDIVIDUALS</span><h1>A whole neighborhood to meet.</h1><p>{CUSTOMERS.length} adult customers, {CHILDREN.length} children and {STAFF.length} staff. Different ages, faces and heights—all in long sleeves, covered tops and full-length trousers.</p></div><div className="cast-count"><strong>{CAST.length}</strong><span>distinct people<br/>free MakeHuman assets</span></div></div>
   <div className="cast-gallery-bar"><div aria-label="Filter people">{[['all',`Everyone · ${CAST.length}`],['customers',`Adults · ${CUSTOMERS.length}`],['children',`Children · ${CHILDREN.length}`],['staff',`Staff · ${STAFF.length}`]].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div><button className="cast-outfit-toggle" aria-pressed={outfits} onClick={()=>setOutfits(v=>!v)}>{outfits?'Show faces':'Show full outfits'}</button></div>
   <div className="cast-search-row"><input type="search" aria-label="Search people" placeholder="Find a name, age or job…" value={search} onChange={e=>setSearch(e.target.value)}/><span>{cast.length} people · select a card to try walking or sitting</span></div>
   <div className="cast-grid">{cast.map((person,i)=><button className="cast-card" key={person.id} onClick={()=>inspect(person)} aria-label={`Inspect ${person.name}, ${person.role}`}>
    <div className={`cast-portrait ${outfits?'cast-full-outfit':''}`}><img src={`/models/people-preview/cast/${person.id}${outfits?'-outfit':''}.png?v=${person.assetVersion}`} alt={`${person.name}'s ${outfits?'full outfit':'3D portrait'}`} loading={i<10?'eager':'lazy'}/><span className={person.group==='staff'?'staff-label':''}>{person.group==='staff'?'TEAM':person.group==='children'?`AGE ${person.ageYears}`:'GUEST'}</span><b className="cast-inspect">View in 3D ↗</b></div>
    <div className="cast-card-caption"><strong>{person.name}</strong><small>{person.detail}</small></div>
   </button>)}</div>
   {cast.length===0&&<p className="cast-empty">No matches. Try another name or clear the search.</p>}
   <div className="cast-source"><b>Made with free, editable MakeHuman assets.</b><p>These are generated 3D people, with more facial variety than the previous three-person sample. Clothing and movements are prototype examples; they are not photorealistic scans.</p><a href="https://static.makehumancommunity.org/about/license.html" target="_blank" rel="noreferrer">CC0 source & license ↗</a><a href="/models/people-preview/cast/SOURCES.txt" target="_blank" rel="noreferrer">Asset details ↗</a></div>
  </main>:<div className="cast-workspace">
   <aside className="cast-sidebar">
    <button className="cast-return" onClick={()=>setView('cast')}>← All {CAST.length} people</button>
    {view==='person'?<>
     <span className="cast-eyebrow">{member.group==='staff'?'YOUR TEAM':member.group==='children'?'YOUNG NEIGHBOR':'NEIGHBORHOOD CUSTOMER'}</span><h1>{member.name}</h1><p>{member.detail}<br/>{member.heightMetres.toFixed(2)} m tall</p>
     <label>Choose a person<select value={member.id} onChange={e=>inspect(CAST.find(p=>p.id===e.target.value)!)}>{['customers','children','staff'].map(group=><optgroup key={group} label={group==='staff'?'Staff · separate faces':group==='children'?'Children · ages 5–15':'Adult customers'}>{CAST.filter(p=>p.group===group).map(p=><option key={p.id} value={p.id}>{p.name} · {p.group==='children'?`age ${p.ageYears}`:p.role}</option>)}</optgroup>)}</select></label>
     <span className="cast-eyebrow cast-section">TRY A MOVEMENT</span><div className="cast-pose-buttons">{(['idle','walk','sit','eat',...(member.group==='staff'?['work']:[])] as PersonPose[]).map(p=><button key={p} aria-pressed={pose===p} onClick={()=>{setPose(p);setFace(false);}}>{({idle:'Stand',walk:'Walk',sit:'Sit',eat:'Eat',work:'On the job'})[p]}</button>)}</div>
     <button className="cast-primary" aria-pressed={face} onClick={()=>setFace(v=>!v)}>{face?'Show full body':'Look at the face'}</button>
     <p className="cast-note">Rotate with a drag. Scroll to zoom. Choose “See them in your world” for moving visitors, seated diners and working staff.</p>
    </>:<>
     <span className="cast-eyebrow">SAMPLE PROPERTY SCENES</span><h1>In your world</h1><p>Human scale, clear aisles and different faces on each visit.</p>
     <nav aria-label="Property scenes">{(Object.entries(SCENES) as [SceneName,typeof SCENES[SceneName]][]).map(([id,data])=><button key={id} aria-pressed={scene===id} onClick={()=>{setScene(id);setRevision(v=>v+1);}}>{data.title}<span>↗</span></button>)}</nav>
     <label className="cast-family-control"><input type="checkbox" checked={families} onChange={e=>setFamilies(e.target.checked)}/>Include child visitors</label>
     <button className="cast-primary" onClick={()=>setArrival(nextArrival)}>Next customer arrivals ↻</button><button className="cast-team-change" onClick={()=>setTeam(v=>v+1)}>Change staff team ↻</button><p className="cast-note" aria-live="polite">Arrival batch {arrival+1} · staff team {team+1}. Customer arrivals keep your selected staff team. Try Outside for neighborhood walkers.</p>
    </>}
    <a className="cast-old-link" href="/character-preview.html">Compare the earlier 3-person sample ↗</a>
   </aside>
   <main className="cast-stage"><div className="cast-stage-title"><span className="cast-eyebrow">{view==='person'?'LIVE 3D CHARACTER':'CHARACTERS IN CONTEXT'}</span><h2>{view==='person'?(face?'A closer look':`${member.name} · ${pose==='work'?member.role:({idle:'standing',walk:'walking',sit:'seated',eat:'eating'})[pose]}`):SCENES[scene].title}</h2><p>{view==='person'?'Real mesh, textures and a moving skeleton.':SCENES[scene].caption}</p></div>
    <PreviewBoundary><Canvas shadows dpr={[1,1.5]} camera={{position:[2,1.6,3.5],fov:38,near:.05,far:100}} gl={{antialias:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1}}>
     <color attach="background" args={['#dbd9d3']}/><hemisphereLight color="#f1f2f5" groundColor="#827466" intensity={1.6}/><directionalLight position={[3,9,7]} color="#fff3df" intensity={2.4} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-normalBias={.025}/><directionalLight position={[-4,4,-1]} intensity={.7} color="#d2e2ee"/>
     <Suspense fallback={<Html center><div className="cast-loading">Preparing the 3D people…</div></Html>}>{view==='person'?<><Block p={[0,-.07,0]} s={[5,.14,4]} c="#c4bdad" surface="concrete"/><CastPerson key={member.id} id={member.id} role={member.role} pose={pose} paused={paused}/>{seated&&<Chair p={[0,0,-.04]}/>}</>:<ScenePersonContext.Provider value={People}><Scene key={scene+arrival} scene={scene} paused={paused}/></ScenePersonContext.Provider>}</Suspense>
     <Camera view={view} face={face} revision={revision} seated={view==='person'&&seated} height={member.heightMetres}/>
    </Canvas></PreviewBoundary>
    <div className="cast-scene-controls"><button onClick={()=>setPaused(v=>!v)}>{paused?'▶ Play':'Ⅱ Pause'}</button><button onClick={()=>setRevision(v=>v+1)}>Reset view</button><span>Drag to rotate · scroll to zoom</span></div>
   </main>
  </div>}
  <footer className="cast-footer"><b>VISUAL PROTOTYPE</b><span>{CAST.length} distinct people · fully covered outfits · sample interiors & motions · not applied to the game</span></footer>
 </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
