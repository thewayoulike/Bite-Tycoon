import {ensureCrew,available} from '../career/crew';
import type {AmenityVisit} from '../career/services';
import {LodgingWorker3D} from './LodgingWorker3D';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Html} from '@react-three/drei';
import {Business,Property} from '../prototype/expansionModel';
import type {VenueInteraction} from '../prototype/BusinessInterior';
import {VenueVisitor,createVenue,serviceBlocker,venueRules} from '../empire/venueSimulation';
import {roomLabel,roomTypes,lodgingClock,roomNeedsRepair,maxFloors,shiftActive,staffCount} from '../empire/lodging';
import {FloorPoint,LodgingLayout,createLodgingLayout} from '../empire/lodgingLayout';
import {LodgingInterior3D} from './LodgingInterior3D';
import {RealCharacter3D} from './RealCharacter3D';
import {LodgingGuest} from './LodgingGuest3D';

function Marker({point,title,note,onClick,disabled=false}:{point:FloorPoint;title:string;note:string;onClick:()=>void;disabled?:boolean}){
  return <group position={[point.x,2.1,point.z]}><Html center zIndexRange={[6,0]}><button className="venue-hotspot" disabled={disabled} onClick={event=>{event.stopPropagation();onClick();}}><strong>{title}</strong><small>{note}</small></button></Html></group>;
}

function LodgingPeople({visits=[],visitors,layouts,floor,speed,isNight,hour,onPerson}:{visits?:AmenityVisit[];visitors:VenueVisitor[];layouts:LodgingLayout[];floor:number;speed:number;isNight:boolean;hour:number;onPerson:(person:VenueVisitor)=>void}){
  // Keep a departing guest visible until their walk to the exit finishes, even
  // after the simulation has removed their booking/lease from active visitors.
  const [retained,setRetained]=useState(visitors),exited=useRef(new Set<number>());
  useEffect(()=>{setRetained(previous=>{
    const active=new Set(visitors.map(v=>v.id));
    for(const id of exited.current)if(!active.has(id))exited.current.delete(id);
    return [...visitors.filter(v=>!exited.current.has(v.id)),...previous.filter(v=>!active.has(v.id)&&!exited.current.has(v.id)).map(v=>v.state==='leaving'?v:{...v,state:'leaving' as const})];
  });},[visitors]);
  const waiting=visitors.filter(v=>v.state==='waiting');
  return <>{retained.map(person=><LodgingGuest key={person.id} person={person} visit={visits.find(v=>v.guest===person.id&&v.state!=='done')} index={Math.max(0,waiting.findIndex(v=>v.id===person.id))} layouts={layouts} floor={floor} speed={speed} isNight={isNight} hour={hour} onClick={()=>onPerson(person)} onExited={id=>{exited.current.add(id);setRetained(previous=>previous.filter(p=>p.id!==id));}}/>)}</>;
}

