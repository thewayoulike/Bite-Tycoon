import {FAST_TRACK_CASH,constructionIdentity,earnedPlayerLevel,totalRentLiability,weeklyLeaseExpense} from './propertyMarket';
import {restaurantDepth} from '../career/restaurant';
import {settleInternalRent,internalRentForWeek,advanceTenantTrade,closeTenantTurnover} from '../career/mallCompanies';
import {ensureCrew} from '../career/crew';
import {simulationRate} from '../career/settings';
import {closeMallWeek} from './mallDepth';
import {ensureSupermarket} from './supermarket';
import {ensureRestaurantStockroom} from '../inventory/restaurantStockroom';
import {ensureBusinessStockroom} from '../inventory/businessStockroom';
import {weatherForDay,weatherDemand,weatherSeed,WeatherDemand} from './weather';
import type {GameState} from '../hooks/useGameLoop';
import {activeRecipes, INITIAL_INVENTORY_VALUE, STARTING_MONEY, startOrPauseArrivals, weeklyWages} from '../gameplay';
import {Business, automaticLoanPayments, ensureLoanRepayments, payWeeklyLease, createBusiness, ExpansionState, finishWeek, initialExpansion, nextDay, PROPERTIES, propertyById} from '../prototype/expansionModel';
import {advanceVenues,createVenue,isVenue,startVenueWeek} from './venueSimulation';
import {configureRestaurantIdentity} from './restaurantIdentity';
import {chooseRestaurantType,validRestaurantType,normalizeRestaurantCatalog,isOpeningRestaurant,defaultRestaurantType} from '../restaurantTypes';
import type {RestaurantType} from '../data/restaurantCatalogs';
import {openBusinessBooks} from './venueFinance';
import {createRetail} from './retail';
import {ensureLodging} from './lodging';
import {ensurePlaza} from './plaza';
import {closeHotelPerformance} from './hotelProgression';
import {openWeeklyBooks,weeklyProfitLoss} from './weeklyFinance';
import {syncAssets,depreciateAssets,accumulatedDepreciation} from './assets';
import {protectedObligations} from './cashProtection';
import {retryLease} from '../prototype/expansionModel';

export interface EmpireState {
  settings?:import("../career/settings").CareerSettings;
  version: 1;
  clock?: {time:number;phase:'planning'|'service'};
  activeRestaurantId: string;
  speed: number;
  initialDinerCash?: number;
  testingUnlocked?: boolean;
  testCapital?: Record<string, number>;
  restaurants: Record<string, GameState>;
  district: ExpansionState;
}
export const isRestaurant = (id:string) => ['restaurant','cafe'].includes(propertyById(id)?.kind ?? '');
const cashEntry=(b:Business,week:number,day:number,label:string,amount:number):Business=>({...b,ledger:[...b.ledger,{week,day,label,amount}].slice(-60)});
const ledgerSum=(entries:{amount:number}[])=>Math.round(entries.reduce((n,e)=>n+e.amount,0)*100)/100;
/** Week-end restaurant lines that make the stored ledger add up to cash. Sales and fees are named; the last line is the unrecorded purchases and upkeep, and it also absorbs any history the 60-line cap dropped. */
export function reconcileRestaurantLedger(account:Business,week:number,summary:{revenue:number;fees:number}):Business{
  const sales=Math.round(summary.revenue*100)/100,fees=Math.round(summary.fees*100)/100;
  const named=[...(sales?[{week,day:7,label:'Weekly restaurant sales',amount:sales}]:[]),...(fees?[{week,day:7,label:'Delivery commissions',amount:-fees}]:[])];
  const base=[...account.ledger,...named].slice(-59);
  const plug=Math.round((account.cash-ledgerSum(base))*100)/100;
  const ledger=plug?[...base,{week,day:7,label:plug<0?'Ingredient purchases and upkeep':'Other restaurant receipts',amount:plug}].slice(-60):base.slice(-60);
  return {...account,ledger};
}

