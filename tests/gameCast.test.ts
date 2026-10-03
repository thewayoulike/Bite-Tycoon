import test from 'node:test';
import assert from 'node:assert/strict';
import { gameCastMember, diningCastId, streetCastId } from '../src/characters/gameCast';
import { CAST_BY_ID, STAFF } from '../src/people-preview/cast';
import { createResourcePool } from '../src/characters/resourcePool';
import { createLodgingLayout, lodgingWalkingPath, clearWalkingSegment } from '../src/empire/lodgingLayout';
import { lodgingActivity } from '../src/empire/lodgingActivities';

test('live game uses every approved identity with adult-led families and separate adult staff', () => {
  const adults = new Set<string>(), children = new Set<string>(), staff = new Set<string>();
  for (let seed = 0; seed < 1000; seed++) {
    for (let size = 1; size <= 4; size++) {
      const party = Array.from({ length: size }, (_, i) => diningCastId(seed, i, size));
      assert.equal(new Set(party).size, size);
      assert.equal(CAST_BY_ID.get(party[0])!.group, 'customers');
      for (const id of party) {
        const member = gameCastMember('customer', seed, id);
        assert.notEqual(member.group, 'staff');
        (member.group === 'children' ? children : adults).add(id);
      }
    }
    for (const role of new Set(STAFF.map(p => p.role))) {
      const member = gameCastMember(role, seed);
      assert.equal(member.group, 'staff'); assert.equal(member.role, role); assert.ok(member.ageYears >= 18); staff.add(member.id);
    }
    assert.equal(gameCastMember('manager', seed).group, 'staff');
    assert.equal(gameCastMember('customer', seed).id, gameCastMember('customer', seed).id);
  }
  assert.equal(adults.size, 50); assert.equal(children.size, 30); assert.equal(staff.size, 20);
  for (let i = 0; i < 20; i++) {
    const person = CAST_BY_ID.get(streetCastId(i))!;
    if (person.group === 'children') assert.equal(CAST_BY_ID.get(streetCastId(i - 1))!.group, 'customers');
  }
  assert.equal(gameCastMember('chef', 0, 'poppy').group, 'staff');
});

test('model loading shares requests, cancels unseen queued models and evicts only unused assets', async () => {
  const loads: string[] = [], disposed: string[] = [], finish = new Map<string, (s: string) => void>();
  const pool = createResourcePool<string>(key => { loads.push(key); return new Promise(resolve => finish.set(key, resolve)); }, key => disposed.push(key), 1, 1);
  const a = pool.acquire('a'), shared = pool.acquire('a'), abandoned = pool.acquire('abandoned'), b = pool.acquire('b');
  abandoned.release(); await Promise.resolve();
  assert.deepEqual(loads, ['a']); assert.equal(pool.stats().loading, 1);
  finish.get('a')!('a'); assert.equal(await a.promise, 'a'); assert.equal(await shared.promise, 'a');
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(loads, ['a', 'b']); assert.equal(await abandoned.promise, undefined);
  a.release(); a.release(); // Releases are idempotent.
  finish.get('b')!('b'); await b.promise; b.release();
  const c = pool.acquire('c'); await new Promise(resolve => setTimeout(resolve, 0));
  finish.get('c')!('c'); await c.promise; c.release();
  assert.deepEqual(disposed, ['b']); assert.equal(pool.stats().resident, 2);
  shared.release(); assert.deepEqual(disposed, ['b', 'c']); assert.equal(pool.stats().resident, 1);
});

test('every lodging type has a reachable daytime seat and nighttime bed without crossing other objects', () => {
  for (const kind of ['hotel', 'apartments'] as const) {
    const variants = kind === 'hotel' ? ['standard', 'double', 'family', 'suite'] : ['studio', 'onebed', 'twobed', 'penthouse'];
    for (const type of variants) {
      const layout = createLodgingLayout(kind, 1, Array(kind === 'hotel' ? 4 : 3).fill(type));
      for (const room of layout.rooms) for (const night of [false, true]) {
        const activity = lodgingActivity(layout, room, night);
        assert.ok(activity, `${kind} ${type} room ${room.index} ${night ? 'bed' : 'seat'} must be accessible`);
        assert.equal(activity.pose, night ? 'sleep' : 'sit');
        if (kind === 'apartments' && !night) assert.equal(layout.items.find(item => item.id === activity.furnitureId)!.kind, 'sofa', 'Residents can reach their living room sofa');
        const route = lodgingWalkingPath(layout, room.destination, activity.approach);
        assert.ok(route.length > 1);
        for (let i = 1; i < route.length; i++) assert.ok(clearWalkingSegment(layout, route[i - 1], route[i]));
        const onlyTargetRemoved = { ...layout, items: layout.items.filter(item => item.id !== activity.furnitureId) };
        assert.ok(clearWalkingSegment(onlyTargetRemoved, activity.approach, { x: activity.position[0], z: activity.position[2] }));
        const exitRoute = lodgingWalkingPath(layout, activity.approach, layout.elevator);
        assert.ok(exitRoute.length > 1, 'A resting guest can still check out');
      }
    }
  }
});