export function LodgingBusiness3D({p,b,floor,gameSpeed,interactive,onInteract,serviceActive,isNight}:{p:Property;b:Business;floor:number;gameSpeed:number;interactive:boolean;onInteract?:(action:VenueInteraction,id?:number)=>void;serviceActive:boolean;isNight:boolean}){
  const venue=b.venue??createVenue(p),perFloor=p.kind==='hotel'?4:3,openFloors=b.lodging?.openFloors??Math.ceil(venue.units.length/perFloor),types=venue.units.map(u=>(u.type??'')+(u.premiumFinish?':premium':'')).join(','),facilities=b.lodging?.facilities.join(',')??'',packages=venue.units.map(u=>u.occupied?'furnished':u.furnishing??'furnished').join(',');
  const layouts=useMemo(()=>Array.from({length:maxFloors(p)+2},(_,n)=>createLodgingLayout(p.kind as 'hotel'|'apartments',n,types.split(',').slice((n-1)*perFloor,n*perFloor),n===0||n===maxFloors(p)+1?facilities.split(',').filter(Boolean):[],packages.split(',').slice((n-1)*perFloor,n*perFloor))),[p.kind,types,facilities,openFloors,perFloor,packages]);
  const layout=layouts[Math.min(floor,layouts.length-1)],waiting=venue.visitors.filter(v=>v.state==='waiting');
  const people=useMemo(()=>[...venue.visitors,...venue.units.flatMap((unit,index)=>unit.occupied&&!venue.visitors.some(person=>person.unit===index&&person.state==='using')?[{id:-index-1,seed:unit.seed,state:'using' as const,unit:index,patience:0,remaining:unit.remaining}]:[])],[venue.visitors,venue.units]);
  const crew=ensureCrew(p,b),staffHere=(role:string)=>crew.filter(e=>e.role===role&&available(e,lodgingClock(b).hours)&&(e.zone<0||e.zone===floor));
  const act=(action:VenueInteraction,id?:number)=>{if(interactive)onInteract?.(action,id);};
  return <>
    <mesh position={[0,-.16,0]} receiveShadow><boxGeometry args={[18,.3,20]}/><meshStandardMaterial color="#b7a58e" roughness={.85}/></mesh>
    <LodgingInterior3D layout={layout} name={p.name} isNight={isNight}/>
    {floor===0&&shiftActive(b,'service')&&layout.staff.slice(0,staffHere('service').length).map((point,i)=><group key={`service-${i}`} position={[point.x,0,point.z]} onClick={e=>{e.stopPropagation();act('staff');}}><RealCharacter3D role="receptionist" seed={p.id.length*5+i} gameSpeed={gameSpeed} isWorking={serviceActive&&waiting.length>0}/></group>)}
    {(['care','maintenance',...(p.kind==='apartments'?['cleaner','supervisor']:[])]).flatMap(role=>shiftActive(b,role)?crew.filter(e=>e.role===role&&available(e,lodgingClock(b).hours)).slice(0,4).map((employee,i)=>{const jobs=venue.units.map((u,n)=>({u,n})).filter(({n})=>employee.zone<0||employee.zone===1+Math.floor(n/perFloor)).filter(({u,n})=>role==='care'?((u.dirty&&(p.kind!=='hotel'||!u.occupied))||(p.kind==='apartments'&&roomNeedsRepair(b,n))):role==='cleaner'?u.dirty:role==='supervisor'?b.lodging?.issues.some(i=>i.unit===n&&!i.resolved&&i.kind!=='repair'):roomNeedsRepair(b,n));return <LodgingWorker3D key={`${role}-${i}`} layouts={layouts} floor={floor} unit={jobs[i]?.n??-1} role={role==='care'||role==='cleaner'?'cleaner':role==='supervisor'?'receptionist':'maintenance'} seed={role==='care'?21+i:84+i} speed={serviceActive?gameSpeed:0} onClick={()=>act('staff')}/>;}):[])}
    {floor===0&&staffHere('manager').length>0&&<RealCharacter3D role="manager" seed={45} position={[layout.manager.x,0,layout.manager.z]} gameSpeed={gameSpeed}/>}
    {p.kind==='hotel'&&floor===0&&staffHere('concierge').length>0&&shiftActive(b,'concierge')&&<group position={[3,0,-4.7]} onClick={e=>{e.stopPropagation();act('staff');}}><RealCharacter3D role="receptionist" seed={65} gameSpeed={gameSpeed} isWorking={serviceActive}/></group>}
    {p.kind==='hotel'&&floor===maxFloors(p)+1&&b.lodging?.facilities.includes('laundry')&&staffHere('laundry').length>0&&shiftActive(b,'laundry')&&<group position={[2,0,5.8]} onClick={e=>{e.stopPropagation();act('staff');}}><RealCharacter3D role="cleaner" seed={72} gameSpeed={gameSpeed} isWorking={serviceActive}/></group>}
    <LodgingPeople visits={b.serviceDepth?.visits} visitors={people} layouts={layouts} floor={floor} speed={gameSpeed} isNight={isNight} hour={lodgingClock(b).hours} onPerson={person=>act(person.state==='waiting'?'serve':'bookings',person.state==='waiting'?person.id:undefined)}/>
    {layout.rooms.map(room=>{const unit=venue.units[room.index];if(!unit)return null;return <group key={room.index}>
      <mesh position={[room.door.x,.035,room.door.z]} rotation={[-Math.PI/2,0,0]} onClick={event=>{event.stopPropagation();act('prices',room.index);}}><planeGeometry args={p.kind==='hotel'?[.5,1.35]:[1.35,.5]}/><meshStandardMaterial color={unit.dirty?'#b99168':unit.occupied?'#7a958c':'#b9ae97'}/></mesh>
      {interactive&&<Marker point={room.center} title={`${roomLabel(p,room.index)} · ${roomTypes(p).find(t=>t.id===unit.type)?.name??''}`} note={`${unit.occupied?'Occupied':unit.dirty?'Needs cleaning':'Ready'} · $${unit.rate??unit.rent??85} · manage`} onClick={()=>act('prices',room.index)}/>}
    </group>;})}
    {interactive&&<>
      {floor===0&&<Marker point={{x:-3,z:-2.6}} title={venueRules(p)?.verb??'Reception'} note={serviceBlocker(p,b)??`${waiting.length} waiting · click to serve`} disabled={!!serviceBlocker(p,b)} onClick={()=>act('serve')}/>}
      <Marker point={floor===0?{x:7.5,z:-4.5}:layout.elevator} title={p.kind==='hotel'?'Linen & supplies':'Maintenance store'} note={`${Math.round(b.stock)}% stocked · order supplies`} onClick={()=>act('inventory')}/>
      {floor===0&&<Marker point={{x:-7,z:-6.5}} title={p.kind==='hotel'?'Reception team':'Property office'} note="Hire staff & set purchasing rules" onClick={()=>act('staff')}/>}
    </>}
  </>;
}


