-- =========================================================
-- MON BEAU MIROIR - MIGRATION 0004
-- Admin role + moderation audit trail. Additive only.
-- =========================================================

-- Admin flag. IMPORTANT: this column is intentionally NOT in the
-- column-level UPDATE grant from migration 0003, so users can never
-- promote themselves. Set it manually (SQL editor) or via service role:
--   update public.profiles set is_admin = true where username = '...';
alter table public.profiles
  add column is_admin boolean not null default false;

-- Every admin moderation decision is recorded forever.
create table public.moderation_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  photo_id uuid references public.photos(id) on delete set null,
  report_id uuid references public.reports(id) on delete set null,
  action text not null check (char_length(action) <= 100),
  created_at timestamptz not null default now()
);
alter table public.moderation_audit enable row level security;
-- No policies: only the service role (admin server actions) writes/reads.
