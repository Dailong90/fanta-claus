-- Local/test recovery only. Does NOT reopen the known insecure legacy ACLs.
begin;
do $$ begin
  if current_setting('fc.local_recovery', true) is distinct from 'enabled' then
    raise exception 'Requires an explicit isolated recovery session';
  end if;
end $$;
drop trigger fc_guard_new_auth_user on auth.users;
drop trigger fc_guard_auth_identity_insert on auth.users;
drop trigger fc_guard_auth_identity_update on auth.users;
drop schema fc_api cascade;
drop schema fc_private cascade;
commit;
