-- Referrers cannot read referees' bookings under RLS; expose a safe aggregate for the referrals UI.
create or replace function public.referral_booked_referee_count(p_referrer uuid)
returns integer
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if auth.uid() is null or auth.uid() is distinct from p_referrer then
    raise exception 'forbidden';
  end if;

  return coalesce(
    (
      select count(distinct b.user_id)::integer
      from public.referrals r
      join public.bookings b on b.user_id = r.referee_id and b.status = 'completed'
      where r.referrer_id = p_referrer
    ),
    0
  );
end;
$$;

grant execute on function public.referral_booked_referee_count(uuid) to authenticated;
