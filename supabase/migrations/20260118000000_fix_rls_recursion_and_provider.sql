-- Admin policies used "EXISTS (SELECT ... FROM users ...)" on public.users, which re-evaluates
-- RLS on users and causes infinite recursion / 500s from PostgREST.
-- Providers had no SELECT/UPDATE on bookings by provider_id, so provider dashboard broke.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;

-- Users: replace admin policies
drop policy if exists "Admins can read all users" on public.users;
create policy "Admins can read all users"
  on public.users for select
  using (public.is_admin());

drop policy if exists "Admins can update user roles" on public.users;
create policy "Admins can update user roles"
  on public.users for update
  using (public.is_admin());

-- Bookings: admin + provider
drop policy if exists "Admins can read all bookings" on public.bookings;
create policy "Admins can read all bookings"
  on public.bookings for select
  using (public.is_admin());

drop policy if exists "Admins can update bookings" on public.bookings;
create policy "Admins can update bookings"
  on public.bookings for update
  using (public.is_admin());

drop policy if exists "Providers read assigned bookings" on public.bookings;
create policy "Providers read assigned bookings"
  on public.bookings for select
  using (
    exists (
      select 1 from public.service_providers sp
      where sp.id = bookings.provider_id and sp.user_id = auth.uid()
    )
  );

drop policy if exists "Providers update assigned bookings" on public.bookings;
create policy "Providers update assigned bookings"
  on public.bookings for update
  using (
    exists (
      select 1 from public.service_providers sp
      where sp.id = bookings.provider_id and sp.user_id = auth.uid()
    )
  );

-- Let providers embed customer name on assigned jobs
drop policy if exists "Providers read customers on assigned bookings" on public.users;
create policy "Providers read customers on assigned bookings"
  on public.users for select
  using (
    exists (
      select 1 from public.bookings b
      join public.service_providers sp on sp.id = b.provider_id and sp.user_id = auth.uid()
      where b.user_id = users.id
    )
  );

-- Issued reports: admin policies + provider read for their jobs
drop policy if exists "Admins can read all issued reports" on public.issued_reports;
create policy "Admins can read all issued reports"
  on public.issued_reports for select
  using (public.is_admin());

drop policy if exists "Admins can update issued reports" on public.issued_reports;
create policy "Admins can update issued reports"
  on public.issued_reports for update
  using (public.is_admin());

drop policy if exists "Providers read reports for assigned bookings" on public.issued_reports;
create policy "Providers read reports for assigned bookings"
  on public.issued_reports for select
  using (
    booking_id is not null
    and exists (
      select 1 from public.bookings b
      join public.service_providers sp on sp.id = b.provider_id and sp.user_id = auth.uid()
      where b.id = issued_reports.booking_id
    )
  );

-- Service providers + referrals admin policies
drop policy if exists "Admins can manage service providers" on public.service_providers;
create policy "Admins can manage service providers"
  on public.service_providers for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins read referrals" on public.referrals;
create policy "Admins read referrals"
  on public.referrals for select
  using (public.is_admin());

-- Demo roles (re-apply if something reset them)
update public.users u
set role = 'admin'
from auth.users a
where u.id = a.id and lower(a.email) = lower('manav139@gmail.com');

update public.users u
set role = 'provider'
from auth.users a
where u.id = a.id and lower(a.email) = lower('manav13p@gmail.com');

update public.users u
set role = 'user'
from auth.users a
where u.id = a.id and lower(a.email) = lower('km1@somaiya.edu');

insert into public.service_providers (user_id, skills, rating)
select u.id, 'AC repair, plumbing, deep cleaning', 4.7
from auth.users u
where lower(u.email) = lower('manav13p@gmail.com')
  and not exists (select 1 from public.service_providers sp where sp.user_id = u.id);
