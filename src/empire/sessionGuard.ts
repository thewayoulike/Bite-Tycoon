/** One visible tab plays and saves. A save this version cannot read stays on its original key. */

export const LEADER_LEASE_MS = 2500;
export const LEADER_HEARTBEAT_MS = 1000;

export type LeaderLock = { id: string; at: number };
export type LeaderAction = 'hold' | 'claim' | 'yield';

export function readLeaderLock(raw: string | null): LeaderLock | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as LeaderLock;
    if (!value || typeof value.id !== 'string' || !Number.isFinite(value.at)) return null;
    return { id: value.id, at: value.at };
  } catch {
    return null;
  }
}

/** Hidden tabs yield. A fresh lock from another tab yields. Our own lock is held until the heartbeat is due. */
export function leaderAction(lock: LeaderLock | null, tabId: string, now: number, hidden: boolean): LeaderAction {
  if (hidden) return 'yield';
  if (lock && lock.id !== tabId && now - lock.at < LEADER_LEASE_MS) return 'yield';
  if (lock && lock.id === tabId && now - lock.at < LEADER_HEARTBEAT_MS) return 'hold';
  return 'claim';
}

export type SaveDecision<T> = { value: T | null; writeKey: 'primary' | 'play'; keepPrimary: boolean };

/** A readable primary save wins. An unreadable primary is kept, and play continues on the side key. */
export function decideSave<T>(primaryRaw: string | null, playRaw: string | null, parse: (raw: string | null) => T | null): SaveDecision<T> {
  const primary = parse(primaryRaw);
  if (primary) return { value: primary, writeKey: 'primary', keepPrimary: false };
  if (primaryRaw) return { value: parse(playRaw), writeKey: 'play', keepPrimary: true };
  return { value: null, writeKey: 'primary', keepPrimary: false };
}
