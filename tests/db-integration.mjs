import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Real PostgreSQL WASM engine. Only auth.users/auth.uid and gateway roles are test fixtures.
// This does not run GoTrue, PostgREST or a multi-connection server.
let db = new PGlite(); let checks = 0;
const check = (value, expected, label) => { assert.deepEqual(value, expected, label); checks++; };
const scalar = async (sql, params) => (await db.query(sql, params)).rows[0]?.value;
const fails = async (sql, code, params) => {
  await assert.rejects(db.query(sql, params), error => { assert.equal(error.code, code); return true; }); checks++;
};
const actor = async (role, uid = "") => {
  await db.exec("reset role"); await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
  assert.ok(["anon", "authenticated", "service_role"].includes(role)); await db.exec(`set role ${role}`);
};
const root = () => db.exec("reset role");
const ids = Object.fromEntries(["a", "b", "admin", "admin2", "late", "unverified"].map((name, index) => [name, `00000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`]));
const legacy = ["players", "teams", "gift_categories", "gifts", "gift_assignments", "package_votes", "game_settings"];
async function snapshot() {
  await root(); const result = {};
  for (const table of legacy) result[table] = await scalar(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text), '[]'::jsonb) as value from public.${table} t`);
  return result;
}
const migrationFiles = (await readdir(new URL("../supabase/migrations/", import.meta.url))).filter(name => name.endsWith(".sql")).sort();
async function migrate() {
  for (const file of migrationFiles) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
}
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; grant usage on schema auth to anon, authenticated;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}', encrypted_password text, email_change text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
  await db.exec(await readFile(new URL("./sql/legacy-fixture.sql", import.meta.url), "utf8"));
  const before = await snapshot(); await migrate(); check(await snapshot(), before, "every legacy value preserved by migrations");
  check(await scalar("select fc_api.edition_status() as value"), { editionId: 2026, active: false, registrationsOpen: false }, "inactive, closed by default");
  await fails("insert into auth.users(id,email) values (gen_random_uuid(),'blocked@example.test')", "42501");
  for (const [name, id] of Object.entries(ids)) {
    await db.query("insert into fc_private.auth_bootstrap values ($1, now() + interval '1 hour')", [`${name}@example.test`]);
    await db.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values ($1,$2,$3,'{\"is_admin\":true}')", [id, `${name}@example.test`, name === "unverified" ? null : new Date()]);
  }
  check(await scalar("select count(*)::int as value from fc_private.auth_bootstrap"), 0, "single use bootstrap consumed");
  // Simulate GoTrue's temporary hash and email confirmation, not a password login.
  await db.query("insert into fc_private.auth_bootstrap values ('temporary@example.test', now()+interval '1 hour')");
  const temporary = '00000000-0000-0000-0000-000000000099';
  await db.query("insert into auth.users(id,email,encrypted_password) values ($1,'temporary@example.test','internal-temporary-hash')", [temporary]);
  await db.query("update auth.users set email_confirmed_at=now() where id=$1", [temporary]);
  check(await scalar("select encrypted_password as value from auth.users where id=$1", [temporary]), null, "confirmation removes temporary hash");
  await actor("anon");
  check(await scalar("select fc_api.edition_status() as value"), { editionId: 2026, active: false, registrationsOpen: false });
  await fails("select fc_api.my_account()", "42501");
  await fails("select * from fc_private.profiles", "42501");
  await actor("authenticated", ids.unverified); await fails("select fc_api.my_account()", "42501");
  for (const name of ["a", "b", "admin", "admin2", "late"]) {
    await actor("authenticated", ids[name]);
    const result = await scalar("select fc_api.create_profile($1,'Fixture','santa') as value", [name]);
    check(result.userId, ids[name]); check(result.isAdmin, false, "metadata cannot grant roles");
    await fails("select fc_api.create_profile('Changed','Identity','elf')", "23505");
  }
  await actor("authenticated", ids.a);
  check(await scalar("select count(*)::int as value from fc_private.profiles"), 1, "RLS only own profile");
  check(await scalar("select count(*)::int as value from fc_private.profiles where user_id = $1", [ids.b]), 0);
  await fails("update fc_private.profiles set first_name='Attack'", "42501");
  await fails("insert into fc_private.edition_admins values (2026, $1)", "42501", [ids.a]);
  await fails("call fc_private.set_edition_admin($1,2026,true)", "42501", [ids.a]);
  await fails("select fc_api.admin_participants()", "42501");
  await fails("select fc_api.correct_participant_name($1,'Attack','Name')", "42501", [ids.b]);
  await fails("select fc_api.activate_current_edition('ATTIVA 2026')", "42501");
  await fails("select fc_api.join_current_edition()", "42501");
  await fails("select fc_api.set_avatar('https://evil.test/avatar')", "23514");
  const avatar = await scalar("select fc_api.set_avatar('elf') as value"); check(avatar.profile.avatarId, "elf"); check(avatar.profile.firstName, "a");
  await actor("authenticated", ids.b); check((await scalar("select fc_api.my_account() as value")).profile.avatarId, "santa", "A cannot alter B");
  await root();
  await db.query("call fc_private.set_edition_admin($1,2026,true)", [ids.admin]);
  await db.query("call fc_private.set_edition_admin($1,2026,true)", [ids.admin2]);
  await actor("authenticated", ids.admin);
  await fails("select fc_api.activate_current_edition('yes')", "22023");
  await fails("select fc_api.configure_registration(true, now()+interval '1 hour')", "42501");
  check((await scalar("select fc_api.activate_current_edition('ATTIVA 2026') as value")).active, true);
  check((await scalar("select fc_api.edition_status() as value")).registrationsOpen, false, "activation does not open registration");
  await root(); const activatedAt = await scalar("select activated_at::text as value from fc_private.editions where id=2026");
  await actor("authenticated", ids.admin2); check((await scalar("select fc_api.my_account() as value")).isAdmin, true);
  await db.query("select fc_api.activate_current_edition('ATTIVA 2026')");
  await root(); check(await scalar("select activated_at::text as value from fc_private.editions where id=2026"), activatedAt, "activation retry is idempotent");
  await actor("authenticated", ids.admin);
  await fails("select fc_api.configure_registration(true,null)", "22023");
  await fails("select fc_api.configure_registration(true,now())", "22023");
  await db.query("select fc_api.configure_registration(true,now()+interval '1 hour')");
  for (const name of ["a", "b", "admin", "admin2"]) {
    await actor("authenticated", ids[name]); check((await scalar("select fc_api.join_current_edition() as value")).participating, true);
    check((await scalar("select fc_api.join_current_edition() as value")).participating, true, "join retry");
  }
  await actor("authenticated", ids.admin);
  check((await scalar("select fc_api.admin_participants() as value")).length, 4);
  check((await scalar("select fc_api.admin_registration() as value")).locked, false);
  await db.query("select fc_api.correct_participant_name($1,'Corrected','Fixture')", [ids.a]);
  await fails("select fc_api.correct_participant_name($1,'No','Membership')", "42501", [ids.late]);
  await root(); await db.exec("update fc_private.game_config set registration_closes_at=clock_timestamp()-interval '1 millisecond' where edition_id=2026;");
  await actor("authenticated", ids.late); await fails("select fc_api.join_current_edition()", "42501");
  await actor("authenticated", ids.admin);
  await db.query("select fc_api.configure_registration(false,null)");
  await actor("authenticated", ids.a);
  check((await scalar("select fc_api.my_account() as value")).profile.firstName, "Corrected");
  check((await scalar("select fc_api.join_current_edition() as value")).participating, true, "existing participation survives closure");
  await actor("authenticated", ids.late); await fails("select fc_api.join_current_edition()", "42501");
  check((await scalar("select fc_api.my_account() as value")).userId, ids.late, "account access after closure");
  await root(); await fails("insert into auth.users(id,email,email_confirmed_at) values (gen_random_uuid(),'after-closure@example.test',now())", "42501");
  await fails("update auth.users set email='impersonation@example.test' where id=$1", "42501", [ids.a]);
  await fails("update auth.users set email_change='other@example.test' where id=$1", "42501", [ids.a]);
  await fails("update auth.users set encrypted_password='fake-hash' where id=$1", "42501", [ids.a]);
  // Other editions and simulations: no general-purpose API accepts a game/edition ID.
  await db.exec("insert into fc_private.editions(id) values (2027); insert into fc_private.games(edition_id,kind) values (2027,'official'),(2026,'simulation'),(2026,'simulation');");
  await db.query("insert into fc_private.participations(game_id,edition_id,user_id) select id,2027,$1 from fc_private.games where edition_id=2027", [ids.late]);
  await actor("authenticated", ids.late); check((await scalar("select fc_api.my_account() as value")).participating, false, "2027 does not enroll into 2026");
  await root();
  await fails("insert into fc_private.participations(game_id,edition_id,user_id) select id,2027,$1 from fc_private.games where edition_id=2026 and kind='simulation' limit 1", "23503", [ids.a]);
  const official = await scalar("select id as value from fc_private.games where edition_id=2026 and kind='official'");
  await fails("insert into fc_private.secret_assignments values ($1,2026,$2,$2)", "23514", [official, ids.a]);
  await db.query("insert into fc_private.secret_assignments values ($1,2026,$2,$3)", [official, ids.a, ids.b]);
  await fails("insert into fc_private.secret_assignments values ($1,2026,$2,$3)", "23505", [official, ids.admin, ids.b]);
  await fails("insert into fc_private.secret_assignments values ($1,2026,$2,$3)", "23503", [official, ids.b, ids.late]);
  for (const name of ["a", "b", "admin", "admin2"]) {
    await actor("authenticated", ids[name]); await fails("select * from fc_private.secret_assignments", "42501");
    check(await scalar("select count(*)::int as value from fc_private.profiles"), 1);
    for (const table of legacy) await fails(`select * from public.${table}`, "42501");
  }
  for (const role of ["anon", "service_role"]) {
    await actor(role); for (const table of legacy) await fails(`select * from public.${table}`, "42501");
    await fails("select * from fc_private.secret_assignments", "42501");
  }
  await root();
  await db.exec("update fc_private.game_config set enrollment_locked=true, registrations_open=false where edition_id=2026;");
  await actor("authenticated", ids.admin); await fails("select fc_api.configure_registration(true,now()+interval '1 hour')", "42501");
  await root(); await db.query("call fc_private.set_edition_admin($1,2026,false)", [ids.admin]);
  await actor("authenticated", ids.admin); await fails("select fc_api.admin_participants()", "42501");
  await root();
  for (const role of ["anon", "authenticated", "service_role"]) {
    for (const table of legacy) check(await scalar("select bool_and(not has_table_privilege($1,$2,p)) as value from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p", [role, `public.${table}`]), true, `${role} has no legacy grants on ${table}`);
    for (const table of ["editions", "profiles", "edition_admins", "games", "game_config", "participations", "secret_assignments", "auth_bootstrap"]) check(await scalar("select bool_and(not has_table_privilege($1,$2,p)) as value from unnest(array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p", [role, `fc_private.${table}`]), true, `${role} has no direct mutations on ${table}`);
  }
  check(await scalar("select count(*)::int as value from pg_tables where schemaname='fc_private' and rowsecurity"), 8, "all private tables have RLS");
  check(await scalar("select count(*)::int as value from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='fc_private' and c.relkind='r' and c.relforcerowsecurity"), 8, "RLS forced on all private tables");
  check(await scalar("select count(*)::int as value from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('fc_api','fc_private') and exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE')"), 0, "no PUBLIC function execution");
  await db.exec("create table fc_private.future_acl_test(id integer); create function fc_api.future_acl_test() returns int language sql as 'select 42';");
  check(await scalar("select has_table_privilege('authenticated','fc_private.future_acl_test','SELECT') as value"), false, "new tables do not inherit client grants");
  check(await scalar("select has_function_privilege('anon','fc_api.future_acl_test()','EXECUTE') as value"), false, "new RPCs are private by default");
  await db.exec("drop table fc_private.future_acl_test; drop function fc_api.future_acl_test();");
  check(await snapshot(), before, "legacy data untouched by all 2026 operations");
  const backup = await db.dumpDataDir(); await db.close(); db = new PGlite({ loadDataDir: backup });
  check(await snapshot(), before, "PostgreSQL data-directory restore preserves legacy");
  check(await scalar("select count(*)::int as value from fc_private.profiles"), 5, "restore preserves new profiles");
  await db.exec("set fc.local_recovery='enabled'");
  await db.exec(await readFile(new URL("../supabase/rollback/identity-local.sql", import.meta.url), "utf8"));
  check(await snapshot(), before, "rollback never changes legacy values");
  await migrate(); check(await snapshot(), before, "reapply after rollback");
  check(await scalar("select fc_api.edition_status() as value"), { editionId: 2026, active: false, registrationsOpen: false }, "fresh reapply stays inactive");
  console.log(`PostgreSQL/PGlite: ${checks} checks passed. Auth gateway, Data API and distributed concurrency require local Supabase.`);
} finally { await db.close(); }
