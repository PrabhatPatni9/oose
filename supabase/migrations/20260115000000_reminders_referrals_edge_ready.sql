-- Referral codes + user preferences (predictive reminders toggle stored server-side)
alter table public.users
  add column if not exists referral_code text unique,
  add column if not exists preferences jsonb not null default '{"auto_reminders": true}'::jsonb;

-- Backfill referral codes for existing users
update public.users u
set referral_code = 'HSBMS-' || upper(substr(replace(u.id::text, '-', ''), 1, 8))
where referral_code is null;

-- Reminders: scope to user + prediction metadata
alter table public.reminders
  add column if not exists user_id uuid references public.users(id) on delete cascade,
  add column if not exists source text not null default 'manual' check (source in ('manual', 'predicted')),
  add column if not exists prediction_meta jsonb not null default '{}'::jsonb;

update public.reminders r
set user_id = b.user_id
from public.bookings b
where r.booking_id = b.id and r.user_id is null;

-- At most one referral row per referee
alter table public.referrals
  drop constraint if exists referrals_referee_unique;
alter table public.referrals
  add constraint referrals_referee_unique unique (referee_id);

-- Replace signup handler: stable referral code + optional referred_by from auth metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  ref_code text;
  ref_uid uuid;
  new_code text;
begin
  new_code := 'HSBMS-' || upper(substr(replace(new.id::text, '-', ''), 1, 8));

  insert into public.users (id, name, email, role, referral_code, preferences)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'user'),
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

-- Reminders RLS: replace broad policy with user-scoped rules
drop policy if exists "Users can manage own reminders" on public.reminders;

create policy "Users read own reminders"
  on public.reminders for select
  using (auth.uid() = user_id);

create policy "Users insert own reminders"
  on public.reminders for insert
  with check (auth.uid() = user_id);

create policy "Users update own reminders"
  on public.reminders for update
  using (auth.uid() = user_id);

create policy "Users delete own reminders"
  on public.reminders for delete
  using (auth.uid() = user_id);

delete from public.reminders where user_id is null;

create policy "Admins read referrals"
  on public.referrals for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- Service role / edge functions bypass RLS; clients use Edge Function with user JWT for writes
