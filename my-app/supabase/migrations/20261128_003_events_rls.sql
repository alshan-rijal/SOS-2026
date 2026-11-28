-- supabase/migrations/20261128_003_events_rls.sql
-- Purpose: turn on row level security for the events tables and grant access.
--          Policies use public.is_admin() (security definer) so they never
--          recurse back through profiles RLS.
-- Run order: 3 of 5.
-- safe to run twice

alter table public.events enable row level security;
alter table public.event_applications enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_status_history enable row level security;
alter table public.notifications enable row level security;

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
-- Read: approved events are public; organisers see their own whatever the
-- status; admins see everything.
drop policy if exists "Events are readable when approved or owned" on public.events;
create policy "Events are readable when approved or owned"
  on public.events for select
  to anon, authenticated
  using (
    status = 'approved'
    or organizer_id = auth.uid()
    or public.is_admin()
  );

-- Insert: an organiser may only create their own draft or pending application.
drop policy if exists "Organisers can create their own events" on public.events;
create policy "Organisers can create their own events"
  on public.events for insert
  to authenticated
  with check (
    organizer_id = auth.uid()
    and status in ('draft', 'pending_review')
  );

-- Update: an organiser may edit while the event is still in review, or cancel
-- it. Anything else (including the review fields) is the trigger's job to
-- block; admins get their own policy below.
drop policy if exists "Organisers can update their own events in review" on public.events;
create policy "Organisers can update their own events in review"
  on public.events for update
  to authenticated
  using (
    organizer_id = auth.uid()
    and status in ('draft', 'pending_review', 'changes_requested', 'approved', 'rejected')
  )
  with check (
    organizer_id = auth.uid()
    and status in ('draft', 'pending_review', 'changes_requested', 'cancelled')
  );

drop policy if exists "Admins can update any event" on public.events;
create policy "Admins can update any event"
  on public.events for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete any event" on public.events;
create policy "Admins can delete any event"
  on public.events for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- event_applications — private; only the event's organiser or an admin.
-- ---------------------------------------------------------------------------
drop policy if exists "Applications are readable by the organiser or admins" on public.event_applications;
create policy "Applications are readable by the organiser or admins"
  on public.event_applications for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = auth.uid()
    )
  );

drop policy if exists "Organisers can add their application" on public.event_applications;
create policy "Organisers can add their application"
  on public.event_applications for insert
  to authenticated
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = auth.uid()
    )
  );

drop policy if exists "Organisers can update their application" on public.event_applications;
create policy "Organisers can update their application"
  on public.event_applications for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- event_status_history — private; only the event's organiser or an admin.
-- (Rows are written by trigger; the organiser may not write them directly.)
-- ---------------------------------------------------------------------------
drop policy if exists "Status history is readable by the organiser or admins" on public.event_status_history;
create policy "Status history is readable by the organiser or admins"
  on public.event_status_history for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.events e
      where e.id = event_id and e.organizer_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- event_participants — anyone may read who is going to an approved event.
-- Joining is own-row only, for an approved event that has not ended, and never
-- the organiser (the BEFORE INSERT trigger in 004 enforces capacity and time).
-- ---------------------------------------------------------------------------
drop policy if exists "Participants of approved events are readable" on public.event_participants;
create policy "Participants of approved events are readable"
  on public.event_participants for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.status = 'approved'
    )
  );

drop policy if exists "Users can join an approved event" on public.event_participants;
create policy "Users can join an approved event"
  on public.event_participants for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.events e
      where e.id = event_id
        and e.status = 'approved'
        and e.organizer_id <> auth.uid()
    )
  );

drop policy if exists "Users can leave an event" on public.event_participants;
create policy "Users can leave an event"
  on public.event_participants for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- notifications — own rows only. No insert policy: rows come from the trigger
-- in 004 (a security definer function, which bypasses RLS).
-- ---------------------------------------------------------------------------
drop policy if exists "Users can read their own notifications" on public.notifications;
create policy "Users can read their own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can mark their own notifications read" on public.notifications;
create policy "Users can mark their own notifications read"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can delete their own notifications" on public.notifications;
create policy "Users can delete their own notifications"
  on public.notifications for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants — explicit, so a project with default grants revoked still works.
-- ---------------------------------------------------------------------------
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant select, insert, update on public.event_applications to authenticated;
grant select on public.event_participants to anon, authenticated;
grant insert, delete on public.event_participants to authenticated;
grant select on public.event_status_history to authenticated;
grant select, update, delete on public.notifications to authenticated;
grant usage, select on all sequences in schema public to authenticated;
