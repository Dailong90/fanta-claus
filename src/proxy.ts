import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig, authCookieOptions } from "@/lib/supabase/config";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (request.nextUrl.pathname.startsWith("/api/") && !/^\/api\/(auth\/|profile|edition|enrollment|session|logout|admin\/(edition|participants))/.test(request.nextUrl.pathname)) return response;
  const { url, key } = authConfig();
  const supabase = createServerClient(url, key, {
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: updates => {
        for (const { name, value } of updates) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of updates) response.cookies.set(name, value, options);
      },
    },
  });
  const { error } = await supabase.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError" && ![400, 401, 403].includes(error.status ?? 0)) return new NextResponse("Accesso temporaneamente non disponibile.", { status: 503, headers: { "Cache-Control": "private, no-store" } });
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };
