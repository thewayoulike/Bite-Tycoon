import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {SAVE_SLOTS,readResetBackup,resetSaveSlots,restoreSaveSlot,type SaveSlotId} from '../empire/saveSlots';
import {newGame} from '../empire/newGame';
import {parseEmpireSave} from '../empire/empire';
import './saves.css';

function SaveSlots(){
 const [notice,setNotice]=useState('Reset a single slot, or start all four again. A restore copy is kept for each slot.'),[revision,refresh]=useState(0);
 function change(ids:SaveSlotId[],restore=false){
  try{
   if(restore)restoreSaveSlot(localStorage,ids[0]);else resetSaveSlots(localStorage,ids,id=>JSON.stringify(newGame(id)));
   refresh(n=>n+1);setNotice(restore?'Progress restored. The previous state is now your backup.':ids.length===4?'All four slots reset. Previous progress is backed up separately for each slot.':'Save reset. Previous progress is backed up.');
  }catch{setNotice('The save change could not be completed. Check browser storage space; your previous progress has been kept.');}
 }
 return <main><header><small>BITE TYCOON · SAVE MANAGEMENT</small><h1>Your game saves</h1><p>Each mode has its own progress. Reset returns it to Week 1. Sandbox starts with the test properties open; the other slots start with $250,000 and a choice of first property.</p></header><div className="save-actions"><button onClick={()=>change(SAVE_SLOTS.map(s=>s.id))}>Reset all four · keep backups</button><a href="/?mode=career">Back to game</a></div><p className="save-notice" role="status" aria-live="polite">{notice}</p><section className="save-grid" aria-label="Save slots" key={revision}>{SAVE_SLOTS.map(slot=>{
  let saved=null,backup=null,unreadable=false;
  try{const raw=localStorage.getItem(slot.key),play=localStorage.getItem(slot.key+'-play');saved=parseEmpireSave(raw)??parseEmpireSave(play);unreadable=!!(raw||play)&&!saved;backup=readResetBackup(localStorage,slot.key);}catch{unreadable=true;}
  const owned=saved?Object.keys(saved.district.businesses).length:0;
  return <article key={slot.id}><h2>{slot.name}</h2><p>{saved?`Week ${saved.district.week} · ${owned} ${owned===1?'business':'businesses'}`:unreadable?'Saved data needs recovery':'No saved progress'}</p>{saved?.district.market&&!owned&&<strong>${saved.district.market.ownerCash.toLocaleString()} starting investment</strong>}<div className="slot-actions"><a href={slot.url}>{!saved||!owned?'Start game':'Open game'}</a><button onClick={()=>change([slot.id])}>Reset {slot.name}</button></div>{backup?<div className="save-backup"><span>Backup saved {new Date(backup.date).toLocaleString()}</span><button onClick={()=>change([slot.id],true)}>Restore {slot.name} backup</button></div>:<p className="save-help">A backup will be made before resetting.</p>}</article>;
 })}</section><footer>Backups stay in this browser. Restore swaps the current progress with its backup, so you can undo a restore too. Unrelated settings and other websites are not reset.</footer></main>;
}
createRoot(document.getElementById('root')!).render(<SaveSlots/>);
