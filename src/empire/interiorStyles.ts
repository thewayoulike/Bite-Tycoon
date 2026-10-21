import type {BusinessKind} from '../prototype/expansionModel';

export const RESTAURANT_INTERIORS=[
 {id:'diner',name:'Classic diner',description:'Checkerboard floor, red seating and chrome counter details.',colors:['#ddd9c9','#596366','#98514a']},
 {id:'cafe',name:'Warm café',description:'Timber floors, café furniture, soft green finishes and plants.',colors:['#b9a084','#64847b','#c4b19a']},
 {id:'bistro',name:'Contemporary bistro',description:'Dark green panelling, linen table runners and candlelit tables.',colors:['#96775c','#385956','#e8e0d1']},
 {id:'japanese',name:'Japanese minimal',description:'Timber screens, paper lanterns and woven table settings.',colors:['#797262','#554d3d','#f2e0b9']},
] as const;
export type RestaurantInteriorId=typeof RESTAURANT_INTERIORS[number]['id'];
export const interiorStyle=(id:unknown)=>RESTAURANT_INTERIORS.find(s=>s.id===id);
export const defaultInterior=(type:string|undefined):RestaurantInteriorId=>type==='cafe'?'cafe':type==='japanese'?'japanese':!type||type==='diner'||type==='fastfood'?'diner':'bistro';
// Existing unowned restaurant fronts use these fitted styles. Buying one must
// preserve that room, regardless of the new owner's chosen menu specialty.
export const fittedInterior=(kind:BusinessKind):RestaurantInteriorId=>kind==='cafe'?'cafe':'diner';
export function acquisitionInterior(kind:BusinessKind,method:string,type:string|undefined,requested?:RestaurantInteriorId){
 const food=kind==='restaurant'||kind==='cafe';
 if(requested!==undefined&&(!food||!interiorStyle(requested)))return {error:'Choose a supported restaurant interior.'};
 if(!food)return {};
 if(method==='purchase'&&requested!==undefined&&requested!==fittedInterior(kind))return {error:'An operating business keeps its fitted interior when purchased.'};
 return {style:method==='purchase'?fittedInterior(kind):requested??defaultInterior(type)};
}
