import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ user: null as { id: string; email: string; email_confirmed_at: string | null } | null, userError: null as { name: string; status?: number } | null,
  account: { userId: "a", email: "a@example.test", profile: { firstName: "A", lastName: "Fixture", avatarId: "santa" }, isAdmin: false, participating: false },
  edition: { editionId: 2026, active: false, registrationsOpen: false, closesAt: null, locked: false }, rpc: vi.fn(), signIn: vi.fn(), verify: vi.fn(), exchange: vi.fn(), signOut: vi.fn(), setCookie: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ userClient: async () => ({ auth: { getUser: async () => ({ data: { user: state.user }, error: state.userError }), signInWithOtp: state.signIn, verifyOtp: state.verify, exchangeCodeForSession: state.exchange, signOut: state.signOut }, rpc: state.rpc }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: state.setCookie }) }));
import * as profile from "@/app/api/profile/route";
import * as enrollment from "@/app/api/enrollment/route";
import * as admin from "@/app/api/admin/edition/route";
import * as participants from "@/app/api/admin/participants/route";
import * as magic from "@/app/api/auth/magic-link/route";
import * as confirm from "@/app/api/auth/confirm/route";
import * as callback from "@/app/auth/callback/route";
import * as logout from "@/app/api/logout/route";
import * as session from "@/app/api/session/route";
import { currentAccount } from "@/lib/auth";
import { appOrigin, authConfig, authCookieOptions } from "@/lib/supabase/config";
import { retiredLegacyRoute } from "@/lib/retiredLegacy";
const request = (path: string, body: unknown, method = "POST", headers = {}) => new Request(`https://game.test/${path}`, { method, headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
beforeEach(() => {
  state.user = null; state.userError = null; state.account.isAdmin = false; state.account.userId = "a"; state.edition = { editionId: 2026, active: false, registrationsOpen: false, closesAt: null, locked: false };
  state.signIn.mockReset().mockResolvedValue({ error: null }); state.verify.mockReset().mockResolvedValue({ error: null }); state.exchange.mockReset().mockResolvedValue({ error: null }); state.signOut.mockReset().mockResolvedValue({ error: null }); state.setCookie.mockReset();
  state.rpc.mockReset().mockImplementation(async (name: string) => ({ data: ["edition_status", "admin_registration", "activate_current_edition", "configure_registration"].includes(name) ? state.edition : state.account, error: null }));
});
function login(admin = false) { state.user = { id: "a", email: "a@example.test", email_confirmed_at: "2026-11-20" }; state.account.isAdmin = admin; }
it("never accepts a legacy cookie or caller identity as a Supabase session", async () => {
  expect((await profile.GET()).status).toBe(401); expect(await (await session.GET()).json()).toEqual({ player: null });
  expect((await profile.PATCH(request("api/profile", { avatarId: "elf", userId: "b", isAdmin: true }))).status).toBe(401); expect(state.rpc).not.toHaveBeenCalled();
});
it("checks confirmed email, expired session and service failure separately", async () => {
  login(); state.user!.email_confirmed_at = null; expect((await profile.GET()).status).toBe(401);
  state.userError = { name: "AuthApiError", status: 401 }; expect((await profile.GET()).status).toBe(401);
  state.userError = { name: "AuthRetryableFetchError", status: 503 }; expect((await profile.GET()).status).toBe(503);
});
it("rejects an inconsistent RPC identity", async () => { login(); state.account.userId = "b"; await expect(currentAccount()).rejects.toThrow(/Identità/); });
it.each([{ avatarId: "elf", userId: "b" }, { avatarId: "elf", firstName: "Attack" }, { avatarId: "elf", isAdmin: true }, { avatarId: "https://evil.test/avatar" }])("rejects manipulated profile %j", async body => {
  login(); expect((await profile.PATCH(request("api/profile", body, "PATCH"))).status).toBe(400); expect(state.rpc.mock.calls.every(([name]) => name === "my_account")).toBe(true);
});
it("writes only the current avatar and relies on DB confirmation", async () => {
  login(); expect((await profile.PATCH(request("api/profile", { avatarId: "elf" }, "PATCH"))).status).toBe(200);
  expect(state.rpc).toHaveBeenCalledWith("set_avatar", { p_avatar_id: "elf" });
  state.rpc.mockImplementation(async (name: string) => name === "my_account" ? { data: state.account, error: null } : { data: null, error: { code: "42501" } });
  expect((await profile.PATCH(request("api/profile", { avatarId: "elf" }, "PATCH"))).status).toBe(403);
});
it("validates initial names and refuses reinitialization when DB says profile exists", async () => {
  login(); expect((await profile.POST(request("api/profile", { firstName: "A", lastName: "Fixture", avatarId: "elf" }))).status).toBe(200);
  expect((await profile.POST(request("api/profile", { firstName: "\u0000", lastName: "Fixture", avatarId: "elf" }))).status).toBe(400);
  state.rpc.mockImplementation(async (name: string) => name === "my_account" ? { data: state.account, error: null } : { data: null, error: { code: "23505" } });
  expect((await profile.POST(request("api/profile", { firstName: "Changed", lastName: "Fixture", avatarId: "elf" }))).status).toBe(409);
});
it.each(["userId", "editionId", "gameId", "owner_id"])("enrollment refuses caller field %s", async key => {
  login(); expect((await enrollment.POST(request("api/enrollment", { [key]: "other" }))).status).toBe(400); expect(state.rpc).not.toHaveBeenCalledWith("join_current_edition");
});
it("enrolls only through a parameterless current-edition transaction", async () => { login(); expect((await enrollment.POST(request("api/enrollment", {}))).status).toBe(200); expect(state.rpc).toHaveBeenCalledWith("join_current_edition"); });
it.each([false, true])("requires server role for admin operations, admin=%s", async isAdmin => {
  login(isAdmin); expect((await admin.GET()).status).toBe(isAdmin ? 200 : 403);
  if (!isAdmin) expect((await participants.PATCH(request("api/admin/participants", {} , "PATCH"))).status).toBe(403);
});
it("activation is explicit and cannot be added to a registration payload", async () => {
  login(true); expect((await admin.POST(request("api/admin/edition", { confirmation: "yes" }))).status).toBe(400);
  expect((await admin.PATCH(request("api/admin/edition", { open: true, closesAt: null, active: true }, "PATCH"))).status).toBe(400);
  expect((await admin.POST(request("api/admin/edition", { confirmation: "ATTIVA 2026" }))).status).toBe(200);
  expect(state.rpc).toHaveBeenCalledWith("activate_current_edition", { p_confirmation: "ATTIVA 2026" });
});
it("sends existing-account links after enrollment closure without creating users", async () => {
  expect((await magic.POST(request("api/auth/magic-link", { email: "a@example.test", intent: "login" }))).status).toBe(200);
  expect(state.signIn).toHaveBeenCalledWith({ email: "a@example.test", options: { shouldCreateUser: false, emailRedirectTo: "https://game.test/auth/confirm" } });
});
it("blocks signup while closed without blocking login", async () => {
  expect((await magic.POST(request("api/auth/magic-link", { email: "a@example.test", intent: "register" }))).status).toBe(403); expect(state.signIn).not.toHaveBeenCalled();
  state.edition.active = true; state.edition.registrationsOpen = true;
  expect((await magic.POST(request("api/auth/magic-link", { email: "any@domain.test", intent: "register" }))).status).toBe(200);
  expect(state.signIn.mock.calls[0][0].options.shouldCreateUser).toBe(true);
});
it("does not enumerate unknown emails and reports rate limit or delivery error", async () => {
  state.signIn.mockResolvedValue({ error: { code: "otp_disabled", status: 400 } }); expect((await magic.POST(request("api/auth/magic-link", { email: "unknown@example.test", intent: "login" }))).status).toBe(200);
  state.signIn.mockResolvedValue({ error: { status: 429 } }); expect((await magic.POST(request("api/auth/magic-link", { email: "a@example.test", intent: "login" }))).status).toBe(429);
  state.signIn.mockResolvedValue({ error: { code: "email_address_not_authorized", status: 403 } }); expect((await magic.POST(request("api/auth/magic-link", { email: "a@example.test", intent: "login" }))).status).toBe(503);
});
it("confirms only an email token hash, including single-use/expired errors", async () => {
  expect((await confirm.POST(request("api/auth/confirm", { tokenHash: "test_hash" }))).status).toBe(200); expect(state.verify).toHaveBeenCalledWith({ token_hash: "test_hash", type: "email" });
  state.verify.mockResolvedValue({ error: { code: "otp_expired" } }); expect((await confirm.POST(request("api/auth/confirm", { tokenHash: "test_hash" }))).status).toBe(400);
  expect((await confirm.POST(request("api/auth/confirm", { tokenHash: "test_hash", type: "recovery" }))).status).toBe(400);
});
it("refuses cross-origin writes before Auth", async () => {
  expect((await confirm.POST(request("api/auth/confirm", { tokenHash: "test_hash" }, "POST", { origin: "https://evil.test" }))).status).toBe(403); expect(state.verify).not.toHaveBeenCalled();
});
it("callback uses configured origin and a fixed redirect", async () => {
  const good = await callback.GET(new Request("https://untrusted-host.test/auth/callback?code=test")); expect(good.headers.get("location")).toBe("https://game.test/profilo");
  const bad = await callback.GET(new Request("https://game.test/auth/callback?code=test&next=https://evil.test")); expect(bad.headers.get("location")).toBe("https://game.test/login?error=invalid_link");
  state.exchange.mockResolvedValue({ error: {} }); expect((await callback.GET(new Request("https://game.test/auth/callback?code=used"))).headers.get("location")).toContain("invalid_link"); expect(good.headers.get("cache-control")).toContain("no-store");
});
it("logout revokes the Supabase refresh session and removes legacy cookie", async () => {
  expect((await logout.POST(new Request("https://game.test/api/logout", { method: "POST" }))).status).toBe(200); expect(state.signOut).toHaveBeenCalledWith({ scope: "local" }); expect(state.setCookie.mock.calls[0][0]).toBe("fanta_session");
  state.signOut.mockResolvedValue({ error: {} }); expect((await logout.POST(new Request("https://game.test/api/logout", { method: "POST" }))).status).toBe(503);
});
it("rejects unsafe config and privileged keys", () => {
  vi.stubEnv("APP_ORIGIN", "https://game.test/path"); expect(appOrigin).toThrow(); vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_secret_fake"); expect(authConfig).toThrow();
  vi.stubEnv("NODE_ENV", "production"); expect(authCookieOptions()).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
});
it("retired routes expose no historical payload or writer", async () => { const response = await retiredLegacyRoute(); expect(response.status).toBe(410); expect(state.rpc).not.toHaveBeenCalled(); });
