import {INITIAL_STATE, advanceGame} from '../hooks/useGameLoop';
import {weatherForDay,type WeatherKind} from '../empire/weather';
import type {GameState} from '../hooks/useGameLoop';
import {createEmpire, unlockTestDistrict, districtView, startEmpireWeek, advanceEmpire, setEmpireSpeed} from '../empire/empire';
import type {EmpireState} from '../empire/empire';
import {PROPERTIES, businessSupplies} from '../prototype/expansionModel';
import {newLodgingUnit, roomsPerFloor, roomTypes} from '../empire/lodging';
import {newPlazaUnit, MALL_FACILITIES} from '../empire/plaza';
import {RETAIL_PRODUCTS, retailProductFloor} from '../empire/retail';
import {RECIPES, INGREDIENTS} from '../data/recipes';
import {TABLE_POSITIONS} from '../restaurantLayout';
import {hireStaff,serveReadyTable} from '../gameplay';
import {RESTAURANT_IDENTITIES} from '../empire/restaurantIdentity';
import {DEFAULT_RESTAURANT_TYPES,RestaurantAssignments,restaurantCatalog} from './restaurantCatalogs';

export const MENU_CAPACITIES=[6,10,15,20,25,30];
export const HOTEL_FLOORS=[1,1,2,3,4,5];
export const HOME_FLOORS=[1,2,4,6,8,10];
export const MALL_OPEN_FLOORS=[1,1,2,3,4,5];
export function proposalVersion(sample:EmpireState,after:boolean){
  const result=structuredClone(sample);
  if(!after)for(const [id,r] of Object.entries(result.restaurants)){
    r.restaurantType=undefined;r.restaurantLevel=undefined;
    r.restaurantIdentity=id as 'diner'|'cafe'|'bistro';r.wallColor=RESTAURANT_IDENTITIES[r.restaurantIdentity].wall;r.frameColor=RESTAURANT_IDENTITIES[r.restaurantIdentity].frame;
    r.recipes=RECIPES.map(recipe=>({...recipe,ingredients:{...recipe.ingredients},unlocked:true}));
    const starters=RESTAURANT_IDENTITIES[id as keyof typeof RESTAURANT_IDENTITIES].menu;
    const stocked=RECIPES.filter(recipe=>Object.keys(recipe.ingredients).every(key=>(r.inventory[key]??0)>0)).map(recipe=>recipe.id);
    r.activeMenu=[...new Set([...starters,...stocked,...RECIPES.map(recipe=>recipe.id)])].slice(0,6);
  }
  return result;
}

/** A new, disposable estate. This module never accesses the browser's save storage. */
export function createProposalSample(level:number,restaurantTypes:RestaurantAssignments=DEFAULT_RESTAURANT_TYPES,night=false,weather?:WeatherKind){
  const n=Math.max(0,Math.min(5,level-1));
  let empire=unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);
  empire.district.weatherSeed=1221;
  for(const [id,initial] of Object.entries(empire.restaurants)){
    let r=initial;
    for(const role of ['waiter','chef','cleaner','manager'] as const)r=hireStaff(r,role);
    if(n>=2)r=hireStaff(r,'waiter');
    const catalog=restaurantCatalog(restaurantTypes[id]??'diner');
    const menu=[...new Set([...catalog.starterIds,...catalog.recipes.map(recipe=>recipe.id)])].slice(0,Math.min(MENU_CAPACITIES[n]-2,3+n*2));
    const inventory=Object.fromEntries(catalog.ingredientIds.map(key=>[key,80]));
    const type=restaurantTypes[id]??'diner',theme=RESTAURANT_IDENTITIES[type];
    r={...r,restaurantType:type,restaurantIdentity:type,restaurantLevel:n+1,wallColor:theme.wall,frameColor:theme.frame,recipes:catalog.recipes,activeMenu:menu,inventory,inventoryBatches:Object.fromEntries(Object.entries(inventory).map(([key,qty])=>[key,[{qty,costPerUnit:INGREDIENTS[key].cost}]])),
      tables:TABLE_POSITIONS.slice(0,2+n*2).map((pos,i)=>({id:`${id}-table-${i}`,customerId:null,isDirty:false,...pos})),
      manager:{...r.manager,budget:600,reserve:500},floatingEvents:[]};
    empire.restaurants[id]=r;
    empire.district.businesses[id].cash=r.money;
  }
  for(const p of PROPERTIES){
    const b=empire.district.businesses[p.id];
    if(!b.venue)continue;
    b.hires={service:1,care:1,maintenance:1,manager:1};
    b.manager={enabled:true,budget:p.kind==='shop'?8000:600,spent:0,reserve:500};
    b.inventory=Object.fromEntries(businessSupplies(p,b).map(s=>[s.id,80]));
    if(b.lodging){
      const floors=p.kind==='hotel'?HOTEL_FLOORS[n]:HOME_FLOORS[n],types=roomTypes(p);
      b.lodging.openFloors=floors;
      b.venue.units=Array.from({length:floors*roomsPerFloor(p)},(_,i)=>{
        const t=types[n===0?0:(p.kind==='apartments'&&i>=27?3:i%Math.min(n+1,3))];
        return {...newLodgingUnit(p),type:t.id,rate:t.rate,seed:i*19+11};
      });
      b.lodging.facilities=n>=3?['gym',...(p.kind==='hotel'?['restaurant']:[])]:[];
    }
    if(b.plaza){
      b.plaza.openFloors=MALL_OPEN_FLOORS[n];b.plaza.autoLease=true;
      b.venue.units=Array.from({length:b.plaza.openFloors*4},(_,i)=>newPlazaUnit(i));
      b.plaza.facilities=MALL_FACILITIES.filter(f=>f.floor<b.plaza!.openFloors).map(f=>f.id);
    }
    if(b.retail){
      const products=RETAIL_PRODUCTS.filter(p=>n>=2||retailProductFloor(p.id)===0);
      b.retail={electronicsUnlocked:n>=2,shelves:products.map(p=>p.id),stock:Object.fromEntries(products.map(p=>[p.id,retailProductFloor(p.id)?4:40])),batches:Object.fromEntries(products.map(p=>[p.id,[{qty:retailProductFloor(p.id)?4:40,costPerUnit:p.cost}]]))};
    }
    // Sample opening assets and stock are capital, not fabricated trading profit.
    b.books=undefined;b.weeklyBooks=undefined;
  }
  empire.district=districtView(empire);
  empire=startEmpireWeek(empire);
  // Use the real simulation to create arrivals, staff jobs and financial activity.
  const seconds=night?70:58;
  for(let i=0;i<seconds*5;i++)empire=advanceEmpire(empire,.2,advanceGame);
  // Open on a readable dining scene, with the existing prepared tickets served.
  for(const [id,state] of Object.entries(empire.restaurants)){
    let ready:GameState={...state,orders:state.orders.map(o=>({...o,state:'ready' as const,progress:100}))};
    for(const order of ready.orders)ready=serveReadyTable(ready,order.id);
    empire.restaurants[id]={...ready,floatingEvents:[]};
  }
  empire.district=districtView(empire);
  if(weather){
    for(let seed=1;seed<10000;seed++)if(weatherForDay(empire.district.week,empire.district.day,seed).kind===weather){empire.district.weatherSeed=seed;break;}
  }
  return setEmpireSpeed(empire,0);
}
