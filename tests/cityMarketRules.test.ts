import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {createFastTrackEmpire,applyDistrictUpdate,parseEmpireSave} from '../src/empire/empire';
import {acquire,propertyById} from '../src/prototype/expansionModel';
import {LAND_PLOTS,siteOffer,builtPropertyId,canConstruct} from '../src/empire/propertyMarket';
import {commercialArchitecture,CITY_PETROL_SITE} from '../src/graphics/commercialBuildingProfiles';
import {unityFrame} from '../src/unity/bridge';
const fresh=()=>{const e=createFastTrackEmpire(structuredClone(INITIAL_STATE));e.district.market!.listingSeed=17;e.district.market!.level=5;return e;};
const frame=(e:ReturnType<typeof fresh>)=>unityFrame({state:INITIAL_STATE,restaurants:e.restaurants,district:e.district,worldProgress:0,focus:null,selected:null},{floor:0,detail:'room',area:'center',cutaway:true});

test('tenancy reviews change unowned shops over weeks, with stable architecture and no reload reroll',()=>{
 const shop=LAND_PLOTS.find(p=>siteOffer(p,17).mode==='lease')!;
 const before=siteOffer(shop,17),after=siteOffer(shop,17,before.nextReviewWeek!);
 assert.equal(after.mode,'purchase');assert.equal(before.floors,after.floors);assert.equal(before.kind,after.kind);
 assert.deepEqual(siteOffer(shop,17,before.nextReviewWeek!-1),before);
 assert.equal(siteOffer(shop,17,after.nextReviewWeek!).mode,'lease');
 const e=fresh();e.district.week=after.nextReviewWeek!;
 assert.deepEqual(frame(parseEmpireSave(JSON.stringify(e))!).properties,frame(e).properties);
});

test('an old lease offer cannot buy a now-running business; operating business kind cannot be substituted',()=>{
 const plot=LAND_PLOTS.find(p=>siteOffer(p,17).mode==='lease')!,old=siteOffer(plot,17);
 const e=fresh();e.district.week=old.nextReviewWeek!;
 const blocked=acquire(e.district,old.id,'leased',undefined,old.kind==='restaurant'?'italian':undefined);
 assert.equal(Object.keys(blocked.businesses).length,0);assert.equal(blocked.market!.ownerCash,250000);
 const offer=siteOffer(plot,17,e.district.week),wrong=offer.kind==='shop'?'restaurant':'shop';
 assert.equal(Object.keys(acquire(e.district,`trading-${plot.id}-${wrong}`,'owned',undefined,wrong==='restaurant'?'italian':undefined).businesses).length,0);
});

test('the same empty shop can be fitted for either permitted use, with its exterior retained after acquisition',()=>{
 const plot=LAND_PLOTS.find(p=>siteOffer(p,17).mode==='lease')!;
 for(const kind of ['restaurant','shop']){
  const e=fresh(),id=`unit-${plot.id}-${kind}`;
  const next=applyDistrictUpdate(e,s=>acquire(s,id,'leased',undefined,kind==='restaurant'?'italian':undefined),INITIAL_STATE);
  assert.equal(next.district.businesses[id]?.tenure,'leased');
  const original=frame(e).properties.find(p=>p.siteId===plot.id)!,owned=frame(next).properties.find(p=>p.id===id)!;
  assert.equal(owned.preserveExterior,true);assert.equal(owned.siteId,original.siteId);assert.equal(owned.exteriorFloors,original.exteriorFloors);
  assert.equal(owned.x,original.x);assert.equal(owned.z,original.z);
  const name=next.district.businesses[id].name;next.district.week=50;
  assert.equal(frame(next).properties.find(p=>p.id===id)?.name,name);
  assert.ok(parseEmpireSave(JSON.stringify(next)));
 }
});

test('tall buildings stay purchase-only hotels or apartments, without construction replacing them',()=>{
 const towers=LAND_PLOTS.filter(p=>!p.vacant&&commercialArchitecture(p.id).tall);
 assert.ok(towers.length>10);
 for(const plot of towers)for(const week of [1,15,40]){
  const offer=siteOffer(plot,17,week);
  assert.equal(offer.mode,'purchase');assert.ok(['hotel','apartments'].includes(offer.kind));
  assert.equal(canConstruct(builtPropertyId(plot.id,'hotel')),false);
 }
 const plot=towers[0],offer=siteOffer(plot,17),e=fresh();
 assert.equal(Object.keys(acquire(e.district,offer.id,'leased').businesses).length,0);
 const owned=applyDistrictUpdate(e,s=>acquire(s,offer.id,'owned'),INITIAL_STATE);
 assert.equal(owned.district.businesses[offer.id]?.lodging?.openFloors,1);
 assert.equal(frame(owned).properties.find(p=>p.id===offer.id)?.exteriorFloors,offer.floors);
});

test('named local shops and the city petrol station stay outside the purchase and construction market',()=>{
 const scenery=LAND_PLOTS.filter(p=>siteOffer(p,17).mode==='scenery');
 assert.ok(scenery.length>=19);
 const petrol=scenery.find(p=>p.id===CITY_PETROL_SITE)!;assert.ok(petrol);
 assert.deepEqual(petrol.position,[75,0,75]);
 for(const plot of scenery){
  assert.ok(siteOffer(plot,17).name.length>4);
  assert.equal(canConstruct(builtPropertyId(plot.id,'shop')),false);
  assert.equal(Object.keys(acquire(fresh().district,`trading-${plot.id}-shop`,'owned').businesses).length,0);
 }
 const mall=frame(fresh()).properties.find(p=>p.id==='park')!;
 assert.equal(mall.kind,'plaza');assert.equal(mall.offer,'purchase');assert.equal(mall.exteriorFloors,5);
 assert.ok(propertyById('built-large-plaza'),'Old constructed mall identities remain readable');
 assert.equal(canConstruct('built-large-plaza'),false);
});
