import {useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {GameState,Table} from '../hooks/useGameLoop';
import {layoutProblem,mapPos,ROOM,storedPos,TABLE_POSITIONS} from '../restaurantLayout';
import './tableLayout.css';

export function TableLayoutEditor({state,onSave,onClose}:{state:GameState;onSave:(tables:Table[])=>void;onClose:()=>void}){
 const [tables,setTables]=useState(()=>state.tables.map(t=>({...t}))),[selected,setSelected]=useState(state.tables[0]?.id);
 const svg=useRef<SVGSVGElement>(null),dragging=useRef<string|null>(null);
 const problem=layoutProblem(tables),current=tables.find(t=>t.id===selected);
 const move=(id:string,x:number,z:number)=>setTables(list=>list.map(t=>t.id===id?{...t,x:storedPos(Math.round(x*2)/2),y:storedPos(Math.round(z*2)/2)}:t));
 const nudge=(x:number,z:number)=>{if(current)move(current.id,mapPos(current.x)+x,mapPos(current.y)+z);};
 return createPortal(<div className="table-layout-backdrop game-ui"><section className="table-layout-dialog" role="dialog" aria-modal="true" aria-labelledby="table-layout-title">
  <header><div><h2 id="table-layout-title">Arrange dining room</h2><p>Bite Tycoon management console</p></div><button aria-label="Close table layout" onClick={onClose}>×</button></header>
  <div className="table-layout-body">
   <svg ref={svg} viewBox="-20 -15 40 38" role="group" aria-label="Restaurant floor plan" className="table-floor-plan"
    onPointerMove={e=>{if(!dragging.current||!svg.current)return;const r=svg.current.getBoundingClientRect();move(dragging.current,(e.clientX-r.left)/r.width*40-20,(e.clientY-r.top)/r.height*38-15);}}
    onPointerUp={()=>{dragging.current=null;}} onPointerCancel={()=>{dragging.current=null;}}>
    <rect x={ROOM.left} y={ROOM.back} width="40" height="38" fill="#d2b891"/>
    <rect x="-20" y="-15" width="40" height="7.8" fill="#73766e"/>
    <text x="0" y="-11" textAnchor="middle" fill="white" fontSize="1.3">KITCHEN &amp; SERVICE COUNTER</text>
    <rect x="-1.8" y="-7.2" width="3.6" height="30.2" fill="#97b698" opacity=".8"/>
    <path d="M0 22V-6" stroke="#476951" strokeWidth=".12" strokeDasharray=".6 .5"/>
    <rect x="-19.8" y="-14.8" width="39.6" height="37.6" fill="none" stroke="#686052" strokeWidth=".4"/>
    <path d="M-1.8 22.8H1.8" stroke="#eff2d9" strokeWidth=".6"/>
    {tables.map((t,i)=>{const x=mapPos(t.x),z=mapPos(t.y),active=selected===t.id;return <g key={t.id} transform={`translate(${x},${z})`} role="button" tabIndex={0} aria-label={`Table ${i+1}`} aria-pressed={active}
      onPointerDown={e=>{setSelected(t.id);dragging.current=t.id;svg.current?.setPointerCapture(e.pointerId);}}
      onClick={()=>setSelected(t.id)} onKeyDown={e=>{const arrows:Record<string,[number,number]>={ArrowLeft:[-.5,0],ArrowRight:[.5,0],ArrowUp:[0,-.5],ArrowDown:[0,.5]};if(arrows[e.key]){e.preventDefault();move(t.id,x+arrows[e.key][0],z+arrows[e.key][1]);}else if(e.key==='Enter')setSelected(t.id);}}>
      <rect x="-4.4" y="-4.4" width="8.8" height="8.8" rx=".6" fill="none" stroke={active&&problem?'#b6382a':active?'#24678c':'#89795f'} strokeWidth={active?.18:.07} strokeDasharray=".4 .25"/>
      {[[-2.8,0],[2.8,0],[0,-2.8],[0,2.8]].map(([a,b],n)=><rect key={n} x={a-.55} y={b-.55} width="1.1" height="1.1" rx=".18" fill="#5e6554"/>)}
      <circle r="2.44" fill={active?'#e6f0f5':'#f8f4e9'} stroke={active?'#24678c':'#967955'} strokeWidth=".17"/>
      <text textAnchor="middle" dominantBaseline="central" fontSize="1.4" fill="#333">{i+1}</text>
     </g>;})}
   </svg>
   <aside><h3>{current?`Table ${tables.findIndex(t=>t.id===selected)+1}`:'Dining room'}</h3><p>Drag a table, or select it and use these arrows. Each outline includes room for chairs and walking space.</p>
    <div className="table-move-buttons"><button aria-label="Move table toward kitchen" onClick={()=>nudge(0,-.5)}>↑</button><button aria-label="Move table left" onClick={()=>nudge(-.5,0)}>←</button><button aria-label="Move table right" onClick={()=>nudge(.5,0)}>→</button><button aria-label="Move table toward entrance" onClick={()=>nudge(0,.5)}>↓</button></div>
    <p className="table-aisle-key">Green strip: keep the entrance and central aisle open.</p>
    <p role="status" className={problem?'table-layout-error':'table-layout-valid'}>{problem??'Clear aisles · all tables fit'}</p>
    <button className="mc-button" onClick={()=>setTables(list=>list.map((t,i)=>({...t,...TABLE_POSITIONS[i]})))}>Auto-space all tables</button>
    <p className="table-layout-note">Changes apply to this restaurant only. Arrange tables between weeks.</p>
   </aside>
  </div>
  <footer><button className="mc-button" onClick={onClose}>Cancel</button><button className="mc-button table-layout-save" disabled={!!problem||state.phase!=='planning'} onClick={()=>{onSave(tables);onClose();}}>Apply layout</button></footer>
 </section></div>,document.body);
}
