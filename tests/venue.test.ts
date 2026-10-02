import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,applyDistrictUpdate,startEmpireWeek} from '../src/empire/empire';
import {advanceVenues,operateVenue,serviceBlocker,startVenueWeek} from '../src/empire/venueSimulation';
import {PROPERTIES,propertyById,hireBusinessStaff,lendCash,finishWeek,nextDay} from '../src/prototype/expansionModel';
import {venueFinancials} from '../src/empire/venueFinance';
import {setShelfProduct,orderRetailStock} from '../src/empire/retail';
import {worldTime} from '../src/empire/worldTime';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<.02,`${a} != ${b}`);
test('all non-food businesses run live services, consume stock and reconcile their own books',()=>{
 let e=unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);e=startEmpireWeek(e);let s=e.district;
 s=hireBusinessStaff(s,'shop','manager');s=setShelfProduct(s,'shop','coffee');s=orderRetailStock(s,'shop','coffee',10);s=lendCash(s,'hotel','shop',500);
 for(let second=0;second<180;second++)s=advanceVenues(s,1);
 for(const id of ['hotel','apartments','shop','park']){const b=s.businesses[id],f=venueFinancials(propertyById(id)!,b,s);assert.ok(b.venue!.totalServed>0,id+' serves real visitors');assert.ok(b.venue!.week.wages>0);close(f.assets,f.liabilities+f.equity);close(f.closingCash,b.cash);assert.ok(f.costOfSupplies>0);}
 const cash=s.businesses.hotel.cash;s=finishWeek(s);close(s.businesses.hotel.cash,cash);assert.ok(!s.businesses.hotel.venue!.running);s=nextDay(nextDay(nextDay(s)));close(s.businesses.hotel.cash,cash-210);assert.equal(s.day,4);
 const b=s.businesses.hotel,f=venueFinancials(propertyById('hotel')!,b,s);close(f.assets,f.liabilities+f.equity);close(f.closingCash,b.cash);
});
test('hotel check-in honors room type and exact posted price; exhausted suites cannot use a standard room',()=>{
 let s=startEmpireWeek(unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE)).district;
 let b=s.businesses.hotel;b={...b,venue:{...b.venue!,units:b.venue!.units.map((u,i)=>i===3?{...u,type:'suite',rate:151}:u),visitors:[{id:1,seed:1,state:'waiting',patience:30,remaining:0,unit:null,offerId:'suite'}]}};s={...s,businesses:{...s.businesses,hotel:b}};
 s=operateVenue(s,'hotel','serve',1);close(s.businesses.hotel.cash,25151);assert.equal(s.businesses.hotel.venue!.visitors[0].unit,3);
 b=s.businesses.hotel;b={...b,venue:{...b.venue!,units:b.venue!.units.map((u,i)=>i===7?{...u,occupied:true}:u),visitors:[{id:2,seed:2,state:'waiting',patience:30,remaining:0,unit:null,offerId:'suite'}]}};assert.ok(serviceBlocker(propertyById('hotel')!,b));
});
test('daylight repeats every game day with a visible night period',()=>{
 assert.equal(worldTime(0).label,'08:00');assert.equal(worldTime(0).isNight,false);
 assert.equal(worldTime(8).isNight,true);assert.equal(worldTime(100/7).isNight,false);
 assert.equal(worldTime(100/7).day,2);
});
