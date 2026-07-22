-- =========================================================
-- MON BEAU MIROIR - SCHEMA v1
-- Run once in the Supabase SQL editor (or via supabase db push).
-- Later changes must ship as NEW migration files, never edits here.
-- =========================================================

-- ---------- ENUMS ----------
create type public.attribute_kind as enum
  ('hair','forehead','eyes','nose','lips','jawline','chest','arms','abs','hands','thighs','butt','feet');
create type public.photo_status as enum ('active','removed');
create type public.moderation_status as enum ('pending','approved','rejected');
create type public.entitlement_type as enum ('message_credit','read_pass','subscription');
create type public.product_kind as enum ('single_message','read_pass','sub_monthly','sub_annual');
create type public.transaction_status as enum ('pending','succeeded','failed','refunded');
create type public.report_status as enum ('open','reviewed','actioned','dismissed');

-- ---------- PROFILES ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text check (char_length(display_name) <= 40),
  is_over_18 boolean not null default false,
  tos_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a user signs up.
-- The placeholder username is replaced during onboarding.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, 'user_' || substr(replace(new.id::text, '-', ''), 1, 12));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- PHOTOS ----------
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,                       -- '{owner_id}/{photo_id}.webp' in the private bucket
  status public.photo_status not null default 'active',
  moderation public.moderation_status not null default 'pending',
  attributes_public boolean not null default false, -- the owner's privacy toggle
  created_at timestamptz not null default now()
);

-- STRICT SINGLE-PHOTO RULE, enforced by the database itself:
-- a user can never hold two rows with status = 'active'.
create unique index one_active_photo_per_user
  on public.photos (owner_id) where (status = 'active');

-- ---------- RATINGS (overall 1-10) ----------
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.photos(id) on delete cascade,
  rater_id uuid not null references public.profiles(id) on delete cascade,
  score smallint not null check (score between 1 and 10),
  created_at timestamptz not null default now(),
  unique (photo_id, rater_id)                        -- one overall rating per rater per photo
);

-- ---------- ATTRIBUTE RATINGS (children of one rating) ----------
create table public.attribute_ratings (
  id uuid primary key default gen_random_uuid(),
  rating_id uuid not null references public.ratings(id) on delete cascade,
  attribute public.attribute_kind not null,
  score smallint not null check (score between 1 and 10),
  unique (rating_id, attribute)
);

-- ---------- MESSAGES (1-on-1 only; inserted via the send_message RPC only) ----------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index messages_inbox_idx on public.messages (recipient_id, created_at desc);
create index messages_sent_idx  on public.messages (sender_id, created_at desc);

-- ---------- ENTITLEMENTS (written only by service role: Stripe webhooks) ----------
create table public.user_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.entitlement_type not null,
  credits_remaining int check (credits_remaining >= 0),  -- for message_credit rows
  expires_at timestamptz,                                -- read_pass end / subscription period end
  stripe_subscription_id text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index entitlements_user_idx on public.user_entitlements (user_id, type, active);

-- ---------- TRANSACTIONS (audit trail, written by Stripe webhooks) ----------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product public.product_kind not null,
  amount_cents int not null,
  currency text not null default 'eur',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  status public.transaction_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ---------- REPORTS (user safety) ----------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  photo_id uuid references public.photos(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  reason text not null check (char_length(reason) <= 500),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  check (photo_id is not null or message_id is not null)
);

-- =========================================================
-- ACCESS HELPER FUNCTIONS (security definer, reused by RLS)
-- =========================================================

create or replace function public.has_active_subscription(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_entitlements
    where user_id = uid and type = 'subscription'
      and active and (expires_at is null or expires_at > now())
  );
$$;

create or replace function public.has_send_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_active_subscription(uid)
      or exists (
        select 1 from public.user_entitlements
        where user_id = uid and type = 'message_credit'
          and active and coalesce(credits_remaining, 0) > 0
      );
$$;