export function createEmpire(diner:GameState):EmpireState {
  diner=ensureRestaurantStockroom(configureRestaurantIdentity(diner,'diner'));
  const district=initialExpansion(diner.money);
  district.week=diner.week;district.day=Math.min(7,Math.floor(diner.time*7/100)+1);
  district.businesses.diner.ledger=[{week:diner.week,day:district.day,label:'Opening diner balance',amount:diner.money}];
  district.notice='Grow from your first diner. New businesses use their own accounts; transfers are repayable loans.';
  district.businesses.diner=openWeeklyBooks(propertyById('diner')!,district.businesses.diner,district,diner);
  return {version:1,activeRestaurantId:'diner',speed:diner.gameSpeed,initialDinerCash:diner.money,restaurants:{diner},district};
}

/** A fresh career owns no business until the player chooses one. */
export function createFastTrackEmpire(starter:GameState):EmpireState {
 const base=createEmpire(starter);
 return {...base,restaurants:{},clock:{time:0,phase:'planning'},initialDinerCash:0,district:{...base.district,week:1,day:1,businesses:{},payroll:[],report:[],market:{version:1,ownerCash:FAST_TRACK_CASH,startingCapital:FAST_TRACK_CASH,level:1,parcels:{}},notice:'Choose your first property. Your $250,000 investment includes its opening stock and fit-out.'}};
}

/** Restaurant money is authoritative; the district is a view of those accounts. */
export function districtView(empire:EmpireState):ExpansionState {
  const businesses={...empire.district.businesses};
  for(const [id,b] of Object.entries(businesses))if(isVenue(propertyById(id)!))businesses[id]=openBusinessBooks(propertyById(id)!,ensureSupermarket(ensurePlaza(propertyById(id)!,ensureLodging(propertyById(id)!,propertyById(id)!.kind==='shop'&&!b.retail?{...b,retail:createRetail(b.stock)}:b,empire.district.week))),empire.district);
  for(const [id,b] of Object.entries(businesses))if(isVenue(propertyById(id)!))businesses[id]=ensureBusinessStockroom(propertyById(id)!,b,empire.district.week,empire.district.day);
  for(const [id,r] of Object.entries(empire.restaurants)) {
    const menu=activeRecipes(r),ingredients=[...new Set(menu.flatMap(item=>Object.keys(item.ingredients)))];
    businesses[id]={...businesses[id],...(r.restaurantType?{restaurantType:r.restaurantType}:{}),cash:r.money,stock:ingredients.length?Math.min(100,...ingredients.map(ing=>r.inventory[ing]??0)):0,condition:r.tables.length?Math.round(100*r.tables.filter(t=>!t.isDirty).length/r.tables.length):100};
  }
  for(const [id,b] of Object.entries(businesses)){
    const p=propertyById(id)!,r=empire.restaurants[id];
    businesses[id]={...b,crew:ensureCrew(p,b,r)};
    const property=r?(b.acquisition?Math.max(0,b.acquisition.cost-INITIAL_INVENTORY_VALUE):id==='diner'?0:Math.max(0,(b.tenure==='owned'?p.buy:p.deposit)-INITIAL_INVENTORY_VALUE)):(b.books?.openingProperty??0);
    businesses[id]=openWeeklyBooks(p,syncAssets(businesses[id],empire.district.week,Math.max(0,property-(b.acquisition?.land??0)),r?r.stats.upgradeCosts:(b.books?.upgrades??0)),empire.district,r);
  }
  return ensureLoanRepayments({...empire.district,weatherSeed:weatherSeed(empire.district.weatherSeed),businesses,...(empire.district.market?{market:{...empire.district.market,level:earnedPlayerLevel(empire.restaurants,businesses,empire.district.market.level)}}:{})});
}

export function updateRestaurant(empire:EmpireState,id:string,update:(r:GameState)=>GameState):EmpireState {
  const before=empire.restaurants[id];if(!before)return empire;
  const view=districtView(empire);
  const protectedState={...before,cashProtection:protectedObligations(propertyById(id)!,view.businesses[id],view,before)};
  const after=update(protectedState);if(after===protectedState)return empire;
  let business={...view.businesses[id],cash:after.money};
  if(after.money!==before.money)business=cashEntry(business,empire.district.week,empire.district.day,'Restaurant purchase / service adjustment',after.money-before.money);
  return {...empire,restaurants:{...empire.restaurants,[id]:after},district:{...view,businesses:{...view.businesses,[id]:business}}};
}

