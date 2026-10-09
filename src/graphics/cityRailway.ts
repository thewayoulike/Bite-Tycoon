import {ModelParts} from './modelParts';
import {CITY_EDGE} from './outerCity';

export const RAIL_X=CITY_EDGE+12;
export const TRAIN_WRAP=680;
export function trainTravel(elapsed:number,start:number,direction:1|-1){
  return ((start+direction*elapsed*9+TRAIN_WRAP)%(TRAIN_WRAP*2)+TRAIN_WRAP*2)%(TRAIN_WRAP*2)-TRAIN_WRAP;
}
export function buildRailCorridor(){
  const ground=new ModelParts(),rails=new ModelParts(),details=new ModelParts();
  ground.box([RAIL_X+3.5,.035,0],[19,.065,1600],'#858379');
  for(const x of [RAIL_X,RAIL_X+7]){
    ground.box([x,.12,0],[3.5,.16,1600],'#646766');
    for(const side of [-1,1])rails.box([x+side*.72,.27,0],[.09,.18,1600],'#798589');
    for(let z=-795;z<=795;z+=2)details.box([x,.18,z],[2.35,.12,.24],'#766a58');
  }
  // Passenger station, connected by a short path to the eastern road.
  ground.box([RAIL_X-4.3,.58,92],[3.8,1.05,30],'#b3b0a3');
  details.box([RAIL_X-2.6,1.12,92],[.16,.02,29],'#c6ae62');
  for(const z of [84,100]){
    details.box([RAIL_X-5,2.52,z],[.11,3.1,.11],'#4f5c60');
    details.box([RAIL_X-4.5,1.56,z],[1.5,.12,2.5],'#91765c');
  }
  details.box([RAIL_X-4.6,4.1,92],[4.2,.17,20],'#5b717a');
  for(let step=0;step<4;step++)details.box([RAIL_X-6.6-step*.45,.16+(3-step)*.14,92],[.5,.25,3],'#b6b0a1');
  // Freight loading siding east of the through tracks, behind the industrial district.
  const siding=RAIL_X+14;
  ground.box([siding,.14,-170],[3.5,.18,85],'#656967');
  for(const side of [-1,1])rails.box([siding+side*.72,.27,-170],[.09,.18,85],'#798589');
  for(let z=-210;z<=-130;z+=2)details.box([siding,.18,z],[2.35,.12,.24],'#766a58');
  // A turnout joins the siding to the east track.
  for(const side of [-1,1])details.branch([RAIL_X+7+side*.72,.29,-225],[siding+side*.72,.29,-212],.06,.06,'#798589',5);
  details.box([siding,.6,-127],[2.3,.8,.3],'#9e7350');
  for(const x of [RAIL_X-3,RAIL_X+10])for(const z of [-230,-95,65,125]){
    details.box([x,2,z],[.09,3.6,.09],'#4a575c');details.box([x,3.6,z],[.38,.75,.25],'#29383f');
    details.box([x,3.73,z+.14],[.16,.15,.025],'#80a46b');
  }
  return {ground:ground.finish(),rails:rails.finish(),details:details.finish()};
}
export function buildTrain(freight:boolean){
  const shell=new ModelParts(),glass=new ModelParts(),metal=new ModelParts();
  for(let i=0;i<4;i++){
    const z=-i*7.3;
    metal.box([0,.62,z],[2.45,.3,6.5],'#434d50');
    if(!freight||i===0){
      shell.box([0,1.8,z],[2.4,2.1,6.4],freight?'#657d74':'#c0c6c4');
      shell.box([0,2.89,z],[2.42,.12,6.45],'#6f7d80');
      for(const side of [-1,1]){
        shell.box([side*1.22,1.3,z],[.04,.32,6.2],freight?'#b29963':'#5d7d92');
        for(const dz of freight?[1.5,2.5]:[-2.4,-.8,.8,2.4])glass.box([side*1.225,2.18,z+dz],[.025,.64,freight?.65:1.18],'#344f5b');
      }
      glass.box([0,2.18,z+3.22],[1.88,.72,.04],'#304953');
      for(const side of [-1,1])shell.box([side*.83,1.2,z+3.23],[.3,.22,.05],'#e6daba');
    }else{
      shell.box([0,1.93,z],[2.35,2.3,6.25],['#c0c6c4','#8b6658','#6e8284','#8d8969'][i]);
      for(const side of [-1,1])for(let dz=-2.9;dz<3;dz+=.45)metal.box([side*1.19,1.95,z+dz],[.04,2.15,.055],'#5b6968');
    }
    for(const side of [-1,1])for(const dz of [-2.1,2.1])metal.box([side*1.1,.45,z+dz],[.3,.64,1.0],'#343e42');
    if(i<3)metal.box([0,.69,z-3.6],[.35,.15,.8],'#414b4d');
  }
  return {shell:shell.finish(),glass:glass.finish(),metal:metal.finish()};
}
