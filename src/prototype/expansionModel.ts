import type {VenueState} from '../empire/venueSimulation';
import type {BusinessBooks,BookCategory} from '../empire/venueFinance';
import {autoRetailStock,RetailState,retailProduct} from '../empire/retail';
import type {LodgingState} from '../empire/lodging';
export type BusinessKind = 'restaurant' | 'cafe' | 'hotel' | 'apartments' | 'shop' | 'park';
export type Property = {
  id: string; name: string; kind: BusinessKind; address: string; description: string;
  buy: number; deposit: number; rent: number; revenue: number; wages: number;
  capacity: number; unit: string; supplyCost: number; position: [number, number, number];
  accent: string; task: string; care: string;
};
export const PROPERTIES: Property[] = [
  {id:'diner',name:'Your first diner',kind:'restaurant',address:'01 · Market Street',description:'Where it all begins. Keep the original diner healthy while you grow the neighborhood.',buy:0,deposit:0,rent:0,revenue:680,wages:59,capacity:12,unit:'seats',supplyCost:110,position:[0,0,25],accent:'#b46840',task:'Serve the lunch rush',care:'Clean the dining room'},
  {id:'cafe',name:'Corner café',kind:'cafe',address:'03 · Market Street',description:'A small coffee spot with a modest entry cost. Set drink prices, stock the counter, and keep regulars coming back.',buy:6500,deposit:1800,rent:140,revenue:540,wages:75,capacity:10,unit:'seats',supplyCost:80,position:[-25,0,25],accent:'#53776b',task:'Serve the morning queue',care:'Prepare tables & equipment'},
  {id:'bistro',name:'Garden bistro',kind:'restaurant',address:'02 · Garden Lane',description:'Your second restaurant. Its own menu, team, supplies, dining room, and cash account.',buy:9800,deposit:2600,rent:210,revenue:810,wages:115,capacity:18,unit:'seats',supplyCost:145,position:[-25,0,0],accent:'#a47945',task:'Host the dinner service',care:'Clean the dining room'},
  {id:'shop',name:'Market & Co.',kind:'shop',address:'04 · Garden Lane',description:'A neighborhood store. Balance shelf prices and stock, serve shoppers, and improve the sales floor.',buy:7200,deposit:2100,rent:155,revenue:700,wages:85,capacity:16,unit:'shelves',supplyCost:190,position:[25,0,25],accent:'#6f7398',task:'Run the checkout',care:'Tidy the shop floor'},
  {id:'hotel',name:'The Marlow Hotel',kind:'hotel',address:'06 · Park Avenue',description:'A bigger investment with more to manage: room rates, arrivals, housekeeping, and guest satisfaction.',buy:18500,deposit:4800,rent:390,revenue:1320,wages:210,capacity:8,unit:'rooms',supplyCost:100,position:[25,0,0],accent:'#7c6686',task:'Check in arriving guests',care:'Prepare the guest rooms'},
  {id:'apartments',name:'Parkside apartments',kind:'apartments',address:'05 · Park Avenue',description:'Find tenants, set rents, handle repairs, and improve the building. Tenant satisfaction affects occupancy.',buy:24000,deposit:6200,rent:460,revenue:1510,wages:95,capacity:6,unit:'homes',supplyCost:65,position:[-25,0,-25],accent:'#687e94',task:'Arrange tenant viewings',care:'Resolve maintenance requests'},
  {id:'park',name:'Willow Gardens',kind:'park',address:'07 · Riverside Walk',description:'A green escape for the whole neighborhood. Maintain the grounds, stock the refreshment kiosk, and host park events.',buy:14500,deposit:3800,rent:240,revenue:790,wages:95,capacity:40,unit:'visitors',supplyCost:60,position:[0,0,0],accent:'#6f874c',task:'Host a community event',care:'Tend paths & gardens'},
];
export type LedgerEntry = {week:number; day:number; label:string; amount:number};
export type Business = {
  tenure:'owned'|'leased'; cash:number; price:'value'|'standard'|'premium'; stock:number; condition:number;
  upgrade:number; helped:boolean; spending:number; inventory?:Record<string,number>; hires?:Record<string,number>;
  manager?:{enabled:boolean;budget:number;spent:number;reserve:number}; ledger:LedgerEntry[];
  venue?:VenueState;
  lodging?:LodgingState;
  books?:BusinessBooks;
  menu?:Record<string,{price:number;enabled:boolean}>;
  retail?:RetailState;
};
export type Loan={id:string;from:string;to:string;principal:number;outstanding:number;week:number};
export type Result={id:string;revenue:number;rent:number;wages:number;supplies:number;profit:number;cash:number};
export type ExpansionState={week:number;day:number;businesses:Record<string,Business>;loans:Loan[];payroll:{businessId:string;amount:number;week:number}[];report:Result[];notice:string};
export const OPENING_CASH=300;
export const propertyById=(id:string)=>PROPERTIES.find(p=>p.id===id);
export const BUSINESS_TEAMS:Record<BusinessKind,[string,string]>={restaurant:['Waiter','Cleaner'],cafe:['Barista','Counter assistant'],hotel:['Receptionist','Housekeeper'],apartments:['Leasing assistant','Maintenance worker'],shop:['Cashier','Stock assistant'],park:['Kiosk attendant','Groundskeeper']};
const supplyNames:Record<BusinessKind,string[]>={restaurant:['Fresh ingredients','Drinks','Kitchen supplies'],cafe:['Coffee beans','Milk & pastries','Cups & napkins'],hotel:['Fresh linen','Guest toiletries','Cleaning supplies','Fresh towels','Refreshments','Repair supplies'],apartments:['Repair materials','Cleaning supplies','Safety supplies'],shop:['Fresh produce','Packaged goods','Household goods'],park:['Kiosk refreshments','Garden supplies','Cleaning supplies']};
export function createBusiness(tenure:Business['tenure'],cash=0):Business{return{tenure,cash,price:'standard',stock:100,condition:100,upgrade:0,helped:false,spending:0,ledger:[]};}
export function initialExpansion(cash=8500):ExpansionState{return{week:3,day:1,businesses:{diner:{...createBusiness('owned',cash),condition:92,ledger:[{week:3,day:1,label:'Sample savings from diner trading',amount:cash}]}},loans:[],payroll:[],report:[],notice:'Your diner has sample savings. Each property keeps its own cash; lending between businesses is tracked and repayable.'};}
function record(b:Business,state:Pick<ExpansionState,'week'|'day'>,label:string,amount:number,category?:BookCategory):Business{return{...b,cash:b.cash+amount,...(b.books?{books:category?{...b.books,[category]:b.books[category]-amount}:b.books}:{}),ledger:[...b.ledger,{week:state.week,day:state.day,label,amount}].slice(-60)};}
function changed(state:ExpansionState,id:string,b:Business,notice=state.notice):ExpansionState{return{...state,businesses:{...state.businesses,[id]:b},notice};}
export function lendCash(state:ExpansionState,from:string,to:string,amount:number):ExpansionState{
  const lender=state.businesses[from],borrower=state.businesses[to];
  if(!lender||!borrower||from===to||!Number.isFinite(amount)||amount<=0||amount>lender.cash)return{...state,notice:'Choose two different businesses and an amount the lender can afford.'};
  const loan:Loan={id:`loan-${state.loans.length+1}`,from,to,principal:amount,outstanding:amount,week:state.week};
  return{...state,businesses:{...state.businesses,[from]:record(lender,state,`Loan to ${propertyById(to)!.name}`,-amount),[to]:record(borrower,state,`Loan from ${propertyById(from)!.name}`,amount)},loans:[...state.loans,loan],notice:`${propertyById(from)!.name} lent $${amount.toLocaleString()} to ${propertyById(to)!.name}. Repayment is tracked in Finance.`};
}
export function repayLoan(state:ExpansionState,loanId:string,amount:number):ExpansionState{
  const loan=state.loans.find(l=>l.id===loanId);if(!loan||!Number.isFinite(amount)||amount<=0||amount>loan.outstanding||state.businesses[loan.to].cash<amount)return state;
  return{...state,businesses:{...state.businesses,[loan.to]:record(state.businesses[loan.to],state,`Repayment to ${propertyById(loan.from)!.name}`,-amount),[loan.from]:record(state.businesses[loan.from],state,`Repayment from ${propertyById(loan.to)!.name}`,amount)},loans:state.loans.map(l=>l.id===loanId?{...l,outstanding:l.outstanding-amount}:l),notice:`Loan repayment of $${amount.toLocaleString()} completed. Business accounts remain separate.`};
}
export function acquire(state:ExpansionState,id:string,tenure:Business['tenure'],fundingId='diner'):ExpansionState{
  const p=propertyById(id),source=state.businesses[fundingId];if(!p||state.businesses[id]||!source)return state;
  const cost=tenure==='owned'?p.buy:p.deposit,total=cost+OPENING_CASH;
  if(cost<=0||source.cash<total)return{...state,notice:`The funding business needs $${total.toLocaleString()}, including $${OPENING_CASH} opening cash.`};
  const funded=lendCash({...state,businesses:{...state.businesses,[id]:createBusiness(tenure)}},fundingId,id,total);
  return changed({...funded,report:[]},id,record(funded.businesses[id],state,tenure==='owned'?'Building purchase & setup':'Lease deposit & setup',-cost),`${p.name} opened with its own $${OPENING_CASH} cash. ${propertyById(fundingId)!.name} lent $${total.toLocaleString()} for acquisition and setup.`);
}
export function businessSupplies(p:Property,b:Business){
 if(b.retail)return b.retail.shelves.map(id=>{const item=retailProduct(id)!;return{id,name:item.name,quantity:b.retail!.stock[id]??0,costPerUnit:item.cost};});
 return supplyNames[p.kind].map((name,i)=>({id:`stock-${i}`,name,quantity:b.inventory?.[`stock-${i}`]??(p.kind==='hotel'&&i>=3?(b.books?0:100):b.stock),costPerUnit:p.kind==='hotel'?[.4,.35,.25,.3,.45,.6][i]:p.supplyCost*[.4,.35,.25][i]/100}));
}
export function businessWages(p:Property,b:Business){return p.wages+Object.values(b.hires??{}).reduce((n,count)=>n+count*35,0)+(b.manager?60:0);}
export function project(p:Property,b:Business):Result{
  const rate={value:.86,standard:1,premium:1.25}[b.price],demand={value:1,standard:.9,premium:.66}[b.price];
  const readiness=Math.min(1,b.stock/35)*(.4+.6*b.condition/100);
  const revenue=b.venue?b.venue.week.revenue:Math.round(p.revenue*rate*demand*readiness*(1+b.upgrade*.18+(b.hires?.service??0)*.08)*(b.helped?1.18:1));
  const rent=b.tenure==='leased'?p.rent:0,wages=b.venue?Math.round(b.venue.week.wages*100)/100:businessWages(p,b);
  return{id:p.id,revenue,rent,wages,supplies:b.spending,profit:revenue-rent-wages-b.spending,cash:b.cash};
}
export function changeBusiness(state:ExpansionState,id:string,action:'help'|'stock'|'care'|'upgrade'|Business['price']):ExpansionState{
  const p=propertyById(id),old=state.businesses[id];if(!p||!old)return state;
  let b={...old},cost=0,notice='',label='';
  if(['value','standard','premium'].includes(action)){b.price=action as Business['price'];notice='Pricing updated for this business. Higher prices can reduce demand.';}
  else if(action==='help'){if(b.helped)return state;b.helped=true;notice=`You helped at ${p.name}. This week's sales estimate improved.`;}
  else if(action==='stock'){if(b.stock>=100)return state;const items=businessSupplies(p,b);cost=Math.ceil(items.reduce((n,i)=>n+(100-i.quantity)*i.costPerUnit,0)-1e-8);b.inventory=Object.fromEntries(items.map(i=>[i.id,100]));b.stock=100;b.spending+=cost;notice='Supplies replenished from this business’s own cash.';label='Inventory purchase';}
  else if(action==='care'){if(b.condition>=100&&!b.venue?.units.some(u=>u.dirty))return state;cost=45;b.condition=Math.min(100,b.condition+35);if(b.venue)b.venue={...b.venue,units:b.venue.units.map(u=>({...u,dirty:false}))};b.spending+=cost;notice='Maintenance complete.';label='Maintenance';}
  else{if(b.upgrade>=3)return state;cost=600*(b.upgrade+1);b.upgrade++;notice='Space upgraded. Capacity and weekly earning potential increased.';label='Space upgrade';}
  if(old.cash<cost)return{...state,notice:`${p.name} needs $${cost}. Earn more or arrange a loan in Finance.`};
  if(cost)b=record(b,state,label,-cost,action==='stock'?'purchases':action==='care'?'maintenance':action==='upgrade'?'upgrades':undefined);
  return changed(state,id,b,notice);
}
export function hireBusinessStaff(state:ExpansionState,id:string,role:'service'|'care'|'maintenance'|'manager'):ExpansionState{
  const p=propertyById(id),b=state.businesses[id];if(!p||!b)return state;
  if(role==='manager'?!!b.manager:(b.hires?.[role]??0)>=(b.lodging?8:2))return state;
  const cost=role==='manager'?250:120;if(b.cash<cost)return{...state,notice:`${p.name} needs $${cost} to hire. Arrange a loan in Finance if needed.`};
  const next=role==='manager'?{...b,manager:{enabled:true,budget:80,spent:0,reserve:150}}:{...b,hires:{...b.hires,[role]:(b.hires?.[role]??0)+1}};
  const result=changed(state,id,record(next,state,`${role==='manager'?'Purchasing manager':role==='maintenance'?'Maintenance worker':BUSINESS_TEAMS[p.kind][role==='service'?0:1]} hiring fee`,-cost,'hiring'),`Staff hired at ${p.name}. Wages are charged only to this business.`);
  return role==='manager'?autoStockBusiness(result,id):result;
}
export function restockBusinessItem(state:ExpansionState,id:string,itemId:string,quantity=20):ExpansionState{
  const p=propertyById(id),b=state.businesses[id];if(!p||!b)return state;
  const items=businessSupplies(p,b),item=items.find(i=>i.id===itemId);if(!item)return state;
  if(!Number.isFinite(quantity)||quantity<=0)return state;
  const qty=Math.min(quantity,100-item.quantity),cost=Math.ceil(qty*item.costPerUnit-1e-8);if(qty<=0||b.cash<cost)return state;
  const inventory=Object.fromEntries(items.map(i=>[i.id,i.quantity+(i.id===itemId?qty:0)]));
  return changed(state,id,record({...b,inventory,stock:Math.min(...Object.values(inventory)),spending:b.spending+cost},state,`${item.name} (+${qty})`,-cost,'purchases'),`Delivered ${qty} units of ${item.name.toLowerCase()} to ${p.name}.`);
}
export function setBusinessManager(state:ExpansionState,id:string,changes:Partial<NonNullable<Business['manager']>>):ExpansionState{
  const b=state.businesses[id];if(!b?.manager)return state;
  const manager={...b.manager,...changes,budget:Math.max(0,Math.min(300,changes.budget??b.manager.budget)),reserve:Math.max(0,changes.reserve??b.manager.reserve),spent:b.manager.spent};
  return autoStockBusiness(changed(state,id,{...b,manager}),id);
}
export function autoStockBusiness(state:ExpansionState,id:string):ExpansionState{
  const p=propertyById(id),b=state.businesses[id];if(!p||!b?.manager?.enabled)return state;
  if(b.retail)return autoRetailStock(state,id);
  const items=businessSupplies(p,b),inventory=Object.fromEntries(items.map(i=>[i.id,i.quantity]));
  let budget=Math.max(0,Math.min(b.manager.budget-b.manager.spent,b.cash-b.manager.reserve)),spent=0;
  for(const item of items)if(item.quantity<(b.lodging?.targets[item.id]??50)){const qty=Math.min(100-item.quantity,Math.floor((budget+1e-8)/item.costPerUnit));const cost=qty*item.costPerUnit;inventory[item.id]+=qty;spent+=cost;budget-=cost;}
  if(!spent)return state;
  return changed(state,id,record({...b,inventory,stock:Math.min(...Object.values(inventory)),spending:b.spending+spent,manager:{...b.manager,spent:b.manager.spent+spent}},state,'Manager inventory order',-spent,'purchases'));
}
function settlePayroll(state:ExpansionState):ExpansionState{
  const due=state.payroll.filter(p=>p.week<=state.week);if(!due.length)return state;
  const businesses={...state.businesses};for(const pay of due)businesses[pay.businessId]=record(businesses[pay.businessId],state,'Weekly wages',-pay.amount,'wagesPaid');
  return{...state,businesses,payroll:state.payroll.filter(p=>!due.includes(p)),notice:'Due wages paid from each business’s own account.'};
}
export function finishWeek(state:ExpansionState):ExpansionState{
  const settled=settlePayroll(state),report=Object.entries(settled.businesses).map(([id,b])=>project(propertyById(id)!,b));
  const businesses=Object.fromEntries(Object.entries(settled.businesses).map(([id,b])=>{
    const result=report.find(r=>r.id===id)!;
    if(b.venue){
      let next=b;if(result.rent)next=record(next,state,'Weekly lease payment',-result.rent,'rent');
      return[id,{...next,spending:0,helped:false,...(b.lodging?{lodging:{...b.lodging,bookings:b.lodging.bookings.map(booking=>booking.status==='waiting'?{...booking,status:'cancelled' as const}:booking),lastReport:{week:state.week,occupancy:b.lodging.availableSeconds?b.lodging.occupiedSeconds/b.lodging.availableSeconds*100:0,averageRate:b.lodging.roomNights?b.lodging.roomRevenue/b.lodging.roomNights:0,reputation:b.lodging.reputation,served:b.venue.week.served,lost:b.venue.week.lost,revenue:b.venue.week.revenue}}}:{}),venue:{...b.venue,running:false,visitors:b.venue.visitors.filter(v=>v.state==='using'),week:{...b.venue.week,lost:b.venue.week.lost+b.venue.visitors.filter(v=>v.state==='waiting').length}},manager:b.manager?{...b.manager,spent:0}:undefined}];
    }
    let next=record(b,state,'Weekly sales collected',result.revenue);if(result.rent)next=record(next,state,'Weekly lease payment',-result.rent);
    return[id,{...next,inventory:Object.fromEntries(businessSupplies(propertyById(id)!,b).map(i=>[i.id,Math.max(0,i.quantity-35)])),stock:Math.max(0,b.stock-35),condition:Math.max(0,b.condition-Math.max(2,12-(b.hires?.care??0)*4)),helped:false,spending:0,manager:b.manager?{...b.manager,spent:0}:undefined}];
  }));
  let next:ExpansionState={...settled,week:state.week+1,day:1,businesses,report,payroll:[...settled.payroll,...report.map(r=>({businessId:r.id,amount:r.wages,week:state.week+1}))],notice:`Week ${state.week} closed. Sales and rent settled separately for each business. Wages are due after Day 3 of Week ${state.week+1}.`};
  for(const id of Object.keys(businesses))next=autoStockBusiness(next,id);
  next.report=next.report.map(r=>({...r,cash:next.businesses[r.id].cash}));
  return next;
}
export function nextDay(state:ExpansionState):ExpansionState{
  if(state.day===7)return finishWeek(state);
  const next={...state,day:state.day+1,report:[],notice:`Week ${state.week}, Day ${state.day+1}. Manage each business or finish the week to collect its sales.`};
  return next.day>=4?settlePayroll(next):next;
}
