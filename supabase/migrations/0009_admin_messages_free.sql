-- =========================================================
-- MON BEAU MIROIR - MIGRATION 0009
-- Messages SENT BY ADMINS are always readable by their recipient —
-- moderation and support notices must never sit behind the read
-- paywall. Regular messages keep the exact same rules as before.
-- Additive-permissive only: nothing that was readable becomes hidden.
-- 0001-0008 untouched.
-- =========================================================

-- Reusable helper: is this user an admin? (security definer so RLS
-- policies can consult profiles without recursive policy headaches)
create or replace function public.is_admin_user(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

-- Recreate the read policy with the admin-sender exception:
--   * senders always read their own sent mail
--   * recipients read with read access (subscription / live pass)
--   * recipients ALWAYS read messages an admin sent them
drop policy "messages_select" on public.messages;
create policy "messages_select" on public.messages
  for select to authenticated
  using (
    sender_id = auth.uid()
    or (
      recipient_id = auth.uid()
      and (
        public.has_read_access(auth.uid())
        or public.is_admin_user(sender_id)
      )
    )
  );
