import test from 'node:test';
import assert from 'node:assert/strict';
import {SAVE_SLOTS,resetSaveSlots,restoreSaveSlot,readResetBackup,saveRevision,canWriteSave} from '../src/empire/saveSlots';
import {newGame} from '../src/empire/newGame';
import {parseEmpireSave} from '../src/empire/empire';
class MemoryStorage{
 values=new Map<string,string>();failAt:string|null=null;
 getItem(key:string){return this.values.get(key)??null;}
 setItem(key:string,value:string){if(key===this.failAt){this.failAt=null;throw new Error('Quota exceeded');}this.values.set(key,value);}
 removeItem(key:string){this.values.delete(key);}
}
test('reset all four preserves each primary and recovery save, resets fresh states, and leaves other data alone',()=>{
 const store=new MemoryStorage();store.setItem('audio-muted','yes');
 for(const slot of SAVE_SLOTS){store.setItem(slot.key,'old-'+slot.id);store.setItem(slot.key+'-play','recovery-'+slot.id);store.setItem(slot.key+'-unreadable','original-'+slot.id);store.setItem(slot.key+'-leader','old-tab');}
 resetSaveSlots(store,SAVE_SLOTS.map(s=>s.id),id=>JSON.stringify(newGame(id)));
 for(const slot of SAVE_SLOTS){
  const b=readResetBackup(store,slot.key)!;assert.deepEqual(b.data,{primary:'old-'+slot.id,play:'recovery-'+slot.id,unreadable:'original-'+slot.id});
  assert.equal(store.getItem(slot.key+'-play'),null);assert.equal(store.getItem(slot.key+'-unreadable'),null);assert.equal(store.getItem(slot.key+'-leader'),null);
  const fresh=parseEmpireSave(store.getItem(slot.key))!;assert.ok(fresh);assert.equal(fresh.district.week,1);
  if(slot.id==='sandbox'){assert.ok(fresh.testingUnlocked);assert.equal(Object.keys(fresh.district.businesses).length,7);}else{assert.equal(fresh.district.market!.ownerCash,250000);assert.equal(Object.keys(fresh.district.businesses).length,0);}
 }
 assert.equal(store.getItem('audio-muted'),'yes');
});
test('resetting one slot never changes another; restore swaps backups and can be undone',()=>{
 const s=new MemoryStorage(),a=SAVE_SLOTS[0],b=SAVE_SLOTS[1];s.setItem(a.key,'original');s.setItem(a.key+'-play','recovery');s.setItem(b.key,'leave alone');
 resetSaveSlots(s,[a.id],()=> 'fresh');assert.equal(s.getItem(b.key),'leave alone');
 restoreSaveSlot(s,a.id);assert.equal(s.getItem(a.key),'original');assert.equal(s.getItem(a.key+'-play'),'recovery');assert.equal(readResetBackup(s,a.key)!.data.primary,'fresh');
 restoreSaveSlot(s,a.id);assert.equal(s.getItem(a.key),'fresh');assert.equal(s.getItem(a.key+'-play'),null);
});
test('backup and live-write failures preserve every selected save and its existing backup',()=>{
 for(const failure of [SAVE_SLOTS[1].key+'-reset-backup',SAVE_SLOTS[1].key]){
  const s=new MemoryStorage();for(const slot of SAVE_SLOTS){s.setItem(slot.key,'original-'+slot.id);s.setItem(slot.key+'-reset-backup','prior-backup');}
  s.failAt=failure;assert.throws(()=>resetSaveSlots(s,SAVE_SLOTS.map(v=>v.id),()=> 'fresh'));
  for(const slot of SAVE_SLOTS){assert.equal(s.getItem(slot.key),'original-'+slot.id);assert.equal(s.getItem(slot.key+'-reset-backup'),'prior-backup');assert.equal(s.getItem(slot.key+'-resetting'),null);}
 }
});
test('a tab from before reset cannot overwrite fresh saves, including during a reset',()=>{
 const s=new MemoryStorage(),slot=SAVE_SLOTS[0],revision=saveRevision(s,slot.key);assert.ok(canWriteSave(s,slot.key,revision));
 s.setItem(slot.key+'-resetting','busy');assert.equal(canWriteSave(s,slot.key,revision),false);s.removeItem(slot.key+'-resetting');
 resetSaveSlots(s,[slot.id],()=> 'fresh');assert.equal(canWriteSave(s,slot.key,revision),false);assert.equal(canWriteSave(s,slot.key,saveRevision(s,slot.key)),true);
});
test('missing or malformed restore copies and unknown slots never alter live saves',()=>{
 const s=new MemoryStorage(),slot=SAVE_SLOTS[0];s.setItem(slot.key,'keep');assert.throws(()=>restoreSaveSlot(s,slot.id));
 s.setItem(slot.key+'-reset-backup','{"version":1,"date":"now","data":{}}');assert.equal(readResetBackup(s,slot.key),null);assert.throws(()=>restoreSaveSlot(s,slot.id));
 assert.throws(()=>resetSaveSlots(s,['invalid' as any],()=> 'bad'));assert.equal(s.getItem(slot.key),'keep');
});
