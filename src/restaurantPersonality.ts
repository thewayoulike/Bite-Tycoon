import type {GameState} from './hooks/useGameLoop';
import type {RestaurantType} from './data/restaurantCatalogs';
import {worldTime} from './empire/worldTime';
import {restaurantLevel} from './restaurantProgression';
export const RESTAURANT_SERVICE={
 indian:{chef:'Curry / tandoor cook',waiter:'Dining server',description:'Cook curries and fresh breads for lunch and dinner.',rush:'Lunch & dinner',hours:[[12,15],[18,22]],eating:12,station:'Tandoor & curry range'},
 japanese:{chef:'Sushi / rice cook',waiter:'Dining server',description:'Cold preparation and hot rice bowls share a compact kitchen.',rush:'Lunch & dinner',hours:[[11,14],[18,21]],eating:14,station:'Sushi counter & rice station'},
 diner:{chef:'Grill cook',waiter:'Floor waiter',description:'Breakfast and lunch service, comfort food and relaxed family meals.',rush:'Breakfast & lunch',hours:[[7,10],[12,15]],eating:15,station:'Griddle & pickup counter'},
 cafe:{chef:'Barista / baker',waiter:'Café server',description:'Morning coffee rush, quick espresso orders and slower pastry preparation.',rush:'Morning coffee',hours:[[7,11]],eating:19,station:'Espresso bar & bakery case'},
 bistro:{chef:'Bistro chef',waiter:'Host / waiter',description:'Evening demand, longer cooking and longer meals. Pace arrivals to protect service quality.',rush:'Evening dining',hours:[[17,22]],eating:10,station:'Kitchen pass & dessert station'},
 italian:{chef:'Pizza / pasta cook',waiter:'Dining server',description:'Lunch and dinner demand; pizza preparation and pasta share kitchen capacity.',rush:'Lunch & dinner',hours:[[12,14],[18,22]],eating:12,station:'Pizza oven & pasta station'},
 fastfood:{chef:'Fryer / grill cook',waiter:'Quick-service runner',description:'Lunch and dinner peaks, fast preparation and short meals with quick table turnover.',rush:'Lunch & evening',hours:[[11,14],[17,20]],eating:23,station:'Grill, fryers & collection counter'},
} as const;
export const serviceProfile=(state:Pick<GameState,'restaurantType'|'restaurantIdentity'>)=>RESTAURANT_SERVICE[state.restaurantType??state.restaurantIdentity??'diner'];
export function restaurantRush(state:GameState){const h=worldTime(state.time).hours;return serviceProfile(state).hours.some(([from,to])=>h>=from&&h<to)?1.8:1;}
export const preparationBoost=(state:GameState)=>state.restaurantType?1+(restaurantLevel(state)-1)*.12:1;
export const typePreparationTime=(type:RestaurantType,index:number)=>type==='fastfood'?.85+(index%4)*.2:type==='cafe'?(index<10?.65:1.8):type==='bistro'?2.8:type==='italian'?2.4:1.6;
export function restaurantVisibleReward(type:RestaurantType,level:number){
 const rewards={
  indian:['Tandoor and curry kitchen','Takeaway pickup point','Expanded spice preparation bench','Indian dessert display','Raised curry pass','Premium warming lamps and chilled storage'],
  japanese:['Sushi counter and rice kitchen','Bento collection point','Expanded cold-preparation bench','Tea and dessert counter','Raised hot-food pass','Premium finishing lamps and chilled storage'],
  diner:['Classic comfort-food room','Pickup counter signage','Expanded grill preparation bench','Upholstered family seating at window tables','Raised kitchen pass','Premium warming lamps and chilled storage'],
  cafe:['Espresso bar and pastry case','Second espresso machine and pickup service','Bakery bench and ordered-pastry batching','Cake and pastry display','Reading shelves and raised preparation pass','Premium bar fit-out and chilled storage'],
  bistro:['Garden dining and herb shelves','Host reservation desk and evening bookings','Expanded plated-meal preparation','Dessert station','Private-dining sign and four-person group requests','Premium finishing lamps and chilled storage'],
  italian:['Pizza oven and dough preparation','Takeaway collection point','Expanded preparation bench','Dessert display','Raised pasta pass','Premium oven-side finishing and chilled storage'],
  fastfood:['Grill, menu boards and order kiosk','Collection counter and pickup orders','Expanded preparation bench','Dessert and snack display','Raised order pass','Warming lamps and chilled storage'],
 };
 return rewards[type][Math.max(0,Math.min(5,level-1))];
}
