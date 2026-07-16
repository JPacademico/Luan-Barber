-- Luan Studio Barber — Supabase schema.
--
-- Run once in the Supabase SQL editor (or `supabase db` migration). After this, set
-- VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and the app switches from per-device localStorage
-- to shared cross-device sync automatically.
--
-- SECURITY NOTE: the policies below are open (anon can read/write) to match the app's current
-- no-login model — the same trust level as the previous localStorage build, just shared. Before a
-- real launch, tighten these: gate writes behind Supabase Auth and restrict the admin-only columns
-- (status, is_paid, cancelled_at) to an authenticated barber role.

-- ------------------------------------------------------------------------------------------------
-- Bookings
-- ------------------------------------------------------------------------------------------------
create table if not exists public.bookings (
  id                  uuid primary key,
  client_name         text        not null,
  client_email        text        not null,
  client_phone        text        not null,
  service_id          text        not null,
  duration_minutes    integer     not null default 30,
  date                date        not null,
  time                text        not null,          -- "HH:mm"
  created_at          timestamptz not null default now(),
  payment_method      text        not null default 'local',
  is_paid             boolean     not null default false,
  payment_claimed_at  timestamptz,
  status              text        not null default 'active',
  completed_at        timestamptz,
  cancelled_at        timestamptz,
  cancellation_reason text
);

-- Fast lookup of a day's agenda (the app queries and sorts by date/time constantly).
create index if not exists bookings_date_time_idx on public.bookings (date, time);

-- Prevents two active bookings from claiming the exact same start slot. Overlap from longer
-- services is still enforced client-side; a stricter exclusion constraint could be added later.
create unique index if not exists bookings_active_slot_uniq
  on public.bookings (date, time)
  where status = 'active';

-- ------------------------------------------------------------------------------------------------
-- Per-date schedule overrides (closed days / reduced hours)
-- ------------------------------------------------------------------------------------------------
create table if not exists public.day_overrides (
  date        date    primary key,
  is_closed   boolean not null default false,
  start_hour  integer,
  end_hour    integer
);

-- ------------------------------------------------------------------------------------------------
-- Row Level Security — open for the demo, see the note above.
-- ------------------------------------------------------------------------------------------------
alter table public.bookings      enable row level security;
alter table public.day_overrides enable row level security;

-- RLS decides row visibility, but the anon role also needs table-level privileges. Supabase
-- normally grants these to new public tables by default; granting explicitly removes all doubt.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.bookings      to anon, authenticated;
grant select, insert, update, delete on public.day_overrides to anon, authenticated;

-- Policies are recreated idempotently so re-running this file never errors on "already exists".
drop policy if exists "demo_public_bookings"  on public.bookings;
drop policy if exists "demo_public_overrides" on public.day_overrides;

create policy "demo_public_bookings"  on public.bookings
  for all to anon, authenticated using (true) with check (true);
create policy "demo_public_overrides" on public.day_overrides
  for all to anon, authenticated using (true) with check (true);

-- ------------------------------------------------------------------------------------------------
-- Yearly retention: drop last year's history so the log resets each January (the client already
-- hides it from view). Schedule with pg_cron, or run manually.
--   select cron.schedule('luan-purge', '0 3 1 1 *',
--     $$ delete from public.bookings where date < date_trunc('year', now()); $$);
-- ------------------------------------------------------------------------------------------------
