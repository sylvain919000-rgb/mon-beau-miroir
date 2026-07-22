-- =========================================================
-- MON BEAU MIROIR - MIGRATION 0005
-- Rater demographics: sex at birth + birth month/year.
-- Collected once via an unskippable gate before rating; powers
-- gender-split statistics later. Additive only: 0001-0004 untouched.
-- =========================================================

create type public.birth_sex as enum ('male', 'female');

alter table public.profiles
  add column birth_sex   public.birth_sex,
  add column birth_month smallint check (birth_month between 1 and 12),
  add column birth_year  smallint check (birth_year between 1900 and 2100);

-- The three answers travel together: all set, or all still null.
-- (Partial answers could otherwise slip in through a hand-crafted update.)
alter table public.profiles add constraint demographics_all_or_none check (
  ((birth_sex is null) = (birth_month is null))
  and ((birth_month is null) = (birth_year is null))
);

-- Users may write these columns on their own row (RLS from 0001 scopes
-- updates to the owner; 0003 narrowed the column list — this extends it).
grant update (birth_sex, birth_month, birth_year)
  on public.profiles to authenticated;

-- WRITE-ONCE: once answered, demographics are locked. Ratings get tagged
-- with the rater's sex forever (for the paid gender-split stats), so
-- letting people flip the answer later would rewrite paid-for history.
-- Corrections are a support operation (service role can drop/re-create
-- the trigger or fix the row manually in SQL).
create or replace function public.prevent_demographics_change()
returns trigger language plpgsql as $$
begin
  if old.birth_sex is not null
     and (new.birth_sex   is distinct from old.birth_sex
       or new.birth_month is distinct from old.birth_month
       or new.birth_year  is distinct from old.birth_year) then
    raise exception 'DEMOGRAPHICS_LOCKED';
  end if;
  return new;
end $$;

create trigger profiles_demographics_lock
  before update on public.profiles
  for each row execute function public.prevent_demographics_change();
