-- Aligns public.users.role with auth.users.raw_user_meta_data.role when the profile is still user but metadata is provider.
-- SECURITY DEFINER; only promotes user -> provider. Does not grant admin from metadata.

create or replace function public.sync_provider_role_from_auth()
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  want text;
  cur text;
begin
  select lower(trim(coalesce(raw_user_meta_data->>'role', ''))) into want
  from auth.users
  where id = auth.uid();

  if want is null or want = '' then
    want := 'user';
  end if;
  if want not in ('user', 'provider', 'admin') then
    want := 'user';
  end if;

  select u.role into cur from public.users u where u.id = auth.uid();
  if cur is null then
    return 'missing_profile';
  end if;

  if cur = 'user' and want = 'provider' then
    update public.users set role = 'provider' where id = auth.uid();
    return 'updated_to_provider';
  end if;

  return coalesce(cur, 'user');
end;
$$;

revoke all on function public.sync_provider_role_from_auth() from public;
grant execute on function public.sync_provider_role_from_auth() to authenticated;
