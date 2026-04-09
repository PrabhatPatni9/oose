-- Ensure public.users.role always matches check constraint and signup tab (Provider / User / Admin).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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
