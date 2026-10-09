import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE,advanceGame} from '../src/hooks/useGameLoop';
import {createFastTrackEmpire,applyDistrictUpdate,parseEmpireSave,startEmpireWeek,advanceEmpire,updateRestaurant} from '../src/empire/empire';
import {acquire,propertyById} from '../src/prototype/expansionModel';
import {LAND_PLOTS,siteOffer,acquisitionQuote,showPropertyLabel,builtPropertyId} from '../src/empire/propertyMarket';
import {careerMilestones} from '../src/career/settings';
import {expansionFunding} from '../src/empire/expansionFunding';
import {consolidatedBalance} from '../src/career/consolidation';
const fresh=()=>{const e=createFastTrackEmpire(structuredClone(INITIAL_STATE));e.district.market!.listingSeed=17;return e;};
const offers=()=>LAND_PLOTS.map(p=>({plot:p,...siteOffer(p,17)}));
function open(e:ReturnType<typeof fresh>,id:string,tenure:'owned'|'leased',from=Object.keys(e.district.businesses)[0]){
 return applyDistrictUpdate(e,s=>acquire(s,id,tenure,from,propertyById(id)!.kind==='restaurant'?'italian':undefined),INITIAL_STATE);
}
test('market offers vary by career but are stable across reloads and include empty lease units and operating businesses',()=>{
 const market=offers();for(const mode of ['land','lease','purchase'])assert.ok(market.filter(o=>o.mode===mode).length>=10);
 for(const kind of ['shop','restaurant'])for(const mode of ['lease','purchase'])assert.ok(market.some(o=>o.mode===mode&&o.kind===kind));
 assert.deepEqual(market,offers());assert.ok(LAND_PLOTS.some(p=>siteOffer(p,17).id!==siteOffer(p,18).id));
 const e=fresh();assert.deepEqual(parseEmpireSave(JSON.stringify(e))!.district.market,e.district.market);
});
test('leased empty units charge setup once, include actual opening stock and staff, and reload with their own account',()=>{
 for(const kind of ['shop','restaurant']){
  const offer=offers().find(o=>o.mode==='lease'&&o.kind===kind)!,p=propertyById(offer.id)!,quote=acquisitionQuote(p,'lease');
  const e=open(fresh(),p.id,'leased'),b=e.district.businesses[p.id];
  assert.equal(b.cash,250000-quote.cost);assert.equal(quote.leaseEntry+quote.fitOut,quote.cost);assert.equal(quote.land,0);
  assert.equal(b.leaseTerms!.weeklyRent,quote.weeklyRent);assert.equal(b.leaseTerms!.nextPaymentWeek,4);
  assert.equal(e.district.market!.parcels[offer.plot.id],p.id);assert.ok(b.crew!.length>=2);
  if(kind==='restaurant'){assert.equal(e.restaurants[p.id].restaurantType,'italian');assert.ok(e.restaurants[p.id].activeMenu.length);assert.ok(Object.values(e.restaurants[p.id].inventory).some(n=>n>0));}
  else assert.ok(b.retail!.shelves.every(id=>b.retail!.stock[id]>0));
  assert.ok(parseEmpireSave(JSON.stringify(e)));assert.equal(open(e,p.id,'leased').district.businesses[p.id].cash,b.cash);
  assert.ok(Math.abs(consolidatedBalance(e).difference)<.02);
  const duplicate=open(e,builtPropertyId(offer.plot.id,'shop'),'owned');assert.equal(Object.keys(duplicate.district.businesses).length,1);
 }
});
test('buying an operating business transfers land, building and opening kit, with no inherited sales or debt',()=>{
 for(const kind of ['shop','restaurant']){
  const offer=offers().find(o=>o.mode==='purchase'&&o.kind===kind)!,p=propertyById(offer.id)!,q=acquisitionQuote(p,'purchase');
  const e=open(fresh(),p.id,'owned'),b=e.district.businesses[p.id];
  assert.equal(b.cash,250000-q.cost);assert.ok(b.acquisition!.land>0);assert.equal(q.land+q.building,q.cost);assert.equal(b.tenure,'owned');assert.equal(b.leaseTerms,undefined);assert.equal(e.district.loans.length,0);
  assert.equal(e.restaurants[p.id]?.stats.totalEarned??b.venue!.totalRevenue,0);assert.ok(parseEmpireSave(JSON.stringify(e)));assert.ok(Math.abs(consolidatedBalance(e).difference)<.02);
 }
});
test('offers cannot be bought under the wrong terms or fabricated from another career',()=>{
 for(const mode of ['lease','purchase'] as const){const o=offers().find(v=>v.mode===mode)!;assert.equal(Object.keys(open(fresh(),o.id,mode==='lease'?'owned':'leased').district.businesses).length,0);}
 const fabricated=offers().find(o=>o.mode==='lease')!;const e=fresh();e.district.market!.listingSeed=18;
 if(siteOffer(fabricated.plot,18).id!==fabricated.id)assert.equal(Object.keys(open(e,fabricated.id,'leased').district.businesses).length,0);
});
test('journey works before acquisition and for supermarket, remote restaurant and existing saves without a diner',()=>{
 assert.equal(careerMilestones(fresh())[0].done,false);
 for(const o of offers().filter(o=>o.mode==='lease').slice(0,6)){
  const e=open(fresh(),o.id,'leased'),goals=careerMilestones(e);assert.equal(e.restaurants.diner,undefined);
  for(const id of ['acquire','range','stock','team'])assert.equal(goals.find(g=>g.id===id)!.done,true,id);
  assert.equal(goals.find(g=>!g.done)!.id,'trade');assert.ok(!goals.some(g=>g.title.includes('Hire your first')));
 }
});
test('expansion cannot drain protected wages, stock and rent or create a phantom loan',()=>{
 const lender=offers().find(o=>o.mode==='lease'&&o.kind==='restaurant')!,borrower=offers().find(o=>o.mode==='lease'&&o.kind==='shop')!;
 let e=open(fresh(),lender.id,'leased');const q=acquisitionQuote(propertyById(borrower.id)!,'lease'),total=q.cost+q.workingCash;
 e=updateRestaurant(e,lender.id,r=>({...r,money:total+10,pendingPayroll:[{amount:500,week:1,dueWeek:2}]}));
 const before=e,blocked=open(e,borrower.id,'leased'),funds=expansionFunding(e.district,lender.id,e.restaurants[lender.id]);
 assert.ok(funds.reserve>500);assert.ok(funds.available<total);assert.equal(blocked.district.businesses[borrower.id],undefined);assert.equal(blocked.district.loans.length,0);assert.equal(blocked.restaurants[lender.id].money,before.restaurants[lender.id].money);assert.match(blocked.district.notice,/Available to lend/);
 e=updateRestaurant(e,lender.id,r=>({...r,money:total+funds.reserve+100}));const success=open(e,borrower.id,'leased');
 assert.equal(success.district.businesses[borrower.id].cash,5000);assert.equal(success.district.loans[0].principal,total);assert.equal(success.district.loans[0].to,borrower.id);
 assert.ok(parseEmpireSave(JSON.stringify(success)));assert.equal(careerMilestones(success).find(g=>g.id==='second')!.done,true);
});
test('a remote supermarket trades and closes a week, with its guide advancing to the weekly review',()=>{
 const o=offers().find(o=>o.mode==='purchase'&&o.kind==='shop')!;let e=startEmpireWeek(open(fresh(),o.id,'owned'));
 for(let n=0;n<400&&e.district.week===1;n++)e=advanceEmpire(e,.5,advanceGame);
 assert.equal(e.district.week,2);assert.ok(e.district.closedWeek!.reports.some(r=>r.id===o.id));assert.ok(e.district.businesses[o.id].venue!.totalRevenue>0);
 assert.equal(careerMilestones(e).find(g=>g.id==='review')!.done,true);assert.ok(parseEmpireSave(JSON.stringify(e)));
});
test('modern map hides old unowned property tags, while owned and selected buildings remain identifiable',()=>{
 assert.equal(showPropertyLabel(true,false,true,false),false);assert.equal(showPropertyLabel(true,true,true,false),true);
 assert.equal(showPropertyLabel(true,false,true,true),true);assert.equal(showPropertyLabel(false,false,true,false),true);
});
