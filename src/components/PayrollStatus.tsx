export type PayrollSummary = {cash:number;owed:number;due:number};
const money=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD'});

/** Current balances, independent of the selected profit-reporting period. */
export function PayrollStatus({cash,owed,due}:PayrollSummary){
 const overdue=Math.max(0,due),upcoming=Math.max(0,owed-overdue);
 return <section className="payroll-summary" aria-label="Current cash and unpaid wages">
  <div className="payroll-balances">
   <span>Cash now <strong>{money(cash)}</strong></span>
   <span>Wages due now <strong className={overdue>.005?'pc-red':''}>{money(overdue)}</strong></span>
   <span>Wages earned, not yet due <strong>{money(upcoming)}</strong></span>
  </div>
  <p><b>Profit is different from cash.</b> Wages count as a cost while staff work, even when cash is $0. The unpaid amount stays owed to staff.</p>
  {overdue>.005?<p className="payroll-shortfall">Automatic payments use available cash. Any unpaid balance is retried next game day; refundable tenant deposits stay protected. Paying these wages later does not charge profit again.</p>:<p>Each week’s wages are due on Day 4 of the following week. Paying an earlier week’s wages does not charge profit again.</p>}
 </section>;
}
