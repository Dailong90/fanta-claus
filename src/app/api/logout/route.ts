import { cookies } from "next/headers";
import { api, ApiError, json, sameOrigin } from "@/lib/api";
import { userClient } from "@/lib/supabase/server";
export const POST = api(async (req: Request) => {
  sameOrigin(req);
  const client = await userClient(true); const { error } = await client.auth.signOut({ scope: "local" });
  if (error) throw new ApiError(503, "Logout non riuscito. Riprova.");
  (await cookies()).set("fanta_session", "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return json({ ok: true });
});
