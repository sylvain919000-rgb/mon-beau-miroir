-- =========================================================
-- MON BEAU MIROIR - MIGRATION 0003
-- Stripe billing plumbing. Additive only.
-- =========================================================

-- One Stripe customer per user, created lazily at first purchase.
alter table public.profiles
  add column stripe_customer_id text unique;

-- Users must never set their own Stripe customer id (or their 18+ flag
-- retroactively matters less, but principle: least privilege). Replace the
-- broad UPDATE grant with an explicit column list.
revoke update on public.profiles from authenticated, anon;
grant update (username, display_name, is_over_18, tos_accepted_at)
  on public.profiles to authenticated;

-- Webhook idempotency ledger: every Stripe event id is recorded before it
-- is processed. A replayed event hits the primary key and grants nothing.
create table public.processed_stripe_events (
  id text primary key,          -- Stripe event id, e.g. evt_...
  created_at timestamptz not null default now()
);
alter table public.processed_stripe_events enable row level security;
-- No policies: only the service role (which bypasses RLS) touches this.
