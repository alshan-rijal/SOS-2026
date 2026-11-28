-- supabase/migrations/20261128_001_roles.sql
-- Purpose: add profiles.role and the public.is_admin() helper that every events
--          policy and trigger uses to recognise an administrator.
-- Run order: 1 of 5 (run the files in supabase/migrations in numeric order).
-- safe to run twice

-- ---------------------------------------------------------------------------
-- profiles.role
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'user';

-- The check has to be added separately: `add column if not exists` cannot carry
-- a named constraint that we can then re-run safely.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('user', 'admin'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- is_admin(): true only for a signed-in admin. security definer so reading
-- profiles inside a policy cannot recurse through profiles RLS.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Role guard: only an admin may change a role. auth.uid() is null in the SQL
-- Editor and for the service role, where the change is allowed — that is how
-- the first admin is created by hand (see supabase/admin/manual_review.sql).
-- ---------------------------------------------------------------------------
create or replace function public.profiles_guard_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can change a profile role';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.profiles_guard_role();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function public.is_admin() to anon, authenticated;
