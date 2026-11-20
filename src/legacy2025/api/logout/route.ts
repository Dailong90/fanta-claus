import { api, json, sameOrigin } from "@/lib/api";
import { SESSION_COOKIE_NAME } from "@/lib/session";
export const POST = api(async (req: Request) => {
  sameOrigin(req);
  const response = json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
});
