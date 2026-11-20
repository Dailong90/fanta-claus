// Process-local coordination only. DB transactions/version columns are still needed
// across server instances; this is deliberately not presented as a DB lock.
const pending = new Map<string, Promise<unknown>>();
export async function withWriteLock<T>(key: string, action: () => Promise<T>): Promise<T> {
  const previous = pending.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(action);
  pending.set(key, next);
  try { return await next; }
  finally { if (pending.get(key) === next) pending.delete(key); }
}
