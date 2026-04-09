-- =============================================================================
-- HSBMS consolidated schema + policies + seeds. Run in Supabase SQL Editor (or apply migrations).
-- Idempotent sections use DROP IF EXISTS / tagged seed rows where noted.
-- =============================================================================

-- --- is_admin() avoids RLS recursion on public.users (EXISTS subquery on users caused 500s) ---
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

-- --- 20260110000000_booking_extras_admin_rls (idempotent policies) ---
alter table public.bookings
  add column if not exists extras jsonb not null default '{}'::jsonb;

drop policy if exists "Admins can read all users" on public.users;
create policy "Admins can read all users"
  on public.users for select
  using (public.is_admin());

drop policy if exists "Admins can update user roles" on public.users;
create policy "Admins can update user roles"
  on public.users for update
  using (public.is_admin());

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

drop policy if exists "Admins can manage service providers" on public.service_providers;
create policy "Admins can manage service providers"
  on public.service_providers for all
  using (public.is_admin())
  with check (public.is_admin());

-- --- 20260115000000_reminders_referrals_edge_ready ---
alter table public.users
  add column if not exists referral_code text,
  add column if not exists preferences jsonb not null default '{"auto_reminders": true}'::jsonb;

do $$
begin
  alter table public.users add constraint users_referral_code_unique unique (referral_code);
exception
  when duplicate_object then null;
  when unique_violation then null;
end $$;

update public.users u
set referral_code = 'HSBMS-' || upper(substr(replace(u.id::text, '-', ''), 1, 8))
where referral_code is null;

alter table public.reminders
  add column if not exists user_id uuid references public.users(id) on delete cascade,
  add column if not exists source text not null default 'manual',
  add column if not exists prediction_meta jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public' and t.relname = 'reminders' and c.conname = 'reminders_source_check'
  ) then
    alter table public.reminders add constraint reminders_source_check check (source in ('manual', 'predicted'));
  end if;
end $$;

update public.reminders r
set user_id = b.user_id
from public.bookings b
where r.booking_id = b.id and r.user_id is null;

