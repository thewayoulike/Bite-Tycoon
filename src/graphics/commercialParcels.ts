import {CITY_LOTS} from './cityDistrictLayout';
import {isOuterPark,outerCityZone} from './cityZoning';

/** Stable addresses shared by the market, save files and scenery. Never use array indices as IDs. */
export type CommercialParcel={id:string;name:string;position:[number,number,number];area:string;vacant:boolean};
export const COMMERCIAL_PARCELS:CommercialParcel[]=[
  ...CITY_LOTS.filter(l=>l.zone==='commercial'&&!['gym-hardware','barber-pharmacy'].includes(l.id)).map(l=>({
    id:'site-'+l.id,name:({supermarket:'Freshway site · Market Street','bakery-florist':'Bakery site · South Square','bank-post':'Bank site · South Square','cycle-garage':'Garage site · South Square'} as Record<string,string>)[l.id],position:l.position,area:'Town centre',vacant:false,
  })),
  ...Array.from({length:21},(_,i)=>(i-10)*25).flatMap(x=>Array.from({length:21},(_,i)=>(i-10)*25)
    .filter(z=>(Math.abs(x)>50||Math.abs(z)>50)&&outerCityZone(x,z)==='commercial'&&!isOuterPark(x,z))
    .map(z=>({id:`city-${x+250}-${z+250}`,name:`${(z/25+11)*10} Market Avenue ${x/25}`,position:[x,0,z] as [number,number,number],area:z<0?'North Market':z>=100?'South Market':'East Market',vacant:Math.abs(x/25+z/25)%3===0}))),
];
const BY_POSITION=new Map(COMMERCIAL_PARCELS.map(p=>[`${p.position[0]}:${p.position[2]}`,p]));
export const commercialParcelAt=(x:number,z:number)=>BY_POSITION.get(`${x}:${z}`);
