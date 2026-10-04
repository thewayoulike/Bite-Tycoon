import type {GameState} from '../hooks/useGameLoop';
import type {Business,Property} from '../prototype/expansionModel';

export type Shift='all'|'morning'|'afternoon'|'night';
export type Employee={id:string;name:string;role:string;basePay:number;pay:number;skill:number;energy:number;shift:Shift;zone:number;station:string;training:number;task:string};
export type CrewAction={type:'shift';id:string;shift:Shift}|{type:'zone';id:string;zone:number}|{type:'station';id:string;station:string}|{type:'raise'|'train'|'break';id:string};
const names=['Alex Morgan','Sam Rivera','Taylor Chen','Jordan Patel','Casey Brooks','Noor Khan','Jamie Wilson','Riley Ahmed','Avery Lewis','Robin Park','Charlie Evans','Drew Santos','Skyler Ali','Morgan Reed','Cameron Lee','Blair Davis','Sage Turner','Dylan Scott','Emery Singh','Logan Woods'];
export const onShift=(e:Employee,hour:number)=>e.shift==='all'||(e.shift==='morning'?hour>=6&&hour<14:e.shift==='afternoon'?hour>=14&&hour<22:hour>=22||hour<6);
export const available=(e:Employee,hour:number)=>onShift(e,hour)&&e.training<=0&&e.energy>=20&&e.task!=='On break';
export function crewSpecs(p:Property,b:Business,r?:GameState){
 if(r)return [{role:'chef',count:r.staff.chefs,pay:35},{role:'waiter',count:r.staff.waiters,pay:24},{role:'cleaner',count:r.staff.cleaners,pay:15},{role:'manager',count:Number(r.staff.hasManager),pay:45}];
 const roles=new Set(['service','care',...Object.keys(b.hires??{}),'manager']);
 return [...roles].map(role=>({role,count:role==='manager'?Number(!!b.manager):(['service','care'].includes(role)?1:0)+(b.hires?.[role]??0),pay:role==='manager'?60:35}));
}
export function ensureCrew(p:Property,b:Business,r?:GameState):Employee[]{
 const old=r?.crew??b.crew??[],result:Employee[]=[];
 for(const spec of crewSpecs(p,b,r))for(let i=0;i<spec.count;i++){
  const id=`${spec.role}-${i}`,found=old.find(e=>e.id===id),seed=[...p.id+id].reduce((n,c)=>n+c.charCodeAt(0),0);
  result.push(found??{id,name:Array.from({length:names.length},(_,n)=>names[(seed+n)%names.length]).find(name=>!result.some(e=>e.name===name))??`${names[seed%names.length]} ${i+1}`,role:spec.role,basePay:!r&&i===0&&['service','care'].includes(spec.role)?p.wages/2:spec.pay,pay:!r&&i===0&&['service','care'].includes(spec.role)?p.wages/2:spec.pay,skill:1,energy:100,shift:'all',zone:-1,station:'all',training:0,task:'Ready'});
 }
 return result;
}
export const crewPremium=(crew?:Employee[])=>crew?.reduce((n,e)=>n+Math.max(0,e.pay-e.basePay),0)??0;
export function crewPower(crew:Employee[]|undefined,role:string,hour:number,fallback:number,zone=-1){
 if(!crew)return fallback;
 return crew.filter(e=>e.role===role&&available(e,hour)&&(zone<0||e.zone<0||e.zone===zone)).reduce((n,e)=>n+(1+(e.skill-1)*.1)*(e.energy<40?.7:1),0);
}
export function advanceCrew(crew:Employee[],dt:number,hour:number,tasks:Record<string,string>):Employee[]{
 return crew.map(e=>{
  if(e.training>0){const remaining=Math.max(0,e.training-dt);return {...e,training:remaining,skill:remaining===0?Math.min(5,e.skill+1):e.skill,task:remaining?'Training':'Ready'};}
  const active=onShift(e,hour),rest=e.task==='On break'&&e.energy<90||e.energy<20;
  const task=!active?'Off shift':rest?'On break':tasks[e.role]??'Ready';
  const working=active&&!rest&&task!=='Ready';
  return {...e,task,energy:Math.max(0,Math.min(100,e.energy+dt*(working?-.28/(1+(e.skill-1)*.1):1.6)))};
 });
}
export function editCrew(crew:Employee[],cash:number,action:CrewAction,maxFloor=0){
 const e=crew.find(e=>e.id===action.id);if(!e)return {crew,cost:0};let next={...e},cost=0;
 if(action.type==='shift'){if(!['all','morning','afternoon','night'].includes(action.shift))return {crew,cost:0};next.shift=action.shift;}
 if(action.type==='zone'){if(!Number.isInteger(action.zone)||action.zone< -1||action.zone>maxFloor)return {crew,cost:0};next.zone=action.zone;}
 if(action.type==='station'){if(!['all','grill','oven','cold','drinks'].includes(action.station)||e.role!=='chef')return {crew,cost:0};next.station=action.station;}
 if(action.type==='raise'){if(e.pay>=e.basePay*2)return {crew,cost:0};next.pay=Math.min(e.basePay*2,e.pay+5);}
 if(action.type==='break')next.task='On break';
 if(action.type==='train'){cost=100*e.skill;if(e.training>0||e.skill>=5||cash<cost)return {crew,cost:0};next.training=30;next.task='Training';}
 return {crew:crew.map(v=>v.id===e.id?next:v),cost};
}
