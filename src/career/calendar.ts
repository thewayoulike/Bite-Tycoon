import {leaseReserve} from '../empire/propertyMarket';
import type {EmpireState} from '../empire/empire';
import {propertyById,businessWages} from '../prototype/expansionModel';
import {weeklyWages} from '../gameplay';
import {crewPremium} from './crew';
import {protectedObligations} from '../empire/cashProtection';
import {stockDay,dayLabel} from '../inventory/stockroom';
export type CalendarEntry={id:string;business:string;day:number;label:string;amount:number;committed:boolean};
export function paymentCalendar(e:EmpireState){
 const s=e.district,today=stockDay(s.week,s.day),rows:CalendarEntry[]=[];
 for(const [id,b] of Object.entries(s.businesses)){
  const p=propertyById(id)!,r=e.restaurants[id],payroll=r?r.pendingPayroll.map(p=>({week:p.dueWeek,amount:p.amount})):s.payroll.filter(v=>v.businessId===id);
  payroll.forEach((v,i)=>rows.push({id:`${id}-wages-${i}`,business:id,day:stockDay(v.week,4),label:'Earned wages payable',amount:v.amount,committed:true}));
  rows.push({id:`${id}-forecast-wages`,business:id,day:stockDay(s.week+1,4),label:'Current week wages · full-week estimate',amount:r?weeklyWages(r.staff)+crewPremium(r.crew):businessWages(p,b),committed:false});
  if(b.leaseDue)rows.push({id:`${id}-arrears`,business:id,day:today,label:'Overdue property lease · daily retry',amount:b.leaseDue,committed:true});
  if(b.tenure==='leased'&&(b.leaseTerms||(b.leaseChargedWeek??0)<s.week))rows.push({id:`${id}-lease`,business:id,day:stockDay(b.leaseTerms?.nextPaymentWeek??s.week,7),label:b.leaseTerms?'Monthly property rent · 4-week month':'Property lease',amount:b.leaseTerms?leaseReserve(p,b,s)-(b.leaseDue??0):p.rent,committed:true});
  if(b.mallCompany&&b.mallCompany.chargedWeek<s.week)rows.push({id:`${id}-internal-rent`,business:id,day:stockDay(s.week,7),label:'Internal shop rent to mall',amount:b.mallCompany.rent,committed:true});
  const protection=protectedObligations(p,b,s,r);
  if(protection.upkeep)rows.push({id:`${id}-upkeep`,business:id,day:today,label:'Facilities / shared upkeep allowance',amount:protection.upkeep,committed:false});
  for(const o of (r?.stockroom??b.stockroom)?.orders??[])rows.push({id:`${id}-delivery-${o.id}`,business:id,day:o.dueDay,label:`Prepaid delivery · ${o.itemId} × ${o.qty}`,amount:0,committed:true});
 }
 for(const l of s.loans.filter(v=>v.outstanding>0)){
  if(l.repayment?.due)rows.push({id:l.id+'-due',business:l.to,day:today,label:`Loan arrears to ${propertyById(l.from)!.name} · daily retry`,amount:l.repayment.due,committed:true});
  const week=Math.max(l.repayment?.startWeek??s.week+1,(l.repayment?.lastScheduledWeek??s.week)+1);
  rows.push({id:l.id,business:l.to,day:stockDay(week,4),label:`Loan instalment to ${propertyById(l.from)!.name}`,amount:Math.min(l.outstanding-(l.repayment?.due??0),l.repayment?.weeklyAmount??l.principal/10),committed:true});
 }
 return rows.filter(r=>r.amount>=0).sort((a,b)=>a.day-b.day||a.business.localeCompare(b.business)).map(r=>({...r,date:dayLabel(r.day),overdue:r.day<today}));
}
