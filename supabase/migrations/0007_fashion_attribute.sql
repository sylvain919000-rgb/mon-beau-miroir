-- =========================================================
-- MON BEAU MIROIR - MIGRATION 0007
-- New rateable attribute: Fashion.
-- Enum append only — existing ratings, stats and RLS are untouched;
-- submit_rating and get_photo_stats pick the new value up automatically
-- because they cast/group on the enum rather than a hardcoded list.
-- =========================================================

alter type public.attribute_kind add value 'fashion';
