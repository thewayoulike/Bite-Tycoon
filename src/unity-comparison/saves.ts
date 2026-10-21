import {parseEmpireSave} from '../empire/empire';
import {decideSave} from '../empire/sessionGuard';
import {browserSaveKey,unitySaveKey} from '../unity/bridge';
import {upgradeSandboxCity} from '../empire/newGame';
import {unlockSandboxFeatures} from '../empire/sandbox';
import {settings} from '../career/settings';

type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function comparisonSaveKey(mode:string|null){
 return `bite-tycoon-comparison-${mode==='sandbox'?'sandbox':mode==='career'?'older-career':'career'}-v1`;
}
/** Snapshot the matching Unity game once; the source is never written to. */
export function copyComparisonSave(storage:Store,mode:string|null){
 const target=comparisonSaveKey(mode);
 if(storage.getItem(target)!==null||storage.getItem(target+'-play')!==null)return 'existing';
 const sources=[unitySaveKey(mode),browserSaveKey(mode),...(mode===null||mode==='fast-track'?['bite-tycoon-empire-v1']:[])];
 const source=sources.find(key=>storage.getItem(key)!==null||storage.getItem(key+'-play')!==null||storage.getItem(key+'-resetting')!==null);
 if(!source)return 'new';
 if(storage.getItem(source+'-resetting'))return 'busy';
 const revision=storage.getItem(source+'-revision');
 const chosen=decideSave(storage.getItem(source),storage.getItem(source+'-play'),parseEmpireSave).value;
 if(!chosen)return 'invalid';
 if(storage.getItem(source+'-revision')!==revision||storage.getItem(source+'-resetting'))return 'busy';
 const raw=JSON.stringify(chosen);
 storage.setItem(target+'-source-snapshot',raw);
 try{storage.setItem(target,raw);}catch(error){storage.removeItem(target+'-source-snapshot');throw error;}
 return 'copied';
}
/** One-time city upgrade; live trade, property ownership and original saves survive. */
export function upgradeSandboxSave(storage:Store){
 const key=comparisonSaveKey('sandbox'),primary=storage.getItem(key),play=storage.getItem(key+'-play');
 if(primary===null&&play===null)return 'new';
 if(storage.getItem(key+'-resetting'))return 'busy';
 const revision=storage.getItem(key+'-revision'),old=decideSave(primary,play,parseEmpireSave).value;
 if(!old)return 'invalid';
 const city=upgradeSandboxCity(old);
 const next=unlockSandboxFeatures({...city,settings:{...settings(city),mode:'sandbox'}});
 if(city===old&&Object.values(old.district.businesses).every(b=>b.sandboxUnlockVersion===1)&&old.settings?.mode==='sandbox')return 'current';
 if(storage.getItem(key+'-revision')!==revision||storage.getItem(key+'-resetting'))return 'busy';
 if(!storage.getItem(key+'-city-upgrade-backup'))storage.setItem(key+'-city-upgrade-backup',JSON.stringify({primary,play}));
 storage.setItem(key+'-unlock-backup',JSON.stringify({primary,play}));
 const token=Date.now().toString(36)+'-city-upgrade';storage.setItem(key+'-resetting',token);
 try{
  storage.setItem(key,JSON.stringify(next));storage.removeItem(key+'-play');storage.setItem(key+'-revision',token);storage.removeItem(key+'-leader');
 }catch(error){
  try{if(primary===null)storage.removeItem(key);else storage.setItem(key,primary);if(play===null)storage.removeItem(key+'-play');else storage.setItem(key+'-play',play);if(revision===null)storage.removeItem(key+'-revision');else storage.setItem(key+'-revision',revision);}catch{/* Recovery snapshot remains available. */}
  throw error;
 }finally{storage.removeItem(key+'-resetting');}
 return 'upgraded';
}
export function replaceComparisonSave(storage:Store,mode:string|null,fresh:string){
 if(!parseEmpireSave(fresh))throw new Error('This is not a valid business save.');
 const key=comparisonSaveKey(mode),primary=storage.getItem(key),play=storage.getItem(key+'-play');
 const revision=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 storage.setItem(key+'-reset-backup',JSON.stringify({primary,play}));
 storage.setItem(key+'-resetting',revision);
 try{
  storage.setItem(key,fresh);storage.removeItem(key+'-play');
  storage.setItem(key+'-revision',revision);storage.removeItem(key+'-leader');
 }catch(error){
  try{if(primary===null)storage.removeItem(key);else storage.setItem(key,primary);if(play!==null)storage.setItem(key+'-play',play);}catch{/* The backup preserves the previous comparison game. */}
  throw error;
 }finally{storage.removeItem(key+'-resetting');}
}
