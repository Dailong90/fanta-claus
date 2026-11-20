-- Additive 2026 model. Never copies, renames or rewrites legacy rows.
begin;
do $$ begin
  if not exists(select 1 from pg_roles where rolname=current_user and (rolsuper or rolbypassrls)) then
    raise exception 'Migration owner must be a verified infrastructure role with BYPASSRLS; no role privileges are changed automatically';
  end if;
end $$;
create schema fc_private;
create schema fc_api;
revoke all on schema fc_private, fc_api from public, anon, authenticated, service_role;
grant usage on schema fc_api to anon, authenticated;
grant usage on schema fc_private to authenticated;
-- Per-schema REVOKE cannot subtract PostgreSQL's global PUBLIC EXECUTE default.
-- Future objects created by this migration owner require explicit client grants, in every schema.
alter default privileges revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema fc_private revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema fc_private revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges in schema fc_api revoke execute on functions from public, anon, authenticated, service_role;

create table fc_private.editions (
  id integer primary key check (id between 2026 and 9999),
  activated_at timestamptz,
  activated_by uuid references auth.users(id)
);
create table fc_private.profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  first_name text not null check (first_name = btrim(first_name) and length(first_name) between 1 and 80 and first_name !~ '[[:cntrl:]]'),
  last_name text not null check (last_name = btrim(last_name) and length(last_name) between 1 and 80 and last_name !~ '[[:cntrl:]]'),
  avatar_id text not null check (avatar_id in ('santa', 'reindeer', 'elf', 'snowman')),
  created_at timestamptz not null default now()
);
create table fc_private.edition_admins (
  edition_id integer not null references fc_private.editions(id),
  user_id uuid not null references fc_private.profiles(user_id),
  primary key (edition_id, user_id)
);
create table fc_private.games (
  id uuid primary key default gen_random_uuid(),
  edition_id integer not null references fc_private.editions(id),
  kind text not null check (kind in ('official', 'simulation')),
  unique (id, edition_id)
);
create unique index one_official_game_per_edition on fc_private.games(edition_id) where kind = 'official';
create table fc_private.game_config (
  game_id uuid primary key,
  edition_id integer not null,
  registrations_open boolean not null default false,
  registration_closes_at timestamptz,
  enrollment_locked boolean not null default false,
  foreign key (game_id, edition_id) references fc_private.games(id, edition_id),
  check (not registrations_open or registration_closes_at is not null),
  check (not enrollment_locked or not registrations_open)
);
create table fc_private.participations (
  game_id uuid not null,
  edition_id integer not null,
  user_id uuid not null references fc_private.profiles(user_id),
  joined_at timestamptz not null default now(),
  primary key (game_id, user_id),
  unique (game_id, edition_id, user_id),
  foreign key (game_id, edition_id) references fc_private.games(id, edition_id)
);
-- Reserved for B07. No reader/writer grant or RPC, including for app admins.
create table fc_private.secret_assignments (
  game_id uuid not null,
  edition_id integer not null,
  giver_id uuid not null,
  receiver_id uuid not null,
  primary key (game_id, giver_id),
  unique (game_id, receiver_id),
  foreign key (game_id, edition_id, giver_id) references fc_private.participations(game_id, edition_id, user_id),
  foreign key (game_id, edition_id, receiver_id) references fc_private.participations(game_id, edition_id, user_id),
  check (giver_id <> receiver_id)
);
-- Single-use infrastructure bootstrap, never populated by registration or an app RPC.
create table fc_private.auth_bootstrap (
  email text primary key check (email = lower(btrim(email))),
  expires_at timestamptz not null
);

insert into fc_private.editions(id) values (2026);
insert into fc_private.games(edition_id, kind) values (2026, 'official');
insert into fc_private.game_config(game_id, edition_id) select id, edition_id from fc_private.games;

create function fc_private.is_edition_admin(p_edition integer) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from fc_private.edition_admins where edition_id = p_edition and user_id = (select auth.uid()));
$$;
revoke all on function fc_private.is_edition_admin(integer) from public, anon, service_role;
grant execute on function fc_private.is_edition_admin(integer) to authenticated;

do $$ declare t text; begin
  foreach t in array array['editions','profiles','edition_admins','games','game_config','participations','secret_assignments','auth_bootstrap'] loop
    execute format('alter table fc_private.%I enable row level security', t);
    execute format('alter table fc_private.%I force row level security', t);
    execute format('revoke all on fc_private.%I from public, anon, authenticated, service_role', t);
  end loop;
