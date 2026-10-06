import {Component, Suspense, useEffect, useMemo, useRef, type ReactNode} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {Html, OrbitControls, useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {assembleBuilding} from '../graphics/buildingAssembly';
import type {BuildingDesign} from './catalog';
import {OutdoorReflections3D} from '../components/OutdoorReflections3D';
import {RoundedCarBody3D, StylizedTree3D} from '../components/StreetAssets3D';
import {RealCharacter3D} from '../components/RealCharacter3D';
import {getSurfaceMaterial} from '../graphics/surfaceMaterials';

export class ModelBoundary extends Component<{children:ReactNode}, {error:boolean}> {
  state={error:false};
  static getDerivedStateFromError() { return {error:true}; }
  render() { return this.state.error ? <Html center><div className="model-loading">The model could not load.<br/><button onClick={()=>location.reload()}>Reload preview</button></div></Html> : this.props.children; }
}
function Kit({design,floors,inside,floor,night}:{design:BuildingDesign;floors:number;inside:boolean;floor:number;night:boolean}) {
  const {scene}=useGLTF(`/models/building-prototype/${design.id}.glb`);
  const building=useMemo(()=>assembleBuilding(scene,design,floors,inside,floor),[scene,design,floors,inside,floor]);
  useEffect(()=>{
    scene.traverse(node=>{
      const mesh=node as THREE.Mesh; if (!mesh.isMesh) return;
      const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
      for(const item of materials) {
        const mat=item as THREE.MeshStandardMaterial;
        if(mat.name==='window_lit'||mat.name==='lamp') mat.emissiveIntensity=night?1.1:.06;
        if(mat.map) mat.map.anisotropy=4;
        if(mat.transparent) { mat.depthWrite=false; mat.side=THREE.DoubleSide; }
      }
    });
  },[scene,night]);
  return <primitive object={building} dispose={null}/>;
}
function Walker({z}:{z:number}) {
  const ref=useRef<THREE.Group>(null);
  useFrame(({clock})=>{if(ref.current) { const t=clock.elapsedTime*.075, x=Math.sin(t)*8; ref.current.position.x=x;ref.current.rotation.y=Math.cos(t)>0?Math.PI/2:-Math.PI/2; }});
  return <group ref={ref} position={[0,.13,z]}><RealCharacter3D role="customer" seed={31} isWalking/></group>;
}
function Block({position,size,color,material}:{position:[number,number,number];size:[number,number,number];color?:string;material?:THREE.Material}) {
  return <mesh position={position} castShadow receiveShadow><boxGeometry args={size}/>{material?<primitive object={material} attach="material"/>:<meshStandardMaterial color={color??'#b7b2a7'} roughness={.85}/>}</mesh>;
}
function Surroundings({design,night}:{design:BuildingDesign;night:boolean}) {
  const w=design.width,d=design.depth, road=d/2+8;
  const concrete=getSurfaceMaterial('concrete','#b7b2a9',6,6), asphalt=getSurfaceMaterial('asphalt','#44494e',10,10);
  return <group>
    <Block position={[0,-.08,0]} size={[w+8,.16,d+11]} material={concrete}/>
    <Block position={[0,-.19,road]} size={[120,.18,7]} material={asphalt}/>
    {Array.from({length:17},(_,i)=><Block key={i} position={[-40+i*5,-.09,road]} size={[2.1,.008,.11]} color="#d6cfae"/>)}
    <Block position={[0,.06,d/2+4.35]} size={[w+8,.18,.23]} color="#c8c4ba"/>
    {[-1,1].map((sign,i)=><group key={sign}>
      <Block position={[sign*(w/2+2),.007,1]} size={[1.6,.02,1.6]} color="#504637"/>
      <StylizedTree3D position={[sign*(w/2+2),.01,1]} seed={i} scale={.85}/>
      <Block position={[sign*(w/2+1),1.65,d/2+3.8]} size={[.065,3.3,.065]} color="#3b4145"/>
      <mesh position={[sign*(w/2+1),3.3,d/2+3.8]}><boxGeometry args={[.34,.13,.32]}/><meshStandardMaterial color="#dfd5b7" emissive="#ffc77b" emissiveIntensity={night?2:0}/></mesh>
    </group>)}
    <group position={[-4,-.095,road-1.9]} rotation-y={Math.PI/2}><RoundedCarBody3D color="#31566c" speed={0} gameSpeed={0} isNight={night}/></group>
    <Walker z={d/2+3.15}/>
    <group position={[w/2-.6,.13,d/2+2.1]} rotation-y={-.6}><RealCharacter3D seed={12} role="customer" gameSpeed={1}/></group>
  </group>;
}
function InteriorPeople({floor}:{floor:number}) {
  return <group position={floor>0?[1.8,.13,1.6]:[-1,.13,2.5]}><RealCharacter3D role="customer" seed={11}/></group>;
}
function CameraRig({design,floors,inside,reset}:{design:BuildingDesign;floors:number;inside:boolean;reset:number}) {
  const controls=useRef<any>(null);const {camera,size}=useThree();
  useEffect(()=>{
    const h=inside?3.3:design.floorHeight*floors+3.8, extra=inside?0:4;
    const target=new THREE.Vector3(0,inside?.7:h*.45,inside?0:2);
    const direction=(inside?new THREE.Vector3(.56,1.10,1.28):new THREE.Vector3(.88,.62,1.43)).normalize();
    const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
    const up=new THREE.Vector3().crossVectors(direction,right);
    const tanY=Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov/2)),tanX=tanY*size.width/size.height;
    let distance=5;
    for(const x of [-design.width/2-extra,design.width/2+extra]) for(const y of [0,h]) for(const z of [-design.depth/2,design.depth/2+(inside?0:9)]) {
      const point=new THREE.Vector3(x,y,z).sub(target);
      distance=Math.max(distance,point.dot(direction)+Math.max(Math.abs(point.dot(up))/tanY,Math.abs(point.dot(right))/tanX));
    }
    camera.position.copy(target).addScaledVector(direction,distance*1.09);camera.lookAt(target);
    if(controls.current) {controls.current.target.copy(target);controls.current.update();}
  },[camera,design,floors,inside,reset,size.width,size.height]);
  return <OrbitControls ref={controls} makeDefault enableDamping minDistance={5} maxDistance={100} maxPolarAngle={Math.PI/2-.035} />;
}
export function BuildingScene({design,floors,inside,floor,night,reset}:{design:BuildingDesign;floors:number;inside:boolean;floor:number;night:boolean;reset:number}) {
  const shadowSpan=Math.max(20,floors*design.floorHeight);
  return <>
    <color attach="background" args={[night?'#1c2836':'#d7dee0']}/>
    <fog attach="fog" args={[night?'#1c2836':'#d7dee0',100,240]}/>
    <hemisphereLight args={[night?'#8d9bb3':'#edf2f5',night?'#3d424d':'#b2a38c',night?.55:1.25]}/>
    <directionalLight position={[-16,35,20]} color={night?'#a0bbdf':'#fff2df'} intensity={night?.55:3.0} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-shadowSpan} shadow-camera-right={shadowSpan} shadow-camera-top={shadowSpan} shadow-camera-bottom={-shadowSpan} shadow-camera-far={110} shadow-normalBias={.025} shadow-bias={-.00015}/>
    {night&&<pointLight position={[0,3.7,design.depth/2+2]} color="#ffc780" intensity={75} distance={22} decay={2}/>}
    {inside&&<pointLight position={[0,7,1]} color={night?'#ffe0a5':'#fff9ed'} intensity={night?150:55} distance={30}/>}
    <OutdoorReflections3D isNight={night}/>
    <mesh rotation-x={-Math.PI/2} position={[0,-.30,0]} receiveShadow><planeGeometry args={[500,500]}/><meshStandardMaterial color={inside?'#aaa69e':'#9b9c95'} roughness={1}/></mesh>
    <ModelBoundary key={design.id}><Suspense fallback={<Html center><div className="model-loading">Loading original 3D model…</div></Html>}>
      <Kit {...{design,floors,inside,floor,night}}/>
      {inside?<InteriorPeople {...{design,floor}}/>:<Surroundings {...{design,night}}/>}
    </Suspense></ModelBoundary>
    <CameraRig {...{design,floors,inside,reset}}/>
  </>;
}
