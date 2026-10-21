import fs from 'node:fs';
import {newGame} from '../src/empire/newGame';
import {unityFrame} from '../src/unity/bridge';
const e=newGame('fast-track');
const f=unityFrame({state:Object.values(e.restaurants)[0]??(await import('../src/hooks/useGameLoop')).INITIAL_STATE,restaurants:e.restaurants,district:e.district,worldProgress:2,focus:null,selected:null},{floor:0,detail:'room',area:'commercial',cutaway:true,fast:false,meter:true});
fs.writeFileSync('artifacts/unity-comparison/market-audit-fixture.json',JSON.stringify(f));
console.log(f.properties.length,'market listings');
