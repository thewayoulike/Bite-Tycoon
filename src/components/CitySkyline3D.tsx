import {SnowSurfaceMaterial} from './SnowSurfaceMaterial';
import {memo,useEffect,useMemo} from 'react';
import {buildOuterCity,type OuterTreePlacement,type OuterCarPlacement} from '../graphics/outerCity';
import type {Group} from 'three';
import {useStreetLibrary} from './StreetAssets3D';
import {OuterCars3D,OuterTrees3D} from './OuterStreetAssets3D';
import {ResidentialHouses3D,useResidentialHouseParts} from './ResidentialHouses3D';
import {OUTER_HOUSES} from '../graphics/residentialLayout';
import type {HousePart} from '../graphics/residentialHouseLibrary';
import type {ThreeEvent} from '@react-three/fiber';
import {commercialParcelAt} from '../graphics/commercialParcels';
const CityQuarter=memo(function CityQuarter({quadrant,isNight,snow,houses,trees,cars,market,developmentKey,onSelect}:{quadrant:number;isNight:boolean;snow:number;houses:HousePart[]|null;trees:Group|null;cars:Group|null;market:boolean;developmentKey:string;onSelect?:(id:string)=>void}){
 const modeledHomes=!!houses,modeledTrees=!!trees,modeledCars=!!cars;
 const {model,placements}=useMemo(()=>{
  const placements={trees:[] as OuterTreePlacement[],cars:[] as OuterCarPlacement[]};
  return {model:buildOuterCity(quadrant,modeledHomes,{trees:modeledTrees,cars:modeledCars,placements},market?{developed:new Set(developmentKey.split('|'))}:undefined),placements};
 },[quadrant,modeledHomes,modeledTrees,modeledCars,market,developmentKey]);
 useEffect(()=>()=>Object.values(model).forEach(g=>g.dispose()),[model]);
 const selectSite=(event:ThreeEvent<MouseEvent>)=>{if(!market||event.delta>4)return;const p=commercialParcelAt(Math.round(event.point.x/25)*25,Math.round(event.point.z/25)*25);if(p&&!developmentKey.split('|').includes(p.id)){event.stopPropagation();onSelect?.('plot-'+p.id);}};
 return <group>
  <mesh geometry={model.solid} onClick={market?selectSite:undefined} castShadow receiveShadow><SnowSurfaceMaterial snow={snow}/></mesh>
  <mesh geometry={model.glass} onClick={market?selectSite:undefined} receiveShadow><meshStandardMaterial vertexColors metalness={.35} roughness={.3}/></mesh>
  <mesh geometry={model.lit} onClick={market?selectSite:undefined}><meshStandardMaterial vertexColors emissive={isNight?'#efcfa1':'#000000'} emissiveIntensity={isNight?.8:0}/></mesh>
  <mesh geometry={model.land} onClick={market?selectSite:undefined} receiveShadow><SnowSurfaceMaterial snow={snow} roughness={1}/></mesh>
  {houses&&<ResidentialHouses3D parts={houses} placements={OUTER_HOUSES[quadrant]} isNight={isNight} snow={snow}/>}
  {trees&&<OuterTrees3D library={trees} placements={placements.trees}/>}
  {cars&&<OuterCars3D library={cars} placements={placements.cars}/>}
 </group>;
});
export const CitySkyline3D=memo(function CitySkyline3D({isNight,snow=0,market=false,developmentKey='',onSelect}:{isNight:boolean;snow?:number;market?:boolean;developmentKey?:string;onSelect?:(id:string)=>void}){
 const houses=useResidentialHouseParts(),trees=useStreetLibrary('trees'),cars=useStreetLibrary('vehicles');
 return <group name="surrounding-neighborhoods">{[0,1,2,3].map(quadrant=><CityQuarter key={quadrant} quadrant={quadrant} isNight={isNight} snow={snow} houses={houses} trees={trees} cars={cars} market={market} developmentKey={developmentKey} onSelect={onSelect}/>)}</group>;
});
