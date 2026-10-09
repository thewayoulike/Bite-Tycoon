import {propertyById} from '../prototype/expansionModel';
import {activeRecipes} from '../gameplay';
import type {EmpireState} from '../empire/empire';
export type CareerSettings={mode:'career'|'sandbox';weekMinutes:3|14;guide:boolean};
export const settings=(e:EmpireState):CareerSettings=>({mode:e.testingUnlocked?'sandbox':'career',weekMinutes:e.settings?.weekMinutes===14?14:3,guide:e.settings?.guide!==false});
export const simulationRate=(e:EmpireState)=>3/settings(e).weekMinutes;
export function changeSettings(e:EmpireState,changes:Partial<CareerSettings>):EmpireState{
 const old=settings(e);if(changes.weekMinutes!==undefined&&(![3,14].includes(changes.weekMinutes)||Object.values(e.restaurants).some(r=>r.phase!=='planning')))return e;
 return {...e,settings:{...old,...changes,mode:old.mode}};
}
export function careerMilestones(e:EmpireState,selectedId?:string){
 const ids=Object.keys(e.district.businesses),id=selectedId&&e.district.businesses[selectedId]?selectedId:e.district.market?.firstPropertyId??ids[0];
 const b=e.district.businesses[id],r=e.restaurants[id],p=propertyById(id??'');
 if(!b||!p)return [{id:'acquire',title:'Choose your first business',done:false,hint:'Lease an empty unit and fit it out, buy an operating business, or buy land and build. Review setup cost, monthly rent and cash left before committing.'}];
 const food=!!r,shop=p.kind==='shop',menu=r?activeRecipes(r):[];
 const rangeReady=r?!!r.restaurantType&&menu.length>0:shop?!!b.retail?.shelves.length:!!b.venue?.units.length;
 const stockReady=r?menu.length>0&&menu.every(d=>Object.entries(d.ingredients).every(([key,qty])=>(r.inventory[key]??0)>=qty)):shop?!!b.retail?.shelves.every(key=>(b.retail?.stock[key]??0)>0):Object.values(b.inventory??{}).some(n=>n>0)||b.stock>0;
 const served=r?.stats.customersServed??b.venue?.totalServed??0;
 const level=r?.restaurantLevel??b.retail?.store?.level??b.lodging?.openFloors??b.plaza?.openFloors??1;
 const report=e.district.closedWeek?.reports.find(v=>v.id===id);
 return [
 {id:'acquire',title:'Take over your premises',done:true,hint:'Your opening payment includes the fit-out and starting stock. This business keeps its own cash; there is no shared spending wallet.'},
 {id:'range',title:food?'Review your menu & prices':shop?'Review products & prices':'Review rooms, units & rates',done:rangeReady,hint:food?'Your chosen restaurant type has its own opening recipes and ingredients. Review Menu & Prices before service.':shop?'Your opening grocery range is already on the shelves. Use Products & Prices to select goods, then unlock more departments through service.':'Ground-floor services and the first operating floor are ready. Set rates and review capacity before accepting guests or tenants.'},
 {id:'stock',title:'Check opening inventory',done:stockReady,hint:'Opening stock is included. Buy replacements in Inventory as it sells or is consumed. A purchasing manager is an optional later hire; orders still need a budget and cash.'},
 {id:'team',title:'Check your included team',done:r?r.staff.chefs>0&&r.staff.waiters>0:!!b.crew?.length,hint:food?'A chef and waiter are already included. Help take orders, serve and clear tables while learning; hire extra staff when the workload warrants the wage.':'Your opening team is already included. Review their roles and shifts in Staff. Hire more only when queues or workload need it.'},
 {id:'trade',title:'Start a week and serve customers',done:served>=6,hint:'Close the desk and press Start week. All owned businesses trade on the same calendar. Staff continue working when you visit another building. Served so far: '+served+'.'},
 {id:'review',title:'Review your first weekly result',done:!!report,hint:report?'Latest closed week: '+report.week+' · profit $'+report.profit.toFixed(2)+'. Compare sales with stock consumed, wages and rent. Restock and fix service problems before growing.':'At closing, open the weekly P&L. Check profit as well as cash: loans are not sales, and unpaid wages still count as expenses.'},
 {id:'level',title:'Earn and pay for your next upgrade',done:level>=2,hint:food?'Restaurant Level 2 requires 60 served guests and $750, plus protected operating cash. It expands the menu from 6 to 10 dishes.':shop?'Supermarket Level 2 requires 50 shoppers and a $1,000 upgrade, plus starting stock and protected cash. It adds grocery departments before electronics.':'Meet the next floor’s occupancy and service requirements, then pay its build and opening-stock cost in Upgrades. Upper floors are never free.'},
 {id:'second',title:'Fund your next business safely',done:ids.length>1,hint:'Between weeks, open Property market. Choose a lender with surplus cash after bills, next week’s wages, stock and a buffer. The new business receives a repayable loan, its own opening cash and its own team. A successful first week is recommended before expanding.'}
 ];
}
