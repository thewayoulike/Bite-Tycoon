import type {Business,BusinessKind,ExpansionState,Property} from '../prototype/expansionModel';
import type {GameState} from '../hooks/useGameLoop';
import {COMMERCIAL_PARCELS} from '../graphics/commercialParcels';
import {addressHash,commercialBuildingKind,commercialArchitecture,citySceneryBusiness,cityBusinessName} from '../graphics/commercialBuildingProfiles';

export const FAST_TRACK_CASH=250_000;
export type PlotId=string;
export type MarketState={version:1;ownerCash:number;startingCapital:number;firstPropertyId?:string;level:number;parcels:Partial<Record<PlotId,string>>;listingSeed?:number};
export type AcquisitionRecord={method:'purchase'|'lease'|'construction';cost:number;land:number;capital:number;openingStock?:number};
export type LeaseTerms={weeklyRent:number;intervalWeeks:4;nextPaymentWeek:number};
export const LAND_PLOTS=[
  {id:'commercial',name:'Market Street commercial land',position:[50,0,25] as [number,number,number],land:55_000,kinds:['restaurant','shop','hotel','apartments'] as BusinessKind[],area:'Town centre',vacant:true,description:'A serviced plot for a restaurant, supermarket, hotel or apartment building.'},
  {id:'large',name:'Park Avenue development land',position:[50,0,-28] as [number,number,number],land:15_000,kinds:['restaurant','shop','hotel','apartments','plaza'] as BusinessKind[],area:'Town centre',vacant:true,description:'Serviced land for a restaurant, supermarket, hotel or apartment building. Shopping malls must be bought as existing buildings.'},
  ...COMMERCIAL_PARCELS.map(p=>({...p,land:15_000,kinds:['restaurant','shop','hotel','apartments'] as BusinessKind[],description:p.vacant?'Serviced commercial land. Choose the business you want to build.':'Existing premises. The building stays in place when its business changes hands.'})),
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
// Retain constructionIdentity for old saves; new construction is vacant-land only.
export const buildableKinds=(plot:LandPlot):BusinessKind[]=>plot.vacant&&!citySceneryBusiness(plot.id)?plot.kinds.filter(kind=>kind!=='plaza'):[];
export const canConstruct=(id:string)=>{const c=constructionIdentity(id);return !!c&&buildableKinds(c.plot).includes(c.kind);};
export type ListedBusinessKind='restaurant'|'shop'|'hotel'|'apartments';
export type SiteOffer={mode:'land'|'lease'|'purchase'|'scenery';kind:ListedBusinessKind;id:string;name:string;nextReviewWeek?:number;category?:string;floors:number};
function tenancy(id:string,seed:number,week:number,initialLease?:boolean){
 const hash=addressHash(`${seed}:${id}`),period=8+hash%8,offset=Math.floor(hash/17)%4;
 const phase=Math.floor((Math.max(1,week)-1+offset)/period);
 const initial=initialLease===undefined?(hash>>>9)%2:initialLease?0:1;
 return {lease:(initial+phase)%2===0,tenant:Math.floor((initial+phase)/2),nextReviewWeek:(phase+1)*period-offset+1};
}
/** Only tenancy changes, on staggered game-week boundaries; the building never rerolls. */
export function siteOffer(plot:LandPlot,seed=0,week=1):SiteOffer{
 const scenery=citySceneryBusiness(plot.id),kind=commercialBuildingKind(plot.id),floors=commercialArchitecture(plot.id).floors;
 if(scenery)return {mode:'scenery',kind:'shop',id:'city-business-'+plot.id,name:scenery.name,category:scenery.category,floors};
 if(plot.vacant)return {mode:'land',kind:'restaurant',id:'plot-'+plot.id,name:plot.name,floors:0};
 const t=tenancy(plot.id,seed,week),mode=canLease(kind)&&t.lease?'lease':'purchase';
 return {mode,kind,id:`${mode==='lease'?'unit':'trading'}-${plot.id}-${kind}`,name:mode==='lease'?`Empty shop · ${plot.name}`:cityBusinessName(kind,plot.id,seed,canLease(kind)?t.tenant:0),floors,...(canLease(kind)?{nextReviewWeek:t.nextReviewWeek}:{})};
}
export function corePropertyOffer(p:Property,seed=0,week=1){
 const t=tenancy(p.id,seed,week,p.id==='diner'||p.id==='cafe');
 const mode=canLease(p.kind)&&t.lease?'lease' as const:'purchase' as const;
 return {mode,name:mode==='lease'?`Empty ${p.kind==='shop'?'shop':'restaurant'} · ${p.address}`:p.id==='park'?p.name:cityBusinessName(p.kind,p.id,seed,canLease(p.kind)?t.tenant:0),...(canLease(p.kind)?{nextReviewWeek:t.nextReviewWeek}:{})};
}
export function listedPropertyIdentity(id:string){
 const match=/^(unit|trading)-(.+)-(restaurant|shop|hotel|apartments)$/.exec(id);if(!match)return null;
 const plot=landPlotById(match[2]);return plot&&!plot.vacant?{plot,kind:match[3] as ListedBusinessKind,mode:match[1]==='unit'?'lease' as const:'purchase' as const}:null;
}
export const marketSiteIdentity=(id:string)=>constructionIdentity(id)??listedPropertyIdentity(id);
export const offerLabel=(mode:SiteOffer['mode'])=>mode==='lease'?'Empty shop · for lease':mode==='purchase'?'Operating business · for sale':mode==='scenery'?'Local business · not available':'Vacant land · buy & build';
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
  const cost=method==='construction'?((CONSTRUCTION[p.kind]??0)+(['hotel','apartments','plaza'].includes(p.kind)?Math.max(0,(construction?.plot.land??0)-15_000):0)):modern?listing?(method==='lease'?(p.kind==='shop'?24_000:18_000):p.kind==='hotel'?58_000:p.kind==='apartments'?68_000:p.kind==='shop'?95_000:70_000)+variation*(method==='lease'?1500:5000):(method==='lease'?LEASE[p.id]:PURCHASE[p.id])??0:method==='lease'?p.deposit:p.buy;
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
