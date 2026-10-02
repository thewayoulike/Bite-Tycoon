import type {Business,ExpansionState,Property} from '../prototype/expansionModel';
export const BUSINESS_OFFERS={
  hotel:[{id:'standard',name:'Standard room',description:'A comfortable private room, fresh linen, and guest toiletries.',price:85,icon:'🛏️'},{id:'suite',name:'Family suite',description:'The larger room on each guest floor, with extra space for families.',price:125,icon:'🛎️'}],
  apartments:[{id:'studio',name:'Studio apartment',description:'A compact home with its own kitchenette. Rent is charged weekly.',price:180,icon:'🏠'},{id:'onebed',name:'One-bedroom apartment',description:'A larger home on the second residential floor. Rent is charged weekly.',price:240,icon:'🛋️'}],
  park:[{id:'coffee',name:'Kiosk coffee',description:'Fresh coffee for visitors on their morning walk.',price:6,icon:'☕'},{id:'picnic',name:'Picnic snack box',description:'Snacks and refreshments for a relaxing afternoon.',price:12,icon:'🧺'},{id:'garden',name:'Garden tour',description:'A guided visit and refreshments at the kiosk.',price:18,icon:'🌳'}],
};
export const offersFor=(p:Property)=>BUSINESS_OFFERS[p.kind as keyof typeof BUSINESS_OFFERS]??[];
export const offerPrice=(b:Business,offer:ReturnType<typeof offersFor>[number])=>b.menu?.[offer.id]?.price??offer.price;
export const offerEnabled=(b:Business,id:string)=>b.menu?.[id]?.enabled!==false;
export function unitOffer(p:Property,index:number){const offers=offersFor(p);return offers[p.kind==='hotel'?(index%4===3?1:0):index>=3?1:0];}
export function changeOffer(state:ExpansionState,id:string,offerId:string,changes:{price?:number;enabled?:boolean},p:Property):ExpansionState{
  const b=state.businesses[id],offer=offersFor(p).find(item=>item.id===offerId);if(!b||!offer)return state;
  const current={price:offerPrice(b,offer),enabled:offerEnabled(b,offer.id)};
  if(changes.enabled===false&&offersFor(p).filter(item=>offerEnabled(b,item.id)).length<=1)return state;
  if(changes.price!==undefined&&(!Number.isFinite(changes.price)||changes.price<offer.price*.5||changes.price>offer.price*3))return state;
  return {...state,businesses:{...state.businesses,[id]:{...b,menu:{...b.menu,[offerId]:{...current,...changes}}}}};
}
