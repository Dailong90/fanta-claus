-- Email recovery/change is a pending product decision (D01). No password path is offered.
-- Keep the initial verified identity stable even through direct Auth requests.
begin;
create function fc_private.guard_auth_identity_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    -- GoTrue MagicLink creates an unconfirmed user with an internal random password.
    -- Preserve that internal signup step; erase the hash when the email is confirmed.
    if new.email_confirmed_at is not null then new.encrypted_password := null; end if;
  else
    if new.id is distinct from old.id or new.email is distinct from old.email
      or coalesce(new.email_change, '') <> coalesce(old.email_change, '')
      or (coalesce(new.encrypted_password, '') <> coalesce(old.encrypted_password, '') and coalesce(new.encrypted_password, '') <> '') then
      raise exception 'Identity changes require a separate recovery procedure' using errcode = '42501';
    end if;
    if new.email_confirmed_at is not null then new.encrypted_password := null; end if;
  end if;
  return new;
end $$;
revoke all on function fc_private.guard_auth_identity_change() from public, anon, authenticated, service_role;
create trigger fc_guard_auth_identity_insert before insert on auth.users for each row execute function fc_private.guard_auth_identity_change();
create trigger fc_guard_auth_identity_update before update of id, email, email_change, encrypted_password, email_confirmed_at on auth.users for each row execute function fc_private.guard_auth_identity_change();
commit;