create or replace function public.has_read_access(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_active_subscription(uid)
      or exists (
        select 1 from public.user_entitlements
        where user_id = uid and type = 'read_pass'
          and active and expires_at > now()          -- the 15-minute pass dies at DB level
      );
$$;

create or replace function public.is_photo_owner(p_photo uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.photos where id = p_photo and owner_id = uid);
$$;

-- =========================================================
-- SEND-MESSAGE RPC (atomic: entitlement check + credit decrement + insert)
-- =========================================================
create or replace function public.send_message(p_recipient uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_sender uuid := auth.uid();
  v_credit_id uuid;
  v_message_id uuid;
begin
  if v_sender is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_recipient = v_sender then
    raise exception 'CANNOT_MESSAGE_SELF';
  end if;

  -- Subscribers send freely; everyone else burns exactly one credit.
  if not public.has_active_subscription(v_sender) then
    select id into v_credit_id
    from public.user_entitlements
    where user_id = v_sender and type = 'message_credit'
      and active and credits_remaining > 0
    order by created_at
    limit 1
    for update skip locked;   -- prevents double-spend under concurrent sends

    if v_credit_id is null then
      raise exception 'NO_SEND_ENTITLEMENT';
    end if;

    update public.user_entitlements
       set credits_remaining = credits_remaining - 1
     where id = v_credit_id;
  end if;

  insert into public.messages (sender_id, recipient_id, body)
  values (v_sender, p_recipient, p_body)
  returning id into v_message_id;

  return v_message_id;
end $$;

-- Free inbox teasers: the recipient always sees WHO wrote and WHEN,
-- never the body. The read paywall is therefore never a blind paywall.
create or replace function public.get_inbox_teasers()
returns table (message_id uuid, sender_username text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, p.username, m.created_at
  from public.messages m
  join public.profiles p on p.id = m.sender_id
  where m.recipient_id = auth.uid()
  order by m.created_at desc;
$$;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.profiles          enable row level security;
alter table public.photos            enable row level security;
alter table public.ratings           enable row level security;
alter table public.attribute_ratings enable row level security;
alter table public.messages          enable row level security;
alter table public.user_entitlements enable row level security;
alter table public.transactions      enable row level security;
alter table public.reports           enable row level security;

-- Messages can never be written directly by clients: RPC only.
revoke insert, update, delete on public.messages from authenticated, anon;

-- Photo owners may flip status (replace/remove) and the privacy toggle,
-- but can NEVER touch the moderation column. Column-level privilege
-- enforcement is simpler and stronger than a policy subquery.
revoke update on public.photos from authenticated, anon;
grant update (status, attributes_public) on public.photos to authenticated;

-- PROFILES
create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- PHOTOS: non-owners only see active + approved; owners always see their own.
create policy "photos_select" on public.photos
  for select to authenticated
  using (owner_id = auth.uid() or (status = 'active' and moderation = 'approved'));
create policy "photos_insert_own" on public.photos
  for insert to authenticated with check (owner_id = auth.uid());
create policy "photos_update_own" on public.photos
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- RATINGS: raters rate approved photos they don't own; visible to rater + photo owner.
create policy "ratings_insert" on public.ratings
  for insert to authenticated
  with check (
    rater_id = auth.uid()
    and not public.is_photo_owner(photo_id, auth.uid())
    and exists (
      select 1 from public.photos p
      where p.id = photo_id and p.status = 'active' and p.moderation = 'approved'
    )
  );
create policy "ratings_select" on public.ratings
  for select to authenticated
  using (rater_id = auth.uid() or public.is_photo_owner(photo_id, auth.uid()));

-- ATTRIBUTE RATINGS - the privacy core. A row is visible to:
--   (a) the rater who wrote it,
--   (b) the photo owner (always),
--   (c) everyone, if and only if the owner set attributes_public = true.
create policy "attr_ratings_insert" on public.attribute_ratings
  for insert to authenticated
  with check (exists (
    select 1 from public.ratings r
    where r.id = rating_id and r.rater_id = auth.uid()
  ));
create policy "attr_ratings_select" on public.attribute_ratings
  for select to authenticated
  using (exists (
    select 1
    from public.ratings r
    join public.photos p on p.id = r.photo_id
    where r.id = rating_id
      and (r.rater_id = auth.uid()
        or p.owner_id = auth.uid()
        or p.attributes_public = true)
  ));

-- MESSAGES: senders read their own sent mail free;
-- recipients need read access (subscription or a live 15-minute pass).
create policy "messages_select" on public.messages
  for select to authenticated
  using (
    sender_id = auth.uid()
    or (recipient_id = auth.uid() and public.has_read_access(auth.uid()))
  );

-- ENTITLEMENTS / TRANSACTIONS: users read their own; only the service role writes.
create policy "entitlements_select_own" on public.user_entitlements
  for select to authenticated using (user_id = auth.uid());
create policy "transactions_select_own" on public.transactions
  for select to authenticated using (user_id = auth.uid());

-- REPORTS
create policy "reports_insert" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports_select_own" on public.reports
  for select to authenticated using (reporter_id = auth.uid());

-- =========================================================
-- STORAGE: private "photos" bucket.
-- Users write only inside their own {user_id}/ folder.
-- Nobody reads directly - the app mints short-lived signed URLs
-- server-side after checking moderation status.
-- =========================================================
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "photos_storage_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos_storage_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "photos_storage_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
