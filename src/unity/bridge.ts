import {defaultInterior} from '../empire/interiorStyles';
import type {GameState} from '../hooks/useGameLoop';
import {PROPERTIES,PUBLIC_GARDEN,propertyById,type ExpansionState} from '../prototype/expansionModel';
import {LAND_PLOTS,siteOffer,corePropertyOffer,listedPropertyIdentity} from '../empire/propertyMarket';
import {commercialArchitecture} from '../graphics/commercialBuildingProfiles';
import {worldTime} from '../empire/worldTime';
import {weatherForDay} from '../empire/weather';
import {mapPos,customerSeatPath} from '../restaurantLayout';
import {retailStockLevel,retailProductFloor,retailProduct} from '../empire/retail';
import {shelfQuantity,shelfCapacity} from '../empire/supermarket';
import {ensureCrew,crewPower} from '../career/crew';
import {parseEmpireSave} from '../empire/empire';
import {decideSave} from '../empire/sessionGuard';
import {characterSeed,diningCastId,gameCastMember,type GameCharacterRole} from '../characters/gameCast';
import {CAST_BY_ID} from '../people-preview/cast';
import {dishVisual,retailVisual} from './itemVisuals';

export type UnityView={floor:number;detail:string;area:string;cutaway:boolean;revision?:number;fast?:boolean;meter?:boolean};
export type UnityWorldInput={state:GameState;restaurants:Record<string,GameState>;district:ExpansionState;worldProgress:number;focus:string|null;selected:string|null};
export const UNITY_PROTOCOL=1;
const cast=(role:GameCharacterRole,seed:string|number,id?:string)=>{const member=gameCastMember(role,characterSeed(seed),id);return {id:member.id,height:member.heightMetres};};

/** Rendering snapshots only. Money, purchases, service and saves remain owned by the existing game. */
export function unityFrame(input:UnityWorldInput,view:UnityView){
 const {district,restaurants,focus}=input;
 const ids=new Set([...PROPERTIES.map(p=>p.id),...Object.keys(district.businesses)]);
 const properties:{id:string;name:string;kind:string;x:number;z:number;owned:boolean;tenure?:'owned'|'leased';offer:string;floors:number;exteriorFloors?:number;preserveExterior?:boolean;siteId?:string;cityCategory?:string;accent:string;wall?:string;existing?:boolean;design:string;stock:number}[]=[...ids].flatMap(id=>{
  const business=district.businesses[id],p=propertyById(id,business);if(!p)return [];
  const listing=listedPropertyIdentity(id),offer=corePropertyOffer(p,district.market?.listingSeed,district.week);
  const floors=business?.lodging?.openFloors??business?.plaza?.openFloors??(business?.retail?.electronicsUnlocked?2:1);
  const exteriorFloors=listing?commercialArchitecture(listing.plot.id).floors:id==='park'?5:id==='hotel'?4:id==='apartments'?5:p.kind==='shop'?1:floors;
  return [{id,name:business?p.name:district.market?offer.name:p.name,kind:p.kind,x:p.position[0],z:p.position[2],owned:!!business,tenure:business?.tenure,offer:business?.mallCompany?'internal':business?'owned':district.market?offer.mode:'purchase',floors,exteriorFloors,preserveExterior:!!listing,siteId:listing?.plot.id,existing:!!listing,accent:restaurants[id]?.frameColor??p.accent,wall:restaurants[id]?.wallColor,design:p.design??'',stock:business?.retail?retailStockLevel(business.retail):business?.stock??100}];
 });
 for(const plot of district.market?LAND_PLOTS:[]){
  if(district.market?.parcels[plot.id])continue;
  const offer=siteOffer(plot,district.market?.listingSeed,district.week);
  if(ids.has(offer.id))continue;
  properties.push({id:offer.id,name:offer.name,kind:offer.mode==='land'?'land':offer.mode==='scenery'?'cityshop':offer.kind,x:plot.position[0],z:plot.position[2],owned:false,existing:offer.mode!=='land',preserveExterior:offer.mode!=='land',siteId:plot.id,cityCategory:offer.category,offer:offer.mode,floors:1,exteriorFloors:offer.floors,accent:offer.mode==='land'?'#6c9171':offer.mode==='lease'?'#6698b8':'#c2a15c',design:'',stock:100});
 }
 properties.push({id:PUBLIC_GARDEN.id,name:PUBLIC_GARDEN.name,kind:'park',x:0,z:0,owned:false,offer:'public',floors:1,accent:'#66835d',design:'',stock:100});
 const time=worldTime(input.worldProgress),weather=weatherForDay(district.week,district.day,district.weatherSeed);
 const restaurant=focus?restaurants[focus]:undefined,business=focus?district.businesses[focus]:undefined;
 return {version:UNITY_PROTOCOL,market:!!district.market,focus:focus??'',selected:input.selected??'',...view,week:district.week,day:district.day,hours:time.hours,night:time.isNight,weather:weather.kind,wind:weather.wind,snow:weather.snow,rain:weather.wet,speed:(restaurant?restaurant.phase!=='planning':business?.venue?.running)?input.state.gameSpeed:0,
  properties,...unityContents(input,focus,view),frontages:Object.keys(district.businesses).filter(id=>!district.businesses[id].mallCompany).map(id=>({id,...unityContents(input,id,{...view,floor:0}),speed:(restaurants[id]?restaurants[id].phase!=='planning':district.businesses[id]?.venue?.running)?input.state.gameSpeed:0}))};
}

