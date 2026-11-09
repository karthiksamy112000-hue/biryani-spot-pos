create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

set search_path = public, extensions, pg_catalog;

create table public.payroll_attendance (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete restrict,
  branch_id uuid not null references public.branches (id) on delete restrict,
  punched_in_at timestamptz not null check (isfinite(punched_in_at)),
  punched_out_at timestamptz check (punched_out_at is null or isfinite(punched_out_at)),
  business_date date generated always as
    ((punched_in_at at time zone 'Asia/Kolkata')::date) stored,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  voided_at timestamptz,
  voided_by uuid references public.profiles (id) on delete restrict,
  check ((voided_at is null) = (voided_by is null)),
  check (punched_out_at is null or punched_out_at > punched_in_at),
  exclude using gist (
    staff_id with =,
    tstzrange(punched_in_at, punched_out_at, '[)') with &&
  ) where (voided_at is null)
);

comment on column public.payroll_attendance.business_date is
  'Kolkata calendar date of punch-in; shifts crossing midnight are not split.';

create index payroll_attendance_staff_date_idx
  on public.payroll_attendance (staff_id, business_date);
create index payroll_attendance_branch_date_idx
  on public.payroll_attendance (branch_id, business_date);

-- Each row is an immutable schedule version. For equal effective times the
-- highest id wins, allowing a future schedule to be replaced without erasing it.
create table public.payroll_payout_schedules (
  id bigint generated always as identity primary key,
  staff_id uuid not null references public.profiles (id) on delete restrict,
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly')),
  payout_time time without time zone not null check (payout_time < time '24:00'),
  weekday smallint,
  month_day smallint,
  effective_at timestamptz not null check (isfinite(effective_at)),
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  check (
    (frequency = 'daily' and weekday is null and month_day is null)
    or (frequency = 'weekly' and weekday is not null and weekday between 1 and 7 and month_day is null)
    or (frequency = 'monthly' and month_day is not null and month_day between 1 and 31 and weekday is null)
  )
);

create index payroll_schedules_staff_effective_idx
  on public.payroll_payout_schedules (staff_id, effective_at desc, id desc);

create table public.payroll_payments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0 and amount <> 'NaN'::numeric),
  idempotency_key uuid not null unique,
  note text,
  paid_at timestamptz not null default clock_timestamp(),
  paid_by uuid not null references public.profiles (id) on delete restrict
);

create index payroll_payments_staff_paid_at_idx
  on public.payroll_payments (staff_id, paid_at desc);

alter table public.payroll_attendance enable row level security;
alter table public.payroll_payout_schedules enable row level security;
alter table public.payroll_payments enable row level security;

revoke all on public.payroll_attendance, public.payroll_payout_schedules,
  public.payroll_payments from public, anon, authenticated;
revoke all on sequence public.payroll_payout_schedules_id_seq from public, anon, authenticated;
grant select on public.payroll_attendance, public.payroll_payout_schedules,
  public.payroll_payments to authenticated;

create policy payroll_attendance_read on public.payroll_attendance
  for select to authenticated
  using ((select public.is_owner()) or
    (staff_id = (select auth.uid()) and (select public.current_profile_role()) = 'staff'));
create policy payroll_schedules_read on public.payroll_payout_schedules
  for select to authenticated
  using ((select public.is_owner()) or
    (staff_id = (select auth.uid()) and (select public.current_profile_role()) = 'staff'));
create policy payroll_payments_read on public.payroll_payments
  for select to authenticated
  using ((select public.is_owner()) or
    (staff_id = (select auth.uid()) and (select public.current_profile_role()) = 'staff'));