function openingRestaurant(starter:GameState,cash:number,week:number,id:string,speed:number,type?:RestaurantType):GameState {
  const r=structuredClone(starter);
  r.money=cash;r.week=week;r.gameSpeed=speed;r.restaurantLayout=id==='cafe'?1:2;
  // The acquisition package includes a chef and a waiter, with ongoing wages.
  r.staff.waiters=1;
  r.waiterEntities=[{id:`${id}-waiter`,state:'idle',targetCustomerId:null,targetOrderId:null,targetTableId:null,x:-5,y:-8,stamina:100}];
  const identified=configureRestaurantIdentity(r,id);
  return ensureRestaurantStockroom(chooseRestaurantType(identified,type??defaultRestaurantType(id),true));
}

export function applyDistrictUpdate(empire:EmpireState,update:(s:ExpansionState)=>ExpansionState,starter:GameState):EmpireState {
  const view=districtView(empire),changed=update(view);
  const acquired=Object.keys(changed.businesses).filter(id=>!view.businesses[id]);
  if(acquired.length&&(Object.values(empire.restaurants).some(r=>r.phase!=='planning')||Object.values(view.businesses).some(b=>b.venue?.running)))return {...empire,district:{...empire.district,notice:'Finish the current week before acquiring another property.'}};
  const restaurants={...empire.restaurants};
  for(const [id,b] of Object.entries(changed.businesses)) {
    if(restaurants[id])restaurants[id]={...restaurants[id],money:b.cash};
    else if(isRestaurant(id))restaurants[id]=openingRestaurant(starter,b.cash,view.week,id,empire.speed,b.restaurantType);
    if(isVenue(propertyById(id)!)&&!b.venue)changed.businesses[id]={...b,venue:createVenue(propertyById(id)!)};
  }
  const next={...empire,activeRestaurantId:!Object.keys(view.businesses).length&&acquired.length?acquired[0]:empire.activeRestaurantId,restaurants,district:changed};
  return {...next,district:districtView(next)};
}

export function startEmpireWeek(empire:EmpireState):EmpireState {
  if(!Object.keys(empire.district.businesses).length||Object.values(empire.restaurants).some(r=>r.phase!=='planning')||Object.values(empire.district.businesses).some(b=>b.venue?.running))return empire;
  empire={...empire,district:districtView(empire)};
  const restaurants=Object.fromEntries(Object.entries(empire.restaurants).map(([id,r])=>[id,startOrPauseArrivals({...r,weekSummary:null})]));
  const businesses=Object.fromEntries(Object.entries(empire.district.businesses).map(([id,b])=>[id,isVenue(propertyById(id)!)?startVenueWeek(propertyById(id)!,b,empire.district.week):b]));
  return {...empire,clock:{time:0,phase:'service'},restaurants,district:{...empire.district,businesses,report:[],notice:`Week ${empire.district.week} is running. All businesses operate on the same calendar. Staff continue working when you visit another property.`}};
}

