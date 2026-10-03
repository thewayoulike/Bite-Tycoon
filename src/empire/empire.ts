import {weatherForDay,weatherDemand,weatherSeed,WeatherDemand} from './weather';
import type {GameState} from '../hooks/useGameLoop';
import {activeRecipes, INITIAL_INVENTORY_VALUE, STARTING_MONEY, startOrPauseArrivals, weeklyWages} from '../gameplay';
import {Business, automaticLoanPayments, ensureLoanRepayments, payWeeklyLease, createBusiness, ExpansionState, finishWeek, initialExpansion, nextDay, PROPERTIES, propertyById} from '../prototype/expansionModel';
import {advanceVenues,createVenue,isVenue,startVenueWeek} from './venueSimulation';
import {configureRestaurantIdentity} from './restaurantIdentity';
import {chooseRestaurantType,validRestaurantType} from '../restaurantTypes';
import type {RestaurantType} from '../data/restaurantCatalogs';
import {openBusinessBooks} from './venueFinance';
import {createRetail} from './retail';
import {ensureLodging} from './lodging';
import {ensurePlaza} from './plaza';
import {openWeeklyBooks,weeklyProfitLoss} from './weeklyFinance';

export interface EmpireState {
  version: 1;
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

export function createEmpire(diner:GameState):EmpireState {
  diner=configureRestaurantIdentity(diner,'diner');
  const district=initialExpansion(diner.money);
  district.week=diner.week;district.day=Math.min(7,Math.floor(diner.time*7/100)+1);
  district.businesses.diner.ledger=[{week:diner.week,day:district.day,label:'Opening diner balance',amount:diner.money}];
  district.notice='Grow from your first diner. New businesses use their own accounts; transfers are repayable loans.';
  district.businesses.diner=openWeeklyBooks(propertyById('diner')!,district.businesses.diner,district,diner);
  return {version:1,activeRestaurantId:'diner',speed:diner.gameSpeed,initialDinerCash:diner.money,restaurants:{diner},district};
}

/** Restaurant money is authoritative; the district is a view of those accounts. */
export function districtView(empire:EmpireState):ExpansionState {
  const businesses={...empire.district.businesses};
  for(const [id,b] of Object.entries(businesses))if(isVenue(propertyById(id)!))businesses[id]=openBusinessBooks(propertyById(id)!,ensurePlaza(propertyById(id)!,ensureLodging(propertyById(id)!,id==='shop'&&!b.retail?{...b,retail:createRetail(b.stock)}:b,empire.district.week)),empire.district);
  for(const [id,r] of Object.entries(empire.restaurants)) {
    const menu=activeRecipes(r),ingredients=[...new Set(menu.flatMap(item=>Object.keys(item.ingredients)))];
    businesses[id]={...businesses[id],...(r.restaurantType?{restaurantType:r.restaurantType}:{}),cash:r.money,stock:ingredients.length?Math.min(100,...ingredients.map(ing=>r.inventory[ing]??0)):0,condition:r.tables.length?Math.round(100*r.tables.filter(t=>!t.isDirty).length/r.tables.length):100};
  }
  for(const [id,b] of Object.entries(businesses))businesses[id]=openWeeklyBooks(propertyById(id)!,b,empire.district,empire.restaurants[id]);
  return ensureLoanRepayments({...empire.district,weatherSeed:weatherSeed(empire.district.weatherSeed),businesses});
}

export function updateRestaurant(empire:EmpireState,id:string,update:(r:GameState)=>GameState):EmpireState {
  const before=empire.restaurants[id];if(!before)return empire;
  const after=update(before);if(after===before)return empire;
  const view=districtView(empire);
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
  return type?chooseRestaurantType(identified,type,true):identified;
}

export function applyDistrictUpdate(empire:EmpireState,update:(s:ExpansionState)=>ExpansionState,starter:GameState):EmpireState {
  const view=districtView(empire),changed=update(view);
  const acquired=Object.keys(changed.businesses).filter(id=>!view.businesses[id]);
  if(acquired.length&&Object.values(empire.restaurants).some(r=>r.phase!=='planning'))return {...empire,district:{...empire.district,notice:'Finish the current week before acquiring another property.'}};
  const restaurants={...empire.restaurants};
  for(const [id,b] of Object.entries(changed.businesses)) {
    if(restaurants[id])restaurants[id]={...restaurants[id],money:b.cash};
    else if(isRestaurant(id))restaurants[id]=openingRestaurant(starter,b.cash,view.week,id,empire.speed,b.restaurantType);
    if(isVenue(propertyById(id)!)&&!b.venue)changed.businesses[id]={...b,venue:createVenue(propertyById(id)!)};
  }
  const next={...empire,restaurants,district:changed};
  return {...next,district:districtView(next)};
}

export function startEmpireWeek(empire:EmpireState):EmpireState {
  if(Object.values(empire.restaurants).some(r=>r.phase!=='planning'))return empire;
  empire={...empire,district:districtView(empire)};
  const restaurants=Object.fromEntries(Object.entries(empire.restaurants).map(([id,r])=>[id,startOrPauseArrivals({...r,weekSummary:null})]));
  const businesses=Object.fromEntries(Object.entries(empire.district.businesses).map(([id,b])=>[id,isVenue(propertyById(id)!)?startVenueWeek(propertyById(id)!,b,empire.district.week):b]));
  return {...empire,restaurants,district:{...empire.district,businesses,report:[],notice:`Week ${empire.district.week} is running. All businesses operate on the same calendar. Staff continue working when you visit another property.`}};
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
      const r=restaurants[p.id]??openingRestaurant(starter,b.cash,district.week,p.id,empire.speed);
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
  if(delta<=0||empire.speed===0||Object.values(empire.restaurants).every(r=>r.phase==='planning'))return empire;
  let district=districtView(empire);
  const weather=weatherForDay(district.week,district.day,district.weatherSeed);
  let restaurants=Object.fromEntries(Object.entries(empire.restaurants).map(([id,r])=>[id,simulate(r,delta,weatherDemand(propertyById(id)!.kind,weather.kind))]));
  // Keep a readable weekly ledger without recording ten tiny entries each second.
  const businesses={...district.businesses};
  for(const [id,r] of Object.entries(restaurants)) {
    const old=empire.restaurants[id];let b={...businesses[id],cash:r.money};
    if(old.pendingPayroll.length>r.pendingPayroll.length) {
      const paid=old.pendingPayroll.reduce((n,p)=>n+p.amount,0)-r.pendingPayroll.reduce((n,p)=>n+p.amount,0);
      if(paid>0)b=cashEntry(b,district.week,district.day,'Weekly wages paid',-paid);
    }
    businesses[id]=b;
  }
  district=advanceVenues({...district,businesses},delta);
  const current=Object.values(restaurants).filter(r=>r.week===district.week);
  const day=current.length?Math.min(7,Math.floor(Math.max(...current.map(r=>r.time))*7/100)+1):7;
  while(district.day<day)district=nextDay(district,false);
  district=automaticLoanPayments(district);
  restaurants=Object.fromEntries(Object.entries(restaurants).map(([id,r])=>[id,{...r,money:district.businesses[id].cash}]));
  if(Object.values(restaurants).every(r=>r.phase==='planning'&&r.week>district.week)) {
    const nonFood=Object.fromEntries(Object.entries(district.businesses).filter(([id])=>!isRestaurant(id)));
    const closed=finishWeek({...district,businesses:nonFood},false);
    for(const [id,r] of Object.entries(restaurants)) {
      const b=district.businesses[id],summary=r.weekSummary!,p=propertyById(id)!;
      const leased=payWeeklyLease(p,b,district),rent=b.cash-leased.cash;
      const profitableStreak=summary.profit-rent>0?(empire.restaurants[id].performance?.profitableStreak??0)+1:0;
      restaurants[id]={...r,money:r.money-rent,performance:{bestServiceRate:Math.max(r.performance?.bestServiceRate??0,summary.served+summary.lost?100*summary.served/(summary.served+summary.lost):0),profitableStreak,lastWeek:district.week},stats:{...r.stats,rentCosts:(r.stats.rentCosts??0)+rent,totalExpenses:r.stats.totalExpenses+rent},weekSummary:{...summary,profit:summary.profit-rent,propertyRent:rent}};
      let account={...leased,cash:restaurants[id].money};
      account=cashEntry(account,district.week,7,'Weekly restaurant sales (already collected)',summary.revenue);
      businesses[id]=account;
    }
    const closingState={...district,day:7,businesses:{...businesses,...closed.businesses}};
    const reports=PROPERTIES.filter(p=>closingState.businesses[p.id]).map(p=>weeklyProfitLoss(p,closingState.businesses[p.id],closingState,restaurants[p.id]));
    district={...closed,businesses:closingState.businesses,closedWeek:{week:district.week,reports},report:reports.map(r=>({id:r.id,revenue:r.revenue,rent:r.rent,wages:r.wages,supplies:r.cogs+r.fees+r.spoilage+r.maintenance+r.hiring,profit:r.profit,cash:r.cash})),notice:`Week ${district.week} closed. Each business kept its own income and expenses. Wages are paid after Day 3 of the new week.`};
  }
  const next={...empire,restaurants,district};
  return {...next,district:districtView(next)};
}

export function restaurantProperty(empire:EmpireState,id:string) {
  const p=propertyById(id)!,r=empire.restaurants[id];
  return r?{...p,capacity:r.tables.length*4,wages:weeklyWages(r.staff),revenue:r.weekStats.revenue}:p;
}

export function businessFinance(empire:EmpireState,id:string) {
  const p=propertyById(id)!,b=empire.district.businesses[id];
  const openingCash=id==='diner'?(empire.initialDinerCash??STARTING_MONEY):0;
  return {openingCash,initialContribution:(id==='diner'?openingCash+INITIAL_INVENTORY_VALUE:0)+(empire.testCapital?.[id]??0),
    propertyCost:id==='diner'?0:b.tenure==='owned'?p.buy:p.deposit,
    loansPayable:empire.district.loans.filter(l=>l.to===id).reduce((n,l)=>n+l.outstanding,0),
    loansReceivable:empire.district.loans.filter(l=>l.from===id).reduce((n,l)=>n+l.outstanding,0)};
}

export const SAVE_KEY='bite-tycoon-empire-v1';
export function parseEmpireSave(raw:string|null):EmpireState|null {
  if(!raw)return null;
  try {
    const value=JSON.parse(raw) as EmpireState;
    if(value.version!==1||!value.restaurants?.diner||!value.district?.businesses?.diner||!value.restaurants[value.activeRestaurantId]||![0,1,2,5].includes(value.speed)||!Array.isArray(value.district.loans)||!Array.isArray(value.district.payroll))return null;
    for(const [id,r] of Object.entries(value.restaurants))if(!isRestaurant(id)||!Number.isFinite(r.money)||!Array.isArray(r.tables)||!Array.isArray(r.recipes)||!r.staff||!r.inventory||!r.weekStats||!Array.isArray(r.pendingPayroll)||!['planning','service','closing'].includes(r.phase))return null;
    for(const [id,b] of Object.entries(value.district.businesses))if(!propertyById(id)||!Number.isFinite(b.cash)||!Array.isArray(b.ledger))return null;
    for(const [id,b] of Object.entries(value.district.businesses))if(isVenue(propertyById(id)!)&&!b.venue)value.district.businesses[id]={...b,venue:createVenue(propertyById(id)!)};
    for(const [id,r] of Object.entries(value.restaurants)){
      if(r.restaurantType!==undefined&&!validRestaurantType(r.restaurantType))return null;
      value.restaurants[id]=configureRestaurantIdentity(r,id);
    }
    value.district=districtView(value);
    return value;
  } catch {return null;}
}
