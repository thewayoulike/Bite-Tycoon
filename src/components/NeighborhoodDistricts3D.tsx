import {memo,useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {CITY_LOTS,CityLot} from '../graphics/cityDistrictLayout';
import {buildCityLot} from '../graphics/cityLotModel';
import {getSignTexture,getSurfaceMaterial} from '../graphics/surfaceMaterials';
import {StylizedTree3D,RoundedCarBody3D} from './StreetAssets3D';
import {ResidentialHouses3D,useResidentialHouseParts} from './ResidentialHouses3D';
import {DISTRICT_HOUSES} from '../graphics/residentialLayout';
import {SnowSurfaceMaterial} from './SnowSurfaceMaterial';

const houseColors=['#a77760','#c7bdae','#897d70','#b59c81','#927260'];
const shopColors=['#3f535d','#66735d','#80594c','#6f6661','#4b6470','#685c51'];
function Sign({text,position,width=7,color='#35464d'}:{text:string;position:[number,number,number];width?:number;color?:string}){
 return <group position={position}><mesh><boxGeometry args={[width,.7,.16]}/><meshStandardMaterial color={color} roughness={.75}/></mesh><mesh position={[0,0,.087]}><planeGeometry args={[width-.24,.51]}/><meshBasicMaterial map={getSignTexture(text)} transparent depthWrite={false}/></mesh></group>;
}

const CityLot3D=memo(function CityLot3D({lot,index,isNight,modeledHomes}:{lot:CityLot;index:number;isNight:boolean;modeledHomes:boolean}){
 const homes=lot.kind==='homes',park=lot.kind==='playground'||lot.kind==='square';
 const model=useMemo(()=>buildCityLot(lot,index,modeledHomes),[lot,index,modeledHomes]);
 useEffect(()=>()=>Object.values(model).forEach(g=>g.dispose()),[model]);
 const retail=lot.kind==='shops',supermarket=lot.kind==='supermarket',garage=lot.kind==='garage'||lot.kind==='firestation';
 const height=retail?6.6:supermarket?4.5:garage?4.8:lot.kind==='offices'?12.6:7.2;
 const wall=lot.kind==='clinic'?'#c8c4ba':lot.kind==='offices'?'#9a9c99':lot.kind==='firestation'?'#955c48':lot.kind==='library'?'#a3947e':retail?'#ab8e74':'#9d7962';
 return <group position={lot.position} rotation={[0,lot.rotation??0,0]} name={`city-scenery-${lot.id}`}>
  {(homes||park)&&<mesh position={[0,.125,0]} receiveShadow><boxGeometry args={[17.9,.09,17.9]}/><SnowSurfaceMaterial vertexColors={false} map={getSurfaceMaterial(lot.kind==='square'?'concrete':'grass',lot.kind==='square'?'#bcb4a5':'#788068',8,8).map}/></mesh>}
  {homes?(!modeledHomes&&[-4.1,4.1].map((x,i)=><mesh key={x} position={[x,(5.45+(index%2)*.35)/2,-1]} material={getSurfaceMaterial('brick',houseColors[(index+i)%houseColors.length],2.4,2)} castShadow receiveShadow><boxGeometry args={[7,5.45+(index%2)*.35,8]}/></mesh>)):!park&&<mesh position={[0,height/2,supermarket?-2.3:0]} material={getSurfaceMaterial(lot.kind==='clinic'||lot.kind==='offices'?'concrete':'brick',wall,4,height/2)} castShadow receiveShadow><boxGeometry args={[16,height,supermarket?11:12]}/></mesh>}
  <mesh geometry={model.solid} castShadow receiveShadow><SnowSurfaceMaterial/></mesh>
  <mesh geometry={model.glass}><meshStandardMaterial vertexColors roughness={.25} metalness={.3} envMapIntensity={.6}/></mesh>
  <mesh geometry={model.lit}><meshStandardMaterial vertexColors emissive={isNight?'#e6bd84':'#000000'} emissiveIntensity={isNight?.7:0}/></mesh>
  {retail?lot.names?.map((text,i)=><Sign key={text} text={text} position={[i?4:-4,3.85,6.16]} width={7.7} color={shopColors[(index+i)%shopColors.length]}/>):lot.names?.map(text=><Sign key={text} text={text} position={[0,supermarket?3.82:garage?4.08:3.7,supermarket?4.87:6.18]} width={14.2} color={lot.kind==='firestation'?'#7a4036':supermarket?'#4a6352':'#465459'}/>)}
  {park&&[-6.4,6.4].map((x,i)=><StylizedTree3D key={x} position={[x,.18,0]} seed={index+i} scale={.7} gameSpeed={0}/>)}
  {homes&&<StylizedTree3D position={[-6.5,.18,6.4]} seed={index+22} scale={.52} gameSpeed={0}/>}
  {supermarket&&<group position={[3.5,.12,6.55]} scale={.65} rotation={[0,Math.PI/2,0]}><RoundedCarBody3D color="#9d9c93" isNight={isNight} speed={2} gameSpeed={0}/></group>}
 </group>;
});

export const NeighborhoodDistricts3D=memo(function NeighborhoodDistricts3D({isNight,snow=0,developments=false,developmentKey='',onSelect}:{isNight:boolean;snow?:number;developments?:boolean;developmentKey?:string;onSelect?:(id:string)=>void}){
 const houses=useResidentialHouseParts();
 return <group name="residential-commercial-civic-districts">{CITY_LOTS.filter(lot=>!developments||(!['gym-hardware','barber-pharmacy'].includes(lot.id)&&!developmentKey.split('|').includes('site-'+lot.id))).map((lot,index)=><group key={lot.id} onClick={e=>{if(developments&&lot.zone==='commercial'&&e.delta<=4){e.stopPropagation();onSelect?.('plot-site-'+lot.id);}}}><CityLot3D lot={lot} index={index} isNight={isNight} modeledHomes={!!houses}/></group>) }{houses&&<ResidentialHouses3D parts={houses} placements={DISTRICT_HOUSES} isNight={isNight} snow={snow}/>}</group>;
});
