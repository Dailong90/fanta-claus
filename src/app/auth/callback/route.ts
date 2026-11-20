import { NextResponse } from "next/server";
import { userClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/supabase/config";
export async function GET(req: Request) {
  const url = new URL(req.url); const code = url.searchParams.get("code"); let success = false;
  if (code && code.length <= 2048 && !url.searchParams.has("next")) {
    const client = await userClient(true); const { error } = await client.auth.exchangeCodeForSession(code); success = !error;
  }
  const response = NextResponse.redirect(`${appOrigin()}${success ? "/profilo" : "/login?error=invalid_link"}`, 303);
  response.headers.set("Cache-Control", "private, no-store"); response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