function unityContents(input:UnityWorldInput,focus:string|null,view:UnityView){
 const {district,restaurants}=input,restaurant=focus?restaurants[focus]:undefined,business=focus?district.businesses[focus]:undefined;
 const time=worldTime(input.worldProgress),property=focus?propertyById(focus,business):undefined;
 const crew=business&&property?ensureCrew(property,business):undefined;
 return {facilities:business?.lodging?.facilities??business?.plaza?.facilities??[],restaurantType:restaurant?.restaurantType??'',interiorStyle:business?.interiorStyle??defaultInterior(restaurant?.restaurantType),
  tables:restaurant?.tables.map(t=>({id:t.id,x:mapPos(t.x),z:mapPos(t.y),dirty:t.isDirty,customer:t.customerId??'',
   meals:t.isDirty?[]:(restaurant.customers.find(c=>c.id===t.customerId&&c.tableId===t.id&&c.state==='eating')?.servedRecipeIds??[])
    .flatMap(id=>{const recipe=restaurant.recipes.find(r=>r.id===id);return recipe?[dishVisual(recipe)]:[];})}))??[],
  customers:restaurant?.customers.map(c=>({id:c.id,table:c.tableId,state:c.state,party:c.partySize,patience:c.patience,cast:Array.from({length:Math.min(4,c.partySize)},(_,seat)=>{const member=CAST_BY_ID.get(diningCastId(characterSeed(c.id),seat,c.partySize))!;return {id:member.id,height:member.heightMetres};}),routes:Array.from({length:Math.min(4,c.partySize)},(_,seat)=>{const table=restaurant.tables.find(t=>t.id===c.tableId);return {points:table?customerSeatPath(table,seat,restaurant.tables):[]};})}))??[],
  staff:[...(restaurant?.waiterEntities.map(w=>({id:w.id,role:'waiter',state:w.state,x:w.x,z:w.y,cast:cast('waiter',w.id)}))??[]),...(restaurant?.cleanerEntities.map(w=>({id:w.id,role:'cleaner',state:w.state,x:w.x,z:w.y,cast:cast('cleaner',w.id)}))??[]),...(restaurant?.chefEntities.map((w,index)=>({id:w.id,role:'chef',state:w.state,x:-5+index*4,z:-15,cast:cast('chef',w.id)}))??[])],
  units:business?.venue?.units.map((u,index)=>({index,type:u.type??u.shopType??'',occupied:u.occupied,dirty:u.dirty,condition:u.condition??100,cleanliness:u.cleanliness??100,tenant:u.tenantName??'',cast:cast('customer',u.seed)}))??[],
  visitors:business?.venue?.visitors.filter(v=>!business.retail||retailProductFloor(v.productId??'')===view.floor).map(v=>({id:String(v.id),state:v.state,unit:v.unit??-1,seed:v.seed,basket:!!v.basket,cast:cast('customer',v.seed)}))??[],
  crew:crew?['service','care','cleaner','maintenance','receiving','electronics','handling'].map(role=>({role,count:Math.ceil(crewPower(crew,role,time.hours,0,view.floor))})):[],
  stock:business?.retail?business.retail.shelves.map(id=>({id,category:retailProduct(id)?.category??'',...retailVisual(retailProduct(id)!),quantity:shelfQuantity(business,id),capacity:shelfCapacity(business,id),floor:retailProductFloor(id)})):[],
 };
}

