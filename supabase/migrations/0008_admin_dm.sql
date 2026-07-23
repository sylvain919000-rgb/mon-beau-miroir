-- =========================================================
-- MON BEAU MIROIR - MIGRATION 0008
-- Admins DM freely: send_message skips the paywall when the sender is
-- an admin (support/moderation outreach must not depend on credits).
-- Function replacement only — behavior for regular users is unchanged.
-- Additive only: 0001-0007 untouched.
-- =========================================================

create or replace function public.send_message(p_recipient uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_sender uuid := auth.uid();
  v_is_admin boolean;
  v_credit_id uuid;
  v_message_id uuid;
begin
  if v_sender is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_recipient = v_sender then
    raise exception 'CANNOT_MESSAGE_SELF';
  end if;

  select is_admin into v_is_admin
    from public.profiles where id = v_sender;

  -- Admins and subscribers send freely; everyone else burns one credit.
  if not coalesce(v_is_admin, false)
     and not public.has_active_subscription(v_sender) then
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
