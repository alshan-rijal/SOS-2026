-- supabase/migrations/20261128_004_events_triggers.sql
-- Purpose: updated_at, the review-field guard, the "edited approved event goes
--          back to review" rule, the status timeline, review notifications and
--          the participant limits.
-- Run order: 4 of 5. Requires public.touch_updated_at() from supabase/schema.sql.
-- safe to run twice

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
drop trigger if exists events_touch_updated_at on public.events;
create trigger events_touch_updated_at
  before update on public.events
  for each row execute function public.touch_updated_at();

drop trigger if exists event_applications_touch_updated_at on public.event_applications;
create trigger event_applications_touch_updated_at
  before update on public.event_applications
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- BEFORE UPDATE on events
--   * non-admins may not approve or reject, and may not touch the review fields;
--   * editing an approved event's date, time, place or type sends it back to review.
-- auth.uid() is null for the SQL Editor / service role, where both rules stand
-- aside so an admin can work by hand.
-- ---------------------------------------------------------------------------
create or replace function public.events_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean := coalesce(public.is_admin(), false);
  admin_context boolean := auth.uid() is null or is_admin;
begin
  if not admin_context then
    if new.status is distinct from old.status
       and new.status in ('approved', 'rejected') then
      raise exception 'Only admins can approve or reject an event';
    end if;

    if new.reviewed_by is distinct from old.reviewed_by
       or new.reviewed_at is distinct from old.reviewed_at
       or new.review_notes is distinct from old.review_notes
       or new.rejection_reason is distinct from old.rejection_reason then
      raise exception 'Only admins can change review fields';
    end if;
  end if;

  -- An approved event that moves in time or place must be reviewed again.
  if not admin_context
     and old.status = 'approved'
     and new.status = 'approved'
     and (
       new.event_date is distinct from old.event_date
       or new.start_time is distinct from old.start_time
       or new.end_time is distinct from old.end_time
       or new.address is distinct from old.address
       or new.latitude is distinct from old.latitude
       or new.longitude is distinct from old.longitude
       or new.type is distinct from old.type
     ) then
    new.status := 'pending_review';
  end if;

  return new;
end;
$$;

drop trigger if exists events_before_update on public.events;
create trigger events_before_update
  before update on public.events
  for each row execute function public.events_before_update();

-- ---------------------------------------------------------------------------
-- AFTER UPDATE on events: write the status timeline whenever the status moves.
-- ---------------------------------------------------------------------------
create or replace function public.events_log_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.event_status_history (event_id, from_status, to_status, changed_by, note)
    values (
      new.id,
      old.status,
      new.status,
      auth.uid(),
      coalesce(new.review_notes, new.rejection_reason)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists events_log_status on public.events;
create trigger events_log_status
  after update on public.events
  for each row execute function public.events_log_status();

-- ---------------------------------------------------------------------------
-- AFTER UPDATE on events: tell the organiser about the decision.
-- ---------------------------------------------------------------------------
create or replace function public.events_notify_organizer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  notification_title text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'approved' then
    notification_title := 'Your event was approved';
  elsif new.status = 'changes_requested' then
    notification_title := 'Changes requested on your event';
  elsif new.status = 'rejected' then
    notification_title := 'Your event was rejected';
  else
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    new.organizer_id,
    'event_' || new.status,
    notification_title,
    coalesce(new.review_notes, new.rejection_reason, new.title),
    '/events/' || new.id::text
  );

  return new;
end;
$$;

drop trigger if exists events_notify_organizer on public.events;
create trigger events_notify_organizer
  after update on public.events
  for each row execute function public.events_notify_organizer();

-- ---------------------------------------------------------------------------
-- BEFORE INSERT on event_participants: capacity, no organiser, no ended events.
-- security definer so the checks can read events regardless of the caller's RLS.
-- ---------------------------------------------------------------------------
create or replace function public.event_participants_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.events;
  taken integer;
begin
  select * into target from public.events where id = new.event_id;

  if target is null then
    raise exception 'That event does not exist';
  end if;

  if target.status <> 'approved' then
    raise exception 'That event is not open for joining';
  end if;

  if target.organizer_id = new.user_id then
    raise exception 'The organiser cannot join their own event';
  end if;

  if (target.event_date + target.end_time) <= now() then
    raise exception 'That event has already ended';
  end if;

  if target.max_participants is not null then
    select count(*) into taken from public.event_participants where event_id = new.event_id;
    if taken >= target.max_participants then
      raise exception 'That event is full';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists event_participants_before_insert on public.event_participants;
create trigger event_participants_before_insert
  before insert on public.event_participants
  for each row execute function public.event_participants_before_insert();
