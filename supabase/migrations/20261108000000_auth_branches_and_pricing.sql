create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null check (length(trim(name)) between 1 and 100),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_branch_assignments (
  staff_id uuid not null references public.profiles (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete restrict,
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (staff_id, branch_id)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  category text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.branch_prices (
  branch_id uuid not null references public.branches (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id) on delete cascade,
  price numeric(12, 2) not null check (price >= 0),
  updated_at timestamptz not null default now(),
  primary key (branch_id, menu_item_id)
);

insert into public.branches (code, name, display_order)
values
  ('branch-1', 'Branch 1', 1),
  ('branch-2', 'Branch 2', 2),
  ('branch-3', 'Branch 3', 3),
  ('branch-4', 'Branch 4', 4)
on conflict (code) do nothing;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger branches_set_updated_at
before update on public.branches
for each row execute function public.set_updated_at();

create trigger menu_items_set_updated_at
before update on public.menu_items
for each row execute function public.set_updated_at();

create trigger branch_prices_set_updated_at
before update on public.branch_prices
for each row execute function public.set_updated_at();

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    'staff'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select p.role
  from public.profiles as p
  where p.id = (select auth.uid())
    and p.is_active = true
  limit 1;
$$;

create function public.is_active_profile()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.profiles as p
    where p.id = (select auth.uid())
      and p.is_active = true
  );
$$;

create function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(public.current_profile_role() = 'owner', false);
$$;

create function public.can_access_branch(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.branches as b
    where b.id = target_branch_id
      and b.is_active = true
      and (
        public.is_owner()
        or exists (
          select 1
          from public.staff_branch_assignments as a
          join public.profiles as p on p.id = a.staff_id
          where a.branch_id = b.id
            and a.staff_id = (select auth.uid())
            and p.role = 'staff'
            and p.is_active = true
        )
      )
  );
$$;

create function public.ensure_staff_assignment_target()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.profiles as p
    where p.id = new.staff_id
      and p.role = 'staff'
      and p.is_active = true
  ) then
    raise exception 'Assignments must target an active staff profile';
  end if;

  return new;
end;
$$;

create trigger staff_assignment_target_check
before insert or update of staff_id on public.staff_branch_assignments
for each row execute function public.ensure_staff_assignment_target();

alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.staff_branch_assignments enable row level security;
alter table public.menu_items enable row level security;
alter table public.branch_prices enable row level security;

revoke all on public.profiles, public.branches, public.staff_branch_assignments,
  public.menu_items, public.branch_prices from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.branches to authenticated;
grant select, insert, update, delete on public.staff_branch_assignments to authenticated;
grant select, insert, update, delete on public.menu_items to authenticated;
grant select, insert, update, delete on public.branch_prices to authenticated;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.current_profile_role() from public, anon;
revoke all on function public.is_active_profile() from public, anon;
revoke all on function public.is_owner() from public, anon;
revoke all on function public.can_access_branch(uuid) from public, anon;
revoke all on function public.ensure_staff_assignment_target() from public, anon, authenticated;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_active_profile() to authenticated;
grant execute on function public.is_owner() to authenticated;
grant execute on function public.can_access_branch(uuid) to authenticated;

create policy profiles_select_self_or_owner
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_owner()));

create policy profiles_update_self_name
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy branches_select_accessible
on public.branches for select to authenticated
using ((select public.can_access_branch(id)));

create policy branches_owner_manage
on public.branches for all to authenticated
using ((select public.is_owner()))
with check ((select public.is_owner()));

create policy staff_assignments_select_self_or_owner
on public.staff_branch_assignments for select to authenticated
using (staff_id = (select auth.uid()) or (select public.is_owner()));

create policy staff_assignments_owner_manage
on public.staff_branch_assignments for all to authenticated
using ((select public.is_owner()))
with check ((select public.is_owner()));

create policy menu_items_select_active_profiles
on public.menu_items for select to authenticated
using ((select public.is_active_profile()));

create policy menu_items_owner_manage
on public.menu_items for all to authenticated
using ((select public.is_owner()))
with check ((select public.is_owner()));

create policy branch_prices_select_accessible
on public.branch_prices for select to authenticated
using ((select public.can_access_branch(branch_id)));

create policy branch_prices_owner_manage
on public.branch_prices for all to authenticated
using ((select public.is_owner()))
with check ((select public.is_owner()));