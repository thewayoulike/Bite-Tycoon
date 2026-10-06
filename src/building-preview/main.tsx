import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas} from '@react-three/fiber';
import {ArrowUpRight,Check,Download,Layers,RotateCcw,Sun,Moon,Building2,DoorOpen,MousePointer2} from 'lucide-react';
import * as THREE from 'three';
import {readPreviewSelection} from './catalog';
import {BuildingScene} from './BuildingScene';
import './style.css';
const initial=readPreviewSelection(location.search);
function Preview(){
  const {design,floors}=initial;
  const [floor,setFloor]=useState(initial.floor),[inside,setInside]=useState(initial.inside),[night,setNight]=useState(initial.night),[reset,setReset]=useState(0);
  useEffect(()=>{history.replaceState(null,'',`${location.pathname}?${new URLSearchParams({building:'house',view:inside?'inside':'outside',floor:String(floor),time:night?'night':'day'})}`);},[inside,floor,night]);
  return <main>
    <header className="topbar"><a className="brand" href="/"><Building2 size={23}/><span>BITE TYCOON<small>Residential houses</small></span></a><p>The approved house design, now in your neighborhood.</p><a className="back-game" href="/">Open game <ArrowUpRight size={16}/></a></header>
    <div className="workspace">
      <aside className="sidebar"><div className="sidebar-heading"><span className="eyebrow">RESIDENTIAL HOMES</span><h1>Welcome to<br/>Cedar Street.</h1><p>Clapboard walls, a sheltered porch and a proper pitched roof.</p></div>
        <div className="building-option" style={{background:'#e1e7dd'}}><span className="model-swatch" style={{background:design.color}}><Building2 size={23}/></span><span><small>Approved residential design</small><b>{design.name}</b></span><Check size={16}/></div>
        <div className="feature-notes" style={{border:0,padding:'0 9px'}}><span className="eyebrow">IN YOUR NEIGHBORHOOD</span><ul><li><Check size={14}/>Two homes per block</li><li><Check size={14}/>Porches, gardens and paths</li><li><Check size={14}/>Night lighting and snowy roofs</li></ul></div>
        <div className="preview-note"><span className="status-dot"/><div><b>Residential scenery updated</b><p>The house exterior is used in the game. Furnished cutaways here are a visual preview; these scenery homes do not add a new management business.</p></div></div>
      </aside>
      <section className="main-panel" aria-label="Residential house preview">
        <div className="title-row"><div><span className="eyebrow">Original Blender design</span><h2>{design.name}</h2></div><span className="eyebrow">G + 1 upper floor</span></div>
        <div className="scene-toolbar"><div className="view-tabs"><button aria-pressed={!inside} onClick={()=>setInside(false)}><Building2 size={16}/>Exterior</button><button aria-pressed={inside} onClick={()=>setInside(true)}><DoorOpen size={16}/>Inside</button></div><div className="scene-actions"><button aria-pressed={night} onClick={()=>setNight(v=>!v)}>{night?<Moon size={16}/>:<Sun size={16}/>}<span>{night?'Night':'Daylight'}</span></button><button onClick={()=>setReset(v=>v+1)}><RotateCcw size={16}/><span>Reset view</span></button></div></div>
        <div className={`scene ${night?'night':''}`}>
          <Canvas shadows={{type:THREE.PCFShadowMap}} dpr={[1,1.5]} camera={{fov:42,near:.1,far:350}} gl={{antialias:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1}}><BuildingScene {...{design,floors,inside,floor,night,reset}}/></Canvas>
          <div className="scene-label"><span className="status-dot"/><span>Approved residential house<b>{inside?`Floor ${floor===0?'G':'1'} · furnished cutaway`:'Exterior · game-scale context'}</b></span></div>
          {inside&&<div className="floor-rail" aria-label="Select interior floor">{[0,1].map(i=><button key={i} aria-label={`Show floor ${i===0?'G':'1'}`} aria-pressed={floor===i} onClick={()=>setFloor(i)}>{i===0?'G':'1'}</button>)}</div>}
          <div className="scene-hint"><MousePointer2 size={14}/>Drag to orbit · scroll to zoom · right-drag to pan</div>
        </div>
        <div className="floor-controls"><span><Layers size={17}/><b>{inside?`Viewing ${floor===0?'ground floor':'floor 1'}`:'Two-storey residential home'}</b></span><small>Same original house model used in the game</small><a className="download" title="Ground, upper floor and roof modules" download="Cedar House modular kit.glb" href="/models/building-prototype/house.glb"><Download size={15}/>Modular GLB kit</a></div>
        <section className="design-notes"><div><span className="eyebrow">THE DESIGN</span><p>{design.description}</p></div><div className="feature-notes"><span className="eyebrow">{inside&&floor>0?'UPPER FLOOR':'GROUND FLOOR'}</span><ul>{(inside&&floor>0?design.upper:design.ground).map(item=><li key={item}><Check size={14}/>{item}</li>)}</ul></div></section>
        <footer><span>Original geometry and surface textures · editable Blender source</span><span>Fitted to the game’s existing residential plots</span></footer>
      </section>
    </div>
  </main>;
}
const root=createRoot(document.getElementById('root')!);root.render(<Preview/>);
(import.meta as any).hot?.dispose(()=>root.unmount());
