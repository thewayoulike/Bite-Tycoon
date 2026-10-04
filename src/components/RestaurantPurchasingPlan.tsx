import {restaurantStockViews} from '../inventory/restaurantStockroom';
import {stockQuote,neededQuantity} from '../inventory/stockroom';
import type {GameState} from '../hooks/useGameLoop';
import {restaurantStockPlan} from '../restaurantPurchasing';
export function RestaurantPurchasingPlan({state}:{state:GameState}){
 const plan=restaurantStockPlan(state);
 const required=restaurantStockViews(state).filter(v=>v.available+v.onOrder<v.rule.minimum&&v.rule.minimum>0).reduce((n,v)=>n+stockQuote(v.definition,neededQuantity(v)),0);
 return <details><summary className="cursor-pointer font-semibold">Sales-based stock plan · {plan.coverageDays} days of cover</summary><p className="text-sm my-2">Target replenishment: ${required.toFixed(2)}. {required>state.manager.budget-state.manager.spent?'Budget warning: remaining allowance cannot fund the full stock plan.':'Within the remaining weekly budget.'}</p><p className="text-sm my-2">Targets blend this week’s sales with the previous week. New dishes start with two portions; slow sellers keep a small supply. Shared ingredients are combined. Existing stock is used first.</p><div className="max-h-64 overflow-auto"><table className="w-full text-sm text-left"><thead><tr><th>Active dish</th><th>Sold this week</th><th>Demand</th><th>Target portions</th></tr></thead><tbody>{plan.dishes.map(d=><tr className="border-t" key={d.id}><td className="py-2">{d.name}</td><td>{d.sold}</td><td>{d.pace}</td><td>{d.portions}</td></tr>)}</tbody></table></div></details>;
}
