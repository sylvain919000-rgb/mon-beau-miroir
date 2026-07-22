-- =========================================================
-- MON BEAU MIROIR - MIGRATION 0002
-- Rating submission (atomic) + privacy-aware photo statistics.
-- Additive only: 0001 is never edited.
-- =========================================================

-- Submits one overall rating plus optional attribute scores in a single
-- transaction. Used instead of client-side inserts so a failure halfway
-- can never leave a rating without its attribute children (or vice versa).
--
-- p_attributes example: {"eyes": 8, "jawline": 7}
create or replace function public.submit_rating(
  p_photo uuid,
  p_score smallint,
  p_attributes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_rater uuid := auth.uid();
  v_rating_id uuid;
  v_attribute text;
  v_attribute_score int;
begin
  if v_rater is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- SECURITY DEFINER bypasses RLS, so the insert rules from 0001 are
  -- re-checked here explicitly: no self-rating, photo must be ratable.
  if public.is_photo_owner(p_photo, v_rater) then
    raise exception 'CANNOT_RATE_OWN_PHOTO';
  end if;
  perform 1 from public.photos
    where id = p_photo and status = 'active' and moderation = 'approved';
  if not found then
    raise exception 'PHOTO_NOT_RATABLE';
  end if;

  begin
    insert into public.ratings (photo_id, rater_id, score)
    values (p_photo, v_rater, p_score)
    returning id into v_rating_id;
  exception when unique_violation then
    raise exception 'ALREADY_RATED';
  end;

  -- Attribute scores: table constraints enforce 1-10; casting the key to
  -- the attribute_kind enum rejects any attribute name we don't support.
  for v_attribute, v_attribute_score in
    select key, value::int from jsonb_each_text(p_attributes)
  loop
    insert into public.attribute_ratings (rating_id, attribute, score)
    values (v_rating_id, v_attribute::public.attribute_kind, v_attribute_score);
  end loop;

  return v_rating_id;
end $$;

-- Aggregate statistics for one photo. Individual rating rows are hidden
-- from strangers by RLS (by design), so public averages must come from
-- this function, which applies the same visibility rules:
--   * photo visible?  owner always; others need active + approved
--   * attribute block? owner always; others only if attributes_public
create or replace function public.get_photo_stats(p_photo uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_photo public.photos%rowtype;
  v_overall jsonb;
  v_attributes jsonb;
begin
  select * into v_photo from public.photos where id = p_photo;
  if v_photo.id is null then
    return null;
  end if;

  if v_photo.owner_id is distinct from v_uid
     and not (v_photo.status = 'active' and v_photo.moderation = 'approved') then
    return null;
  end if;

  select jsonb_build_object(
           'avg_score', round(avg(score)::numeric, 1),
           'rating_count', count(*)
         )
    into v_overall
    from public.ratings
   where photo_id = p_photo;

  if v_photo.owner_id = v_uid or v_photo.attributes_public then
    select coalesce(
             jsonb_agg(
               jsonb_build_object(
                 'attribute', per_attribute.attribute,
                 'avg_score', per_attribute.avg_score,
                 'rating_count', per_attribute.rating_count
               )
               order by per_attribute.attribute
             ),
             '[]'::jsonb
           )
      into v_attributes
      from (
        select ar.attribute,
               round(avg(ar.score)::numeric, 1) as avg_score,
               count(*) as rating_count
          from public.attribute_ratings ar
          join public.ratings r on r.id = ar.rating_id
         where r.photo_id = p_photo
         group by ar.attribute
      ) as per_attribute;
  else
    v_attributes := null; -- private: strangers get no attribute data at all
  end if;

  return jsonb_build_object(
    'overall', v_overall,
    'attributes', v_attributes,
    'attributes_public', v_photo.attributes_public
  );
end $$;
