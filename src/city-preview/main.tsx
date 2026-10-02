import React, { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Building2, Home, Store, Sun, Moon, RotateCcw, ArrowUpRight, MousePointer2, Check, Eye, ChevronRight, Map as MapIcon } from 'lucide-react';
import { StylizedTree3D, RoundedCarBody3D } from '../components/StreetAssets3D';
import { OutdoorReflections3D } from '../components/OutdoorReflections3D';
import './preview.css';

// This entry has no game state, save access, or management simulation imports.
const ASSETS = '/models/city-preview/';
type Vec3 = [number, number, number];
type View = 'overview' | 'residential' | 'shopping' | 'detail';
type ModelName = 'Building_Small_1' | 'Building_Medium_2_001' | 'Building_Large_2';
const VIEWS: Record<View, { title: string; subtitle: string; camera: Vec3; target: Vec3 }> = {
  overview: { title: 'A connected neighbourhood', subtitle: 'Paired buildings, a cross street and a small public garden.', camera: [65, 46, 65], target: [0, 7, -4] },
  residential: { title: 'Cedar Street', subtitle: 'Brick apartments, detailed entrances and a shared pavement.', camera: [-4, 11, 14], target: [-31, 9, -17] },
  shopping: { title: 'The high street', subtitle: 'Ground-floor shops with homes and offices above.', camera: [65, 19, 25], target: [27, 12, -17] },
  detail: { title: 'Look a little closer', subtitle: 'Inspect the actual brickwork, window frames and doorways.', camera: [45, 5, -1], target: [40, 4, -12] },
};
const BUILDINGS: { name: ModelName; position: Vec3; rotation?: number; tint: string; label: string }[] = [
  { name: 'Building_Small_1', position: [-42, .14, -17], tint: '#c9ad9b', label: 'Cedar apartments' },
  { name: 'Building_Medium_2_001', position: [-27, .14, -17], tint: '#d7c8b1', label: 'Cedar residences' },
  { name: 'Building_Large_2', position: [22, .14, -18], tint: '#c2a68c', label: 'High Street corner' },
  { name: 'Building_Small_1', position: [40, .14, -17], tint: '#d2c6b2', label: 'Market & café' },
  { name: 'Building_Small_1', position: [-41, .14, 17], rotation: Math.PI, tint: '#c2a18b', label: 'Garden apartments' },
  { name: 'Building_Medium_2_001', position: [-26, .14, 17], rotation: Math.PI, tint: '#c3c0b5', label: 'West apartments' },
];

function Model({ name, position = [0,0,0], rotation = 0, centered = false, tint, evening = false }: {
  name: string; position?: Vec3; rotation?: number; centered?: boolean; tint?: string; evening?: boolean;
}) {
  const { scene } = useGLTF(`${ASSETS}${name}.gltf`);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const materials = new Map<THREE.Material, THREE.MeshStandardMaterial>();
    clone.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const prepare = (original: THREE.MeshStandardMaterial) => {
        if (materials.has(original)) return materials.get(original)!;
        const material = original.clone();
        // Pack vertex colours are masks for its optional engine-specific shaders.
        // Keep the original geometry/maps and use ordinary PBR materials here.
        material.vertexColors = false;
        material.envMapIntensity = .45;
        if (material.map) material.map.anisotropy = 4;
        if (/RedBrick/.test(material.name) && tint) material.color.set(tint);
        if (/Trim_Green/.test(material.name)) material.color.set('#657677');
        if (/Trim_Dark/.test(material.name)) material.color.set('#747270');
        if (/Glass/.test(material.name)) {
          material.color.set('#91a3af'); material.opacity = .25;
          material.roughness = .2; material.metalness = .25; material.depthWrite = false;
        }
        if (/FakeInterior/.test(material.name)) {
          material.emissive.set(evening ? '#ffcb8b' : '#ffffff');
          material.emissiveMap = material.map;
          material.emissiveIntensity = evening ? .65 : .06;
        }
        materials.set(original, material);
        return material;
      };
      child.material = Array.isArray(child.material) ? child.material.map(prepare) : prepare(child.material);
    });
    if (centered) {
      const box = new THREE.Box3().setFromObject(clone);
      const center = box.getCenter(new THREE.Vector3());
      clone.position.set(-center.x, -box.min.y, -center.z);
    }
    return { scene: clone, materials: [...materials.values()] };
  }, [scene, centered, tint, evening]);
  useEffect(() => () => model.materials.forEach(material => material.dispose()), [model]);
  return <group position={position} rotation={[0, rotation, 0]} dispose={null}><primitive object={model.scene} /></group>;
}

