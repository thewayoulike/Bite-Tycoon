import {useEffect,useRef,useState,type ComponentProps} from 'react';
import {GameWorld3D} from '../components/GameWorld3D';
import {attachUnity} from './runtime';
import {unityFrame,validUnityEvent,type UnityView} from './bridge';
import type {VenueInteraction} from '../prototype/BusinessInterior';
import './unity.css';
import type {FrameStats} from '../career/FrameMeter';
import {Building2,KeyRound} from 'lucide-react';
type Props=ComponentProps<typeof GameWorld3D>;
function UnitySurface({game,view,onOverview}:{game:Props;view:UnityView;onOverview:()=>void}){
 const host=useRef<HTMLDivElement>(null),latest=useRef({game,view,onOverview});latest.current={game,view,onOverview};
 const[progress,setProgress]=useState(0),[error,setError]=useState<string>();
 const[markers,setMarkers]=useState<{id:string;x:number;y:number;compact?:boolean}[]>([]);
 useEffect(()=>{
  if(!host.current)return;
  let cancelled=false,timer:ReturnType<typeof setInterval>|undefined;
  const runtime=attachUnity(host.current,(n,e)=>{setProgress(n);setError(e);});
  const sendEvent=(event:Event)=>{
   let message:unknown;try{message=JSON.parse((event as CustomEvent<string>).detail);}catch{return;}
   if(message&&typeof message==='object'&&'type' in message&&message.type==='performance')return;
   const {game,view}=latest.current;const allowed=new Set(unityFrame(game,view).properties.map(p=>p.id));
   if(message&&typeof message==='object'&&'type' in message&&message.type==='markers'&&'items' in message&&Array.isArray(message.items)){setMarkers(message.items.filter(item=>allowed.has(item.id)&&Number.isFinite(item.x)&&Number.isFinite(item.y)&&item.x>=0&&item.x<=1&&item.y>=0&&item.y<=1).slice(0,Math.min(1000,allowed.size)));return;}
   const restaurant=game.focus?game.restaurants[game.focus]:undefined;
   if(!validUnityEvent(message,allowed,new Set(restaurant?.tables.map(t=>t.id))))return;
   if(message.type==='overview')latest.current.onOverview();
   else if(message.type==='select')game.onSelect(message.id);
   else if(message.type==='table'){
    const table=restaurant?.tables.find(t=>t.id===message.id);if(!table)return;
    const customer=restaurant?.customers.find(c=>c.id===table.customerId);
    if(table.isDirty)game.actions.cleanTable(table.id);
    else if(customer?.state==='waiting_order')game.actions.takeOrder(customer.id);
    else {const ready=restaurant?.orders.filter(o=>o.tableId===table.id&&o.state==='ready')??[];if(ready.length)ready.forEach(o=>game.actions.serveFood(o.id));else game.actions.prioritizeTable(table.id);}
   }else game.onInteract(message.action as VenueInteraction,message.id);
  };
  window.addEventListener('business-unity-event',sendEvent);
  runtime.ready.then(unity=>{if(cancelled)return;const update=()=>{const{game,view}=latest.current;unity.SendMessage('BusinessGameBridge','ApplyFrame',JSON.stringify(unityFrame(game,view)));};update();timer=setInterval(update,100);}).catch(reason=>{if(!cancelled)setError(reason instanceof Error?reason.message:String(reason));});
  return()=>{cancelled=true;if(timer)clearInterval(timer);window.removeEventListener('business-unity-event',sendEvent);runtime.detach();};
 },[]);
 const properties=unityFrame(game,view).properties;
 const managed=properties.filter(p=>p.owned&&p.offer!=='internal');
 return <><div className="unity-surface" ref={host}/>
  {!game.focus&&progress===1&&<>
   {managed.length>0&&<div className="unity-ownership-key" aria-label="Your buildings on the map">
    <span className="owned"><Building2 size={15} aria-hidden="true"/>Owned {managed.filter(p=>p.tenure!=='leased').length}</span>
    <span className="leased"><KeyRound size={15} aria-hidden="true"/>Rented {managed.filter(p=>p.tenure==='leased').length}</span>
   </div>}
   {markers.map(marker=>{
    const p=properties.find(p=>p.id===marker.id);if(!p||p.offer==='public'||p.offer==='internal')return null;
    const tenure=p.owned?(p.tenure==='leased'?'leased':'owned'):'';
    const label=p.owned?(tenure==='leased'?'Rented by you':'Owned by you'):p.kind==='land'?'Land for sale':p.offer==='lease'?'Empty shop for lease':'Business for sale';
    const compact=!!tenure&&marker.compact;
    return <button key={p.id} className={`unity-property-marker ${tenure?`unity-player-property ${tenure}`:''} ${compact?'compact':''}`} style={{left:`${marker.x*100}%`,top:`${marker.y*100}%`}} aria-label={`${p.name} · ${label}`} title={`${p.name} · ${label}`} onClick={()=>game.onSelect(p.id)}>
     {tenure&&<span className="unity-tenure-icon" aria-hidden="true">{tenure==='leased'?<KeyRound size={18}/>:<Building2 size={18}/>}</span>}
     <span className="unity-marker-caption"><strong>{p.name}</strong><small>{label}</small></span>
    </button>;
   })}
  </>}
  {(progress<1||error)&&<div className="unity-loading" role="status"><strong>{error?'Your city needs attention':'Loading your city'}</strong><p>{error??'Preparing the 3D world. Your businesses and progress stay connected.'}</p>{!error&&<><progress value={progress} max={1}/><span>{Math.round(progress*100)}%</span></>}<a href="/?saves=1">Saved games</a></div>}</>;
}
export function UnityGameWorld(props:Props){
 const[metrics,setMetrics]=useState<FrameStats|null>(null);
 useEffect(()=>{const receive=(event:Event)=>{try{const value=JSON.parse((event as CustomEvent<string>).detail);if(value.type==='performance'&&Number.isFinite(value.fps)&&Number.isFinite(value.p95)&&value.samples>0)setMetrics({...value,draws:0,triangles:0});}catch{}};window.addEventListener('business-unity-event',receive);return()=>window.removeEventListener('business-unity-event',receive);},[]);
 return <GameWorld3D {...props} externalFrameStats={metrics} renderSurface={(view,onOverview)=><UnitySurface game={props} view={view} onOverview={onOverview}/>}/>;
}
