-- supabase/rollback/events_rollback.sql
-- Purpose: undo migrations 002 to 005 — the events tables, policies, triggers,
--          functions and storage buckets.
-- Run order: last. Run only if you want to remove the events feature.
-- safe to run twice
--
-- WARNING: this deletes every event, application, participant, notification and
-- stored event file. It does NOT touch public.profiles, the profiles.role
-- column, public.is_admin(), public.touch_updated_at(), or any reports object.

-- ---------------------------------------------------------------------------
-- Storage policies and buckets (005)
-- ---------------------------------------------------------------------------
drop policy if exists "Event photos are publicly readable" on storage.objects;
drop policy if exists "Users can upload their own event photos" on storage.objects;
drop policy if exists "Users can update their own event photos" on storage.objects;
drop policy if exists "Users can delete their own event photos" on storage.objects;
drop policy if exists "Event documents are readable by the owner or admins" on storage.objects;
drop policy if exists "Users can upload their own event documents" on storage.objects;
drop policy if exists "Users can update their own event documents" on storage.objects;
drop policy if exists "Users can delete their own event documents" on storage.objects;

delete from storage.objects
where bucket_id in ('event-photos', 'event-documents');

delete from storage.buckets
where id in ('event-photos', 'event-documents');

-- ---------------------------------------------------------------------------
-- Triggers and functions (004)
-- ---------------------------------------------------------------------------
drop trigger if exists event_participants_before_insert on public.event_participants;
drop trigger if exists events_notify_organizer on public.events;
drop trigger if exists events_log_status on public.events;
drop trigger if exists events_before_update on public.events;
drop trigger if exists event_applications_touch_updated_at on public.event_applications;
drop trigger if exists events_touch_updated_at on public.events;

drop function if exists public.event_participants_before_insert();
drop function if exists public.events_notify_organizer();
drop function if exists public.events_log_status();
drop function if exists public.events_before_update();

-- ---------------------------------------------------------------------------
-- Policies (003)
-- ---------------------------------------------------------------------------
drop policy if exists "Events are readable when approved or owned" on public.events;
drop policy if exists "Organisers can create their own events" on public.events;
drop policy if exists "Organisers can update their own events in review" on public.events;
drop policy if exists "Admins can update any event" on public.events;
drop policy if exists "Admins can delete any event" on public.events;
drop policy if exists "Applications are readable by the organiser or admins" on public.event_applications;
drop policy if exists "Organisers can add their application" on public.event_applications;
drop policy if exists "Organisers can update their application" on public.event_applications;
drop policy if exists "Status history is readable by the organiser or admins" on public.event_status_history;
drop policy if exists "Participants of approved events are readable" on public.event_participants;
drop policy if exists "Users can join an approved event" on public.event_participants;
drop policy if exists "Users can leave an event" on public.event_participants;
drop policy if exists "Users can read their own notifications" on public.notifications;
drop policy if exists "Users can mark their own notifications read" on public.notifications;
drop policy if exists "Users can delete their own notifications" on public.notifications;

-- ---------------------------------------------------------------------------
-- Tables (002). Children first so foreign keys stay satisfied.
-- ---------------------------------------------------------------------------
drop table if exists public.notifications;
drop table if exists public.event_status_history;
drop table if exists public.event_participants;
drop table if exists public.event_applications;
drop table if exists public.events;

-- ---------------------------------------------------------------------------
-- Not removed on purpose: public.profiles, profiles.role, public.is_admin(),
-- profiles_guard_role(), public.touch_updated_at() and the reports objects.
-- ---------------------------------------------------------------------------
