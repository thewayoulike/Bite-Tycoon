import {memo,useEffect,useMemo} from 'react';
import * as THREE from 'three';
import {CITY_LOTS,CityLot} from '../graphics/cityDistrictLayout';
import {ModelParts} from '../graphics/modelParts';
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

/** All small fixtures for each address are merged into a few meshes. */
function streetFront(m:ModelParts,g:ModelParts,x:number,y:number,z:number,w:number,h:number,door=false){
 m.box([x,y,z],[w+.14,h+.14,.15],'#ddd5c6');
 g.box([x,y,z+.085],[w,h,.045],'#455862');
 for(const dx of [-w/2,0,w/2])m.box([x+dx,y,z+.13],[.065,h,.08],'#3b4245');
 m.box([x,y-h/2,z+.12],[w+.28,.13,.26],'#b9b4a9');
 if(door)m.box([x+.22,y-.08,z+.2],[.035,.38,.04],'#bca57b');
 else m.box([x,y-h*.07,z+.14],[w,.05,.05],'#b1b1a6');
}
function bench(m:ModelParts,x:number,z:number,rotation=0){
 // Scene benches face the path; legs and back use the same local orientation.
 const b=(dx:number,y:number,dz:number,size:[number,number,number],color:string)=>m.box([x+dx*Math.cos(rotation)+dz*Math.sin(rotation),y,z-dx*Math.sin(rotation)+dz*Math.cos(rotation)],size,color,[0,rotation,0]);
 b(0,.57,0,[2.5,.13,.65],'#947354');b(0,.93,-.3,[2.5,.6,.1],'#947354');
 for(const dx of [-.92,.92])b(dx,.3,0,[.1,.6,.6],'#444b4d');
}
function fence(m:ModelParts,x:number,z:number,length:number,side=false){
 for(let i=0;i<=length;i+=.55)m.box([x+(side?0:i),.64,z+(side?i:0)],side?[.07,1.15,.09]:[.09,1.15,.07],'#a39a86');
 for(const y of [.32,.97])m.box([x+(side?0:length/2),y,z+(side?length/2:0)],side?[.08,.08,length]:[length,.08,.08],'#887d69');
}
function pitchedRoof(m:ModelParts,x:number,height:number,z:number,w:number,d:number,color:string){
 const rise=1.8,half=w/2+.35,angle=Math.atan2(rise,half),slope=Math.hypot(half,rise);
 for(const s of [-1,1])m.box([x+s*half/2,height+rise/2,z],[slope,.16,d+.75],color,[0,0,-s*angle]);
 // Closed gable ends prevent the floating-roof appearance.
 const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(0,rise);shape.closePath();
 for(const s of [-1,1])m.add(new THREE.ShapeGeometry(shape),'#c1b7a5',[x,height,z+s*d/2],[1,1,1],[0,s<0?Math.PI:0,0]);
 m.box([x+2,height+1.4,z-1.8],[.62,2.1,.72],'#86604c');
 m.box([x+2,height+2.49,z-1.8],[.76,.12,.88],'#b1a894');
}

