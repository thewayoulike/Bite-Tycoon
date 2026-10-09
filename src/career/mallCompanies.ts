import {protectedObligations} from '../empire/cashProtection';
import {createBusiness,lendCash,propertyById,type ExpansionState,type Business} from '../prototype/expansionModel';
import type {RestaurantType} from '../data/restaurantCatalogs';
import type {EmpireState} from '../empire/empire';
export type MallCompany={parent:string;unit:number;rent:number;chargedWeek:number;due:number;lastRetry:number;totalRent:number};
export type TenantTrading={cash:number;stock:number;sales:number;cogs:number;week:number;transactions:number;timer:number;turnoverPercent:number;chargedWeek:number};
export function openMallCompany(s:ExpansionState,unit:number,kind:'cafe'|'shop',type:RestaurantType='cafe',mallId='park'):ExpansionState{
 const mall=s.businesses[mallId],u=mall?.venue?.units[unit];if(!u||u.occupied||u.dirty||mall.venue?.running||!['cafe','shop'].includes(kind))return s;
 const id=`mall-${kind}-${unit}${mallId==='park'?'':'@'+mallId}`,p=propertyById(id)!,setup=kind==='cafe'?1200:900,working=1500;if(s.businesses[id]||mall.cash<setup+working+protectedObligations(propertyById(mallId)!,mall,s).total)return s;
 const created={...createBusiness('owned'),restaurantType:kind==='cafe'?type:undefined,mallCompany:{parent:mallId,unit,rent:p.rent,chargedWeek:s.week-1,due:0,lastRetry:-1,totalRent:0}};
 let next=lendCash({...s,businesses:{...s.businesses,[id]:created}},mallId,id,setup+working,20,'property');
 const child=next.businesses[id];next={...next,businesses:{...next.businesses,[id]:{...child,cash:child.cash-setup},[mallId]:{...next.businesses[mallId],plaza:{...mall.plaza!,leasesSigned:mall.plaza!.leasesSigned+1,applications:mall.plaza!.applications.filter(a=>a.unit!==unit)},venue:{...mall.venue!,units:mall.venue!.units.map((v,i)=>i===unit?{...v,occupied:true,ownerCompany:id,tenantName:p.name,shopType:kind==='cafe'?'cafe':'grocer',rent:p.rent,rentWeek:s.week,leaseEnd:999999}:v)}}},notice:`${p.name} opened with its own $1,500 cash, staff and inventory. The mall lent $${setup+working}; internal rent is recorded in both accounts.`};
 return next;
}
/** Internal rent is income to the mall and expense to the shop; never new district income. */
export function settleInternalRent(e:EmpireState,accrue=false):EmpireState{
 let s={...e.district,businesses:{...e.district.businesses}},restaurants={...e.restaurants};const today=(s.week-1)*7+s.day;
 for(const [id,original] of Object.entries(s.businesses)){
  if(!original.mallCompany)continue;let b={...original,mallCompany:{...original.mallCompany}},c=b.mallCompany,parent={...s.businesses[c.parent]};let earned=0;
  if(accrue&&c.chargedWeek<s.week){earned=c.rent;c.due+=earned;c.totalRent+=earned;c.chargedWeek=s.week;b.leaseDue=(b.leaseDue??0)+earned;
   const r=restaurants[id];if(r)restaurants[id]={...r,stats:{...r.stats,rentCosts:(r.stats.rentCosts??0)+earned,totalExpenses:r.stats.totalExpenses+earned}};
   else if(b.books)b.books={...b.books,rent:b.books.rent+earned,rentPaid:b.books.rentPaid??b.books.rent};
   if(parent.books)parent.books={...parent.books,revenue:parent.books.revenue+earned};
   if(parent.venue)parent.venue={...parent.venue,week:{...parent.venue.week,revenue:parent.venue.week.revenue+earned},totalRevenue:parent.venue.totalRevenue+earned};
   parent.internalRentIncome=(parent.internalRentIncome??0)+earned;
  }
  if(c.due&&c.lastRetry!==today){const paid=Math.min(c.due,Math.max(0,b.cash-(b.tenantDeposits??0)));b.cash-=paid;parent.cash+=paid;c.due-=paid;b.leaseDue=Math.max(0,(b.leaseDue??0)-paid);c.lastRetry=today;if(paid){b.ledger=[...b.ledger,{week:s.week,day:s.day,label:'Internal rent paid to mall',amount:-paid}].slice(-60);parent.ledger=[...parent.ledger,{week:s.week,day:s.day,label:`Internal rent received from ${propertyById(id)!.name}`,amount:paid}].slice(-60);}if(b.books)b.books={...b.books,rentPaid:(b.books.rentPaid??b.books.rent)+paid};if(restaurants[id])restaurants[id]={...restaurants[id],money:b.cash};}
  s.businesses[id]=b;s.businesses[c.parent]=parent;
 }
 return {...e,restaurants,district:s};
}
export function internalRentReceivable(s:ExpansionState,parent:string){return Object.values(s.businesses).reduce((n,b)=>n+(b.mallCompany?.parent===parent?b.mallCompany.due:0),0);}
export function internalRentForWeek(s:ExpansionState,week:number){return Object.values(s.businesses).reduce((n,b)=>n+(b.mallCompany?.chargedWeek===week?b.mallCompany.rent:0),0);}
export function advanceTenantTrade(b:Business,dt:number,week:number):Business{
 if(!b.plaza||!b.venue?.running)return b;const trading={...b.tenantTrading};
 b.venue.units.forEach((u,i)=>{
  if(!u.occupied||u.ownerCompany)return;let t={cash:1000,stock:40,sales:0,cogs:0,week,transactions:0,timer:0,turnoverPercent:b.plaza?.depth?.tenants[i]?.turnoverPercent??0,chargedWeek:0,...trading[i]};
  if(t.week!==week)t={...t,week,sales:0,cogs:0,transactions:0};
  t.timer+=dt*(.5+(b.plaza!.depth?.satisfaction??75)/100);
  while(t.timer>=4){t.timer-=4;if(t.stock<=5&&t.cash>=120){t.stock+=20;t.cash-=120;}if(t.stock>0&&(u.cleanliness??100)>=40){const sale=12+(i%4)*3;t.stock--;t.cash+=sale;t.sales+=sale;t.cogs+=6;t.transactions++;}}
  trading[i]=t;
 });return {...b,tenantTrading:trading};
}
export function closeTenantTurnover(b:Business,week:number):Business{
 if(!b.tenantTrading||!b.plaza?.depth||!b.venue)return b;let collected=0,earned=0;const due=[...b.plaza.depth.receivables],trading={...b.tenantTrading};
 for(const [key,original] of Object.entries(trading)){
  if(original.week!==week||original.chargedWeek>=week||original.turnoverPercent<=0)continue;
  const t={...original},amount=Math.round(t.sales*t.turnoverPercent)/100,paid=Math.min(t.cash,amount);t.cash-=paid;t.chargedWeek=week;earned+=amount;collected+=paid;trading[Number(key)]=t;
  if(amount>paid)due.push({id:`turnover-${key}-${week}`,unit:Number(key),tenant:b.venue.units[Number(key)].tenantName??'Tenant',amount:amount-paid,dueDay:week*7,retryDay:week*7+1});
 }
 return {...b,cash:b.cash+collected,tenantTrading:trading,books:b.books?{...b.books,revenue:b.books.revenue+earned}:undefined,venue:{...b.venue,week:{...b.venue.week,revenue:b.venue.week.revenue+earned},totalRevenue:b.venue.totalRevenue+earned},plaza:{...b.plaza,depth:{...b.plaza.depth,receivables:due,rentCollected:b.plaza.depth.rentCollected+collected}}};
}