alter table public.referrals drop constraint if exists referrals_referee_unique;
alter table public.referrals add constraint referrals_referee_unique unique (referee_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  ref_code text;
  ref_uid uuid;
  new_code text;
  chosen_role text;
begin
  new_code := 'HSBMS-' || upper(substr(replace(new.id::text, '-', ''), 1, 8));

  chosen_role := lower(trim(coalesce(new.raw_user_meta_data->>'role', 'user')));
  if chosen_role not in ('user', 'provider', 'admin') then
    chosen_role := 'user';
  end if;

  insert into public.users (id, name, email, role, referral_code, preferences)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    chosen_role,
    new_code,
    '{"auto_reminders": true}'::jsonb
  );

  ref_code := new.raw_user_meta_data->>'referred_by';
  if ref_code is not null and length(trim(ref_code)) > 0 then
    select id into ref_uid from public.users where referral_code = trim(ref_code) limit 1;
    if ref_uid is not null and ref_uid <> new.id then
      insert into public.referrals (referrer_id, referee_id)
      values (ref_uid, new.id)
      on conflict (referee_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop policy if exists "Users can manage own reminders" on public.reminders;
drop policy if exists "Users read own reminders" on public.reminders;
drop policy if exists "Users insert own reminders" on public.reminders;
drop policy if exists "Users update own reminders" on public.reminders;
drop policy if exists "Users delete own reminders" on public.reminders;

create policy "Users read own reminders"
  on public.reminders for select using (auth.uid() = user_id);
create policy "Users insert own reminders"
  on public.reminders for insert with check (auth.uid() = user_id);
create policy "Users update own reminders"
  on public.reminders for update using (auth.uid() = user_id);
create policy "Users delete own reminders"
  on public.reminders for delete using (auth.uid() = user_id);

delete from public.reminders where user_id is null;

drop policy if exists "Admins read referrals" on public.referrals;
create policy "Admins read referrals"
  on public.referrals for select
  using (public.is_admin());

-- --- 20260115000001_seed_test_accounts ---
update public.users u set role = 'admin'
from auth.users a where u.id = a.id and lower(a.email) = lower('manav139@gmail.com');
update public.users u set role = 'provider'
from auth.users a where u.id = a.id and lower(a.email) = lower('manav13p@gmail.com');
update public.users u set role = 'user'
from auth.users a where u.id = a.id and lower(a.email) = lower('km1@somaiya.edu');

insert into public.service_providers (user_id, skills, rating)
select u.id, 'AC repair, plumbing, deep cleaning', 4.7
from auth.users u
where lower(u.email) = lower('manav13p@gmail.com')
  and not exists (select 1 from public.service_providers sp where sp.user_id = u.id);

delete from public.reminders where user_id is null;

insert into public.referrals (referrer_id, referee_id)
select r.id, f.id
from auth.users r cross join auth.users f
where lower(r.email) = lower('manav13p@gmail.com')
  and lower(f.email) = lower('km1@somaiya.edu')
  and not exists (select 1 from public.referrals x where x.referee_id = f.id)
on conflict (referee_id) do nothing;

do $$
declare
  uid_km uuid;
  pid int;
  sid_clean int;
  sid_ac int;
begin
  select id into uid_km from auth.users where lower(email) = lower('km1@somaiya.edu');
  select sp.id into pid from public.service_providers sp
    join auth.users au on au.id = sp.user_id
    where lower(au.email) = lower('manav13p@gmail.com') limit 1;
  select id into sid_clean from public.services where name = 'Deep Home Cleaning' limit 1;
  select id into sid_ac from public.services where name = 'AC Servicing' limit 1;
  if uid_km is null then raise notice 'Skip booking seed: km1@somaiya.edu not in auth.users'; return; end if;
  if sid_clean is null then sid_clean := 1; end if;
  if sid_ac is null then sid_ac := 2; end if;
  insert into public.bookings (user_id, service_id, provider_id, scheduled_time, status, extras)
  select uid_km, sid_clean, pid, now() + interval '3 days', 'pending', '{"pricing_version":1,"total":70}'::jsonb
  where not exists (select 1 from public.bookings b where b.user_id = uid_km and b.status = 'pending');
  insert into public.bookings (user_id, service_id, provider_id, scheduled_time, status, extras)
  select uid_km, sid_ac, pid, now() - interval '20 days', 'completed', '{"pricing_version":1,"total":95}'::jsonb
  where not exists (select 1 from public.bookings b where b.user_id = uid_km and b.status = 'completed');
end $$;

do $$
declare
  uid_km uuid;
  bid int;
  sid_ac int;
begin
  select id into uid_km from auth.users where lower(email) = lower('km1@somaiya.edu');
  select id into sid_ac from public.services where name = 'AC Servicing' limit 1;
  if uid_km is null then return; end if;
  if sid_ac is null then sid_ac := 2; end if;
  select b.id into bid from public.bookings b
  where b.user_id = uid_km and b.status = 'completed' order by b.scheduled_time desc limit 1;
  if bid is not null then
    insert into public.service_history (booking_id, completion_date, notes)
    select bid, now() - interval '18 days', 'AC tune-up completed — filters replaced'
    where not exists (select 1 from public.service_history sh where sh.booking_id = bid);
  end if;
  insert into public.reminders (user_id, booking_id, service_id, reminder_date, source, prediction_meta)
  select uid_km, null, sid_ac, now() + interval '75 days', 'predicted',
    jsonb_build_object('reason','interval','category','AC Repair','interval_days',120,'confidence','high',
      'explanation','Last AC service was ~18 days ago; typical preventive cycle is 120 days.')
  where not exists (select 1 from public.reminders r where r.user_id = uid_km and r.source = 'predicted' and r.service_id = sid_ac);
  insert into public.reminders (user_id, booking_id, service_id, reminder_date, source, prediction_meta)
  select uid_km, null, (select id from public.services where name = 'Deep Home Cleaning' limit 1), now() + interval '45 days', 'predicted',
    jsonb_build_object('reason','seasonal','category','Cleaning','interval_days',90,'confidence','medium',
      'explanation','Deep cleaning is usually repeated every ~90 days for occupied homes.')
  where exists (select 1 from public.services where name = 'Deep Home Cleaning')
    and not exists (select 1 from public.reminders r where r.user_id = uid_km and r.source = 'predicted'
      and r.service_id = (select id from public.services where name = 'Deep Home Cleaning' limit 1));
end $$;

insert into public.issued_reports (booking_id, description, status)
select null, 'Demo ticket: test admin workflow from seeded data.', 'open'
where not exists (select 1 from public.issued_reports where description like 'Demo ticket:%');

-- --- 20260119000000_seed_rich_history (Past Services + lived-in data) ---
do $$
declare
  rec record;
  v_uid uuid;
  v_sid int;
  v_bid int;
  v_sched timestamptz;
  pid int;
begin
  select sp.id into pid
  from public.service_providers sp
  join auth.users au on au.id = sp.user_id
  where lower(au.email) = lower('manav13p@gmail.com')
  limit 1;

  delete from public.service_history sh
  using public.bookings b
  where sh.booking_id = b.id
    and coalesce(b.extras->>'hsbms_seed', '') = 'rich_history';

  delete from public.bookings
  where coalesce(extras->>'hsbms_seed', '') = 'rich_history';

  for rec in
    select * from (
      values
        ('km1@somaiya.edu'::text, 'AC Servicing'::text, 200, 'Pre-season AC service — coils cleaned and refrigerant checked.'::text),
        ('km1@somaiya.edu', 'Deep Home Cleaning', 120, 'Post-renovation deep clean; windows and baseboards done.'),
        ('km1@somaiya.edu', 'Plumbing Repair', 75, 'Kitchen trap replacement; no leaks since visit.'),
        ('km1@somaiya.edu', 'AC Servicing', 48, 'Mid-season tune-up — filters swapped, airflow balanced.'),
        ('km1@somaiya.edu', 'Deep Home Cleaning', 17, 'Living room + kitchen focus clean before family visit.'),
        ('km1@somaiya.edu', 'Pest Control', 92, 'Quarterly perimeter spray — warranty note on file.'),
        ('km1@somaiya.edu', 'HVAC Maintenance', 300, 'Annual system inspection — belts and motor OK.'),
        ('manav13p@gmail.com', 'Beauty Services', 40, 'Hair and styling package — corporate event prep.'),
        ('manav13p@gmail.com', 'Deep Home Cleaning', 9, 'Guest-ready refresh; same-day slot.'),
        ('manav139@gmail.com', 'AC Servicing', 35, 'Admin account: home unit serviced — noise resolved.')
    ) as t(email, service_name, days_ago, hist_note)
  loop
    select au.id into v_uid from auth.users au where lower(au.email) = lower(rec.email);
    select sv.id into v_sid from public.services sv where sv.name = rec.service_name limit 1;
    continue when v_uid is null or v_sid is null;
    v_sched := now() - (rec.days_ago * interval '1 day');
    insert into public.bookings (user_id, service_id, provider_id, scheduled_time, status, extras)
    values (
      v_uid,
      v_sid,
      pid,
      v_sched,
      'completed',
      jsonb_build_object('hsbms_seed', 'rich_history', 'total', 85, 'pricing_version', 1)
    )
    returning id into v_bid;
    insert into public.service_history (booking_id, completion_date, notes)
    values (v_bid, v_sched + interval '3 hours', rec.hist_note);
  end loop;
end $$;

-- --- 20260116000000_referral_booked_count_rpc ---
create or replace function public.referral_booked_referee_count(p_referrer uuid)
returns integer language plpgsql security definer set search_path = public stable as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_referrer then
    raise exception 'forbidden';
  end if;
  return coalesce((
    select count(distinct b.user_id)::integer
    from public.referrals r
    join public.bookings b on b.user_id = r.referee_id and b.status = 'completed'
    where r.referrer_id = p_referrer
  ), 0);
end;
$$;
grant execute on function public.referral_booked_referee_count(uuid) to authenticated;

-- --- 20260120000000_sync_provider_role_rpc ---
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
  if want is null or want = '' then want := 'user'; end if;
  if want not in ('user', 'provider', 'admin') then want := 'user'; end if;
  select u.role into cur from public.users u where u.id = auth.uid();
  if cur is null then return 'missing_profile'; end if;
  if cur = 'user' and want = 'provider' then
    update public.users set role = 'provider' where id = auth.uid();
    return 'updated_to_provider';
  end if;
  return coalesce(cur, 'user');
end;
$$;
revoke all on function public.sync_provider_role_from_auth() from public;
grant execute on function public.sync_provider_role_from_auth() to authenticated;

-- =============================================================================
-- Next: Edge Functions (Dashboard → Edge Functions, or CLI as project owner):
--   npx supabase login
--   npx supabase functions deploy admin-snapshot --project-ref xadjqqqxlpbuojjkfnoi
--   npx supabase functions deploy predict-reminders --project-ref xadjqqqxlpbuojjkfnoi
-- =============================================================================
