-- =========================================================
-- MON BEAU MIROIR - MIGRATION 0006
-- Paid gender-split insights: who rates you higher, men or women?
-- New product (gender_insight, one-time) + entitlement (gender_reveal,
-- a consumable "one look" credit) + the RPC that burns it atomically.
-- Additive only: 0001-0005 untouched.
-- =========================================================

alter type public.product_kind add value 'gender_insight';
alter type public.entitlement_type add value 'gender_reveal';

-- One look at the caller's own gender-split stats.
--   * Active subscribers: always allowed, nothing consumed.
--   * Otherwise: burns ONE gender_reveal credit — atomically, and only
--     after confirming there is actually data to show (a credit must
--     never be consumed for an empty answer).
-- Returns jsonb with a 'status' discriminator:
--   ok | locked | no_photo | no_ratings
create or replace function public.reveal_gender_split()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_photo uuid;
  v_rating_count bigint;
  v_subscribed boolean;
  v_credit_id uuid;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select id into v_photo
    from public.photos
   where owner_id = v_uid and status = 'active';
  if v_photo is null then
    return jsonb_build_object('status', 'no_photo');
  end if;

  select count(*) into v_rating_count
    from public.ratings where photo_id = v_photo;
  if v_rating_count = 0 then
    return jsonb_build_object('status', 'no_ratings');
  end if;

  select exists (
    select 1 from public.user_entitlements
     where user_id = v_uid and type = 'subscription' and active
       and (expires_at is null or expires_at > now())
  ) into v_subscribed;

  if not v_subscribed then
    -- Burn one reveal credit; the row lock makes double-spending
    -- impossible even under concurrent requests.
    update public.user_entitlements
       set credits_remaining = credits_remaining - 1,
           active = (credits_remaining - 1 > 0)
     where id = (
             select id from public.user_entitlements
              where user_id = v_uid and type = 'gender_reveal'
                and active and coalesce(credits_remaining, 0) > 0
              order by created_at
              limit 1
              for update skip locked
           )
    returning id into v_credit_id;

    if v_credit_id is null then
      return jsonb_build_object('status', 'locked');
    end if;
  end if;

  select jsonb_build_object(
           'status', 'ok',
           'male', jsonb_build_object(
             'avg_score', round((avg(r.score) filter (where pr.birth_sex = 'male'))::numeric, 1),
             'rating_count', count(*) filter (where pr.birth_sex = 'male')
           ),
           'female', jsonb_build_object(
             'avg_score', round((avg(r.score) filter (where pr.birth_sex = 'female'))::numeric, 1),
             'rating_count', count(*) filter (where pr.birth_sex = 'female')
           ),
           'unknown', jsonb_build_object(
             'avg_score', round((avg(r.score) filter (where pr.birth_sex is null))::numeric, 1),
             'rating_count', count(*) filter (where pr.birth_sex is null)
           )
         )
    into v_result
    from public.ratings r
    join public.profiles pr on pr.id = r.rater_id
   where r.photo_id = v_photo;

  return v_result;
end $$;
