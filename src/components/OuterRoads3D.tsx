import {memo,useEffect,useMemo} from 'react';
import {buildOuterRoads} from '../graphics/cityRoadModel';
import {CityRoadMaterial} from './CityRoadMaterial';

export const OuterRoads3D=memo(function OuterRoads3D({wet=0,snow=0}:{wet?:number;snow?:number}){
 const model=useMemo(buildOuterRoads,[]);
 useEffect(()=>()=>Object.values(model).forEach(g=>g.dispose()),[model]);
 return <group><mesh geometry={model.road} receiveShadow><CityRoadMaterial wet={wet} snow={snow}/></mesh>{(['marks','land','details'] as const).map(key=><mesh key={key} geometry={model[key]} receiveShadow><meshStandardMaterial vertexColors roughness={.9}/></mesh>)}</group>;
});
