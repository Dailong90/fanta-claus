import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { databaseConfig } from "@/lib/serverConfig";

let client: SupabaseClient | undefined;
// Lazy construction: builds never need production configuration or make DB calls.
const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    if (!client) {
      const { url, key } = databaseConfig();
      client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    }
    const value = Reflect.get(client, property);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export default supabaseAdmin;
