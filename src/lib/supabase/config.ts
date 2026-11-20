// Shared with Next's proxy. Contains no privileged keys.
export function authConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key?.trim()) throw new Error("Configurazione Supabase Auth incompleta.");
  if (key.startsWith("sb_secret_")) throw new Error("Auth richiede una chiave pubblica.");
  if (key.split(".").length === 3) {
    let payload: unknown;
    try { payload = JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); } catch { throw new Error("Chiave pubblica non valida."); }
    if (typeof payload !== "object" || payload === null || !("role" in payload) || payload.role !== "anon") throw new Error("Auth richiede una chiave pubblica.");
  }
  const parsed = new URL(url);
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/" ||
    (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)))) throw new Error("URL Supabase non valido.");
  return { url: parsed.origin, key };
}
export function appOrigin() {
  const value = process.env.APP_ORIGIN;
  if (!value) throw new Error("APP_ORIGIN mancante.");
  const parsed = new URL(value);
  if (parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/" ||
    (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)))) throw new Error("APP_ORIGIN non valido.");
  return parsed.origin;
}
export const authCookieOptions = () => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" });