end $$;
grant select on fc_private.profiles, fc_private.edition_admins, fc_private.participations to authenticated;
create policy own_profile on fc_private.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy own_roles on fc_private.edition_admins for select to authenticated using (user_id = (select auth.uid()));
create policy own_participations on fc_private.participations for select to authenticated using (user_id = (select auth.uid()));
-- No direct INSERT/UPDATE/DELETE grants. All mutations have narrow transactional RPCs.

create function fc_private.verified_user() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); begin
  if v_uid is null or not exists(select 1 from auth.users where id = v_uid and email_confirmed_at is not null and email is not null) then
    raise exception 'Verified session required' using errcode = '42501';
  end if;
  return v_uid;
end $$;

create function fc_private.registration_allowed() returns boolean
language sql volatile security definer set search_path = '' as $$
  select exists(select 1 from fc_private.editions e
    join fc_private.games g on g.edition_id = e.id and g.kind = 'official'
    join fc_private.game_config c on c.game_id = g.id
    where e.id = 2026 and e.activated_at is not null and c.registrations_open
      and not c.enrollment_locked and c.registration_closes_at > clock_timestamp());
$$;
-- Enforced by PostgreSQL even when /auth/v1/otp or /signup bypasses Next.js.
create function fc_private.guard_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null then raise exception 'Email required' using errcode = '42501'; end if;
  delete from fc_private.auth_bootstrap where email = lower(new.email) and expires_at > clock_timestamp();
  if found then return new; end if;
  -- Serialize account creation with registration closure. Existing logins do not INSERT auth.users.
  perform 1 from fc_private.game_config c join fc_private.games g on g.id = c.game_id
    where g.edition_id = 2026 and g.kind = 'official' for share of c;
  if not fc_private.registration_allowed() then
    raise exception 'New registrations closed' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger fc_guard_new_auth_user before insert on auth.users for each row execute function fc_private.guard_new_auth_user();

create function fc_api.edition_status() returns jsonb
language sql volatile security definer set search_path = '' as $$
  select jsonb_build_object('editionId', e.id, 'active', e.activated_at is not null,
    'registrationsOpen', fc_private.registration_allowed()) from fc_private.editions e where e.id = 2026;
$$;

create function fc_api.my_account() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := fc_private.verified_user(); v_result jsonb; begin
  select jsonb_build_object('userId', u.id, 'email', u.email,
    'profile', case when p.user_id is null then null else jsonb_build_object('firstName', p.first_name, 'lastName', p.last_name, 'avatarId', p.avatar_id) end,
    'isAdmin', fc_private.is_edition_admin(2026),
    'participating', exists(select 1 from fc_private.participations x join fc_private.games g on g.id = x.game_id where x.user_id = v_uid and g.edition_id = 2026 and g.kind = 'official'))
    into v_result from auth.users u left join fc_private.profiles p on p.user_id = u.id where u.id = v_uid;
  return v_result;
