import type {Business} from '../prototype/expansionModel';
import {batchValue,consumeBatches,recordStockUse,StockBatch} from '../inventory/stockroom';

const linenIds=['stock-0','stock-3'];
export const laundryQuantity=(b:Business)=>Object.values(b.stockroom?.dirty??{}).flat().reduce((n,x)=>n+x.qty,0);
export const laundryPending=(b:Business)=>b.stockroom?.laundryLoads?.reduce((n,l)=>n+l.batches.reduce((n,x)=>n+x.qty,0),0)??0;
export function stripHotelLinen(b:Business,indices:number[]):Business{
 if(!b.venue)return b;
 const dirty={...b.stockroom?.dirty},units=b.venue.units.map((u,i)=>{
  if(!indices.includes(i))return u;
  for(const id of linenIds){const batches=u.linen?.[id]??(u.linenReady!==false?[{qty:1,costPerUnit:0,condition:100}]:[]);dirty[id]=[...(dirty[id]??[]),...batches.map(x=>({...x,condition:Math.max(0,(x.condition??100)-10)}))];}
  return {...u,linen:{},linenReady:false};
 });
 return {...b,venue:{...b.venue,units},stockroom:b.stockroom?{...b.stockroom,dirty}:b.stockroom};
}
/** Fresh linen remains an asset in the room until it is worn out, rather than a sale expense. */
export function prepareHotelRoom(b:Business,index:number):Business|null{
 if(!b.venue||!b.inventory||linenIds.some(id=>(b.inventory?.[id]??0)<1)||(b.inventory['stock-2']??0)<2)return null;
 b=stripHotelLinen(b,[index]);
 const inventory={...b.inventory},linen:Record<string,StockBatch[]>={},batches={...b.stockroom?.batches};let room=b.stockroom;
 for(const id of [...linenIds,'stock-2']){
  const qty=id==='stock-2'?2:1;inventory[id]-=qty;
  const used=consumeBatches(batches[id]??[{qty:qty,costPerUnit:id==='stock-0'?.4:id==='stock-3'?.3:.25}],qty);batches[id]=used.left;
  if(id!=='stock-2')linen[id]=used.used;
  if(room)room=recordStockUse(room,id,qty);
 }
 return {...b,inventory,stock:Math.min(...Object.values(inventory)),stockroom:room?{...room,batches}:undefined,venue:{...b.venue!,units:b.venue!.units.map((u,i)=>i===index?{...u,linen,linenReady:true,dirty:false,cleanliness:100}:u)}};
}
export function advanceHotelLaundry(b:Business,week:number,day:number,date:number):Business{
 if(!b.stockroom||b.stockroom.lastLaundryDay===date)return b;
 let room={...b.stockroom,batches:{...b.stockroom.batches},dirty:{...b.stockroom.dirty},laundryLoads:[...(b.stockroom.laundryLoads??[])],lastLaundryDay:date},inventory={...b.inventory};
 const notes:string[]=[];let charge=0;
 // Paid outsourced loads return even if the hotel is closed or the staff rota changes.
 const due=room.laundryLoads.filter(l=>l.dueDay<=date);room.laundryLoads=room.laundryLoads.filter(l=>l.dueDay>date);
 for(const load of due){room.batches[load.itemId]=[...(room.batches[load.itemId]??[]),...load.batches];inventory[load.itemId]=(inventory[load.itemId]??0)+load.batches.reduce((n,x)=>n+x.qty,0);}
 if(due.length)notes.push('Outsourced laundry delivered fresh linen.');
 for(const id of linenIds){const all=room.dirty[id]??[];room.spoilage=(room.spoilage??0)+batchValue(all.filter(x=>(x.condition??100)<=0));room.dirty[id]=all.filter(x=>(x.condition??100)>0);}
 const qty=Object.values(room.dirty).flat().reduce((n,x)=>n+x.qty,0),inhouse=b.lodging?.laundryMode==='inhouse';
 const staff=b.hires?.laundry??0,onShift=['all','morning'].includes(b.lodging?.shifts.laundry??'all');
 let capacity=0;
 if(inhouse){
  if(!b.lodging?.facilities.includes('laundry'))notes.push('Build the laundry room or choose outsourced laundry.');
  else if(!staff||!onShift)notes.push('Laundry waiting: assign a laundry attendant to the morning or all-day rota.');
  else capacity=Math.min(qty,staff*20,Math.floor((inventory['stock-2']??0)*5),Math.floor(Math.max(0,b.cash)*10));
  if(capacity){charge=Math.round(capacity*.1*100)/100;const cleaning=capacity/5,used=consumeBatches(room.batches['stock-2']??[],cleaning);room.batches['stock-2']=used.left;inventory['stock-2']-=cleaning;notes.push(`${capacity} pieces washed in-house · $${charge.toFixed(2)} electricity.`);}
  if(qty>capacity&&staff&&onShift)notes.push('Remaining laundry waits for capacity, cleaning supplies or cash.');
 }else{
  capacity=Math.min(qty,Math.floor(Math.max(0,b.cash)/4)*10);charge=Math.ceil(capacity/10)*4;
  if(capacity)notes.push(`${capacity} pieces sent to laundry · ${Math.ceil(capacity/10)} bags · $${charge} · returns next morning.`);
  else if(qty)notes.push('Outsourced laundry waiting: $4 needed per bag of up to 10 pieces.');
 }
 let remaining=capacity;
 for(const id of linenIds){const used=consumeBatches(room.dirty[id]??[],remaining);room.dirty[id]=used.left;const count=used.used.reduce((n,x)=>n+x.qty,0);remaining-=count;
  if(!count)continue;
  if(inhouse){room.batches[id]=[...(room.batches[id]??[]),...used.used];inventory[id]=(inventory[id]??0)+count;}
  else room.laundryLoads.push({itemId:id,batches:used.used,dueDay:date+1});
 }
 room.notes=[...notes,...room.notes].slice(0,12);
 return {...b,cash:b.cash-charge,inventory,stock:Math.min(...Object.values(inventory)),stockroom:room,books:b.books?{...b.books,maintenance:b.books.maintenance+charge}:undefined,ledger:charge?[...b.ledger,{week,day,label:inhouse?'Laundry electricity':'Outsourced laundry bags',amount:-charge}].slice(-60):b.ledger};
}
