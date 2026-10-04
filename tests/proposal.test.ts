import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {toggleMenuRecipe} from '../src/gameplay';
import {createProposalSample,proposalVersion} from '../src/proposal/sample';
import {DEFAULT_RESTAURANT_TYPES,RESTAURANT_TYPES,restaurantCatalog} from '../src/proposal/restaurantCatalogs';

test('proposal capacity expands menus while the default game still stops at six',()=>{
  const state=structuredClone(INITIAL_STATE);
  state.recipes=state.recipes.map(r=>({...r,unlocked:true}));
  state.activeMenu=state.recipes.slice(0,6).map(r=>r.id);
  const extra=state.recipes[6].id;
  assert.equal(toggleMenuRecipe(state,extra),state);
  let preview=toggleMenuRecipe(state,extra,24);
  assert.equal(preview.activeMenu.length,7);
  for(const recipe of preview.recipes.slice(7,24))preview=toggleMenuRecipe(preview,recipe.id,24);
  assert.equal(preview.activeMenu.length,24);
  assert.equal(toggleMenuRecipe(preview,preview.recipes[24].id,24),preview);
  assert.equal(state.activeMenu.length,6);
});

test('expanded sample has the real property floors and does not mutate the starter',()=>{
  const before=structuredClone(INITIAL_STATE),sample=createProposalSample(6,{...DEFAULT_RESTAURANT_TYPES,diner:'italian'});
  assert.deepEqual(INITIAL_STATE,before);
  assert.equal(sample.speed,0);
  assert.equal(Object.keys(sample.district.businesses).length,7);
  const b=sample.district.businesses;
  assert.equal(b.hotel.lodging?.openFloors,5);
  assert.equal(b.hotel.venue?.units.length,20);
  assert.equal(b.apartments.lodging?.openFloors,10);
  assert.equal(b.apartments.venue?.units.length,30);
  assert.equal(b.park.plaza?.openFloors,5);
  assert.equal(b.park.venue?.units.length,20);
  assert.equal(b.shop.retail?.shelves.length,36);
  assert.ok(sample.restaurants.diner.recipes.some(r=>r.name==='Margherita pizza'&&sample.restaurants.diner.activeMenu.includes(r.id)));
  assert.ok(sample.restaurants.cafe.recipes.some(r=>r.name==='Espresso'));
  assert.ok(!sample.restaurants.cafe.recipes.some(r=>r.name==='Margherita pizza'));
  assert.ok(b.hotel.venue!.units.every(u=>!['studio','onebed','twobed'].includes(u.type!)));
  assert.ok(b.apartments.venue!.units.every(u=>!['standard','double','suite'].includes(u.type!)));
  const beforeVersion=proposalVersion(sample,false),afterVersion=proposalVersion(sample,true);
  assert.equal(beforeVersion.restaurants.diner.activeMenu.length,6);
  assert.equal(beforeVersion.restaurants.diner.recipes.length,116);
  assert.equal(afterVersion.restaurants.diner.recipes.length,30);
  assert.ok(afterVersion.restaurants.diner.activeMenu.length>6);
  assert.equal(beforeVersion.restaurants.diner.money,afterVersion.restaurants.diner.money);
  assert.deepEqual(beforeVersion.district,afterVersion.district);
  beforeVersion.district.businesses.diner.cash-=100;
  assert.notEqual(beforeVersion.district.businesses.diner.cash,sample.district.businesses.diner.cash);
});

test('restaurant types have distinct complete catalogs and matching ingredient ranges',()=>{
  const seen=new Set<string>();
  for(const type of RESTAURANT_TYPES){
    const profile=restaurantCatalog(type.id);
    assert.equal(profile.recipes.length,30);
    for(const recipe of profile.recipes){
      assert.ok(!seen.has(recipe.name),`${recipe.name} is copied across types`);
      seen.add(recipe.name);
      assert.ok(recipe.basePrice>0&&Number.isFinite(recipe.basePrice));
      assert.ok(Object.keys(recipe.ingredients).every(id=>profile.ingredientIds.includes(id)));
    }
  }
  assert.ok(!restaurantCatalog('cafe').ingredientIds.includes('beef'));
  assert.ok(restaurantCatalog('italian').ingredientIds.includes('pasta'));
  assert.ok(!restaurantCatalog('diner').ingredientIds.includes('pasta'));
});

test('opening sample keeps upper floors closed and cash independent',()=>{
  const sample=createProposalSample(1),b=sample.district.businesses;
  assert.equal(b.hotel.lodging?.openFloors,1);
  assert.equal(b.apartments.lodging?.openFloors,1);
  assert.equal(b.park.plaza?.openFloors,1);
  assert.equal(b.shop.retail?.electronicsUnlocked,false);
  const hotelCash=b.hotel.cash;b.diner.cash-=100;
  assert.equal(b.hotel.cash,hotelCash);
});
