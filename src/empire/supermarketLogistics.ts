import type {Business} from '../prototype/expansionModel';
import {propertyById} from '../prototype/expansionModel';
import {available,crewPower,ensureCrew} from '../career/crew';
import {backroomQuantity,receiveStoreGoods,replenishShelf,shelfCapacity,shelfQuantity} from './supermarket';
import {retailProductFloor} from './retail';

const REFILL_SECONDS=1.2;
const REFILL_CART_UNITS=12;

export function storeStockTeam(b:Business){
 const hour=(8+(b.venue?.clock??0)*7*24/180)%24,crew=ensureCrew(propertyById('shop')!,b);
 const count=(role:string)=>crew.filter(e=>e.role===role&&available(e,hour)&&(e.zone<0||e.zone===0)).length;
 return {assistants:count('care'),receivers:count('receiving'),refillPower:crewPower(crew,'care',hour,0,0),receivingPower:crewPower(crew,'receiving',hour,0,0)};
}
export const storeNeedsRefill=(b:Business)=>!!b.retail?.shelves.some(id=>!retailProductFloor(id)&&backroomQuantity(b,id)>0&&shelfQuantity(b,id)<shelfCapacity(b,id));
export const storeNeedsReceiving=(b:Business)=>Object.values(b.retail?.store?.receiving??{}).some(q=>q>0);

function refillCart(b:Business){
 let next=b,remaining=REFILL_CART_UNITS;
 while(remaining>0){
  const moved=replenishShelf(next,undefined,remaining);if(moved===next)break;
  const key=moved.retail!.store!.job!;
  remaining-=shelfQuantity(moved,key)-shelfQuantity(next,key);next=moved;
 }
 return next;
}

function workQueue(b:Business,key:'receivingTimer'|'replenishTimer',work:number,seconds:number,job:(b:Business)=>Business,hasWork:(b:Business)=>boolean){
 const old=b.retail!.store![key];
 let next=b,credit=work>0&&hasWork(b)?Math.max(0,Number.isFinite(old)?old:0)+work:0;
 // Process every completed load, including at 2x/5x speed. Fractional work is
 // retained, but idle/off-duty crews cannot bank an instant future delivery.
 while(credit+1e-9>=seconds){
  const moved=job(next);if(moved===next){credit=0;break;}
  next=moved;credit=Math.max(0,credit-seconds);
 }
 if(!hasWork(next))credit=0;
 return {...next,retail:{...next.retail!,store:{...next.retail!.store!,[key]:credit}}};
}

export function advanceStoreLogistics(b:Business,dt:number):Business{
 if(!b.venue?.running||!b.retail?.store||!Number.isFinite(dt)||dt<=0)return b;
 const team=storeStockTeam(b);
 let next=workQueue(b,'receivingTimer',dt*(team.refillPower+team.receivingPower*2),1,
  b=>receiveStoreGoods(b,team.receivingPower>0?40:12),storeNeedsReceiving);
 next=workQueue(next,'replenishTimer',dt*team.refillPower,REFILL_SECONDS,refillCart,storeNeedsRefill);
 return next;
}

export function storeLogisticsStatus(b:Business){
 const team=storeStockTeam(b),staff=`${team.assistants} stock assistant${team.assistants===1?'':'s'} · ${team.receivers} receiving clerk${team.receivers===1?'':'s'} on duty`;
 if(!b.venue?.running)return `${staff}. Start the week to resume unpacking and shelf refills.`;
 if(!team.assistants&&!team.receivers)return `${staff}. Stock work is waiting for staff: check their shifts, breaks, training and ground-floor assignment.`;
 if(!team.assistants)return `${staff}. Deliveries can be unpacked, but grocery shelves need a stock assistant on the ground floor.`;
 return `${staff}. Staff unpack mixed-product loads and refill shelves automatically, prioritizing waiting shoppers and empty displays.`;
}
