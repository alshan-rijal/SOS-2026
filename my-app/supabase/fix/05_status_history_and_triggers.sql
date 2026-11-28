-- 05_status_history_and_triggers.sql
-- Purpose: ensure profiles.role + public.is_admin() exist, create the status
--          history table, backfill a first row per report, and add the triggers
--          that record every status change and protect the review fields.
-- Run order: 05 (after 04; run alone, then 06).
-- safe to run twice: create if not exists, add column if not exists,
--                    create or replace, drop trigger/policy if exists.

-- ---------------------------------------------------------------------------
-- profiles.role in ('user','admin') and public.is_admin()
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists role text not null default 'user';

-- Normalise the old 'citizen' label before the new check is added.
update public.profiles set role = 'user' where role = 'citizen';
alter table public.profiles alter column role set default 'user';

-- Replace the old check (citizen/admin) with user/admin.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin'));

-- security definer so a policy reading profiles cannot recurse through profiles RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- report_status_history — the timeline the report page reads.
-- ---------------------------------------------------------------------------
create table if not exists public.report_status_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  from_status text,
  to_status text,
  reason text,
  note text,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Tolerate an older shape (schema.sql used a bigint id and a status column):
-- add whatever is missing so both worlds carry the columns the app reads.
alter table public.report_status_history add column if not exists from_status text;
alter table public.report_status_history add column if not exists to_status text;
alter table public.report_status_history add column if not exists reason text;
alter table public.report_status_history add column if not exists note text;
alter table public.report_status_history add column if not exists changed_by uuid;
alter table public.report_status_history add column if not exists created_at timestamptz;

-- A legacy NOT NULL status column would block the trigger's inserts; relax it.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'report_status_history'
      and column_name = 'status' and is_nullable = 'NO'
  ) then
    alter table public.report_status_history alter column status drop not null;
  end if;
end $$;

create index if not exists report_status_history_created_idx
  on public.report_status_history (report_id, created_at);

-- Backfill one "reported" row per report that has no history yet.
insert into public.report_status_history (report_id, to_status, note, created_at)
select r.id, 'reported', 'Reported', r.created_at
from public.reports r
where not exists (
  select 1 from public.report_status_history h where h.report_id = r.id
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
-- BEFORE UPDATE: record the move and stamp the review timestamps on the row.
create or replace function public.reports_log_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status::text is distinct from old.status::text then
    insert into public.report_status_history
      (report_id, from_status, to_status, reason, note, changed_by)
    values
      (new.id, old.status::text, new.status::text, new.status_reason, new.official_note, auth.uid());

    new.status_changed_at := now();
    new.status_changed_by := auth.uid();

    if new.status::text in ('under_verification', 'in_progress', 'fixed', 'cannot_fix')
       and new.verified_at is null then
      new.verified_at := now();
      new.verified_by := coalesce(new.verified_by, auth.uid());
    end if;

    if new.status::text in ('fixed', 'cannot_fix') and new.resolved_at is null then
      new.resolved_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists reports_log_status on public.reports;
create trigger reports_log_status
  before update on public.reports
  for each row execute function public.reports_log_status();

-- AFTER INSERT: write the first history row for a brand-new report (the insert
-- is the only place the app never triggers an update).
create or replace function public.reports_log_initial_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.report_status_history (report_id, to_status, note, changed_by, created_at)
  values (new.id, new.status::text, 'Reported', auth.uid(), coalesce(new.created_at, now()));
  return new;
end;
$$;

drop trigger if exists reports_log_initial_status on public.reports;
create trigger reports_log_initial_status
  after insert on public.reports
  for each row execute function public.reports_log_initial_status();

-- BEFORE UPDATE: only admins (or the SQL Editor / service role, where
-- auth.uid() is null) may change a review field.
create or replace function public.reports_guard_review_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if not public.is_admin() then
    if new.status::text         is distinct from old.status::text
       or new.status_reason     is distinct from old.status_reason
       or new.official_note     is distinct from old.official_note
       or new.verified_at       is distinct from old.verified_at
       or new.verified_by       is distinct from old.verified_by
       or new.resolved_at       is distinct from old.resolved_at then
      raise exception 'Only admins can change a report review field';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists reports_guard_review_fields on public.reports;
create trigger reports_guard_review_fields
  before update on public.reports
  for each row execute function public.reports_guard_review_fields();

-- ---------------------------------------------------------------------------
-- RLS + grants on report_status_history
-- ---------------------------------------------------------------------------
alter table public.report_status_history enable row level security;

drop policy if exists "Status history is publicly readable" on public.report_status_history;
drop policy if exists "Reporters can add history to their own reports" on public.report_status_history;
drop policy if exists "Status history follows its report's visibility" on public.report_status_history;
create policy "Status history follows its report's visibility"
  on public.report_status_history for select
  to anon, authenticated
  using (
    exists (select 1 from public.reports r where r.id = report_id)
  );

-- Insert only by the trigger (security definer, bypasses RLS) or an admin.
drop policy if exists "Admins can add status history" on public.report_status_history;
create policy "Admins can add status history"
  on public.report_status_history for insert
  to authenticated
  with check (public.is_admin());

grant select on public.report_status_history to anon, authenticated;
grant insert on public.report_status_history to authenticated;

-- ---------------------------------------------------------------------------
-- reports update / delete policies
-- ---------------------------------------------------------------------------
drop policy if exists "Reporters can update their own reports" on public.reports;
drop policy if exists "Owners can update their reported reports" on public.reports;
create policy "Owners can update their reported reports"
  on public.reports for update
  to authenticated
  using (user_id = auth.uid() and status::text = 'reported')
  with check (user_id = auth.uid() and status::text = 'reported');

drop policy if exists "Admins can update any report" on public.reports;
create policy "Admins can update any report"
  on public.reports for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Reporters can delete their own reports" on public.reports;
drop policy if exists "Owners can delete their reported reports" on public.reports;
create policy "Owners can delete their reported reports"
  on public.reports for delete
  to authenticated
  using (user_id = auth.uid() and status::text = 'reported');

drop policy if exists "Admins can delete any report" on public.reports;
create policy "Admins can delete any report"
  on public.reports for delete
  to authenticated
  using (public.is_admin());
