-- SECURITY CHANGE ONLY. This intentionally retires direct 2025 access.
-- Missing tables are normal in a clean local stack; never reconstruct production from CSV.
begin;
do $$ declare t text; begin
  foreach t in array array['players','teams','gift_categories','gifts','gift_assignments','package_votes','game_settings'] loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('alter table public.%I force row level security', t);
      execute format('revoke all on public.%I from public, anon, authenticated, service_role', t);
    end if;
  end loop;
end $$;
-- Applies to future objects owned by this migration role. Other owners must be audited separately.
alter default privileges in schema public revoke all on tables from public, anon, authenticated, service_role;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated, service_role;
commit;
