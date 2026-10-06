import test from 'node:test';
import assert from 'node:assert/strict';
import {decideSave, leaderAction, readLeaderLock} from '../src/empire/sessionGuard';

test('a readable save stays on its own key', () => {
  const decision = decideSave('{"ok":true}', '{"play":true}', raw => raw && raw.includes('"ok"') ? {ok: true} : null);
  assert.equal(decision.keepPrimary, false);
  assert.equal(decision.writeKey, 'primary');
  assert.deepEqual(decision.value, {ok: true});
});

test('an unreadable save is kept and play continues on the side slot', () => {
  const decision = decideSave('{broken', '{"play":true}', raw => raw && raw.includes('"play"') ? {play: true} : null);
  assert.equal(decision.keepPrimary, true);
  assert.equal(decision.writeKey, 'play');
  assert.deepEqual(decision.value, {play: true});
  assert.equal(decideSave('{broken', null, () => null).value, null);
});

test('one tab holds the save until it hides or its heartbeat goes stale', () => {
  assert.equal(leaderAction(null, 'a', 1_000, false), 'claim');
  assert.equal(leaderAction({id: 'a', at: 1_000}, 'a', 1_500, false), 'hold');
  assert.equal(leaderAction({id: 'a', at: 1_000}, 'b', 2_000, false), 'yield');
  assert.equal(leaderAction({id: 'a', at: 1_000}, 'b', 4_000, false), 'claim');
  assert.equal(leaderAction({id: 'a', at: 1_000}, 'a', 1_200, true), 'yield');
  assert.deepEqual(readLeaderLock('{"id":"a","at":5}'), {id: 'a', at: 5});
  assert.equal(readLeaderLock('{nope'), null);
});
