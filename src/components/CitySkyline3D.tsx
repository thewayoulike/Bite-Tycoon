import {SnowSurfaceMaterial} from './SnowSurfaceMaterial';
import {memo,useEffect,useMemo} from 'react';
import {buildOuterCity} from '../graphics/outerCity';
const CityQuarter=memo(function CityQuarter({quadrant,isNight,snow}:{quadrant:number;isNight:boolean;snow:number}){
 const model=useMemo(()=>buildOuterCity(quadrant),[quadrant]);
 useEffect(()=>()=>Object.values(model).forEach(g=>g.dispose()),[model]);
 return <group>
  <mesh geometry={model.solid} castShadow receiveShadow><SnowSurfaceMaterial snow={snow}/></mesh>
  <mesh geometry={model.glass} receiveShadow><meshStandardMaterial vertexColors metalness={.35} roughness={.3}/></mesh>
  <mesh geometry={model.lit}><meshStandardMaterial vertexColors emissive={isNight?'#efcfa1':'#000000'} emissiveIntensity={isNight?.8:0}/></mesh>
  <mesh geometry={model.land} receiveShadow><meshStandardMaterial vertexColors={!snow} color={snow?'#dce1e1':'#ffffff'} roughness={1}/></mesh>
 </group>;
});
export const CitySkyline3D=memo(function CitySkyline3D({isNight,snow=0}:{isNight:boolean;snow?:number}){
 return <group name="surrounding-neighborhoods">{[0,1,2,3].map(quadrant=><CityQuarter key={quadrant} quadrant={quadrant} isNight={isNight} snow={snow}/>)}</group>;
});
