import {memo,useEffect,useMemo,useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html} from '@react-three/drei';
import * as THREE from 'three';
import {buildRailCorridor,buildTrain,RAIL_X,trainTravel} from '../graphics/cityRailway';

function Train({freight,gameSpeed}:{freight:boolean;gameSpeed:number}){
  const model=useMemo(()=>buildTrain(freight),[freight]),group=useRef<THREE.Group>(null),elapsed=useRef(0);
  useEffect(()=>()=>Object.values(model).forEach(g=>g.dispose()),[model]);
  useFrame((_,delta)=>{elapsed.current+=Math.min(delta,.1)*gameSpeed;if(group.current)group.current.position.z=trainTravel(elapsed.current,freight?-170:92,freight?1:-1);});
  return <group ref={group} position={[RAIL_X+(freight?7:0),.1,freight?-170:92]} rotation-y={freight?0:Math.PI} name={freight?'city-freight-train':'city-passenger-train'}>
    <mesh geometry={model.shell} castShadow><meshStandardMaterial vertexColors roughness={.65}/></mesh>
    <mesh geometry={model.glass}><meshStandardMaterial vertexColors roughness={.24} metalness={.35}/></mesh>
    <mesh geometry={model.metal}><meshStandardMaterial vertexColors roughness={.65} metalness={.3}/></mesh>
  </group>;
}
export const CityRailway3D=memo(function CityRailway3D({gameSpeed=1,labels=false}:{gameSpeed?:number;labels?:boolean}){
  const model=useMemo(buildRailCorridor,[]);
  useEffect(()=>()=>Object.values(model).forEach(g=>g.dispose()),[model]);
  return <group name="eastern-rail-corridor">
    <mesh geometry={model.ground} receiveShadow><meshStandardMaterial vertexColors roughness={1}/></mesh>
    <mesh geometry={model.rails}><meshStandardMaterial vertexColors roughness={.45} metalness={.65}/></mesh>
    <mesh geometry={model.details} castShadow><meshStandardMaterial vertexColors roughness={.8}/></mesh>
    <Train freight={false} gameSpeed={gameSpeed}/><Train freight gameSpeed={gameSpeed}/>
    {labels&&<Html position={[RAIL_X-4,8,92]} center zIndexRange={[2,0]} style={{pointerEvents:'none'}}><div className="city-district-label"><strong>Eastgate Station</strong><small>Passenger & freight railway</small></div></Html>}
  </group>;
});