/** An explicit testing grant: keep trading history and debt, credit each separate account. */
export function unlockTestDistrict(empire:EmpireState,starter:GameState):EmpireState {
  if(PROPERTIES.some(p=>!empire.district.businesses[p.id])&&Object.values(empire.restaurants).some(r=>r.phase!=='planning')) {
    return {...empire,district:{...empire.district,notice:'Finish this week before unlocking the test properties.'}};
  }
  const district=districtView(empire),businesses={...district.businesses},restaurants={...empire.restaurants},testCapital={...empire.testCapital};
  for(const p of PROPERTIES) {
    const existing=businesses[p.id],grant=Math.max(0,25000-(existing?.cash??0));
    let b=existing??createBusiness('owned');
    if(grant) b=cashEntry({...b,cash:b.cash+grant,...(b.books?{books:{...b.books,capital:b.books.capital+grant}}:{})},district.week,district.day,'Testing capital grant',grant);
    businesses[p.id]=b;
    if(isVenue(p)&&!b.venue)businesses[p.id]={...b,venue:createVenue(p)};
    testCapital[p.id]=(testCapital[p.id]??0)+grant+(existing?0:p.buy);
    if(isRestaurant(p.id)) {
      const existingRestaurant=restaurants[p.id]??openingRestaurant(starter,b.cash,district.week,p.id,empire.speed);
      const r=existingRestaurant.restaurantType?existingRestaurant:{...chooseRestaurantType({...existingRestaurant,phase:'planning'},defaultRestaurantType(p.id)),phase:existingRestaurant.phase};
      restaurants[p.id]={...r,money:b.cash,testingUnlocked:true,recipes:r.recipes.map(recipe=>({...recipe,unlocked:true}))};
    }
  }
  const unlocked={...empire,testingUnlocked:true,testCapital,restaurants,district:{...district,businesses,notice:'Testing enabled: all seven properties open, recipes and staff unlocked, and each business has at least $25,000. Cash and loans remain separate.'}};
  return {...unlocked,district:districtView(unlocked)};
}

export function setEmpireSpeed(empire:EmpireState,speed:number):EmpireState {
  if(![0,1,2,5].includes(speed))return empire;
  return {...empire,speed,restaurants:Object.fromEntries(Object.entries(empire.restaurants).map(([id,r])=>[id,{...r,gameSpeed:speed}]))};
}