end $$;
create function fc_api.create_profile(p_first_name text, p_last_name text, p_avatar_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := fc_private.verified_user(); begin
  insert into fc_private.profiles(user_id, first_name, last_name, avatar_id) values (v_uid, p_first_name, p_last_name, p_avatar_id);
  return fc_api.my_account();
end $$;
create function fc_api.set_avatar(p_avatar_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := fc_private.verified_user(); begin
  update fc_private.profiles set avatar_id = p_avatar_id where user_id = v_uid;
  if not found then raise exception 'Profile required' using errcode = '23503'; end if;
  return fc_api.my_account();
end $$;
create function fc_api.join_current_edition() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := fc_private.verified_user(); v_game uuid; begin
  select g.id into strict v_game from fc_private.games g join fc_private.game_config c on c.game_id = g.id
    where g.edition_id = 2026 and g.kind = 'official' for update of c;
  if exists(select 1 from fc_private.participations where game_id = v_game and user_id = v_uid) then return fc_api.my_account(); end if;
  if not fc_private.registration_allowed() then raise exception 'Enrollment closed' using errcode = '42501'; end if;
  insert into fc_private.participations(game_id, edition_id, user_id) values (v_game, 2026, v_uid);
  return fc_api.my_account();
end $$;

create function fc_api.activate_current_edition(p_confirmation text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := fc_private.verified_user(); begin
  if not fc_private.is_edition_admin(2026) then raise exception 'Edition admin required' using errcode = '42501'; end if;
  if p_confirmation is distinct from 'ATTIVA 2026' then raise exception 'Explicit confirmation required' using errcode = '22023'; end if;
  update fc_private.editions set activated_at = clock_timestamp(), activated_by = v_uid where id = 2026 and activated_at is null;
  return fc_api.edition_status();
end $$;
create function fc_api.admin_registration() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform fc_private.verified_user();
  if not fc_private.is_edition_admin(2026) then raise exception 'Edition admin required' using errcode = '42501'; end if;
  return (select fc_api.edition_status() || jsonb_build_object('closesAt', c.registration_closes_at, 'locked', c.enrollment_locked)
    from fc_private.game_config c join fc_private.games g on g.id = c.game_id where g.edition_id=2026 and g.kind='official');
end $$;
create function fc_api.configure_registration(p_open boolean, p_closes_at timestamptz) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform fc_private.verified_user();
  if not fc_private.is_edition_admin(2026) then raise exception 'Edition admin required' using errcode = '42501'; end if;
  if p_open is null or (p_closes_at is not null and not isfinite(p_closes_at)) or (p_open and (p_closes_at is null or p_closes_at <= clock_timestamp())) then raise exception 'Invalid deadline' using errcode = '22023'; end if;
  if p_open and not exists(select 1 from fc_private.editions where id = 2026 and activated_at is not null) then raise exception 'Edition inactive' using errcode = '42501'; end if;
  update fc_private.game_config c set registrations_open = p_open, registration_closes_at = p_closes_at
    from fc_private.games g where g.id = c.game_id and g.edition_id = 2026 and g.kind = 'official' and (not c.enrollment_locked or not p_open);
  if not found then raise exception 'Enrollment permanently locked' using errcode = '42501'; end if;
  return fc_api.admin_registration();
end $$;
create function fc_api.admin_participants() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform fc_private.verified_user();
  if not fc_private.is_edition_admin(2026) then raise exception 'Edition admin required' using errcode = '42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('userId', p.user_id, 'firstName', p.first_name, 'lastName', p.last_name, 'avatarId', p.avatar_id) order by p.last_name, p.first_name), '[]'::jsonb)
    from fc_private.profiles p join fc_private.participations x on x.user_id = p.user_id join fc_private.games g on g.id = x.game_id where g.edition_id = 2026 and g.kind = 'official');
end $$;
create function fc_api.correct_participant_name(p_user_id uuid, p_first_name text, p_last_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform fc_private.verified_user();
  if not fc_private.is_edition_admin(2026) then raise exception 'Edition admin required' using errcode = '42501'; end if;
  if not exists(select 1 from fc_private.participations x join fc_private.games g on g.id = x.game_id where x.user_id = p_user_id and g.edition_id = 2026 and g.kind = 'official') then raise exception 'Participant not found' using errcode = '42501'; end if;
  update fc_private.profiles set first_name = p_first_name, last_name = p_last_name where user_id = p_user_id;
end $$;

-- Explicit ACLs; no service-role application client is needed by the 2026 app.
revoke all on all functions in schema fc_private, fc_api from public, anon, authenticated, service_role;
grant execute on function fc_private.is_edition_admin(integer) to authenticated;
grant execute on function fc_api.edition_status() to anon, authenticated;
grant execute on function fc_api.my_account(), fc_api.create_profile(text,text,text), fc_api.set_avatar(text),
  fc_api.join_current_edition(), fc_api.activate_current_edition(text), fc_api.configure_registration(boolean,timestamptz),
  fc_api.admin_registration(), fc_api.admin_participants(), fc_api.correct_participant_name(uuid,text,text) to authenticated;

-- Role provisioning/revocation deliberately has no API. Run only as DB owner, by UUID.
create procedure fc_private.set_edition_admin(p_user_id uuid, p_edition_id integer, p_enabled boolean)
language plpgsql security invoker set search_path = '' as $$
begin
  if p_enabled then insert into fc_private.edition_admins values (p_edition_id, p_user_id) on conflict do nothing;
  else delete from fc_private.edition_admins where edition_id = p_edition_id and user_id = p_user_id; end if;
end $$;
revoke all on procedure fc_private.set_edition_admin(uuid,integer,boolean) from public, anon, authenticated, service_role;
commit;
