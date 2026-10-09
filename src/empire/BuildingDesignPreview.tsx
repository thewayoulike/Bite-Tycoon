import {Canvas} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import type {Property} from '../prototype/expansionModel';
import {RestaurantProperty3D} from '../components/RestaurantShell3D';
import {UrbanBuilding3D} from '../components/UrbanBuilding3D';
import {PlazaBuilding3D} from '../components/ShoppingPlaza3D';
import {type RestaurantIdentity} from './restaurantIdentity';

/** Reuses the actual game exteriors; one on-demand canvas for all design choices. */
export function BuildingDesignPreview({property,identity}:{property:Property;identity?:RestaurantIdentity}){
 const p={...property,position:[0,0,0] as [number,number,number]},food=p.kind==='restaurant'||p.kind==='cafe';
 return <div className="market-design-preview" role="img" aria-label={`${p.name}: ${p.design} building design, Level 1 exterior`}>
  <Canvas frameloop="demand" dpr={[1,1.5]} camera={{position:[21,14,25],fov:40,near:.2,far:150}} gl={{antialias:true}}>
   <color attach="background" args={['#dce3e6']}/><ambientLight intensity={1.15}/><directionalLight position={[10,22,14]} intensity={2.2}/>
   <mesh position={[0,-.2,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[48,48]}/><meshStandardMaterial color="#c0c2bd"/></mesh>
   {food?<RestaurantProperty3D p={p} state={identity?{restaurantIdentity:identity}:undefined} selected={false} owned labels={false} onSelect={()=>{}}/>:p.kind==='plaza'?<PlazaBuilding3D p={p} floors={1} labels={false}/>:<UrbanBuilding3D p={p} floorsOverride={p.kind==='shop'?0:1} selected={false} owned interactive={false} labels={false} onSelect={()=>{}}/>}
   <OrbitControls makeDefault target={[0,3,0]} enablePan={false} minDistance={18} maxDistance={65} minPolarAngle={.3} maxPolarAngle={1.45}/>
  </Canvas>
  <span>Actual game exterior · drag to rotate · scroll to zoom</span>
 </div>;
}
