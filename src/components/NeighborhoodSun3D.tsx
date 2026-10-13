import {useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';

/** Keep the existing shadow budget around the part of town the player is viewing. */
export function NeighborhoodSun3D({hours,daylight,isNight,cloud,fast}:{hours:number;daylight:number;isNight:boolean;cloud:number;fast:boolean}){
  const light=useRef<THREE.DirectionalLight>(null);
  const target=useMemo(()=>new THREE.Object3D(),[]);
  const controls=useThree(state=>state.controls) as unknown as {target:THREE.Vector3}|null;
  const offset=useMemo(()=>new THREE.Vector3(Math.cos((hours-6)/12*Math.PI)*55,Math.max(18,daylight*65),30),[hours,daylight]);
  useFrame(()=>{
    if(!light.current)return;
    // Snap to shadow texels to avoid swimming edges while dragging across the city.
    const step=140/2048,center=controls?.target;
    target.position.set(Math.round((center?.x??0)/step)*step,0,Math.round((center?.z??0)/step)*step);
    target.updateMatrixWorld();light.current.position.copy(target.position).add(offset);
  });
  return <><primitive object={target}/><directionalLight ref={light} target={target} intensity={.28+daylight*3.1*(1-cloud*.72)} color={isNight?'#8aa8e6':daylight<.45?'#ffd0a0':'#fff0d4'} castShadow={!fast} shadow-mapSize={[2048,2048]} shadow-camera-left={-70} shadow-camera-right={70} shadow-camera-top={70} shadow-camera-bottom={-70} shadow-camera-far={210} shadow-normalBias={.035} shadow-bias={-.00015}/></>;
}
