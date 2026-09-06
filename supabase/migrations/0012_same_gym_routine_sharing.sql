create or replace function list_gym_share_recipients()
returns table (id uuid, name text, email text)
language sql
security definer
set search_path = public
stable
as $$
  select target.id, target.name, target.email
  from users target
  join users sender on sender.id = auth.uid()
  where sender.gym_id is not null
    and target.gym_id = sender.gym_id
    and target.id <> sender.id
  order by coalesce(target.name, target.email);
$$;

create or replace function share_routine_with_gym_member(p_routine_id uuid, p_recipient_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender users%rowtype;
  v_source routines%rowtype;
  v_recipient users%rowtype;
  v_new_routine_id uuid;
begin
  select * into v_sender from users where id = auth.uid();
  if not found or v_sender.gym_id is null then
    raise exception 'You must belong to a gym to share routines';
  end if;

  select * into v_source from routines where id = p_routine_id and owner_id = auth.uid();
  if not found then
    raise exception 'Routine not found or not owned by you';
  end if;

  select * into v_recipient from users where id = p_recipient_id and gym_id = v_sender.gym_id;
  if not found or v_recipient.id = v_sender.id then
    raise exception 'Recipient must be another user in your gym';
  end if;

  insert into routines (owner_id, assigned_by_admin_id, name, notes)
  values (
    v_recipient.id,
    case when v_sender.role = 'admin' then v_sender.id else null end,
    v_source.name,
    v_source.notes
  )
  returning id into v_new_routine_id;

  insert into routine_exercises (
    routine_id, exercise_id, "order", target_sets, rest_seconds, notes, superset_group
  )
  select
    v_new_routine_id, exercise_id, "order", target_sets, rest_seconds, notes, superset_group
  from routine_exercises
  where routine_id = p_routine_id;

  return v_new_routine_id;
end;
$$;

revoke execute on function list_gym_share_recipients() from public;
revoke execute on function share_routine_with_gym_member(uuid, uuid) from public;
grant execute on function list_gym_share_recipients() to authenticated;
grant execute on function share_routine_with_gym_member(uuid, uuid) to authenticated;
