import {SnowSurfaceMaterial} from './SnowSurfaceMaterial';
import {memo,useEffect,useMemo} from 'react';
import {buildOuterCity} from '../graphics/outerCity';
import {ResidentialHouses3D,useResidentialHouseParts} from './ResidentialHouses3D';
import {OUTER_HOUSES} from '../graphics/residentialLayout';
import type {HousePart} from '../graphics/residentialHouseLibrary';
const CityQuarter=memo(function CityQuarter({quadrant,isNight,snow,houses}:{quadrant:number;isNight:boolean;snow:number;houses:HousePart[]|null}){
 const modeledHomes=!!houses,model=useMemo(()=>buildOuterCity(quadrant,modeledHomes),[quadrant,modeledHomes]);
 useEffect(()=>()=>Object.values(model).forEach(g=>g.dispose()),[model]);
 return <group>
  <mesh geometry={model.solid} castShadow receiveShadow><SnowSurfaceMaterial snow={snow}/></mesh>
  <mesh geometry={model.glass} receiveShadow><meshStandardMaterial vertexColors metalness={.35} roughness={.3}/></mesh>
  <mesh geometry={model.lit}><meshStandardMaterial vertexColors emissive={isNight?'#efcfa1':'#000000'} emissiveIntensity={isNight?.8:0}/></mesh>
  <mesh geometry={model.land} receiveShadow><meshStandardMaterial vertexColors={!snow} color={snow?'#dce1e1':'#ffffff'} roughness={1}/></mesh>
  {houses&&<ResidentialHouses3D parts={houses} placements={OUTER_HOUSES[quadrant]} isNight={isNight} snow={snow}/>}
 </group>;
});
export const CitySkyline3D=memo(function CitySkyline3D({isNight,snow=0}:{isNight:boolean;snow?:number}){
 const houses=useResidentialHouseParts();
 return <group name="surrounding-neighborhoods">{[0,1,2,3].map(quadrant=><CityQuarter key={quadrant} quadrant={quadrant} isNight={isNight} snow={snow} houses={houses}/>)}</group>;
});
