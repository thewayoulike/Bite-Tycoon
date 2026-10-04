import type {StockDefinition,Stockroom} from '../inventory/stockroom';
export type StorageKind='dry'|'cold'|'frozen'|'secure'|'linen'|'workshop';
export type StoragePlan={size:6|8|10;racks:{x:number;z:number;kind:StorageKind}[]};
export const STORAGE_TYPES:{id:StorageKind;name:string;cost:number;capacity:number;color:string}[]=[{id:'dry',name:'Dry goods rack',cost:200,capacity:100,color:'#ad885d'},{id:'cold',name:'Chilled cabinet',cost:400,capacity:40,color:'#9ebcc7'},{id:'frozen',name:'Freezer',cost:500,capacity:60,color:'#d8e9ed'},{id:'secure',name:'Secure electronics cage',cost:650,capacity:8,color:'#747c8d'},{id:'linen',name:'Clean linen rack',cost:250,capacity:50,color:'#dacbbc'},{id:'workshop',name:'Parts cabinet',cost:300,capacity:30,color:'#6d917e'}];
export const storagePlan=(room?:Stockroom):StoragePlan=>room?.layout??{size:6,racks:[]};
export const storageKind=(def:Pick<StockDefinition,'location'>):StorageKind=>/freezer/i.test(def.location)?'frozen':/chill/i.test(def.location)?'cold':/secure/i.test(def.location)?'secure':/linen/i.test(def.location)?'linen':/workshop/i.test(def.location)?'workshop':'dry';
export function expandedStorage(def:StockDefinition,room?:Stockroom):StockDefinition{
 const kind=storageKind(def),spec=STORAGE_TYPES.find(v=>v.id===kind)!;
 const count=room?.layout?.racks.filter(r=>r.kind===kind).length??0;
 return count?{...def,capacity:def.capacity+count*spec.capacity,location:`${def.location} · ${count} fitted bays`}:def;
}
export const storageCellAllowed=(size:number,x:number,z:number)=>Number.isInteger(x)&&Number.isInteger(z)&&x>=0&&z>=0&&x<size&&z<size&&x%3!==1&&z!==3&&z!==size-1;
export function placeStorage(room:Stockroom,kind:StorageKind,x:number,z:number,cash:number){
 const plan=storagePlan(room),spec=STORAGE_TYPES.find(v=>v.id===kind);
 if(!spec||!storageCellAllowed(plan.size,x,z)||plan.racks.some(r=>r.x===x&&r.z===z)||cash<spec.cost)return {room,cost:0};
 return {room:{...room,layout:{...plan,racks:[...plan.racks,{x,z,kind}]}},cost:spec.cost};
}
export function expandStorage(room:Stockroom,cash:number){
 const plan=storagePlan(room),cost=plan.size===6?1200:plan.size===8?2400:Infinity;
 if(cash<cost||plan.size===10)return {room,cost:0};
 // The original door/aisle remains clear after extensions; existing racks stay.
 return {room:{...room,layout:{...plan,size:(plan.size+2) as 8|10}},cost};
}
