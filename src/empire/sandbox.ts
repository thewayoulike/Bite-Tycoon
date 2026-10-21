import type {EmpireState} from './empire';
import {propertyById} from '../prototype/expansionModel';
import {maxFloors,newLodgingUnit,roomsPerFloor} from './lodging';
import {newPlazaUnit,PLAZA_FLOORS,SHOPS_PER_FLOOR} from './plaza';
import {ensureMallDepth} from './mallDepth';
import {RETAIL_PRODUCTS,retailProductFloor} from './retail';
import {coldProduct} from './supermarket';

/** Testing entitlements are applied once per account, including later acquisitions.
 * Trading history, stock, leases and chosen fit-outs remain real simulation data.
 */
export function unlockSandboxFeatures(empire:EmpireState):EmpireState{
 if(empire.settings?.mode!=='sandbox')return empire;
 const businesses={...empire.district.businesses},restaurants={...empire.restaurants},testCapital={...empire.testCapital};
 let changed=false;
 for(const [id,old] of Object.entries(businesses)){
  if(old.sandboxUnlockVersion===1)continue;
  const p=propertyById(id);if(!p)continue;
  changed=true;
  const r=restaurants[id],cash=r?.money??old.cash,grant=Math.max(0,250_000-cash);
  let b={...old,sandboxUnlockVersion:1,cash:cash+grant};
  if(grant){
   b={...b,books:b.books?{...b.books,capital:b.books.capital+grant}:undefined,ledger:[...b.ledger,{week:empire.district.week,day:empire.district.day,label:'Sandbox testing capital',amount:grant}].slice(-60)};
   testCapital[id]=(testCapital[id]??0)+grant;
  }
  if(r)restaurants[id]={...r,money:b.cash,testingUnlocked:true,restaurantLevel:6,recipes:r.recipes.map(recipe=>({...recipe,unlocked:true}))};
  if(b.retail?.store){
   const ground=RETAIL_PRODUCTS.filter(item=>!retailProductFloor(item.id));
   b={...b,retail:{...b.retail,electronicsUnlocked:true,store:{...b.retail.store,level:5,fixtures:{
    dry:Math.max(b.retail.store.fixtures.dry,ground.filter(item=>!coldProduct(item.id)).length),
    cold:Math.max(b.retail.store.fixtures.cold,ground.filter(item=>coldProduct(item.id)).length),
   }}}};
  }
  if(b.lodging&&b.venue){
   const floors=maxFloors(p),units=[...b.venue.units];
   while(units.length<floors*roomsPerFloor(p))units.push(newLodgingUnit(p));
   b={...b,lodging:{...b.lodging,openFloors:floors},venue:{...b.venue,units}};
  }
  if(b.plaza&&b.venue){
   const units=[...b.venue.units];while(units.length<PLAZA_FLOORS*SHOPS_PER_FLOOR)units.push(newPlazaUnit(units.length));
   b={...ensureMallDepth({...b,plaza:{...b.plaza,openFloors:PLAZA_FLOORS},venue:{...b.venue,units}}),sandboxUnlockVersion:1};
  }
  businesses[id]=b;
 }
 if(!changed)return empire;
 return {...empire,testingUnlocked:true,restaurants,testCapital,district:{...empire.district,businesses,
  market:empire.district.market?{...empire.district.market,level:5}:undefined,
  notice:'Sandbox: all business levels, floors, room types, products and staff are available. Use the testing funds to try renovations, facilities, delivery apps and upgrades. Service, stock and payroll still work normally.'}};
}
