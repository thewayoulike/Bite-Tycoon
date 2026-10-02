/** Scenery only. These lots never enter the business simulation or saved accounts. */
export type CityLotKind='homes'|'shops'|'supermarket'|'school'|'clinic'|'firestation'|'library'|'offices'|'garage'|'playground'|'square';
export type CityLot={id:string;kind:CityLotKind;position:[number,number,number];rotation?:number;names?:string[];zone:'residential'|'commercial'|'civic'};
export const CITY_LOTS:CityLot[]=[
  ...[-50,-25,0,25].map((z,i)=>({id:`cedar-homes-${i}`,kind:'homes' as const,position:[-50,0,z] as [number,number,number],rotation:Math.PI/2,zone:'residential' as const})),
  {id:'north-homes',kind:'homes',position:[-25,0,-50],rotation:Math.PI,zone:'residential'},
  {id:'cedar-playground',kind:'playground',position:[-50,0,50],zone:'residential'},
  {id:'school',kind:'school',position:[0,0,-50],names:['CEDAR PRIMARY SCHOOL'],zone:'civic'},
  {id:'clinic',kind:'clinic',position:[25,0,-50],names:['PARKSIDE HEALTH CENTRE'],zone:'civic'},
  {id:'fire-station',kind:'firestation',position:[50,0,-50],names:['FIRE & RESCUE'],zone:'civic'},
  {id:'library',kind:'library',position:[0,0,-25],names:['PUBLIC LIBRARY'],zone:'civic'},
  {id:'workspaces',kind:'offices',position:[25,0,-25],names:['PARK AVENUE OFFICES'],zone:'commercial'},
  {id:'barber-pharmacy',kind:'shops',position:[50,0,-25],rotation:Math.PI/2,names:['THE BARBER','PHARMACY'],zone:'commercial'},
  {id:'supermarket',kind:'supermarket',position:[50,0,0],rotation:Math.PI/2,names:['FRESHWAY SUPERMARKET'],zone:'commercial'},
  {id:'gym-hardware',kind:'shops',position:[50,0,25],rotation:Math.PI/2,names:['NEIGHBORHOOD GYM','HARDWARE & HOME'],zone:'commercial'},
  {id:'bakery-florist',kind:'shops',position:[-25,0,50],names:['GOLDEN CRUST BAKERY','THE FLOWER SHOP'],zone:'commercial'},
  {id:'market-square',kind:'square',position:[0,0,50],zone:'civic'},
  {id:'bank-post',kind:'shops',position:[25,0,50],names:['COMMUNITY BANK','POST OFFICE'],zone:'commercial'},
  {id:'cycle-garage',kind:'garage',position:[50,0,50],names:['CITY CYCLES & AUTO'],zone:'commercial'},
];

export const CITY_AVENUES=[-62.5,-37.5,-12.5,12.5,37.5,62.5];
export const CITY_CROSS_STREETS=[-62.5,-12.5,37.5,62.5];