/** Advance every restaurant without mounting extra 3D scenes. Non-food businesses settle once at week end. */
export function advanceEmpire(empire:EmpireState,delta:number,simulate:(r:GameState,d:number,weather?:WeatherDemand)=>GameState):EmpireState {
  if(delta<=0||empire.speed===0||(Object.values(empire.restaurants).every(r=>r.phase==='planning')&&!Object.values(empire.district.businesses).some(b=>b.venue?.running)))return empire;
  delta*=simulationRate(empire);
  const venueOnly=Object.keys(empire.restaurants).length===0;
  if(venueOnly)delta=Math.min(delta,Math.max(0,(100-(empire.clock?.time??0))*1.8));
  const clock=venueOnly?{time:Math.min(100,(empire.clock?.time??0)+delta/1.8),phase:'service' as const}:empire.clock;
  let district=districtView(empire);
  const weather=weatherForDay(district.week,district.day,district.weatherSeed);
  let restaurants=Object.fromEntries(Object.entries(empire.restaurants).map(([id,r])=>[id,simulate({...r,advanced:restaurantDepth(r),crew:ensureCrew(propertyById(id)!,district.businesses[id],r),stockDemandFactor:Math.min(1.2,Math.max(.8,weatherDemand(propertyById(id)!.kind,weather.kind).visits)),cashProtection:protectedObligations(propertyById(id)!,district.businesses[id],district,r)},delta,weatherDemand(propertyById(id)!.kind,weather.kind))]));
  // Keep a readable weekly ledger without recording ten tiny entries each second.
  const businesses={...district.businesses};
  for(const [id,r] of Object.entries(restaurants)) {
    const old=empire.restaurants[id];let b={...businesses[id],cash:r.money};
    if(old.pendingPayroll.reduce((n,p)=>n+p.amount,0)>r.pendingPayroll.reduce((n,p)=>n+p.amount,0)) {
      const paid=old.pendingPayroll.reduce((n,p)=>n+p.amount,0)-r.pendingPayroll.reduce((n,p)=>n+p.amount,0);
      if(paid>0)b=cashEntry(b,district.week,district.day,'Weekly wages paid',-paid);
    }
    businesses[id]=b;
  }
  district=advanceVenues({...district,businesses},delta);
  const current=Object.values(restaurants).filter(r=>r.week===district.week);
  const day=current.length?Math.min(7,Math.floor(Math.max(...current.map(r=>r.time))*7/100)+1):venueOnly?Math.min(7,Math.floor((clock?.time??0)*7/100)+1):7;
  while(district.day<day)district=nextDay(district,false);
  district={...district,businesses:Object.fromEntries(Object.entries(district.businesses).map(([id,b])=>[id,retryLease(propertyById(id)!,b,district)]))};
  district=automaticLoanPayments(district);
  const retriedInternal=settleInternalRent({...empire,restaurants,district});district=retriedInternal.district;restaurants=retriedInternal.restaurants;
  restaurants=Object.fromEntries(Object.entries(restaurants).map(([id,r])=>[id,{...r,money:district.businesses[id].cash}]));
  if(venueOnly?(clock?.time??0)>=99.999999:Object.values(restaurants).every(r=>r.phase==='planning'&&r.week>district.week)) {
    const nonFood=Object.fromEntries(Object.entries(district.businesses).filter(([id])=>!isRestaurant(id)));
    const closed=finishWeek({...district,businesses:nonFood},false);
    for(const [id,r] of Object.entries(restaurants)) {
      const b=district.businesses[id],summary=r.weekSummary!,p=propertyById(id)!;
      const leased=payWeeklyLease(p,b,district),rent=weeklyLeaseExpense(p,b,district.week),cashPaid=b.cash-leased.cash;
      const profitableStreak=summary.profit-rent>0?(empire.restaurants[id].performance?.profitableStreak??0)+1:0;
      restaurants[id]={...r,money:r.money-cashPaid,performance:{bestServiceRate:Math.max(r.performance?.bestServiceRate??0,summary.served+summary.lost?100*summary.served/(summary.served+summary.lost):0),profitableStreak,lastWeek:district.week},stats:{...r.stats,rentCosts:(r.stats.rentCosts??0)+rent,totalExpenses:r.stats.totalExpenses+rent},weekSummary:{...summary,profit:summary.profit-rent,propertyRent:rent}};
      let account={...leased,cash:restaurants[id].money};
      account=reconcileRestaurantLedger(account,district.week,summary);
      businesses[id]=account;
    }
    let closingState={...district,day:7,businesses:{...businesses,...closed.businesses}};
    for(const [id,b]of Object.entries(closingState.businesses))if(b.plaza)closingState.businesses[id]=closeTenantTurnover(b,district.week);
    const internalClose=settleInternalRent({...empire,restaurants,district:closingState},true);closingState=internalClose.district;restaurants=internalClose.restaurants;
    for(const [id,b] of Object.entries(closingState.businesses))closingState.businesses[id]=depreciateAssets(b,district.week);
    const reports=Object.keys(closingState.businesses).map(id=>propertyById(id)!).map(p=>weeklyProfitLoss(p,closingState.businesses[p.id],closingState,restaurants[p.id]));
    for(const report of reports)if(restaurants[report.id]){const r=restaurants[report.id];restaurants[report.id]={...r,weekSummary:r.weekSummary?{...r.weekSummary,profit:report.profit,depreciation:report.depreciation??0,hiring:report.hiring,maintenance:report.maintenance}:null,performance:{...r.performance!,profitableStreak:report.profit>0?(empire.restaurants[report.id].performance?.profitableStreak??0)+1:0}};}
    for(const report of reports)if(propertyById(report.id)?.kind==='hotel')closingState.businesses[report.id]=closeHotelPerformance(closingState.businesses[report.id],report);
    for(const report of reports)if(propertyById(report.id)?.kind==='plaza')closingState.businesses[report.id]=closeMallWeek(closingState.businesses[report.id],report);
    district={...closed,businesses:closingState.businesses,closedWeek:{week:district.week,reports,internalRent:internalRentForWeek(closingState,district.week)},report:reports.map(r=>({id:r.id,revenue:r.revenue,rent:r.rent,wages:r.wages,supplies:r.cogs+r.fees+r.spoilage+r.maintenance+r.hiring,profit:r.profit,cash:r.cash})),notice:`Week ${district.week} closed. Each business kept its own income and expenses. Wages are paid after Day 3 of the new week.`};
  }
  const next={...empire,clock:district.week>empire.district.week?{time:0,phase:'planning' as const}:clock,restaurants,district};
  return {...next,district:districtView(next)};
}

