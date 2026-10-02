/** On-demand resources: share concurrent requests, bound loading and evict idle assets. */
export function createResourcePool<T>(load: (key: string) => Promise<T>, dispose: (value: T) => void, concurrency = 2, idleLimit = 6) {
  type Entry = { key: string; refs: number; touched: number; state: 'queued' | 'loading' | 'ready'; value?: T; promise: Promise<T | undefined>; resolve: (value: T | undefined) => void; reject: (error: unknown) => void };
  const entries = new Map<string, Entry>();
  let running = 0, clock = 0;
  function trim() {
    const idle = [...entries.values()].filter(e => !e.refs && e.state === 'ready').sort((a, b) => a.touched - b.touched);
    while (idle.length > idleLimit) {
      const e = idle.shift()!;
      entries.delete(e.key); dispose(e.value!);
    }
  }
  function pump() {
    for (const e of entries.values()) {
      if (running >= concurrency) break;
      if (e.state !== 'queued' || !e.refs) continue;
      e.state = 'loading'; running++;
      Promise.resolve().then(() => load(e.key)).then(value => {
        e.value = value; e.state = 'ready'; e.touched = ++clock; e.resolve(value); trim();
      }, error => { entries.delete(e.key); e.reject(error); }).finally(() => { running--; pump(); });
    }
  }
  return {
    acquire(key: string) {
      let e = entries.get(key);
      if (!e) {
        let resolve!: Entry['resolve'], reject!: Entry['reject'];
        const promise = new Promise<T | undefined>((yes, no) => { resolve = yes; reject = no; });
        e = { key, refs: 0, touched: ++clock, state: 'queued', promise, resolve, reject };
        entries.set(key, e);
      }
      e.refs++; e.touched = ++clock; pump();
      const entry = e;
      let released = false;
      return { promise: entry.promise, release() {
        if (released) return;
        released = true; entry.refs--; entry.touched = ++clock;
        if (!entry.refs && entry.state === 'queued') { entries.delete(entry.key); entry.resolve(undefined); }
        trim();
      } };
    },
    stats() { return { resident: [...entries.values()].filter(e => e.state === 'ready').length, active: [...entries.values()].filter(e => e.refs > 0).length, loading: running, queued: [...entries.values()].filter(e => e.state === 'queued').length }; },
  };
}
