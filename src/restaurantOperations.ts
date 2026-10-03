import type {GameState,Customer,Order} from './hooks/useGameLoop';
import type {Recipe} from './data/recipes';
import {restaurantLevel} from './restaurantProgression';
import {customerTravelTime} from './restaurantLayout';

export interface RestaurantServicePlan {
  pickup: boolean;
  pace: 'relaxed'|'balanced'|'busy';
  pastryBatch: 1|2|4;
  coffeeFirst: boolean;
  specialId: string;
}
export interface BistroBooking {
  id:string; week:number; day:number; time:number; name:string; party:number;
  tableId:string; status:'accepted'|'seated'|'missed'|'cancelled';
}
export function servicePlan(state:GameState):RestaurantServicePlan {
  return {pickup:false,pace:'busy',pastryBatch:1,coffeeFirst:false,specialId:'',...state.servicePlan};
}
export function changeServicePlan(state:GameState,changes:Partial<RestaurantServicePlan>):GameState {
  if(!state.restaurantType)return state;
  const plan=servicePlan(state),level=restaurantLevel(state);
  if(typeof changes.pickup==='boolean'&&level>=2&&['diner','cafe','fastfood','italian'].includes(state.restaurantType))plan.pickup=changes.pickup;
  if(state.restaurantType==='bistro'){
    if(['relaxed','balanced','busy'].includes(changes.pace!))plan.pace=changes.pace!;
    if(changes.specialId===''||state.activeMenu.includes(changes.specialId!))plan.specialId=changes.specialId!;
  }
  if(state.restaurantType==='cafe'){
    if(typeof changes.coffeeFirst==='boolean')plan.coffeeFirst=changes.coffeeFirst;
    if(level>=3&&[1,2,4].includes(changes.pastryBatch!))plan.pastryBatch=changes.pastryBatch!;
  }
  return {...state,servicePlan:plan};
}
export const isPickup=(tableId:string)=>tableId.startsWith('online_pickup_');
export const isPastry=(id:string)=>/^cuisine_cafe_(11|12|13|14|20|21|22|24)$/.test(id);
export const isCoffee=(id:string)=>/^cuisine_cafe_([1-9]|10)$/.test(id);
export function preparationTime(state:GameState,recipe:Recipe,orders:Order[]){
  if(state.restaurantType!=='cafe'||restaurantLevel(state)<3||!isPastry(recipe.id))return recipe.cookingTime;
  const group=Math.min(servicePlan(state).pastryBatch,orders.filter(o=>o.recipeId===recipe.id&&o.state!=='ready'&&!o.isOnFire).length);
  // Only paid-for customer orders are batched. Every pastry consumes its full recipe.
  return recipe.cookingTime*(group>=4?.65:group>=2?.8:1);
}
export function freshnessModifier(state:GameState,orders:Order[]){
  return state.restaurantType==='cafe'&&orders.some(o=>isPastry(o.recipeId)&&o.readyAt!==undefined&&(state.time-o.readyAt)*1.8>10)?.65:1;
}
export function chooseServiceRecipe(state:GameState,recipes:Recipe[],random=Math.random){
  const special=state.restaurantType==='bistro'?servicePlan(state).specialId:'';
  const weight=(r:Recipe)=>Math.exp(-2.5*Math.max(0,r.price/Math.max(1,r.basePrice)-1))*(r.id===special?1.6:1);
  let roll=random()*recipes.reduce((sum,r)=>sum+weight(r),0);
  return recipes.find(r=>(roll-=weight(r))<=0)??recipes[recipes.length-1];
}
export function bistroOffers(state:GameState){
  if(state.restaurantType!=='bistro'||restaurantLevel(state)<2)return [];
  const names=['Maple family','The book club','River neighbours','Anniversary dinner','Local colleagues','Weekend family','Sunday supper'];
  return names.map((name,i)=>({id:`bistro-${state.week}-${i+1}`,week:state.week,day:i+1,time:(i+10/24)*100/7,name,party:restaurantLevel(state)>=5&&i===4?4:2}));
}
export function bookBistroTable(state:GameState,id:string):GameState {
  const offer=bistroOffers(state).find(o=>o.id===id);
  if(!offer||offer.time<=state.time||state.phase==='closing'||state.bookings?.some(b=>b.id===id))return state;
  // One table per evening sitting. Bookings do not charge money before service.
  const table=state.tables.find(t=>!state.bookings?.some(b=>b.status==='accepted'&&b.tableId===t.id&&Math.abs(b.time-offer.time)<5));
  if(!table)return state;
  return {...state,bookings:[...(state.bookings??[]).filter(b=>b.week===state.week),{...offer,tableId:table.id,status:'accepted'}]};
}
export function cancelBistroBooking(state:GameState,id:string):GameState {
  return {...state,bookings:state.bookings?.map(b=>b.id===id&&b.status==='accepted'&&state.time<b.time?{...b,status:'cancelled'}:b)};
}
export function reservedTableIds(state:GameState){
  return (state.bookings??[]).filter(b=>b.week===state.week&&b.status==='accepted'&&state.time>=b.time-6).map(b=>b.tableId);
}
export function walkInCapacity(state:GameState){
  const pace=state.restaurantType==='bistro'?servicePlan(state).pace:'busy';
  return Math.max(1,Math.ceil(state.tables.length*(pace==='relaxed'?.5:pace==='balanced'?.75:1)));
}
export function advanceBistroBookings(state:GameState):GameState {
  if(state.restaurantType!=='bistro'||!state.bookings?.some(b=>b.week===state.week&&b.status==='accepted'&&state.time>=b.time))return state;
  let next={...state,bookings:state.bookings.map(b=>({...b})),customers:[...state.customers],tables:[...state.tables],stats:{...state.stats},weekStats:{...state.weekStats}};
  for(const booking of next.bookings){
    if(booking.week!==state.week||booking.status!=='accepted'||state.time<booking.time)continue;
    const table=next.tables.find(t=>t.id===booking.tableId&&!t.customerId&&!t.isDirty);
    if(state.isRestaurantOpen&&table){
      const customer:Customer={id:`guest-${booking.id}`,tableId:table.id,state:'entering',patience:120,maxPatience:120,actionTimer:customerTravelTime(table,booking.party,next.tables),currentBill:0,isVIP:false,vipBonus:0,partySize:booking.party,tipModifier:1,bookingName:booking.name};
      next.customers.push(customer);next.tables=next.tables.map(t=>t.id===table.id?{...t,customerId:customer.id}:t);booking.status='seated';
    }else if(state.time>booking.time+4||state.phase==='closing'){
      booking.status='missed';next.stats.customersLost+=booking.party;next.weekStats.lost+=booking.party;
    }
  }
  return next;
}
