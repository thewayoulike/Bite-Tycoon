import {businessFinance,type EmpireState} from '../empire/empire';
import {propertyById} from '../prototype/expansionModel';
import {venueFinancials} from '../empire/venueFinance';
import {cumulativeProfitLoss} from '../empire/weeklyFinance';
import {transitValue,batchValue} from '../inventory/stockroom';
import {INITIAL_INVENTORY_VALUE} from '../gameplay';
export function consolidatedBalance(e:EmpireState){
 let assets=0,liabilities=0,equity=0,cash=0;
 for(const [id,b]of Object.entries(e.district.businesses)){
  const p=propertyById(id)!,r=e.restaurants[id];cash+=b.cash;
  if(!r){const f=venueFinancials(p,b,e.district);assets+=f.assets;liabilities+=f.liabilities;equity+=f.equity;continue;}
  const a=businessFinance(e,id),pl=cumulativeProfitLoss(p,b,e.district,r),profit=pl.revenue-pl.cogs-pl.wages-pl.hiring-pl.maintenance-pl.fees-pl.spoilage-pl.rent-(pl.depreciation??0);
  const stock=Object.values(r.inventoryBatches).reduce((n,b)=>n+batchValue(b),0)+transitValue(r.stockroom),wages=r.pendingPayroll.reduce((n,v)=>n+v.amount,0)+r.weekStats.wages;
  assets+=r.money+stock+r.stats.upgradeCosts+r.stats.recipeCosts+(r.stats.appCosts??0)+Math.max(0,a.propertyCost-INITIAL_INVENTORY_VALUE)-a.depreciation+a.loansReceivable;
  liabilities+=wages+a.leaseDue+a.loansPayable;equity+=a.initialContribution+profit;
 }
 const loans=e.district.loans.filter(l=>e.district.businesses[l.from]&&e.district.businesses[l.to]).reduce((n,l)=>n+l.outstanding,0),rent=Object.values(e.district.businesses).reduce((n,b)=>n+(b.mallCompany?.due??0),0);
 return {cash,assets:assets-loans-rent,liabilities:liabilities-loans-rent,equity,loansEliminated:loans,rentEliminated:rent,difference:assets-liabilities-equity};
}
