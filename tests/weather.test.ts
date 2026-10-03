import test from 'node:test';
import assert from 'node:assert/strict';
import {weatherForDay,weatherDemand,LEGACY_WEATHER_SEED} from '../src/empire/weather';
import {INITIAL_STATE,advanceGame} from '../src/hooks/useGameLoop';
import {createEmpire,unlockTestDistrict,startEmpireWeek,advanceEmpire,parseEmpireSave,setEmpireSpeed} from '../src/empire/empire';
import {advanceVenue,startVenueWeek} from '../src/empire/venueSimulation';
import {propertyById} from '../src/prototype/expansionModel';
import {OUTER_LOTS,CITY_EDGE,buildOuterCity} from '../src/graphics/outerCity';

const fresh=()=>{const e=unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)),INITIAL_STATE);e.district.weatherSeed=48271;return e;};
test('daily forecast is repeatable, spans all weather, crosses weeks and survives save/load',()=>{
 const e=fresh(),forecast=Array.from({length:140},(_,d)=>weatherForDay(1,d+1,e.district.weatherSeed));
 assert.deepEqual(new Set(forecast.map(w=>w.kind)),new Set(['clear','cloudy','rain','snow','wind']));
 assert.deepEqual(weatherForDay(1,8,48271),weatherForDay(2,1,48271));
 assert.notDeepEqual(forecast,Array.from({length:140},(_,d)=>weatherForDay(1,d+1,999)));
 const restored=parseEmpireSave(JSON.stringify(e))!;
 assert.deepEqual(restored,e);assert.deepEqual(weatherForDay(1,5,restored.district.weatherSeed),forecast[4]);
 delete e.district.weatherSeed;const legacy=parseEmpireSave(JSON.stringify(e))!;
 assert.equal(legacy.district.weatherSeed,LEGACY_WEATHER_SEED);
 assert.deepEqual(legacy.district.businesses,e.district.businesses);assert.deepEqual(legacy.district.loans,e.district.loans);
});
test('global simulation shares one weather day across restaurants and pauses without changing the forecast',()=>{
 const e=startEmpireWeek(fresh()),seen:unknown[]=[];
 advanceEmpire(e,.1,(r,dt,w)=>{seen.push(w);return r;});
 const kind=weatherForDay(e.district.week,e.district.day,e.district.weatherSeed).kind;
 assert.deepEqual(seen,[weatherDemand('restaurant',kind),weatherDemand('cafe',kind),weatherDemand('restaurant',kind)]);
 const paused=setEmpireSpeed(e,0);assert.equal(advanceEmpire(paused,100,advanceGame),paused);
});
test('weather actually changes restaurant walk-ins and online order demand',t=>{
 t.mock.method(Math,'random',()=>.09);
 const r={...structuredClone(INITIAL_STATE),week:2,phase:'service' as const,isRestaurantOpen:true};
 assert.equal(advanceGame(r,1,weatherDemand('restaurant','clear')).customers.length,1);
 assert.equal(advanceGame(r,1,weatherDemand('restaurant','snow')).customers.length,0);
 t.mock.restoreAll();t.mock.method(Math,'random',()=>.035);
 const delivery={...r,tables:[],unlockedApps:['bitedash']};
 assert.equal(advanceGame(delivery,1,weatherDemand('restaurant','clear')).orders.length,0);
 assert.ok(advanceGame(delivery,1,weatherDemand('restaurant','rain')).orders.length>0);
});
test('venue arrivals respond to weather while signed apartment rents remain unchanged',()=>{
 const e=startEmpireWeek(fresh()),p=propertyById('shop')!,b=e.district.businesses.shop;
 const rain=advanceVenue(p,b,1,1,1,weatherDemand('shop','rain').visits),wind=advanceVenue(p,b,1,1,1,weatherDemand('shop','wind').visits);
 assert.ok(rain.venue!.arrivalTimer<wind.venue!.arrivalTimer);
 assert.equal(rain.cash,b.cash);assert.equal(wind.cash,b.cash);
 const apartment=propertyById('apartments')!,a=e.district.businesses.apartments;
 const signed={...a,venue:{...a.venue!,running:false,units:a.venue!.units.map((u,i)=>i===0?{...u,occupied:true,rent:187,rentWeek:1}:u)}};
 const opened=startVenueWeek(apartment,signed,2);assert.equal(opened.cash,signed.cash+187);
 const snow=advanceVenue(apartment,opened,1,2,1,weatherDemand('apartments','snow').visits);
 assert.equal(snow.venue!.units[0].rent,187);assert.equal(snow.cash,opened.cash);
});
test('weather changes mall footfall without repricing active leases or charging extra cash',()=>{
 const e=startEmpireWeek(fresh()),p=propertyById('park')!,b=e.district.businesses.park;
 const occupied={...b,venue:{...b.venue!,units:b.venue!.units.map(u=>({...u,occupied:true,rent:200,leaseEnd:9}))}};
 const rain=advanceVenue(p,occupied,1,1,1,weatherDemand('plaza','rain').visits),snow=advanceVenue(p,occupied,1,1,1,weatherDemand('plaza','snow').visits);
 assert.ok(rain.plaza!.footfall>snow.plaza!.footfall);assert.equal(rain.cash,occupied.cash);assert.equal(snow.cash,occupied.cash);
 assert.ok(rain.venue!.units.every(u=>u.rent===200));
});
test('snow reduces new hotel bookings, but an existing reservation still arrives at its agreed rate',()=>{
 const e=startEmpireWeek(fresh()),p=propertyById('hotel')!,base=e.district.businesses.hotel;
 const morning={...base,venue:{...base.venue!,clock:2*180/7}};
 const normal=advanceVenue(p,morning,.1,1,3,1),snow=advanceVenue(p,morning,.1,1,3,weatherDemand('hotel','snow').visits);
 assert.equal(normal.lodging!.bookings.length,1);assert.equal(snow.lodging!.bookings.length,0);
 const booking={id:99,name:'Booked guest',type:'standard' as const,rate:123,nights:1,arrival:2*180/7,unit:0,status:'reserved' as const,kind:'booking' as const};
 const reserved={...morning,lodging:{...morning.lodging!,bookings:[booking],lastBookingDay:2}};
 const arrived=advanceVenue(p,reserved,.1,1,3,weatherDemand('hotel','snow').visits);
 assert.equal(arrived.lodging!.bookings[0].rate,123);assert.equal(arrived.lodging!.bookings[0].status,'waiting');
 assert.equal(arrived.venue!.visitors[0].agreedRate,123);
});
test('surrounding city fills every outer plot without overlapping the managed district, with bounded merged geometry',()=>{
 assert.equal(OUTER_LOTS.length,200);assert.equal(new Set(OUTER_LOTS.map(l=>`${l.x}:${l.z}`)).size,200);
 assert.ok(OUTER_LOTS.every(l=>(Math.abs(l.x)>=75||Math.abs(l.z)>=75)&&Math.abs(l.x)+9.25<CITY_EDGE&&Math.abs(l.z)+9.25<CITY_EDGE));
 let vertices=0;
 for(let q=0;q<4;q++){
  const model=buildOuterCity(q);assert.equal(Object.keys(model).length,4);
  for(const g of Object.values(model)){vertices+=g.getAttribute('position').count;assert.ok(Number.isFinite(g.boundingSphere!.radius));g.dispose();}
 }
 assert.ok(vertices<1600000,`Scenery budget exceeded: ${vertices} vertices`);
});
