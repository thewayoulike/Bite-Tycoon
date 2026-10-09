type SaveStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export const SAVE_SLOTS=[
 {id:'fast-track',name:'Fast-track career',key:'bite-tycoon-fast-track-v1',url:'/?mode=fast-track'},
 {id:'career',name:'Career save',key:'bite-tycoon-career-v1',url:'/?mode=career'},
 {id:'sandbox',name:'Sandbox save',key:'bite-tycoon-sandbox-v1',url:'/?mode=sandbox'},
 {id:'existing',name:'Existing game save',key:'bite-tycoon-empire-v1',url:'/'},
] as const;
export type SaveSlotId=typeof SAVE_SLOTS[number]['id'];
type Snapshot={primary:string|null;play:string|null;unreadable:string|null};
type Backup={version:1;date:string;data:Snapshot};
const suffixes={primary:'',play:'-play',unreadable:'-unreadable'} as const;
const capture=(s:SaveStorage,key:string):Snapshot=>Object.fromEntries(Object.entries(suffixes).map(([field,suffix])=>[field,s.getItem(key+suffix)])) as Snapshot;
function write(s:SaveStorage,key:string,data:Snapshot){for(const [field,suffix] of Object.entries(suffixes)){const value=data[field as keyof Snapshot];if(value===null)s.removeItem(key+suffix);else s.setItem(key+suffix,value);}}
export function saveRevision(s:SaveStorage,key:string){return s.getItem(key+'-revision');}
export function canWriteSave(s:SaveStorage,key:string,revision:string|null){return !s.getItem(key+'-resetting')&&saveRevision(s,key)===revision;}
export function readResetBackup(s:SaveStorage,key:string):Backup|null{
 try{const b=JSON.parse(s.getItem(key+'-reset-backup')??'null');return b?.version===1&&typeof b.date==='string'&&b.data&&Object.keys(suffixes).every(k=>b.data[k]===null||typeof b.data[k]==='string')?b:null;}catch{return null;}
}
/** Back up every selected slot before touching live saves. Roll back if storage fails. */
function replaceSlots(s:SaveStorage,entries:{key:string;data:Snapshot}[]){
 const before=entries.map(e=>({...e,old:capture(s,e.key),backup:s.getItem(e.key+'-reset-backup')}));
 const revision=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),date=new Date().toISOString();
 try{
  for(const e of before)s.setItem(e.key+'-resetting',revision);
  for(const e of before)s.setItem(e.key+'-reset-backup',JSON.stringify({version:1,date,data:e.old} satisfies Backup));
  for(const e of before)write(s,e.key,e.data);
 }catch(error){
  for(const e of before){try{write(s,e.key,e.old);if(e.backup===null)s.removeItem(e.key+'-reset-backup');else s.setItem(e.key+'-reset-backup',e.backup);}catch{/* The original snapshot remains in its reset backup if rollback storage is unavailable. */}}
  throw error;
 }finally{for(const e of before)s.removeItem(e.key+'-resetting');}
 for(const e of before){s.removeItem(e.key+'-leader');s.setItem(e.key+'-revision',revision);}
}
export function resetSaveSlots(s:SaveStorage,ids:SaveSlotId[],fresh:(id:SaveSlotId)=>string){
 const slots=[...new Set(ids)].map(id=>SAVE_SLOTS.find(v=>v.id===id));if(slots.some(v=>!v))throw new Error('Unknown save slot.');
 replaceSlots(s,slots.map(slot=>({key:slot!.key,data:{primary:fresh(slot!.id),play:null,unreadable:null}})));
}
export function restoreSaveSlot(s:SaveStorage,id:SaveSlotId){
 const slot=SAVE_SLOTS.find(v=>v.id===id);if(!slot)throw new Error('Unknown save slot.');
 const backup=readResetBackup(s,slot.key);if(!backup)throw new Error('No reset backup is available.');
 replaceSlots(s,[{key:slot.key,data:backup.data}]);
}
