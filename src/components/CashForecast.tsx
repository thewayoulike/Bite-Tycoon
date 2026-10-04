import {createContext,useContext} from 'react';
export type CashForecastValue={cash:number;protectedCash:number;stock:number;weeklyWages:number};
export const CashForecastContext=createContext<CashForecastValue|null>(null);
const dollars=(n:number)=>n.toLocaleString('en-US',{style:'currency',currency:'USD'});
export function CashForecast({build,stock,addedWages=0,upkeep=0}:{build:number;stock?:number;addedWages?:number;upkeep?:number}){
 const value=useContext(CashForecastContext);if(!value)return null;
 const supplies=stock??value.stock,free=value.cash-build-supplies-value.protectedCash-addedWages-upkeep;
 return <div className="mc-slot p-3 text-xs my-3" aria-label="Expansion cash forecast"><strong>Cash after this unlock</strong><p>Build {dollars(build)} + starting stock top-up {dollars(supplies)}.</p><p>New weekly wages {dollars(addedWages)} + upkeep {dollars(upkeep)}. Current team: {dollars(value.weeklyWages)} / week.</p><p>Upcoming obligations + cash buffer: {dollars(value.protectedCash)}.</p><p className={free<0?'text-red-700':'text-green-800'}><strong>Free cash after these allowances: {dollars(free)}</strong></p><small>Stock is estimated for the current menu or opening supplies; buy it separately. Additional optional recipes and hires cost extra. No future sales assumed.</small></div>;
}
