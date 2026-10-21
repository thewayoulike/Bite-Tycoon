import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame} from '../src/empire/newGame';
import {unlockSandboxFeatures} from '../src/empire/sandbox';
import {applyDistrictUpdate,districtView,parseEmpireSave} from '../src/empire/empire';
import {propertyById,acquire} from '../src/prototype/expansionModel';
import {roomTypes,manageLodging,lodgingFacilities} from '../src/empire/lodging';
import {roomTypeUnlocked} from '../src/empire/hotelProgression';
import {apartmentTypeUnlocked} from '../src/empire/apartments';
import {availableRetailProducts,RETAIL_PRODUCTS,retailSelectionDisabled} from '../src/empire/retail';
import {MALL_FACILITIES,managePlaza} from '../src/empire/plaza';
import {buildTerrace} from '../src/career/restaurant';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {LAND_PLOTS,siteOffer} from '../src/empire/propertyMarket';
import {consolidatedBalance} from '../src/career/consolidation';

test('Sandbox opens every finite level and floor without faking performance or changing Career',()=>{
 const e=newGame('sandbox'),d=districtView(e),h=d.businesses.hotel,a=d.businesses.apartments,m=d.businesses.park;
 assert.equal(h.lodging!.openFloors,5);assert.equal(h.venue!.units.length,20);
 assert.equal(a.lodging!.openFloors,10);assert.equal(a.venue!.units.length,30);
 assert.equal(m.plaza!.openFloors,5);assert.equal(m.venue!.units.length,20);assert.equal(m.plaza!.depth!.zones.length,5);
 assert.equal(d.businesses.shop.retail!.store!.level,5);
 assert.equal(availableRetailProducts(d.businesses.shop).length,RETAIL_PRODUCTS.length);
 for(const p of RETAIL_PRODUCTS)assert.equal(retailSelectionDisabled(d.businesses.shop,p.id),false,p.id);
 for(const r of Object.values(e.restaurants)){
  assert.equal(r.restaurantLevel,6);assert.ok(r.testingUnlocked&&r.recipes.every(v=>v.unlocked));
  assert.equal(r.stats.customersServed,INITIAL_STATE.stats.customersServed);
  assert.ok(buildTerrace(r).advanced?.terrace);
 }
 assert.equal(h.lodging!.completedNights??0,0);assert.equal(a.lodging!.occupiedHomeWeeks??0,0);
 assert.equal(m.plaza!.leasesSigned,0);
 assert.ok(Math.abs(consolidatedBalance(e).difference)<.02,'Testing funds remain capital, not sales or unexplained cash');
 const career=newGame('fast-track');assert.equal(unlockSandboxFeatures(career),career);
 assert.equal(career.district.market!.level,1);assert.equal(career.district.market!.ownerCash,250000);
 assert.equal(unlockSandboxFeatures(e),e,'Unlocks do not re-grant money every update');
 const restored=parseEmpireSave(JSON.stringify(e))!;assert.ok(restored);assert.equal(unlockSandboxFeatures(restored),restored);
});

test('all hotel and apartment renovations and facilities are usable; lease safety remains enforced',()=>{
 let d=districtView(newGame('sandbox'));
 for(const kind of ['hotel','apartments']){
  const p=propertyById(kind)!;
  for(const spec of roomTypes(p)){
   const index=spec.id==='penthouse'?27:0;
   if(kind==='hotel')assert.ok(roomTypeUnlocked(d.businesses[kind],spec.id));
   else assert.ok(apartmentTypeUnlocked(d.businesses[kind],spec.id,index));
   d=manageLodging(d,kind,{type:'renovate',unit:index,roomType:spec.id});
   assert.equal(d.businesses[kind].venue!.units[index].type,spec.id);
  }
  for(const facility of lodgingFacilities(p)){
   d=manageLodging(d,kind,{type:'facility',id:facility.id});
   assert.ok(d.businesses[kind].lodging!.facilities.includes(facility.id),facility.id);
  }
 }
 for(const facility of MALL_FACILITIES){d=managePlaza(d,'park',{type:'facility',facility:facility.id});assert.ok(d.businesses.park.plaza!.facilities.includes(facility.id));}
 assert.ok(d.businesses.hotel.cash>0&&d.businesses.apartments.cash>0&&d.businesses.park.cash>0);
 d.businesses.hotel.venue!.units[0].occupied=true;
 const before=d.businesses.hotel.venue!.units[0].type;
 d=manageLodging(d,'hotel',{type:'renovate',unit:0,roomType:'standard'});
 assert.equal(d.businesses.hotel.venue!.units[0].type,before,'Do not erase active guest occupancy to renovate');
});

test('businesses acquired later also receive Sandbox entitlements, with existing business choices preserved',()=>{
 let e=newGame('sandbox');e.district.market!.listingSeed=17;
 e.restaurants.diner.money=150000;e.restaurants.diner.recipes[0].price=42;
 const offer=LAND_PLOTS.map(p=>siteOffer(p,17)).find(o=>o.mode==='lease'&&o.kind==='shop')!;
 e=applyDistrictUpdate(e,s=>acquire(s,offer.id,'leased','diner'),INITIAL_STATE);
 assert.ok(e.district.businesses[offer.id]);assert.equal(e.district.businesses[offer.id].retail!.store!.level,5);
 assert.ok(e.district.businesses[offer.id].retail!.electronicsUnlocked);
 assert.equal(e.restaurants.diner.recipes[0].price,42);assert.ok(e.restaurants.diner.money<150000,'Existing funds are not topped up again');
 assert.ok(parseEmpireSave(JSON.stringify(e)));
});
