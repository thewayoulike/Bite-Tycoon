import type {Business} from '../prototype/expansionModel';
export type AssetLedger={items:{kind:'property'|'equipment';cost:number;depreciation:number;weeks:number}[];lastWeek:number};
export const accumulatedDepreciation=(b:Business)=>b.assets?.items.reduce((n,a)=>n+a.depreciation,0)??0;
/** Forward-only migration: existing assets begin depreciating from this game week. */
export function syncAssets(b:Business,week:number,property:number,equipment:number):Business{
 const assets=b.assets??{items:[],lastWeek:week-1};
 const items=[...assets.items];
 for(const [kind,cost,weeks] of [['property',property,b.tenure==='owned'?520:104],['equipment',equipment,104]] as const){
   const recorded=items.filter(i=>i.kind===kind).reduce((n,i)=>n+i.cost,0);
   if(cost>recorded+.001)items.push({kind,cost:cost-recorded,depreciation:0,weeks});
 }
 return {...b,assets:{...assets,items}};
}
export function depreciateAssets(b:Business,week:number):Business{
 if(!b.assets||b.assets.lastWeek>=week)return b;
 const elapsed=week-b.assets.lastWeek;
 return {...b,assets:{lastWeek:week,items:b.assets.items.map(a=>({...a,depreciation:Math.min(a.cost,Math.round((a.depreciation+a.cost/a.weeks*elapsed)*100)/100)}))}};
}
