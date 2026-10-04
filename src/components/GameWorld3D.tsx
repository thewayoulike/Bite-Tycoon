import {FrameMeter,type FrameStats} from '../career/FrameMeter';
import {weatherForDay} from '../empire/weather';
import {Weather3D,WeatherMotionContext} from './Weather3D';
import {WeatherPanel} from './WeatherPanel';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import type {GameState} from '../hooks/useGameLoop';
import {DistrictScenery} from '../prototype/ExpansionMap';
import {BusinessContents3D,VenueInteraction} from '../prototype/BusinessInterior';
import {ExpansionState,propertyById} from '../prototype/expansionModel';
import {RestaurantContents3D,RestaurantOrders} from './Scene3D';
import {OutdoorReflections3D} from './OutdoorReflections3D';
import {CharacterQualityContext} from './RealCharacter3D';
import '../empire/world.css';
import {TableLayoutEditor} from './TableLayoutEditor';
import {NaturalSky3D} from './NaturalSky3D';
import {worldTime} from '../empire/worldTime';
import {maxFloors,roomsPerFloor} from '../empire/lodging';
import {UrbanBuilding3D} from './UrbanBuilding3D';
import {propertyInteriorPlacement} from '../graphics/propertyArchitecture';
import {PLAZA_FLOORS,MALL_FLOORS,MALL_FLOOR_HEIGHT} from '../empire/plaza';
import {PlazaBuilding3D} from './ShoppingPlaza3D';

type Detail='room'|'street'|'person'|'exterior';
type CityArea='town'|'residential'|'commercial'|'civic';
function WorldCamera({focus,revision,detail,floor,area}:{focus:string|null;revision:number;detail:Detail;floor:number;area:CityArea}){
  const controls=useRef<React.ElementRef<typeof OrbitControls>>(null),moving=useRef(true);
  const {camera,scene}=useThree();
  const destination=useMemo(()=>new THREE.Vector3(),[]),target=useMemo(()=>new THREE.Vector3(),[]);
  const person=useRef<THREE.Object3D|null>(null),lastPerson=useMemo(()=>new THREE.Vector3(),[]),current=useMemo(()=>new THREE.Vector3(),[]);
  useEffect(()=>{
    const p=focus?propertyById(focus):null;
    target.set(...(p?p.position:[0,1,0] as [number,number,number]));target.y=p?1+floor*(p.kind==='plaza'?MALL_FLOOR_HEIGHT*.75:2.7):4;if(p&&['restaurant','cafe'].includes(p.kind))target.z+=1.52;
    person.current=detail==='person'?scene.getObjectByName('active-business-interior')?.getObjectByName('diner-person')??null:null;
    if(person.current){person.current.getWorldPosition(target);target.y+=.45;destination.copy(target).add(new THREE.Vector3(1.7,1.1,2.4));person.current.getWorldPosition(lastPerson);}
    else if(p){if(p.kind==='plaza'){if(detail==='exterior'||detail==='street')target.y=8;destination.copy(target).add(new THREE.Vector3(...(detail==='exterior'||detail==='street'?[24,12,34]:[9,18,24]) as [number,number,number]));}else destination.copy(target).add(new THREE.Vector3(...(p.kind==='park'?[15,19,22]:detail==='street'||detail==='exterior'?[15,8,22]:['restaurant','cafe'].includes(p.kind)?[.5,12.5,19.5]:[7,12,17]) as [number,number,number]));}
    else if(detail==='street'){target.set(7,2.3,0);destination.set(13.5,2.2,36);}
    else if(area==='residential'){target.set(-48,2,-5);destination.set(-17,31,48);}
    else if(area==='commercial'){target.set(49,2,2);destination.set(92,29,47);}
    else if(area==='civic'){target.set(20,2,-48);destination.set(68,48,-5);}
    else {target.set(0,2,0);destination.set(82,64,116);}
    moving.current=true;
  },[focus,revision,detail,floor,area,camera,scene,target,destination,lastPerson]);
  useFrame((_,delta)=>{
    if(!controls.current)return;
    if(moving.current){const alpha=1-Math.exp(-delta*5);camera.position.lerp(destination,alpha);controls.current.target.lerp(target,alpha);controls.current.update();if(camera.position.distanceTo(destination)<.03)moving.current=false;}
    else if(person.current){person.current.getWorldPosition(current);const dx=current.x-lastPerson.x,dy=current.y-lastPerson.y,dz=current.z-lastPerson.z;camera.position.add(new THREE.Vector3(dx,dy,dz));controls.current.target.add(new THREE.Vector3(dx,dy,dz));lastPerson.copy(current);controls.current.update();}
    // The developed town has finite bounds; panning never exposes the empty base plane.
    const tx=Math.max(-65,Math.min(65,controls.current.target.x)),tz=Math.max(-65,Math.min(65,controls.current.target.z));
    camera.position.x+=tx-controls.current.target.x;camera.position.z+=tz-controls.current.target.z;
    controls.current.target.x=tx;controls.current.target.z=tz;
  });
  return <OrbitControls ref={controls} makeDefault onStart={()=>{moving.current=false;}} enableDamping dampingFactor={.08} minDistance={1.4} maxDistance={190} minPolarAngle={.18} maxPolarAngle={detail==='street'?1.7:1.45}/>;
}

