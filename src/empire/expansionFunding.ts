import type {ExpansionState} from '../prototype/expansionModel';
import {propertyById,businessWages} from '../prototype/expansionModel';
import type {GameState} from '../hooks/useGameLoop';
import {weeklyWages} from '../gameplay';
import {crewPremium} from '../career/crew';
import {protectedObligations} from './cashProtection';
import {restaurantStockViews} from '../inventory/restaurantStockroom';
import {businessStockViews} from '../inventory/businessStockroom';

/** Acquisition must not spend money already needed to keep the lender operating. */
export function expansionFunding(s:ExpansionState,id:string,r?:GameState){
 const b=s.businesses[id],p=propertyById(id);
 if(!b||!p)return {cash:0,bills:0,wages:0,stock:0,buffer:0,reserve:0,available:0};
 const cash=r?.money??b.cash,bills=protectedObligations(p,b,s,r).total;
 const wages=r?weeklyWages(r.staff)+crewPremium(b.crew):businessWages(p,b);
 const views=r?restaurantStockViews(r):businessStockViews(p,b,s);
 const stock=views.filter(v=>!v.definition.locked&&v.reason!=='Not selected for service').reduce((n,v)=>n+Math.max(0,v.rule.target-v.available-v.onOrder)*v.definition.cost,0);
 const buffer=r?.manager.reserve??b.manager?.reserve??150;
 const reserve=Math.ceil((bills+wages+stock+buffer)*100)/100;
 return {cash,bills,wages,stock,buffer,reserve,available:Math.max(0,cash-reserve)};
}
