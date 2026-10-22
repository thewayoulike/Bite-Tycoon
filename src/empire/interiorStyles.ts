import type {BusinessKind} from '../prototype/expansionModel';
import type {EmpireState} from './empire';

export const RESTAURANT_INTERIORS=[
 {id:'diner',name:'Classic diner',description:'Chrome-edged pedestal tables, ribbed vinyl chairs and checkerboard tiles.',colors:['#ddd9c9','#596366','#98514a']},
 {id:'cafe',name:'Warm café',description:'Round timber tables, bentwood spindle chairs, soft green finishes and plants.',colors:['#b9a084','#64847b','#c4b19a']},
 {id:'bistro',name:'Contemporary bistro',description:'Clear glass tables on crossed brass bases, curved upholstered armchairs and candles.',colors:['#96775c','#385956','#e8e0d1']},
 {id:'japanese',name:'Japanese minimal',description:'Slatted timber trestle tables, wooden chairs with woven seats and paper lanterns.',colors:['#797262','#554d3d','#f2e0b9']},
] as const;
export type RestaurantInteriorId=typeof RESTAURANT_INTERIORS[number]['id'];
export const interiorStyle=(id:unknown)=>RESTAURANT_INTERIORS.find(s=>s.id===id);
export const defaultInterior=(type:string|undefined):RestaurantInteriorId=>type==='cafe'?'cafe':type==='japanese'?'japanese':!type||type==='diner'||type==='fastfood'?'diner':'bistro';
// Existing fit-outs are the initial selection, but buyers may choose a new look.
export const fittedInterior=(kind:BusinessKind):RestaurantInteriorId=>kind==='cafe'?'cafe':'diner';
export function acquisitionInterior(kind:BusinessKind,method:string,type:string|undefined,requested?:RestaurantInteriorId){
 const food=kind==='restaurant'||kind==='cafe';
 if(requested!==undefined&&(!food||!interiorStyle(requested)))return {error:'Choose a supported restaurant interior.'};
 if(!food)return {};
 return {style:requested??(method==='purchase'?fittedInterior(kind):defaultInterior(type))};
}

export function changeSandboxInterior(empire:EmpireState,id:string,style:RestaurantInteriorId):EmpireState{
 const business=empire.district.businesses[id];
 if(!empire.testingUnlocked||!business||!empire.restaurants[id]||!interiorStyle(style)||business.interiorStyle===style)return empire;
 return {...empire,district:{...empire.district,businesses:{...empire.district.businesses,[id]:{...business,interiorStyle:style}}}};
}
