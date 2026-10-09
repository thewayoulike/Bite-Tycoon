import {buildingDesign} from '../empire/buildingDesigns';
import type {Property} from '../prototype/expansionModel';
import type {GameState} from '../hooks/useGameLoop';
import {RESTAURANT_IDENTITIES,RestaurantIdentity} from '../empire/restaurantIdentity';
import {MALL_FLOOR_HEIGHT} from '../empire/plaza';

export const RESTAURANT_SHELL={width:40,depth:38,back:-15,front:23,height:10,scale:.38};
export const LODGING_STOREY_HEIGHT=2.7;
export function propertyInteriorPlacement(p:Property,floor=0){
  return {position:[p.position[0],p.position[1]+.13+floor*(p.kind==='plaza'?MALL_FLOOR_HEIGHT*.75:LODGING_STOREY_HEIGHT),p.position[2]] as [number,number,number],scale:p.kind==='restaurant'||p.kind==='cafe'?RESTAURANT_SHELL.scale:.75};
}
export function restaurantAppearance(id:string,state?:Partial<Pick<GameState,'restaurantIdentity'|'wallColor'|'frameColor'|'restaurantLayout'>>,property?:Pick<Property,'name'|'design'>){
  const identity=state?.restaurantIdentity??(id in RESTAURANT_IDENTITIES?id:'diner') as RestaurantIdentity,theme=RESTAURANT_IDENTITIES[identity];
  const design=buildingDesign(property?.design);
  return {identity,name:property?.name??theme.name,wall:state?.wallColor??design?.wall??theme.wall,frame:state?.frameColor??design?.frame??theme.frame,layout:state?.restaurantLayout??(design?.id==='modern'?4:0),design:design?.id};
}
export type RestaurantAppearance=ReturnType<typeof restaurantAppearance>;

const URBAN_STYLES=[
  {wall:'#895743',trim:'#b5a18a',frame:'#343332',surface:'brick' as const},
  {wall:'#b3a898',trim:'#bfb5a6',frame:'#444b4d',surface:'plaster' as const},
  {wall:'#6e493e',trim:'#a69b8c',frame:'#a19b8d',surface:'brick' as const},
  {wall:'#948d80',trim:'#b2aa9e',frame:'#363e40',surface:'concrete' as const},
];
export function urbanBuildingProfile(p:Property,{background=false,floorsOverride,cutawayFloor}:{background?:boolean;floorsOverride?:number;cutawayFloor?:number}={}){
  const seed=Array.from(p.id).reduce((n,c)=>n*31+c.charCodeAt(0),7)>>>0;
  const cutaway=cutawayFloor!==undefined,groundHeight=background?3.35:2.85;
  const floors=cutaway?Math.max(0,cutawayFloor-1):floorsOverride??(p.id.startsWith('built-')&&p.kind==='shop'?0:2),height=groundHeight+floors*2.85;
  const design=buildingDesign(p.design);
  const modern=design?design.id==='modern':p.id==='shop'||(background&&seed%4===0),hotel=p.kind==='hotel',residential=p.kind==='apartments';
  const mansard=design?design.id==='heritage'&&['hotel','apartments'].includes(p.kind):!modern&&!hotel&&((background&&seed%3===0)||p.id==='bistro');
  const style=design??URBAN_STYLES[hotel?1:modern?3:p.id==='cafe'?2:seed%URBAN_STYLES.length];
  const scale:[number,number,number]=background?[1,1,1]:[13.5/13.4,LODGING_STOREY_HEIGHT/2.85,15/12.2];
  return {seed,cutaway,groundHeight,floors,height,modern,hotel,residential,mansard,style,scale};
}
