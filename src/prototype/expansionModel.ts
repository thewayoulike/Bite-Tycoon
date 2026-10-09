import {cleanBusinessName,validateBusinessSetup,type BusinessSetup,type BuildingDesignId} from '../empire/buildingDesigns';
import {crewPremium} from '../career/crew';
import {acquisitionQuote,canConstruct,canLease,constructionIdentity,listedPropertyIdentity,marketSiteIdentity,siteOffer,marketKindName,leaseReserve,weeklyLeaseExpense,type MarketState,type AcquisitionRecord,type LeaseTerms} from '../empire/propertyMarket';
import {hotelWeeklyOccupancy} from '../empire/hotelProgression';
import type {Stockroom} from '../inventory/stockroom';
import {orderBusinessStock,manageBusinessStockroom,businessStockViews} from '../inventory/businessStockroom';
import {newWeatherSeed} from '../empire/weather';
import {validRestaurantType} from '../restaurantTypes';
import type {RestaurantType} from '../data/restaurantCatalogs';
import type {VenueState} from '../empire/venueSimulation';
import type {BusinessBooks,BookCategory} from '../empire/venueFinance';
import type {WeeklyBooks,WeeklyProfitLoss} from '../empire/weeklyFinance';
import {autoRetailStock,RetailState,retailProduct,recommendedRetailBudget,SUPERMARKET_MAX_BUDGET} from '../empire/retail';
import type {LodgingState} from '../empire/lodging';
import type {PlazaState} from '../empire/plaza';
import {protectedObligations} from '../empire/cashProtection';
import type {AssetLedger} from '../empire/assets';
export type BusinessKind = 'restaurant' | 'cafe' | 'hotel' | 'apartments' | 'shop' | 'park' | 'plaza';
export type Property = {
  id: string; name: string; design?:BuildingDesignId; kind: BusinessKind; address: string; description: string;
  buy: number; deposit: number; rent: number; revenue: number; wages: number;
  capacity: number; unit: string; supplyCost: number; position: [number, number, number];
  accent: string; task: string; care: string;
};
export const PROPERTIES: Property[] = [
  {id:'diner',name:'Your first diner',kind:'restaurant',address:'01 · Market Street',description:'Where it all begins. Keep the original diner healthy while you grow the neighborhood.',buy:0,deposit:0,rent:0,revenue:680,wages:59,capacity:12,unit:'seats',supplyCost:110,position:[0,0,25],accent:'#b46840',task:'Serve the lunch rush',care:'Clean the dining room'},
  {id:'cafe',name:'Corner café',kind:'cafe',address:'03 · Market Street',description:'A small coffee spot with a modest entry cost. Set drink prices, stock the counter, and keep regulars coming back.',buy:6500,deposit:1800,rent:140,revenue:540,wages:75,capacity:10,unit:'seats',supplyCost:80,position:[-25,0,25],accent:'#53776b',task:'Serve the morning queue',care:'Prepare tables & equipment'},
  {id:'bistro',name:'Garden bistro',kind:'restaurant',address:'02 · Garden Lane',description:'Your second restaurant. Its own menu, team, supplies, dining room, and cash account.',buy:9800,deposit:2600,rent:210,revenue:810,wages:115,capacity:18,unit:'seats',supplyCost:145,position:[-25,0,0],accent:'#a47945',task:'Host the dinner service',care:'Clean the dining room'},
  {id:'shop',name:'Garden Lane Supermarket',kind:'shop',address:'04 · Garden Lane',description:'Run a neighborhood supermarket with fresh produce, a bakery, chilled groceries and household essentials. Choose your range, set prices, order stock and serve shoppers at the checkout.',buy:7200,deposit:2100,rent:155,revenue:700,wages:85,capacity:16,unit:'shelves',supplyCost:190,position:[25,0,25],accent:'#315e59',task:'Run the supermarket checkout',care:'Keep aisles clean and shelves stocked'},
  {id:'hotel',name:'The Marlow Hotel',kind:'hotel',address:'06 · Park Avenue',description:'A bigger investment with more to manage: room rates, arrivals, housekeeping, and guest satisfaction.',buy:18500,deposit:4800,rent:390,revenue:1320,wages:210,capacity:8,unit:'rooms',supplyCost:100,position:[25,0,0],accent:'#7c6686',task:'Check in arriving guests',care:'Prepare the guest rooms'},
  {id:'apartments',name:'Parkside apartments',kind:'apartments',address:'05 · Park Avenue',description:'Find tenants, set rents, handle repairs, and improve the building. Tenant satisfaction affects occupancy.',buy:24000,deposit:6200,rent:460,revenue:1510,wages:95,capacity:6,unit:'homes',supplyCost:65,position:[-25,0,-25],accent:'#687e94',task:'Arrange tenant viewings',care:'Resolve maintenance requests'},
  {id:'park',name:'Willow Galleria Mall',kind:'plaza',address:'07 · Garden Square',description:'A five-floor glass shopping mall beside Willow Gardens. Start with four shops, then unlock family shopping, a food court, leisure and sky dining. Choose tenants, set rents and build visitor facilities.',buy:14500,deposit:3800,rent:240,revenue:790,wages:95,capacity:4,unit:'starting shops · up to 20',supplyCost:60,position:[0,0,-28],accent:'#617b89',task:'Review shop applications',care:'Maintain shops & shared spaces'},
];
export const PUBLIC_GARDEN:Property={...PROPERTIES[6],id:'public-garden',name:'Willow Gardens',kind:'park',position:[0,0,0],description:'Public gardens · open to everyone',unit:'visitors'};
export type LedgerEntry = {week:number; day:number; label:string; amount:number};
export type Business = {
  name?:string; design?:BuildingDesignId;
  acquisition?:AcquisitionRecord;
  leaseTerms?:LeaseTerms;
  leaseAccrued?:number;
  mallCompany?:import("../career/mallCompanies").MallCompany;
  tenantTrading?:Record<number,import("../career/mallCompanies").TenantTrading>;
  internalRentIncome?:number;
  crew?:import("../career/crew").Employee[];
  retailEvents?:import("../career/retailEvents").RetailEvents;
  serviceDepth?:import("../career/services").ServiceDepth;
  stockroom?:Stockroom;
  assets?:AssetLedger;
  leaseDue?:number;leaseChargedWeek?:number;leaseLastAttemptDay?:number;
  deferredIncome?:number;tenantDeposits?:number;
  restaurantType?:RestaurantType;
  tenure:'owned'|'leased'; cash:number; price:'value'|'standard'|'premium'; stock:number; condition:number;
  upgrade:number; helped:boolean; spending:number; inventory?:Record<string,number>; hires?:Record<string,number>;
  manager?:{enabled:boolean;budget:number;spent:number;reserve:number}; ledger:LedgerEntry[];
  venue?:VenueState;
  lodging?:LodgingState;
  plaza?:PlazaState;
  books?:BusinessBooks;
  weeklyBooks?:WeeklyBooks;
  menu?:Record<string,{price:number;enabled:boolean}>;
  retail?:RetailState;
  leasePaidWeek?:number;
};
export type LoanRepayment={weeklyAmount:number;startWeek:number;lastScheduledWeek:number;due:number;lastAttemptDay:number};
export type Loan={id:string;from:string;to:string;principal:number;outstanding:number;week:number;repayment?:LoanRepayment;term?:10|20|40;purpose?:'operating'|'property';refinancedWeek?:number};
export type Result={id:string;revenue:number;rent:number;wages:number;supplies:number;profit:number;cash:number};
export type ExpansionState={market?:MarketState;week:number;day:number;weatherSeed?:number;businesses:Record<string,Business>;loans:Loan[];payroll:{businessId:string;amount:number;week:number}[];report:Result[];closedWeek?:{week:number;reports:WeeklyProfitLoss[];internalRent?:number};notice:string};
export const OPENING_CASH=300;
export function propertyById(id:string,business?:Pick<Business,'name'|'design'>):Property|undefined{
 const p=basePropertyById(id);return p&&business?{...p,name:cleanBusinessName(business.name)??p.name,design:business.design}:p;
}
function basePropertyById(id:string):Property|undefined{
 const base=PROPERTIES.find(p=>p.id===id);if(base)return base;
 const listing=listedPropertyIdentity(id);
 if(listing){const template=PROPERTIES.find(p=>p.kind===listing.kind)!;return {...template,id,name:`${listing.kind==='shop'?'Supermarket':'Restaurant'} · ${listing.plot.name}`,address:listing.plot.name,position:listing.plot.position};}
 const construction=constructionIdentity(id);
 if(construction){const template=PROPERTIES.find(p=>p.kind===construction.kind)!;return {...template,id,name:`${marketKindName(construction.kind)} · ${construction.plot.name}`,address:construction.plot.name,position:construction.plot.position};}
 const child=/^mall-(cafe|shop)-(\d+)(?:@(built-.+-plaza))?$/.exec(id);if(!child||Number(child[2])>=20)return undefined;
 const parent=propertyById(child[3]??'park');if(!parent||parent.kind!=='plaza')return undefined;
 const food=child[1]==='cafe',index=Number(child[2]),template=PROPERTIES.find(p=>p.id===(food?'cafe':'shop'))!;
 return {...template,id,name:`Galleria ${food?'café':'grocer'} · ${Math.floor(index/4)+1}0${index%4+1}`,buy:food?1200:900,deposit:0,rent:food?260:210,address:'Inside '+parent.name,position:parent.position};
}
export const BUSINESS_TEAMS:Record<BusinessKind,[string,string]>={restaurant:['Waiter','Cleaner'],cafe:['Barista','Counter assistant'],hotel:['Receptionist','Housekeeper'],apartments:['Leasing assistant','Maintenance worker'],shop:['Cashier','Stock assistant'],park:['Kiosk attendant','Groundskeeper'],plaza:['Leasing assistant','Building caretaker']};
const supplyNames:Record<BusinessKind,string[]>={restaurant:['Fresh ingredients','Drinks','Kitchen supplies'],cafe:['Coffee beans','Milk & pastries','Cups & napkins'],hotel:['Fresh linen','Guest toiletries','Cleaning supplies','Fresh towels','Refreshments','Repair supplies'],apartments:['Repair materials','Cleaning supplies','Safety supplies','Light bulbs','Plumbing fittings','Replacement appliances'],shop:['Fresh produce','Packaged goods','Household goods'],park:['Kiosk refreshments','Garden supplies','Cleaning supplies'],plaza:['Cleaning supplies','Repair materials','Safety supplies','Paper goods','Light bulbs','Tray & dining supplies']};
export function createBusiness(tenure:Business['tenure'],cash=0):Business{return{tenure,cash,price:'standard',stock:100,condition:100,upgrade:0,helped:false,spending:0,ledger:[]};}
export function initialExpansion(cash=8500):ExpansionState{return{week:3,day:1,weatherSeed:newWeatherSeed(),businesses:{diner:{...createBusiness('owned',cash),condition:92,ledger:[{week:3,day:1,label:'Sample savings from diner trading',amount:cash}]}},loans:[],payroll:[],report:[],notice:'Your diner has sample savings. Each property keeps its own cash; lending between businesses is tracked and repayable.'};}
function record(b:Business,state:Pick<ExpansionState,'week'|'day'>,label:string,amount:number,category?:BookCategory):Business{return{...b,cash:b.cash+amount,...(b.books?{books:category?{...b.books,[category]:b.books[category]-amount}:b.books}:{}),ledger:[...b.ledger,{week:state.week,day:state.day,label,amount}].slice(-60)};}
function changed(state:ExpansionState,id:string,b:Business,notice=state.notice):ExpansionState{return{...state,businesses:{...state.businesses,[id]:b},notice};}
export function lendCash(state:ExpansionState,from:string,to:string,amount:number,term:10|20|40=10,purpose:'operating'|'property'='operating'):ExpansionState{
  if(![10,20,40].includes(term)||!['operating','property'].includes(purpose))return state;
  const lender=state.businesses[from],borrower=state.businesses[to];
  if(!lender||!borrower||from===to||!Number.isFinite(amount)||amount<=0||amount>lender.cash)return{...state,notice:'Choose two different businesses and an amount the lender can afford.'};
  amount=Math.round(amount*100)/100;if(amount<=0||amount>lender.cash)return state;
  let loan:Loan={id:`loan-${state.loans.length+1}`,from,to,principal:amount,outstanding:amount,week:state.week,term,purpose};
  loan={...loan,repayment:{...loanRepayment(loan,state.week),weeklyAmount:Math.ceil(amount/term*100)/100}};
  return{...state,businesses:{...state.businesses,[from]:record(lender,state,`Loan to ${propertyById(to,state.businesses[to])!.name}`,-amount),[to]:record(borrower,state,`Loan from ${propertyById(from,state.businesses[from])!.name}`,amount)},loans:[...state.loans,loan],notice:`${propertyById(from,state.businesses[from])!.name} lent $${amount.toLocaleString()} to ${propertyById(to,state.businesses[to])!.name}. Repayments are automatic from Week ${state.week+1}, Day 4; see Loans for the schedule.`};
}
export function repayLoan(state:ExpansionState,loanId:string,amount:number,automatic=false):ExpansionState{
  const loan=state.loans.find(l=>l.id===loanId);if(!loan||!state.businesses[loan.to]||!state.businesses[loan.from]||!Number.isFinite(amount)||amount<=0||amount>loan.outstanding||state.businesses[loan.to].cash<amount)return state;
  amount=Math.round(amount*100)/100;if(!amount||amount>loan.outstanding||amount>state.businesses[loan.to].cash)return state;
  const schedule=loanRepayment(loan,state.week),outstanding=Math.round((loan.outstanding-amount)*100)/100,prefix=automatic?'Automatic loan repayment':'Repayment';
  return{...state,businesses:{...state.businesses,[loan.to]:record(state.businesses[loan.to],state,`${prefix} to ${propertyById(loan.from,state.businesses[loan.from])!.name}`,-amount),[loan.from]:record(state.businesses[loan.from],state,`${prefix} from ${propertyById(loan.to,state.businesses[loan.to])!.name}`,amount)},loans:state.loans.map(l=>l.id===loanId?{...l,outstanding,repayment:{...schedule,due:Math.min(outstanding,Math.max(0,Math.round((schedule.due-amount)*100)/100))}}:l),notice:`${automatic?'Automatic loan':'Loan'} repayment of $${amount.toLocaleString()} completed. Business accounts remain separate.`};
}

