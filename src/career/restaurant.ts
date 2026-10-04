import {weeklyWages} from '../gameplay';
import {crewPremium} from './crew';
import type {GameState} from '../hooks/useGameLoop';
import type {Recipe} from '../data/recipes';
import {restaurantCatalog,RestaurantType} from '../data/restaurantCatalogs';
import {consumeBatches} from '../inventory/stockroom';
import {available} from './crew';
export type Station='grill'|'oven'|'cold'|'drinks';
export type Catering={id:string;week:number;day:number;recipeId:string;qty:number;price:number;progress?:number;status:'accepted'|'preparing'|'completed'|'missed'};
export type RestaurantDepth={schedules:{season?:string;day:number;period:'all'|'breakfast'|'lunch'|'dinner';menu:string[]}[];stations:Record<Station,number>;catering:Catering[];terrace:boolean;terraceOperational?:boolean;lastDay:number;notice:string};
export const restaurantDepth=(r:GameState):RestaurantDepth=>r.advanced??{schedules:[],stations:{grill:100,oven:100,cold:100,drinks:100},catering:[],terrace:false,lastDay:-1,notice:''};
export function recipeStation(r:Recipe):Station{return /coffee|tea|juice|soda|milkshake|spritzer|affogato|espresso|latte|water/i.test(r.name)?'drinks':/salad|ice cream|gelato|mousse|sushi|posset|cold/i.test(r.name)?'cold':/pizza|bread|cake|tart|lasagna|roast|bake|pastry|croissant|biscuit/i.test(r.name)?'oven':'grill';}
export const menuSeason=(week:number)=>['spring','summer','autumn','winter'][Math.floor((week-1)/4)%4];
export function scheduledMenu(r:GameState){
 const day=Math.min(7,Math.floor(r.time*7/100)+1),hour=(8+r.time*7*24/100)%24,period=hour<11?'breakfast':hour<17?'lunch':'dinner';
 const schedules=restaurantDepth(r).schedules.filter(s=>!s.season||s.season==='all'||s.season===menuSeason(r.week)).sort((a,b)=>Number(!!b.season&&b.season!=='all')-Number(!!a.season&&a.season!=='all'));
 return (schedules.find(s=>s.day===day&&s.period===period)??schedules.find(s=>s.day===day&&s.period==='all'))?.menu.filter(id=>r.activeMenu.includes(id))??r.activeMenu;
}
export function saveMenuSchedule(r:GameState,day:number,period:RestaurantDepth['schedules'][number]['period'],menu:string[],season='all'):GameState{
 if(!['all','spring','summer','autumn','winter'].includes(season)||!Number.isInteger(day)||day<1||day>7||!['all','breakfast','lunch','dinner'].includes(period)||!menu.length||menu.some(id=>!r.activeMenu.includes(id)))return r;
 const d=restaurantDepth(r);return {...r,advanced:{...d,schedules:[...d.schedules.filter(v=>v.day!==day||v.period!==period||(v.season??'all')!==season),{day,period,season,menu:[...new Set(menu)]}],notice:'Scheduled subset saved. Ingredients and kitchen capacity remain shared.'}};
}
export function importResearchDish(r:GameState,type:RestaurantType,id:string):GameState{
 if((r.restaurantLevel??1)<3||type===r.restaurantType)return r;
 const recipe=restaurantCatalog(type).recipes.find(v=>v.id===id),key=`custom_guest_${id}`;
 if(!recipe||r.recipes.some(v=>v.id===key)||r.money<recipe.unlockCost)return r;
 return {...r,money:r.money-recipe.unlockCost,recipes:[...r.recipes,{...recipe,id:key,unlocked:true}],stats:{...r.stats,recipeCosts:r.stats.recipeCosts+recipe.unlockCost,totalExpenses:r.stats.totalExpenses+recipe.unlockCost}};
}
export function cateringOffers(r:GameState):Catering[]{const dishes=r.recipes.filter(v=>r.activeMenu.includes(v.id));return (r.restaurantLevel??1)<4?[]:[2,4,6].map((day,i)=>{const recipe=dishes[i%dishes.length];return recipe?{id:`catering-${r.week}-${day}`,week:r.week,day,recipeId:recipe.id,qty:8,price:Math.round(recipe.price*8*.9),status:'accepted' as const}:null;}).filter((v):v is NonNullable<typeof v>=>!!v);}
export function acceptCatering(r:GameState,id:string):GameState{const offer=cateringOffers(r).find(o=>o.id===id),d=restaurantDepth(r);if(!offer||Math.floor(r.time*7/100)+1>=offer.day||d.catering.some(c=>c.id===id))return r;return {...r,advanced:{...d,catering:[...d.catering,offer]}};}
export function serveCatering(r:GameState,id:string):GameState{
 const d=restaurantDepth(r),order=d.catering.find(c=>c.id===id&&['accepted','preparing'].includes(c.status)),recipe=r.recipes.find(v=>v.id===order?.recipeId),day=Math.min(7,Math.floor(r.time*7/100)+1);
 if(!order||!recipe||r.phase!=='service'||day!==order.day||Object.entries(recipe.ingredients).some(([id,qty])=>(r.inventory[id]??0)<qty*order.qty)||order.status==='accepted'&&r.orders.some(o=>o.state!=='ready')||d.stations[recipeStation(recipe)]<20)return r;
 const hour=(8+r.time*7*24/100)%24;if(r.crew&&!r.crew.some(e=>e.role==='chef'&&available(e,hour)))return r;
 if(order.status==='accepted')return {...r,advanced:{...d,catering:d.catering.filter(c=>c.week>=r.week-16).map(c=>c.id===id?{...c,status:'preparing',progress:0}:c),notice:'Kitchen reserved for catering. Preparation uses chef time; portions are charged and dispatched when ready.'}};
 if((order.progress??0)<100)return r;
 const inventory={...r.inventory},batches={...r.inventoryBatches};let cost=0;
 for(const [key,qty] of Object.entries(recipe.ingredients)){const used=consumeBatches(batches[key]??[],qty*order.qty);inventory[key]-=qty*order.qty;batches[key]=used.left;cost+=used.cost;}
 return {...r,money:r.money+order.price,inventory,inventoryBatches:batches,advanced:{...d,catering:d.catering.filter(c=>c.week>=r.week-16).map(c=>c.id===id?{...c,status:'completed'}:c),notice:`Catering dispatched: ${order.qty} portions. Kitchen was clear and ingredients consumed.`},stats:{...r.stats,totalEarned:r.stats.totalEarned+order.price,itemsSold:{...r.stats.itemsSold,[recipe.id]:(r.stats.itemsSold[recipe.id]??0)+order.qty},itemRevenues:{...r.stats.itemRevenues,[recipe.id]:(r.stats.itemRevenues[recipe.id]??0)+order.price}},weekStats:{...r.weekStats,revenue:r.weekStats.revenue+order.price,foodCost:r.weekStats.foodCost+cost,itemsSold:{...r.weekStats.itemsSold,[recipe.id]:(r.weekStats.itemsSold[recipe.id]??0)+order.qty}}};
}
export function advanceRestaurantDepth(r:GameState,dt:number):GameState{
 if(!r.advanced)return r;const d=restaurantDepth(r),day=(r.week-1)*7+Math.min(7,Math.floor(r.time*7/100)+1),stations={...d.stations};
 for(const station of Object.keys(stations) as Station[])if(r.orders.some(o=>o.state!=='ready'&&recipeStation(r.recipes.find(v=>v.id===o.recipeId)??r.recipes[0])===station))stations[station]=Math.max(0,stations[station]-dt*.025);
 let next={...r,advanced:{...d,stations,lastDay:day,catering:d.catering.filter(c=>c.week>=r.week-16).map(c=>['accepted','preparing'].includes(c.status)&&((c.week-1)*7+c.day)<day?{...c,status:'missed' as const}:c)}};
 const order=next.advanced.catering.find(c=>c.status==='preparing'),recipe=order&&r.recipes.find(v=>v.id===order.recipeId),hour=(8+r.time*7*24/100)%24;
 if(order&&recipe&&r.phase==='service'&&stations[recipeStation(recipe)]>=20){const cooks=r.crew?.filter(e=>e.role==='chef'&&available(e,hour)&&(e.station==='all'||e.station===recipeStation(recipe)));const power=cooks?.reduce((n,e)=>n+1+(e.skill-1)*.1,0)??r.staff.chefs;
  next={...next,advanced:{...next.advanced,catering:next.advanced.catering.map(c=>c.id===order.id?{...c,progress:Math.min(100,(c.progress??0)+dt*100*power/Math.max(3,recipe.cookingTime*order.qty))}:c)}};
  next=serveCatering(next,order.id) as typeof next;
 }
 if(d.terrace&&r.phase==='service'){const cost=15*dt/180,operational=next.money>=cost;next={...next,advanced:{...next.advanced,terraceOperational:operational,notice:!operational?'Terrace temporarily closed: waiting for upkeep funds.':d.terraceOperational===false?'Terrace reopened after upkeep was funded.':next.advanced.notice},money:next.money-(operational?cost:0),stats:{...next.stats,maintenanceCosts:(next.stats.maintenanceCosts??0)+(operational?cost:0),totalExpenses:next.stats.totalExpenses+(operational?cost:0)}};}
 return next;
}
export function repairStation(r:GameState,station:Station):GameState{
 const d=restaurantDepth(r),cost=60;if(!(station in d.stations)||d.stations[station]>=99||r.money<cost)return r;
 return {...r,money:r.money-cost,stats:{...r.stats,maintenanceCosts:(r.stats.maintenanceCosts??0)+cost,totalExpenses:r.stats.totalExpenses+cost},advanced:{...d,stations:{...d.stations,[station]:100}}};
}

export function buildTerrace(r:GameState):GameState{
 const d=restaurantDepth(r),bills=weeklyWages(r.staff)+crewPremium(r.crew)+r.pendingPayroll.reduce((n,p)=>n+p.amount,0)+(r.cashProtection?.total??0)+(r.manager.reserve??0),cost=1800;
 if(r.phase!=='planning'||(r.restaurantLevel??1)<5||d.terrace||r.money-cost<bills)return r;
 return {...r,money:r.money-cost,advanced:{...d,terrace:true,notice:'Planted waiting terrace opened. Guest patience +20%; upkeep $15/week.'},stats:{...r.stats,upgradeCosts:r.stats.upgradeCosts+cost,totalExpenses:r.stats.totalExpenses+cost}};
}
