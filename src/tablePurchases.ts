import type {GameState} from './hooks/useGameLoop';
import {UPGRADE_COSTS} from './gameplay';
import {nextTablePosition,TABLE_POSITIONS} from './restaurantLayout';
import {restaurantTableLimit} from './restaurantProgression';
export function tablePurchaseBlocker(state:GameState,rearrange=false):string|null{
 if(state.tables.length>=12)return 'All 12 tables are installed.';
 if(state.restaurantType&&state.tables.length>=restaurantTableLimit(state))return 'Reach the next restaurant level to unlock more table positions.';
 if(state.money<UPGRADE_COSTS.table(state.tables.length))return `Needs $${(UPGRADE_COSTS.table(state.tables.length)-state.money).toLocaleString()} more.`;
 if(rearrange&&state.phase!=='planning')return 'Auto-arrange between weeks, when the room is empty.';
 if(!rearrange&&!nextTablePosition(state.tables))return 'No clear position. Auto-arrange the room between weeks to fit all 12 tables.';
 return null;
}
export function buyDiningTable(state:GameState,rearrange=false):GameState{
 if(tablePurchaseBlocker(state,rearrange))return state;
 const tables=rearrange?state.tables.map((t,i)=>({...t,...TABLE_POSITIONS[i]})):state.tables;
 const position=nextTablePosition(tables);if(!position)return state;
 let number=tables.length+1;while(tables.some(t=>t.id===`table-${number}`))number++;
 const cost=UPGRADE_COSTS.table(tables.length);
 return {...state,money:state.money-cost,stats:{...state.stats,upgradeCosts:state.stats.upgradeCosts+cost,totalExpenses:state.stats.totalExpenses+cost},tables:[...tables,{id:`table-${number}`,customerId:null,isDirty:false,...position}]};
}
