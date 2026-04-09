-- Rich service_history + completed bookings so Past Services / filters feel "lived in".
-- Idempotent: removes prior rows tagged extras.hsbms_seed = 'rich_history' then reinserts.

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
