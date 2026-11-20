import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { authConfig, authCookieOptions } from "./config";
export async function userClient(writeCookies = false) {
  const jar = await cookies();
  const { url, key } = authConfig();
  return createServerClient(url, key, {
    db: { schema: "fc_api" }, cookieOptions: authCookieOptions(),
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    cookies: {
      getAll: () => jar.getAll(),
      setAll: updates => {
        // Server Components cannot write cookies; proxy refreshes them first.
        try { for (const { name, value, options } of updates) jar.set(name, value, options); }
        catch (error) { if (writeCookies) throw error; }
      },
    },
  });
}
