import {restaurantStockPlan} from './restaurantPurchasing';
import {INGREDIENTS} from './data/recipes';
import {weeklyWages} from './gameplay';
import type {GameState} from './hooks/useGameLoop';
import {menuUsage} from './restaurantMenu';

export const RESTAURANT_LEVELS=[
  {level:1,name:'Opening day',guests:0,cost:0,slots:6},
  {level:2,name:'Local favorite',guests:60,cost:750,slots:10},
  {level:3,name:'Established kitchen',guests:180,cost:1800,slots:15},
  {level:4,name:'Busy neighborhood spot',guests:450,cost:4000,slots:20},
  {level:5,name:'Destination restaurant',guests:975,cost:8000,slots:25},
  {level:6,name:'Flagship',guests:1800,cost:14000,slots:30},
];
export function restaurantLevel(state:GameState){
  return Math.max(1,Math.min(6,state.restaurantLevel??Math.ceil(state.tables.length/2)));
}
export const restaurantTableLimit=(state:GameState)=>state.testingUnlocked?12:Math.max(state.tables.length,restaurantLevel(state)*2);
export const restaurantMenuLimit=(state:GameState)=>Math.max(state.restaurantType?Math.min(30,menuUsage(state).type):state.activeMenu.length,RESTAURANT_LEVELS[restaurantLevel(state)-1].slots);
export function restaurantUnlockBlocker(state:GameState):string|null{
  const next=RESTAURANT_LEVELS[restaurantLevel(state)];
  if(!next)return 'All restaurant levels are open.';
  if(state.phase!=='planning')return 'Finish this week before expanding.';
  if(!state.restaurantType)return 'Choose this restaurant’s type first.';
  if(!state.testingUnlocked){
    if(state.stats.customersServed<next.guests)return `Serve ${next.guests-state.stats.customersServed} more guests.`;
    if(next.level>=3&&(state.performance?.bestServiceRate??0)<80)return 'Complete a week serving at least 80% of arriving guests.';
    if(next.level>=4&&(state.performance?.profitableStreak??0)<2)return 'Complete two consecutive profitable weeks.';
  }
  if(state.pendingPayroll.some(p=>p.dueWeek<state.week&&p.amount>0))return 'Pay overdue wages before expanding.';
  if(state.money<next.cost)return `Needs $${(next.cost-state.money).toLocaleString()} more in this account.`;
  const stock=Object.entries(restaurantStockPlan(state).ingredients).reduce((n,[id,t])=>n+Math.max(0,t.target-(state.inventory[id]??0))*(INGREDIENTS[id]?.cost??0),0);
  const protectedCash=(state.cashProtection?.total??state.pendingPayroll.reduce((n,p)=>n+p.amount,0))+state.manager.reserve+weeklyWages(state.staff);
  if(state.money-next.cost<protectedCash+stock)return "Keep money for bills, weekly wages, your buffer and starting stock after this unlock.";
  return null;
}
export function upgradeRestaurant(state:GameState):GameState{
  if(restaurantUnlockBlocker(state))return state;
  const next=RESTAURANT_LEVELS[restaurantLevel(state)];
  return {...state,restaurantLevel:next.level,money:state.money-next.cost,stats:{...state.stats,upgradeCosts:state.stats.upgradeCosts+next.cost,totalExpenses:state.stats.totalExpenses+next.cost}};
}