const CityLot3D=memo(function CityLot3D({lot,index,isNight,modeledHomes}:{lot:CityLot;index:number;isNight:boolean;modeledHomes:boolean}){
 const homes=lot.kind==='homes',park=lot.kind==='playground'||lot.kind==='square';
 const model=useMemo(()=>{
  const m=new ModelParts(),glass=new ModelParts(),lit=new ModelParts();
  // Provide every batch with a real, unobtrusive component, even on park lots.
  m.box([0,.15,0],[.1,.1,.1],'#aaa69a');glass.box([7.4,1,-7.5],[.42,.65,.04],'#637980');lit.box([7.4,1.4,-7.5],[.46,.1,.12],'#dfcaa4');
  if(homes){
   for(const [i,x] of [-4.1,4.1].entries()){
    if(!modeledHomes){
    const height=5.45+(index%2)*.35;
    pitchedRoof(m,x,height,-1,7,8, index%2?'#626367':'#63554d');
    m.box([x,.31,-1],[7.14,.4,8.14],'#9e9487');
    for(const y of [1.85,4.25])for(const dx of [-1.95,1.95]){
     streetFront(m,glass,x+dx,y,3.02,1.35,1.5);
     // Rear windows give homes a finished silhouette from every street.
     m.box([x+dx,y,-5.05],[1.6,1.7,.12],'#d6d0c4');glass.box([x+dx,y,-5.13],[1.35,1.5,.05],'#54616a');
     if((i+index)%2===0)lit.box([x+dx,y,3.13],[.52,.85,.01],'#bcae90');
    }
    streetFront(m,glass,x,1.4,3.04,1.15,2.5,true);
    m.box([x,2.9,3.65],[2.4,.13,1.5],'#645d54');
    for(const dx of [-1.05,1.05])m.box([x+dx,1.4,4.2],[.11,2.8,.11],'#cfc5b3');
    for(let k=0;k<3;k++)m.box([x,.16+k*.12,4.6-k*.35],[2.4,.16,.9],'#b1a89a');
    }
    m.box([x,.15,6.6],[1.45,.035,3.6],'#b9b2a3');
    m.box([x-2.5,.23,6.2],[2,.12,3.8],'#657051');
    for(const z of [-8.5,-5.8])fence(m,x-3.5,z,7);
    fence(m,x-3.5,-8.5,2.7,true);
    for(const dx of [-2.5,2.5]){m.box([x+dx,.65,3.7],[.8,.45,.55],'#82705c');m.ellipsoid([x+dx,.95,3.7],[.52,.37,.42],'#697453');}
    m.box([x+2.9,.66,7.3],[.48,.72,.35],'#454e50');m.box([x+2.9,.24,7.3],[.08,.48,.08],'#69665c');
    m.box([x+2.5,.56,-6.2],[.62,1,.7],'#4b5751');
   }
  }else if(park){
   m.box([0,.19,0],[2.25,.04,17.8],'#c7bea9');m.box([0,.2,0],[17.8,.04,2.1],'#c7bea9');
   for(const x of [-6,6])for(const z of [-6,6]){bench(m,x,z,z>0?Math.PI:0);m.box([x,.28,z+1.3],[2.8,.36,.6],'#a9987e');for(let i=0;i<5;i++)m.ellipsoid([x-1+i*.5,.63,z+1.3],[.38,.32,.33],'#69734f');}
   if(lot.kind==='playground'){
    m.box([-3.7,.22,-3.5],[6.4,.04,6.2],'#8f8170');
    for(const x of [-6,-1.5])for(const s of [-1,1])m.branch([x,.2,-4+s*1.1],[x,3.1,-4],.08,.07,'#806d55');
    m.branch([-6,3.1,-4],[-1.5,3.1,-4],.085,.085,'#806d55');
    for(const x of [-4.9,-2.7]){for(const dx of [-.28,.28])m.branch([x+dx,3,-4],[x+dx,.65,-4],.02,.02,'#60696b');m.box([x,.65,-4],[.72,.08,.45],'#455560');}
    m.box([4.2,.22,4.2],[5,.04,5],'#ad9974');
    for(const x of [3.3,4.8])for(const z of [2.7,4.2])m.box([x,1.1,z],[.13,2.2,.13],'#7c6852');
    m.box([4.05,2,3.45],[1.7,.14,1.7],'#986e47');m.box([4.05,1.18,5.4],[1.45,.1,3.8],'#8caaaf',[-.52,0,0]);
   }else{
    // Hard-landscaped town square, not another lawn-covered block.
    m.add(new THREE.CylinderGeometry(2.4,2.65,.45,24),'#aaa496',[-4,.4,-3]);m.add(new THREE.CylinderGeometry(2.15,2.15,.05,24),'#758f94',[-4,.65,-3]);
    m.add(new THREE.CylinderGeometry(.55,.8,1.5,16),'#aaa496',[-4,1.2,-3]);
    for(const x of [3.2,6.2]){m.box([x,1,3],[2.4,.12,1.3],'#92795d');for(const dx of [-1,1])m.box([x+dx,1.2,3],[.07,2.4,.07],'#5f6257');for(let k=0;k<6;k++)m.box([x-1.05+k*.42,2.45,3],[.42,.08,2.4],k%2?'#ded7c5':'#656f5d');}
   }
  }else{
   const retail=lot.kind==='shops',supermarket=lot.kind==='supermarket',garage=lot.kind==='garage'||lot.kind==='firestation';
   const height=retail?6.6:supermarket?4.5:garage?4.8:lot.kind==='offices'?12.6:7.2;
   const front=supermarket?3.2:6,depth=supermarket?11:12;
   m.box([0,height+.12,front-depth/2],[16.35,.22,depth+.25],'#706e68');
   for(const side of [-1,1])m.box([side*7.95,height+.43,front-depth/2],[.2,.6,depth],'#a49c8f');
   m.box([0,height+.43,front-depth],[16,.6,.2],'#a49c8f');
   for(const x of [-4,3.5]){m.box([x,height+.62,-2],[1.9,.8,1.4],'#8e9291');for(let k=0;k<6;k++)m.box([x-.75+k*.3,height+.64,-1.28],[.045,.5,.025],'#4b5357');}
   if(garage){
    for(const x of [-4,2]){
     m.box([x,1.8,front+.05],[4.6,3.25,.16],'#b1b4b1');
     for(let y=.4;y<3.3;y+=.36)m.box([x,y,front+.15],[4.4,.045,.035],'#6f7677');
     glass.box([x,2.55,front+.17],[3.8,.55,.025],'#485b64');
    }
    if(lot.kind==='firestation')m.box([6.7,height+1.35,-3],[2.5,3,3],'#8c5446');
   }else{
    const bays=retail?[-6,-2,2,6]:[-5.5,-2,2,5.5];
    for(const x of bays){streetFront(m,glass,x,1.55,front+.04,retail?3.45:2.9,2.45,Math.abs(x)===2);}
    if(retail){
     for(const x of [-4,4]){
      for(let stripe=0;stripe<10;stripe++)m.box([x-3.45+stripe*.76,3.17,6.72],[.76,.09,1.45],stripe%2?'#d5cab7':shopColors[index%shopColors.length],[-.09,0,0]);
      for(const dx of [-2,2])streetFront(m,glass,x+dx,5.1,6.025,1.35,1.65);
     }
     m.box([0,3.35,6.15],[.24,6.7,.25],'#b6ac9c');
    }else for(let y=4.9;y<height-.6;y+=2.9)for(const x of [-5.6,-2.8,0,2.8,5.6])streetFront(m,glass,x,y,6.025,lot.kind==='offices'?2.15:1.6,1.85);
    // Side windows keep civic and commercial buildings credible from an oblique camera.
    for(let y=1.7;y<height-1;y+=2.9)for(const z of [-4,-.6,2.8])for(const side of [-1,1]){
     m.box([side*8.045,y,z],[.12,1.8,1.55],'#bdb6a7');glass.box([side*8.12,y,z],[.03,1.62,1.35],'#52616a');
    }
   }
   if(supermarket){
    m.box([0,3.9,3.7],[16.3,.18,2.2],'#5f685a');
    for(const x of [-7.5,7.5])m.box([x,1.9,4.5],[.13,3.8,.13],'#626966');
    for(const x of [-6.5,-3.4,3.4,6.5]){m.box([x,.2,6.8],[.065,.018,3.8],'#ded9c9');m.box([x,1.25,4.6],[.1,2.2,.1],'#8a978f');}
    // Nested shopping trolleys beneath the entrance canopy.
    for(let k=0;k<4;k++){m.box([-6.2,.66,4.3+k*.38],[.7,.4,.72],'#9babae');m.box([-6.2,1,4.65+k*.38],[.78,.06,.06],'#596d59');}
   }
   if(lot.id==='barber-pharmacy'){
    for(let k=0;k<11;k++)m.add(new THREE.CylinderGeometry(.18,.18,.11,10),k%3===0?'#a6473d':k%3===1?'#e4ded0':'#44637c',[-7.4,1.8+k*.11,6.4]);
    m.box([7.3,2.6,6.25],[.9,.24,.1],'#73946f');m.box([7.3,2.6,6.26],[.24,.9,.1],'#73946f');
   }
   if(lot.kind==='clinic'){
    m.box([0,6.3,6.18],[1.7,.48,.14],'#9a554e');m.box([0,6.3,6.2],[.48,1.7,.14],'#9a554e');
    m.box([5.7,.27,7.3],[4.4,.15,1.8],'#b9b3a8',[0,0,.07]);
   }
   if(lot.kind==='school'){
    m.add(new THREE.CylinderGeometry(.65,.65,.1,24),'#dad4c4',[0,6.05,6.19],[1,1,1],[Math.PI/2,0,0]);
    m.box([0,6.25,6.26],[.055,.43,.025],'#4a5051');m.box([.17,6.05,6.26],[.38,.055,.025],'#4a5051');
   }
   if(lot.kind==='library'){
    for(const x of [-5.6,-2.8,2.8,5.6])m.box([x,1.55,6.6],[.32,3.1,.38],'#c2b8a6');
    m.box([0,3.25,6.65],[14,.23,1.3],'#bcb3a2');
   }
   for(const x of [-7.3,7.3]){m.box([x,.45,7.1],[1,.65,1],'#9b8f7a');m.ellipsoid([x,.98,7.1],[.64,.5,.61],'#637051');}
   // Warm light behind selected panes; no per-building point lights.
   lit.box([5.5,1.6,front+.14],[1.1,1.4,.012],'#b7a78b');
  }
  return {solid:m.finish(),glass:glass.finish(),lit:lit.finish()};
 },[lot,index,homes,park,modeledHomes]);
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