export function validUnityEvent(value:unknown,allowedIds:ReadonlySet<string>,tableIds:ReadonlySet<string>=new Set()):value is {type:'overview'}|{type:'select';id:string}|{type:'table';id:string}|{type:'interact';action:string;id?:number}{
 if(!value||typeof value!=='object')return false;
 const v=value as Record<string,unknown>;
 if(v.type==='overview')return true;
 if(v.type==='select')return typeof v.id==='string'&&allowedIds.has(v.id);
 if(v.type==='table')return typeof v.id==='string'&&tableIds.has(v.id);
 return v.type==='interact'&&typeof v.action==='string'&&['serve','clean','care','inventory','staff','finance','run','prices','bookings','upgrades'].includes(v.action)&&(v.id===undefined||Number.isInteger(v.id)&&Number(v.id)>=0);
}

type StorageLike=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function unitySaveKey(mode:string|null){return `bite-tycoon-unity-${mode==='sandbox'?'sandbox':mode==='career'?'older-career':'career'}-v1`;}
export function browserSaveKey(mode:string|null){return mode==='sandbox'?'bite-tycoon-sandbox-v1':mode==='career'?'bite-tycoon-career-v1':'bite-tycoon-fast-track-v1';}
/** Copy once; never replace either an existing Unity save or the source browser save. */
export function copyBrowserSave(storage:StorageLike,mode:string|null){
 const target=unitySaveKey(mode),source=browserSaveKey(mode);
 if(storage.getItem(target)!==null||storage.getItem(target+'-play')!==null)return 'existing-unity' as const;
 if(storage.getItem(source+'-resetting'))return 'source-busy' as const;
 const revision=storage.getItem(source+'-revision');
 const primary=storage.getItem(source),play=storage.getItem(source+'-play');
 if(!primary&&!play)return 'new-game' as const;
 const chosen=decideSave(primary,play,parseEmpireSave).value;
 if(!chosen)return 'invalid-source' as const;
 const raw=JSON.stringify(chosen);
 if(storage.getItem(source+'-revision')!==revision||storage.getItem(source+'-resetting'))return 'source-busy' as const;
 const backup=target+'-browser-source-backup';
 storage.setItem(backup,raw);
 try{storage.setItem(target,raw);}catch(error){storage.removeItem(backup);throw error;}
 return 'copied' as const;
}

export function replaceUnitySave(storage:StorageLike,mode:string|null,fresh:string){
 if(!parseEmpireSave(fresh))throw new Error('Invalid Unity save.');
 const key=unitySaveKey(mode),previous=storage.getItem(key),play=storage.getItem(key+'-play');
 const revision=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 storage.setItem(key+'-reset-backup',JSON.stringify({primary:previous,play}));
 storage.setItem(key+'-resetting',revision);
 try{storage.setItem(key,fresh);storage.removeItem(key+'-play');storage.setItem(key+'-revision',revision);storage.removeItem(key+'-leader');}
 catch(error){try{if(previous===null)storage.removeItem(key);else storage.setItem(key,previous);if(play!==null)storage.setItem(key+'-play',play);}catch{/* The reset backup retains the previous Unity save. */}throw error;}
 finally{storage.removeItem(key+'-resetting');}
}