export function restaurantProperty(empire:EmpireState,id:string) {
  const p=propertyById(id)!,r=empire.restaurants[id];
  return r?{...p,capacity:r.tables.length*4,wages:weeklyWages(r.staff),revenue:r.weekStats.revenue}:p;
}

export function businessFinance(empire:EmpireState,id:string) {
  const p=propertyById(id)!,b=empire.district.businesses[id];
  const openingCash=b.acquisition?b.acquisition.capital:id==='diner'?(empire.initialDinerCash??STARTING_MONEY):0;
  return {openingCash,depreciation:accumulatedDepreciation(b),leaseDue:totalRentLiability(b),initialContribution:(b.acquisition?b.acquisition.capital:id==='diner'?openingCash+INITIAL_INVENTORY_VALUE:0)+(empire.testCapital?.[id]??0),
    propertyCost:b.acquisition?.cost??(id==='diner'?0:b.tenure==='owned'?p.buy:p.deposit),
    loansPayable:empire.district.loans.filter(l=>l.to===id).reduce((n,l)=>n+l.outstanding,0),
    loansReceivable:empire.district.loans.filter(l=>l.from===id).reduce((n,l)=>n+l.outstanding,0)};
}

export const SAVE_KEY='bite-tycoon-empire-v1';
export function parseEmpireSave(raw:string|null):EmpireState|null {
  if(!raw)return null;
  try {
    const value=JSON.parse(raw) as EmpireState;
    if(value.version!==1||!value.restaurants||!value.district?.businesses||(!value.district.market&&(!value.restaurants.diner||!value.district.businesses.diner||!value.restaurants[value.activeRestaurantId]))||![0,1,2,5].includes(value.speed)||!Array.isArray(value.district.loans)||!Array.isArray(value.district.payroll))return null;
    if(value.district.market){
      const m=value.district.market;
      if(m.version!==1||!Number.isFinite(m.ownerCash)||m.ownerCash<0||!Number.isFinite(m.startingCapital)||!Number.isInteger(m.level)||m.level<1||!m.parcels)return null;
      if(Object.keys(value.district.businesses).length&&!value.district.businesses[value.activeRestaurantId])return null;
      if(Array.isArray(m.parcels)||typeof m.parcels!=='object'||Object.entries(m.parcels).some(([plot,id])=>typeof id!=='string'||constructionIdentity(id)?.plot.id!==plot||!value.district.businesses[id]))return null;
      if(Object.keys(value.district.businesses).some(id=>{const built=constructionIdentity(id);return built&&m.parcels[built.plot.id]!==id;}))return null;
      if(value.clock&&(!Number.isFinite(value.clock.time)||value.clock.time<0||value.clock.time>100||!['planning','service'].includes(value.clock.phase)))return null;
    }
    for(const [id,r] of Object.entries(value.restaurants))if(!isRestaurant(id)||!Number.isFinite(r.money)||!Array.isArray(r.tables)||!Array.isArray(r.recipes)||!r.staff||!r.inventory||!r.weekStats||!Array.isArray(r.pendingPayroll)||!['planning','service','closing'].includes(r.phase))return null;
    for(const [id,b] of Object.entries(value.district.businesses))if(!propertyById(id)||!Number.isFinite(b.cash)||!Array.isArray(b.ledger))return null;
    for(const [id,b] of Object.entries(value.district.businesses))if(isVenue(propertyById(id)!)&&!b.venue)value.district.businesses[id]={...b,venue:createVenue(propertyById(id)!)};
    for(const [id,r] of Object.entries(value.restaurants)){
      if(r.restaurantType!==undefined&&!validRestaurantType(r.restaurantType))return null;
      let identified=configureRestaurantIdentity(r,id);
      if(!identified.restaurantType&&!isOpeningRestaurant(identified))identified={...chooseRestaurantType({...identified,phase:'planning'},identified.restaurantIdentity??defaultRestaurantType(id),false),phase:r.phase};
      value.restaurants[id]=ensureRestaurantStockroom(normalizeRestaurantCatalog(identified));
    }
    value.district=districtView(value);
    return value;
  } catch {return null;}
}
