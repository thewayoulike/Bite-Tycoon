import {Business,ExpansionState,Property,businessSupplies} from '../prototype/expansionModel';
import {offersFor,offerEnabled} from './businessOffers';
import {venueFinancials} from './venueFinance';
import {FinancialConsole,ReportData} from '../preview/FinancialConsole';
import '../preview/console.css';
import {lodgingMetrics} from './lodging';
import {FinancialPeriodView} from './WeeklyProfitLoss';
import {weeklyProfitLoss} from './weeklyFinance';
export function BusinessStatements({p,b,state}:{p:Property;b:Business;state:ExpansionState}){
 const f=venueFinancials(p,b,state),book=f.book;
 const data:ReportData={incomeLabel:b.plaza?'Shop rental income':undefined,offerCount:b.plaza?b.venue?.units.length:b.retail?b.retail.shelves.length:offersFor(p).filter(o=>offerEnabled(b,o.id)).length,capital:book.capital,period:`Accounting period: Week ${book.week}, Day ${book.day} to Week ${state.week}, Day ${state.day}.`,title:p.name,week:state.week,day:state.day,openingCash:book.openingCash,openingCapital:book.openingEquity+book.capital,wagesOwed:f.wagesOwed,netProfit:f.profit,rent:book.rent,
 account:{condition:b.condition,purchases:book.purchases,cash:b.cash,revenue:book.revenue,cogs:f.costOfSupplies,expenses:book.maintenance+book.hiring,wages:book.wagesAccrued,paidWages:book.wagesPaid,served:b.venue?.totalServed??0,openingProperty:book.openingProperty,openingStock:book.openingStock,research:0,units:(b.venue?.units??[]).map(u=>({...u,rent:u.rent??0})),items:businessSupplies(p,b).map(i=>({id:i.id,name:i.name,category:'Supplies',cost:i.costPerUnit,price:i.costPerUnit,stock:i.quantity,enabled:true,color:'#888888'})),reserve:b.manager?.reserve??0},
 figures:{assets:f.assets,liabilities:f.liabilities,equity:f.equity,stock:f.stock,improvements:book.upgrades,receivable:f.loans.receivable,payable:f.loans.payable,operating:f.operating,financing:f.financing,closingCash:f.closingCash}};
 const metrics=b.lodging?lodgingMetrics(b):null;
 return <FinancialPeriodView report={weeklyProfitLoss(p,b,state)}>{metrics&&<div className="lodging-console lodging-finance-metrics"><div className="lodging-metrics">{[['Current occupancy',`${Math.round(metrics.occupancy)}%`],['Week occupancy',`${Math.round(metrics.weeklyOccupancy)}%`],[p.kind==='hotel'?'Average nightly rate':'Average new lease',`$${metrics.averageRate.toFixed(2)}`],['Wages owed',`$${f.wagesOwed.toFixed(2)}`]].map(([label,value])=><div className="mc-inner-panel" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><p>Upcoming payments: {state.payroll.filter(pay=>pay.businessId===p.id).map(pay=>`$${pay.amount.toFixed(2)} wages after Day 3, Week ${pay.week}`).join(' · ')||`Current wages accrue for payment after Day 3, Week ${state.week+1}`}.{b.tenure==='leased'?` Property rent $${p.rent} at week end.`:''}</p></div>}<FinancialConsole id={p.id} data={data}/></FinancialPeriodView>;
}
