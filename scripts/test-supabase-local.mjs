import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { randomUUID } from "node:crypto";

// GoTrue + Mailpit + PostgREST integration. Never accepts a URL/key/project argument.
const cli = spawnSync(process.platform === "win32" ? "supabase.exe" : "supabase", ["status", "-o", "json"], { encoding: "utf8", windowsHide: true });
if (cli.error || cli.status !== 0) {
  console.error("NON ESEGUITO: Supabase CLI/stack locale non disponibile. Avviare Docker e npm run db:local -- start, poi migrate."); process.exit(1);
}
const status = JSON.parse(cli.stdout);
const apiUrl = status.API_URL; const mailUrl = status.MAILPIT_URL ?? status.INBUCKET_URL; const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
assert.equal(apiUrl, "http://127.0.0.1:54321", "Only the fixed local API is allowed");
assert.equal(mailUrl, "http://127.0.0.1:54324", "Only the fixed local Mailpit is allowed");
assert.ok(typeof key === "string" && key.length > 0, "Missing local public key");
let checks = 0; const fixtureIds = []; const run = randomUUID().slice(0, 8);
const sql = query => {
  const result = spawnSync("docker", ["exec", "-i", "supabase_db_fanta-claus-local", "psql", "-U", "postgres", "-d", "postgres", "-XAt", "-v", "ON_ERROR_STOP=1"], { input: query, encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0) throw new Error("Local SQL failed; inspect the isolated database (no credentials printed).");
  return result.stdout.trim();
};
async function call(path, body, token, schema = "fc_api", method = "POST") {
  const response = await fetch(apiUrl + path, { method, redirect: "error", headers: { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json", "Content-Profile": schema, "Accept-Profile": schema }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await response.text(); let data; try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  return { status: response.status, data };
}
const ok = result => { assert.ok(result.status >= 200 && result.status < 300, `Unexpected local HTTP status ${result.status}`); checks++; return result.data; };
const denied = result => { assert.ok([400, 401, 403, 404, 406].includes(result.status), `Expected rejection, received ${result.status}`); checks++; };
const rejectedNewAccount = (result, email) => {
  assert.ok([400, 401, 403, 422].includes(result.status) || (result.status === 500 && result.data?.code === "unexpected_failure"), "Auth must reject closed account creation");
  assert.equal(sql(`select count(*) from auth.users where email='${email}'`), "0"); checks++;
};
const rpc = (name, args, token) => call(`/rest/v1/rpc/${name}`, args, token);
async function requestLink(email, createUser) {
  ok(await call("/auth/v1/otp?redirect_to=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fconfirm", { email, create_user: createUser, data: { is_admin: true } }));
  const until = Date.now() + 20_000;
  while (Date.now() < until) {
    const inbox = await (await fetch(mailUrl + "/api/v1/messages", { redirect: "error" })).json();
    for (const message of inbox.messages ?? []) {
      if (!(message.To ?? []).some(recipient => recipient.Address?.toLowerCase() === email)) continue;
      const full = await (await fetch(mailUrl + `/api/v1/message/${encodeURIComponent(message.ID)}`, { redirect: "error" })).json();
      const match = `${full.HTML ?? ""} ${full.Text ?? ""}`.match(/token_hash=([a-zA-Z0-9_-]+)/);
      if (match) return match[1];
    }
    await delay(200);
  }
  throw new Error("Local email not found in Mailpit; no public delivery has been tested.");
}
async function account(name, bootstrap = false) {
  const email = `fc-${run}-${name}@example.test`;
  if (bootstrap) sql(`insert into fc_private.auth_bootstrap values ('${email}',now()+interval '5 minutes');`);
  const tokenHash = await requestLink(email, true);
  const session = ok(await call("/auth/v1/verify", { token_hash: tokenHash, type: "email" }));
  assert.match(session.user.id, /^[0-9a-f-]{36}$/); fixtureIds.push(session.user.id);
  denied(await call("/auth/v1/verify", { token_hash: tokenHash, type: "email" }));
  ok(await rpc("create_profile", { p_first_name: name, p_last_name: "Fixture", p_avatar_id: "santa" }, session.access_token));
  return { ...session, email };
}
// Do not alter a local stack containing a game or existing profiles.
assert.equal(sql("select count(*) from fc_private.profiles"), "0", "Use a pristine dedicated local stack");
assert.equal(sql("select count(*) from fc_private.editions where activated_at is not null"), "0", "Use an inactive dedicated local stack");
try {
  const initial = ok(await rpc("edition_status", {})); assert.equal(initial.active, false); assert.equal(initial.registrationsOpen, false); checks += 2;
  rejectedNewAccount(await call("/auth/v1/otp", { email: `fc-${run}-blocked@example.test`, create_user: true }), `fc-${run}-blocked@example.test`);
  denied(await rpc("my_account", {}));
  const admin = await account("admin", true); sql(`call fc_private.set_edition_admin('${admin.user.id}',2026,true);`);
  denied(await rpc("activate_current_edition", { p_confirmation: "yes" }, admin.access_token));
  ok(await rpc("activate_current_edition", { p_confirmation: "ATTIVA 2026" }, admin.access_token));
  ok(await rpc("configure_registration", { p_open: true, p_closes_at: new Date(Date.now() + 3600_000).toISOString() }, admin.access_token));
  const a = await account("a"); const b = await account("b"); const late = await account("late"); const admin2 = await account("admin2");
  sql(`call fc_private.set_edition_admin('${admin2.user.id}',2026,true);`);
  for (const actor of [a, b, admin, admin2]) ok(await rpc("join_current_edition", {}, actor.access_token));
  for (const result of await Promise.all([rpc("join_current_edition", {}, a.access_token), rpc("join_current_edition", {}, a.access_token)])) ok(result);
  assert.equal(sql(`select count(*) from fc_private.participations where user_id='${a.user.id}'`), "1"); checks++;
  for (const actor of [a, b]) {
    assert.equal(ok(await rpc("my_account", {}, actor.access_token)).userId, actor.user.id); checks++;
    denied(await rpc("admin_participants", {}, actor.access_token));
    denied(await rpc("correct_participant_name", { p_user_id: b.user.id, p_first_name: "Attack", p_last_name: "Name" }, actor.access_token));
    denied(await rpc("create_profile", { p_first_name: "Changed", p_last_name: "Name", p_avatar_id: "elf" }, actor.access_token));
  }
  ok(await rpc("set_avatar", { p_avatar_id: "elf" }, a.access_token));
  assert.equal(ok(await rpc("my_account", {}, b.access_token)).profile.avatarId, "santa"); checks++;
  denied(await rpc("set_avatar", { p_avatar_id: "https://evil.test/avatar" }, a.access_token));
  ok(await rpc("correct_participant_name", { p_user_id: a.user.id, p_first_name: "Corrected", p_last_name: "Fixture" }, admin2.access_token));
  for (const actor of [null, a, b, admin, admin2]) {
    for (const schema of ["public", "fc_private"]) for (const table of ["players", "teams", "gift_assignments", "profiles", "edition_admins", "secret_assignments"]) denied(await call(`/rest/v1/${table}?select=*`, undefined, actor?.access_token, schema, "GET"));
  }
  ok(await rpc("configure_registration", { p_open: false, p_closes_at: null }, admin.access_token));
  denied(await rpc("join_current_edition", {}, late.access_token));
  rejectedNewAccount(await call("/auth/v1/otp", { email: `fc-${run}-after-close@example.test`, create_user: true }), `fc-${run}-after-close@example.test`);
  const tokenHash = await requestLink(a.email, false); const relogin = ok(await call("/auth/v1/verify", { token_hash: tokenHash, type: "email" }));
  assert.equal(ok(await rpc("my_account", {}, relogin.access_token)).participating, true); checks++;
  const refreshed = ok(await call("/auth/v1/token?grant_type=refresh_token", { refresh_token: relogin.refresh_token }));
  ok(await call("/auth/v1/logout?scope=local", undefined, refreshed.access_token));
  denied(await call("/auth/v1/token?grant_type=refresh_token", { refresh_token: refreshed.refresh_token }));
  denied(await rpc("my_account", {}, "invalid-session"));
  console.log(`Local Supabase/Auth/Mailpit/Data API: ${checks} checks passed. Public SMTP and browser SSR still require staging validation.`);
} finally {
  // Only fixture UUIDs from this test. Legacy rows are never touched.
  sql("update fc_private.editions set activated_at=null,activated_by=null where id=2026; update fc_private.game_config set registrations_open=false,registration_closes_at=null,enrollment_locked=false where edition_id=2026;");
  for (const id of fixtureIds) sql(`delete from fc_private.participations where user_id='${id}'; delete from fc_private.edition_admins where user_id='${id}'; delete from fc_private.profiles where user_id='${id}'; delete from auth.users where id='${id}';`);
  sql(`delete from fc_private.auth_bootstrap where email like 'fc-${run}-%@example.test';`);
}
