import type {BusinessKind} from '../prototype/expansionModel';

export const BUILDING_DESIGNS = [
  {id:'heritage',name:'Heritage brick',description:'Warm brick, framed windows and a traditional entrance canopy.',wall:'#95634d',trim:'#d3bfa1',frame:'#3e4746',surface:'brick'},
  {id:'modern',name:'Modern glass',description:'Wide glazing, slim dark frames and a crisp flat roof.',wall:'#a9afb1',trim:'#dadcdb',frame:'#303f49',surface:'concrete'},
  {id:'garden',name:'Garden terrace',description:'Pale stone, timber sun screens and planted rooftop edges.',wall:'#c5baa5',trim:'#e1d6bf',frame:'#77604a',surface:'plaster'},
] as const;
export type BuildingDesignId=typeof BUILDING_DESIGNS[number]['id'];
export type BusinessSetup={name?:string;design?:BuildingDesignId};
export const buildingDesign=(id:unknown)=>BUILDING_DESIGNS.find(d=>d.id===id);
export const BUSINESS_NAME_LIMIT=48;
export function cleanBusinessName(value:unknown):string|undefined{
  if(typeof value!=='string')return undefined;
  const name=value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
  return name&&name.length<=BUSINESS_NAME_LIMIT?name:undefined;
}
export function validateBusinessSetup(setup:BusinessSetup,construction:boolean){
  if(setup.name!==undefined&&!cleanBusinessName(setup.name))return 'Enter a business name of 1–48 characters.';
  if(setup.design!==undefined&&(!construction||!buildingDesign(setup.design)))return 'Choose a valid design for your new building.';
  return null;
}
export function designDescription(kind:BusinessKind,id:BuildingDesignId){
  if((kind==='restaurant'||kind==='cafe')&&id==='garden')return 'Pale stone, timber entrance screens and planted frontage.';
  if(kind==='plaza')return id==='heritage'?'Stone-and-bronze arcade with a vaulted glass atrium.':id==='modern'?'Steel-and-glass galleria with a flat skylight.':'Timber-screened galleria with planted terraces and a vaulted skylight.';
  if(kind==='apartments'&&id==='heritage')return 'Brick homes with private balconies and a traditional mansard roof.';
  return buildingDesign(id)!.description;
}
