import {useEffect,useMemo,useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import {Business,Property} from '../prototype/expansionModel';
import type {VenueInteraction} from '../prototype/BusinessInterior';
import {VenueVisitor,createVenue,serviceBlocker,venueRules} from '../empire/venueSimulation';
import {roomLabel,shiftActive,staffCount} from '../empire/lodging';
import {FloorPoint,FloorWalker,LodgingLayout,createLodgingLayout,lodgingWalkingPath,advanceFloorWalker,walkablePoint} from '../empire/lodgingLayout';
import {LodgingInterior3D} from './LodgingInterior3D';
import {RealCharacter3D} from './RealCharacter3D';

function Marker({point,title,note,onClick,disabled=false}:{point:FloorPoint;title:string;note:string;onClick:()=>void;disabled?:boolean}){
  return <group position={[point.x,2.1,point.z]}><Html center zIndexRange={[6,0]}><button className="venue-hotspot" disabled={disabled} onClick={event=>{event.stopPropagation();onClick();}}><strong>{title}</strong><small>{note}</small></button></Html></group>;
}

type Journey='queue'|'toLift'|'toRoom'|'room'|'fromRoom'|'exit';
function LodgingGuest({person,index,layouts,floor,speed,onClick,onExited}:{person:VenueVisitor;index:number;layouts:LodgingLayout[];floor:number;speed:number;onClick:()=>void;onExited:(id:number)=>void}){
  const homeFloor=person.unit===null?1:1+Math.floor(person.unit/(layouts[0].kind==='hotel'?4:3));
  const room=layouts[homeFloor]?.rooms.find(room=>room.index===person.unit);
  const initialFloor=person.state==='using'?homeFloor:0;
  const group=useRef<THREE.Group>(null),currentFloor=useRef(initialFloor),journey=useRef<Journey>(person.state==='using'?'room':person.state==='leaving'?'exit':'queue');
  const walker=useRef<FloorWalker>({position:person.state==='using'&&room?{...room.destination}:person.state==='leaving'?{...layouts[0].elevator}:{...layouts[0].entrance},path:[],next:0,heading:0});
  const [walking,setWalking]=useState(false),wasWalking=useRef(false),completed=useRef(false),lastLayout=useRef(layouts);
  const route=(destination:FloorPoint)=>{walker.current.path=lodgingWalkingPath(layouts[currentFloor.current],walker.current.position,destination);walker.current.next=0;};
  useEffect(()=>{
    // A renovation may move furniture while paused. Place the character at that
    // room's clear entrance, rather than animating out of a newly occupied object.
    if(lastLayout.current!==layouts&&!walkablePoint(layouts[currentFloor.current],walker.current.position)){
      walker.current.position={...(currentFloor.current===0?layouts[0].entrance:room?.destination??layouts[currentFloor.current].elevator)};
    }
    lastLayout.current=layouts;
    if(person.state==='waiting'){journey.current='queue';route(layouts[0].queue[Math.min(index,layouts[0].queue.length-1)]);}
    else if(person.state==='using'){
      if(currentFloor.current!==homeFloor){journey.current='toLift';route(layouts[currentFloor.current].elevator);}
      else if(room){journey.current='toRoom';route(room.destination);}
    }else if(currentFloor.current>0){journey.current='fromRoom';route(layouts[currentFloor.current].elevator);}
    else{journey.current='exit';route(layouts[0].entrance);}
  },[person.state,person.unit,index,layouts]);
  useFrame((_,delta)=>{
    const moved=advanceFloorWalker(walker.current,Math.min(delta,.06)*speed*2.25);
    const arrived=walker.current.path.length>0&&walker.current.next>=walker.current.path.length;
    if(arrived){
      if(journey.current==='toLift'&&room){currentFloor.current=homeFloor;walker.current.position={...layouts[homeFloor].elevator};journey.current='toRoom';route(room.destination);}
      else if(journey.current==='fromRoom'){currentFloor.current=0;walker.current.position={...layouts[0].elevator};journey.current='exit';route(layouts[0].entrance);}
      else if(journey.current==='toRoom')journey.current='room';
      else if(journey.current==='exit'&&!completed.current){completed.current=true;onExited(person.id);}
    }
    if(wasWalking.current!==moved){wasWalking.current=moved;setWalking(moved);}
    if(group.current){group.current.visible=currentFloor.current===floor;group.current.position.set(walker.current.position.x,0,walker.current.position.z);group.current.rotation.y=walker.current.heading;}
  });
  return <group ref={group} visible={initialFloor===floor} position={[walker.current.position.x,0,walker.current.position.z]} onClick={event=>{event.stopPropagation();onClick();}}><RealCharacter3D role="customer" seed={person.seed} gameSpeed={speed} isWaitingFood={person.state==='waiting'} isWalking={walking}/></group>;
}

function LodgingPeople({visitors,layouts,floor,speed,onPerson}:{visitors:VenueVisitor[];layouts:LodgingLayout[];floor:number;speed:number;onPerson:(person:VenueVisitor)=>void}){
  // Keep a departing guest visible until their walk to the exit finishes, even
  // after the simulation has removed their booking/lease from active visitors.
  const [retained,setRetained]=useState(visitors),exited=useRef(new Set<number>());
  useEffect(()=>{setRetained(previous=>{
    const active=new Set(visitors.map(v=>v.id));
    for(const id of exited.current)if(!active.has(id))exited.current.delete(id);
    return [...visitors.filter(v=>!exited.current.has(v.id)),...previous.filter(v=>!active.has(v.id)&&!exited.current.has(v.id)).map(v=>v.state==='leaving'?v:{...v,state:'leaving' as const})];
  });},[visitors]);
  const waiting=visitors.filter(v=>v.state==='waiting');
  return <>{retained.map(person=><LodgingGuest key={person.id} person={person} index={Math.max(0,waiting.findIndex(v=>v.id===person.id))} layouts={layouts} floor={floor} speed={speed} onClick={()=>onPerson(person)} onExited={id=>{exited.current.add(id);setRetained(previous=>previous.filter(p=>p.id!==id));}}/>)}</>;
}

export function LodgingBusiness3D({p,b,floor,gameSpeed,interactive,onInteract,serviceActive,isNight}:{p:Property;b:Business;floor:number;gameSpeed:number;interactive:boolean;onInteract?:(action:VenueInteraction,id?:number)=>void;serviceActive:boolean;isNight:boolean}){
  const venue=b.venue??createVenue(p),perFloor=p.kind==='hotel'?4:3,openFloors=b.lodging?.openFloors??Math.ceil(venue.units.length/perFloor),types=venue.units.map(u=>u.type??'').join(','),facilities=b.lodging?.facilities.join(',')??'';
  const layouts=useMemo(()=>Array.from({length:openFloors+2},(_,n)=>createLodgingLayout(p.kind as 'hotel'|'apartments',n,types.split(',').slice((n-1)*perFloor,n*perFloor),n===openFloors+1?facilities.split(',').filter(Boolean):[])),[p.kind,types,facilities,openFloors,perFloor]);
  const layout=layouts[Math.min(floor,layouts.length-1)],waiting=venue.visitors.filter(v=>v.state==='waiting');
  const people=useMemo(()=>[...venue.visitors,...venue.units.flatMap((unit,index)=>unit.occupied&&!venue.visitors.some(person=>person.unit===index&&person.state==='using')?[{id:-index-1,seed:unit.seed,state:'using' as const,unit:index,patience:0,remaining:unit.remaining}]:[])],[venue.visitors,venue.units]);
  const act=(action:VenueInteraction,id?:number)=>{if(interactive)onInteract?.(action,id);};
  return <>
    <mesh position={[0,-.16,0]} receiveShadow><boxGeometry args={[18,.3,20]}/><meshStandardMaterial color="#b7a58e" roughness={.85}/></mesh>
    <LodgingInterior3D layout={layout} name={p.name} isNight={isNight}/>
    {floor===0&&shiftActive(b,'service')&&layout.staff.slice(0,staffCount(p,b,'service')).map((point,i)=><group key={`service-${i}`} position={[point.x,0,point.z]} onClick={e=>{e.stopPropagation();act('staff');}}><RealCharacter3D role="waiter" seed={p.id.length*5+i} gameSpeed={gameSpeed} isWorking={serviceActive&&waiting.length>0}/></group>)}
    {floor>0&&shiftActive(b,'care')&&layout.care.slice(0,staffCount(p,b,'care')).map((point,i)=><group key={`care-${i}`} position={[point.x,0,point.z]} onClick={e=>{e.stopPropagation();act('staff');}}><RealCharacter3D role="cleaner" seed={21+i} gameSpeed={gameSpeed} isWorking={serviceActive}/></group>)}
    {floor>0&&shiftActive(b,'maintenance')&&staffCount(p,b,'maintenance')>0&&<group position={[layout.manager.x,0,layout.manager.z]} onClick={e=>{e.stopPropagation();act('staff');}}><RealCharacter3D role="cleaner" seed={84} gameSpeed={gameSpeed} isWorking={serviceActive}/></group>}
    {floor===0&&b.manager&&<RealCharacter3D role="customer" seed={45} position={[layout.manager.x,0,layout.manager.z]} gameSpeed={gameSpeed}/>}
    <LodgingPeople visitors={people} layouts={layouts} floor={floor} speed={gameSpeed} onPerson={person=>act(person.state==='waiting'?'serve':'bookings',person.state==='waiting'?person.id:undefined)}/>
    {layout.rooms.map(room=>{const unit=venue.units[room.index];if(!unit)return null;return <group key={room.index}>
      <mesh position={[room.door.x,.035,room.door.z]} rotation={[-Math.PI/2,0,0]} onClick={event=>{event.stopPropagation();act('prices',room.index);}}><planeGeometry args={p.kind==='hotel'?[.5,1.35]:[1.35,.5]}/><meshStandardMaterial color={unit.dirty?'#b99168':unit.occupied?'#7a958c':'#b9ae97'}/></mesh>
      {interactive&&<Marker point={room.center} title={roomLabel(p,room.index)} note={`${unit.occupied?'Occupied':unit.dirty?'Needs cleaning':'Ready'} · $${unit.rate??unit.rent??85} · manage`} onClick={()=>act('prices',room.index)}/>}
    </group>;})}
    {interactive&&<>
      {floor===0&&<Marker point={{x:-3,z:-2.6}} title={venueRules(p)?.verb??'Reception'} note={serviceBlocker(p,b)??`${waiting.length} waiting · click to serve`} disabled={!!serviceBlocker(p,b)} onClick={()=>act('serve')}/>}
      <Marker point={floor===0?{x:7.5,z:-4.5}:layout.elevator} title={p.kind==='hotel'?'Linen & supplies':'Maintenance store'} note={`${Math.round(b.stock)}% stocked · order supplies`} onClick={()=>act('inventory')}/>
      {floor===0&&<Marker point={{x:-7,z:-6.5}} title={p.kind==='hotel'?'Reception team':'Property office'} note="Hire staff & set purchasing rules" onClick={()=>act('staff')}/>}
    </>}
  </>;
}
