import React,{Component,useCallback,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowLeft,ArrowUpRight,CloudRain,Eye,House,Info,Map,Maximize2,Moon,RotateCcw,Sun,Sunset,UtensilsCrossed,X} from 'lucide-react';
import {PreviewScene,type Mood,type View} from './Scene';
import './style.css';

class SceneBoundary extends Component<{children:React.ReactNode},{error:boolean}>{
  state={error:false};static getDerivedStateFromError(){return {error:true};}
  render(){return this.state.error?<div className="scene-error"><h2>The 3D preview could not start.</h2><p>Try reloading this page with hardware acceleration enabled.</p><button onClick={()=>location.reload()}>Reload preview</button></div>:this.props.children;}
}
const moods:{id:Mood;name:string;icon:typeof Sun;time:string;temp:string}[]=[{id:'day',name:'Daylight',icon:Sun,time:'14:30',temp:'22°'},{id:'sunset',name:'Golden hour',icon:Sunset,time:'18:15',temp:'19°'},{id:'night',name:'Night',icon:Moon,time:'21:00',temp:'15°'},{id:'rain',name:'Rain',icon:CloudRain,time:'16:45',temp:'14°'}];
const views:{id:View;name:string;icon:typeof Map}[]=[{id:'street',name:'Neighborhood',icon:Map},{id:'walk',name:'Street level',icon:House},{id:'inside',name:'Restaurant interior',icon:UtensilsCrossed}];
function App(){
  const q=new URLSearchParams(location.search);
  const [mood,setMood]=useState<Mood>(moods.some(m=>m.id===q.get('mood'))?q.get('mood') as Mood:'day');
  const [view,setView]=useState<View>(views.some(v=>v.id===q.get('view'))?q.get('view') as View:'street');
  const [proposed,setProposed]=useState(q.get('version')!=='current');
  const [reset,setReset]=useState(0),[notes,setNotes]=useState(false),[clean,setClean]=useState(false);
  const [stats,setStats]=useState({fps:0,draws:0});
  const onStats=useCallback((fps:number,draws:number)=>setStats({fps,draws}),[]);
  const update=(key:string,value:string)=>{const url=new URL(location.href);url.searchParams.set(key,value);history.replaceState(null,'',url);};
  const chooseView=(next:View)=>{setView(next);update('view',next);};
  const chosen=moods.find(m=>m.id===mood)!;
  return <main className={`study ${clean?'clean':''}`}>
    <div className="world" aria-label="Interactive neighborhood graphics prototype"><SceneBoundary><PreviewScene {...{mood,view,proposed,reset,onStats}} onEnter={()=>chooseView('inside')}/></SceneBoundary></div>
    <header className="topbar">
      <a className="back" href="/?mode=fast-track" title="Return to your game"><ArrowLeft size={18}/><span>Game</span></a>
      <div className="brand"><span className="monogram">B.</span><div><strong>BITE TYCOON</strong><small>A warmer neighborhood</small></div></div>
      <span className="preview-badge"><i/> VISUAL PROTOTYPE</span>
      <div className="compare" role="group" aria-label="Compare restaurant appearance"><button aria-pressed={!proposed} onClick={()=>{setProposed(false);update('version','current');}}>Current model</button><button aria-pressed={proposed} onClick={()=>{setProposed(true);update('version','proposed');}}>Proposed look</button></div>
      <button className="icon-button" aria-label="Design notes" aria-expanded={notes} onClick={()=>setNotes(!notes)}><Info size={20}/></button>
    </header>
    <div className="location-label"><span>01 / MAPLE DISTRICT</span><div><i/>{view==='inside'?'Inside Maple & Main':'A neighborhood worth building'}</div></div>
    <aside className="place-card">
      <div className="eyebrow">{proposed?'THE PROPOSED DIRECTION':'COMPARISON VIEW'}</div>
      <h1>{view==='inside'?'Come on in.':'Maple & Main'}</h1>
      <p>{proposed?(view==='inside'?'Warm timber, soft pendant lighting and room to enjoy a meal.':'A local kitchen, leafy sidewalks and homes just around the corner.'):'The current game’s restaurant shell, shown on this same demonstration block.'}</p>
      <div className="features"><span>{view==='inside'?'6 dining tables':'Natural materials'}</span><span>{view==='inside'?'Clear central aisle':'Shared game characters'}</span></div>
      <button className="enter" onClick={()=>chooseView(view==='inside'?'street':'inside')}>{view==='inside'?'Step back outside':'Enter the restaurant'}<ArrowUpRight size={18}/></button>
      <small>Appearance study · your save is untouched</small>
    </aside>
    <div className="weather-chip"><chosen.icon size={19}/><strong>{chosen.temp}</strong><span>{chosen.name}<small>{chosen.time} · sample scene</small></span></div>
    <div className="view-tools"><button aria-label="Reset camera" title="Reset camera" onClick={()=>setReset(n=>n+1)}><RotateCcw size={19}/></button><button aria-label={clean?'Show interface':'Hide interface'} title={clean?'Show interface':'Hide interface'} onClick={()=>setClean(!clean)}><Eye size={19}/></button></div>
    <footer className="dock">
      <div className="view-switch" role="group" aria-label="Camera views">{views.map(v=><button key={v.id} aria-pressed={view===v.id} onClick={()=>chooseView(v.id)}><v.icon size={17}/><span>{v.name}</span></button>)}</div>
      <span className="dock-divider"/>
      <div className="mood-switch" role="group" aria-label="Time and weather">{moods.map(m=><button key={m.id} title={m.name} aria-label={m.name} aria-pressed={mood===m.id} onClick={()=>{setMood(m.id);update('mood',m.id);}}><m.icon size={18}/><span>{m.name}</span></button>)}</div>
    </footer>
    <div className="bottom-hints"><span>Drag to orbit · Right-drag to move · Scroll to zoom</span><span>{stats.fps?`${stats.fps} FPS · demo block`:'Loading scene…'}</span></div>
    {clean&&<div className="clean-badge">BITE TYCOON · PROPOSED LOOK</div>}
    {notes&&<aside className="notes" aria-label="Design notes panel"><button className="close" aria-label="Close design notes" onClick={()=>setNotes(false)}><X size={20}/></button><span className="eyebrow">ART DIRECTION / 01</span><h2>More life.<br/>More character.</h2><p>This is an interactive 3D study of one block, using the game’s existing people, house, tree and vehicle resources.</p><ol><li><strong>Materials with depth</strong><p>Warm brick, limestone trim, timber furniture and brass details.</p></li><li><strong>Inviting light</strong><p>Four lighting and weather moods. Lamps and the restaurant glow after dark.</p></li><li><strong>Human scale</strong><p>Full-size doors, seated diners, a walkable sidewalk and outdoor tables.</p></li><li><strong>More room for the scene</strong><p>Compact controls and a clean-view button. The game’s management systems are unchanged.</p></li></ol><div className="note-foot">“Current model” reuses the game’s existing restaurant exterior. The surrounding block is this prototype in both views; the interior furnishings are proposed in both. Performance shown is for this small study, not the whole city.</div><div className="render-stats">{stats.fps} FPS <span>·</span> {stats.draws} draw calls</div></aside>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
