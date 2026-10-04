import {STORE_LEVELS,storeLevel} from './supermarket';
import {apartmentUpkeep} from './apartments';
import type {Business,ExpansionState,Property} from '../prototype/expansionModel';
import type {GameState} from '../hooks/useGameLoop';
import {hotelWeeklyUpkeep} from './lodging';
import {mallWeeklyUpkeep} from './plaza';
export type CashProtection={wages:number;rent:number;loans:number;deposits:number;total:number;arrears:number;upkeep?:number;wageArrears?:number;returnReserve?:number};
export function protectedObligations(p:Property,b:Business,s:ExpansionState,r?:GameState):CashProtection{
 const wages=r?r.pendingPayroll.reduce((n,p)=>n+p.amount,0)+r.weekStats.wages:s.payroll.filter(v=>v.businessId===p.id).reduce((n,v)=>n+v.amount,0)+(b.venue?.running?b.venue.week.wages:0);
 const rent=(b.mallCompany&&b.mallCompany.chargedWeek<s.week?b.mallCompany.rent:0)+(b.leaseDue??0)+(b.tenure==='leased'&&(b.leaseChargedWeek??b.leasePaidWeek??0)<s.week?p.rent:0);
 const wageArrears=r?r.pendingPayroll.filter(pay=>pay.dueWeek<r.week||(pay.dueWeek===r.week&&r.time>=300/7)).reduce((n,pay)=>n+pay.amount,0):s.payroll.filter(pay=>pay.businessId===p.id&&(pay.week<s.week||(pay.week===s.week&&s.day>=4))).reduce((n,pay)=>n+pay.amount,0);
 const upkeep=r?.advanced?.terrace?15:b.retail?.store?STORE_LEVELS[storeLevel(b)-1].upkeep+b.retail.store.serviceDue:b.plaza?mallWeeklyUpkeep(b)+(b.plaza.depth?.serviceDue??0):p.kind==='hotel'?hotelWeeklyUpkeep(b)+(b.lodging?.serviceDue??0):p.kind==='apartments'?apartmentUpkeep(b)+(b.lodging?.serviceDue??0):0;
 let loans=0,arrears=(b.leaseDue??0)+wageArrears+(b.lodging?.serviceDue??0)+(b.retail?.store?.serviceDue??0)+(b.plaza?.depth?.serviceDue??0);
 for(const l of s.loans.filter(l=>l.to===p.id&&l.outstanding>0)){
   const due=l.repayment?.due??0,installment=l.repayment?.weeklyAmount??Math.ceil(l.principal*10)/100;
   loans+=Math.min(l.outstanding,due+installment);arrears+=due;
 }
 const deposits=b.tenantDeposits??0,returnReserve=b.retail?.store?.returnBuffer??0;
 return {wages,rent,loans,deposits,upkeep,wageArrears,returnReserve,total:wages+rent+loans+deposits+upkeep+returnReserve,arrears};
}
