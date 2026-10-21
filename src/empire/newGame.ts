import {INITIAL_STATE} from '../hooks/useGameLoop';
import {createFastTrackEmpire,unlockTestDistrict,type EmpireState} from './empire';
import {unlockSandboxFeatures} from './sandbox';

/** Give old testing saves the current city's property market without resetting trade. */
export function upgradeSandboxCity(empire:EmpireState):EmpireState{
 if(empire.district.market)return empire;
 const market=createFastTrackEmpire(structuredClone(INITIAL_STATE)).district.market!;
 return {...empire,district:{...empire.district,market:{...market,listingSeed:empire.district.weatherSeed,level:5,ownerCash:1_000_000,startingCapital:1_000_000}}};
}
export function newGame(mode:string|null){
 const base=createFastTrackEmpire(structuredClone(INITIAL_STATE));
 const opening=mode==='sandbox'?unlockTestDistrict(base,INITIAL_STATE):base;
 if(mode==='sandbox'){
  opening.district.market={...opening.district.market!,level:5,ownerCash:1_000_000,startingCapital:1_000_000};
  // Start tenant recruitment so the mall can be tested from the first week.
  const mall=opening.district.businesses.park;
  if(mall?.plaza)mall.plaza={...mall.plaza,autoLease:true};
 }
 opening.settings={mode:mode==='sandbox'?'sandbox':'career',weekMinutes:3,guide:true};
 return unlockSandboxFeatures(opening);
}
