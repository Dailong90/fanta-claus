-- Test-only reconstruction of the two supplied CSVs, NOT a complete production baseline.
-- Array element type is confirmed by teams.members default '{}'::text[].
create table public.players (
  owner_id text primary key, name text not null, access_code text not null unique,
  created_at timestamptz default now(), display_name text, is_admin boolean not null default false
);
create table public.teams (
  owner_id text primary key constraint teams_owner_fk references public.players(owner_id) on delete cascade,
  members text[] not null default '{}'::text[], captain_id text
);
create table public.gift_categories (
  id uuid primary key default gen_random_uuid(), code text not null unique, label text not null,
  points integer not null, description text
);
create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  santa_owner_id text not null constraint gifts_santa_owner_unique unique references public.players(owner_id) on delete cascade,
  receiver_owner_id text references public.players(owner_id) on delete set null,
  category_id uuid not null references public.gift_categories(id) on delete restrict,
  bonus_points integer not null default 0, notes text, created_at timestamptz not null default now()
);
create table public.gift_assignments (giver_id text primary key, category_id text);
create table public.package_votes (
  id uuid primary key default gen_random_uuid(),
  voter_owner_id text not null references public.players(owner_id) on delete cascade,
  target_owner_id text not null references public.players(owner_id) on delete cascade,
  vote_type text not null check (vote_type = any(array['best_wrapping','worst_wrapping','most_fitting'])),
  created_at timestamptz not null default now(), unique(voter_owner_id,vote_type)
);
create table public.game_settings (key text primary key, value jsonb not null);
grant all on all tables in schema public to anon, authenticated, service_role;
insert into public.players(owner_id,name,access_code,is_admin) values ('historical-a','Legacy A','TEST-ONLY-A',true),('historical-b','Legacy B','TEST-ONLY-B',false);
insert into public.teams values ('historical-a',array['historical-b'],'historical-b');
insert into public.gift_categories(id,code,label,points) values ('00000000-0000-0000-0000-000000000025','TEST','Legacy category',-7);
insert into public.gifts(santa_owner_id,receiver_owner_id,category_id,bonus_points,notes) values ('historical-a','historical-b','00000000-0000-0000-0000-000000000025',-3,'Preserve exactly');
insert into public.gift_assignments values ('historical-a','historical-category-text');
insert into public.package_votes(voter_owner_id,target_owner_id,vote_type) values ('historical-a','historical-b','best_wrapping');
insert into public.game_settings values ('leaderboard_published','{"published":true}');
