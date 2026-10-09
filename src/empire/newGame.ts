import {INITIAL_STATE} from '../hooks/useGameLoop';
import {createEmpire,createFastTrackEmpire,unlockTestDistrict} from './empire';
export function newGame(mode:string|null){
 const opening=mode==='sandbox'?unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE):createFastTrackEmpire(structuredClone(INITIAL_STATE));
 opening.settings={mode:mode==='sandbox'?'sandbox':'career',weekMinutes:3,guide:true};
 return opening;
}
