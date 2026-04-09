-- Paste into Supabase Dashboard → SQL Editor → Run (fixes "infinite recursion detected in policy for relation users").
-- Project in this repo: ref xadjqqqxlpbuojjkfnoi — confirm Vercel NEXT_PUBLIC_SUPABASE_URL matches that host.

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
begin
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' then
    return true;
  end if;

  return exists (
    select 1
    from public.users
    where id = auth.uid() and role = 'admin'
  );
end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;
