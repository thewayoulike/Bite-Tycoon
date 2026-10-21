import test from 'node:test';
import assert from 'node:assert/strict';
import {comparisonSaveKey,copyComparisonSave,replaceComparisonSave} from '../src/unity-comparison/saves';
import {unitySaveKey,browserSaveKey} from '../src/unity/bridge';
import {newGame} from '../src/empire/newGame';
const store=()=>{const data=new Map<string,string>();return{data,getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};};
const game=(week:number)=>{const e=newGame('fast-track');e.district.week=week;e.district.weatherSeed=123;e.district.market!.listingSeed=123;return JSON.stringify(e);};

test('comparison copies Unity progress once without changing either original save or its locks',()=>{
 const s=store(),source=unitySaveKey(null),target=comparisonSaveKey(null);
 s.setItem(source,game(8));s.setItem(source+'-leader','current-game');s.setItem(source+'-revision','rev8');
 s.setItem(browserSaveKey(null),game(3));
 const originals=[...s.data];
 assert.equal(copyComparisonSave(s,null),'copied');
 assert.equal(s.getItem(target),game(8));
 originals.forEach(([k,v])=>assert.equal(s.getItem(k),v));
 s.setItem(source,game(9));assert.equal(copyComparisonSave(s,null),'existing');
 assert.equal(s.getItem(target),game(8));
});
test('comparison falls back to browser save only when the matching Unity slot is absent',()=>{
 const s=store();s.setItem(browserSaveKey(null),game(4));
 assert.equal(copyComparisonSave(s,null),'copied');assert.equal(s.getItem(comparisonSaveKey(null)),game(4));
 const broken=store();broken.setItem(unitySaveKey(null),'broken');broken.setItem(browserSaveKey(null),game(4));
 assert.equal(copyComparisonSave(broken,null),'invalid');assert.equal(broken.getItem(comparisonSaveKey(null)),null);
 const busy=store();busy.setItem(unitySaveKey(null)+'-resetting','reset');
 assert.equal(copyComparisonSave(busy,null),'busy');assert.equal(busy.getItem(comparisonSaveKey(null)),null);
});
test('comparison reset is recoverable and never touches current game or other comparison slots',()=>{
 const s=store(),key=comparisonSaveKey(null);
 s.setItem(key,game(8));s.setItem(key+'-play',game(8));
 s.setItem(unitySaveKey(null),game(9));s.setItem(comparisonSaveKey('sandbox'),game(2));
 replaceComparisonSave(s,null,game(1));
 assert.equal(s.getItem(key),game(1));assert.equal(s.getItem(unitySaveKey(null)),game(9));
 assert.equal(s.getItem(comparisonSaveKey('sandbox')),game(2));assert.equal(s.getItem(key+'-play'),null);
 assert.equal(JSON.parse(s.getItem(key+'-reset-backup')!).primary,game(8));
 assert.throws(()=>replaceComparisonSave(s,null,'broken'));assert.equal(s.getItem(key),game(1));
});
test('a failed comparison snapshot write leaves source intact and no partial snapshot',()=>{
 const s=store(),key=comparisonSaveKey(null),raw=game(5);s.setItem(unitySaveKey(null),raw);
 const failing={...s,setItem:(k:string,v:string)=>{if(k===key)throw new Error('Full');s.setItem(k,v);}};
 assert.throws(()=>copyComparisonSave(failing,null),/Full/);
 assert.equal(s.getItem(unitySaveKey(null)),raw);assert.equal(s.getItem(key),null);
 assert.equal(s.getItem(key+'-source-snapshot'),null);
});
