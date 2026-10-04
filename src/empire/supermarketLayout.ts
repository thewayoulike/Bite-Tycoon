import type {Business} from '../prototype/expansionModel';
import {retailProduct,retailProductFloor} from './retail';
import {storeLevel,productUnlocked} from './supermarket';
import type {LodgingLayout,FloorPoint} from './lodgingLayout';
import {lodgingWalkingPath} from './lodgingLayout';
export function supermarketDisplays(ids:string[]){let grocery=0;return ids.flatMap(id=>{const product=retailProduct(id);if(!product||retailProductFloor(id)===1)return [];
 const produce=['apples','bananas','carrots','tomatoes','lettuce','potatoes'].indexOf(id);
 if(produce>=0)return [{id,kind:'produce',x:(produce<3?4.15:6.55)+(produce%3-1)*.65,z:3.3,side:1}];
 if(id==='bread')return [{id,kind:'bakery',x:-6.1,z:-8.2,side:1}];
 if(['milk','eggs','chicken','beef','fish'].includes(id))return [{id,kind:'chilled',x:[-2.7,-1.5,-.15,1.05,3][['milk','eggs','chicken','beef','fish'].indexOf(id)],z:-8.25,side:1}];
 if(id==='frozen_vegetables')return [{id,kind:'frozen',x:6.35,z:-8.25,side:1}];
 const index=grocery++,side=Math.floor(index/3)%2===0?1:-1;return [{id,kind:'grocery',x:[-5,0,5][index%3]+side*.53,z:index<6?-.2:-3.8,side}];
 });}
export const electronicsDisplays:[string,number,number][]=[['tv',-5.4,-7.7],['console',.1,-7.7],['fridge_appliance',6.3,-7.7],['washing_machine',6.3,-3.8],['vacuum',6.3,.1],['smartphone',-5.4,-2.3],['laptop',-.9,-2.3],['tablet',2.3,-2.3],['headphones',-5.4,2.1],['microwave',-.7,2.1],['kettle',3.3,2.1],['toaster',3.3,4.4]];
export function supermarketNavigation(b:Business,floor:number):LodgingLayout{
 const layout:LodgingLayout={kind:'hotel',floor,items:[],rooms:[],finishes:[],entrance:floor?{x:6.4,z:8.7}:{x:0,z:11},elevator:{x:6.4,z:8.7},queue:Array.from({length:12},(_,i)=>({x:-4.2+(i%4)*1.1,z:7.7+Math.floor(i/4)*.9})),staff:[{x:-5.1,z:5.3}],care:[{x:6.5,z:floor?3:-5}],manager:{x:-7.5,z:3}};
 const put=(x:number,z:number,w:number,d:number)=>layout.items.push({id:'fixture-'+layout.items.length,kind:'cabinet',x,z,w,d,h:1,yaw:0});
 put(0,-9.95,18,.16);put(-8.95,0,.16,20);put(8.95,0,.16,20);put(8,8,1.6,1.4);put(-4.6,6.5,5.8,1.4);
 if(floor){for(const [id,x,z]of electronicsDisplays){if(!productUnlocked(b,id))continue;put(x,z,id==='tv'?4.48:id==='console'?3.28:['fridge_appliance','washing_machine','vacuum'].includes(id)?2.08:2.48,['fridge_appliance','washing_machine','vacuum'].includes(id)?1.9:1.6);}if(storeLevel(b)>=5)put(-7.8,-3,1.1,3);}
 else{for(const x of [-5,0,5])put(x,-2,1.85,7.2);put(-6.1,-8.2,4,1.15);for(const x of(storeLevel(b)>=2?[-2.1,.45,3]:[-2.1]))put(x,-8.2,2.3,1.15);if(storeLevel(b)>=2)put(6.35,-8.25,2.65,1.55);for(const x of [4.15,6.55])put(x,3.3,2.15,1.7);put(-7.5,8.4,1,1.5);put(-8.1,6.2,.65,.45);put(7.9,-4,1.1,storeLevel(b)>=3?5:3);if(storeLevel(b)>=3){put(4.1,6.5,3.6,1.4);layout.staff.push({x:4.1,z:5.3});}}
 return layout;
}
export function supermarketProductPoint(b:Business,id:string):FloorPoint{
 if(retailProductFloor(id)){const slot=electronicsDisplays.find(v=>v[0]===id);return slot?{x:slot[1]+(id==='kettle'?-1.85:0),z:slot[2]+(id==='kettle'?0:1.5)}:{x:0,z:8};}
 const slot=supermarketDisplays(b.retail?.shelves??[]).find(v=>v.id===id);if(!slot)return {x:0,z:8};
 return slot.kind==='produce'?{x:slot.x,z:4.9}:['chilled','bakery','frozen'].includes(slot.kind)?{x:slot.x,z:-6.6}:{x:slot.x+slot.side*1.1,z:slot.z};
}

const travelCache=new Map<string,{browse:number;checkout:number}>();
export function supermarketTravelSeconds(b:Business,id:string){
 const key=storeLevel(b)+':'+!!b.retail?.store?.legacy+':'+(b.retail?.shelves.join('|')??'')+':'+id;
 const found=travelCache.get(key);if(found)return found;
 const layout=supermarketNavigation(b,retailProductFloor(id)),point=supermarketProductPoint(b,id);
 const seconds=(start:FloorPoint,end:FloorPoint)=>{const path=lodgingWalkingPath(layout,start,end);return path.length?path.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-path[i].x,p.z-path[i].z),0)/2.8+1:Infinity;};
 const result={browse:seconds(layout.entrance,point),checkout:Math.max(...layout.queue.map(q=>seconds(point,q)))};
 if(travelCache.size>100)travelCache.clear();travelCache.set(key,result);return result;
}
