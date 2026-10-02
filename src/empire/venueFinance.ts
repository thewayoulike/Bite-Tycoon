import {Business,businessSupplies,ExpansionState,Property} from '../prototype/expansionModel';
import {retailValue} from './retail';
export type BusinessBooks={week:number;day:number;openingCash:number;openingStock:number;openingProperty:number;openingEquity:number;openingWages:number;openingLoanNet:number;revenue:number;purchases:number;wagesAccrued:number;wagesPaid:number;rent:number;maintenance:number;hiring:number;upgrades:number;capital:number};
export type BookCategory='purchases'|'wagesPaid'|'rent'|'maintenance'|'hiring'|'upgrades';
export const inventoryValue=(p:Property,b:Business)=>b.retail?retailValue(b):businessSupplies(p,b).reduce((sum,item)=>sum+item.quantity*item.costPerUnit,0);
function debt(state:ExpansionState,id:string){return {payable:state.loans.filter(l=>l.to===id).reduce((n,l)=>n+l.outstanding,0),receivable:state.loans.filter(l=>l.from===id).reduce((n,l)=>n+l.outstanding,0)};}
export function openBusinessBooks(p:Property,b:Business,state:ExpansionState):Business {
  if(b.books)return b;
  const stock=inventoryValue(p,b),property=Math.max(0,(b.tenure==='owned'?p.buy:p.deposit)-p.supplyCost),loans=debt(state,p.id);
  const wages=state.payroll.filter(pay=>pay.businessId===p.id).reduce((n,pay)=>n+pay.amount,0)+(b.venue?.running?b.venue.week.wages:0);
  return {...b,books:{week:state.week,day:state.day,openingCash:b.cash,openingStock:stock,openingProperty:property,openingEquity:b.cash+stock+property+loans.receivable-loans.payable-wages,openingWages:wages,openingLoanNet:loans.receivable-loans.payable,revenue:0,purchases:0,wagesAccrued:0,wagesPaid:0,rent:0,maintenance:0,hiring:0,upgrades:0,capital:0}};
}
export function venueFinancials(p:Property,b:Business,state:ExpansionState){
  const book=openBusinessBooks(p,b,state).books!,stock=inventoryValue(p,b),loans=debt(state,p.id);
  const costOfSupplies=book.openingStock+book.purchases-stock;
  const expenses=costOfSupplies+book.wagesAccrued+book.rent+book.maintenance+book.hiring;
  const profit=book.revenue-expenses,wagesOwed=book.openingWages+book.wagesAccrued-book.wagesPaid;
  const property=book.openingProperty+book.upgrades,assets=b.cash+stock+property+loans.receivable,liabilities=loans.payable+wagesOwed,equity=book.openingEquity+book.capital+profit;
  const operating=book.revenue-book.purchases-book.wagesPaid-book.rent-book.maintenance-book.hiring;
  const investing=-book.upgrades,financing=book.capital+book.openingLoanNet-(loans.receivable-loans.payable);
  return {book,stock,costOfSupplies,expenses,profit,wagesOwed,property,assets,liabilities,equity,loans,operating,investing,financing,netCash:operating+investing+financing,closingCash:book.openingCash+operating+investing+financing};
}