function Box({ position, size, color, roughness = .9 }: { position: Vec3; size: Vec3; color: string; roughness?: number }) {
  return <mesh position={position} castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} roughness={roughness} /></mesh>;
}

function Sign({ text, position, width = 4.4, color = '#29363c' }: { text: string; position: Vec3; width?: number; color?: string }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 192;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color; ctx.fillRect(0, 0, 1024, 192);
    ctx.strokeStyle = '#b5a27d'; ctx.lineWidth = 3; ctx.strokeRect(12, 12, 1000, 168);
    ctx.font = '500 65px Georgia'; ctx.fillStyle = '#f5eddb'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 512, 98, 950);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, [text, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={position} castShadow><boxGeometry args={[width,.82,.18]} /><meshStandardMaterial map={texture} roughness={.66} /></mesh>;
}

function Lamp({ position, evening }: { position: Vec3; evening: boolean }) {
  return <group position={position}>
    <mesh position={[0,2.5,0]} castShadow><cylinderGeometry args={[.045,.085,5,8]} /><meshStandardMaterial color="#30363a" metalness={.65} roughness={.4}/></mesh>
    <Box position={[.38,4.94,0]} size={[.86,.08,.12]} color="#30363a" />
    <mesh position={[.78,4.84,0]}><boxGeometry args={[.6,.1,.3]} /><meshStandardMaterial color="#f5eed6" emissive="#ffcf85" emissiveIntensity={evening ? 3 : .12}/></mesh>
    {evening && <pointLight position={[.78,4.5,0]} color="#ffca8d" intensity={17} distance={12} decay={2}/>}
  </group>;
}

function Streets({ evening }: { evening: boolean }) {
  const paving = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#c7c4bc'; ctx.fillRect(0,0,256,256);
    for (let y=0;y<4;y++) for (let x=0;x<4;x++) {
      const shade=188+(x*7+y*11)%12;
      ctx.fillStyle=`rgb(${shade+8},${shade+6},${shade})`; ctx.fillRect(x*64+1,y*64+1,62,62);
    }
    const map = new THREE.CanvasTexture(canvas); map.wrapS=map.wrapT=THREE.RepeatWrapping; map.repeat.set(32,22); map.colorSpace=THREE.SRGBColorSpace; map.anisotropy=4;
    return map;
  }, []);
  useEffect(() => () => paving.dispose(), [paving]);
  return <>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.17,0]} receiveShadow><planeGeometry args={[1000,1000]}/><meshStandardMaterial color="#a3a19a" roughness={1}/></mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.155,0]} receiveShadow><planeGeometry args={[122,88]}/><meshStandardMaterial map={paving} roughness={.96}/></mesh>
    <Model name="Street_4WayIntersection" />
    {Array.from({length:9},(_,i)=>12+i*6).flatMap(x=>[-1,1].map(side=><Model key={`x${side*x}`} name="Street_2Lane" position={[side*x,0,0]}/>))}
    {Array.from({length:6},(_,i)=>12+i*6).flatMap(z=>[-1,1].map(side=><Model key={`z${side*z}`} name="Street_2Lane" position={[0,0,side*z]} rotation={Math.PI/2}/>))}
    {[-1,1].flatMap(side=>[-1,1].map(row=><Box key={`${side}${row}`} position={[side*33,-.03,row*21.65]} size={[45,.28,31.3]} color="#c3c0b8"/>))}
    {[-51,-35,-18,14,31,49].flatMap((x,i)=>[-1,1].map(side=><Lamp key={`${x}:${side}`} position={[x,.14,side*4.2]} evening={evening}/>))}
    {[-9,-7,7,9].flatMap(x=>[-1,1].map(side=><Model key={`${x}${side}`} name="Prop_Bollard" position={[x,.14,side*4.2]}/>))}
    {[-25,24].map(x=><Model key={x} name="Prop_ManholeCover" position={[x,.025,.8]}/>)}
    {[-48,-17,14,49].map((x,i)=><group key={x}>
      <Model name="Sidewalk_Planter" position={[x,.14,-6.2]}/>
      <StylizedTree3D position={[x,.65,-6.2]} scale={.7} seed={i+30} gameSpeed={0}/>
    </group>)}
    <group position={[-36,0,1.65]} rotation={[0,Math.PI/2,0]} scale={.88}><RoundedCarBody3D color="#696f76" speed={0} gameSpeed={0} isNight={evening}/></group>
    <group position={[43,0,-1.65]} rotation={[0,-Math.PI/2,0]} scale={.88}><RoundedCarBody3D color="#ad9b83" speed={1} gameSpeed={0} isNight={evening}/></group>
  </>;
}