-- All payroll mutations lock the staff profile first, serializing the ledger.
create function public.payroll_lock_staff(p_staff_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  perform 1 from public.profiles
  where id = p_staff_id and role = 'staff'
  for update;
  if not found then
    raise exception 'Staff profile not found';
  end if;
end;
$$;

-- Only completed, non-void shifts earn salary; round the aggregate to paise.
create function public.payroll_totals(p_staff_id uuid)
returns table (hours numeric, earned numeric, paid numeric, pending numeric)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  with earnings as (
    select coalesce(sum(extract(epoch from (a.punched_out_at - a.punched_in_at))), 0) as seconds
    from public.payroll_attendance as a
    where a.staff_id = p_staff_id and a.punched_out_at is not null and a.voided_at is null
  ), payments as (
    select coalesce(sum(p.amount), 0) as amount
    from public.payroll_payments as p where p.staff_id = p_staff_id
  )
  select e.seconds / 3600, round(e.seconds * 50 / 3600, 2),
    p.amount, round(e.seconds * 50 / 3600, 2) - p.amount
  from earnings as e cross join payments as p;
$$;

create function public.get_payroll_summary(p_staff_id uuid)
returns table (hours numeric, earned numeric, paid numeric, pending numeric)
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
begin
  if not public.is_owner() and not coalesce((
    p_staff_id = auth.uid() and public.current_profile_role() = 'staff'
  ), false) then
    raise exception 'Not authorized';
  end if;
  return query select * from public.payroll_totals(p_staff_id);
end;
$$;

create function public.payroll_punch_in(p_branch_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_staff_id uuid := auth.uid();
  v_id uuid;
begin
  if public.current_profile_role() is distinct from 'staff' then
    raise exception 'Only active staff can punch in';
  end if;
  perform public.payroll_lock_staff(v_staff_id);
  if public.current_profile_role() is distinct from 'staff' then
    raise exception 'Only active staff can punch in';
  end if;
  perform 1 from public.staff_branch_assignments as a
  join public.branches as b on b.id = a.branch_id
  where a.staff_id = v_staff_id and a.branch_id = p_branch_id and b.is_active
  for share of a, b;
  if not found then
    raise exception 'Staff must be assigned to an active branch';
  end if;
  insert into public.payroll_attendance (staff_id, branch_id, punched_in_at, created_by)
  values (v_staff_id, p_branch_id, clock_timestamp(), v_staff_id)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.payroll_punch_out()
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_staff_id uuid := auth.uid();
  v_id uuid;
begin
  if public.current_profile_role() is distinct from 'staff' then
    raise exception 'Only active staff can punch out';
  end if;
  perform public.payroll_lock_staff(v_staff_id);
  if public.current_profile_role() is distinct from 'staff' then
    raise exception 'Only active staff can punch out';
  end if;
  update public.payroll_attendance
  set punched_out_at = clock_timestamp(), updated_at = clock_timestamp()
  where staff_id = v_staff_id and punched_out_at is null and voided_at is null
  returning id into v_id;
  if v_id is null then
    raise exception 'No open shift';
  end if;
  return v_id;
end;
$$;

-- The owner may enter a historical or open shift, or correct an existing one.
-- A correction cannot reduce completed earnings below payments already made.
create function public.payroll_save_attendance(
  p_staff_id uuid, p_branch_id uuid, p_punched_in_at timestamptz,
  p_punched_out_at timestamptz, p_attendance_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_id uuid;
  v_pending numeric;
  v_now timestamptz := clock_timestamp();
begin
  if not public.is_owner() then
    raise exception 'Only an active owner can manage attendance';
  end if;
  if p_punched_in_at is null or not isfinite(p_punched_in_at)
    or p_punched_in_at > v_now
    or (p_punched_out_at is not null and
      (not isfinite(p_punched_out_at) or p_punched_out_at > v_now)) then
    raise exception 'Attendance timestamps must be finite and not in the future';
  end if;
  perform public.payroll_lock_staff(p_staff_id);
  if p_attendance_id is null then
    insert into public.payroll_attendance
      (staff_id, branch_id, punched_in_at, punched_out_at, created_by)
    values (p_staff_id, p_branch_id, p_punched_in_at, p_punched_out_at, auth.uid())
    returning id into v_id;
  else
    update public.payroll_attendance
    set branch_id = p_branch_id, punched_in_at = p_punched_in_at,
      punched_out_at = p_punched_out_at, updated_at = clock_timestamp()
    where id = p_attendance_id and staff_id = p_staff_id and voided_at is null
    returning id into v_id;
    if v_id is null then
      raise exception 'Attendance record not found for staff';
    end if;
  end if;
  select t.pending into v_pending from public.payroll_totals(p_staff_id) as t;
  if v_pending < 0 then
    raise exception 'Correction would reduce earnings below paid salary';
  end if;
  return v_id;
end;
$$;

create function public.payroll_void_attendance(p_staff_id uuid, p_attendance_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_pending numeric;
begin
  if not public.is_owner() then
    raise exception 'Only an active owner can manage attendance';
  end if;
  perform public.payroll_lock_staff(p_staff_id);
  update public.payroll_attendance
  set voided_at = clock_timestamp(), voided_by = auth.uid(), updated_at = clock_timestamp()
  where id = p_attendance_id and staff_id = p_staff_id and voided_at is null;
  if not found then
    raise exception 'Attendance record not found for staff';
  end if;
  select t.pending into v_pending from public.payroll_totals(p_staff_id) as t;
  if v_pending < 0 then
    raise exception 'Voiding would reduce earnings below paid salary';
  end if;
end;
$$;

-- Times are local to Asia/Kolkata; weekday uses ISO Monday=1 through Sunday=7.
-- For a short month, a month_day beyond its length means its last day.
create function public.payroll_set_schedule(
  p_staff_id uuid, p_frequency text, p_payout_time time without time zone,
  p_weekday smallint default null, p_month_day smallint default null,
  p_effective_at timestamptz default null
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_now timestamptz;
  v_id bigint;
begin
  if not public.is_owner() then
    raise exception 'Only an active owner can manage payout schedules';
  end if;
  perform public.payroll_lock_staff(p_staff_id);
  v_now := clock_timestamp();
  if p_effective_at is not null and
    (not isfinite(p_effective_at) or p_effective_at < v_now) then
    raise exception 'Schedule effective time cannot be in the past';
  end if;
  insert into public.payroll_payout_schedules
    (staff_id, frequency, payout_time, weekday, month_day, effective_at, created_by)
  values
    (p_staff_id, p_frequency, p_payout_time, p_weekday, p_month_day,
      coalesce(p_effective_at, v_now), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- Reuse the same idempotency key on every retry of one logical payment.
create function public.payroll_record_payment(
  p_staff_id uuid, p_amount numeric, p_idempotency_key uuid, p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
declare
  v_existing public.payroll_payments%rowtype;
  v_pending numeric;
  v_id uuid;
begin
  if not public.is_owner() then
    raise exception 'Only an active owner can record payments';
  end if;
  if p_idempotency_key is null or p_amount is null or
    p_amount in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric) or
    p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'Payment requires a positive amount in whole paise and an idempotency key';
  end if;
  perform public.payroll_lock_staff(p_staff_id);
  select * into v_existing from public.payroll_payments
  where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.staff_id is distinct from p_staff_id
      or v_existing.amount is distinct from p_amount
      or v_existing.note is distinct from p_note then
      raise exception 'Idempotency key already used for a different payment';
    end if;
    return v_existing.id;
  end if;
  select t.pending into v_pending from public.payroll_totals(p_staff_id) as t;
  if p_amount > v_pending then
    raise exception 'Payment exceeds pending salary';
  end if;
  insert into public.payroll_payments (staff_id, amount, idempotency_key, note, paid_by)
  values (p_staff_id, p_amount, p_idempotency_key, p_note, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.payroll_lock_staff(uuid) from public, anon, authenticated;
revoke all on function public.payroll_totals(uuid) from public, anon, authenticated;
revoke all on function public.get_payroll_summary(uuid) from public, anon, authenticated;
revoke all on function public.payroll_punch_in(uuid) from public, anon, authenticated;
revoke all on function public.payroll_punch_out() from public, anon, authenticated;
revoke all on function public.payroll_save_attendance(uuid, uuid, timestamptz, timestamptz, uuid)
  from public, anon, authenticated;
revoke all on function public.payroll_void_attendance(uuid, uuid) from public, anon, authenticated;
revoke all on function public.payroll_set_schedule(uuid, text, time, smallint, smallint, timestamptz)
  from public, anon, authenticated;
revoke all on function public.payroll_record_payment(uuid, numeric, uuid, text)
  from public, anon, authenticated;
grant execute on function public.get_payroll_summary(uuid) to authenticated;
grant execute on function public.payroll_punch_in(uuid) to authenticated;
grant execute on function public.payroll_punch_out() to authenticated;
grant execute on function public.payroll_save_attendance(uuid, uuid, timestamptz, timestamptz, uuid)
  to authenticated;
grant execute on function public.payroll_void_attendance(uuid, uuid) to authenticated;
grant execute on function public.payroll_set_schedule(uuid, text, time, smallint, smallint, timestamptz)
  to authenticated;
grant execute on function public.payroll_record_payment(uuid, numeric, uuid, text) to authenticated;

reset search_path;
