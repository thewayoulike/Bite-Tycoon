import {useState,type ReactNode} from 'react';
import type {WeeklyProfitLoss as WeeklyReport} from './weeklyFinance';
import '../preview/console.css';
import './weeklyFinance.css';
export const reportMoney=(value:number)=>(Math.abs(value)<.005?0:value).toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2});

export function WeeklyProfitLoss({report:r,closed=false}:{report:WeeklyReport;closed?:boolean}){
 const row=(label:string,value:number,total=false)=><div className={`pc-row ${total?'pc-subtotal':''}`}><span>{label}</span><strong className={value<-.001?'pc-red':''}>{reportMoney(value)}</strong></div>;
 return <section className="pc-console weekly-profit-loss" aria-label={`${r.name} ${closed?'closing':'current week'} profit and loss`}>
  <div className="pc-banner"><div className="pc-heading"><div><h3>{closed?'Closing':'Current week'} profit & loss</h3><p>{r.name} · Week {r.week}, Day {r.day} · {closed?'saved at week close':'updates as you play'}</p></div></div></div>
  {r.partial&&<p className="weekly-history-note" role="status">Partial history for this saved week: sales and wages include earlier activity, but some earlier costs were not saved by week. Other costs are tracked from Day {r.startDay}. Complete weekly reporting {closed?'started the following week':'starts next week'}.</p>}
  <div className="pc-stats">{[['Revenue',r.revenue],['Total costs',r.expenses],[r.partial?'Tracked profit':'Net profit',r.profit],[closed?'Closing cash':'This property’s cash',r.cash]].map(([label,value])=><article key={label}><span>{label}</span><strong className={Number(value)<0?'pc-red':String(label).includes('cash')?'pc-blue':'pc-green'}>{reportMoney(Number(value))}</strong></article>)}</div>
  <article className="pc-panel"><h4>Week {r.week} · {r.partial?'recorded figures':'profit & loss statement'}</h4>
   {row('Sales, guest stays & rental income',r.revenue)}
   {row('Food, products & supplies consumed',-r.cogs)}
   {row('Gross profit',r.grossProfit,true)}
   <h5>Operating expenses · Week {r.week}</h5>
   {row('Staff wages earned — paid later',-r.wages)}
   {row('Staff recruitment fees',-r.hiring)}
   {row('Cleaning & repairs',-r.maintenance)}
   {row('Delivery platform fees',-r.fees)}
   {row('Expired stock / spoilage',-r.spoilage)}
   {row('Property rent charged',-r.rent)}
   {row('Total operating expenses',-r.overhead,true)}
   <div className="pc-end"><span>{r.partial?'Tracked operating profit':'Net operating profit'}</span><strong className={r.profit<0?'pc-red':'pc-green'}>{reportMoney(r.profit)}</strong></div>
  </article>
  <p className="pc-footnote">Only Week {r.week} activity. Stock is expensed when consumed; purchases, property upgrades, testing funds and business loans are excluded from profit. Wages count when earned, so paying last week’s wages does not charge them twice.{r.rentDue>0?` Rent of ${reportMoney(r.rentDue)} is due at week end and will appear when charged.`:''}</p>
 </section>;
}

export function FinancialPeriodView({report,children}:{report?:WeeklyReport;children:ReactNode}){
 const[period,setPeriod]=useState<'week'|'all'>('week');
 if(!report)return <>{children}</>;
 return <div className="financial-period-view"><div className="pc-subtabs financial-period-tabs" role="tablist" aria-label="Financial reporting period"><button role="tab" className={period==='week'?'mc-button-selected':'mc-button'} aria-selected={period==='week'} onClick={()=>setPeriod('week')}>This week · {report.week}</button><button role="tab" className={period==='all'?'mc-button-selected':'mc-button'} aria-selected={period==='all'} onClick={()=>setPeriod('all')}>All time · full statements</button></div>{period==='week'?<WeeklyProfitLoss report={report}/>:children}</div>;
}
