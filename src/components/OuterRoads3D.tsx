import {memo,useEffect,useMemo} from 'react';
import {ModelParts} from '../graphics/modelParts';
import {CITY_EDGE,OUTER_ROADS} from '../graphics/outerCity';
import {CITY_AVENUES,CITY_CROSS_STREETS} from '../graphics/cityDistrictLayout';
import {CityRoadMaterial} from './CityRoadMaterial';

export const OuterRoads3D=memo(function OuterRoads3D({wet=0,snow=0}:{wet?:number;snow?:number}){
 const model=useMemo(()=>{
  const road=new ModelParts(),marks=new ModelParts();
  const roads:{x:number;z:number;length:number;vertical:boolean}[]=[];
  for(const x of OUTER_ROADS)roads.push({x,z:0,length:CITY_EDGE*2,vertical:true});
  for(const z of OUTER_ROADS)roads.push({x:0,z,length:CITY_EDGE*2,vertical:false});
  const extension=CITY_EDGE-62.5,midpoint=62.5+extension/2;
  for(const side of [-1,1]){
   for(const x of CITY_AVENUES)roads.push({x,z:side*midpoint,length:extension,vertical:true});
   for(const z of [...CITY_CROSS_STREETS,-37.5,12.5])roads.push({x:side*midpoint,z,length:extension,vertical:false});
  }
  for(const r of roads){
   road.box([r.x,.013,r.z],r.vertical?[6.5,.025,r.length]:[r.length,.025,6.5],'#494c51');
   for(let d=-r.length/2+2;d<r.length/2;d+=5){
    const v=(r.vertical?r.z:r.x)+d;
    if([...OUTER_ROADS,...(r.vertical?[...CITY_CROSS_STREETS,-37.5,12.5]:CITY_AVENUES)].some(j=>Math.abs(j-v)<5))continue;
    marks.box([r.x+(r.vertical?0:d),.043,r.z+(r.vertical?d:0)],r.vertical?[.12,.02,2.4]:[2.4,.02,.12],'#d9d1ac');
   }
  }
  for(const x of [...CITY_AVENUES,...OUTER_ROADS])for(const z of [...CITY_CROSS_STREETS,...OUTER_ROADS,-37.5,12.5]){
   if(Math.abs(x)<64&&Math.abs(z)<64)continue;
   for(const side of [-1,1])for(let i=0;i<5;i++)marks.box([x-2+i,.047,z+side*4.7],[.48,.02,1.5],'#d0cfc6');
  }
  return {road:road.finish(),marks:marks.finish()};
 },[]);
 useEffect(()=>()=>Object.values(model).forEach(g=>g.dispose()),[model]);
 return <group><mesh geometry={model.road} receiveShadow><CityRoadMaterial wet={wet} snow={snow}/></mesh><mesh geometry={model.marks}><meshStandardMaterial vertexColors roughness={.9}/></mesh></group>;
});
