create function get_exercise_leaderboard(p_exercise_id uuid)
returns table (user_id uuid, name text, heaviest_weight numeric)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
    select u.id, u.name, max(ws.weight)
    from workout_sets ws
    join workout_sessions s on s.id = ws.session_id
    join users u on u.id = s.user_id
    where ws.exercise_id = p_exercise_id
      and u.gym_id = (select gym_id from users where id = auth.uid())
      and u.leaderboard_opt_in = true
    group by u.id, u.name
    order by max(ws.weight) desc
    limit 50;
end;
$$;

revoke execute on function get_exercise_leaderboard(uuid) from public, anon;
grant execute on function get_exercise_leaderboard(uuid) to authenticated;
