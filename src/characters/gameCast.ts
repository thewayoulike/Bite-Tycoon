import { CAST_BY_ID, CHILDREN, CUSTOMERS, STAFF } from '../people-preview/cast';
import type { PersonRole } from './castRig';

export type GameCharacterRole = PersonRole | 'manager';
export function characterSeed(value: string | number): number {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.abs(Math.trunc(value)) : 0;
  let hash = 2166136261;
  for (const letter of value) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619);
  return hash >>> 0;
}

/** Identity belongs to the person, not their current job action, floor or pose. */
export function gameCastMember(role: GameCharacterRole = 'customer', seed = 0, castId?: string) {
  const requested = castId && CAST_BY_ID.get(castId);
  if (requested && (role === 'customer' ? requested.group !== 'staff' : requested.group === 'staff')) return requested;
  const staffRole = role === 'manager' ? 'receptionist' : role;
  const pool = role === 'customer' ? CUSTOMERS : STAFF.filter(member => member.role === staffRole);
  return pool[characterSeed(seed) % pool.length];
}

/** Families keep an adult at the head of the party; no repeated faces at a table. */
export function diningCastId(seed: number, member: number, partySize: number) {
  const key = characterSeed(seed);
  const child = partySize > 1 && key % 5 < 2 && member >= Math.ceil(partySize / 2);
  const pool = child ? CHILDREN : CUSTOMERS;
  return pool[(Math.floor(child ? key / 5 : key) + member * 17) % pool.length].id;
}

export function streetCastId(index: number) {
  const pool = index % 4 === 3 ? CHILDREN : CUSTOMERS;
  return pool[(index * 7 + 3) % pool.length].id;
}
