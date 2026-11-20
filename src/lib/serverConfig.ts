import "server-only";

export function sessionSecret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || !value.trim() || new TextEncoder().encode(value).length < 32) {
    throw new Error("SESSION_SECRET deve contenere almeno 32 byte.");
  }
  return new TextEncoder().encode(value);
}

export function databaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key?.trim()) throw new Error("Configurazione Supabase server incompleta.");
  const parsed = new URL(url);
  if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password ||
      (parsed.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname))) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL non valido.");
  }
  return { url, key };
}
