-- Gym welcome codes are durable until an admin rotates them. Rotating a code only
-- invalidates the old code; it never changes an existing member's gym_id.
alter table invite_codes add column if not exists active boolean not null default true;
alter table users add column if not exists app_access_enabled boolean not null default true;

-- Preserve one newest code per gym when upgrading from the earlier single-use
-- invite system, and make that selected code reusable until explicitly rotated.
with ranked_codes as (
  select id, row_number() over (partition by gym_id order by created_at desc) as position
  from invite_codes
)
update invite_codes as code
set active = ranked_codes.position = 1
from ranked_codes
where code.id = ranked_codes.id;

update invite_codes set max_uses = 2147483647 where active;

create or replace function get_current_gym_welcome_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym_id uuid;
  v_code text;
begin
  if not current_user_is_admin() then
    raise exception 'Only gym admins can view the welcome code';
  end if;

  v_gym_id := current_user_gym_id();
  if v_gym_id is null then
    raise exception 'Admin is not attached to a gym';
  end if;

  select code into v_code
  from invite_codes
  where gym_id = v_gym_id
    and active
    and uses_count < max_uses
    and (expires_at is null or expires_at >= now())
  order by created_at desc
  limit 1;

  if v_code is null then
    update invite_codes set active = false where gym_id = v_gym_id and active;
    v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    insert into invite_codes (gym_id, code, created_by, max_uses, active)
    values (v_gym_id, v_code, auth.uid(), 2147483647, true);
  end if;

  return v_code;
end;
$$;

create or replace function rotate_gym_welcome_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym_id uuid;
  v_code text;
begin
  if not current_user_is_admin() then
    raise exception 'Only gym admins can rotate the welcome code';
  end if;

  v_gym_id := current_user_gym_id();
  if v_gym_id is null then
    raise exception 'Admin is not attached to a gym';
  end if;

  update invite_codes set active = false where gym_id = v_gym_id and active;

  loop
    v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    begin
      insert into invite_codes (gym_id, code, created_by, max_uses, active)
      values (v_gym_id, v_code, auth.uid(), 2147483647, true);
      exit;
    exception when unique_violation then
      -- Extremely unlikely; generate a different code without failing rotation.
    end;
  end loop;

  return v_code;
end;
$$;

create or replace function set_member_app_access(p_member_id uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not current_user_is_admin() then
    raise exception 'Only gym admins can manage member access';
  end if;

  update users
  set app_access_enabled = p_enabled
  where id = p_member_id
    and role = 'member'
    and gym_id = current_user_gym_id();

  if not found then
    raise exception 'Member was not found in your gym';
  end if;
end;
$$;

-- Members may edit profile fields but may not grant themselves app access.
revoke update on users from authenticated;
grant update (name, avatar_url, bio, link, sex, birthday) on users to authenticated;

revoke execute on function get_current_gym_welcome_code() from public;
revoke execute on function rotate_gym_welcome_code() from public;
revoke execute on function set_member_app_access(uuid, boolean) from public;
grant execute on function get_current_gym_welcome_code() to authenticated;
grant execute on function rotate_gym_welcome_code() to authenticated;
grant execute on function set_member_app_access(uuid, boolean) to authenticated;

-- Disabled users may still read their own profile so the client can show the
-- access-paused screen, but all workout and gym data is blocked at the database.
create or replace function current_user_has_app_access()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select app_access_enabled from users where id = auth.uid()), false);
$$;

create policy "memberships_require_app_access" on memberships as restrictive
  for all using (current_user_has_app_access()) with check (current_user_has_app_access());
create policy "exercises_require_app_access" on exercises as restrictive
  for all using (current_user_has_app_access()) with check (current_user_has_app_access());
create policy "routines_require_app_access" on routines as restrictive
  for all using (current_user_has_app_access()) with check (current_user_has_app_access());
create policy "routine_exercises_require_app_access" on routine_exercises as restrictive
  for all using (current_user_has_app_access()) with check (current_user_has_app_access());
create policy "workout_sessions_require_app_access" on workout_sessions as restrictive
  for all using (current_user_has_app_access()) with check (current_user_has_app_access());
create policy "workout_sets_require_app_access" on workout_sets as restrictive
  for all using (current_user_has_app_access()) with check (current_user_has_app_access());
create policy "body_measurements_require_app_access" on body_measurements as restrictive
  for all using (current_user_has_app_access()) with check (current_user_has_app_access());
create policy "invite_codes_require_app_access" on invite_codes as restrictive
  for all using (current_user_has_app_access()) with check (current_user_has_app_access());

-- Only the current active code can be redeemed. Whitespace and casing are
-- normalized to make codes easier to enter from a printed card or message.
create or replace function redeem_invite_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code invite_codes%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from users where id = auth.uid() and gym_id is not null) then
    raise exception 'Already a member of a gym';
  end if;

  select * into v_code
  from invite_codes
  where code = upper(trim(p_code)) and active
  for update;

  if not found then raise exception 'Invalid or inactive welcome code'; end if;
  if v_code.expires_at is not null and v_code.expires_at < now() then raise exception 'Welcome code has expired'; end if;
  if v_code.uses_count >= v_code.max_uses then raise exception 'Welcome code has reached its usage limit'; end if;

  update users set gym_id = v_code.gym_id where id = auth.uid();
  update invite_codes set uses_count = uses_count + 1 where id = v_code.id;
end;
$$;
