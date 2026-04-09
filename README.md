# HSBMS — Home Service Booking & Management System

Web application for booking home services, managing jobs as a provider, and operating an admin console. Built as a **Next.js** (App Router) client with **Supabase** (Postgres, Auth, Row Level Security, Edge Functions).

## Architecture

| Layer | Technology |
|--------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Backend | Supabase Postgres + PostgREST |
| Auth | Supabase Auth (`auth.users`); profiles in `public.users` |
| Server logic | Supabase Edge Functions (Deno) where noted |
| PWA | `@ducanh2912/next-pwa` (see `next.config`) |

The browser talks to Supabase with the **anon (or publishable) key** and the signed-in user’s JWT. RLS policies enforce who can read or write which rows. Edge Functions use the **service role** only after validating the user JWT.

## User roles

| Role | Home route | Purpose |
|------|------------|---------|
| `user` | `/dashboard` | Browse services, book, pay flow, history, reminders, referrals, support |
| `provider` | `/provider` | See assigned jobs, update status, earnings, feedback |
| `admin` | `/admin` | Users, providers, bookings, tickets, referrals |

Role is stored in **`public.users.role`** (authoritative). On sign-up, `auth.raw_user_meta_data.role` is copied by the `handle_new_user` trigger. The app calls **`sync_provider_role_from_auth`** to align `public.users` with auth metadata when a provider profile was still stored as `user`. **Admin is never inferred from client metadata alone.**

## Main features

### Customer (`user`)

- **Dashboard** — Greeting, upcoming booking, category shortcuts, link to booking flow.
- **Booking** — Category filter, service dropdown, calendar, time window, duration, add-ons, pricing breakdown, confirm → creates a `bookings` row (with `extras` JSON when the column exists).
- **Pricing** — Loads the new booking (by `bookingId` query param), shows line items, **Confirm & Pay** sets status to `confirmed`.
- **History** — `service_history` joined to bookings and services; filters by category (All, AC Repair, Plumbing, Cleaning, Pest Control, Beauty).
- **Reminders** — User reminders; **Refresh predictions** calls the **`predict-reminders`** Edge Function to insert `source = 'predicted'` rows from completed work and category intervals. Toggle **auto reminders** persists to `users.preferences`.
- **Referrals** — Referral code, share link, stats, activity, trusted providers list. **Booked** count uses RPC **`referral_booked_referee_count`** (avoids RLS leaks on other users’ bookings).
- **Support** — Submit `issued_reports` (optional file note in text).
- **Profile / referrals entry** — Links from profile stack.

### Provider (`provider`)

- **Schedule** — Active job, status progression, maps shortcut, assigned list.
- **Earnings / Feedback / Profile** — Completed jobs, tickets tied to provider bookings, skills and rating.

RLS allows providers to **select/update bookings** where `provider_id` matches their `service_providers` row, and to **read customer names** only for those bookings.

### Admin (`admin`)

- Tabs: overview, tickets, users (role editor), providers, bookings, referrals.
- Prefers **`admin-snapshot`** Edge Function; falls back to direct queries if the function is not deployed.
- **Sign out** clears the session.

## Database (high level)

Core tables include: `users`, `services`, `service_providers`, `bookings` (optional `extras` jsonb), `service_history`, `reminders` (`user_id`, `source`, `prediction_meta`), `referrals`, `issued_reports`.

Important pieces:

- **`is_admin()`** — `SECURITY DEFINER` helper so admin RLS policies do not recurse on `public.users`.
- **Provider policies** on `bookings`, `users` (customer names), `issued_reports`.
- **RPCs** — `referral_booked_referee_count`, `sync_provider_role_from_auth`.

Apply schema and seeds either by running migrations with the Supabase CLI or by executing **`supabase/one_shot_apply.sql`** in the SQL Editor (full idempotent bundle for this project).

## Edge Functions

| Function | Purpose |
|----------|---------|
| `predict-reminders` | Rebuilds predicted reminders for the current user from completed bookings / history. |
| `admin-snapshot` | Returns aggregated admin datasets using the service role after verifying admin in `public.users`. |

Deploy (replace project ref):

```bash
npx supabase functions deploy predict-reminders admin-snapshot --project-ref YOUR_PROJECT_REF
```

Hosted Supabase injects URL, anon key, and service role into the function environment.

## Local setup

1. **Clone and install**

   ```bash
   cd hsbms
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env.local` and set:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` if you use the publishable key)

   Do **not** put the service role key in client-only env vars for normal browsing.

3. **Database**

   Create a Supabase project, run migrations from `supabase/migrations/` in order, **or** run `supabase/one_shot_apply.sql` once in the SQL Editor.

4. **Edge Functions**

   Deploy both functions to the same project (see above).

5. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Demo seed

`supabase/migrations/20260115000001_seed_test_accounts.sql` (and the matching section in `one_shot_apply.sql`) set roles and sample data **only if** the listed emails exist in `auth.users`. Adjust emails in SQL to match your test accounts.

Bookings tagged in **`extras`** with `"hsbms_seed":"rich_history"` (see `20260119000000_seed_rich_history.sql`) populate **Past Services** for demo history.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |

## Project layout (abbreviated)

```
app/           # Routes (dashboard, booking, pricing, history, reminders, referrals, admin, provider, …)
components/    # Shared UI (e.g. MobileFrame, BottomNav)
lib/           # Catalog, pricing helpers, Supabase helpers, role routing
utils/supabase/# Supabase client + middleware
supabase/
  migrations/  # Ordered SQL migrations
  functions/   # Edge Functions
  one_shot_apply.sql  # Single-file apply for SQL Editor
```

## Security notes

- RLS is required for multi-tenant safety; do not expose the service role to the browser.
- Admin actions in the UI assume the signed-in user’s `public.users.role` is `admin` (and the snapshot function double-checks server-side).

## License

Use and modify per your course or team policy.
