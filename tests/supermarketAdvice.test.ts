import test from 'node:test';
import assert from 'node:assert/strict';
import {INITIAL_STATE} from '../src/hooks/useGameLoop';
import {createEmpire, unlockTestDistrict} from '../src/empire/empire';
import {supermarketLossAdvice} from '../src/empire/supermarketAdvice';
import {startStoreWeek, STORE_LOSS_LABELS} from '../src/empire/supermarket';

const fresh = () => unlockTestDistrict(createEmpire(structuredClone(INITIAL_STATE)), INITIAL_STATE).district.businesses.shop;

test('recorded losses show prevention advice without changing money, stock or history', () => {
  const b = fresh();
  b.retail!.store!.losses = {cold: 8, crowded: 7, closing: 4};
  b.venue!.week.lost = 19;
  b.retail!.store!.events = [{id: 1, kind: 'fridge', title: 'Fault', day: 1, until: 2}];
  const before = structuredClone(b);
  const tips = supermarketLossAdvice(b);
  assert.deepEqual(tips.map(t => [t.reason, t.count]), [['cold', 8], ['crowded', 7], ['closing', 4]]);
  assert.match(tips[0].tip, /Repair it.*\$60/);
  assert.match(tips[1].tip, /Repair the open refrigerator fault first/);
  assert.match(tips[2].tip, /Before reopening/);
  assert.deepEqual(b, before);
});

test('a repaired fault keeps historical departures but no longer asks for another repair', () => {
  const b = fresh();
  b.retail!.store!.losses = {cold: 8};
  b.venue!.week.lost = 8;
  b.retail!.store!.events = [{id: 1, kind: 'fridge', title: 'Fault', day: 1, until: 2, resolved: 'Repaired'}];
  const tip = supermarketLossAdvice(b)[0];
  assert.equal(tip.count, 8);
  assert.match(tip.tip, /No refrigeration fault is open now/);
  assert.doesNotMatch(tip.tip, /^Repair it/);
});

test('checkout and receiving advice respect level unlocks and hired staff', () => {
  const b = fresh();
  b.retail!.store!.losses = {checkout: 2, receiving: 1};
  b.venue!.week.lost = 3;
  b.retail!.store!.level = 1;
  b.hires = {};
  let tips = supermarketLossAdvice(b);
  assert.match(tips[0].tip, /Level 3 adds/);
  assert.match(tips[1].tip, /becomes available at Level 3/);
  b.retail!.store!.level = 3;
  tips = supermarketLossAdvice(b);
  assert.match(tips[0].tip, /second ground-floor checkout is built/);
  assert.doesNotMatch(tips[1].tip, /becomes available/);
  b.hires.service = 1;
  assert.match(supermarketLossAdvice(b)[0].tip, /Keep both ground-floor cashiers on duty/);
});

test('all tracked reasons have a management destination and old unknown losses are not diagnosed', () => {
  const b = fresh();
  b.retail!.store!.losses = Object.fromEntries(Object.keys(STORE_LOSS_LABELS).map(id => [id, 1]));
  b.venue!.week.lost = 11;
  const tips = supermarketLossAdvice(b);
  assert.equal(tips.length, 9);
  assert.ok(tips.every(t => ['run', 'staff', 'inventory', 'upgrades'].includes(t.action) && t.tip && t.actionLabel));
  assert.equal(tips.at(-1)!.count, 3);
  assert.match(tips.at(-1)!.cause, /did not record why/);
  b.retail!.store!.losses = undefined;
  assert.equal(supermarketLossAdvice(b)[0].reason, 'unknown');
});

test('no warning remains when the next trading week clears the loss counts', () => {
  let b = fresh();
  b.retail!.store!.losses = {closing: 4};
  b.venue!.week.lost = 4;
  const nextWeek = b.retail!.store!.week + 1;
  b = startStoreWeek(b, nextWeek);
  b.venue!.week.lost = 0;
  assert.deepEqual(supermarketLossAdvice(b), []);
});
