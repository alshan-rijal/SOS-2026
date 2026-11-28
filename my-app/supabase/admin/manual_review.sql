-- supabase/admin/manual_review.sql
-- Purpose: hand-run statements for the tasks the admin panel will own later.
--          Copy ONE statement at a time into the SQL Editor. Safe to re-run.
-- Run order: after all five migration files.
--
-- Everything below runs with auth.uid() = null, which the triggers treat as an
-- admin context, so the review fields and status may be written by hand.

-- ---------------------------------------------------------------------------
-- Promote a user to admin (by email).
-- ---------------------------------------------------------------------------
-- update public.profiles
-- set role = 'admin'
-- where id = (select id from auth.users where email = 'you@example.com');

-- ---------------------------------------------------------------------------
-- List events waiting for a decision, oldest first.
-- ---------------------------------------------------------------------------
-- select id, type, title, event_date, ward, submitted_at
-- from public.events
-- where status = 'pending_review'
-- order by submitted_at asc;

-- ---------------------------------------------------------------------------
-- Approve an event.
-- ---------------------------------------------------------------------------
-- update public.events
-- set status = 'approved',
--     reviewed_at = now(),
--     review_notes = null,
--     rejection_reason = null
-- where id = '<event-uuid>';

-- ---------------------------------------------------------------------------
-- Request changes, with a note the organiser will see in My events.
-- ---------------------------------------------------------------------------
-- update public.events
-- set status = 'changes_requested',
--     reviewed_at = now(),
--     review_notes = 'Please add the ward office permission letter and a phone number.'
-- where id = '<event-uuid>';

-- ---------------------------------------------------------------------------
-- Reject, with a reason the organiser will see in My events.
-- ---------------------------------------------------------------------------
-- update public.events
-- set status = 'rejected',
--     reviewed_at = now(),
--     rejection_reason = 'Duplicate of an event already approved for this ward.'
-- where id = '<event-uuid>';

-- ---------------------------------------------------------------------------
-- Read one application's private answers (admins only).
-- ---------------------------------------------------------------------------
-- select e.title, a.answers, a.document_paths
-- from public.events e
-- join public.event_applications a on a.event_id = e.id
-- where e.id = '<event-uuid>';

-- ---------------------------------------------------------------------------
-- Who is going to an event.
-- ---------------------------------------------------------------------------
-- select p.user_id, pr.full_name, p.created_at
-- from public.event_participants p
-- left join public.profiles pr on pr.id = p.user_id
-- where p.event_id = '<event-uuid>'
-- order by p.created_at;
