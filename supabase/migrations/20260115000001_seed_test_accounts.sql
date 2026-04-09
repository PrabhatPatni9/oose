-- Demo seed data: run after the listed accounts exist in auth.users.
-- Emails: km1@somaiya.edu (user), manav13p@gmail.com (provider), manav139@gmail.com (admin)

-- Roles in public.users (source of truth for admin console + RLS)
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

-- Ensure provider profile for manav13p@gmail.com
insert into public.service_providers (user_id, skills, rating)
select u.id, 'AC repair, plumbing, deep cleaning', 4.7
from auth.users u
where lower(u.email) = lower('manav13p@gmail.com')
  and not exists (
    select 1 from public.service_providers sp where sp.user_id = u.id
  );

-- Clean orphan reminders without user (prevents empty RLS results)
delete from public.reminders where user_id is null;

-- Referrals: km1 referred by manav13p (example program chain) — optional; skip if users missing
insert into public.referrals (referrer_id, referee_id)
select r.id, f.id
from auth.users r
cross join auth.users f
where lower(r.email) = lower('manav13p@gmail.com')
  and lower(f.email) = lower('km1@somaiya.edu')
  and not exists (select 1 from public.referrals x where x.referee_id = f.id)
on conflict (referee_id) do nothing;

-- Bookings for km1 (mix of statuses) assigned to manav13p when possible
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
    where lower(au.email) = lower('manav13p@gmail.com')
    limit 1;
  select id into sid_clean from public.services where name = 'Deep Home Cleaning' limit 1;
  select id into sid_ac from public.services where name = 'AC Servicing' limit 1;

  if uid_km is null then
    raise notice 'Skip booking seed: km1@somaiya.edu not found in auth.users';
    return;
  end if;

  if sid_clean is null then sid_clean := 1; end if;
  if sid_ac is null then sid_ac := 2; end if;

  insert into public.bookings (user_id, service_id, provider_id, scheduled_time, status, extras)
  select uid_km, sid_clean, pid, now() + interval '3 days', 'pending',
    '{"pricing_version":1,"total":70}'::jsonb
  where not exists (
    select 1 from public.bookings b where b.user_id = uid_km and b.status = 'pending'
  );

  insert into public.bookings (user_id, service_id, provider_id, scheduled_time, status, extras)
  select uid_km, sid_ac, pid, now() - interval '20 days', 'completed',
    '{"pricing_version":1,"total":95}'::jsonb
  where not exists (
    select 1 from public.bookings b where b.user_id = uid_km and b.status = 'completed'
  );
end $$;

-- Service history + reminders for predictive UI (km1)
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
  where b.user_id = uid_km and b.status = 'completed'
  order by b.scheduled_time desc limit 1;

  if bid is not null then
    insert into public.service_history (booking_id, completion_date, notes)
    select bid, now() - interval '18 days', 'AC tune-up completed — filters replaced'
    where not exists (select 1 from public.service_history sh where sh.booking_id = bid);
  end if;

  insert into public.reminders (user_id, booking_id, service_id, reminder_date, source, prediction_meta)
  select uid_km, null, sid_ac, now() + interval '75 days', 'predicted',
    jsonb_build_object(
      'reason', 'interval',
      'category', 'AC Repair',
      'interval_days', 120,
      'confidence', 'high',
      'explanation', 'Last AC service was ~18 days ago; typical preventive cycle is 120 days.'
    )
  where not exists (
    select 1 from public.reminders r
    where r.user_id = uid_km and r.source = 'predicted' and r.service_id = sid_ac
  );

  insert into public.reminders (user_id, booking_id, service_id, reminder_date, source, prediction_meta)
  select uid_km, null, (select id from public.services where name = 'Deep Home Cleaning' limit 1),
    now() + interval '45 days', 'predicted',
    jsonb_build_object(
      'reason', 'seasonal',
      'category', 'Cleaning',
      'interval_days', 90,
      'confidence', 'medium',
      'explanation', 'Deep cleaning is usually repeated every ~90 days for occupied homes.'
    )
  where exists (select 1 from public.services where name = 'Deep Home Cleaning')
    and not exists (
      select 1 from public.reminders r
      where r.user_id = uid_km and r.source = 'predicted'
        and r.service_id = (select id from public.services where name = 'Deep Home Cleaning' limit 1)
    );
end $$;

-- Sample support ticket (visible to admin)
insert into public.issued_reports (booking_id, description, status)
select null, 'Demo ticket: test admin workflow from seeded data.', 'open'
where not exists (
  select 1 from public.issued_reports where description like 'Demo ticket:%'
);
