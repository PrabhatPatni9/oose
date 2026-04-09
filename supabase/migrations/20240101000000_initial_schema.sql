-- HSBMS Initial Schema
-- Matches the class diagram entities exactly

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extends Supabase Auth users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'user' check (role in ('user', 'provider', 'admin')),
  created_at timestamptz not null default now()
);

-- Services table
create table if not exists public.services (
  id serial primary key,
  name text not null,
  category text not null,
  base_price float not null default 0,
  created_at timestamptz not null default now()
);

-- Service Providers table
create table if not exists public.service_providers (
  id serial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  skills text not null default '',
  rating float not null default 0,
  created_at timestamptz not null default now()
);

-- Bookings table (central join)
create table if not exists public.bookings (
  id serial primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  service_id int references public.services(id),
  provider_id int references public.service_providers(id),
  scheduled_time timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Service History table
create table if not exists public.service_history (
  id serial primary key,
  booking_id int not null references public.bookings(id) on delete cascade,
  completion_date timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

-- Reminders table
create table if not exists public.reminders (
  id serial primary key,
  booking_id int references public.bookings(id) on delete cascade,
  service_id int references public.services(id),
  reminder_date timestamptz not null,
  created_at timestamptz not null default now()
);

-- Referrals table
create table if not exists public.referrals (
  id serial primary key,
  referrer_id uuid not null references public.users(id) on delete cascade,
  referee_id uuid references public.users(id),
  provider_rank int default 0,
  created_at timestamptz not null default now()
);

-- Issued Reports table
create table if not exists public.issued_reports (
  id serial primary key,
  booking_id int references public.bookings(id) on delete cascade,
  description text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);

-- Seed default services
insert into public.services (name, category, base_price) values
  ('Deep Home Cleaning', 'Cleaning', 50.00),
  ('AC Servicing', 'AC Repair', 80.00),
  ('Plumbing Repair', 'Plumbing', 60.00),
  ('Pest Control', 'Pest Control', 70.00),
  ('Beauty Services', 'Beauty', 40.00),
  ('HVAC Maintenance', 'AC Repair', 90.00)
on conflict do nothing;

-- Row Level Security
alter table public.users enable row level security;
alter table public.bookings enable row level security;
alter table public.service_history enable row level security;
alter table public.reminders enable row level security;
alter table public.referrals enable row level security;
alter table public.issued_reports enable row level security;
alter table public.services enable row level security;
alter table public.service_providers enable row level security;

-- RLS Policies
-- Services: anyone can read
create policy "Services are publicly readable"
  on public.services for select using (true);

-- Users: own row only
create policy "Users can read own profile"
  on public.users for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.users for insert with check (auth.uid() = id);

-- Bookings: own bookings
create policy "Users can read own bookings"
  on public.bookings for select using (auth.uid() = user_id);
create policy "Users can insert own bookings"
  on public.bookings for insert with check (auth.uid() = user_id);

-- Service History: own history
create policy "Users can read own history"
  on public.service_history for select using (
    exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid())
  );

-- Reminders: own reminders
create policy "Users can manage own reminders"
  on public.reminders for all using (
    booking_id is null or exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid())
  );

-- Issued Reports: own reports
create policy "Users can manage own reports"
  on public.issued_reports for all using (
    booking_id is null or exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid())
  );

-- Referrals: own referrals
create policy "Users can manage own referrals"
  on public.referrals for all using (auth.uid() = referrer_id);

-- Service Providers: public read, own write
create policy "Service providers are publicly readable"
  on public.service_providers for select using (true);
create policy "Providers can update own profile"
  on public.service_providers for all using (auth.uid() = user_id);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Allow providers to update booking status
create policy "Providers can update assigned bookings"
  on public.bookings for update using (
    exists (
      select 1 from public.service_providers sp
      where sp.id = provider_id and sp.user_id = auth.uid()
    )
  );