function Garden() {
  return <group position={[32,.14,19]}>
    <Box position={[0,.08,0]} size={[32,.16,23]} color="#aba797"/>
    {[-1,1].flatMap(x=>[-1,1].map(z=><group key={`${x}${z}`}>
      <Box position={[x*8,.14,z*5.4]} size={[11,.12,7.6]} color="#626e4b"/>
      <StylizedTree3D position={[x*10,.18,z*7]} scale={1.08} seed={15+x*3+z} gameSpeed={0}/>
      <Model name="Prop_Planter_Single" position={[x*4,.18,z*7.5]}/>
    </group>))}
    <mesh position={[0,.5,0]} castShadow receiveShadow><cylinderGeometry args={[2.8,3,.72,40]}/><meshStandardMaterial color="#aaa69b" roughness={.8}/></mesh>
    <mesh position={[0,.88,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[2.55,40]}/><meshStandardMaterial color="#688b99" roughness={.16} metalness={.3}/></mesh>
    {[-1,1].map(side=><group key={side} position={[side*7,0,0]}>
      <Box position={[0,.54,0]} size={[2.7,.16,.7]} color="#8a6448"/>
      <Box position={[0,1.04,.3]} size={[2.7,.6,.12]} color="#8a6448"/>
      {[-1,1].map(x=><Box key={x} position={[x,.25,0]} size={[.12,.5,.6]} color="#45494a"/>)}
    </group>)}
  </group>;
}

function CameraRig({ view, revision }: { view: View; revision: number }) {
  const { camera, invalidate } = useThree();
  const controls = useRef<any>(null);
  useEffect(() => {
    const frame = VIEWS[view];
    camera.position.set(...frame.camera);
    if (controls.current) {
      controls.current.target.set(...frame.target);
      controls.current.update();
    }
    camera.lookAt(...frame.target); invalidate();
  }, [camera, invalidate, view, revision]);
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.12} minDistance={4} maxDistance={155} maxPolarAngle={Math.PI*.49} minPolarAngle={.12} target={VIEWS[view].target}/>;
}

function Loading() {
  return <Html center><div className="loading-card"><Building2 size={26}/><strong>Loading the neighbourhood</strong><span>Preparing buildings & materials…</span></div></Html>;
}

function City({ view, revision, evening, labels }: { view: View; revision: number; evening: boolean; labels: boolean }) {
  return <Canvas shadows frameloop="demand" dpr={[1,1.5]} camera={{ position: VIEWS.overview.camera, fov: 48, near: .1, far: 700 }} gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1 }}>
    <color attach="background" args={[evening ? '#647388' : '#d6e1e7']}/>
    <fog attach="fog" args={[evening ? '#647388' : '#d6e1e7', 160, 330]}/>
    <hemisphereLight args={[evening ? '#a9b7dd' : '#eef4ff', '#726258', evening ? .7 : 1.3]}/>
    <directionalLight position={[-25,55,38]} color={evening ? '#f5b783' : '#fff2df'} intensity={evening ? 1 : 2.5} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-72} shadow-camera-right={72} shadow-camera-top={58} shadow-camera-bottom={-58} shadow-camera-far={170} shadow-normalBias={.05} shadow-bias={-.0001}/>
    <OutdoorReflections3D isNight={evening}/>
    <Suspense fallback={<Loading/>}>
      <Streets evening={evening}/>
      {BUILDINGS.map((building,i)=><group key={building.label}>
        <Model {...building} centered evening={evening}/>
        {labels && <Html position={[building.position[0], i===1||i===5 ? 28 : i===2 ? 31 : 20, building.position[2]]} center distanceFactor={75} zIndexRange={[10,0]} style={{pointerEvents:'none'}}><div className="building-label">{building.label}</div></Html>}
      </group>)}
      <Sign text="CEDAR HOUSE" position={[-42,3.15,-11.94]} width={5}/>
      <Sign text="THE CORNER MARKET" position={[22,3.15,-9.88]} width={7}/>
      <Sign text="WILLOW & COFFEE" position={[40,3.15,-11.94]} width={5}/>
      <Garden/>
    </Suspense>
    <CameraRig view={view} revision={revision}/>
  </Canvas>;
}

