import type {EmpireState} from '../empire/empire';
export type CareerSettings={mode:'career'|'sandbox';weekMinutes:3|14;guide:boolean};
export const settings=(e:EmpireState):CareerSettings=>({mode:e.testingUnlocked?'sandbox':'career',weekMinutes:e.settings?.weekMinutes===14?14:3,guide:e.settings?.guide!==false});
export const simulationRate=(e:EmpireState)=>3/settings(e).weekMinutes;
export function changeSettings(e:EmpireState,changes:Partial<CareerSettings>):EmpireState{
 const old=settings(e);if(changes.weekMinutes!==undefined&&(![3,14].includes(changes.weekMinutes)||Object.values(e.restaurants).some(r=>r.phase!=='planning')))return e;
 return {...e,settings:{...old,...changes,mode:old.mode}};
}
export function careerMilestones(e:EmpireState){
 const r=e.restaurants.diner,bs=Object.values(e.district.businesses);
 return [
 {id:'type',title:'Choose your first menu',done:!!r.restaurantType,hint:'Select a restaurant type, then review its six opening dishes.'},
 {id:'guests',title:'Serve your first six guests',done:r.stats.customersServed>=6,hint:'Take orders, cook and serve. Clear tables so another party can sit.'},
 {id:'team',title:'Hire your first floor waiter',done:r.staff.waiters>0,hint:'Staff & Shop opens this role after six guests. Keep wages and stock money aside.'},
 {id:'profit',title:'Finish a profitable week',done:(r.performance?.profitableStreak??0)>0,hint:'Read the weekly P&L. Food used and wages count as costs; buying assets is separate.'},
 {id:'menu',title:'Reach restaurant Level 2',done:(r.restaurantLevel??1)>=2,hint:'Serve 60 guests, save $750 and protect bills and starting ingredients. Additional levels bring 15% more walk-in demand each.'},
 {id:'second',title:'Open a second business',done:bs.length>1,hint:'Choose a neighborhood property. Use a recorded loan; keep operating cash in both accounts.'},
 {id:'floor',title:'Earn your first upper floor',done:bs.some(b=>(b.lodging?.openFloors??1)>1||(b.plaza?.openFloors??1)>1||b.retail?.electronicsUnlocked),hint:'Satisfy the property’s service checks and inspect its full cash forecast.'}
 ];
}
