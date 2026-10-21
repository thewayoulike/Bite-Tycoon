import {writeFileSync,mkdirSync} from 'node:fs';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict} from '../src/empire/empire';
import {unityFrame} from '../src/unity/bridge';
const empire=unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);
mkdirSync('artifacts/unity-setup/fixtures',{recursive:true});
for(const [focus,floor] of [[null,0],['diner',0],['shop',0],['hotel',1],['apartments',1],['park',0]] as const){
 const value=unityFrame({state:empire.restaurants.diner,restaurants:empire.restaurants,district:empire.district,worldProgress:2,focus,selected:null},{floor,detail:'room',area:'center',cutaway:true});
 writeFileSync(`artifacts/unity-setup/fixtures/${focus??'city'}.json`,JSON.stringify(value));
}