class PreviewBoundary extends Component<{ children: React.ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() { return this.state.error ? <div className="error-card"><h2>The preview could not load</h2><p>Refresh to try loading the local model files again.</p><button onClick={()=>window.location.reload()}>Reload preview</button><a href="/">Return to game</a></div> : this.props.children; }
}

function App() {
  const [view,setView] = useState<View>('shopping');
  const [revision,setRevision] = useState(0);
  const [evening,setEvening] = useState(false);
  const [labels,setLabels] = useState(false);
  const icons = { overview: MapIcon, residential: Home, shopping: Store, detail: Eye };
  const names = { overview: 'Whole neighbourhood', residential: 'Residential street', shopping: 'Shopping street', detail: 'Building details' };
  return <div className="preview-app">
    <header className="topbar"><a className="brand" href="/"><Building2 size={22}/><span>BITE TYCOON<small>City design studio</small></span></a><div className="preview-badge"><span/>Separate visual preview</div><a className="game-link" href="/">Back to game <ArrowUpRight size={16}/></a></header>
    <aside className="sidebar">
      <div><div className="eyebrow">YOUR SELECTION · OPTION 02</div><h1>A place that<br/>feels lived in.</h1><p className="intro">Quaternius Downtown City MegaKit. Real model files, ready to explore.</p></div>
      <nav aria-label="Preview viewpoints"><div className="section-label">EXPLORE THE BLOCK</div>{(Object.keys(VIEWS) as View[]).map(id=>{const Icon=icons[id];return <button key={id} aria-pressed={view===id} className={`view-button ${view===id?'selected':''}`} onClick={()=>{setView(id);setRevision(n=>n+1);}}><Icon size={18}/><span>{names[id]}</span><ChevronRight size={16}/></button>;})}</nav>
      <div className="lighting"><div className="section-label">LIGHTING</div><div className="segmented"><button aria-pressed={!evening} className={!evening?'active':''} onClick={()=>setEvening(false)}><Sun size={16}/>Daylight</button><button aria-pressed={evening} className={evening?'active':''} onClick={()=>setEvening(true)}><Moon size={16}/>Evening</button></div><label className="labels-control"><input type="checkbox" checked={labels} onChange={e=>setLabels(e.target.checked)}/> Show building names</label></div>
      <div className="preview-notes"><div className="section-label">WHAT YOU'RE SEEING</div><p><Check size={15}/> Detailed brick and stone façades</p><p><Check size={15}/> Proper windows, doors and rooflines</p><p><Check size={15}/> Multiple buildings on each block</p><div className="scope-note">Exterior design study. Management, interiors and your saved game are unchanged.</div></div>
      <footer className="source"><strong>Free Standard edition · CC0</strong><p>Buildings and street pieces by Quaternius. Trees, signs and lighting are preview dressing.</p><a href="https://quaternius.com/packs/downtowncitymegakit.html" target="_blank" rel="noreferrer">View the original collection <ArrowUpRight size={13}/></a><a href={`${ASSETS}QUATERNIUS_LICENSE.txt`} target="_blank" rel="noreferrer">Asset license <ArrowUpRight size={13}/></a></footer>
    </aside>
    <main className="viewport" aria-label="Interactive 3D neighbourhood preview">
      <PreviewBoundary><City view={view} revision={revision} evening={evening} labels={labels}/></PreviewBoundary>
      <div className="scene-title"><div className="eyebrow">{evening ? 'BLUE HOUR' : 'LATE MORNING'} · EXTERIOR STUDY</div><h2>{VIEWS[view].title}</h2><p>{VIEWS[view].subtitle}</p></div>
      <div className="scene-controls"><span><MousePointer2 size={15}/>Drag to orbit · Scroll to zoom · Right-drag to pan</span><button onClick={()=>setRevision(n=>n+1)}><RotateCcw size={15}/>Reset view</button></div>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<App/>);
