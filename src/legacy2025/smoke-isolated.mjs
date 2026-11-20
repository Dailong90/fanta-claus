import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";

// HTTP stub only. This does not implement or verify PostgreSQL, constraints or RLS.
const tables = {
  players: [
    { owner_id: "a", name: "Fixture A", display_name: "Fixture A", is_admin: false, access_code: "FIXTUREA" },
    { owner_id: "b", name: "Fixture B", display_name: "Fixture B", is_admin: false, access_code: "FIXTUREB" },
    { owner_id: "admin", name: "Fixture Admin", display_name: "Fixture Admin", is_admin: true, access_code: "FIXTUREADM" },
  ],
  teams: [],
  gifts: [{ santa_owner_id: "a", receiver_owner_id: "b", category_id: "cat", bonus_points: 2 }],
  gift_categories: [{ id: "cat", code: "FIXTURE", label: "Fixture", points: 10 }],
  package_votes: [],
  game_settings: [
    { key: "team_lock_deadline", value: { deadlineIso: "2030-12-15T11:30:00Z" } },
    { key: "leaderboard_published", value: { published: false } },
    { key: "vote_points", value: { best_wrapping: 5, worst_wrapping: -5, most_fitting: 10 } },
  ],
};
let mutations = 0;
const stub = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1");
    const table = url.pathname.split("/").at(-1);
    if (!url.pathname.startsWith("/rest/v1/") || !Object.hasOwn(tables, table)) { res.writeHead(404).end(); return; }
    const filter = row => [...url.searchParams].every(([key, value]) => !value.startsWith("eq.") || String(row[key]) === value.slice(3));
    let rows = tables[table].filter(filter);
    if (req.method !== "GET") {
      let input = ""; for await (const chunk of req) input += chunk;
      const value = input ? JSON.parse(input) : {};
      mutations++;
      if (req.method === "PATCH") rows.forEach(row => Object.assign(row, value));
      else if (req.method === "DELETE") tables[table] = tables[table].filter(row => !rows.includes(row));
      else if (req.method === "POST") {
        const conflict = url.searchParams.get("on_conflict");
        const existing = conflict ? tables[table].find(row => conflict.split(",").every(key => row[key] === value[key])) : null;
        if (existing) { Object.assign(existing, value); rows = [existing]; }
        else { tables[table].push(value); rows = [value]; }
      }
    }
    const columns = url.searchParams.get("select");
    if (columns && columns !== "*") rows = rows.map(row => Object.fromEntries(columns.split(",").map(key => [key.trim(), row[key.trim()]])));
    const single = req.headers.accept?.includes("object+json");
    res.writeHead(200, { "Content-Type": "application/json", "Content-Range": `0-${Math.max(0, rows.length - 1)}/${rows.length}` });
    res.end(JSON.stringify(single ? rows[0] ?? null : rows));
  } catch { res.writeHead(500).end(JSON.stringify({ error: "Fixture server failure" })); }
});
const listen = async server => { server.listen(0, "127.0.0.1"); await once(server, "listening"); return server.address().port; };
const dbPort = await listen(stub);
const reservation = createServer(); const appPort = await listen(reservation); await new Promise(resolve => reservation.close(resolve));
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1", SUPABASE_URL: `http://127.0.0.1:${dbPort}`, NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${dbPort}`, SUPABASE_SERVICE_ROLE_KEY: "isolated-smoke-placeholder", SESSION_SECRET: "isolated-smoke-placeholder-at-least-32-bytes" };
const app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(appPort)], { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let output = ""; app.stdout.on("data", chunk => { output = (output + chunk).slice(-6000); }); app.stderr.on("data", chunk => { output = (output + chunk).slice(-6000); });
const base = `http://127.0.0.1:${appPort}`;
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const call = (path, method = "GET", body, cookie, headers = {}) => fetch(base + path, { method, redirect: "manual", headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(cookie ? { Cookie: cookie } : {}), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
try {
  const until = Date.now() + 60_000;
  while (true) {
    try { if ((await call("/api/session")).status === 200) break; } catch { /* Wait for our local process only. */ }
    if (Date.now() >= until || app.exitCode !== null) throw new Error("Isolated app failed to start: " + output);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  for (const path of ["/", "/login", "/classifica", "/categorie-regali", "/admin"]) check((await call(path)).status === 200, `public HTML ${path}`);
  const image = await call("/_next/image?url=%2Flogo%2Ffantaclaus.png&w=128&q=75");
  check(image.status === 200 && image.headers.get("content-type")?.startsWith("image/"), "local image optimization");
  const redirected = await call("/profilo"); check(redirected.status === 307 && redirected.headers.get("location") === "/login", "anonymous profile redirect");
  check((await call("/api/categories")).status === 200, "public categories");
  const initial = mutations;
  for (const [path, method, body] of [["/api/admin/reset-game", "POST"], ["/api/admin/team-deadline", "POST", { deadlineIso: null }], ["/api/votes?voter_owner_id=a", "GET"], ["/api/leaderboard?preview=1", "GET"], ["/api/admin/awards", "GET"]]) check((await call(path, method, body, undefined, { "x-fanta-owner-id": "admin" })).status === 401, `anonymous denied ${path}`);
  check(mutations === initial, "rejections did not mutate fixture data");
  const signIn = async code => {
    const response = await call("/api/login", "POST", { code }); check(response.status === 200, "fixture login");
    return response.headers.get("set-cookie").split(";")[0];
  };
  const cookieA = await signIn("FIXTUREA");
  const me = await (await call("/api/session", "GET", undefined, cookieA)).json(); check(me.player.ownerId === "a" && me.player.isAdmin === false, "cookie session");
  check((await call("/profilo", "GET", undefined, cookieA)).status === 200, "authenticated profile HTML");
  const beforeDenied = mutations;
  check((await call("/api/votes?voter_owner_id=b", "GET", undefined, cookieA)).status === 403, "query impersonation");
  check((await call("/api/team", "PUT", { owner_id: "b", members: [], captain_id: null, version: "fake" }, cookieA)).status === 403, "body impersonation");
  check((await call("/api/admin/awards", "GET", undefined, cookieA, { "x-fanta-owner-id": "admin" })).status === 403, "header impersonation");
  check(mutations === beforeDenied, "participant rejections did not mutate fixture data");
  const current = await (await call("/api/team", "GET", undefined, cookieA)).json();
  const saved = await call("/api/team", "PUT", { members: ["b"], captain_id: "b", version: current.version }, cookieA); check(saved.status === 200, "team persisted via HTTP");
  const refreshed = await (await call("/api/team", "GET", undefined, cookieA)).json(); check(refreshed.team.members.join() === "b" && refreshed.team.captain_id === "b", "team refresh");
  const cookieAdmin = await signIn("FIXTUREADM");
  check((await call("/api/admin/gifts", "POST", { santa_owner_id: "a", bonus_points: -3 }, cookieAdmin)).status === 200, "partial gift update");
  check(tables.gifts[0].receiver_owner_id === "b" && tables.gifts[0].category_id === "cat", "omitted gift fields preserved");
  check((await call("/api/admin/awards", "GET", undefined, cookieAdmin)).status === 200, "admin awards");
  check((await call("/api/admin/leaderboard-publish", "POST", { published: true }, cookieAdmin)).status === 200, "publish results");
  const publicResult = await (await call("/api/leaderboard")).json();
  check(publicResult.isPublished === true && !Object.hasOwn(publicResult, "votingDetails"), "public scores without voter details");
  const beforeReset = mutations;
  check((await call("/api/admin/reset-game", "POST", undefined, cookieAdmin)).status === 410, "admin reset disabled");
  check(mutations === beforeReset, "disabled reset does not mutate fixtures");
  const logout = await call("/api/logout", "POST", undefined, cookieA); check(logout.status === 200 && /Max-Age=0/i.test(logout.headers.get("set-cookie")), "logout expires cookie");
  check((await (await call("/api/session")).json()).player === null, "anonymous after removing expired cookie");
  console.log(`Isolated HTTP smoke: ${checks} checks passed (local PostgREST stub; no real database).`);
} finally {
  app.kill(); await new Promise(resolve => stub.close(resolve));
}