/** Legacy balances get a forward-only schedule; loading a save never debits cash. */
export function loanRepayment(loan:Loan,currentWeek:number):LoanRepayment{
  return loan.repayment??{weeklyAmount:Math.ceil(loan.principal*10)/100,startWeek:currentWeek+1,lastScheduledWeek:currentWeek,due:0,lastAttemptDay:-1};
}
export function ensureLoanRepayments(state:ExpansionState):ExpansionState{
  if(state.loans.every(l=>l.repayment||l.outstanding<=0))return state;
  return {...state,loans:state.loans.map(l=>l.outstanding>0&&!l.repayment?{...l,repayment:loanRepayment(l,state.week)}:l)};
}
export function refinanceLoan(state:ExpansionState,id:string,term:10|20|40):ExpansionState{
 const loan=state.loans.find(l=>l.id===id);if(!loan||loan.outstanding<=0||![10,20,40].includes(term))return state;
 return {...state,loans:state.loans.map(l=>l.id===id?{...l,term,refinancedWeek:state.week,repayment:{weeklyAmount:Math.ceil(l.outstanding/term*100)/100,startWeek:state.week+1,lastScheduledWeek:state.week,due:0,lastAttemptDay:-1}}:l),notice:`Remaining balance rescheduled over ${term} weeks. No cash transferred, no fee and no new loan.`};
}
export function automaticLoanPayments(state:ExpansionState):ExpansionState{
  let next=ensureLoanRepayments(state);
  const dueWeek=state.week-(state.day<4?1:0),absoluteDay=(state.week-1)*7+state.day;
  // Oldest loan first. Rent stays reserved in its own business account.
  for(const original of next.loans){
    if(original.outstanding<=0||!next.businesses[original.from]||!next.businesses[original.to])continue;
    let schedule=loanRepayment(original,state.week);
    const first=Math.max(schedule.startWeek,schedule.lastScheduledWeek+1);
    if(dueWeek>=first)schedule={...schedule,lastScheduledWeek:dueWeek,due:Math.min(original.outstanding,Math.round((schedule.due+(dueWeek-first+1)*schedule.weeklyAmount)*100)/100)};
    if(schedule.due<=0||schedule.lastAttemptDay===absoluteDay)continue;
    schedule={...schedule,lastAttemptDay:absoluteDay};
    next={...next,loans:next.loans.map(l=>l.id===original.id?{...l,repayment:schedule}:l)};
    const borrower=next.businesses[original.to],p=propertyById(original.to,state.businesses[original.to])!;
    const rentReserve=leaseReserve(p,borrower,state)+(borrower.tenantDeposits??0);
    const available=Math.max(0,Math.floor((borrower.cash-rentReserve+1e-8)*100)/100);
    const payment=Math.min(schedule.due,original.outstanding,available);
    if(payment>0)next=repayLoan(next,original.id,payment,true);
  }
  return next;
}
/** Scheduled lease expense, charged once for a particular closing week. */
export function payWeeklyLease(p:Property,b:Business,state:Pick<ExpansionState,'week'|'day'>):Business{
  const expense=weeklyLeaseExpense(p,b,state.week);if(!expense)return b;
  let next={...b,leaseChargedWeek:state.week,books:b.books?{...b.books,rentPaid:b.books.rentPaid??b.books.rent,rent:b.books.rent+expense}:undefined};
  if(b.leaseTerms){
    next.leaseAccrued=(b.leaseAccrued??0)+expense;
    if(state.week>=b.leaseTerms.nextPaymentWeek){next.leaseDue=(b.leaseDue??0)+next.leaseAccrued;next.leaseAccrued=0;next.leaseTerms={...b.leaseTerms,nextPaymentWeek:state.week+4};}
  }else next.leaseDue=(b.leaseDue??0)+expense;
  return retryLease(p,next,{...state,day:7});
}
export function retryLease(p:Property,b:Business,state:Pick<ExpansionState,'week'|'day'>):Business{
 const today=(state.week-1)*7+state.day;
 if(b.mallCompany||!(b.leaseDue!>0)||b.leaseLastAttemptDay===today)return b;
 const amount=Math.min(b.leaseDue!,Math.max(0,b.cash-(b.tenantDeposits??0))),due=Math.round((b.leaseDue!-amount)*100)/100;
 const paid=amount?record(b,state,'Automatic lease payment',-amount):b;
 return {...paid,leaseDue:due,leaseLastAttemptDay:today,leasePaidWeek:due<=0?b.leaseChargedWeek:b.leasePaidWeek,books:paid.books?{...paid.books,rentPaid:(paid.books.rentPaid??paid.books.rent)+amount}:undefined};
}
export function acquire(state:ExpansionState,id:string,tenure:Business['tenure'],fundingId='diner',restaurantType?:RestaurantType,term:10|20|40=40,setup:BusinessSetup={}):ExpansionState{
  const p=propertyById(id),source=state.businesses[fundingId];if(![10,20,40].includes(term)||!p||state.businesses[id])return state;
  if(constructionIdentity(id)&&(!state.market||!canConstruct(id)))return {...state,notice:'Choose a business type supported by this land plot.'};
  if(tenure==='leased'&&!canLease(p.kind))return {...state,notice:p.kind==='plaza'?'Malls cannot be leased. Buy an existing mall or build one on the large plot.':'Only restaurants and supermarkets can be leased. Buy this building or construct it on land.'};
  if(state.market)return acquireMarketProperty(state,id,tenure,fundingId,restaurantType,term,setup);
  const setupError=validateBusinessSetup(setup,false);if(setupError)return {...state,notice:setupError};
  if(!source)return state;
  const cost=tenure==='owned'?p.buy:p.deposit,total=cost+OPENING_CASH;
  if(cost<=0||source.cash<total)return{...state,notice:`The funding business needs $${total.toLocaleString()}, including $${OPENING_CASH} opening cash.`};
  if(restaurantType!==undefined&&(!['restaurant','cafe'].includes(p.kind)||!validRestaurantType(restaurantType)))return state;
  const funded=lendCash({...state,businesses:{...state.businesses,[id]:{...createBusiness(tenure),...(setup.name?{name:cleanBusinessName(setup.name)}:{}),...(restaurantType?{restaurantType}:{})}}},fundingId,id,total,term,'property');
  return changed({...funded,report:[]},id,record(funded.businesses[id],state,tenure==='owned'?'Building purchase & setup':'Lease deposit & setup',-cost),`${p.name} opened with its own $${OPENING_CASH} cash. ${propertyById(fundingId,state.businesses[fundingId])!.name} lent $${total.toLocaleString()} for acquisition and setup.`);
}
/** A first investment uses owner capital; subsequent business-to-business funding remains a loan. */
export function acquireMarketProperty(state:ExpansionState,id:string,tenure:Business['tenure'],fundingId:string,restaurantType?:RestaurantType,term:10|20|40=40,setup:BusinessSetup={}):ExpansionState{
  const market=state.market,p=propertyById(id);if(!market||!p||state.businesses[id]||!['owned','leased'].includes(tenure)||![10,20,40].includes(term))return state;
  const built=constructionIdentity(id),listing=listedPropertyIdentity(id),site=marketSiteIdentity(id),method=built?'construction':tenure==='leased'?'lease':'purchase',quote=acquisitionQuote(p,method);
  const setupError=validateBusinessSetup(setup,!!built);if(setupError)return {...state,notice:setupError};
  if(listing&&(siteOffer(listing.plot,market.listingSeed).id!==id||method!==listing.mode))return {...state,notice:'This offer has different terms. Reopen its current market listing.'};
  if(site&&market.parcels[site.plot.id])return {...state,notice:'This site already belongs to one of your businesses.'};
  if(built&&!canConstruct(id))return {...state,notice:'Choose a business type supported by this land plot.'};
  if(built&&(tenure!=='owned'||market.parcels[built.plot.id]))return {...state,notice:'This plot has already been developed.'};
  if(tenure==='leased'&&!canLease(p.kind))return {...state,notice:'This building is purchase-only.'};
  if(market.level<quote.level)return {...state,notice:`Reach player Level ${quote.level} before opening ${marketKindName(p.kind).toLowerCase()}.`};
  const food=['restaurant','cafe'].includes(p.kind);
  if(food&&!validRestaurantType(restaurantType))return {...state,notice:'Choose the restaurant type before opening.'};
  if(!food&&restaurantType!==undefined)return state;
  const first=!market.firstPropertyId&&Object.keys(state.businesses).length===0;
  const source=state.businesses[fundingId],total=quote.cost+(first?0:quote.workingCash);
  if(quote.cost<=0||(first?market.ownerCash:(source?.cash??0))<total)return {...state,notice:`You need $${total.toLocaleString()} for this opening package.`};
  const business:Business={...createBusiness(tenure),...(setup.name?{name:cleanBusinessName(setup.name)}:{}),...(built?{design:setup.design??'heritage'}:{}),...(food?{restaurantType}:{}),acquisition:{method,cost:quote.cost,land:quote.land,capital:first?market.startingCapital:0},...(tenure==='leased'?{leaseTerms:{weeklyRent:quote.weeklyRent,intervalWeeks:4,nextPaymentWeek:state.week+3},leaseChargedWeek:state.week-1,leaseAccrued:0}:{}),ledger:[]};
  let next:ExpansionState={...state,businesses:{...state.businesses,[id]:business},report:[]};
  if(first){next.businesses[id]=record(business,state,'Owner starting capital',market.ownerCash);}
  else next=lendCash(next,fundingId,id,total,term,'property');
  next.businesses[id]=record(next.businesses[id],state,method==='construction'?'Land, construction, fit-out and opening stock':tenure==='leased'?'Lease entry, fit-out and opening stock':'Land, building, equipment and opening stock',-quote.cost);
  return {...next,market:{...market,ownerCash:first?0:market.ownerCash,firstPropertyId:market.firstPropertyId??id,parcels:site?{...market.parcels,[site.plot.id]:id}:market.parcels},notice:`${business.name??p.name} is ready to open at Level 1. Furniture, equipment and starter inventory are included. Its own cash: $${next.businesses[id].cash.toLocaleString()}.`};
}
export function businessSupplies(p:Property,b:Business){
 if(b.retail)return b.retail.shelves.map(id=>{const item=retailProduct(id)!;return{id,name:item.name,quantity:b.retail!.stock[id]??0,costPerUnit:item.cost};});
 return supplyNames[p.kind].map((name,i)=>({id:`stock-${i}`,name,quantity:b.inventory?.[`stock-${i}`]??((p.kind==='apartments'||p.kind==='plaza')&&i>=3?0:p.kind==='hotel'&&i>=3?(b.books?0:100):b.stock),costPerUnit:p.kind==='plaza'&&i>=3?[0,0,0,.2,1.2,.4][i]:p.kind==='hotel'?[.4,.35,.25,.3,.45,.6][i]:p.kind==='apartments'&&i>=3?[0,0,0,1.2,2.5,20][i]:p.supplyCost*[.4,.35,.25][i]/100}));
}
export function businessWages(p:Property,b:Business){return crewPremium(b.crew)+p.wages+Object.values(b.hires??{}).reduce((n,count)=>n+count*35,0)+(b.manager?60:0);}
export function project(p:Property,b:Business):Result{
  const rate={value:.86,standard:1,premium:1.25}[b.price],demand={value:1,standard:.9,premium:.66}[b.price];
  const readiness=Math.min(1,b.stock/35)*(.4+.6*b.condition/100);
  const revenue=b.venue?b.venue.week.revenue:Math.round(p.revenue*rate*demand*readiness*(1+b.upgrade*.18+(b.hires?.service??0)*.08)*(b.helped?1.18:1));
  const rent=b.tenure==='leased'?(b.leaseTerms?.weeklyRent??p.rent):0,wages=b.venue?Math.round(b.venue.week.wages*100)/100:businessWages(p,b);
  return{id:p.id,revenue,rent,wages,supplies:b.spending,profit:revenue-rent-wages-b.spending,cash:b.cash};
}
export function changeBusiness(state:ExpansionState,id:string,action:'help'|'stock'|'care'|'upgrade'|Business['price']):ExpansionState{
  const p=propertyById(id),old=state.businesses[id];if(!p||!old)return state;
  let b={...old},cost=0,notice='',label='';
  if(['value','standard','premium'].includes(action)){b.price=action as Business['price'];notice='Pricing updated for this business. Higher prices can reduce demand.';}
  else if(action==='help'){if(b.helped)return state;b.helped=true;notice=`You helped at ${p.name}. This week's sales estimate improved.`;}
  else if(action==='stock'){if(b.stockroom){let next=state;for(const v of businessStockViews(p,b,state)){const qty=Math.max(0,v.rule.target-v.available-v.onOrder);if(qty)next=orderBusinessStock(next,id,v.definition.id,qty);}return next;}if(b.stock>=100)return state;const items=businessSupplies(p,b);cost=Math.ceil(items.reduce((n,i)=>n+(100-i.quantity)*i.costPerUnit,0)-1e-8);b.inventory=Object.fromEntries(items.map(i=>[i.id,100]));b.stock=100;b.spending+=cost;notice='Supplies replenished from this business’s own cash.';label='Inventory purchase';}
  else if(action==='care'){if(b.condition>=100&&!b.venue?.units.some(u=>u.dirty))return state;cost=45;b.condition=Math.min(100,b.condition+35);if(b.venue)b.venue={...b.venue,units:b.venue.units.map(u=>({...u,dirty:false}))};b.spending+=cost;notice='Maintenance complete.';label='Maintenance';}
  else{if(b.upgrade>=3)return state;cost=600*(b.upgrade+1);b.upgrade++;notice='Space upgraded. Capacity and weekly earning potential increased.';label='Space upgrade';}
  if(old.cash<cost)return{...state,notice:`${p.name} needs $${cost}. Earn more or arrange a loan in Finance.`};
  if(cost)b=record(b,state,label,-cost,action==='stock'?'purchases':action==='care'?'maintenance':action==='upgrade'?'upgrades':undefined);
  return changed(state,id,b,notice);
}
export function hireBusinessStaff(state:ExpansionState,id:string,role:'service'|'care'|'maintenance'|'concierge'|'laundry'|'cleaner'|'supervisor'|'specialist'|'electronics'|'receiving'|'handling'|'security'|'attendant'|'operator'|'manager'):ExpansionState{
  const p=propertyById(id),b=state.businesses[id];if(!p||!b)return state;
  if(role==='laundry'&&p.kind!=='hotel'||role==='concierge'&&!['hotel','plaza'].includes(p.kind))return state;
  if(['security','attendant','operator'].includes(role)&&p.kind!=='plaza')return state;
  if(p.kind==='plaza'&&(role==='attendant'&&(b.plaza?.openFloors??1)<2||role==='operator'&&(b.plaza?.openFloors??1)<4))return {...state,notice:'Open the facility floor first.'};
  if(role==='supervisor'&&p.kind!=='apartments'||role==='cleaner'&&!['apartments','shop','plaza'].includes(p.kind))return state;
  if(p.kind==='shop'&&role==='cleaner'&&(b.retail?.store?.level??2)<2)return {...state,notice:'Unlock Level 2 for a store cleaner.'};
  if(['specialist','electronics','receiving','handling'].includes(role)){const floor={specialist:2,receiving:3,electronics:4,handling:5}[role];if(p.kind!=='shop'||(b.retail?.store?.level??(b.retail?.electronicsUnlocked?5:2))<floor)return {...state,notice:'Unlock this department in Upgrades first.'};}
  if(role==='laundry'&&!b.lodging?.facilities.includes('laundry'))return {...state,notice:'Build the laundry room first.'};
  if(role==='manager'?!!b.manager:(b.hires?.[role]??0)>=(b.lodging?8:2))return state;
  const cost=role==='manager'?250:120;if(b.cash<cost)return{...state,notice:`${p.name} needs $${cost} to hire. Arrange a loan in Finance if needed.`};
  const next=role==='manager'?{...b,manager:{enabled:true,budget:b.retail?recommendedRetailBudget(b):80,spent:0,reserve:150}}:{...b,hires:{...b.hires,[role]:(b.hires?.[role]??0)+1}};
  const result=changed(state,id,record(next,state,`${role==='manager'?'Purchasing manager':role==='maintenance'?'Maintenance worker':role==='concierge'?'Concierge':role==='laundry'?'Laundry attendant':role==='specialist'?'Fresh counter specialist':role==='electronics'?'Electronics adviser':role==='receiving'?'Receiving clerk':role==='handling'?'Handling worker':role==='cleaner'?(p.kind==='shop'?'Store cleaner':p.kind==='plaza'?'Mall cleaner':'Residential cleaner'):role==='supervisor'?'Building supervisor':role==='security'?'Security officer':role==='attendant'?'Play attendant':role==='operator'?'Facility operator':BUSINESS_TEAMS[p.kind][role==='service'?0:1]} hiring fee`,-cost,'hiring'),`Staff hired at ${p.name}. Wages are charged only to this business.`);
  return role==='manager'?(b.stockroom?manageBusinessStockroom(result,id,true):autoStockBusiness(result,id)):result;
}
export function restockBusinessItem(state:ExpansionState,id:string,itemId:string,quantity=20):ExpansionState{
  if(state.businesses[id]?.stockroom)return orderBusinessStock(state,id,itemId,quantity);
  const p=propertyById(id),b=state.businesses[id];if(!p||!b)return state;
  const items=businessSupplies(p,b),item=items.find(i=>i.id===itemId);if(!item)return state;
  if(!Number.isFinite(quantity)||quantity<=0)return state;
  const qty=Math.min(quantity,100-item.quantity),cost=Math.ceil(qty*item.costPerUnit-1e-8);if(qty<=0||b.cash<cost)return state;
  const inventory=Object.fromEntries(items.map(i=>[i.id,i.quantity+(i.id===itemId?qty:0)]));
  return changed(state,id,record({...b,inventory,stock:Math.min(...Object.values(inventory)),spending:b.spending+cost},state,`${item.name} (+${qty})`,-cost,'purchases'),`Delivered ${qty} units of ${item.name.toLowerCase()} to ${p.name}.`);
}
export function setBusinessManager(state:ExpansionState,id:string,changes:Partial<NonNullable<Business['manager']>>):ExpansionState{
  const b=state.businesses[id];if(!b?.manager)return state;
  if(changes.budget!==undefined&&!Number.isFinite(changes.budget)||changes.reserve!==undefined&&!Number.isFinite(changes.reserve))return state;
  const manager={...b.manager,...changes,budget:Math.max(0,Math.min(SUPERMARKET_MAX_BUDGET,changes.budget??b.manager.budget)),reserve:Math.max(0,changes.reserve??b.manager.reserve),spent:b.manager.spent};
  const next=changed(state,id,{...b,manager});return b.stockroom?manageBusinessStockroom(next,id,true):autoStockBusiness(next,id);
}
export function autoStockBusiness(state:ExpansionState,id:string):ExpansionState{
  const p=propertyById(id),b=state.businesses[id];if(!p||!b?.manager?.enabled)return state;
  if(b.stockroom)return manageBusinessStockroom(state,id);
  if(b.retail)return autoRetailStock(state,id);
  const items=businessSupplies(p,b),inventory=Object.fromEntries(items.map(i=>[i.id,i.quantity]));
  let budget=Math.max(0,Math.min(b.manager.budget-b.manager.spent,b.cash-b.manager.reserve-protectedObligations(p,b,state).total)),spent=0;
  for(const item of items)if(item.quantity<(b.lodging?.targets[item.id]??50)){const qty=Math.min(100-item.quantity,Math.floor((budget+1e-8)/item.costPerUnit));const cost=qty*item.costPerUnit;inventory[item.id]+=qty;spent+=cost;budget-=cost;}
  if(!spent)return state;
  return changed(state,id,record({...b,inventory,stock:Math.min(...Object.values(inventory)),spending:b.spending+spent,manager:{...b.manager,spent:b.manager.spent+spent}},state,'Manager inventory order',-spent,'purchases'));
}
function settlePayroll(state:ExpansionState):ExpansionState{
  const due=state.payroll.filter(p=>p.week<state.week||(p.week===state.week&&state.day>=4));if(!due.length)return state;
  const businesses={...state.businesses},payroll=state.payroll.filter(p=>!due.includes(p));
  for(const pay of due){const b=businesses[pay.businessId],paid=Math.min(pay.amount,Math.max(0,b.cash-(b.tenantDeposits??0)));
   businesses[pay.businessId]=paid?record(b,state,'Weekly wages',-paid,'wagesPaid'):b;
   const remaining=Math.round((pay.amount-paid)*100)/100;if(remaining>0)payroll.push({...pay,amount:remaining});
  }
  return{...state,businesses,payroll,notice:payroll.some(p=>p.week<=state.week)?'Unpaid wages remain due and retry next day. Review Loans for the recovery plan.':'Due wages paid from each business’s own account.'};
}
export function finishWeek(state:ExpansionState,autoLoans=true):ExpansionState{
  const payroll=settlePayroll({...state,day:7}),settled=autoLoans?automaticLoanPayments({...payroll,day:7}):payroll,report=Object.entries(settled.businesses).map(([id,b])=>project(propertyById(id,state.businesses[id])!,b));
  const businesses=Object.fromEntries(Object.entries(settled.businesses).map(([id,b])=>{
    const result=report.find(r=>r.id===id)!;
    if(b.venue){
      let next=payWeeklyLease(propertyById(id,state.businesses[id])!,b,state);
      return[id,{...next,spending:0,helped:false,...(b.lodging?{lodging:{...b.lodging,bookings:b.lodging.bookings.map(booking=>booking.status==='waiting'?{...booking,status:'cancelled' as const}:booking),lastReport:{week:state.week,occupancy:propertyById(id,state.businesses[id])!.kind==='hotel'?hotelWeeklyOccupancy(b):b.lodging.availableSeconds?b.lodging.occupiedSeconds/b.lodging.availableSeconds*100:0,averageRate:b.lodging.roomNights?b.lodging.roomRevenue/b.lodging.roomNights:0,reputation:b.lodging.reputation,served:b.venue.week.served,lost:b.venue.week.lost,revenue:b.venue.week.revenue}}}:{}),venue:{...b.venue,running:false,visitors:b.venue.visitors.filter(v=>v.state==='using'),week:{...b.venue.week,lost:b.venue.week.lost+b.venue.visitors.filter(v=>v.state==='waiting').length}},manager:b.manager?{...b.manager,spent:0}:undefined}];
    }
    let next=payWeeklyLease(propertyById(id,state.businesses[id])!,record(b,state,'Weekly sales collected',result.revenue),state);
    return[id,{...next,inventory:Object.fromEntries(businessSupplies(propertyById(id,state.businesses[id])!,b).map(i=>[i.id,Math.max(0,i.quantity-35)])),stock:Math.max(0,b.stock-35),condition:Math.max(0,b.condition-Math.max(2,12-(b.hires?.care??0)*4)),helped:false,spending:0,manager:b.manager?{...b.manager,spent:0}:undefined}];
  }));
  let next:ExpansionState={...settled,week:state.week+1,day:1,businesses,report,payroll:[...settled.payroll,...report.map(r=>({businessId:r.id,amount:r.wages,week:state.week+1}))],notice:`Week ${state.week} closed. Sales and rent settled separately for each business. Wages are due after Day 3 of Week ${state.week+1}.`};
  for(const id of Object.keys(businesses))next=autoStockBusiness(next,id);
  next.report=next.report.map(r=>({...r,cash:next.businesses[r.id].cash}));
  return next;
}
export function nextDay(state:ExpansionState,autoLoans=true):ExpansionState{
  if(state.day===7)return finishWeek(state,autoLoans);
  const next={...state,day:state.day+1,report:[],notice:`Week ${state.week}, Day ${state.day+1}. Manage each business or finish the week to collect its sales.`};
  const paid=settlePayroll(next);
  return autoLoans?automaticLoanPayments(paid):paid;
}
