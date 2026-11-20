import { createHash } from "node:crypto";
// Transitional, bounded per-process protection; not a distributed rate limiter.
const codes = new Map<string, { count: number; until: number }>();
let windowStart = 0;
let total = 0;
export function allowLogin(code: string, now = Date.now()): boolean {
  if (now >= windowStart + 60_000) { total = 0; windowStart = now; }
  total += 1;
  if (total > 120) return false;
  for (const [key, entry] of codes) if (now >= entry.until) codes.delete(key);
  const key = createHash("sha256").update(code).digest("hex");
  const entry = codes.get(key) ?? { count: 0, until: now + 60_000 };
  entry.count += 1;
  if (codes.size >= 1000 && !codes.has(key)) return false;
  codes.set(key, entry);
  return entry.count <= 10;
}
