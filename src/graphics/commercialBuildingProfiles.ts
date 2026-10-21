import {COMMERCIAL_PARCELS} from './commercialParcels';

export function addressHash(value:string){let hash=2166136261;for(const char of value)hash=Math.imul(hash^char.charCodeAt(0),16777619);return hash>>>0;}
// Same ordered CITY models and footprint fitting as ComparisonCityPackage.cs.
const styles=[
 [22.03,40.79,17.57],[10,17.85,10.03],[22.59,49.54,16.43],[9.95,29.73,22.57],
 [11.6,15.01,16.32],[18.68,15.74,22.29],[8.66,9.92,4.2],[21.62,19.89,11.69],
 [13.9,16.39,7.04],[12.43,32.04,17.65],[31.68,35.29,14.95],[15.47,12.35,18.46],
 [21.18,11.6,13.03],[11.96,8.53,6.98],[19.05,11.65,6.68],[20.63,11.03,11.1],
 [12.74,9.87,10.57],[14.29,3.59,11.95],[32.08,6.25,17.68],[35.75,9.4,20.91],
];
export function commercialArchitecture(id:string){
 const seed=addressHash(id)&0x7fffffff,index=seed%styles.length,[w,h,d]=styles[index];
 const height=id.startsWith('city-')?h*Math.min((14.2+seed%4*.6)/w,16/d):6;
 return {style:index,height,floors:Math.max(1,Math.round(height/2.9)-1),tall:height>=12};
}
const everydayShops=[
 ['barber','Crown & Comb Barbers'],['pharmacy','Green Cross Pharmacy'],['bakery','Morning Crust Bakery'],
 ['florist','Bloom & Stem Florist'],['laundry','Fresh Fold Laundry'],['hardware','Cornerstone Hardware'],
 ['bookshop','Paper Lantern Books'],['petshop','Paws & Whiskers'],['salon','Willow Hair Studio'],
 ['optician','Clearview Opticians'],['electronics','Circuit House Electronics'],['clothing','Thread & Co.'],
 ['gym','Neighbourhood Fitness'],['dentist','Bright Smile Dental'],['repair','Fix It Phone Repairs'],
 ['estateagent','Homeward Estate Agents'],
] as const;
const sceneryIds=COMMERCIAL_PARCELS.filter(p=>!p.vacant&&p.id.startsWith('city-')&&!commercialArchitecture(p.id).tall).slice(0,everydayShops.length);
const localShops=new Map(sceneryIds.map((p,i)=>[p.id,{category:everydayShops[i][0] as string,name:everydayShops[i][1] as string}]));
localShops.set('site-bakery-florist',{category:'bakery',name:'Rosewood Bakery & Flowers'});
localShops.set('site-bank-post',{category:'bank',name:'Market Square Bank & Post'});
localShops.set('site-cycle-garage',{category:'garage',name:'Eastgate Cycle & Auto'});
export const CITY_PETROL_SITE='city-325-325';
localShops.set(CITY_PETROL_SITE,{category:'petrol',name:'Eastgate Fuel & Market'});
export const citySceneryBusiness=(id:string)=>localShops.get(id);
export function commercialBuildingKind(id:string):'restaurant'|'shop'|'hotel'|'apartments'{
 const a=commercialArchitecture(id);
 if(a.tall)return a.style%2?'apartments':'hotel';
 return id==='site-supermarket'||a.style===19||addressHash('use:'+id)%2===0?'shop':'restaurant';
}
const prefixes=['Willow','Cedar','Harbour','Oakfield','Maple','Riverside','Juniper','Eastgate','Rosewood','Seabright','Northgate','Garden Lane'];
export function cityBusinessName(kind:string,id:string,seed=0,tenant=0){
 const n=addressHash(`${seed}:${id}:${tenant}`),prefix=prefixes[n%prefixes.length];
 const suffix=kind==='restaurant'?['Kitchen','Bistro','Grill','Dining Room'][Math.floor(n/13)%4]:kind==='cafe'?'Coffee House':kind==='shop'?['Fresh Market','Supermarket','Food Hall'][Math.floor(n/13)%3]:kind==='hotel'?'Hotel':kind==='apartments'?'Apartments':kind==='plaza'?'Galleria':'Stores';
 return `${prefix} ${suffix}`;
}
