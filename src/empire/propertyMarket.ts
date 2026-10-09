import type {Business,BusinessKind,ExpansionState,Property} from '../prototype/expansionModel';
import type {GameState} from '../hooks/useGameLoop';
import {COMMERCIAL_PARCELS} from '../graphics/commercialParcels';

export const FAST_TRACK_CASH=250_000;
export type PlotId=string;
export type MarketState={version:1;ownerCash:number;startingCapital:number;firstPropertyId?:string;level:number;parcels:Partial<Record<PlotId,string>>;listingSeed?:number};
export type AcquisitionRecord={method:'purchase'|'lease'|'construction';cost:number;land:number;capital:number;openingStock?:number};
export type LeaseTerms={weeklyRent:number;intervalWeeks:4;nextPaymentWeek:number};
export const LAND_PLOTS=[
  {id:'commercial',name:'Market Street commercial land',position:[50,0,25] as [number,number,number],land:55_000,kinds:['restaurant','shop','hotel','apartments'] as BusinessKind[],area:'Town centre',vacant:true,description:'A serviced plot for a restaurant, supermarket, hotel or apartment building.'},
  {id:'large',name:'Park Avenue development land',position:[50,0,-28] as [number,number,number],land:15_000,kinds:['restaurant','shop','hotel','apartments','plaza'] as BusinessKind[],area:'Town centre',vacant:true,description:'A large serviced site, suitable for every business type including a shopping mall.'},
  ...COMMERCIAL_PARCELS.map(p=>({...p,land:15_000,kinds:['restaurant','shop','hotel','apartments'] as BusinessKind[],description:p.vacant?'Serviced commercial land. Choose the business you want to build.':'Buy this commercial site and redevelop it. Clearing the existing buildings is included in the build quote.'})),
];
export type LandPlot=typeof LAND_PLOTS[number];
const PLOTS_BY_ID=new Map(LAND_PLOTS.map(p=>[p.id,p]));
export const landPlotById=(id:string)=>PLOTS_BY_ID.get(id);
export const canLease=(kind:BusinessKind)=>['restaurant','cafe','shop'].includes(kind);
export const propertyLevel=(kind:BusinessKind)=>kind==='hotel'?3:kind==='apartments'?4:kind==='plaza'?5:1;
export const marketKindName=(kind:BusinessKind)=>({restaurant:'Restaurant',cafe:'Café',shop:'Supermarket',hotel:'Hotel',apartments:'Apartments',plaza:'Shopping mall',park:'Public garden'}[kind]);
export const builtPropertyId=(plot:PlotId,kind:BusinessKind)=>`built-${plot}-${kind}`;
export function constructionIdentity(id:string){
  const match=/^built-(.+)-(restaurant|shop|hotel|apartments|plaza)$/.exec(id);
  if(!match)return null;
  const plot=landPlotById(match[1]),kind=match[2] as BusinessKind;
  return plot&&plot.kinds.includes(kind)?{plot,kind}:null;
}
export const canConstruct=(id:string)=>{const c=constructionIdentity(id);return !!c&&c.plot.kinds.includes(c.kind);};
function addressHash(value:string){let hash=2166136261;for(const char of value)hash=Math.imul(hash^char.charCodeAt(0),16777619);return hash>>>0;}
export type SiteOffer={mode:'land'|'lease'|'purchase';kind:'restaurant'|'shop';id:string};
/** Stable for a saved career. Reloading or opening the market never rerolls a property. */
export function siteOffer(plot:LandPlot,seed=0):SiteOffer{
 const hash=addressHash(`${seed}:${plot.id}`),kind=hash%2?'restaurant':'shop';
 const mode=plot.vacant?'land':hash%3===0?'land':hash%3===1?'lease':'purchase';
 return {mode,kind,id:mode==='land'?'plot-'+plot.id:`${mode==='lease'?'unit':'trading'}-${plot.id}-${kind}`};
}
export function listedPropertyIdentity(id:string){
 const match=/^(unit|trading)-(.+)-(restaurant|shop)$/.exec(id);if(!match)return null;
 const plot=landPlotById(match[2]);return plot&&!plot.vacant?{plot,kind:match[3] as 'restaurant'|'shop',mode:match[1]==='unit'?'lease' as const:'purchase' as const}:null;
}
export const marketSiteIdentity=(id:string)=>constructionIdentity(id)??listedPropertyIdentity(id);
export const offerLabel=(mode:SiteOffer['mode'])=>mode==='lease'?'Empty shop · for lease':mode==='purchase'?'Operating business · for sale':'Land · buy & build';
/** Modern careers label owned businesses; the market signs describe unowned opportunities. */
export const showPropertyLabel=(modern:boolean,owned:boolean,near:boolean,selected:boolean)=>modern?owned||selected:near;
export function earnedPlayerLevel(restaurants:Record<string,GameState>,businesses:Record<string,Business>,previous=1){
  return Math.max(previous,1,...Object.values(restaurants).map(r=>r.restaurantLevel??1),...Object.values(businesses).map(b=>b.retail?.store?.level??b.lodging?.openFloors??b.plaza?.openFloors??1));
}
const PURCHASE:Record<string,number>={diner:100_000,cafe:60_000,bistro:85_000,shop:145_000,hotel:28_000,apartments:36_000,park:48_000};
const LEASE:Record<string,number>={diner:18_000,cafe:12_000,bistro:20_000,shop:24_000};
const CONSTRUCTION:Partial<Record<BusinessKind,number>>={restaurant:160_000,shop:165_000,hotel:38_000,apartments:46_000,plaza:64_000};
export function acquisitionQuote(p:Property,method:AcquisitionRecord['method'],modern=true){
  const construction=constructionIdentity(p.id),listing=listedPropertyIdentity(p.id),variation=listing?addressHash(p.id)%5:0;
  const cost=method==='construction'?((CONSTRUCTION[p.kind]??0)+(['hotel','apartments','plaza'].includes(p.kind)?Math.max(0,(construction?.plot.land??0)-15_000):0)):modern?listing?(method==='lease'?(p.kind==='shop'?24_000:18_000):p.kind==='shop'?95_000:70_000)+variation*(method==='lease'?1500:5000):(method==='lease'?LEASE[p.id]:PURCHASE[p.id])??0:method==='lease'?p.deposit:p.buy;
  const land=method==='construction'?(construction?.plot.land??0):modern&&method==='purchase'?Math.round(cost*.25):0;
  const weeklyRent=method==='lease'?(listing?(p.kind==='shop'?155:180)+variation*15:p.id==='diner'?180:p.rent):0;
  const leaseEntry=method==='lease'?Math.round(cost*.2):0;
  return {cost,land,building:Math.max(0,cost-land),leaseEntry,fitOut:method==='lease'?cost-leaseEntry:0,weeklyRent,monthlyRent:weeklyRent*4,level:propertyLevel(p.kind),workingCash:modern?(['hotel','apartments','plaza'].includes(p.kind)?12_000:5_000):300};
}
export const totalRentLiability=(b:Business)=>(b.leaseDue??0)+(b.leaseAccrued??0);
export function weeklyLeaseExpense(p:Property,b:Business,week:number){
  return b.tenure==='leased'&&(b.leaseChargedWeek??b.leasePaidWeek??0)<week?(b.leaseTerms?.weeklyRent??p.rent):0;
}
export function leaseReserve(p:Property,b:Business,s:Pick<ExpansionState,'week'>){
  if(b.tenure!=='leased')return 0;
  if(!b.leaseTerms)return (b.leaseDue??0)+weeklyLeaseExpense(p,b,s.week);
  const remaining=Math.max(0,b.leaseTerms.nextPaymentWeek-(b.leaseChargedWeek??s.week-1));
  return totalRentLiability(b)+remaining*b.leaseTerms.weeklyRent;
}
