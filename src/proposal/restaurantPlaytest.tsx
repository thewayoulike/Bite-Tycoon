import React from 'react';
import {createRoot} from 'react-dom/client';
import App from '../App';
import '../index.css';
import {INITIAL_STATE} from '../hooks/useGameLoop';
import {chooseRestaurantType} from '../restaurantTypes';
import {createEmpire} from '../empire/empire';
import {TABLE_POSITIONS,storedPos} from '../restaurantLayout';
// Disposable manual QA: the same live-game components, without reading or saving player progress.
const mode=new URLSearchParams(location.search).get('case');
let diner={...structuredClone(INITIAL_STATE),money:50000};
if(mode==='tables'){
 diner=chooseRestaurantType(diner,'fastfood');diner.week=2;diner.restaurantLevel=6;
 diner.tables=TABLE_POSITIONS.slice(0,11).map((p,i)=>({...p,id:`table-${i}`,customerId:null,isDirty:false}));
 diner.tables[3].y=storedPos(10);diner.tableLayoutVersion=1;
}else if(mode==='levels'){
 diner=chooseRestaurantType(diner,'cafe');diner.week=2;diner.stats.customersServed=60;
}else if(mode==='bistro'){
 diner=chooseRestaurantType(diner,'bistro');diner.week=2;diner.restaurantLevel=3;diner.stats.customersServed=180;
}
createRoot(document.getElementById('root')!).render(<><div style={{position:'fixed',bottom:0,left:0,zIndex:500,fontSize:11,padding:'2px 7px',background:'#fff2cf',pointerEvents:'none'}}>TEST SESSION · changes are not saved</div><App gameOptions={{persist:false,startingEmpire:createEmpire(diner)}}/></>);
