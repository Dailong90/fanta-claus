import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { FakeDb } from "./fakeDb";
const context = vi.hoisted(() => ({ jar: new Map<string, string>(), db: null as unknown as FakeDb }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (key: string) => { const value = context.jar.get(key); return value ? { value } : undefined; } }) }));
vi.mock("@/lib/supabaseAdmin", () => ({ default: { from: (table: string) => context.db.from(table) } }));
import { createSessionCookie, getSessionFromCookies, SESSION_COOKIE_NAME } from "@/lib/session";
import { POST as login } from "@/legacy2025/api/login/route";
import { POST as logout } from "@/legacy2025/api/logout/route";
import { GET as session } from "@/legacy2025/api/session/route";
import { databaseConfig, sessionSecret } from "@/lib/serverConfig";
beforeEach(() => { context.jar.clear(); context.db = new FakeDb(); context.db.reset(); });
const request = (body: unknown) => new Request("https://game.test/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
describe("legacy session boundary", () => {
  it("signs and verifies only the owner claim with correct cookie flags", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const cookie = await createSessionCookie("a");
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 2592000 });
    context.jar.set(SESSION_COOKIE_NAME, cookie.value);
    expect(await getSessionFromCookies()).toEqual({ ownerId: "a" });
  });
  it("rejects tampered, expired, wrong algorithm and malformed owner tokens", async () => {
    const valid = await createSessionCookie("a");
    const secret = sessionSecret();
    const invalid = [valid.value.slice(0, -6) + "broken", "bad", await new SignJWT({ ownerId: "a" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime(1).sign(secret), await new SignJWT({ ownerId: "a" }).setProtectedHeader({ alg: "HS384" }).setExpirationTime("1h").sign(secret), await new SignJWT({ ownerId: 12 }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(secret)];
    for (const token of invalid) { context.jar.set(SESSION_COOKIE_NAME, token); expect(await getSessionFromCookies()).toBeNull(); }
  });
  it("fails explicitly for missing or short secrets and invalid database configuration", async () => {
    vi.stubEnv("SESSION_SECRET", ""); expect(() => sessionSecret()).toThrow(/SESSION_SECRET/);
    vi.stubEnv("SESSION_SECRET", "short"); await expect(createSessionCookie("a")).rejects.toThrow(/SESSION_SECRET/);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", ""); expect(() => databaseConfig()).toThrow();
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-placeholder");
    for (const url of ["not-a-url", "http://remote.test", "https://user:password@remote.test"]) { vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url); expect(() => databaseConfig()).toThrow(); }
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:9"); expect(databaseConfig().url).toBe("http://127.0.0.1:9");
    vi.stubEnv("SUPABASE_URL", "http://localhost:9999"); expect(databaseConfig().url).toBe("http://localhost:9999");
  });
});
it("logs in with a normalized code, uses the cookie as identity, and logs out", async () => {
  const response = await login(request({ code: " codea " })); expect(response.status).toBe(200);
  const value = response.headers.get("set-cookie")?.split(";")[0].split("=").slice(1).join("="); expect(value).toBeTruthy();
  expect(await response.json()).toEqual({ ok: true });
  context.jar.set(SESSION_COOKIE_NAME, value!);
  expect(await (await session()).json()).toEqual({ player: { ownerId: "a", name: "A", isAdmin: false } });
  const out = await logout(new Request("https://game.test/api/logout", { method: "POST" }));
  expect(out.status).toBe(200); expect(out.headers.get("set-cookie")).toMatch(/Max-Age=0/i);
  context.jar.clear(); expect(await getSessionFromCookies()).toBeNull();
  expect(await (await session()).json()).toEqual({ player: null });
  expect(context.db.writes).toHaveLength(0);
});
it.each([null, [], {}, { code: 123 }, { code: "" }, { code: "x".repeat(11) }, { code: "CODEA", isAdmin: true }])("rejects invalid login %j before querying credentials", async body => {
  expect((await login(request(body))).status).toBe(400); expect(context.db.calls).toHaveLength(0);
});
it("returns a generic denial for an unknown code and refuses cross-site logout", async () => {
  expect((await login(request({ code: "UNKNOWN" }))).status).toBe(401);
  expect((await logout(new Request("https://game.test/api/logout", { method: "POST", headers: { Origin: "https://evil.test" } }))).status).toBe(403);
});
it("limits repeated codes, restores after the window, and caps rotating codes", async () => {
  vi.resetModules(); const { allowLogin } = await import("@/lib/loginLimiter");
  const now = 1_000_000;
  for (let count = 0; count < 10; count++) expect(allowLogin("FAKE", now)).toBe(true);
  expect(allowLogin("FAKE", now)).toBe(false); expect(allowLogin("FAKE", now + 60_000)).toBe(true);
  for (let count = 0; count < 119; count++) allowLogin(`other-${count}`, now + 60_000);
  expect(allowLogin("rotated", now + 60_000)).toBe(false);
});

it("returns 429 with a retry window before additional credential queries", async () => {
  let response: Response | undefined;
  for (let count = 0; count < 11; count++) response = await login(request({ code: "SPAMCODE" }));
  expect(response?.status).toBe(429); expect(response?.headers.get("retry-after")).toBe("60");
  expect(context.db.calls).toHaveLength(10);
});
