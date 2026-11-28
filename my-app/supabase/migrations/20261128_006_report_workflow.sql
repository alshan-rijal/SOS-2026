-- supabase/migrations/20261128_006_report_workflow.sql
-- Purpose: bring reports up to the five-step civic workflow
--          reported -> under_verification -> in_progress -> fixed / cannot_fix.
--          Adds the review columns an authority needs, the status history shape,
--          and the triggers that write history and protect review fields.
-- Run order: 6 of 8 (run after 20261128_001_roles.sql; independent of the events files).
-- safe to run twice

-- ---------------------------------------------------------------------------
-- profiles.role + public.is_admin(): re-asserted here so this file still works
-- if 001_roles.sql was never run. Old 'citizen' rows are normalised to 'user'.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'user';

update public.profiles set role = 'user' where role = 'citizen';
alter table public.profiles alter column role set default 'user';

-- Drop whichever check an earlier revision added, then add the two-value one.
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
-- reports: review and workflow columns. All nullable, so existing rows stay valid.
-- ---------------------------------------------------------------------------
alter table public.reports add column if not exists status_reason text;
alter table public.reports add column if not exists status_changed_at timestamptz;
alter table public.reports add column if not exists status_changed_by uuid references auth.users (id) on delete set null;
alter table public.reports add column if not exists verified_at timestamptz;
alter table public.reports add column if not exists verified_by uuid references auth.users (id) on delete set null;
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists official_note text;

-- ---------------------------------------------------------------------------
-- reports.status: schema.sql ships it as the enum public.report_status
-- ('pending','in_progress','resolved'). Five values are simpler as text with a
-- check constraint. This guard only fires while the column is still an enum, so
-- re-running the file is harmless.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reports'
      and column_name = 'status'
      and data_type = 'USER-DEFINED'
  ) then
    alter table public.reports alter column status drop default;
    alter table public.reports alter column status type text using status::text;
    alter table public.report_status_history alter column status type text using status::text;
  end if;
end $$;

-- Old vocabulary -> new vocabulary.
update public.reports set status = 'reported' where status = 'pending';
update public.reports set status = 'fixed'    where status = 'resolved';
update public.report_status_history set status = 'reported' where status = 'pending';
update public.report_status_history set status = 'fixed'    where status = 'resolved';

-- The five-value check, with the new default.
alter table public.reports alter column status set default 'reported';
alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports
  add constraint reports_status_check
  check (status in ('reported', 'under_verification', 'in_progress', 'fixed', 'cannot_fix'));
alter table public.reports alter column status set not null;

-- ---------------------------------------------------------------------------
-- cannot_fix always needs a real reason (at least 10 characters).
-- ---------------------------------------------------------------------------
alter table public.reports drop constraint if exists reports_cannot_fix_reason_check;
alter table public.reports
  add constraint reports_cannot_fix_reason_check
  check (status <> 'cannot_fix' or char_length(btrim(coalesce(status_reason, ''))) >= 10);

-- ---------------------------------------------------------------------------
-- report_status_history: keep the original `status` column the app already
-- writes and add the from/to shape the stepper reads. Bigint id is preserved so
-- no history and no foreign key is lost.
-- ---------------------------------------------------------------------------
alter table public.report_status_history add column if not exists from_status text;
alter table public.report_status_history add column if not exists to_status text;
alter table public.report_status_history add column if not exists reason text;
alter table public.report_status_history add column if not exists changed_by uuid references auth.users (id) on delete set null;

update public.report_status_history set to_status = coalesce(to_status, status) where to_status is null;

create index if not exists report_status_history_created_idx
  on public.report_status_history (report_id, created_at);

-- Backfill a first "reported" row for reports that have no history yet.
insert into public.report_status_history (report_id, status, to_status, note, created_at)
select r.id, 'reported', 'reported', 'Reported', r.created_at
from public.reports r
where not exists (
  select 1 from public.report_status_history h where h.report_id = r.id
);

-- ---------------------------------------------------------------------------
-- Step order, used to tell a backward move from a forward one.
-- ---------------------------------------------------------------------------
create or replace function public.report_status_rank(s text)
returns int
language sql
immutable
as $$
  select case s
    when 'reported'           then 1
    when 'under_verification' then 2
    when 'in_progress'        then 3
    when 'fixed'              then 4
    when 'cannot_fix'         then 4
    else 0
  end;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: every status change writes a history row and stamps the review
-- timestamps. BEFORE UPDATE so it can set NEW fields.
-- ---------------------------------------------------------------------------
create or replace function public.reports_log_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.report_status_history
      (report_id, status, from_status, to_status, reason, note, changed_by)
    values
      (new.id, new.status, old.status, new.status, new.status_reason, new.official_note, auth.uid());

    new.status_changed_at := now();
    new.status_changed_by := auth.uid();

    -- Entering under_verification or any later step counts as verified.
    if new.status in ('under_verification', 'in_progress', 'fixed', 'cannot_fix')
       and new.verified_at is null then
      new.verified_at := now();
      new.verified_by := coalesce(new.verified_by, auth.uid());
    end if;

    -- The two terminal states are the resolution point.
    if new.status in ('fixed', 'cannot_fix') and new.resolved_at is null then
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

-- ---------------------------------------------------------------------------
-- Trigger guard: only admins (or the SQL Editor / service role, where auth.uid()
-- is null) may change a report's review fields. Backward moves need a reason.
-- ---------------------------------------------------------------------------
create or replace function public.reports_guard_review_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The SQL Editor and the service role are trusted.
  if auth.uid() is null then
    return new;
  end if;

  if not public.is_admin() then
    if new.status        is distinct from old.status
       or new.status_reason is distinct from old.status_reason
       or new.official_note is distinct from old.official_note
       or new.verified_at   is distinct from old.verified_at
       or new.verified_by   is distinct from old.verified_by
       or new.resolved_at   is distinct from old.resolved_at then
      raise exception 'Only admins can change a report review field';
    end if;
    return new;
  end if;

  -- Admins may skip steps, but moving backwards must carry a reason.
  if public.report_status_rank(new.status) < public.report_status_rank(old.status)
     and btrim(coalesce(new.status_reason, '')) = '' then
    raise exception 'A reason is required when moving a report backwards';
  end if;

  return new;
end;
$$;

drop trigger if exists reports_guard_review_fields on public.reports;
create trigger reports_guard_review_fields
  before update on public.reports
  for each row execute function public.reports_guard_review_fields();
