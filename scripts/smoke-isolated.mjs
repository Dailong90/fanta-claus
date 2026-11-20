import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { SignJWT } from "jose";

// HTTP/SSR integration with a loopback stub, never evidence of GoTrue/PostgREST/RLS.
const ids = { a: "00000000-0000-0000-0000-000000000001", b: "00000000-0000-0000-0000-000000000002", admin: "00000000-0000-0000-0000-000000000003" };
const accounts = Object.fromEntries(Object.entries(ids).map(([name, id]) => [id, { userId: id, email: `${name}@example.test`, profile: { firstName: name, lastName: "Fixture", avatarId: "santa" }, isAdmin: name === "admin", participating: false }]));
const tokens = new Map(); const refreshes = new Map(); let refreshCount = 0; let legacyAccess = 0; let otpRequests = 0;
const edition = { editionId: 2026, active: false, registrationsOpen: false };
async function session(uid, expired = false) {
  const token = await new SignJWT({ role: "authenticated", email: accounts[uid].email }).setSubject(uid).setIssuedAt().setExpirationTime(expired ? Math.floor(Date.now()/1000)-10 : "1h").setProtectedHeader({ alg: "HS256" }).sign(new TextEncoder().encode("isolated-stub-key-not-a-production-secret"));
  const refresh = `fixture-refresh-${tokens.size}-${Math.random()}`; tokens.set(token, uid); refreshes.set(refresh, uid);
  return { access_token: token, refresh_token: refresh, token_type: "bearer", expires_in: expired ? -10 : 3600, user: { id: uid, email: accounts[uid].email, email_confirmed_at: "2026-11-20T00:00:00Z", role: "authenticated", aud: "authenticated", created_at: "2026-11-20T00:00:00Z" } };
}
const stub = createServer(async (req, res) => {
  const respond = (status, value) => { res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify(value)); };
  try {
    const url = new URL(req.url, "http://127.0.0.1"); let raw = ""; for await (const part of req) raw += part; const body = raw ? JSON.parse(raw) : {};
    const bearer = req.headers.authorization?.replace(/^Bearer /, ""); const uid = tokens.get(bearer);
    if (url.pathname === "/auth/v1/otp") { assert.equal(body.create_user, false); otpRequests++; respond(200, {}); return; }
    if (url.pathname === "/auth/v1/verify") {
      const who = body.token_hash === "valid-a" || body.token_hash === "expired-a" ? ids.a : body.token_hash === "valid-admin" ? ids.admin : null;
      respond(who ? 200 : 403, who ? await session(who, body.token_hash === "expired-a") : { code: "otp_expired", msg: "Expired" }); return;
    }
    if (url.pathname === "/auth/v1/user") { respond(uid ? 200 : 401, uid ? { id: uid, email: accounts[uid].email, email_confirmed_at: "2026-11-20T00:00:00Z", role: "authenticated", aud: "authenticated" } : { code: "bad_jwt", msg: "Invalid session" }); return; }
    if (url.pathname === "/auth/v1/logout") { for (const [refresh, owner] of refreshes) if (owner === uid) refreshes.delete(refresh); respond(200, {}); return; }
    if (url.pathname === "/auth/v1/token") {
      const owner = refreshes.get(body.refresh_token); refreshCount++; respond(owner ? 200 : 400, owner ? await session(owner) : { code: "refresh_token_not_found", msg: "Invalid refresh" }); return;
    }
    if (url.pathname.startsWith("/rest/v1/rpc/")) {
      assert.equal(req.headers["content-profile"] ?? req.headers["accept-profile"], "fc_api"); const name = url.pathname.split("/").at(-1);
      if (name === "edition_status") { respond(200, edition); return; }
      if (!uid) { respond(401, { code: "42501" }); return; }
      if (name === "my_account") { respond(200, accounts[uid]); return; }
      if (name === "admin_registration" && accounts[uid].isAdmin) { respond(200, { ...edition, closesAt: null, locked: false }); return; }
      if (name === "set_avatar") { accounts[uid].profile.avatarId = body.p_avatar_id; respond(200, accounts[uid]); return; }
      if (name === "activate_current_edition" && accounts[uid].isAdmin) { edition.active = true; respond(200, edition); return; }
      if (name === "admin_participants" && accounts[uid].isAdmin) { respond(200, []); return; }
      respond(403, { code: "42501" }); return;
    }
    legacyAccess++; respond(500, { error: "Unexpected legacy/table access" });
  } catch { respond(500, { error: "Local fixture failure" }); }
});
const listen = async server => { server.listen(0, "127.0.0.1"); await once(server, "listening"); return server.address().port; };
const dbPort = await listen(stub); const reservation = createServer(); const appPort = await listen(reservation); await new Promise(resolve => reservation.close(resolve));
const base = `http://127.0.0.1:${appPort}`;
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1", APP_ORIGIN: base, SUPABASE_URL: `http://127.0.0.1:${dbPort}`, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${dbPort}`, SUPABASE_PUBLISHABLE_KEY: "isolated-smoke-public-placeholder", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "isolated-smoke-public-placeholder", NEXT_PUBLIC_SUPABASE_ANON_KEY: "isolated-smoke-public-placeholder", SUPABASE_SERVICE_ROLE_KEY: "unused", SESSION_SECRET: "unused-in-2026" };
const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(appPort)], { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let output = ""; app.stdout.on("data", chunk => { output = (output + chunk).slice(-4000); }); app.stderr.on("data", chunk => { output = (output + chunk).slice(-4000); });
let checks = 0; const check = (condition, label) => { assert.ok(condition, label); checks++; };
const jar = new Map();
async function call(path, body, method = body === undefined ? "GET" : "POST", authenticated = true) {
  const response = await fetch(base + path, { method, redirect: "manual", headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(authenticated ? { Cookie: [...jar].map(([name, value]) => `${name}=${value}`).join("; ") } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (authenticated) for (const value of response.headers.getSetCookie()) { const pair = value.split(";")[0]; const split = pair.indexOf("="); const name = pair.slice(0, split); const content = pair.slice(split+1); if (!content) jar.delete(name); else jar.set(name, content); }
  return response;
}
try {
  const until = Date.now()+60_000;
  while (true) {
    try { if ((await call("/api/session")).status === 200) break; } catch { /* Only our loopback process. */ }
    if (Date.now() > until || app.exitCode !== null) throw new Error("Isolated Next process did not start: " + output);
    await delay(250);
  }
  check((await call("/api/profile")).status === 401, "anon profile");
  const home = await call("/"); check(home.status === 200, "SSR home"); const html = await home.text(); check(html.includes("2026") && !html.includes("historical-a"), "only 2026 UI");
  for (const path of ["/api/categories", "/api/awards", "/api/leaderboard", "/api/votes", "/api/team", "/api/admin/gifts", "/api/admin/base-data"]) check((await call(path)).status === 410, path);
  check((await call("/api/login", { code: "OLD" })).status === 410, "old login disabled");
  check((await call("/api/auth/magic-link", { email: "a@example.test", intent: "register" })).status === 403, "registration closed");
  check((await call("/api/auth/magic-link", { email: "a@example.test", intent: "login" })).status === 200 && otpRequests === 1, "existing access after closure");
  check((await call("/api/auth/confirm", { tokenHash: "invalid" })).status === 400, "invalid email token");
  const signed = await call("/api/auth/confirm", { tokenHash: "valid-a" }); check(signed.status === 200, "SSR cookie login");
  check(signed.headers.getSetCookie().some(cookie => /HttpOnly/i.test(cookie) && /SameSite=lax/i.test(cookie) && /Secure/i.test(cookie)), "cookie security flags");
  const own = await call("/api/profile"); check(own.status === 200, "persistent cookie session"); check((await own.json()).email === "a@example.test", "own verified profile");
  check((await call("/profilo")).status === 200, "SSR profile after refresh/navigation");
  check((await call("/api/profile", { avatarId: "elf", userId: ids.b }, "PATCH")).status === 400, "no body impersonation");
  check((await call("/api/profile", { avatarId: "elf" }, "PATCH")).status === 200, "own avatar persisted");
  check((await call("/api/admin/edition")).status === 403, "ordinary user denied admin");
  await call("/api/auth/confirm", { tokenHash: "expired-a" });
  check((await call("/api/profile")).status === 200 && refreshCount > 0, "expired access token refresh via proxy");
  check((await call("/api/logout", {})).status === 200, "real signOut invoked"); check((await call("/api/profile")).status === 401, "cookie removed on logout");
  await call("/api/auth/confirm", { tokenHash: "valid-admin" }); check((await call("/api/admin/edition")).status === 200, "admin role from DB");
  check((await call("/api/admin/edition", { confirmation: "yes" })).status === 400, "manual confirmation required");
  check((await call("/api/admin/edition", { confirmation: "ATTIVA 2026" })).status === 200, "explicit activation in stub only");
  check(legacyAccess === 0, "no request to historical tables");
  console.log(`Isolated Next/SSR HTTP stub: ${checks} checks passed. Not a Supabase/RLS/email-delivery test.`);
} finally {
  app.kill(); if (app.exitCode === null) await once(app, "exit"); await new Promise(resolve => stub.close(resolve));
}
