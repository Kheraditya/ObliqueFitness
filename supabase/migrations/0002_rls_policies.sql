alter table users enable row level security;
alter table memberships enable row level security;
alter table exercises enable row level security;
alter table routines enable row level security;
alter table routine_exercises enable row level security;
alter table workout_sessions enable row level security;
alter table workout_sets enable row level security;

-- Helper: is the current user an admin, and in which gym?
create function current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from users where id = auth.uid() and role = 'admin'
  );
$$;

create function current_user_gym_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select gym_id from users where id = auth.uid();
$$;

-- users: self, or admin viewing/editing same-gym members
create policy "users_select_self_or_same_gym_admin" on users
  for select using (
    id = auth.uid()
    or (current_user_is_admin() and gym_id = current_user_gym_id())
  );

create policy "users_update_self_or_same_gym_admin" on users
  for update using (
    id = auth.uid()
    or (current_user_is_admin() and gym_id = current_user_gym_id())
  );

-- memberships: self (read-only), admin full access within gym
create policy "memberships_select_self_or_same_gym_admin" on memberships
  for select using (
    user_id = auth.uid()
    or (current_user_is_admin() and user_id in (
      select id from users where gym_id = current_user_gym_id()
    ))
  );

create policy "memberships_admin_manage" on memberships
  for all using (
    current_user_is_admin() and user_id in (
      select id from users where gym_id = current_user_gym_id()
    )
  );

-- exercises: readable by anyone authenticated; writable by creator or admin
create policy "exercises_select_authenticated" on exercises
  for select using (auth.role() = 'authenticated');

create policy "exercises_insert_own" on exercises
  for insert with check (created_by = auth.uid());

create policy "exercises_update_own_or_admin" on exercises
  for update using (created_by = auth.uid() or current_user_is_admin());

-- routines: owner full access; admin full access within gym
create policy "routines_owner_or_same_gym_admin" on routines
  for all using (
    owner_id = auth.uid()
    or (current_user_is_admin() and owner_id in (
      select id from users where gym_id = current_user_gym_id()
    ))
  );

-- routine_exercises: follow parent routine's access
create policy "routine_exercises_via_routine" on routine_exercises
  for all using (
    routine_id in (
      select id from routines where owner_id = auth.uid()
      or (current_user_is_admin() and owner_id in (
        select id from users where gym_id = current_user_gym_id()
      ))
    )
  );

-- workout_sessions: owner full access; admin read-only within gym
create policy "workout_sessions_owner" on workout_sessions
  for all using (user_id = auth.uid());

create policy "workout_sessions_admin_read" on workout_sessions
  for select using (
    current_user_is_admin() and user_id in (
      select id from users where gym_id = current_user_gym_id()
    )
  );

-- workout_sets: follow parent session's access
create policy "workout_sets_owner" on workout_sets
  for all using (
    session_id in (select id from workout_sessions where user_id = auth.uid())
  );

create policy "workout_sets_admin_read" on workout_sets
  for select using (
    current_user_is_admin() and session_id in (
      select id from workout_sessions where user_id in (
        select id from users where gym_id = current_user_gym_id()
      )
    )
  );
