-- is_admin() read public.users under RLS; policies on users also call is_admin() → infinite recursion.
-- This definition turns row security off for the internal SELECT only (still SECURITY DEFINER).

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);
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
