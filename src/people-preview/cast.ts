import type {PersonModel,PersonPose,PersonRole} from './rig';
import {castCatalog} from './castCatalog';

export interface CastMember {id:string;name:string;group:'customers'|'children'|'staff';role:PersonRole;detail:string;ageYears:number;heightMetres:number;clothes:string;coverage:string;assetVersion:string}
export const CAST=castCatalog as CastMember[];
export const CUSTOMERS=CAST.filter(p=>p.group==='customers');
export const CHILDREN=CAST.filter(p=>p.group==='children');
export const STAFF=CAST.filter(p=>p.group==='staff');
export const CAST_BY_ID=new Map(CAST.map(person=>[person.id,person]));
export function nextArrival(arrival:number){return arrival+1;}
const CUSTOMER_SLOTS:Record<string,number>={'carla:walk':0,'eric:walk':1,'claudia:walk':2,'carla:sit':3,'carla:eat':4,'claudia:eat':5,'eric:sit':6,'claudia:sit':7};
// A staff team changes only when requested, never when the customer batch changes.
export function sceneCastId(model:PersonModel='eric',pose:PersonPose='idle',role:PersonRole='customer',arrival=0,team=0,families=false){
 if(role!=='customer'){
  const pool=STAFF.filter(person=>person.role===role);
  return (pool[team%pool.length]??STAFF[0]).id;
 }
 const slot=CUSTOMER_SLOTS[`${model}:${pose}`]??8;
 const pool=families&&slot%2===1&&CHILDREN.length?CHILDREN:CUSTOMERS;
 return pool[(slot+arrival%pool.length+pool.length)%pool.length].id;
}
