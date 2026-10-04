import {updateRestaurant,applyDistrictUpdate,type EmpireState} from '../empire/empire';
import {propertyById} from '../prototype/expansionModel';
import type {GameState} from '../hooks/useGameLoop';
import {ensureCrew,editCrew,type CrewAction} from './crew';
import {expandStorage,placeStorage,StorageKind} from './storage';
import {newStockroom} from '../inventory/stockroom';
import {protectedObligations} from '../empire/cashProtection';
export function manageCrew(e:EmpireState,id:string,action:CrewAction):EmpireState{
 const p=propertyById(id)!,b=e.district.businesses[id],r=e.restaurants[id];if(!b)return e;
 const crew=ensureCrew(p,b,r),edited=editCrew(crew,r?.money??b.cash,action,b.lodging?.openFloors??(b.plaza?.openFloors?b.plaza.openFloors-1:b.retail?.electronicsUnlocked?1:0));
 if(r)return updateRestaurant(e,id,r=>({...r,crew:edited.crew,money:r.money-edited.cost,stats:{...r.stats,maintenanceCosts:(r.stats.maintenanceCosts??0)+edited.cost,totalExpenses:r.stats.totalExpenses+edited.cost}}));
 return {...e,district:{...e.district,businesses:{...e.district.businesses,[id]:{...b,crew:edited.crew,cash:b.cash-edited.cost,books:b.books?{...b.books,maintenance:b.books.maintenance+edited.cost}:undefined}}}};
}
export function buildStockroom(e:EmpireState,id:string,action:{kind:StorageKind;x:number;z:number}|{expand:true}):EmpireState{
 const p=propertyById(id)!,b=e.district.businesses[id],r=e.restaurants[id];if(!b||r&&r.phase!=='planning'||!r&&b.venue?.running)return e;
 const room=r?.stockroom??b.stockroom??newStockroom((e.district.week-1)*7+e.district.day),free=(r?.money??b.cash)-protectedObligations(p,b,e.district,r).total-(r?.manager.reserve??b.manager?.reserve??0);
 const built='expand'in action?expandStorage(room,free):placeStorage(room,action.kind,action.x,action.z,free);if(!built.cost)return e;
 if(r)return updateRestaurant(e,id,r=>({...r,money:r.money-built.cost,stockroom:built.room,stats:{...r.stats,upgradeCosts:r.stats.upgradeCosts+built.cost,totalExpenses:r.stats.totalExpenses+built.cost}}));
 return {...e,district:{...e.district,businesses:{...e.district.businesses,[id]:{...b,cash:b.cash-built.cost,stockroom:built.room,books:b.books?{...b.books,upgrades:b.books.upgrades+built.cost}:undefined}}}};
}