export function GameWorld3D({state,worldProgress,restaurants,district,actions,focus,selected,onSelect,onOverview,onTestUnlock,onReport,onInteract,testing,isolatedInterior=false,onExteriorView,prototypeScenery,viewRequest}:{state:GameState;worldProgress:number;restaurants:Record<string,GameState>;district:ExpansionState;actions:any;focus:string|null;selected:string|null;onSelect:(id:string)=>void;onOverview:()=>void;onTestUnlock:()=>void;onReport:()=>void;onInteract:(action:VenueInteraction,id?:number)=>void;testing:boolean;isolatedInterior?:boolean;onExteriorView?:()=>void;prototypeScenery?:(floor:number,isNight:boolean)=>React.ReactNode;viewRequest?:{request:number;floor:number;detail:'room'|'exterior'}}){
  const[revision,setRevision]=useState(0),[fast,setFast]=useState(false),[cutaway,setCutaway]=useState(true),[detail,setDetail]=useState<Detail>('room');
  const [floor,setFloor]=useState(0),[arranging,setArranging]=useState(false);
  const [area,setArea]=useState<CityArea>('town');
  const p=focus?propertyById(focus):undefined,restaurant=focus?restaurants[focus]:undefined;
  const {isNight,daylight,hours}=worldTime(worldProgress);
  const weather=weatherForDay(district.week,district.day,district.weatherSeed);
  const animationSpeed=Object.values(restaurants).some(r=>r.phase!=='planning')?state.gameSpeed:0;
  const motion=useMemo(()=>({wind:weather.wind,speed:animationSpeed}),[weather.wind,animationSpeed]);

  const [meter,setMeter]=useState(false),[frameStats,setFrameStats]=useState<FrameStats|null>(null);
  const exterior=!!p&&(detail==='exterior'||detail==='street'),placement=p?propertyInteriorPlacement(p,exterior?0:floor):undefined;
  const skyColor=useMemo(()=>new THREE.Color('#263248').lerp(new THREE.Color('#e1e5e5').lerp(new THREE.Color('#aebdc9'),weather.cloud*.55),isNight?0:Math.min(1,daylight*2.8)),[daylight,isNight,weather.cloud]);
  useEffect(()=>{setDetail('room');setFloor(0);setArranging(false);},[focus]);
  useEffect(()=>{if(viewRequest){setDetail(viewRequest.detail);setFloor(viewRequest.floor);setRevision(n=>n+1);}},[focus,viewRequest?.request]);
  return <div className="game-world" aria-label="Interactive game world">
    {restaurant&&!exterior&&<RestaurantOrders state={restaurant} actions={actions}/>}
    {p?.kind==='plaza'&&!exterior&&<div className="venue-floor-switcher mall-floor-switcher" role="group" aria-label="Mall floors"><strong>Willow Galleria · directory</strong>{Array.from({length:PLAZA_FLOORS},(_,n)=>{const open=n<(district.businesses[p.id]?.plaza?.openFloors??1);return <button key={n} aria-pressed={floor===n} className={floor===n?'selected':''} onClick={()=>open?setFloor(n):onInteract('upgrades')}>{n===0?'G':n} · {MALL_FLOORS[n].name}{open?'':' · Locked'}</button>;})}</div>}
    {p?.kind==='shop'&&!exterior&&district.businesses[p.id]?.retail&&<div className="venue-floor-switcher" role="group" aria-label="Supermarket floors"><strong>Supermarket floors</strong><button className={floor===0?'selected':''} aria-pressed={floor===0} onClick={()=>setFloor(0)}>G · Groceries & fresh food</button><button className={floor===1?'selected':''} aria-pressed={floor===1} onClick={()=>district.businesses[p.id].retail!.electronicsUnlocked?setFloor(1):onInteract('upgrades')}>{district.businesses[p.id].retail!.electronicsUnlocked?'1 · Electronics & appliances':'1 · Electronics · locked · expand'}</button></div>}
    {p&&!exterior&&['hotel','apartments'].includes(p.kind)&&district.businesses[p.id]&&<div className="venue-floor-switcher" role="group" aria-label="Building floors"><strong>{p.kind==='hotel'?'Hotel floors':'Apartment floors'}</strong>{Array.from({length:maxFloors(p)+1},(_,n)=>{const locked=n>(district.businesses[p.id].lodging?.openFloors??1);return <button key={n} className={floor===n?'selected':''} aria-pressed={floor===n} onClick={()=>locked?onInteract('upgrades'):setFloor(n)}>{n===0?'G · Reception & lobby':locked?`${n} · Locked · expand`:`${n} · ${p.kind==='hotel'?'Rooms':'Homes'} ${n}01–${n}0${roomsPerFloor(p)}`}</button>;})}{!!district.businesses[p.id].lodging?.facilities.length&&<button aria-pressed={floor===(maxFloors(p)+1)} onClick={()=>setFloor(maxFloors(p)+1)}>Shared amenities · roof wing</button>}</div>}
    <WeatherPanel district={district} focus={focus}/>
    <div className="world-tools">
      <button className="mc-button" onClick={()=>{setDetail('room');setArea('town');onOverview();}} aria-pressed={!focus}>Neighborhood</button>
      <button className="mc-button" onClick={()=>{setDetail('room');setArea('town');setRevision(n=>n+1);}}>Reset view</button>
      {!focus&&<select className="mc-button" aria-label="Explore city area" value={area} onChange={e=>{setArea(e.target.value as CityArea);setDetail('room');}}><option value="town">Whole town</option><option value="residential">Cedar residential area</option><option value="commercial">Shopping street</option><option value="civic">Civic quarter</option></select>}
      {!focus&&<button className="mc-button" aria-pressed={detail==='street'} onClick={()=>setDetail(d=>d==='street'?'room':'street')}>{detail==='street'?'City overview':'Street-level view'}</button>}
      {p&&p.kind!=='park'&&<button className="mc-button" aria-pressed={exterior} onClick={()=>{if(onExteriorView){onExteriorView();return;}setDetail(exterior?'room':'exterior');setFloor(0);}}>{exterior?'Return inside':'Exterior view'}</button>}
      {restaurant&&!exterior&&<><button className="mc-button" disabled={restaurant.phase!=='planning'} title="Arrange tables between weeks" onClick={()=>setArranging(true)}>Arrange tables</button><button className="mc-button" aria-pressed={detail==='person'} onClick={()=>setDetail(d=>d==='person'?'room':'person')}>Character view</button>{!prototypeScenery&&<button className="mc-button" aria-pressed={detail==='street'} onClick={()=>setDetail(d=>d==='street'?'room':'street')}>Street view</button>}<button className="mc-button" aria-pressed={cutaway} onClick={()=>setCutaway(v=>!v)}>{cutaway?'Show full room':'Cutaway view'}</button></>}
      <select className="mc-button" aria-label="Graphics quality" value={fast?'fast':'detailed'} onChange={e=>setFast(e.target.value==='fast')}><option value="detailed">Graphics: Detailed</option><option value="fast">Graphics: Fast</option></select>
      <button className="mc-button" aria-pressed={meter} onClick={()=>{setMeter(v=>!v);setFrameStats(null);}}>Performance</button><button className="mc-button" onClick={onReport}>District P&L · this week</button>
      {testing&&<button className="mc-button world-testing" aria-label={testing?'Add test funds':'Unlock all businesses for testing'} title="Unlock all properties and recipes, and top up each business to $25,000. Existing progress and loans stay intact." onClick={onTestUnlock}>{testing?'Testing · top up funds':'Testing · unlock all'}</button>}
    </div>
    {meter&&<output aria-label="Live frame performance" style={{position:'absolute',right:15,top:155,zIndex:25,padding:10,background:'#fff9ef',color:'#263832',fontSize:12}}>{frameStats?`${frameStats.fps.toFixed(1)} FPS · 95% frames under ${frameStats.p95.toFixed(1)} ms · ${frameStats.draws} draw calls · ${frameStats.triangles.toLocaleString()} triangles · ${frameStats.samples} samples`:'Measuring…'}</output>}
    {arranging&&restaurant&&<TableLayoutEditor state={restaurant} onSave={actions.setTableLayout} onClose={()=>setArranging(false)}/>}
    <Canvas shadows={fast?false:{type:THREE.PCFSoftShadowMap}} dpr={fast?1:[1,1.5]} camera={{position:[48,28,78],fov:48,near:.05,far:1000}} gl={{antialias:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.08}}>
      {meter&&<FrameMeter onSample={setFrameStats}/>}<CharacterQualityContext.Provider value={fast}><WeatherMotionContext.Provider value={motion}>
      <color attach="background" args={[skyColor]}/><NaturalSky3D daylight={daylight} isNight={isNight} cloud={weather.cloud}/><fog attach="fog" args={[skyColor,weather.cloud>.7?90:145,weather.cloud>.7?235:305]}/>
      <hemisphereLight intensity={.38+daylight*(.85+weather.cloud*.3)} color={isNight?'#adc1ee':'#dce7f5'} groundColor={isNight?'#343a49':'#8e8277'}/>
      <directionalLight position={[Math.cos((hours-6)/12*Math.PI)*55,Math.max(12,daylight*65),30]} intensity={.3+daylight*3.0*(1-weather.cloud*.72)} color={isNight?'#8aa8e6':daylight<.45?'#f7bb87':'#fff7ed'} castShadow={!fast} shadow-mapSize={[2048,2048]} shadow-camera-left={-70} shadow-camera-right={70} shadow-camera-top={70} shadow-camera-bottom={-70} shadow-normalBias={.035} shadow-bias={-.00015}/>
      <OutdoorReflections3D isNight={isNight}/>
      {prototypeScenery?prototypeScenery(floor,isNight):<>
      {!isolatedInterior&&(!p?.id.startsWith('mall-')||exterior)&&<DistrictScenery selected={selected??focus??''} businesses={district.businesses} onSelect={onSelect} interiorId={exterior?null:focus} restaurants={restaurants} labels={!focus&&detail!=='street'} gameSpeed={animationSpeed} isNight={isNight} wet={weather.wet} snow={weather.snow}/>}
      {(isolatedInterior||p?.id.startsWith('mall-'))&&p&&<mesh position={[p.position[0],-.04,p.position[2]]} rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[500,500]}/><meshStandardMaterial color="#a7aaa6" roughness={1}/></mesh>}
      {p&&!exterior&&(floor>0||isolatedInterior)&&(p.kind==='plaza'?<PlazaBuilding3D p={p} labels={false} cutawayFloor={floor} isNight={isNight}/>:<UrbanBuilding3D p={p} selected={false} owned interactive={false} labels={false} isNight={isNight} cutawayFloor={floor} onSelect={()=>{}}/>)}
      </>}
      {p&&!exterior&&district.businesses[p.id]&&<group name="active-business-interior" key={p.id} position={placement!.position} scale={placement!.scale}>
        {restaurant?<RestaurantContents3D state={restaurant} actions={actions} cutaway={cutaway} isNight={isNight}/>:<BusinessContents3D p={p} b={district.businesses[p.id]} gameSpeed={state.gameSpeed} interactive={!selected} onInteract={onInteract} serviceActive={!!district.businesses[p.id].venue?.running} isNight={isNight} floor={floor}/>}
        {isNight&&<pointLight position={[0,5,0]} intensity={35} distance={24} color="#ffd6a0"/>}
      </group>}
      <Weather3D weather={weather} speed={animationSpeed} fast={fast} shelter={p&&!exterior?[p.position[0],p.position[2],p.kind==='plaza'?10:9,p.kind==='plaza'?13:10]:undefined}/>
      <WorldCamera focus={focus} revision={revision} detail={detail} floor={floor} area={area}/>
      </WeatherMotionContext.Provider></CharacterQualityContext.Provider>
    </Canvas>
  </div>;
}
