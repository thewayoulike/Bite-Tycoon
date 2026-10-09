import {leaseReserve} from './propertyMarket';
import {transitValue} from '../inventory/stockroom';
import type {GameState} from '../hooks/useGameLoop';
import type {Business,ExpansionState,Property} from '../prototype/expansionModel';
import {INITIAL_INVENTORY_VALUE} from '../gameplay';
import {venueFinancials} from './venueFinance';
import {accumulatedDepreciation} from './assets';

export type ProfitLossTotals={revenue:number;cogs:number;wages:number;hiring:number;maintenance:number;fees:number;spoilage:number;rent:number;depreciation?:number};
export type WeeklyBooks={week:number;startDay:number;partial:boolean;opening:ProfitLossTotals};
export type WeeklyProfitLoss=ProfitLossTotals&{id:string;name:string;week:number;day:number;partial:boolean;startDay:number;grossProfit:number;overhead:number;expenses:number;profit:number;cash:number;rentDue:number};
const zero=():ProfitLossTotals=>({revenue:0,cogs:0,wages:0,hiring:0,maintenance:0,fees:0,spoilage:0,rent:0,depreciation:0});
const subtract=(a:ProfitLossTotals,b:ProfitLossTotals)=>Object.fromEntries(Object.keys(a).map(key=>[key,(a[key as keyof ProfitLossTotals]??0)-(b[key as keyof ProfitLossTotals]??0)])) as ProfitLossTotals;

export function cumulativeProfitLoss(p:Property,b:Business,state:ExpansionState,r?:GameState):ProfitLossTotals{
 if(r){
  const stock=Object.values(r.inventoryBatches??{}).flat().reduce((sum,batch)=>sum+batch.qty*batch.costPerUnit,0)+transitValue(r.stockroom);
  return {depreciation:accumulatedDepreciation(b),revenue:r.stats.totalEarned,cogs:INITIAL_INVENTORY_VALUE+r.stats.inventoryCosts-stock-(r.stats.spoilageCosts??0),wages:r.stats.salaryCosts+r.weekStats.wages,hiring:r.stats.managerCosts,maintenance:r.stats.maintenanceCosts??0,fees:r.stats.onlineFees??0,spoilage:r.stats.spoilageCosts??0,rent:r.stats.rentCosts??0};
 }
 const f=venueFinancials(p,b,state);
 return {depreciation:f.depreciation,revenue:f.book.revenue,cogs:f.costOfSupplies,wages:f.book.wagesAccrued,hiring:f.book.hiring,maintenance:f.book.maintenance,fees:0,spoilage:f.spoilage,rent:f.book.rent};
}

/** Snapshot cumulative expenses once per week; purchases and loans never become P&L costs. */
export function openWeeklyBooks(p:Property,b:Business,state:ExpansionState,r?:GameState):Business{
 if(b.weeklyBooks?.week===state.week)return b;
 const totals=cumulativeProfitLoss(p,b,state,r);
 if(b.weeklyBooks)return {...b,weeklyBooks:{week:state.week,startDay:1,partial:false,opening:totals}};
 // A newly opened account has no previous weeks to exclude.
 if((r?r.week===1:b.books?.week===state.week)||Object.values(totals).every(value=>Math.abs(value)<1e-8))return {...b,weeklyBooks:{week:state.week,startDay:1,partial:false,opening:zero()}};
 // Old saves kept weekly sales/wages, but not a complete weekly cost history.
 // Preserve those known figures without guessing costs from the truncated cash ledger.
 const known=zero();
 if(r){
  const current=r.week===state.week?r.weekStats:r.weekSummary?.week===state.week?r.weekSummary:undefined;
  if(current){known.revenue=current.revenue;known.cogs=current.foodCost;known.wages=current.wages;known.fees=current.fees;}
  if(r.weekSummary?.week===state.week){known.spoilage=r.weekSummary.spoilage;known.rent=r.weekSummary.propertyRent??0;}
 }else if(b.venue?.running){known.revenue=b.venue.week.revenue;known.wages=b.venue.week.wages;}
 return {...b,weeklyBooks:{week:state.week,startDay:state.day,partial:true,opening:subtract(totals,known)}};
}

export function weeklyProfitLoss(p:Property,b:Business,state:ExpansionState,r?:GameState):WeeklyProfitLoss{
 const opened=openWeeklyBooks(p,b,state,r),snapshot=opened.weeklyBooks!;
 const amounts=subtract(cumulativeProfitLoss(p,opened,state,r),snapshot.opening);
 for(const key of Object.keys(amounts) as (keyof ProfitLossTotals)[])if(Math.abs(amounts[key])<1e-8)amounts[key]=0;
 const overhead=amounts.wages+amounts.hiring+amounts.maintenance+amounts.fees+amounts.spoilage+amounts.rent+(amounts.depreciation??0);
 return {...amounts,id:p.id,name:b.name??p.name,week:state.week,day:state.day,partial:snapshot.partial,startDay:snapshot.startDay,grossProfit:amounts.revenue-amounts.cogs,overhead,expenses:amounts.cogs+overhead,profit:amounts.revenue-amounts.cogs-overhead,cash:r?.money??b.cash,rentDue:b.leaseTerms?leaseReserve(p,b,state):b.tenure==='leased'?Math.max(0,p.rent-amounts.rent):0};
}
