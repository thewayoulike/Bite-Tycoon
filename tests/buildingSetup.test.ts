import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {createFastTrackEmpire,applyDistrictUpdate,parseEmpireSave} from '../src/empire/empire';
import {acquire,propertyById,PROPERTIES} from '../src/prototype/expansionModel';
import {BUILDING_DESIGNS,cleanBusinessName,type BusinessSetup} from '../src/empire/buildingDesigns';
import {LAND_PLOTS,builtPropertyId,propertyLevel,acquisitionQuote} from '../src/empire/propertyMarket';
import {weeklyProfitLoss} from '../src/empire/weeklyFinance';
import {consolidatedBalance} from '../src/career/consolidation';
import {restaurantAppearance,urbanBuildingProfile} from '../src/graphics/propertyArchitecture';
import {restaurantShellGeometry} from '../src/components/RestaurantShell3D';
import {mallExteriorGeometry} from '../src/components/ShoppingPlaza3D';
import {openMallCompany} from '../src/career/mallCompanies';

const fresh=()=>createFastTrackEmpire(structuredClone(INITIAL_STATE));
const open=(e:ReturnType<typeof fresh>,id:string,setup:BusinessSetup,tenure:'owned'|'leased'='owned')=>applyDistrictUpdate(e,s=>acquire(s,id,tenure,Object.keys(s.businesses)[0],['restaurant','cafe'].includes(propertyById(id)?.kind??'')?'italian':undefined,40,setup),INITIAL_STATE);

test('every permitted land/building/design opens at Level 1 with its name, stock and correct capital',()=>{
 for(const plot of LAND_PLOTS.filter(p=>['large','commercial'].includes(p.id)))for(const kind of plot.kinds)for(const design of BUILDING_DESIGNS){
  const id=builtPropertyId(plot.id,kind),original=propertyById(id)!;let e=fresh();e.district.market!.level=propertyLevel(kind);
  e=open(e,id,{name:'  My   '+kind+'  ',design:design.id});const b=e.district.businesses[id],p=propertyById(id,b)!;
  assert.ok(b,id);assert.equal(b.name,'My '+kind);assert.equal(p.name,b.name);assert.equal(p.design,design.id);
  assert.equal(propertyById(id)!.name,original.name,'Shared definitions stay immutable');
  const quote=acquisitionQuote(original,'construction');assert.ok(quote.cost>quote.land);assert.equal(b.cash,250000-quote.cost);assert.ok(Math.abs(consolidatedBalance(e).difference)<.02);
  if(kind==='restaurant'){
   const r=e.restaurants[id];assert.equal(r.restaurantLevel,1);assert.ok(r.tables.length&&r.activeMenu.length);
   assert.deepEqual(restaurantAppearance(id,r,p),restaurantAppearance(id,{restaurantIdentity:r.restaurantIdentity},p),'Preview matches the built restaurant');
  }else {assert.ok(b.stockroom);assert.ok(b.crew?.length);}
  if(b.lodging){assert.equal(b.lodging.openFloors,1);assert.equal(b.venue!.units.length,kind==='hotel'?4:3);}
  if(b.plaza){assert.equal(b.plaza.openFloors,1);assert.equal(b.venue!.units.length,4);}
  assert.equal(weeklyProfitLoss(original,b,e.district,e.restaurants[id]).name,b.name);
  const saved=parseEmpireSave(JSON.stringify(e))!;assert.ok(saved);assert.equal(saved.district.businesses[id].design,design.id);assert.equal(saved.district.businesses[id].name,b.name);
 }
});

test('invalid setup, locked property types and repeated construction never charge the player',()=>{
 for(const setup of [{name:' '.repeat(5)},{name:'a'.repeat(49)},{name:42},{design:'unknown'}] as BusinessSetup[]){
  const e=fresh(),result=open(e,'built-commercial-restaurant',setup);assert.equal(result.district.market!.ownerCash,250000);assert.equal(Object.keys(result.district.businesses).length,0);
 }
 for(const kind of ['hotel','apartments','plaza'] as const){const e=open(fresh(),builtPropertyId('large',kind),{name:'Locked',design:'garden'});assert.equal(Object.keys(e.district.businesses).length,0);}
 const e=open(fresh(),'built-commercial-restaurant',{name:'The Corner',design:'modern'}),again=open(e,'built-commercial-shop',{name:'Replacement',design:'garden'});
 assert.deepEqual(again.district.businesses,e.district.businesses);assert.equal(again.district.loans.length,0);
 assert.equal(cleanBusinessName(' Maple\n &   Co. '),'Maple & Co.');
});

test('purchases and leases accept names, loans use those names, and old saves still load',()=>{
 let e=open(fresh(),'diner',{name:'Maple Kitchen'},'leased');assert.equal(e.district.businesses.diner.name,'Maple Kitchen');
 e=open(e,'cafe',{name:'Cedar Coffee'});assert.ok(e.district.businesses.cafe);assert.ok(e.district.businesses.diner.ledger.some(l=>l.label==='Loan to Cedar Coffee'));
 assert.ok(e.district.businesses.cafe.ledger.some(l=>l.label==='Loan from Maple Kitchen'));
 const raw=JSON.parse(JSON.stringify(e));delete raw.district.businesses.diner.name;assert.ok(parseEmpireSave(JSON.stringify(raw)));
 raw.district.businesses.diner.design='broken';assert.equal(parseEmpireSave(JSON.stringify(raw)),null);
 const invalid=open(fresh(),'diner',{name:'Not a rebuild',design:'garden'},'leased');assert.equal(Object.keys(invalid.district.businesses).length,0);
});

test('designs change actual geometry and architecture, without changing the usable footprint',()=>{
 const restaurantCounts=new Set<number>(),mallCounts=new Set<number>();
 for(const design of BUILDING_DESIGNS){
  const p={...PROPERTIES[0],design:design.id},r=restaurantShellGeometry(restaurantAppearance(p.id,undefined,p));
  restaurantCounts.add(r.front.getAttribute('position').count);Object.values(r).forEach(g=>g.dispose());
  const mall=mallExteriorGeometry(1,1,true,design.id);mallCounts.add(mall.glass.getAttribute('position').count+mall.frame.getAttribute('position').count);Object.values(mall).forEach(g=>g.dispose());
  const home=urbanBuildingProfile({...PROPERTIES[5],design:design.id},{floorsOverride:1});assert.equal(home.floors,1);assert.equal(home.style.wall,design.wall);assert.equal(home.modern,design.id==='modern');assert.equal(home.mansard,design.id==='heritage');assert.deepEqual(home.scale,[13.5/13.4,2.7/2.85,15/12.2]);
 }
 assert.equal(restaurantCounts.size,3);assert.equal(mallCounts.size,3);
});

test('a newly constructed named mall can open a company and preserve its accounts on reload',()=>{
 let e=fresh();e.district.market!.level=5;e=open(e,'built-large-plaza',{name:'Park Avenue Galleria',design:'modern'});
 e=applyDistrictUpdate(e,s=>openMallCompany(s,0,'cafe','cafe','built-large-plaza'),INITIAL_STATE);
 const child='mall-cafe-0@built-large-plaza';assert.ok(e.restaurants[child]);assert.equal(e.district.businesses[child].mallCompany!.parent,'built-large-plaza');
 assert.ok(parseEmpireSave(JSON.stringify(e)));assert.ok(Math.abs(consolidatedBalance(e).difference)<.02);
 assert.equal(propertyById('mall-shop-0@built-unknown-plaza'),undefined);
});

