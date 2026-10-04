import React from 'react';
import {createRoot} from 'react-dom/client';
import App from '../App';
import '../index.css';
import {INITIAL_STATE} from '../hooks/useGameLoop';
import {chooseRestaurantType} from '../restaurantTypes';
import {createEmpire,updateRestaurant} from '../empire/empire';
import {unlockTestDistrict} from '../empire/empire';
import {lendCash} from '../prototype/expansionModel';
import {TABLE_POSITIONS,storedPos} from '../restaurantLayout';
// Disposable manual QA: the same live-game components, without reading or saving player progress.
const mode=new URLSearchParams(location.search).get('case');
let diner={...structuredClone(INITIAL_STATE),money:50000};
if(mode==='research'){
 diner=chooseRestaurantType(diner,'fastfood');diner.week=2;diner.restaurantLevel=6;
 diner.recipes=[...diner.recipes.map(r=>({...r,unlocked:true})),...Array.from({length:12},(_,i)=>({id:`custom_demo_${i+1}`,name:`Research special ${i+1}`,unlocked:true,price:20,basePrice:20,unlockCost:0,cookingTime:1,ingredients:{rice:1,fish:1}}))];
 diner.activeMenu=diner.recipes.slice(0,40).map(r=>r.id);diner.staff.hasManager=true;diner.inventory={};diner.inventoryBatches={};diner.manager={enabled:false,target:30,budget:1200,spent:0,reserve:300};
 diner.lastWeekItemSales=Object.fromEntries(diner.activeMenu.map((id,i)=>[id,i===0?35:i===1?1:0]));diner.stats.itemsSold={...diner.lastWeekItemSales};
}else if(mode==='tables'){
 diner=chooseRestaurantType(diner,'fastfood');diner.week=2;diner.restaurantLevel=6;
 diner.tables=TABLE_POSITIONS.slice(0,11).map((p,i)=>({...p,id:`table-${i}`,customerId:null,isDirty:false}));
 diner.tables[3].y=storedPos(10);diner.tableLayoutVersion=1;
}else if(mode==='levels'){
 diner=chooseRestaurantType(diner,'cafe');diner.week=2;diner.stats.customersServed=60;
}else if(mode==='bistro'){
 diner=chooseRestaurantType(diner,'bistro');diner.week=2;diner.restaurantLevel=3;diner.stats.customersServed=180;
}
let empire=createEmpire(diner);
if(mode==='hotel'||mode==='apartments'||mode==='supermarket'||mode==='mall'){empire=unlockTestDistrict(empire,INITIAL_STATE);}
if(mode==='payroll'){
 empire=createEmpire(chooseRestaurantType(structuredClone(INITIAL_STATE),'diner'));
 empire=updateRestaurant(empire,'diner',r=>({...r,week:2,time:44,money:0,phase:'planning',pendingPayroll:[{dueWeek:2,amount:59}],stats:{...r.stats,upgradeCosts:1200,totalExpenses:1259,salaryCosts:59}}));
 empire.district={...empire.district,week:2,day:4};
}
if(mode==='research'){empire=unlockTestDistrict(empire,INITIAL_STATE);empire.district=lendCash(empire.district,'cafe','diner',1000,20,'operating');empire.restaurants.diner.money=empire.district.businesses.diner.cash;empire.restaurants.cafe.money=empire.district.businesses.cafe.cash;}
createRoot(document.getElementById('root')!).render(<><div style={{position:'fixed',bottom:0,left:0,zIndex:500,fontSize:11,padding:'2px 7px',background:'#fff2cf',pointerEvents:'none'}}>TEST SESSION · changes are not saved</div><App gameOptions={{persist:false,startingEmpire:empire}}/></>);
