import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {ModelParts,type Vec3} from './modelParts';

let truck:THREE.Group|undefined;
/** Original 6.7 m delivery truck, shared by every factory yard. +Z is the cab end. */
export function getDeliveryTruck(){
  if(truck)return truck;
  const root=new THREE.Group();root.name='truck';root.userData.wheelRadius=.46;
  const paint=new ModelParts(),body=new ModelParts(),glass=new ModelParts(),chassis=new ModelParts();
  const rounded=(parts:ModelParts,p:Vec3,s:Vec3,c:string,r=.06)=>parts.add(new RoundedBoxGeometry(...s,2,r),c,p);
  rounded(paint,[0,1.22,2.12],[2.12,.9,1.9],'#ffffff',.12);
  rounded(paint,[0,2.06,1.96],[2.08,1.25,1.62],'#ffffff',.13);
  rounded(body,[0,2.16,-1.02],[2.36,2.38,4.42],'#dbddd8',.045);
  // Aluminium frame, ribbed cargo panels, roll-up rear door and lift gate.
  for(const side of [-1,1]){
    for(const y of [1.03,3.3])body.box([side*1.2,y,-1.02],[.045,.09,4.46],'#a2a9aa');
    for(let z=-3.1;z<1.2;z+=.34)body.box([side*1.192,2.17,z],[.022,2.13,.021],'#b5bdbc');
    for(const z of [-3.24,1.2])body.box([side*1.19,2.17,z],[.07,2.35,.07],'#989fa0');
    body.box([side*1.205,1.33,-1.02],[.018,.11,4.15],'#586f7d');
    for(const z of [-2.9,-1.6,-.2,.98])body.box([side*1.23,1.09,z],[.028,.09,.17],'#dda64b');
    // Cab windows, door seams, handles, steps and long-arm mirrors.
    rounded(glass,[side*1.048,2.11,2.02],[.027,.77,1.2],'#233e4a',.012);
    paint.box([side*1.066,2.11,1.55],[.035,.84,.055],'#ffffff');
    chassis.box([side*1.08,1.46,1.59],[.025,.047,.22],'#444e53');
    chassis.box([side*1.055,.71,1.06],[.35,.12,.59],'#60676b');
    chassis.box([side*1.055,.88,1.07],[.3,.07,.51],'#b2b9b9');
    chassis.branch([side*1.02,2.03,2.68],[side*1.34,2.16,2.69],.03,.03,'#414b50');
    rounded(chassis,[side*1.35,2.28,2.65],[.12,.36,.22],'#38454b',.035);
    glass.box([side*1.35,2.28,2.53],[.085,.27,.025],'#81929b');
    body.box([side*.77,1.12,3.085],[.42,.21,.055],'#e5eced');
    body.box([side*.98,1.12,3.065],[.12,.19,.065],'#d7a257');
    body.box([side*.87,.91,-3.31],[.25,.13,.04],'#a82f2b');
    chassis.box([side*1.035,.53,-2.74],[.3,.62,.065],'#283035');
    chassis.box([side*1.02,.69,-.38],[.13,.2,1.12],'#8e9798');
  }
  glass.box([0,2.15,2.78],[1.78,.77,.05],'#243f4b',[-.12,0,0]);
  for(const x of [-.52,.52])chassis.branch([x-.2,1.81,2.85],[x+.13,1.87,2.85],.012,.012,'#252f35',6);
  rounded(chassis,[0,.73,3.05],[2.15,.25,.23],'#454f56',.06);
  chassis.box([0,1.1,3.1],[.91,.29,.045],'#2c353a');
  for(let y=.99;y<1.25;y+=.057)body.box([0,y,3.127],[.83,.02,.018],'#aeb9b9');
  body.box([0,.74,3.178],[.4,.12,.024],'#dedccf');
  chassis.box([0,.64,-.1],[1.65,.24,5.8],'#343f44');
  for(let y=1.2;y<3.3;y+=.19)body.box([0,y,-3.249],[2.12,.02,.017],'#989fa0');
  chassis.box([0,.8,-3.31],[2.15,.15,.2],'#778287');
  for(const x of [-.62,.62])body.box([x,1.33,-3.278],[.025,.35,.045],'#747f83');
  const surfaces:[string,ModelParts,number,number][]=[['paint',paint,.29,.4],['cargo',body,.57,.3],['glass',glass,.16,.45],['chassis',chassis,.76,.15]];
  for(const [name,parts,roughness,metalness] of surfaces){
    const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness,metalness});material.name=name;
    const mesh=new THREE.Mesh(parts.finish(),material);mesh.name=`truck_${name}`;root.add(mesh);
  }
  const wheelParts=new ModelParts();
  wheelParts.add(new THREE.TorusGeometry(.345,.115,8,24),'#252b30',[0,0,0],[1,1,1],[0,Math.PI/2,0]);
  wheelParts.add(new THREE.CylinderGeometry(.3,.3,.23,24),'#879193',[0,0,0],[1,1,1],[0,0,Math.PI/2]);
  for(const face of [-1,1]){
    wheelParts.add(new THREE.CylinderGeometry(.115,.115,.03,12),'#bac0bd',[face*.13,0,0],[1,1,1],[0,0,Math.PI/2]);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      wheelParts.add(new THREE.CylinderGeometry(.037,.037,.017,7),'#414d52',[face*.124,Math.sin(a)*.22,Math.cos(a)*.22],[1,1,1],[0,0,Math.PI/2]);
    }
  }
  const wheelGeometry=wheelParts.finish(),wheelMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72});wheelMaterial.name='wheel';
  for(const side of [-1,1])for(const [i,z] of [-2.35,-1.35,2.13].entries()){
    const mesh=new THREE.Mesh(wheelGeometry,wheelMaterial);mesh.position.set(side*1.065,.46,z);mesh.name=`truck_wheel_${side}_${i}`;mesh.userData.wheel=true;root.add(mesh);
  }
  truck=root;return root;
}
