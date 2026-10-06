import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Canvas} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import {RoundedCarBody3D, StylizedTree3D} from '../components/StreetAssets3D';
import {RoundedCarBody3D as OldCar, StylizedTree3D as OldTree} from '../components/StreetAssetsFallback3D';
import {OutdoorReflections3D} from '../components/OutdoorReflections3D';
import {WeatherMotionContext} from '../components/Weather3D';
import {CharacterQualityContext} from '../components/RealCharacter3D';
import {FrameMeter, type FrameStats} from '../career/FrameMeter';
import './style.css';

function Preview() {
  const [before, setBefore] = useState(false), [night, setNight] = useState(false), [wind, setWind] = useState(false), [paused, setPaused] = useState(false), [fast, setFast] = useState(false);
  const [stats, setStats] = useState<FrameStats | null>(null);
  const Tree = before ? OldTree : StylizedTree3D, Car = before ? OldCar : RoundedCarBody3D;
  return <main>
    <header><div><small>BITE TYCOON · SCENERY</small><h1>Life on your street</h1></div><a href="/">Open the game ↗</a></header>
    <section className="controls" aria-label="Preview controls">
      <button aria-pressed={!before} onClick={() => setBefore(false)}>New models</button><button aria-pressed={before} onClick={() => setBefore(true)}>Before</button>
      <span/><button aria-pressed={night} onClick={() => setNight(v => !v)}>{night ? 'Night' : 'Daylight'}</button><button aria-pressed={wind} onClick={() => setWind(v => !v)}>Wind</button><button aria-pressed={paused} onClick={() => setPaused(v => !v)}>{paused ? 'Resume' : 'Pause'}</button><button aria-pressed={fast} onClick={() => setFast(v => !v)}>Fast graphics</button>
    </section>
    <div className="viewport">
      <Canvas shadows={fast ? false : {type:THREE.PCFShadowMap}} dpr={fast ? 1 : [1, 1.5]} camera={{position:[12,8,17],fov:43,near:.1,far:150}} gl={{antialias:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1}}>
        <color attach="background" args={[night ? '#172332' : '#c9d7df']}/><fog attach="fog" args={[night ? '#172332' : '#c9d7df',45,115]}/>
        <hemisphereLight args={[night ? '#647a9b' : '#e5eef5', '#776f60', night ? .8 : 1.5]}/>
        <directionalLight position={[-8,14,7]} color={night ? '#9bb7df' : '#fff3de'} intensity={night ? .5 : 2.8} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-15} shadow-camera-right={15} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-normalBias={.025}/>
        <OutdoorReflections3D isNight={night}/>
        <mesh rotation-x={-Math.PI/2} position={[0,-.06,0]} receiveShadow><planeGeometry args={[150,150]}/><meshStandardMaterial color="#72777a" roughness={.98}/></mesh>
        <mesh position={[0,-.005,-3.3]} receiveShadow><boxGeometry args={[25,.12,5.1]}/><meshStandardMaterial color="#b5afa2" roughness={.92}/></mesh>
        {[-5.8,0,5.8].map(x => <mesh key={x} position={[x,.065,-3.3]} receiveShadow><boxGeometry args={[2.1,.02,2.1]}/><meshStandardMaterial color="#625d46" roughness={1}/></mesh>)}
        {Array.from({length:10},(_,i) => <mesh key={i} rotation-x={-Math.PI/2} position={[-13+i*2.8,-.052,4.9]}><planeGeometry args={[1.25,.09]}/><meshStandardMaterial color="#efe1b0" roughness={1}/></mesh>)}
        <CharacterQualityContext.Provider value={fast}><WeatherMotionContext.Provider value={{wind:wind?28:5,speed:paused?0:1}}>
          {[-5.8,0,5.8].map((x,i) => <Tree key={i} position={[x,.08,-3.3]} seed={i} />)}
          {['#31566c','#c6bda9','#e1e2df'].map((color,i) => <group key={color} position={[-5.8+i*5.8,0,.9]} rotation-y={.25}><Car color={color} speed={4} gameSpeed={paused?0:1} isNight={night}/></group>)}
        </WeatherMotionContext.Provider></CharacterQualityContext.Provider>
        <OrbitControls target={[0,2,0]} minDistance={3} maxDistance={70} maxPolarAngle={Math.PI/2-.03}/><FrameMeter onSample={setStats}/>
      </Canvas>
      <div className="caption"><b>{before ? 'Previous scenery' : 'Three vehicle styles · three tree species'}</b><span>Drag to look around · scroll to inspect</span></div>
    </div>
    <footer><p>{before ? 'The original procedural car bodies and leaves.' : 'The actual models now used by the game. Curved bodywork, alloy wheels, tinted glass, textured bark and fine foliage.'}</p><small>{stats ? `${Math.round(stats.fps)} FPS · ${stats.triangles.toLocaleString()} triangles · ${stats.draws} draws` : 'Loading local models…'}</small></footer>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
