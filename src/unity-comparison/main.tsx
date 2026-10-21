import {StrictMode,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from '../App';
import {newGame} from '../empire/newGame';
import {parseEmpireSave} from '../empire/empire';
import {decideSave} from '../empire/sessionGuard';
import {UnityGameWorld} from '../unity/UnityGameWorld';
import {configureUnityRuntime} from '../unity/runtime';
import {comparisonSaveKey,copyComparisonSave,replaceComparisonSave,upgradeSandboxSave} from './saves';
import {mainGameUrl} from './routes';
import '../index.css';
import './style.css';

configureUnityRuntime({baseUrl:'/unity-comparison',name:'UnityComparison',product:'Business Simulator'});
const query=new URLSearchParams(location.search),mode=query.get('mode'),play=!query.has('saves');
const legacy=location.pathname!=='/'&&location.pathname!=='/index.html';
if(legacy)location.replace(mainGameUrl(location.href));
const preview=['1','fast-track'].includes(query.get('preview')??'');
type Pack={id:number;name:string;image:string;url:string;use:string;status:string};
type Status={stage:string;message:string;packs:Pack[];additional?:string[]};
const modes=[{id:'fast-track',name:'Career'},{id:'sandbox',name:'Sandbox'},{id:'career',name:'Older career slot'}];

function Dashboard(){
 const[status,setStatus]=useState<Status>(),[error,setError]=useState('');
 useEffect(()=>{fetch('/unity-comparison/status.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Build status is unavailable.');return r.json();}).then(setStatus).catch(e=>setError(e.message));},[]);
 const ready=status?.packs.filter(p=>p.status==='integrated'||p.status==='texture-only').length??0;
 return <main className="comparison-page">
  <header><a href="/?mode=fast-track">← Back to game</a><span>BUSINESS SIMULATOR</span><a href="/unity-free-assets.html">Asset gallery ↗</a></header>
  <section className="comparison-hero"><p className="comparison-kicker">YOUR CITY. YOUR BUSINESSES.</p><h1>Your game.<br/><em>Your progress.</em></h1>
   <p className="comparison-intro">Career and Sandbox share the same city, buildings and business systems. Career earns its growth; Sandbox gives you operating businesses and testing funds.</p>
   <div className="comparison-actions"><a className="comparison-primary" href="/?mode=fast-track">Play Career →</a><a href="/?mode=sandbox">Play Sandbox →</a></div>
   <div className="comparison-status"><span>ASSETS FROM {ready} / 9 PACKS · EASYROADS TEXTURE ONLY</span><p>{status?.message??'Checking asset integration status…'}</p><a href="/coffee-shop-preview.html">Explore the full Coffee Shop Environment →</a></div>
  </section>
  {error&&<p role="alert">{error}</p>}
  {status?.stage==='ready'&&<section className="comparison-screens">
   <div className="comparison-section-title"><div><p className="comparison-kicker">YOUR CITY</p><h2>See the imported models in place.</h2></div><p>The city used by both Career and Sandbox, including the four-plot shopping mall.</p></div>
   <div>{[['mall','Willow Galleria · four-plot shopping mall'],['city','CITY package · varied commercial scenery'],['city-close','CITY package · neighbourhood houses'],['upper-floor','Correct floor height and room selection'],['petrol','Eastgate city petrol station · scenery'],['night-signs','Colourful neon shop signs at night'],['seating','Corrected seating and realistic cup sizes'],['traffic','More daytime road traffic and shopping-street pedestrians'],['restaurant','Restaurant furniture and kitchen displays'],['homes','Neighbourhood homes and trees'],['boats','Rowboats and motorboats at the harbour']].map(([file,label])=><figure key={file}><a href={'/unity-comparison/screenshots/'+file+'.png'} target="_blank" rel="noreferrer"><img src={'/unity-comparison/screenshots/'+file+'.png'} alt={label}/></a><figcaption>{label}</figcaption></figure>)}</div>
  </section>}
  <section className="comparison-slots"><div><p className="comparison-kicker">YOUR SAVED GAMES</p><h2>Career and Sandbox.</h2><p>Each mode keeps its own progress. Your previous comparison save continues here; older progress is imported only if this mode has no save yet.</p></div>
   <div>{modes.map(m=>{
    const key=comparisonSaveKey(m.id);
    let saved,hasBackup=false;try{saved=decideSave(localStorage.getItem(key),localStorage.getItem(key+'-play'),parseEmpireSave).value;hasBackup=!!localStorage.getItem(key+'-reset-backup');}catch{/* The play page explains storage failures. */}
    return <article key={m.id}><div><h3>{m.name}</h3><p>{saved?`Week ${saved.district.week} · ${Object.keys(saved.district.businesses).length} businesses`:'Ready to start · earlier progress is imported if available'}</p></div><a href={'/?mode='+m.id}>{saved?'Continue':'Open'} →</a>{saved&&<button onClick={()=>{const link=document.createElement('a');const url=URL.createObjectURL(new Blob([JSON.stringify(saved)],{type:'application/json'}));link.href=url;link.download='Business-Simulator-'+m.id+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Export save</button>}<button onClick={()=>{if(!confirm('Restart '+m.name+'? Your current progress will be kept as a backup.'))return;try{replaceComparisonSave(localStorage,m.id,JSON.stringify(newGame(m.id)));location.assign('/?mode='+m.id);}catch(e){setError(String(e));}}}>Restart {m.name}</button>{hasBackup&&<button onClick={()=>{try{const backup=JSON.parse(localStorage.getItem(key+'-reset-backup')!);const old=decideSave(backup.primary,backup.play,parseEmpireSave).value;if(!old)throw new Error('No valid previous save is available.');replaceComparisonSave(localStorage,m.id,JSON.stringify(old));location.assign('/?mode='+m.id);}catch(e){setError(String(e));}}}>Restore previous</button>}</article>;
   })}</div>
  </section>
  <section><div className="comparison-section-title"><div><p className="comparison-kicker">THE NINE SELECTED PACKS</p><h2>What goes into this edition.</h2></div><p>Publisher previews below show the selected resources. They are publisher previews rather than game screenshots.</p></div>
   <div className="comparison-packs">{status?.packs.map(p=><article key={p.id}><a href={p.url} target="_blank" rel="noreferrer"><img src={p.image} alt={p.name+' — publisher preview'} loading="lazy"/></a><div><span className={'pack-status '+p.status}>{p.status==='integrated'?'In the game':p.status==='texture-only'?'Surface texture only':p.status==='available'?'Imported · not active':p.status==='downloaded'?'Downloaded · preparing':'Awaiting download'}</span><h3>{p.name}</h3><p>{p.use}</p><a href={p.url} target="_blank" rel="noreferrer">View free asset ↗</a></div></article>)}</div>
  </section>
  {status?.additional?.length&&<section className="comparison-status"><span>ADDITIONAL PACKS</span><p>{status.additional.join(' · ')}</p></section>}
  <footer>One game, two play modes. Career and Sandbox share the same Unity city and keep separate saves. Asset previews above belong to their publishers.</footer>
 </main>;
}

let problem='',saveMessage=preview?'Preview · progress is not saved':mode==='sandbox'?'Sandbox · testing city':'Career';
if(play&&!preview&&!legacy){
 try{
  const result=copyComparisonSave(localStorage,mode);
  if(result==='copied')saveMessage+=' · progress imported';
  if(mode==='sandbox'&&result!=='busy'&&result!=='invalid'){
   const upgrade=upgradeSandboxSave(localStorage);
   if(upgrade==='invalid')problem='Your Sandbox save could not be read. It has been preserved.';
   if(upgrade==='busy')problem='Sandbox is updating its save. Please wait and reload.';
  }
  if(result==='busy')problem='Your current game is updating its save. Please wait for it to finish and reload.';
  if(result==='invalid')problem='Your current save could not be read. It has been preserved; no replacement game was created.';
 }catch{problem='Saving is unavailable or browser storage is full. Allow local storage or free some space, then reload.';}
}
if(!legacy)createRoot(document.getElementById('root')!).render(<StrictMode>{!play?<Dashboard/>:problem?<main className="comparison-page"><h1>Your save needs attention.</h1><p role="alert">{problem}</p><button onClick={()=>location.reload()}>Try again</button><a href="/?saves=1">Saved games</a></main>:<>
 <App prototype={preview} WorldComponent={UnityGameWorld} gameOptions={{saveKey:comparisonSaveKey(mode),startingEmpire:newGame(mode),persist:!preview}} startScreen={{
  sandboxHref:'/?mode=sandbox',
  savedGamesHref:'/?saves=1',
  newCareerMessage:'Restart Career? Its previous progress will be kept as a backup. Your Sandbox will stay unchanged.',
  onNewCareer:()=>{try{replaceComparisonSave(localStorage,'fast-track',JSON.stringify(newGame('fast-track')));location.assign('/?mode=fast-track');}catch(e){alert(e instanceof Error?e.message:'Could not save the new career.');}},
 }}/>
 <a className="comparison-game-badge" href="/?saves=1">{saveMessage} · Saved games ↗</a>
 </>}</StrictMode>);
